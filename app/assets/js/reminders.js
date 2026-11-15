/*
 * Active reminders (App.reminders), on every page, for the astronaut profiles.
 * The day's plan follows the phase, the destination and the surface context (all times UTC, as on board).
 * At the time of each item, while it is not done or snoozed, a toast shows above the tab bar: it never takes the
 * focus (WCAG 2.2: no change of context), its words go to a polite live region, and it offers Done, In 15 min
 * and Open. Optional: the voice says it once (App.voice), and a device notification shows when the tab is hidden
 * (only with permission, through the service worker).
 *   App.reminders.today() → [{ id, task, title, why, time, href, done }]   App.reminders.next(count)
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
    var toast = null;
    var announcer = null;
    var shown = null;
    var forced = null;

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
        return { id: id, task: task === undefined ? id : task, time: at(hours), title: title, why: why, href: App.rootUrl(href) };
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
                    id: "ultrasound-result-" + scans[0].id, task: null, time: Date.now() - MINUTE,
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
                    list.push({ id: "exam-" + exam.key, task: null, time: exam.at - 60 * MINUTE, title: exam.name + " at " + App.formatTime(new Date(exam.at)), why: exam.place + ".", href: App.rootUrl("index.html#tasks") });
                }
            });
        } else {
            list.push(item("stand-test", 10, "Stand-up test", "Heart rate and blood pressure when standing.", "index.html#tasks"));
            list.push(item("walk", 15, "Assisted walk", "Rehab, step by step.", "index.html#tasks"));
        }
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
                return row.data_registro === App.todayKey();
            });
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
        if (entry.task) {
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
        hide();
        document.dispatchEvent(new CustomEvent("tasks:change", { detail: { source: "reminders", task: entry.task } }));
    }

    function snooze(entry, minutes) {
        var value = memory();
        value.snoozed[entry.id] = Date.now() + minutes * MINUTE;
        remember(value);
        hide();
        announce("Reminder moved to " + App.formatTime(new Date(value.snoozed[entry.id])) + ".");
    }

    /* ---------- The toast ---------- */

    var BELL = "<svg class=\"reminder__icon\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z\"/></svg>";

    function build() {
        toast = document.createElement("section");
        toast.className = "reminder";
        toast.setAttribute("aria-label", "Reminder");
        toast.hidden = true;
        toast.innerHTML = BELL +
            "<div class=\"reminder__content\"><p class=\"reminder__time\"></p><p class=\"reminder__title\"></p><p class=\"reminder__text\"></p></div>" +
            "<div class=\"reminder__actions\">" +
            "<button class=\"button button--primary reminder__done\" type=\"button\"><span class=\"button__text\">Done</span></button>" +
            "<button class=\"button button--secondary reminder__snooze\" type=\"button\"><span class=\"button__text\">In 15 min</span></button>" +
            "<a class=\"button button--tertiary reminder__open\"><span class=\"button__text\">Open</span></a>" +
            "</div>";
        document.body.appendChild(toast);
        announcer = document.createElement("p");
        announcer.className = "sr-only";
        announcer.setAttribute("aria-live", "polite");
        document.body.appendChild(announcer);
        toast.querySelector(".reminder__done").addEventListener("click", function () {
            if (shown) {
                markDone(shown);
            }
        });
        toast.querySelector(".reminder__snooze").addEventListener("click", function () {
            if (shown) {
                snooze(shown, 15);
            }
        });
    }

    function announce(text) {
        announcer.textContent = "";
        window.setTimeout(function () {
            announcer.textContent = text;
        }, 50);
    }

    // Sits just above the tab bar, like the voice caption
    function place() {
        var tabBar = document.querySelector(".tab-bar");
        var rect = tabBar && !tabBar.hidden ? tabBar.getBoundingClientRect() : null;
        var bottom = rect && rect.height ? Math.max(0, window.innerHeight - rect.top) : 0;
        toast.style.setProperty("--reminder-bottom", Math.round(bottom) + "px");
    }

    function show(entry) {
        if (shown && shown.id === entry.id && !toast.hidden) {
            return;
        }
        shown = entry;
        toast.querySelector(".reminder__time").textContent = "Reminder · " + App.formatTime(new Date(entry.time));
        toast.querySelector(".reminder__title").textContent = entry.title;
        toast.querySelector(".reminder__text").textContent = entry.why;
        toast.querySelector(".reminder__open").href = entry.href;
        toast.querySelector(".reminder__open").setAttribute("aria-label", "Open: " + entry.title);
        place();
        toast.hidden = false;
        announce("Reminder: " + entry.title + ". " + entry.why);

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

    function hide() {
        shown = null;
        forced = null;
        if (toast) {
            toast.hidden = true;
        }
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

    function check() {
        if (forced) {
            show(forced);
            return;
        }
        var list = due(Date.now());
        if (list.length) {
            show(list[0]);
        } else if (shown) {
            hide();
        }
    }

    // Presentation mode: show the next reminder of the day right now
    function showNext() {
        var upcoming = next(1)[0];
        if (!upcoming) {
            announce("Nothing left to remind today.");
            return false;
        }
        forced = upcoming;
        show(upcoming);
        return true;
    }

    var astronaut = App.getSession() && (profile.key === "female" || profile.key === "male");

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

    if (!astronaut) {
        return;
    }
    build();
    document.addEventListener("tasks:change", check);
    document.addEventListener("glucose:change", check);
    window.setInterval(check, CHECK_MS);
    window.addEventListener("resize", function () {
        if (!toast.hidden) {
            place();
        }
    }, { passive: true });
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
