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

    /*
     * Section groups (one at a time, so the page is never an endless scroll): Cycle, Body, History.
     * A link to a section (#history, #bone, #clot, #diary) opens its group.
     */
    var GROUP_HINTS = {
        cycle: "Calendar, daily log and supplies.",
        body: "Urinary symptoms, bone health and blood clot signs.",
        history: "Your health history and research sharing."
    };
    var groupTabs = Array.prototype.slice.call(document.querySelectorAll("[data-wh-tab]"));

    function groupOfHash() {
        var target = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
        var section = target && target.closest("[data-wh-group]");
        return section ? section.getAttribute("data-wh-group") : null;
    }

    var group = groupOfHash() || "cycle";

    function renderGroupTabs() {
        groupTabs.forEach(function (tab) {
            var on = tab.getAttribute("data-wh-tab") === group;
            tab.setAttribute("aria-pressed", on ? "true" : "false");
            tab.classList.toggle("tabs__tab--active", on);
        });
        setText("[data-wh-hint]", GROUP_HINTS[group]);
    }

    function showGroup(next) {
        if (next === group) {
            return;
        }
        group = next;
        renderGroupTabs();
        renderModule();
    }

    groupTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            showGroup(tab.getAttribute("data-wh-tab"));
            announce(tab.textContent.trim() + ": " + GROUP_HINTS[group]);
        });
    });

    window.addEventListener("hashchange", function () {
        var next = groupOfHash();
        if (next) {
            showGroup(next);
            document.getElementById(location.hash.slice(1)).scrollIntoView({ block: "start" });
        }
    });

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
            var otherGroup = section.hasAttribute("data-wh-group") && section.getAttribute("data-wh-group") !== group;
            section.hidden = !state.enabled || !App.isPhaseVisible(section) || tooEarly || otherGroup;
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
        // From the anamnesis mapped before launch (history() is defined further down and only read here)
        if ((history().condicoes_previas || []).indexOf("infeccao_urinaria_repetida") !== -1) {
            lines.push("Repeated urinary infections are in your health history: tell your medical lead today, even if the symptoms are mild.");
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
    // Spotting days (logged in the daily symptom log): shown apart from bleeding, never counted as a period
    if (!Array.isArray(state.spotting)) {
        state.spotting = [];
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
        var spots = {};
        state.spotting.forEach(function (key) {
            spots[key] = true;
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
            spots: spots,
            starts: starts,
            cycles: cycles,
            avgCycle: avgCycle,
            avgPeriod: avgPeriod,
            next: next,
            predicted: predicted,
            suppressed: suppressed,
            spread: cycles.length >= 2 ? Math.max.apply(null, cycles) - Math.min.apply(null, cycles) : 0,
            recentBleeding: suppressed && days.concat(Object.keys(spots)).some(function (key) {
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
            var spotted = !!data.spots[key] && !logged;
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
                (spotted ? " calendar__day--spotting" : "") +
                (expected ? " calendar__day--predicted" : "") +
                (ms === todayMs ? " calendar__day--today" : "");
            button.setAttribute("data-day", key);
            button.disabled = ms > todayMs; // bleeding cannot be logged in the future

            if (ms === todayMs) {
                label += ", today";
            }
            if (logged) {
                label += ", bleeding logged";
            }
            if (spotted) {
                label += ", spotting logged";
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

    /*
     * What a tap marks: bleeding, spotting or clear the day. Tapping a day that already has the chosen mark undoes it.
     * On the continuous pill bleeding is suppressed, so spotting is the first choice.
     */
    var MARK_NAMES = { bleeding: "Bleeding", spotting: "Spotting" };
    var calModes = Array.prototype.slice.call(document.querySelectorAll("[data-cal-mode]"));
    var calMode = state.plan === "pill" ? "spotting" : "bleeding";
    var calStatusKey = null;

    function renderCalMode() {
        calModes.forEach(function (radio) {
            radio.checked = radio.value === calMode;
            radio.closest(".choice").classList.toggle("choice--active", radio.checked);
        });
    }

    calModes.forEach(function (radio) {
        radio.addEventListener("change", function () {
            calMode = radio.value;
            renderCalMode();
        });
    });

    function markOf(key) {
        if (state.periods.indexOf(key) !== -1) {
            return "bleeding";
        }
        return state.spotting.indexOf(key) !== -1 ? "spotting" : null;
    }

    // Under the grid: what the last tap did, with a shortcut to that day in the daily log
    function showCalStatus(key, before, after) {
        var date = shortDate(keyMs(key));
        var text = after
            ? MARK_NAMES[after] + " logged on " + date + "."
            : before ? MARK_NAMES[before] + " removed from " + date + "." : "Nothing was marked on " + date + ".";
        calStatusKey = key;
        setText("[data-cal-status-text]", text + (after ? " Tap the day again to undo." : ""));
        setText("[data-cal-details-text]", "Open " + date + " in the daily log");
        $("[data-cal-details]").hidden = !after;
        $("[data-cal-status]").hidden = false;
        announce(text);
    }

    $("[data-cal-grid]").addEventListener("click", function (event) {
        var button = event.target.closest(".calendar__day");
        if (!button || button.disabled) {
            return;
        }
        var key = button.getAttribute("data-day");
        var before = markOf(key);
        var after = calMode === "clear" || before === calMode ? null : calMode;
        removeDay(state.periods, key);
        removeDay(state.spotting, key);
        if (after === "bleeding") {
            state.periods.push(key);
        } else if (after === "spotting") {
            state.spotting.push(key);
        }
        save();
        // Keep the daily log in step. Spotting is exact ("escape"); for bleeding the app never guesses how heavy it was,
        // so a mismatching answer goes back to "Not logged"
        var diaryRow = rowOn("diario_saude_feminina", key);
        if (diaryRow && diaryRow.sangramento) {
            var answer = BLEEDING_DAYS.indexOf(diaryRow.sangramento) !== -1 ? "bleeding" : diaryRow.sangramento === "escape" ? "spotting" : null;
            if (answer !== after) {
                App.records.update("diario_saude_feminina", diaryRow.id, { sangramento: after === "spotting" ? "escape" : null });
            }
            renderDiaryHistory();
            if (diaryDate.value === key) {
                loadDiary(key);
            }
        }
        renderCalendar(key);
        showCalStatus(key, before, after);
    });

    // Opens that day in the daily log, where the flow, cramps and symptoms are logged
    $("[data-cal-details]").addEventListener("click", function () {
        if (!calStatusKey) {
            return;
        }
        diaryDate.value = calStatusKey;
        loadDiary(calStatusKey);
        diaryResult.textContent = "";
        diaryDate.focus();
        announce("Daily log open for " + shortDate(keyMs(calStatusKey)) + ".");
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
        state.spotting = [];
        state.periodsSimulated = false;
        $("[data-cal-status]").hidden = true;
        save();
        renderCalendar();
        announce("Simulated history cleared. Tap the days you had bleeding to start your own history.");
    });

    /*
     * Daily symptom log, bone health and blood clot signs, saved through App.records with the backend names.
     * Every field is optional: what is left empty is saved as null ("not logged"), never as "no".
     */
    var member = App.getProfile().member;
    var BLEEDING_DAYS = ["leve", "moderado", "intenso"];
    var CRAMPS = ["none", "mild", "moderate", "severe"];

    function inputs(selector) {
        return Array.prototype.slice.call(document.querySelectorAll(selector));
    }

    function labelOf(input) {
        return input.closest(".choice").querySelector(".choice__label").textContent;
    }

    function checkedValues(selector) {
        return inputs(selector).filter(function (input) {
            return input.checked;
        }).map(function (input) {
            return input.value;
        });
    }

    function labelsOf(selector, values) {
        return inputs(selector).filter(function (input) {
            return values.indexOf(input.value) !== -1;
        }).map(labelOf);
    }

    function markActive(selector) {
        inputs(selector).forEach(function (input) {
            input.closest(".choice").classList.toggle("choice--active", input.checked);
        });
    }

    function setChecked(selector, values) {
        inputs(selector).forEach(function (input) {
            input.checked = values.indexOf(input.value) !== -1;
        });
        markActive(selector);
    }

    // Chips show their state with a border; radios also clear the other chips of the same group
    function watchChips(selector) {
        inputs(selector).forEach(function (input) {
            input.addEventListener("change", function () {
                markActive(selector);
            });
        });
    }

    function removeDay(list, key) {
        var index = list.indexOf(key);
        if (index !== -1) {
            list.splice(index, 1);
        }
    }

    function rowOn(table, key) {
        return App.records.list(table, { usuario_id: member }).filter(function (row) {
            return row.data_registro === key;
        })[0] || null;
    }

    // A notice inside a result box: level info, warn or danger; lines are plain text (no HTML from input)
    function showNotice(container, level, title, lines) {
        container.textContent = "";
        var box = document.createElement("div");
        box.className = "notice notice--" + level;
        box.innerHTML = '<svg class="notice__icon" aria-hidden="true"><use href="' + (level === "info" ? "#icon-check" : "#icon-alert") + '"/></svg><div class="notice__text"><p class="notice__title"></p></div>';
        box.querySelector(".notice__title").textContent = title;
        var text = box.querySelector(".notice__text");
        lines.forEach(function (line) {
            var p = document.createElement("p");
            p.textContent = line;
            text.appendChild(p);
        });
        container.appendChild(box);
        return text;
    }

    function sharingLine() {
        return canMedicalLeadSee()
            ? "Shared with your medical lead: " + App.getMedicalLead().name.toLowerCase() + "."
            : "Not shared: your medical lead cannot see this log. You can share it in Privacy.";
    }

    function countLog() {
        state.logs = (state.logs || 0) + 1;
        save();
        renderResearch();
    }

    /*
     * ---------- Health history (anamnesis) ----------
     * Mapped before launch (editable only in the "pre" phase). In flight and after landing it is read only:
     * the logs never ask for it again and use it in their advice.
     */
    var HISTORY_TABLE = "anamnese_saude_feminina";
    var HISTORY_GROUPS = [
        { column: "condicoes_previas", selector: "[data-history-condition]" },
        { column: "fatores_risco_osseo", selector: "[data-history-bone]" },
        { column: "fatores_risco_trombose", selector: "[data-history-clot]" }
    ];
    var historyPhase = App.getPhase().key;
    HISTORY_GROUPS.forEach(function (group) {
        watchChips(group.selector);
    });

    function history() {
        return App.records.latest(HISTORY_TABLE, member) || {};
    }

    // Before launch it sits with the other pre-flight planning. In flight and after landing it is a read-only
    // reference, so it moves below the logs used every day (moved in the DOM, so the Tab order follows)
    if (historyPhase !== "pre") {
        var historySection = $(".history");
        var researchSection = $(".research");
        if (historySection && researchSection) {
            researchSection.parentNode.insertBefore(historySection, researchSection);
        }
    }

    // The demo crew member flies with a history mapped before launch, like every real astronaut
    if (historyPhase !== "pre" && !App.records.latest(HISTORY_TABLE, member)) {
        App.records.insert(HISTORY_TABLE, {
            usuario_id: member,
            condicoes_previas: ["colica_intensa", "infeccao_urinaria_repetida"],
            fatores_risco_osseo: ["historico_familiar"],
            fatores_risco_trombose: usesPills() ? ["pilula_estrogenio"] : []
        });
        state.historySimulated = true;
        save();
    }

    function historyText(selector, values, none) {
        return values && values.length ? labelsOf(selector, values).join(", ") : none;
    }

    function renderHistory() {
        var row = history();
        var mapped = !!row.usuario_id;
        HISTORY_GROUPS.forEach(function (group) {
            setChecked(group.selector, row[group.column] || []);
        });

        // Read-only summary (in flight and after landing)
        var list = $("[data-history-list]");
        list.textContent = "";
        HISTORY_GROUPS.forEach(function (group) {
            var legend = $(group.selector).closest("fieldset").querySelector("legend").firstChild.textContent.trim();
            var item = document.createElement("div");
            item.className = "history__item";
            var term = document.createElement("dt");
            term.className = "history__term";
            term.textContent = legend;
            var value = document.createElement("dd");
            value.className = "history__value";
            value.textContent = mapped ? historyText(group.selector, row[group.column], "None mapped") : "Not mapped before launch";
            item.appendChild(term);
            item.appendChild(value);
            list.appendChild(item);
        });
        $("[data-history-demo]").hidden = !state.historySimulated;
        setText("[data-history-status]", mapped && row.atualizado_em
            ? "Saved on " + shortDate(Date.parse(row.atualizado_em)) + ". You can change it until launch."
            : "Not saved yet. Nothing applies? Save it empty.");

        // The bone and clot logs say what they take from the history
        var missing = historyPhase === "pre"
            ? "Fill in your health history above so the advice takes it into account."
            : "No health history was mapped before launch: ask your flight surgeon to add it.";
        setText("[data-bone-history]", !mapped ? missing : row.fatores_risco_osseo && row.fatores_risco_osseo.length
            ? "From your health history: " + historyText("[data-history-bone]", row.fatores_risco_osseo).toLowerCase() + ". The advice takes it into account."
            : "No bone health risks in your health history.");
        setText("[data-clot-history]", !mapped ? missing : row.fatores_risco_trombose && row.fatores_risco_trombose.length
            ? "From your health history: " + historyText("[data-history-clot]", row.fatores_risco_trombose).toLowerCase() + ". The advice takes it into account."
            : "No blood clot risks in your health history.");
    }

    $("[data-history-form]").addEventListener("submit", function (event) {
        event.preventDefault();
        // Only before launch: during the mission the form is hidden and the data is read only
        if (historyPhase !== "pre") {
            return;
        }
        var row = { usuario_id: member };
        HISTORY_GROUPS.forEach(function (group) {
            row[group.column] = checkedValues(group.selector);
        });
        App.records.upsert(HISTORY_TABLE, row, ["usuario_id"]);
        state.historySimulated = false;
        save();
        renderHistory();
        showNotice($("[data-history-result]"), "info", "Health history saved", [
            "Your flight surgeon reviews it before launch. During the mission it is not asked again: the app uses it in the advice of your logs.",
            sharingLine()
        ]);
        announce("Health history saved.");
    });

    /* ---------- Daily symptom log ---------- */
    var diaryForm = $("[data-diary-form]");
    var diaryDate = $("[data-diary-date]");
    var diaryNotes = $("[data-diary-notes]");
    var diaryResult = $("[data-diary-result]");
    var todayDiaryKey = dayKey(todayMs);

    diaryDate.max = todayDiaryKey;
    diaryDate.value = todayDiaryKey;
    watchChips("[data-diary-bleeding]");
    watchChips("[data-diary-cramps]");
    watchChips("[data-diary-symptom]");

    function loadDiary(key) {
        var row = rowOn("diario_saude_feminina", key) || {};
        setChecked("[data-diary-bleeding]", [row.sangramento || ""]);
        setChecked("[data-diary-cramps]", [row.colica_escala === null || row.colica_escala === undefined ? "" : String(row.colica_escala)]);
        setChecked("[data-diary-symptom]", row.sintomas || []);
        diaryNotes.value = row.notas_privadas || "";
    }

    function diarySummary(row) {
        var parts = [];
        if (row.sangramento) {
            parts.push("Bleeding: " + labelsOf("[data-diary-bleeding]", [row.sangramento])[0].toLowerCase());
        }
        if (row.colica_escala !== null && row.colica_escala !== undefined) {
            parts.push("Cramps: " + CRAMPS[row.colica_escala]);
        }
        if (row.sintomas && row.sintomas.length) {
            parts.push(labelsOf("[data-diary-symptom]", row.sintomas).join(", "));
        }
        if (row.notas_privadas) {
            parts.push("private note");
        }
        return parts.join(" · ");
    }

    function renderDiaryHistory() {
        var list = $("[data-diary-history]");
        var rows = App.records.list("diario_saude_feminina", { usuario_id: member }).filter(diarySummary).sort(function (a, b) {
            return a.data_registro < b.data_registro ? 1 : -1;
        }).slice(0, 7);
        list.textContent = "";
        $("[data-diary-empty]").hidden = rows.length > 0;
        rows.forEach(function (row) {
            var item = document.createElement("li");
            item.className = "diary__entry";
            var button = document.createElement("button");
            button.type = "button";
            button.className = "diary__entry-button";
            button.setAttribute("data-diary-day", row.data_registro);
            var date = document.createElement("strong");
            date.className = "diary__entry-date";
            date.textContent = shortDate(keyMs(row.data_registro)) + (row.data_registro === todayDiaryKey ? " (today)" : "");
            var text = document.createElement("span");
            text.className = "diary__entry-text";
            text.textContent = diarySummary(row);
            var hint = document.createElement("span");
            hint.className = "sr-only";
            hint.textContent = ". Edit this day";
            button.appendChild(date);
            button.appendChild(text);
            button.appendChild(hint);
            item.appendChild(button);
            list.appendChild(item);
        });
    }

    // Bleeding answers feed the cycle calendar; "Not logged" leaves the calendar as it is
    function syncCalendar(key, bleeding) {
        $("[data-cal-status]").hidden = true;
        if (!bleeding) {
            return;
        }
        removeDay(state.periods, key);
        removeDay(state.spotting, key);
        if (BLEEDING_DAYS.indexOf(bleeding) !== -1) {
            state.periods.push(key);
        } else if (bleeding === "escape") {
            state.spotting.push(key);
        }
        save();
        renderCalendar();
    }

    function diaryAdvice(row) {
        var lines = [];
        var symptoms = row.sintomas || [];
        // Conditions mapped in the anamnesis before launch change what the same symptom means
        var conditions = history().condicoes_previas || [];
        var had = function (condition) {
            return conditions.indexOf(condition) !== -1;
        };
        if (row.sangramento === "intenso") {
            lines.push("Heavy bleeding: in space the body also breaks down more red blood cells (space anemia), so it can leave you tired or dizzy. Tell your medical lead if it lasts more than 7 days or you fill a pad or cup every 1 to 2 hours.");
            if (had("anemia")) {
                lines.push("You have anemia in your health history: tell your medical lead today, they may check your blood count or iron.");
            } else if (had("sangramento_intenso")) {
                lines.push("Heavy periods are in your health history. Tell your medical lead if this one is heavier or longer than usual.");
            }
        }
        if (row.colica_escala === 3 && (had("endometriose") || had("colica_intensa"))) {
            lines.push("Severe cramps are known in your health history (" + labelsOf("[data-history-condition]", conditions.filter(function (c) {
                return c === "endometriose" || c === "colica_intensa";
            })).join(", ").toLowerCase() + "). Follow the pain plan you agreed with your flight surgeon before launch.");
        }
        if (symptoms.indexOf("corrimento_coceira") !== -1 && had("candidiase_repetida")) {
            lines.push("Repeated yeast infections are in your health history: the medical kit has the treatment your flight surgeon planned for this.");
        }
        if (symptoms.indexOf("dor_cabeca") !== -1 && had("enxaqueca_aura")) {
            lines.push("You have migraine with aura in your health history. If the headache is unlike your usual ones, or comes with weakness or trouble speaking, ask for help at once.");
        }
        if (row.sangramento === "escape" && state.plan === "pill") {
            lines.push("Spotting on the continuous pill is common in the first months or after a missed pill. Tell your flight surgeon if it keeps happening.");
        }
        if (row.colica_escala === 3) {
            lines.push("Severe cramps: use a warm pack and the pain relief your flight surgeon approved. If the pain is sudden, on one side, or comes with fever or fainting, contact your medical lead now.");
        }
        if (symptoms.indexOf("corrimento_coceira") !== -1) {
            lines.push("Unusual discharge or itching can be a yeast or vaginal infection, which the limited hygiene on board makes more likely. It is easy to treat early: tell your medical lead.");
        }
        if (symptoms.indexOf("tontura") !== -1 && row.sangramento !== "intenso") {
            lines.push("Dizziness: drink water and sit or strap in. Tell your medical lead if it keeps happening.");
        }
        if (symptoms.indexOf("ondas_calor") !== -1) {
            lines.push("Hot flashes can come from hormone changes. Mention them at your private medical conference.");
        }
        return lines;
    }

    diaryForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var key = diaryDate.value;
        if (!key || key > todayDiaryKey) {
            showNotice(diaryResult, "warn", "Choose today or a day before", ["Symptoms cannot be logged for a day that has not happened yet."]);
            diaryDate.focus();
            return;
        }
        var bleeding = checkedValues("[data-diary-bleeding]")[0] || null;
        var cramps = checkedValues("[data-diary-cramps]")[0];
        var symptoms = checkedValues("[data-diary-symptom]");
        var notes = diaryNotes.value.trim();
        var row = {
            usuario_id: member,
            data_registro: key,
            sangramento: bleeding,
            colica_escala: cramps ? Number(cramps) : null,
            sintomas: symptoms.length ? symptoms : null,
            notas_privadas: notes || null
        };
        if (!diarySummary(row)) {
            showNotice(diaryResult, "info", "Nothing to save", ["Every field is optional. Choose at least one answer, or simply leave this day empty."]);
            return;
        }
        App.records.upsert("diario_saude_feminina", row, ["usuario_id", "data_registro"]);
        syncCalendar(key, bleeding);
        countLog();
        renderDiaryHistory();

        var advice = diaryAdvice(row);
        var lines = ["You logged: " + diarySummary(row) + "."].concat(advice);
        lines.push(sharingLine() + (notes ? " Your private notes are never shared." : ""));
        showNotice(diaryResult, advice.length ? "warn" : "info", "Saved for " + shortDate(keyMs(key)), lines);
        announce("Symptom log saved for " + shortDate(keyMs(key)) + ".");
    });

    $("[data-diary-clear]").addEventListener("click", function () {
        var key = diaryDate.value;
        var row = rowOn("diario_saude_feminina", key);
        if (row) {
            App.records.remove("diario_saude_feminina", row.id);
            if (row.sangramento) {
                syncCalendar(key, "nenhum");
            }
        }
        loadDiary(key);
        renderDiaryHistory();
        diaryResult.textContent = "";
        announce(row ? "Log cleared for " + shortDate(keyMs(key)) + "." : "Nothing was logged on " + shortDate(keyMs(key)) + ".");
    });

    diaryDate.addEventListener("change", function () {
        diaryResult.textContent = "";
        if (diaryDate.value && diaryDate.value <= todayDiaryKey) {
            loadDiary(diaryDate.value);
        }
    });

    $("[data-diary-history]").addEventListener("click", function (event) {
        var button = event.target.closest("[data-diary-day]");
        if (!button) {
            return;
        }
        diaryDate.value = button.getAttribute("data-diary-day");
        loadDiary(diaryDate.value);
        diaryResult.textContent = "";
        diaryDate.focus();
        announce("Editing the log of " + shortDate(keyMs(diaryDate.value)) + ".");
    });

    /* ---------- Bone health ---------- */
    var boneResult = $("[data-bone-result]");
    watchChips("[data-bone-today]");
    watchChips("[data-bone-pain]");

    // Today's answers come only from today's row; the risk factors come from the anamnesis
    function loadBone() {
        var today = rowOn("saude_ossea", todayDiaryKey) || {};
        var todayValues = ["calcio_tomado", "vitamina_d_tomada", "queda_ou_impacto"].filter(function (column) {
            return today[column] === true;
        });
        setChecked("[data-bone-today]", todayValues);
        setChecked("[data-bone-pain]", today.dor_ossea || []);
    }

    $("[data-bone-form]").addEventListener("submit", function (event) {
        event.preventDefault();
        var todayValues = checkedValues("[data-bone-today]");
        var pain = checkedValues("[data-bone-pain]");
        var hadRow = !!rowOn("saude_ossea", todayDiaryKey);
        if (!todayValues.length && !pain.length && !hadRow) {
            showNotice(boneResult, "info", "Nothing to save", ["Every field is optional. Choose at least one answer to start your bone log."]);
            return;
        }
        var row = {
            usuario_id: member,
            data_registro: todayDiaryKey,
            calcio_tomado: todayValues.indexOf("calcio_tomado") !== -1 || null,
            vitamina_d_tomada: todayValues.indexOf("vitamina_d_tomada") !== -1 || null,
            queda_ou_impacto: todayValues.indexOf("queda_ou_impacto") !== -1 || null,
            dor_ossea: pain.length ? pain : null
        };
        App.records.upsert("saude_ossea", row, ["usuario_id", "data_registro"]);
        countLog();

        var risks = history().fatores_risco_osseo || [];
        var lines = [];
        var level = "info";
        if (row.queda_ou_impacto) {
            level = "warn";
            lines.push("After a fall or a hard knock, tell your medical lead today, especially with pain that gets worse, swelling or trouble putting weight on it: bones are weaker after time in microgravity.");
            if (risks.indexOf("fratura_previa") !== -1 || risks.indexOf("historico_familiar") !== -1) {
                lines.push("Your health history (" + labelsOf("[data-history-bone]", risks).join(", ").toLowerCase() + ") makes a fracture more likely: ask for a check today, even if the pain is mild.");
            }
        }
        if (pain.length) {
            level = "warn";
            lines.push("Bone or joint pain (" + labelsOf("[data-bone-pain]", pain).join(", ").toLowerCase() + "): keep up your resistive exercise unless it makes the pain worse, and tell your medical lead if it lasts more than a few days.");
        }
        if (!row.calcio_tomado && !row.vitamina_d_tomada) {
            lines.push("Calcium and vitamin D, with your daily resistive exercise, are your main protection against bone loss.");
        }
        if (risks.indexOf("injecao_trimestral") !== -1) {
            lines.push("From your health history: the three-month injection adds bone loss to the loss space already causes. Your flight surgeon follows your bone scans more closely.");
        }
        if (risks.indexOf("ciclo_ausente") !== -1) {
            lines.push("From your health history: periods that stopped without the pill can mean low estrogen, which weakens bones.");
        }
        lines.push(sharingLine());
        showNotice(boneResult, level, "Bone log saved for today", lines);
        announce("Bone log saved for today.");
    });

    /* ---------- Blood clots ---------- */
    var clotResult = $("[data-clot-result]");
    var URGENT_SIGNS = ["falta_ar_subita", "dor_peito"];
    // Anamnesis items that make any warning sign more likely to be a real clot
    var STRONG_CLOT_RISKS = ["historico_pessoal", "disturbio_coagulacao"];
    watchChips("[data-clot-sign]");

    function loadClot() {
        var today = rowOn("sinais_trombose", todayDiaryKey) || {};
        setChecked("[data-clot-sign]", today.sinais || []);
    }

    function clotStatus(signs) {
        if (signs.some(function (sign) { return URGENT_SIGNS.indexOf(sign) !== -1; })) {
            return "critico";
        }
        return signs.length ? "atencao" : "normal";
    }

    function renderClot(row) {
        var signs = row.sinais || [];
        var risks = history().fatores_risco_trombose || [];
        var strong = risks.filter(function (risk) {
            return STRONG_CLOT_RISKS.indexOf(risk) !== -1;
        });
        var flight = App.isFlight();
        if (row.status_alerta === "critico") {
            var text = showNotice(clotResult, "danger", "Act now: these signs can mean a clot in the lungs", [
                flight
                    ? "Stop what you are doing, strap in and press SOS now. The crew medical officer needs to check you right away."
                    : "Call your local emergency number now, or have someone take you to the nearest emergency room.",
                "You logged: " + labelsOf("[data-clot-sign]", signs).join(", ").toLowerCase() + "."
            ]);
            if (flight && App.emergency) {
                var sos = document.createElement("button");
                sos.type = "button";
                sos.className = "button button--primary clot__sos";
                sos.innerHTML = '<span class="button__text">Start SOS</span>';
                sos.addEventListener("click", function () {
                    App.emergency.start(signs.indexOf("dor_peito") !== -1 ? "chest-pain" : "manual", "blood clot signs");
                });
                text.appendChild(sos);
            }
            return;
        }
        if (row.status_alerta === "atencao") {
            var lines = [
                "You logged: " + labelsOf("[data-clot-sign]", signs).join(", ").toLowerCase() + ".",
                "Do not rub or massage the area. Tell your medical lead " + (strong.length ? "now" : "today") + (flight ? ": the crew medical officer can check the vein with the ultrasound." : ".")
            ];
            if (strong.length) {
                lines.push("Your health history (" + labelsOf("[data-history-clot]", strong).join(", ").toLowerCase() + ") makes these signs more likely to be a clot, so do not wait.");
            }
            if (signs.indexOf("inchaco_pescoco") !== -1 && flight) {
                lines.push("Neck vein clots in astronauts were found with this ultrasound, so do not wait for your next weekly scan.");
            }
            if (risks.indexOf("pilula_estrogenio") !== -1) {
                lines.push("Your health history says your pill has estrogen: your medical lead takes it into account in the treatment.");
            }
            var conditions = history().condicoes_previas || [];
            if (signs.indexOf("dor_cabeca_forte") !== -1 && conditions.indexOf("enxaqueca_aura") !== -1) {
                lines.push("You have migraine with aura in your health history. A headache unlike your usual migraines, or with weakness or trouble speaking, needs help at once.");
            }
            lines.push("If you get short of breath or have chest pain, log it again or ask for help at once.");
            lines.push(sharingLine());
            showNotice(clotResult, "warn", "Possible blood clot signs", lines);
            return;
        }
        showNotice(clotResult, "info", "Logged: no warning signs today", [
            risks.length
                ? "Your health history has " + (risks.length === 1 ? "1 blood clot risk" : risks.length + " blood clot risks") + ": move through the day, drink regularly and keep logging any sign."
                : "Move through the day and drink regularly."
        ]);
    }

    function logClot(signs) {
        var row = {
            usuario_id: member,
            data_registro: todayDiaryKey,
            sinais: signs,
            status_alerta: clotStatus(signs)
        };
        var saved = App.records.upsert("sinais_trombose", row, ["usuario_id", "data_registro"]);
        countLog();
        renderClot(saved);
        announce(row.status_alerta === "critico" ? "Urgent blood clot signs logged. Ask for help now." : "Blood clot log saved for today.");
    }

    $("[data-clot-form]").addEventListener("submit", function (event) {
        event.preventDefault();
        var signs = checkedValues("[data-clot-sign]");
        if (!signs.length) {
            showNotice(clotResult, "info", "Choose at least one sign", ["Or press No signs today."]);
            return;
        }
        logClot(signs);
    });

    $("[data-clot-none]").addEventListener("click", function () {
        setChecked("[data-clot-sign]", []);
        logClot([]);
    });

    renderHistory();
    loadDiary(todayDiaryKey);
    renderDiaryHistory();
    loadBone();
    loadClot();
    var todayClot = rowOn("sinais_trombose", todayDiaryKey);
    if (todayClot) {
        renderClot(todayClot);
    }

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
    renderGroupTabs();
    renderModule();
    // Opened with a link to a section: its group is shown, then the page goes to it
    if (groupOfHash()) {
        document.getElementById(location.hash.slice(1)).scrollIntoView({ block: "start" });
    }
    renderPlan();
    renderLog();
    renderResearch();
    renderCalendar();
    renderCalMode();
})();
