/* Body page: mass (SLAMMD), bone density (DXA), exercise, vision (OCT) and recovery, adapted to the mission mode */
(function () {
    "use strict";

    var App = window.App;
    var modeKey = App.getModeKey();
    var mode = App.getMode();
    var phase = App.getPhase();
    // Last day with flight data: today in flight, the landing day after the flight
    var lastDay = App.missionDayFor(mode);

    var LAUNCH_MASS = App.launchMass;
    // Same mass model as the home page (assets/js/app.js)
    var massOnDay = App.massOnDay;
    var MASS_FLOOR = 0.96; // expected range: down to 4% below launch mass
    var BONE_BEFORE = { Hip: 1.02, Spine: 1.1 }; // g/cm², pre-flight DXA (simulated)
    // Monthly loss with ARED, simulated from the research: partial gravity helps but is not enough
    var BONE_LOSS_PER_MONTH = { station: 0.4, moon: 0.3, mars: 0.25 }; // %
    var BONE_WARN_TOTAL = 5; // % lost at landing that triggers a review
    var OCT_ALERT_RISE = 20; // µm above launch value

    function $(selector) {
        return document.querySelector(selector);
    }

    function setText(selector, text) {
        var el = $(selector);
        if (el) {
            el.textContent = text;
        }
    }

    function setBadge(name, level, text) {
        var badge = $("[data-" + name + "-badge]");
        badge.classList.remove("badge--ok", "badge--warn", "badge--danger", "badge--soon");
        badge.classList.add("badge--" + level);
        $("[data-" + name + "-icon]").setAttribute("href", level === "ok" ? "#icon-check" : "#icon-alert");
        setText("[data-" + name + "-badge-text]", text);
        $("[data-" + name + "-card]").classList.toggle("card--warn", level === "warn");
    }

    if (phase.key === "pre") {
        setText("[data-mode-day]", "Launch in " + phase.daysToLaunch + " days · " + mode.name + " mission");
        setText("[data-intro-text]", "Your baseline scans and training plan. Every reading in flight will be compared with them.");
    } else if (phase.key === "post") {
        setText("[data-mode-day]", "Day " + phase.daysSinceLanding + " back on Earth · " + mode.length + "-day mission");
        setText("[data-intro-text]", "How your body changed over " + mode.length + " days in " + mode.env + ", and your plan to recover on Earth.");
    } else {
        setText("[data-mode-day]", "Mission day " + lastDay + " of " + mode.length);
        setText("[data-intro-text]", "How your mass, bones, muscles and eyes are adapting to " + mode.env + ", from launch until today.");
    }

    // Body mass
    (function () {
        var step = Math.max(1, Math.round(lastDay / 6));
        var points = [];
        for (var day = 0; day <= lastDay; day += step) {
            points.push({ x: day, y: massOnDay(day) });
        }
        if (points[points.length - 1].x !== lastDay) {
            points.push({ x: lastDay, y: massOnDay(lastDay) });
        }
        points.forEach(function (p) {
            p.y = Math.round(p.y * 10) / 10;
            p.title = (p.x === 0 ? "Launch" : "Day " + p.x) + ": " + p.y.toFixed(1) + " kg";
        });

        var latest = points[points.length - 1];
        var floor = Math.round(LAUNCH_MASS * MASS_FLOOR * 10) / 10;
        var below = latest.y < floor;
        var diff = (LAUNCH_MASS - latest.y).toFixed(1);

        App.charts.line($("[data-mass-chart]"), points, {
            yMin: 68, yMax: 74, yTicks: [68, 70, 72, 74],
            xTicks: App.charts.dayTicks(lastDay), xMax: Math.max(lastDay, 1),
            band: [floor, LAUNCH_MASS + 0.5],
            isWarn: function (p) { return p.y < floor; }
        });
        setText("[data-mass-summary]", latest.y.toFixed(1) + " kg, " + diff + " kg less than at launch. " +
            (below ? "Below the expected range: review meals and calories with your flight surgeon." : "Inside the expected range."));
        setBadge("mass", below ? "warn" : "ok", below ? "Below range" : "Expected");
        App.charts.table($("[data-mass-table]"), "Body mass by mission day", ["Mission day", "Mass (kg)"],
            points.map(function (p) { return [p.x === 0 ? "Launch" : String(p.x), p.y.toFixed(1)]; }));
    })();

    // Bone density: before launch vs projected at landing
    (function () {
        var months = mode.length / 30;
        var lossPct = Math.round(BONE_LOSS_PER_MONTH[modeKey] * months * 10) / 10;
        var bars = [];
        var rows = [];
        Object.keys(BONE_BEFORE).forEach(function (site) {
            var before = BONE_BEFORE[site];
            var after = Math.round(before * (1 - lossPct / 100) * 100) / 100;
            bars.push({ label: "Before", group: site, value: before, valueLabel: before.toFixed(2), neutral: true, title: site + " before launch: " + before.toFixed(2) + " g/cm²" });
            bars.push({ label: "Landing", group: site, value: after, valueLabel: after.toFixed(2), title: site + " projected at landing: " + after.toFixed(2) + " g/cm²" });
            rows.push([site, before.toFixed(2), after.toFixed(2)]);
        });

        App.charts.bars($("[data-bone-chart]"), bars, { max: 1.2 });
        App.charts.table($("[data-bone-table]"), "Bone density in g/cm²", ["Site", "Before launch", "Projected at landing"], rows);

        var warn = lossPct >= BONE_WARN_TOTAL;
        setText("[data-bone-summary]", (phase.key === "post" ? "Loss at landing: " : "Projected loss at landing: ") + lossPct + "% over " + Math.round(months) + (Math.round(months) === 1 ? " month." : " months."));
        setBadge("bone", warn ? "warn" : "ok", warn ? "Review plan" : "On track");

        var gravityText = {
            station: "Without exercise, weight-bearing bones lose 1 to 1.5% a month in space. The resistive exercise device (ARED) cuts that loss a lot.",
            moon: "The Moon has 1/6 of Earth's gravity. Researchers expect it is not enough to protect bones, so the station exercise plan continues.",
            mars: "Mars has 3/8 of Earth's gravity, for up to two years. Partial gravity slows the loss, but the long stay adds it up: the exercise plan is reviewed every month."
        };
        setText("[data-bone-text]", gravityText[modeKey]);

        // Cross-link with the women's health module, only if she turned it on
        var womens = App.store.get("womens-health", {});
        if (App.getProfile().key === "female" && womens.enabled !== false && (womens.plan === "pill" || !womens.plan)) {
            var note = $("[data-bone-note]");
            note.textContent = "Women's health: it is not yet known whether the continuous pill protects bones. Your DXA scans after landing help answer that.";
            note.hidden = false;
        }
    })();

    // Exercise: last 7 days, today in progress
    (function () {
        var minutes = [118, 125, 96, 130, 120, 112, 45];
        var labels = ["6 d ago", "5 d", "4 d", "3 d", "2 d", "Yest.", "Today"];
        var bars = minutes.map(function (value, i) {
            return { label: labels[i], value: value, valueLabel: String(value), title: (i === 6 ? "Today so far" : labels[i]) + ": " + value + " min" };
        });
        var full = minutes.slice(0, 6);
        var average = Math.round(full.reduce(function (a, b) { return a + b; }, 0) / full.length);
        var metGoal = full.filter(function (v) { return v >= 120; }).length;

        App.charts.bars($("[data-exercise-chart]"), bars, { max: 140, goal: 120 });
        setText("[data-exercise-summary]", "Average " + average + " min a day over the last 6 days (goal 120). Goal met on " + metGoal + " of 6 days. Today: 45 min so far.");
        App.charts.table($("[data-exercise-table]"), "Minutes of exercise per day", ["Day", "Minutes"],
            minutes.map(function (v, i) { return [labels[i] === "Today" ? "Today (in progress)" : labels[i], String(v)]; }));
    })();

    // Vision: OCT exams
    (function () {
        var oct = App.getOctExams(OCT_ALERT_RISE);
        var points = oct.exams.map(function (e) {
            return { x: e.day, y: e.value, title: (e.day === 0 ? "Launch" : "Day " + e.day) + ": " + e.value + " µm" };
        });
        App.charts.line($("[data-oct-chart]"), points, {
            yMin: 330, yMax: 380, yTicks: [330, 340, 350, 360, 370, 380],
            xTicks: App.charts.dayTicks(lastDay), xMax: Math.max(lastDay, 1),
            threshold: oct.threshold,
            isWarn: function (p) { return p.y >= oct.threshold; }
        });
        setText("[data-oct-summary]", oct.rise + " µm above your launch value (alert at +" + OCT_ALERT_RISE + " µm). " +
            (oct.alert ? "Above the alert level: your medical lead reviews the scan today." : "Within the normal range."));
        setText("[data-oct-text]", phase.key === "post" ? "Post-flight eye exam this week, compared with your launch scan." : "Next scan today at 10:30 UTC.");
        setBadge("oct", oct.alert ? "warn" : "ok", oct.alert ? "Review today" : "Normal");
        App.charts.table($("[data-oct-table]"), "Retina thickness at the optic nerve, in micrometers", ["Mission day", "Thickness (µm)"],
            oct.exams.map(function (e) { return [e.day === 0 ? "Launch" : String(e.day), String(e.value)]; }));
    })();

    // After landing: show where you are in the ~45-day rehab (days 1-3, up to day 14, then the final phase)
    if (phase.key === "post") {
        var rehabDay = phase.daysSinceLanding;
        var current = rehabDay <= 3 ? 1 : rehabDay <= 14 ? 2 : 3;
        document.querySelectorAll("[data-rehab-step]").forEach(function (step) {
            var isCurrent = Number(step.getAttribute("data-rehab-step")) === current;
            step.classList.toggle("card--current", isCurrent);
            if (isCurrent) {
                var here = document.createElement("span");
                here.className = "badge badge--ok recovery__here";
                here.innerHTML = '<svg class="badge__icon" aria-hidden="true"><use href="#icon-check"/></svg><span class="badge__text">You are here</span>';
                step.insertBefore(here, step.firstChild);
                step.setAttribute("aria-current", "step");
            }
        });
        setText("[data-recovery-mode]", "Day " + rehabDay + " of about 45 of rehab. Stand up slowly and tell your flight surgeon if you feel dizzy.");
    } else {
        setText("[data-recovery-mode]", mode.crewLeads
            ? "On Mars no recovery team waits at landing: the crew medical officer runs the first phase with the crew."
            : "Your flight surgeon and the recovery team meet you at landing.");
    }
})();
