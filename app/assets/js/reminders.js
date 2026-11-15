/*
 * Active reminders (App.reminders), on every page.
 * Astronauts: the day's plan follows the phase, the destination and the surface context (all times UTC, as on board):
 * health tasks, medication (MEDICATION, plus the pill of the women's health module), exams and reading results.
 * At the time of each item, while it is not done or snoozed, a message arrives in the health messages chat
 * (App.inbox, assets/js/inbox.js), with Done (or Taken), In 15 min and Open: no toast over the page.
 * Doctor: each new crew alert (not emergencies: SOS has its own dialog) arrives as a message with Open.
 * Optional: the voice says it once (App.voice), and a device notification shows when the tab is hidden
 * (only with permission, through the service worker).
 *   App.reminders.today() → [{ id, task, kind, title, why, time, href, done }]   App.reminders.next(count)
 *   App.reminders.markDone(item) · snooze(item, minutes) · showNext() (Presentation mode)
 *   App.reminders.isUltrasoundDay() · settings() / setSettings({ spoken, notify }) · requestNotifications()
 * Task ids are the data-task values of the Home list; done tasks are saved in "tasks:<member>" ({ date, done }).
 */
(function () {
    "use strict";

    var App = window.App;
    var MINUTE = 60000;
    var DUE_FOR = 60 * MINUTE;   // a reminder stays up for an hour after its time
    var CHECK_MS = 30000;
    var profile = App.getProfile();
    var member = profile.member;
    var forced = null;

    /*
     * Medication on board (simulated): vitamin D is daily on long missions, since there is no sunlight on board.
     * The contraceptive pill comes from the women's health module (its own state: "womens-health").
     */
    var MEDICATION = {
        silva: [{ id: "vitamin-d", hours: 8, name: "Vitamin D, 1000 IU", why: "No sunlight on board: it keeps your bones strong.", phases: ["in"] }],
        tanaka: [{ id: "vitamin-d", hours: 8, name: "Vitamin D, 1000 IU", why: "No sunlight on board: it keeps your bones strong.", phases: ["in"] }]
    };
    var PILL_HOURS = 21;

    function today() {
        var now = new Date();
        return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    }

    function at(hours) {
        return today() + hours * 60 * MINUTE;
    }

    function settings() {
        var saved = App.store.get("reminder-settings", null);
        return { spoken: Boolean(saved && saved.spoken), notify: Boolean(saved && saved.notify) };
    }

    function setSettings(next) {
        var value = settings();
        Object.keys(next).forEach(function (key) {
            value[key] = Boolean(next[key]);
        });
        App.store.set("reminder-settings", value);
    }

    // Snoozed and already announced items, for today only
    function memory() {
        var saved = App.store.get("reminders:" + member, null);
        return saved && saved.date === App.todayKey() ? saved : { date: App.todayKey(), snoozed: {}, spoken: [], done: [] };
    }

    function remember(value) {
        App.store.set("reminders:" + member, value);
    }

    function doneTasks() {
        var saved = App.store.get("tasks:" + member, null);
        return saved && saved.date === App.todayKey() && Array.isArray(saved.done) ? saved.done : [];
    }

    function isUltrasoundDay() {
        return App.isFlight() && App.getPhase().missionDay % 7 === 3;
    }

    function vitalOf(key) {
        return App.crew.todayVitals(member).filter(function (item) {
            return item.key === key;
        })[0];
    }

    /* ---------- The day's plan ---------- */

    function item(id, hours, title, why, href, task) {
        return { id: id, kind: "task", task: task === undefined ? id : task, time: at(hours), title: title, why: why, href: App.rootUrl(href) };
    }

    function womensState() {
        return App.store.get("womens-health", {});
    }

    // The pill: only for the female profile, with the module on and a plan that uses it
    function usesPill() {
        var state = womensState();
        var plan = state.plan || "pill";
        return profile.key === "female" && state.enabled !== false && (plan === "pill" || plan === "adjust");
    }

    function medication(phase) {
        var list = (MEDICATION[member] || []).filter(function (med) {
            return med.phases.indexOf(phase) !== -1;
        }).map(function (med) {
            return { id: "med-" + med.id, kind: "medication", task: null, time: at(med.hours), title: "Take " + med.name, why: med.why, href: "" };
        });
        if (usesPill()) {
            list.push({ id: "med-pill", kind: "medication", task: null, time: at(PILL_HOURS), title: "Take your contraceptive pill", why: "Same time every day keeps bleeding stopped.", href: App.rootUrl("pages/womens-health/index.html") });
        }
        return list;
    }

    function plan() {
        var phase = App.getPhase().key;
        var context = App.getContext ? App.getContext(member) : null;
        var list = [];
        if (phase === "in") {
            list.push(item("glucose", 7, "Blood glucose check", "Before breakfast, with the glucometer.", "index.html#tasks"));
            list.push(item("saliva", 7.25, "Morning saliva collection", "Immune system check.", "index.html#tasks"));
            if (isUltrasoundDay()) {
                list.push(item("ultrasound", 9.5, "Neck vein ultrasound", "Weekly check for clots, guided step by step.", "pages/body/index.html#ultrasound"));
            }
            list.push(item("oct", 10.5, "Retina scan (OCT)", "Vision trend check.", "index.html#tasks"));
            list.push(item("conference", 14, "Private medical conference", "With your flight surgeon.", "index.html#tasks"));
            list.push(item("checkin", 20, "Mood check-in", "One tap, private to the medical team.", "index.html#tasks"));
            ((App.crew.sessions && App.crew.sessions[member]) || []).forEach(function (session, index) {
                list.push(item("exercise-" + index, session[0], "Exercise session", "Keeps bones and muscles strong.", "index.html#tasks", "exercise"));
            });
            // Water every 2 hours, only while today's pace is behind
            var water = vitalOf("hydration");
            if (water && water.status !== "ok") {
                [10, 12, 14, 16, 18].forEach(function (hour) {
                    list.push(item("water-" + hour, hour, "Drink 250 ml of water", "You are behind today's pace.", "index.html#vitals", null));
                });
            }
            // A scan read as Watch or Act now: the reminder stays until the person says they saw it
            var scans = App.records ? App.records.list("exames_imagem", { usuario_id: member }).filter(function (row) {
                return row.tipo_exame === "ultrassom_venoso";
            }) : [];
            if (scans[0] && (scans[0].status_leitura === "atencao" || scans[0].status_leitura === "critico")) {
                list.push({
                    id: "ultrasound-result-" + scans[0].id, kind: "result", task: null, time: Date.now() - MINUTE,
                    title: "Ultrasound reading: " + (scans[0].status_leitura === "critico" ? "Act now" : "Watch"),
                    why: scans[0].parecer_medico || "Talk to your crew medical officer.",
                    href: App.rootUrl("pages/body/index.html#ultrasound")
                });
            }
            if (context === "base") {
                list.push(item("seals", 13.5, "Clean suit seals and rinse eyes and nose", "Surface dust irritates eyes and lungs.", "index.html#tasks"));
            }
            if (context === "rover") {
                list.push(item("rover-kit", 8.75, "Check the rover medical kit", "Before you drive out.", "index.html#tasks"));
                [10, 11, 12].forEach(function (hour) {
                    list.push(item("rover-water-" + hour, hour, "Drink 250 ml on the drive", "The rover water bag counts it.", "index.html#tasks", "rover-water"));
                });
            }
        } else if (phase === "pre") {
            list.push(item("quarantine", 9, "Pre-launch quarantine briefing", "Quarantine starts 14 days before launch.", "index.html#tasks"));
            list.push(item("packing", 16, "Pack medicines and supplies", "Checked against the whole mission length.", "index.html#tasks"));
            // Exams booked for today: one hour before
            App.crew.preflightExams(member).forEach(function (exam) {
                if (exam.status === "scheduled" && exam.at && exam.at >= today() && exam.at < today() + 1440 * MINUTE) {
                    list.push({ id: "exam-" + exam.key, kind: "exam", task: null, time: exam.at - 60 * MINUTE, title: exam.name + " at " + App.formatTime(new Date(exam.at)), why: exam.place + ".", href: App.rootUrl("index.html#tasks") });
                }
            });
        } else {
            list.push(item("stand-test", 10, "Stand-up test", "Heart rate and blood pressure when standing.", "index.html#tasks"));
            list.push(item("walk", 15, "Assisted walk", "Rehab, step by step.", "index.html#tasks"));
        }
        list = list.concat(medication(phase));
        var done = doneTasks();
        var extra = memory().done;
        list.forEach(function (entry) {
            entry.done = (entry.task && done.indexOf(entry.task) !== -1) || extra.indexOf(entry.id) !== -1 || isDoneElsewhere(entry);
        });
        return list.sort(function (a, b) {
            return a.time - b.time;
        });
    }

    // Some tasks are done by a reading, not a tick: glucose (a reading today) and the check-in (a row today)
    function isDoneElsewhere(entry) {
        if (entry.task === "glucose" && App.glucose) {
            var reading = App.glucose.latest(member);
            return Boolean(reading && reading.time >= today());
        }
        if (entry.task === "checkin" && App.records) {
            return App.records.list("avaliacoes_diarias", { usuario_id: member }).some(function (row) {
                return row.data_registro === App.todayKey() && row.humor_escala != null;
            });
        }
        if (entry.id === "med-pill") {
            return womensState().takenOn === App.todayKey();
        }
        return false;
    }

    function due(now) {
        var snoozed = memory().snoozed;
        // Up for an hour from its time, or from the end of a snooze
        return plan().filter(function (entry) {
            var from = snoozed[entry.id] || entry.time;
            return !entry.done && now >= from && now < from + DUE_FOR;
        });
    }

    function next(count) {
        var now = Date.now();
        return plan().filter(function (entry) {
            return !entry.done && entry.time + DUE_FOR > now;
        }).slice(0, count || 1);
    }

    /* ---------- Acting on a reminder ---------- */

    function markDone(entry) {
        if (entry.id === "med-pill") {
            // Same record as the dose card of the women's health page
            var state = womensState();
            state.takenOn = App.todayKey();
            state.takenAt = App.formatTime(new Date());
            state.logs = (state.logs || 0) + 1;
            App.store.set("womens-health", state);
        } else if (entry.task) {
            var done = doneTasks();
            if (done.indexOf(entry.task) === -1) {
                done.push(entry.task);
            }
            App.store.set("tasks:" + member, { date: App.todayKey(), done: done });
        } else {
            var value = memory();
            value.done.push(entry.id);
            remember(value);
        }
        forced = null;
        if (App.inbox) {
            App.inbox.resolve(entry.id, "done", (entry.kind === "medication" ? "Taken at " : "Done at ") + App.formatTime(new Date()) + ".");
        }
        document.dispatchEvent(new CustomEvent("tasks:change", { detail: { source: "reminders", task: entry.task } }));
    }

    function snooze(entry, minutes) {
        var value = memory();
        value.snoozed[entry.id] = Date.now() + minutes * MINUTE;
        remember(value);
        forced = null;
        if (App.inbox) {
            App.inbox.resolve(entry.id, "snoozed", "Moved to " + App.formatTime(new Date(value.snoozed[entry.id])) + ".");
        }
    }

    /* ---------- Messages in the health messages chat (App.inbox) ---------- */

    var ACTIONS = {
        task: [{ key: "done", label: "Done" }, { key: "snooze", label: "In 15 min" }],
        medication: [{ key: "done", label: "Taken" }, { key: "snooze", label: "In 15 min" }],
        exam: [{ key: "done", label: "Got it" }, { key: "snooze", label: "In 15 min" }],
        result: [{ key: "done", label: "Seen" }]
    };

    function entryById(id) {
        return plan().filter(function (entry) {
            return entry.id === id;
        })[0] || null;
    }

    function show(entry) {
        if (!App.inbox) {
            return;
        }
        App.inbox.post({
            id: entry.id,
            kind: entry.kind || "task",
            title: entry.title,
            text: entry.why,
            time: entry.time,
            href: entry.href,
            actions: ACTIONS[entry.kind] || ACTIONS.task
        });
        var value = memory();
        if (value.spoken.indexOf(entry.id) === -1) {
            value.spoken.push(entry.id);
            remember(value);
            if (settings().spoken && App.voice) {
                App.voice.speak("Reminder. " + entry.title + ". " + entry.why, { priority: "info" });
            }
            notify(entry);
        }
    }

    function onAction(key, message) {
        var entry = entryById(message.id);
        if (!entry) {
            return { state: "seen", note: "No longer due." };
        }
        if (key === "done") {
            markDone(entry);
        } else if (key === "snooze") {
            snooze(entry, 15);
        }
        return null;
    }

    // A device notification, only with permission and while the app is not on screen
    function notify(entry) {
        if (!settings().notify || !("Notification" in window) || Notification.permission !== "granted" || !document.hidden) {
            return;
        }
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(function (registration) {
                registration.showNotification(entry.title, { body: entry.why, tag: entry.id, data: { url: entry.href } });
            }).catch(function () {});
        }
    }

    function requestNotifications() {
        if (!("Notification" in window)) {
            return Promise.resolve("unsupported");
        }
        return Notification.requestPermission().then(function (result) {
            setSettings({ notify: result === "granted" });
            return result;
        });
    }

    // Every due item gets its message; what got done somewhere else (a ticked task, a reading) closes its message
    function check() {
        var now = Date.now();
        if (forced) {
            show(forced);
        }
        due(now).forEach(show);
        if (App.inbox) {
            var byId = {};
            plan().forEach(function (entry) {
                byId[entry.id] = entry;
            });
            App.inbox.items().forEach(function (message) {
                var entry = byId[message.id];
                if (message.state === "pending" && entry && entry.done) {
                    App.inbox.resolve(message.id, "done", "Done at " + App.formatTime(new Date()) + ".");
                }
            });
        }
    }

    // Presentation mode: show the next reminder of the day right now
    function showNext() {
        var upcoming = next(1)[0];
        if (!upcoming) {
            if (App.inbox) {
                App.inbox.post({ id: "nothing-" + Date.now(), kind: "info", title: "Nothing left to remind today", text: "Every task and dose of today is done." });
            }
            return false;
        }
        forced = upcoming;
        show(upcoming);
        return true;
    }

    /*
     * Doctor: a message for each new crew alert, in flight (SOS emergencies keep their own dialog). On the first look
     * of the day, one message sums up the alerts already open, so the chat never floods.
     */
    function checkAlerts() {
        if (!App.inbox || !App.isFlight() || !App.crew.buildAlerts) {
            return;
        }
        var alerts = App.crew.buildAlerts();
        var open = alerts.list.filter(function (alert) {
            return alerts.statusOf(alert) !== "resolved";
        });
        var seen = App.inbox.seen();
        var fresh = open.filter(function (alert) {
            return seen.indexOf(alert.id) === -1;
        });
        if (!fresh.length) {
            return;
        }
        var href = App.rootUrl("index.html#alerts-title");
        if (!seen.length && fresh.length > 1) {
            App.inbox.post({
                id: "alerts-summary-" + App.todayKey(), kind: "alert", href: href,
                title: fresh.length + " open alerts on the crew panel",
                text: fresh.map(function (alert) {
                    return alert.who + ": " + alert.title;
                }).join(" · "),
                actions: [{ key: "seen", label: "Seen" }]
            });
        } else {
            fresh.forEach(function (alert) {
                App.inbox.post({
                    id: "alert-" + alert.id, kind: "alert", href: href,
                    title: alert.who + ": " + alert.title,
                    text: alert.text,
                    actions: [{ key: "seen", label: "Seen" }]
                });
            });
        }
        App.inbox.markSeen(fresh.map(function (alert) {
            return alert.id;
        }));
    }

    var astronaut = App.getSession() && (profile.key === "female" || profile.key === "male");
    var doctor = App.getSession() && profile.key === "doctor";

    App.reminders = {
        today: plan,
        next: next,
        markDone: markDone,
        snooze: snooze,
        showNext: showNext,
        isUltrasoundDay: isUltrasoundDay,
        settings: settings,
        setSettings: setSettings,
        requestNotifications: requestNotifications,
        active: astronaut
    };

    if (doctor) {
        window.setInterval(checkAlerts, CHECK_MS);
        document.addEventListener("symptoms:change", checkAlerts);
        if (document.readyState === "complete") {
            checkAlerts();
        } else {
            window.addEventListener("load", checkAlerts);
        }
        return;
    }
    if (!astronaut) {
        return;
    }
    if (App.inbox) {
        ["task", "medication", "exam", "result"].forEach(function (kind) {
            App.inbox.on(kind, onAction);
        });
    }
    document.addEventListener("tasks:change", check);
    document.addEventListener("glucose:change", check);
    window.setInterval(check, CHECK_MS);
    if (document.readyState === "complete") {
        check();
    } else {
        window.addEventListener("load", check);
    }

    var demoButton = document.querySelector("[data-demo-reminder]");
    if (demoButton) {
        demoButton.hidden = false;
        demoButton.addEventListener("click", function () {
            var panel = document.querySelector("[data-demo-panel]");
            if (panel && panel.open) {
                panel.close();
            }
            showNext();
        });
    }
})();
