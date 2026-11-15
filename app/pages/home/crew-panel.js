/* Doctor home = crew panel: who leads, a record per crew member (search and status filters), alerts with offline decision guides.
   Crew data and alerts come from assets/js/crew-data.js. Vital signs come from the sensors only: the shirt rechecks
   on its own, so the only result typed here is a test the sensors cannot run (the urine strip).
   An alert only closes when the data meets its exit rule; ticking the steps is logged but never clears it. */
(function () {
    "use strict";

    var App = window.App;

    // Only the crew medical officer, and only after a profile was picked (the welcome screen comes first)
    if (!App.getSavedProfileKey() || App.getProfile().key !== "doctor") {
        return;
    }

    var mode = App.getMode();
    var phase = App.getPhase();
    var inFlight = App.isFlight();
    var crew = App.crew;
    var members = crew.members;
    var you = App.getProfile().member;
    var womens = App.store.get("womens-health", {});

    // The page ends on these sections (no module band): keep room for the footer wave
    document.querySelector(".dashboard").classList.add("dashboard--crew");

    var LEVELS = {
        danger: { order: 0, label: "Act now", icon: "#icon-alert" },
        warn: { order: 1, label: "Watch", icon: "#icon-alert" }
    };

    var FILTERS = [
        { key: "all", label: "All" },
        { key: "danger", label: "Act now" },
        { key: "warn", label: "Watch" },
        { key: "ok", label: "Fit" },
        { key: "soon", label: "Not shared" }
    ];

    // Search and status filter, kept while the cards are redrawn
    var filter = { query: "", status: "all" };

    function $(selector) {
        return document.querySelector(selector);
    }

    function setText(selector, text) {
        var el = $(selector);
        if (el && el.textContent !== text) {
            el.textContent = text;
        }
    }

    function shortName(alert) {
        return alert.who.replace(/ \(.*\)/, "");
    }

    // Rank + surname initials for the avatar: "Cmdr. Silva" → "CS"
    function initials(name) {
        return name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map(function (word) {
            return word.charAt(0).toUpperCase();
        }).join("");
    }

    // Flight phase, the same for the whole crew (set by the mission dates)
    function phaseText() {
        if (phase.key === "pre") {
            return "Before flight · launch in " + phase.daysToLaunch + " days";
        }
        if (phase.key === "post") {
            return "After flight · day " + phase.daysSinceLanding + " back on Earth";
        }
        return "In flight · day " + phase.missionDay + " of " + mode.length + " · " + mode.missionName;
    }

    /* ---------- Who leads (in flight) ---------- */
    if (inFlight) {
        if (mode.crewLeads || App.isLinkLost()) {
            $("[data-lead-notice]").classList.replace("notice--info", "notice--warn");
            $("[data-lead-notice] use").setAttribute("href", "#icon-alert");
            setText("[data-lead-title]", "You lead medical decisions");
            setText("[data-lead-text]", App.isLinkLost()
                ? "There is no contact with Earth right now. Start each guide on board; the log is sent at the next contact."
                : "Earth is " + mode.delay + " away in each direction and evacuation is not possible. Start each guide on board and send the log to Earth.");
        } else {
            setText("[data-lead-title]", "Ground flight surgeon leads");
            setText("[data-lead-text]", "Signal delay is " + mode.delay + ". You support on board and call the flight surgeon for decisions.");
        }
    }

    function earthContact(urgent) {
        if (App.isLinkLost()) {
            return "No contact with Earth now: start the guide on board. The log is sent at the next contact.";
        }
        if (mode.crewLeads) {
            return "Send the log to Earth now. A reply takes at least twice the delay (" + mode.delay + " each way), so do not wait for it to start the guide.";
        }
        return urgent ? "Call the flight surgeon now, the delay is only " + mode.delay + "." : "Report at the next daily medical check-in.";
    }

    var alerts = inFlight ? crew.buildAlerts() : null;
    var list = $("[data-alerts-list]");
    var template = $("[data-alert-template]");
    var statusLine = $("[data-alerts-status]");

    /* ---------- Alerts ---------- */

    // Only tests the sensors cannot run have a field (the urine strip result)
    function buildField(alert, field) {
        var id = alert.id + "-" + field.key;
        var wrap = document.createElement("div");
        wrap.className = "field";
        var label = document.createElement("label");
        label.className = "field__label";
        label.htmlFor = id;
        label.textContent = field.label;
        var input = document.createElement("select");
        var empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "Choose a result";
        input.appendChild(empty);
        field.options.forEach(function (value) {
            var option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            input.appendChild(option);
        });
        input.className = "field__input";
        input.id = id;
        input.setAttribute("aria-describedby", alert.id + "-error");
        input.setAttribute("data-field", field.key);
        wrap.appendChild(label);
        wrap.appendChild(input);
        return wrap;
    }

    // Reads the form; returns { reading } or { error, input }
    function readForm(alert, form) {
        var reading = {};
        var problem = null;
        alert.fields.forEach(function (field) {
            var input = form.querySelector("[data-field='" + field.key + "']");
            input.classList.remove("field__input--invalid");
            input.removeAttribute("aria-invalid");
            if (!problem && !input.value) {
                problem = { error: "Choose the " + field.label.toLowerCase() + ".", input: input };
            }
            reading[field.key] = input.value;
        });
        return problem || { reading: reading };
    }

    function stepsProgress(alert) {
        return alerts.stateOf(alert).steps.length + " of " + alert.steps.length + " steps done";
    }

    // The bar under the text shows the same count (the text says it; the bar is aria-hidden)
    function setBar(bar, alert) {
        bar.style.setProperty("--fill", Math.round(alerts.stateOf(alert).steps.length / alert.steps.length * 100) + "%");
    }

    // Latest result for the card text: temperature comes from the shirt's recheck (shared with the astronaut's Home)
    function latestReading(alert) {
        if (alert.temperature) {
            var recheck = crew.getRecheck(alert.member);
            return recheck.reading ? { reading: { value: recheck.reading.value }, time: recheck.reading.time } : null;
        }
        var state = alerts.stateOf(alert);
        return state.reading ? { reading: state.reading, time: state.time } : null;
    }

    // Temperature: with every step ticked the shirt rechecks on its own; without signal it cannot
    function shirtNote(alert) {
        var recheck = crew.getRecheck(alert.member);
        if (!crew.signalOf(alert.member, "temp").on) {
            return "The shirt is off, so it cannot recheck. Ask the crew member to put it back on.";
        }
        if (recheck.autoAt) {
            return "The shirt takes a new reading at " + App.formatTime(new Date(recheck.autoAt)) + " (in about " +
                Math.max(1, Math.round((recheck.autoAt - Date.now()) / 1000)) + " s in this demo, 30 min on board).";
        }
        var latest = latestReading(alert);
        return latest ? (crew.temperatureCheck(latest.reading.value).note || "") : "Tick every step and the shirt rechecks on its own.";
    }

    function renderCard(alert) {
        var state = alerts.stateOf(alert);
        var level = alerts.levelOf(alert);
        var latest = latestReading(alert);
        var item = template.content.firstElementChild.cloneNode(true);
        var badge = item.querySelector("[data-alert-badge]");

        item.setAttribute("data-member", alert.member || "");
        item.classList.add(level === "danger" ? "card--danger" : "card--warn", "alerts__item");
        badge.classList.add("badge--" + level);
        badge.querySelector("use").setAttribute("href", LEVELS[level].icon);
        item.querySelector("[data-alert-level]").textContent = LEVELS[level].label;
        item.querySelector("[data-alert-title]").textContent = alert.title;
        var person = members[alert.member] || { name: shortName(alert), role: "" };
        var shared = /\(shared with you\)/.test(alert.who);
        item.querySelector("[data-alert-initials]").textContent = initials(person.name);
        item.querySelector("[data-alert-name]").textContent = person.name;
        item.querySelector("[data-alert-role]").textContent = [person.role, shared ? "shared with you" : ""].filter(Boolean).join(" · ");
        item.querySelector("[data-alert-text]").textContent = latest && alert.describe
            ? (alert.temperature ? "Shirt recheck at " : "Rechecked at ") + latest.time + ": " + alert.describe(latest.reading) + ". First report: " + alert.text
            : alert.text;
        item.querySelector("[data-alert-escalate]").textContent = alert.escalate;
        // Out on a rover traverse the medical bay is far: the time back to the base comes first
        var onRover = alert.member && App.getContext(alert.member) === "rover";
        item.querySelector("[data-alert-earth]").textContent = (onRover
            ? "On a rover traverse: the base is about " + App.habitat.roverMinutes + " minutes away. Use the rover kit and guide the rover partner. "
            : "") + earthContact(alert.urgent || level === "danger");
        item.querySelector("[data-alert-log]").textContent = alert.log;
        item.querySelector("[data-alert-exit]").textContent = alert.exit;

        var progress = item.querySelector("[data-alert-progress]");
        var bar = item.querySelector("[data-alert-bar]");
        progress.textContent = stepsProgress(alert);
        setBar(bar, alert);
        var result = item.querySelector("[data-alert-result]");
        result.textContent = alert.temperature ? shirtNote(alert) : state.note;

        // Steps become a checklist, saved without re-rendering so focus stays on the box
        var steps = item.querySelector("[data-alert-steps]");
        alert.steps.forEach(function (step, index) {
            var li = document.createElement("li");
            var label = document.createElement("label");
            var input = document.createElement("input");
            var text = document.createElement("span");
            label.className = "choice";
            input.className = "choice__input";
            input.type = "checkbox";
            input.id = alert.id + "-step-" + index;
            input.checked = state.steps.indexOf(index) !== -1;
            text.className = "choice__label";
            text.textContent = step;
            label.classList.toggle("choice--active", input.checked);
            input.addEventListener("change", function () {
                state.steps = state.steps.filter(function (done) {
                    return done !== index;
                });
                if (input.checked) {
                    state.steps.push(index);
                }
                label.classList.toggle("choice--active", input.checked);
                progress.textContent = stepsProgress(alert);
                setBar(bar, alert);
                alerts.saveSteps();
                if (alert.temperature) {
                    if (state.steps.length === alert.steps.length) {
                        crew.scheduleRecheck(alert.member);
                    } else {
                        crew.cancelRecheck(alert.member);
                    }
                    result.textContent = shirtNote(alert);
                }
            });
            label.appendChild(input);
            label.appendChild(text);
            li.appendChild(label);
            steps.appendChild(li);
        });

        var form = item.querySelector("[data-alert-form]");
        var error = item.querySelector("[data-alert-error]");
        error.id = alert.id + "-error";

        if (!alert.fields) {
            form.hidden = true;
        } else {
            var row = item.querySelector("[data-alert-fields]");
            alert.fields.forEach(function (field) {
                row.appendChild(buildField(alert, field));
            });
            var button = document.createElement("button");
            button.className = "button button--primary";
            button.type = "submit";
            button.innerHTML = "<span class=\"button__text\">Save result</span>";
            row.appendChild(button);

            form.addEventListener("submit", function (event) {
                event.preventDefault();
                var outcome = readForm(alert, form);
                if (outcome.error) {
                    error.textContent = outcome.error;
                    error.hidden = false;
                    outcome.input.classList.add("field__input--invalid");
                    outcome.input.setAttribute("aria-invalid", "true");
                    outcome.input.focus();
                    return;
                }
                var saved = alerts.saveReading(alert, outcome.reading);
                announce(alert, saved.status);
                renderAll();
                focusAfter(alert, saved.status);
            });
        }

        return item;
    }

    function announce(alert, status) {
        var latest = latestReading(alert);
        var what = shortName(alert) + ", " + alert.title.toLowerCase() + ": " + alert.describe(latest.reading) + " at " + latest.time + ". ";
        statusLine.textContent = what + (status === "resolved" ? "Back to normal, moved to Resolved today." : status === "urgent" ? "Escalated to Act now." : "Still open.");
        statusLine.hidden = false;
    }

    // After a save the card is redrawn (or moves out of the list): keep the keyboard on a sensible spot
    function focusAfter(alert, status) {
        if (status === "resolved") {
            $("[data-alerts-counter]").focus();
            return;
        }
        var first = document.getElementById(alert.id + "-" + alert.fields[0].key);
        if (first) {
            first.focus();
        }
    }

    function renderResolved(resolved) {
        var box = $("[data-resolved]");
        var target = $("[data-resolved-list]");
        target.textContent = "";
        box.hidden = resolved.length === 0;
        setText("[data-resolved-label]", "Resolved today (" + resolved.length + ")");

        resolved.forEach(function (alert) {
            var latest = latestReading(alert);
            var li = document.createElement("li");
            var text = document.createElement("p");
            li.className = "alerts__resolved-item";
            li.setAttribute("data-member", alert.member || "");
            text.className = "alerts__resolved-text";
            text.textContent = alert.title + " · " + shortName(alert) + ": " +
                (alert.auto ? alert.auto : "back to normal with " + alert.describe(latest.reading) + " at " + latest.time) +
                " · " + stepsProgress(alert) + ".";
            li.appendChild(text);

            // Undo: reopen if the result was logged by mistake
            if (!alert.auto) {
                var reopen = document.createElement("button");
                reopen.className = "button button--tertiary";
                reopen.type = "button";
                reopen.innerHTML = "<span class=\"button__text\">Reopen</span>";
                reopen.setAttribute("aria-label", "Reopen " + alert.title + " for " + shortName(alert));
                reopen.addEventListener("click", function () {
                    alerts.reopen(alert);
                    statusLine.textContent = alert.title + " reopened.";
                    statusLine.hidden = false;
                    renderAll();
                    $("[data-alerts-counter]").focus();
                });
                li.appendChild(reopen);
            }
            target.appendChild(li);
        });
    }

    /* ---------- Crew records ---------- */

    // Vital signs line for a record: only what is out of range, or "All normal"
    function vitalsSummary(member) {
        var flagged = crew.todayVitals(member).filter(function (item) {
            return item.status !== "ok" && ["hr", "bp", "spo2", "resp", "temp"].indexOf(item.key) !== -1;
        });
        return flagged.length ? flagged.map(function (item) {
            return item.label.replace("Body temperature", "Temperature") + " " + item.text;
        }).join(" · ") : "All normal";
    }

    // Status of one crew member: in flight it follows the open alerts; on Earth there is no flight status to show
    function memberStatus(key) {
        if (phase.key === "pre") {
            return { level: "ok", label: "In training" };
        }
        if (phase.key === "post") {
            return { level: "ok", label: "Readapting" };
        }
        if (!App.getPrivacy(key).vitals.cmo) {
            return { level: "soon", label: "Not shared" };
        }
        var level = alerts.memberLevel(key);
        return { level: level, label: level === "ok" ? "Fit" : LEVELS[level].label };
    }

    // Health rows of the record, by phase
    // Latest glucometer reading (assets/js/glucose.js): value, status word and time
    function glucoseSummary(key) {
        var reading = App.glucose.latest(key);
        return reading
            ? App.glucose.metric.format(reading.value) + " · " + App.statusWord(reading.status) + " · " + App.formatTime(new Date(reading.time))
            : "No reading yet";
    }

    function healthRows(key) {
        var person = members[key];
        var privacy = App.getPrivacy(key);
        if (phase.key === "pre") {
            return [];
        }
        if (phase.key === "post") {
            return [["Rehab", "Day " + phase.daysSinceLanding + " · phase " + (phase.daysSinceLanding <= 3 ? 1 : phase.daysSinceLanding <= 14 ? 2 : 3) + " of 3"]];
        }
        var shared = privacy.vitals.cmo;
        var open = alerts.list.filter(function (alert) {
            return alert.member === key && alerts.statusOf(alert) !== "resolved";
        }).map(function (alert) {
            return alert.title;
        });
        // Readiness is shown large at the top of the card (readinessBlock)
        var rows = [
            ["Open alerts", shared ? (open.length ? open.join(" · ") : "None") : "Not shared"],
            ["Vital signs", shared ? vitalsSummary(key) : "Not shared by crew member"],
            ["Blood glucose", shared ? glucoseSummary(key) : "Not shared by crew member"],
            ["Mood and sleep", privacy.mood.cmo || key === you ? person.mood : "Not shared by crew member"]
        ];
        if (key === "silva" && womens.enabled !== false && privacy.womens.cmo) {
            var silvaAlerts = alerts.list.filter(function (alert) {
                return alert.member === "silva" && (alert.id === "silva-bleeding" || alert.id === "silva-urinary") && alerts.statusOf(alert) !== "resolved";
            });
            rows.push(["Women's health", silvaAlerts.length ? silvaAlerts.map(function (alert) {
                return alert.title;
            }).join(" · ") + " logged" : "No symptoms logged"]);
        }
        var signal = crew.signalOf(key, "hr");
        rows.push(["Data from", signal.on ? person.dataFrom : "No signal from the shirt since " + App.formatTime(new Date(signal.since))]);
        return rows;
    }

    function addRows(target, rows, rowClass, labelClass, valueClass) {
        rows.forEach(function (row) {
            var div = document.createElement("div");
            div.className = rowClass[0] + (row[2] ? " " + rowClass[1] : "");
            div.innerHTML = "<dt class=\"" + labelClass + "\"></dt><dd class=\"" + valueClass + "\"></dd>";
            div.querySelector("dt").textContent = row[0];
            div.querySelector("dd").textContent = row[1];
            target.appendChild(div);
        });
    }

    // Before the flight: the exam counts open that person's exams in a side panel (pages/home/exams.js)
    function examsButton(key) {
        var person = members[key];
        var count = { done: 0, scheduled: 0, open: 0 };
        var due = false;
        crew.preflightExams(key).forEach(function (exam) {
            count[exam.status] += 1;
            due = due || exam.dueSoon;
        });
        var parts = [
            ["done", "#icon-check", count.done + " done"],
            ["scheduled", "#icon-clock", count.scheduled + " scheduled"],
            [due ? "due" : "open", due ? "#icon-alert" : "#icon-info", count.open + " to schedule" + (due ? " · due soon" : "")]
        ];
        var button = document.createElement("button");
        button.type = "button";
        button.className = "crew__exams";
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("data-exams-member", key);
        button.setAttribute("aria-label", "Pre-flight exams of " + person.name + ": " + parts.map(function (part) {
            return part[2];
        }).join(", ") + ". Opens the list to see and schedule them.");
        button.innerHTML =
            "<span class=\"crew__exams-label\"><span class=\"crew__exams-title\">Pre-flight exams</span>" +
            "<svg class=\"crew__exams-arrow\" aria-hidden=\"true\"><use href=\"#icon-arrow\"/></svg></span>" +
            "<span class=\"crew__exams-counts\">" + parts.map(function (part) {
                return "<span class=\"crew__exams-count" + (part[0] === "due" ? " crew__exams-count--due" : "") + "\"><svg class=\"crew__exams-icon\" aria-hidden=\"true\"><use href=\"" + part[1] + "\"/></svg>" + part[2] + "</span>";
            }).join("") + "</span>";
        button.addEventListener("click", function () {
            if (App.examPanel) {
                App.examPanel.open(key);
            }
        });
        return button;
    }

    // Readiness, large, with a bar (in flight, when the crew member shares vital signs)
    function readinessBlock(key) {
        var person = members[key];
        var block = document.createElement("div");
        block.className = "crew__score";
        block.innerHTML = "<p class=\"crew__score-value\"><strong class=\"crew__score-number\"></strong><span class=\"crew__score-unit\">/100 readiness</span></p>" +
            "<span class=\"crew__score-bar\" aria-hidden=\"true\"><span class=\"crew__score-fill\"></span></span>";
        block.querySelector(".crew__score-number").textContent = person.readiness;
        block.querySelector(".crew__score-fill").style.setProperty("--fill", person.readiness + "%");
        return block;
    }

    // Status overview at the top of the panel: how many need attention, by status, and the open alerts
    function renderOverview(levels) {
        var holder = $("[data-crew-stats]");
        if (!holder || !inFlight) {
            return;
        }
        var total = levels.length;
        var count = { danger: 0, warn: 0, ok: 0, soon: 0 };
        levels.forEach(function (level) {
            count[level] += 1;
        });
        var attention = count.danger + count.warn;
        var open = alerts.list.filter(function (alert) {
            return alerts.statusOf(alert) !== "resolved";
        }).length;
        setText("[data-crew-phase]", phaseText());
        setText("[data-crew-headline]", attention
            ? attention + " of " + total + " crew members need attention"
            : "All " + total + " crew members are fit");
        setText("[data-crew-subline]", open
            ? open + (open === 1 ? " open alert" : " open alerts") + (count.danger ? ", " + count.danger + " to act on now" : "") + ". Most urgent first below."
            : "No open alerts. Data updates live from the shirts.");
        var STATS = [
            ["danger", "Act now", "#icon-alert"],
            ["warn", "Watch", "#icon-alert"],
            ["ok", "Fit", "#icon-check"],
            ["soon", "Not shared", "#icon-info"]
        ];
        holder.textContent = "";
        STATS.forEach(function (stat) {
            if (stat[0] === "soon" && !count.soon) {
                return;
            }
            var li = document.createElement("li");
            li.className = "crew__stat";
            li.innerHTML = "<span class=\"crew__stat-number\"></span><span class=\"badge badge--" + stat[0] + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" + stat[2] + "\"/></svg><span class=\"badge__text\"></span></span>";
            li.querySelector(".crew__stat-number").textContent = count[stat[0]];
            li.querySelector(".badge__text").textContent = stat[1];
            holder.appendChild(li);
        });
    }

    function renderCrew() {
        var target = $("[data-crew-list]");
        target.textContent = "";
        var levels = [];

        Object.keys(members).forEach(function (key) {
            var person = members[key];
            var status = memberStatus(key);
            levels.push(status.level);
            var card = document.createElement("li");
            card.className = "card crew__card crew__card--" + status.level + (status.level === "warn" ? " card--warn" : status.level === "danger" ? " card--danger" : "");
            card.setAttribute("data-member", key);
            card.setAttribute("data-status", status.level);

            card.innerHTML =
                "<div class=\"card__header\"><div class=\"crew__person\"><span class=\"crew__avatar\" aria-hidden=\"true\"></span>" +
                "<div class=\"crew__name\"><h3 class=\"card__title\"></h3><p class=\"crew__role\"></p><p class=\"crew__meta\"></p>" +
                "<span class=\"badge crew__badge badge--" + status.level + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" +
                (status.level === "ok" ? "#icon-check" : status.level === "soon" ? "#icon-info" : "#icon-alert") + "\"/></svg><span class=\"badge__text\"></span></span></div></div></div>" +
                "<dl class=\"crew__facts\" aria-label=\"Where\"></dl><dl class=\"crew__data\" aria-label=\"Health\"></dl>";
            card.querySelector(".card__title").textContent = person.name;
            card.querySelector(".crew__avatar").textContent = initials(person.name);
            card.querySelector(".badge__text").textContent = status.label;
            card.querySelector(".crew__role").textContent = person.role + (key === you ? " (you)" : "");
            // Profile in one line; the flight phase is the same for everyone, so it is in the overview
            card.querySelector(".crew__meta").textContent = person.sex + " · " + person.age + " years";

            var facts = card.querySelector(".crew__facts");
            if (inFlight && App.getContext(key) === "rover") {
                addRows(facts, [["Where", "Rover traverse · 12 km from the base, about " + App.habitat.roverMinutes + " min away", true]],
                    ["crew__fact", "crew__fact--wide"], "crew__fact-label", "crew__fact-value");
            } else {
                card.removeChild(facts);
            }
            if (inFlight && App.getPrivacy(key).vitals.cmo) {
                card.insertBefore(readinessBlock(key), card.querySelector(".crew__data"));
            }
            // What needs a decision stays visible (open alerts, vital signs); the rest is one tap away
            var rows = healthRows(key);
            var shown = inFlight ? rows.slice(0, 2) : rows;
            var folded = inFlight ? rows.slice(2) : [];
            addRows(card.querySelector(".crew__data"), shown, ["crew__row", "crew__row"], "crew__label", "crew__value");
            if (folded.length) {
                var more = document.createElement("details");
                more.className = "help crew__more";
                more.innerHTML = "<summary class=\"help__summary\"><span class=\"help__label\">More details<span class=\"sr-only\"></span></span></summary><dl class=\"crew__data\" aria-label=\"More health details\"></dl>";
                more.querySelector(".sr-only").textContent = " for " + person.name;
                addRows(more.querySelector(".crew__data"), folded, ["crew__row", "crew__row"], "crew__label", "crew__value");
                card.querySelector(".crew__data").insertAdjacentElement("afterend", more);
            }
            if (phase.key === "pre") {
                // Before the flight the health data is the exam list: no empty health block
                card.removeChild(card.querySelector(".crew__data"));
                card.appendChild(examsButton(key));
            }

            // Long-term trends, only for data the crew member shares
            if (App.getPrivacy(key).vitals.cmo) {
                var link = document.createElement("a");
                link.className = "button button--tonal crew__link";
                link.href = "pages/vitals/index.html?member=" + key;
                link.innerHTML = "<span class=\"button__text\">See vital signs over time</span>";
                link.setAttribute("aria-label", "See vital signs over time for " + person.name);
                card.appendChild(link);
            }
            target.appendChild(card);
        });
        renderOverview(levels);
    }

    /* ---------- Search and filters ---------- */

    function matches(key) {
        var person = members[key];
        var query = filter.query.trim().toLowerCase();
        var byText = !query || (person.name + " " + person.role).toLowerCase().indexOf(query) !== -1;
        var byStatus = filter.status === "all" || !inFlight || memberStatus(key).level === filter.status;
        return byText && byStatus;
    }

    function applyFilter() {
        var keys = Object.keys(members);
        var shown = keys.filter(matches);

        document.querySelectorAll("[data-crew-list] > li").forEach(function (card) {
            card.hidden = shown.indexOf(card.getAttribute("data-member")) === -1;
        });
        // Alerts follow the same choice; whole-crew alerts (space weather) always stay
        var filtering = filter.query.trim() || filter.status !== "all";
        document.querySelectorAll("[data-alerts-list] > li, [data-resolved-list] > li").forEach(function (item) {
            var member = item.getAttribute("data-member");
            item.hidden = Boolean(filtering && member && shown.indexOf(member) === -1);
        });

        var total = keys.length;
        setText("[data-crew-count]", shown.length === total
            ? total + " crew members"
            : shown.length + " of " + total + " crew members" + (inFlight && filtering ? " · alerts filtered too" : ""));
        $("[data-crew-empty]").hidden = shown.length > 0;
        var status = FILTERS.filter(function (choice) {
            return choice.key === filter.status;
        })[0];
        var what = [filter.query.trim() ? "“" + filter.query.trim() + "”" : "", filter.status !== "all" && inFlight ? "status " + status.label : ""].filter(Boolean).join(" and ");
        setText("[data-crew-empty-text]", "No crew member matches " + what + ".");
    }

    function renderFilters() {
        var holder = $("[data-crew-filter]");
        FILTERS.forEach(function (choice) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "filter-chips__chip" + (choice.key === filter.status ? " filter-chips__chip--active" : "");
            button.setAttribute("aria-pressed", choice.key === filter.status ? "true" : "false");
            button.setAttribute("data-filter", choice.key);
            button.innerHTML = "<span class=\"filter-chips__text\"></span>";
            button.querySelector(".filter-chips__text").textContent = choice.label;
            button.addEventListener("click", function () {
                setStatus(choice.key);
            });
            holder.appendChild(button);
        });
    }

    function setStatus(key) {
        filter.status = key;
        document.querySelectorAll("[data-crew-filter] .filter-chips__chip").forEach(function (chip) {
            var on = chip.getAttribute("data-filter") === key;
            chip.setAttribute("aria-pressed", on ? "true" : "false");
            chip.classList.toggle("filter-chips__chip--active", on);
        });
        applyFilter();
    }

    var search = $("[data-crew-search]");
    search.addEventListener("input", function () {
        filter.query = search.value;
        applyFilter();
    });
    $("[data-crew-clear]").addEventListener("click", function () {
        search.value = "";
        filter.query = "";
        setStatus("all");
        search.focus();
    });

    /* ---------- Render ---------- */

    function renderAll() {
        // Keep the keyboard where it was when the cards are redrawn
        var focusedId = document.activeElement && document.activeElement.id;

        if (inFlight) {
            var open = alerts.list.filter(function (alert) {
                return alerts.statusOf(alert) !== "resolved";
            });
            var resolved = alerts.list.filter(function (alert) {
                return alerts.statusOf(alert) === "resolved";
            });
            open.sort(function (a, b) {
                return LEVELS[alerts.levelOf(a)].order - LEVELS[alerts.levelOf(b)].order;
            });
            list.textContent = "";
            open.forEach(function (alert) {
                list.appendChild(renderCard(alert));
            });
            renderResolved(resolved);
            var urgent = open.filter(function (alert) {
                return alerts.levelOf(alert) === "danger";
            }).length;
            setText("[data-alerts-counter]", open.length
                ? open.length + (open.length === 1 ? " open alert" : " open alerts") + (urgent ? ", " + urgent + " need action now" : "")
                : "No open alerts");
        }
        renderCrew();
        applyFilter();

        if (focusedId && document.activeElement !== document.getElementById(focusedId) && document.getElementById(focusedId)) {
            document.getElementById(focusedId).focus();
        }
    }

    setText("[data-crew-subtitle]", phase.key === "pre"
        ? "Each crew member's record. Open Pre-flight exams on a card to see what is done, scheduled and still to schedule, and to book it."
        : phase.key === "post"
            ? "Each crew member's record. After landing, rehab is followed by the flight surgeons."
            : "Today's status of each crew member.");
    if (inFlight) {
        renderFilters();
    }
    renderAll();

    // A booking changed in the exam panel: redraw the cards with the new counts
    document.addEventListener("exams:change", function () {
        renderAll();
    });

    // Live data: redraw only when a status, a signal or a shirt recheck changes, never on every 5-second sample
    var signature = "";

    function currentSignature() {
        return JSON.stringify(Object.keys(members).map(function (key) {
            var recheck = crew.getRecheck(key);
            return [crew.todayVitals(key).map(function (item) {
                return item.status + item.signal;
            }), recheck.reading, Boolean(recheck.autoAt)];
        }));
    }
    signature = currentSignature();
    document.addEventListener("health:sample", function () {
        var next = currentSignature();
        if (next !== signature) {
            signature = next;
            renderAll();
        }
    });

    // Space weather alert from real NASA DONKI events, added when the page is idle; it clears on its own when DONKI is quiet.
    // Only in flight, and with no link to Earth there is no new data, so no request.
    if (!inFlight || App.isLinkLost()) {
        return;
    }
    App.whenIdle(function () {
        App.loadSpaceWeather(function (weather) {
            if (weather.level === "ok") {
                return;
            }
            alerts.list.push({
                id: "space-weather",
                level: weather.level,
                title: weather.level === "danger" ? "Radiation storm" : "Solar storm watch",
                who: "Whole crew · " + (weather.source === "nasa" ? "NASA DONKI" : "Simulated data"),
                text: weather.level === "danger"
                    ? "A solar energetic particle event was recorded this week. These particles raise the crew dose quickly."
                    : "A fast solar eruption (" + weather.fastest.speed + " km/s) left the Sun this week and can trigger a radiation storm within hours.",
                steps: [
                    "Make sure every crew member is wearing a dosimeter.",
                    "Confirm the storm shelter: the most shielded module, with water and supplies around it.",
                    "Postpone spacewalks until the risk passes.",
                    "If the dose rate rises, move the whole crew to the shelter."
                ],
                escalate: "The dosimeter dose-rate alarm sounds.",
                urgent: weather.level === "danger",
                log: "Time in the shelter and each crew member's dosimeter reading.",
                exit: "NASA DONKI shows no new solar events for 7 days and the dosimeter dose rate is back to normal. This updates on its own."
            });
            renderAll();
        });
    });
})();
