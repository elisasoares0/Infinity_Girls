/* Women's health page: opt-in module, cycle plan, contraception supply, urinary log, landing prep */
(function () {
    "use strict";

    var App = window.App;
    var mode = App.getMode();
    var modeKey = App.getModeKey();

    // Simulated pills packed for each mission profile
    var PILLS_ON_BOARD = { station: 160, moon: 40, mars: 600 };


    // Only the female astronaut profile uses this module; anyone else gets a pointer to Profile
    if (App.getProfile().key !== "female") {
        document.querySelectorAll("main > section").forEach(function (section) {
            section.hidden = !(section.classList.contains("page-intro") || section.hasAttribute("data-other-profile"));
        });
        return;
    }

    // On for this profile unless the astronaut turned it off
    var state = App.store.get("womens-health", {});
    state.enabled = state.enabled !== false;
    state.plan = state.plan || "pill";

    function $(selector) {
        return document.querySelector(selector);
    }

    function setText(selector, text) {
        var el = $(selector);
        if (el) {
            el.textContent = text;
        }
    }

    function save() {
        App.store.set("womens-health", state);
    }

    function announce(message) {
        setText("[data-announcer]", message);
    }

    function todayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    function setBadge(badge, icon, level, text, iconId) {
        badge.classList.remove("badge--ok", "badge--warn", "badge--danger", "badge--soon");
        badge.classList.add("badge--" + level);
        icon.setAttribute("href", iconId);
        badge.querySelector(".badge__text").textContent = text;
    }

    // Who can see this module (from the Privacy page)
    function sharingSummary() {
        var sharing = App.getPrivacy().womens;
        var people = [];
        if (sharing.surgeon) {
            people.push("your flight surgeon");
        }
        if (sharing.cmo) {
            people.push("the crew medical officer");
        }
        if (sharing.research) {
            people.push("researchers (anonymized)");
        }
        return people.length ? "Shared with you and " + people.join(", ") + "." : "Only you can see this module.";
    }

    // On Earth the flight surgeon leads; in flight it depends on distance (App.getMedicalLead)
    function canMedicalLeadSee() {
        var sharing = App.getPrivacy().womens;
        return App.getMedicalLead().crewLeads ? sharing.cmo : sharing.surgeon;
    }

    // Module on/off
    var moduleSwitch = $("[data-module-switch]");
    var contents = document.querySelectorAll("[data-module-content]");

    function renderModule() {
        moduleSwitch.checked = state.enabled;
        setText("[data-module-state]", state.enabled ? "On" : "Off");
        // A section shows only when the module is on and it belongs to the current mission phase
        var phaseNow = App.getPhase();
        var daysToLanding = Math.round((phaseNow.landing - phaseNow.today) / 864e5);
        contents.forEach(function (section) {
            // data-final-days: in flight, show only in the last N days before landing
            var finalDays = Number(section.getAttribute("data-final-days"));
            var tooEarly = finalDays && phaseNow.key === "in" && daysToLanding > finalDays;
            section.hidden = !state.enabled || !App.isPhaseVisible(section) || tooEarly;
        });
    }

    moduleSwitch.addEventListener("change", function () {
        state.enabled = moduleSwitch.checked;
        save();
        renderModule();
        announce(state.enabled ? "Women's health module turned on. Its sections for this mission phase are now shown below." : "Women's health module turned off. Your saved data stays on this device.");
    });

    // Cycle plan
    var plans = document.querySelectorAll("[data-plan]");

    function renderPlan() {
        plans.forEach(function (radio) {
            radio.checked = radio.value === state.plan;
            radio.closest(".choice").classList.toggle("choice--active", radio.checked);
        });
        // In flight and after landing the plan is shown, not edited (it is decided before launch)
        plans.forEach(function (radio) {
            if (radio.checked) {
                setText("[data-plan-summary]", "Your plan: " + radio.closest(".choice").querySelector(".choice__title").textContent + " · decided before launch with your flight surgeon");
            }
        });
        renderSupplies();
    }

    plans.forEach(function (radio) {
        radio.addEventListener("change", function () {
            state.plan = radio.value;
            save();
            renderPlan();
            renderCalendar();
            announce("Cycle plan set to " + radio.closest(".choice").querySelector(".choice__title").textContent + ".");
        });
    });

    // Contraception and supplies
    var usesPills = function () {
        return state.plan === "pill" || state.plan === "adjust";
    };

    function renderDose() {
        var card = $("[data-dose-card]");
        var badge = $("[data-dose-badge]");
        var icon = $("[data-dose-icon]");
        var button = $("[data-dose-button]");

        card.classList.toggle("card--hidden", !usesPills());
        if (!usesPills()) {
            return;
        }

        var taken = state.takenOn === todayKey();
        if (taken) {
            setBadge(badge, icon, "ok", "Taken at " + state.takenAt, "#icon-check");
            setText("[data-dose-text]", "Done for today. Next pill tomorrow at the same time.");
        } else {
            setBadge(badge, icon, "soon", "Not taken yet", "#icon-alert");
            setText("[data-dose-text]", "Take it at the same time every day to keep bleeding stopped.");
        }
        // Main action is primary; undoing it is a light, tertiary action
        setText("[data-dose-button-text]", taken ? "Undo" : "Mark as taken");
        button.classList.toggle("button--primary", !taken);
        button.classList.toggle("button--tertiary", taken);
    }

    $("[data-dose-button]").addEventListener("click", function () {
        if (state.takenOn === todayKey()) {
            state.takenOn = null;
            state.logs = Math.max(0, (state.logs || 0) - 1);
            announce("Today's pill marked as not taken.");
        } else {
            state.takenOn = todayKey();
            state.takenAt = App.formatTime(new Date());
            state.logs = (state.logs || 0) + 1;
            announce("Today's pill marked as taken at " + state.takenAt + ".");
        }
        save();
        renderDose();
        renderResearch();
    });

    // Research sharing: same value as Women's health > Researchers on the Privacy page
    var researchSwitch = $("[data-research-switch]");

    function renderResearch() {
        var shared = App.getPrivacy().womens.research;
        var logs = state.logs || 0;
        researchSwitch.checked = shared;
        setText("[data-research-state]", shared ? "Anonymized data shared" : "Not shared");
        setText("[data-research-count]", shared
            ? "Your anonymized logs this mission: " + logs + ". Thank you for helping future crews."
            : "Not shared. You can change this anytime.");
    }

    researchSwitch.addEventListener("change", function () {
        var privacy = App.getPrivacy();
        privacy.womens.research = researchSwitch.checked;
        App.savePrivacy(privacy);
        renderResearch();
        setText("[data-sharing-summary]", sharingSummary());
        announce(researchSwitch.checked
            ? "Researchers now get your anonymized women's health data. Your name is never shared."
            : "Researchers no longer get your women's health data.");
    });

    function renderSupplies() {
        var badge = $("[data-supply-badge]");
        var icon = $("[data-supply-icon]");
        var fill = $("[data-supply-fill]");
        // Before launch you pack for the whole mission; in flight what matters is what is left
        var packing = App.getPhase().key === "pre";
        var daysLeft = packing ? mode.length : mode.length - mode.day;

        setText("[data-mode-name]", mode.name);
        setText("[data-supply-onboard-label]", packing ? "Packed" : "On board");
        setText("[data-supply-needed-label]", packing ? "Needed for the whole mission" : "Needed until mission end");
        renderDose();

        if (!usesPills()) {
            var isDevice = state.plan === "device";
            setText("[data-supply-title]", isDevice ? "IUD or implant" : "Menstrual supplies");
            setText("[data-supply-onboard]", isDevice
                ? (packing ? "Placed before launch" : "In place")
                : (modeKey === "station" ? (packing ? "First weeks packed" : "Restocked by cargo") : "2 reusable cups"));
            setText("[data-supply-needed]", isDevice ? "No refills" : daysLeft + (packing ? " mission days" : " days to go"));
            setText("[data-supply-text]", isDevice
                ? "Nothing to restock. Your flight surgeon checks it at your monthly private conference."
                : modeKey === "mars"
                    ? (packing
                        ? "There is no resupply on the way to Mars: pack for the full " + mode.length + " days or talk to your flight surgeon about an IUD or implant."
                        : "No resupply on the way to Mars, and there are no sustainable options for long missions yet. Review this plan with your flight surgeon.")
                    : (packing && modeKey === "station" ? "Cargo flights restock the station, so you only pack for the first weeks." : "You have what you need for this mission."));
            setBadge(badge, icon, modeKey === "mars" && !isDevice ? "warn" : "ok", modeKey === "mars" && !isDevice ? "Review plan" : "Enough", modeKey === "mars" && !isDevice ? "#icon-alert" : "#icon-check");
            fill.setAttribute("width", "100");
            fill.classList.remove("supplies__fill--short");
            return;
        }

        var onBoard = PILLS_ON_BOARD[modeKey];
        var needed = daysLeft;
        var short = needed - onBoard;

        setText("[data-supply-title]", packing ? "Pills packed for the mission" : "Pill supply on board");
        setText("[data-supply-onboard]", onBoard + " pills");
        setText("[data-supply-needed]", needed + " pills");
        fill.setAttribute("width", Math.min(100, (onBoard / needed) * 100).toFixed(1));
        fill.classList.toggle("supplies__fill--short", short > 0);

        if (short > 0) {
            setBadge(badge, icon, "warn", packing ? short + " more to pack" : "Short by " + short, "#icon-alert");
            setText("[data-supply-text]", packing
                ? "Pack " + short + " more pills before launch" + (modeKey === "mars" ? ", or talk to your flight surgeon about an IUD or implant: there is no resupply on the way to Mars." : ".")
                : modeKey === "mars"
                    ? "There is no resupply on the way to Mars. Talk to your flight surgeon about an IUD or implant, which need no refills."
                    : "Ask ground to add " + short + " pills to the next cargo resupply.");
        } else {
            setBadge(badge, icon, "ok", packing ? "Packed" : "Enough", "#icon-check");
            setText("[data-supply-text]", (packing ? "Packed for the whole mission" : "You have enough until the end of the mission") + ", with " + (onBoard - needed) + " spare.");
        }
    }

    // Urinary symptoms
    var symptomInputs = document.querySelectorAll("[data-symptom]");
    var result = $("[data-symptom-result]");

    symptomInputs.forEach(function (input) {
        input.addEventListener("change", function () {
            input.closest(".choice").classList.toggle("choice--active", input.checked);
        });
    });

    function notice(level, title, lines) {
        var icon = level === "info" ? "#icon-check" : "#icon-alert";
        var html = '<div class="notice notice--' + level + '"><svg class="notice__icon" aria-hidden="true"><use href="' + icon + '"/></svg><div class="notice__text"><p class="notice__title"></p></div></div>';
        result.innerHTML = html;
        result.querySelector(".notice__title").textContent = title;
        var text = result.querySelector(".notice__text");
        lines.forEach(function (line) {
            var p = document.createElement("p");
            p.textContent = line;
            text.appendChild(p);
        });
    }

    function renderLog() {
        var log = state.urinary;
        if (!log) {
            result.innerHTML = "";
            return;
        }
        if (!log.symptoms.length) {
            notice("info", "Logged at " + log.time + ": no symptoms today.", ["Thanks. Keep drinking regularly through the day."]);
            return;
        }

        var lines = [
            "You logged: " + log.symptoms.join(", ").toLowerCase() + ".",
            "Drink an extra 500 ml of water in the next 2 hours and log again in 12 hours. If you have fever, back pain or blood in your urine, contact your medical lead now."
        ];
        lines.push(canMedicalLeadSee()
            ? "Shared with your medical lead: " + App.getMedicalLead().name.toLowerCase() + "."
            : "Not shared: your medical lead cannot see this log. You can share it in Privacy.");
        // The no-evacuation warning only applies while flying to or on Mars
        if (modeKey === "mars" && App.isFlight()) {
            lines.push("On a Mars mission there is no evacuation, so early treatment with the on-board medical kit matters.");
        }
        notice("warn", "Logged at " + log.time + ": possible urinary infection signs", lines);
    }

    function logSymptoms(symptoms) {
        state.urinary = { time: App.formatTime(new Date()), date: todayKey(), symptoms: symptoms };
        state.logs = (state.logs || 0) + 1;
        save();
        renderLog();
        renderResearch();
    }

    $("[data-log-symptoms]").addEventListener("click", function () {
        var chosen = [];
        symptomInputs.forEach(function (input) {
            if (input.checked) {
                chosen.push(input.value);
            }
        });
        if (!chosen.length) {
            notice("info", "Choose at least one symptom", ["Or press No symptoms today."]);
            return;
        }
        logSymptoms(chosen);
    });

    $("[data-log-none]").addEventListener("click", function () {
        symptomInputs.forEach(function (input) {
            input.checked = false;
            input.closest(".choice").classList.remove("choice--active");
        });
        logSymptoms([]);
    });

    // Restore today's symptom selection
    if (state.urinary && state.urinary.date === todayKey()) {
        symptomInputs.forEach(function (input) {
            input.checked = state.urinary.symptoms.indexOf(input.value) !== -1;
            input.closest(".choice").classList.toggle("choice--active", input.checked);
        });
    }

    /*
     * Cycle calendar: log bleeding days, predict the next period and warn about
     * mission-event overlaps, supplies, irregular cycles and unexpected bleeding on the pill.
     * All dates are UTC day keys (YYYY-MM-DD), like every time in the app.
     */
    var DAY = 864e5;
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var EVENT_NAMES = { Launch: "launch", Landing: "landing", EVA: "spacewalk" };
    // Short visual tag for narrow day cells (the day button already says the full event name)
    var EVENT_SHORT = { Launch: "↑", Landing: "↓", EVA: "EVA" };
    var calPhase = App.getPhase();
    var todayMs = calPhase.today.getTime();
    var view = new Date(todayMs);
    var viewYear = view.getUTCFullYear();
    var viewMonth = view.getUTCMonth();

    function dayKey(ms) {
        return new Date(ms).toISOString().slice(0, 10);
    }

    function keyMs(key) {
        return Date.parse(key + "T00:00:00Z");
    }

    function shortDate(ms) {
        var d = new Date(ms);
        return MONTHS[d.getUTCMonth()].slice(0, 3) + " " + d.getUTCDate();
    }

    function mean(values) {
        return values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    }

    // Demo history: 4 periods of 5 days with cycles of 29, 28 and 30 days
    function seedHistory() {
        var lastStart = todayMs - 14 * DAY;
        var days = [];
        [lastStart - 87 * DAY, lastStart - 58 * DAY, lastStart - 30 * DAY, lastStart].forEach(function (start) {
            for (var i = 0; i < 5; i += 1) {
                days.push(dayKey(start + i * DAY));
            }
        });
        return days;
    }

    if (!Array.isArray(state.periods)) {
        state.periods = seedHistory();
        state.periodsSimulated = true;
        save();
    }

    function missionEvents() {
        var events = {};
        events[dayKey(calPhase.launch.getTime())] = "Launch";
        events[dayKey(calPhase.landing.getTime())] = "Landing";
        if (calPhase.key === "in") {
            events[dayKey(todayMs + 16 * DAY)] = "EVA";
        }
        return events;
    }

    function analyze() {
        var set = {};
        state.periods.forEach(function (key) {
            set[key] = true;
        });
        var days = Object.keys(set).sort();
        var starts = days.filter(function (key) {
            return !set[dayKey(keyMs(key) - DAY)];
        });
        var cycles = [];
        for (var i = 1; i < starts.length; i += 1) {
            cycles.push(Math.round((keyMs(starts[i]) - keyMs(starts[i - 1])) / DAY));
        }
        var lengths = starts.map(function (start) {
            var n = 0;
            while (set[dayKey(keyMs(start) + n * DAY)]) {
                n += 1;
            }
            return n;
        });
        var avgCycle = cycles.length ? Math.round(mean(cycles)) : 28;
        var avgPeriod = lengths.length ? Math.round(mean(lengths)) : 5;
        var suppressed = state.plan === "pill";
        var next = null;

        if (!suppressed && starts.length) {
            next = keyMs(starts[starts.length - 1]) + avgCycle * DAY;
            // A cycle already past without a log: look at the coming one
            while (next + avgPeriod * DAY <= todayMs) {
                next += avgCycle * DAY;
            }
        }

        var predicted = {};
        if (next !== null) {
            for (var p = 0; p < avgPeriod; p += 1) {
                predicted[dayKey(next + p * DAY)] = true;
            }
        }

        return {
            set: set,
            starts: starts,
            cycles: cycles,
            avgCycle: avgCycle,
            avgPeriod: avgPeriod,
            next: next,
            predicted: predicted,
            suppressed: suppressed,
            spread: cycles.length >= 2 ? Math.max.apply(null, cycles) - Math.min.apply(null, cycles) : 0,
            recentBleeding: suppressed && days.some(function (key) {
                var ms = keyMs(key);
                return ms <= todayMs && ms > todayMs - 7 * DAY;
            })
        };
    }

    function calNotice(container, level, title, text) {
        var box = document.createElement("div");
        box.className = "notice notice--" + level;
        box.innerHTML = '<svg class="notice__icon" aria-hidden="true"><use href="' + (level === "info" ? "#icon-check" : "#icon-alert") + '"/></svg><div class="notice__text"><p class="notice__title"></p><p></p></div>';
        box.querySelector(".notice__title").textContent = title;
        box.querySelectorAll("p")[1].textContent = text;
        container.appendChild(box);
    }

    function renderAlerts(data, events) {
        var box = $("[data-cal-alerts]");
        box.textContent = "";
        var count = 0;

        // 1. Overlap with mission events (top priority when the plan is to adjust to mission dates)
        Object.keys(data.predicted).forEach(function (key) {
            if (events[key]) {
                count += 1;
                calNotice(box, "warn", "Period may overlap the " + EVENT_NAMES[events[key]] + " on " + shortDate(keyMs(key)),
                    state.plan === "adjust"
                        ? "Your plan is to adjust your cycle to mission dates: talk to your flight surgeon now to shift it."
                        : "Talk to your flight surgeon about adjusting your cycle before then.");
            }
        });

        // 2. Unexpected bleeding while on the continuous pill
        if (data.recentBleeding) {
            count += 1;
            calNotice(box, "warn", "Unexpected bleeding on the continuous pill",
                "Tell your flight surgeon. It can mean a missed pill or your body adapting to the pill.");
        }

        // 3. Irregular cycle
        if (data.spread > 7) {
            count += 1;
            calNotice(box, "warn", "Your cycle length varied by " + data.spread + " days",
                "Mention it in your private medical conference. Stress, sleep and flight can all change your cycle.");
        }

        // 4. Supplies reminder
        if (data.next !== null) {
            var daysUntil = Math.round((data.next - todayMs) / DAY);
            if (daysUntil >= 0 && daysUntil <= 3) {
                count += 1;
                calNotice(box, "info", daysUntil === 0 ? "Period expected today" : "Period expected in " + daysUntil + (daysUntil === 1 ? " day" : " days"),
                    "Check that pads or your cup are within reach.");
            }
        }

        if (!count) {
            calNotice(box, "info", "No alerts",
                data.suppressed
                    ? "Bleeding is suppressed by your continuous pill plan. Log any spotting here."
                    : data.next !== null
                        ? "Next period expected around " + shortDate(data.next) + "."
                        : "Log at least one period to see a prediction.");
        }
    }

    function renderTable(data, events) {
        var rows = [];
        if (data.next !== null) {
            rows.push([shortDate(data.next) + " to " + shortDate(data.next + (data.avgPeriod - 1) * DAY), "Expected period"]);
        }
        Object.keys(events).sort().forEach(function (key) {
            if (keyMs(key) >= todayMs) {
                rows.push([shortDate(keyMs(key)), "Mission " + EVENT_NAMES[events[key]]]);
            }
        });
        if (!rows.length) {
            rows.push(["-", "Nothing coming up"]);
        }
        App.charts.table($("[data-cal-table]"), "Coming dates", ["Date", "What"], rows);
    }

    function renderCalendar(focusKey) {
        var data = analyze();
        var events = missionEvents();
        var grid = $("[data-cal-grid]");
        var first = Date.UTC(viewYear, viewMonth, 1);
        var daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
        var lead = (new Date(first).getUTCDay() + 6) % 7; // weeks start on Monday

        setText("[data-cal-month]", MONTHS[viewMonth] + " " + viewYear);
        grid.textContent = "";

        for (var b = 0; b < lead; b += 1) {
            var blank = document.createElement("span");
            blank.className = "calendar__blank";
            grid.appendChild(blank);
        }

        for (var d = 1; d <= daysInMonth; d += 1) {
            var ms = Date.UTC(viewYear, viewMonth, d);
            var key = dayKey(ms);
            var logged = !!data.set[key];
            var expected = !!data.predicted[key] && !logged;
            var event = events[key];
            var button = document.createElement("button");
            // The accessible name comes from the button's own text (WCAG 2.5.3): the visible number and tag,
            // with the weekday, month and state in screen-reader-only text around them
            var prefix = WEEKDAYS[new Date(ms).getUTCDay()] + ", " + MONTHS[viewMonth] + " ";
            var label = "";

            button.type = "button";
            button.className = "calendar__day" +
                (logged ? " calendar__day--period" : "") +
                (expected ? " calendar__day--predicted" : "") +
                (ms === todayMs ? " calendar__day--today" : "");
            button.setAttribute("data-day", key);
            button.setAttribute("aria-pressed", logged ? "true" : "false");
            button.disabled = ms > todayMs; // bleeding cannot be logged in the future

            if (ms === todayMs) {
                label += ", today";
            }
            if (logged) {
                label += ", bleeding logged";
            }
            if (expected) {
                label += ", period expected";
            }
            if (event) {
                label += ", mission " + EVENT_NAMES[event];
            }

            var before = document.createElement("span");
            before.className = "sr-only";
            before.textContent = prefix;
            button.appendChild(before);
            var number = document.createElement("span");
            number.className = "calendar__number";
            number.textContent = String(d);
            button.appendChild(number);
            if (event) {
                var tag = document.createElement("span");
                tag.className = "calendar__tag";
                tag.innerHTML = "<span class=\"calendar__tag-short\"></span><span class=\"calendar__tag-full\"></span>";
                tag.querySelector(".calendar__tag-short").textContent = " " + EVENT_SHORT[event];
                tag.querySelector(".calendar__tag-full").textContent = " " + event;
                button.appendChild(tag);
            }
            if (label) {
                var after = document.createElement("span");
                after.className = "sr-only";
                after.textContent = label;
                button.appendChild(after);
            }
            grid.appendChild(button);
        }

        setText("[data-cal-cycle]", data.cycles.length ? data.avgCycle + " days" : "Not enough data");
        setText("[data-cal-period]", data.starts.length ? data.avgPeriod + " days" : "Not enough data");
        setText("[data-cal-next-period]", data.suppressed ? "Suppressed" : data.next !== null ? shortDate(data.next) : "Log a period");
        $("[data-cal-demo]").hidden = !state.periodsSimulated;
        renderAlerts(data, events);
        renderTable(data, events);

        if (focusKey) {
            var target = grid.querySelector('[data-day="' + focusKey + '"]');
            if (target) {
                target.focus();
            }
        }
    }

    $("[data-cal-grid]").addEventListener("click", function (event) {
        var button = event.target.closest(".calendar__day");
        if (!button || button.disabled) {
            return;
        }
        var key = button.getAttribute("data-day");
        var index = state.periods.indexOf(key);
        if (index === -1) {
            state.periods.push(key);
            announce("Bleeding logged on " + shortDate(keyMs(key)) + ".");
        } else {
            state.periods.splice(index, 1);
            announce("Bleeding removed from " + shortDate(keyMs(key)) + ".");
        }
        save();
        renderCalendar(key);
    });

    $("[data-cal-prev]").addEventListener("click", function () {
        viewMonth -= 1;
        if (viewMonth < 0) {
            viewMonth = 11;
            viewYear -= 1;
        }
        renderCalendar();
    });

    $("[data-cal-next]").addEventListener("click", function () {
        viewMonth += 1;
        if (viewMonth > 11) {
            viewMonth = 0;
            viewYear += 1;
        }
        renderCalendar();
    });

    $("[data-cal-clear]").addEventListener("click", function () {
        state.periods = [];
        state.periodsSimulated = false;
        save();
        renderCalendar();
        announce("Simulated history cleared. Tap the days you had bleeding to start your own history.");
    });

    // Return to gravity: preparation in flight, readaptation after landing
    var phase = App.getPhase();
    if (phase.key === "post") {
        setText("[data-landing-title]", "Readapting to gravity");
        setText("[data-landing-mode]", "Day " + phase.daysSinceLanding + " back on Earth: stand up slowly and tell your flight surgeon if you feel dizzy or faint.");
    } else {
        setText("[data-landing-mode]", modeKey === "mars"
            ? "On Mars no medical team waits at landing: plan your first standing test with the crew medical officer."
            : "The recovery team and your flight surgeon will meet you at landing.");
    }

    // Pre-flight pregnancy test window: the 10 days before launch
    if (phase.key === "pre") {
        var startsIn = phase.daysToLaunch - 10;
        setText("[data-pregnancy-badge]", startsIn > 0 ? "Starts in " + startsIn + (startsIn === 1 ? " day" : " days") : "Test window open");
    }

    setText("[data-sharing-summary]", sharingSummary());
    renderModule();
    renderPlan();
    renderLog();
    renderResearch();
    renderCalendar();
})();
