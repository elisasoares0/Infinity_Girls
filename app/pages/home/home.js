/* Home page behavior: welcome screen, greeting, astronaut view (3D figure + live cards), radiation, space weather, tasks.
   The doctor's crew panel on this page is pages/home/crew-panel.js. */
(function () {
    "use strict";

    var App = window.App;

    var WEATHER_STATES = {
        ok: { badge: "Quiet", icon: "#icon-check" },
        warn: { badge: "Solar storm watch", icon: "#icon-alert" },
        danger: { badge: "Radiation storm", icon: "#icon-alert" }
    };

    // Radiation is shown only in flight (the card has data-phases="in"); on Earth there is no mission dose to follow
    var RADIATION_TEXT = {
        ok: { badge: "Within limit", level: "ok", message: "You are well within your career limit." },
        warn: { badge: "Near limit", level: "warn", message: "Your projected dose is close to the limit. Review shielded time with your flight surgeon." },
        danger: { badge: "Projected over limit", level: "danger", message: "At this daily rate the mission ends above 600 mSv. Talk to your medical lead about shielding and storm-shelter time." }
    };

    var STATUS_BADGES = {
        ok: { text: "Normal", icon: "#icon-check" },
        warn: { text: "Watch", icon: "#icon-alert" },
        danger: { text: "Act now", icon: "#icon-alert" }
    };

    function $(selector) {
        return document.querySelector(selector);
    }

    function setText(selector, text) {
        var el = $(selector);
        if (el) {
            el.textContent = text;
        }
    }

    // level: ok, warn, danger, or soon (neutral, for "not shared")
    function setBadge(badgeEl, level, text) {
        badgeEl.classList.remove("badge--ok", "badge--warn", "badge--danger", "badge--soon");
        badgeEl.classList.add("badge--" + level);
        badgeEl.querySelector("use").setAttribute("href", level === "ok" ? "#icon-check" : level === "soon" ? "#icon-info" : "#icon-alert");
        badgeEl.querySelector(".badge__text").textContent = text;
    }

    // Sign-in screen (pages/home/auth.js): until someone signs in, it is the only thing on the page
    if (!App.getSavedProfileKey()) {
        var welcome = $("[data-welcome]");
        Array.prototype.forEach.call($("main").children, function (section) {
            section.hidden = section !== welcome;
        });
        welcome.hidden = false;
        var tabBar = $(".tab-bar");
        if (tabBar) {
            tabBar.hidden = true;
        }
        return;
    }

    // Signed in: the sign-in screen goes (already hidden before the first paint by base.css)
    $("[data-welcome]").hidden = true;

    var profile = App.getProfile();
    var person = App.crew.members[profile.member];
    var isDoctor = profile.key === "doctor";
    var phase = App.getPhase();

    // Greeting by spacecraft time (UTC)
    var hour = new Date().getUTCHours();
    setText("[data-greeting]", (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening") + ",");
    setText("[data-greeting-name]", profile.name);

    // Today's indicators for the person using the app (assets/js/crew-data.js); refreshed on every sensor sample
    var today = [];
    var byKey = {};

    function loadToday() {
        today = App.crew.todayVitals(profile.member);
        byKey = {};
        today.forEach(function (item) {
            byKey[item.key] = item;
        });
    }
    loadToday();

    // What needs attention today, in plain words, for the greeting
    function attentionText() {
        var flagged = today.filter(function (item) {
            return item.status !== "ok";
        });
        if (!flagged.length) {
            return null;
        }
        // Short: the callout under "Your body now" names the reading and gives the action, so this never repeats it
        return flagged.length === 1
            ? "One reading needs a look today. Details below."
            : flagged.length + " readings need a look today. Details below.";
    }

    // Mission destination is shown, not chosen (the demo selector lives in the footer)
    var badge = $("[data-radiation-badge]");
    var radiationCard = $("[data-radiation]");

    function renderRadiation(mode) {
        // Same calculation every page uses (assets/js/app.js)
        var dose = App.getRadiation(mode);
        var total = dose.total;
        var projected = dose.projected;
        var CAREER_LIMIT = dose.limit;
        var state = dose.state;
        var text = RADIATION_TEXT[state];

        setText("[data-radiation-total]", Math.round(total));
        setText("[data-radiation-daily]", mode.daily.toFixed(2) + " mSv");
        setText("[data-radiation-end]", Math.round(projected) + " mSv");
        setText("[data-radiation-message]", text.message);
        setText("[data-radiation-badge-text]", text.badge);

        $("[data-radiation-fill]").setAttribute("width", Math.min(total, CAREER_LIMIT).toFixed(1));
        $("[data-radiation-projection]").setAttribute("width", Math.min(projected, CAREER_LIMIT).toFixed(1));

        badge.classList.remove("badge--ok", "badge--warn", "badge--danger");
        badge.classList.add("badge--" + text.level);
        // Red border only for a real, current or final risk (never for a pre-flight plan)
        radiationCard.classList.toggle("radiation--danger", text.level === "danger");
        $("[data-radiation-badge] use").setAttribute("href", text.level === "ok" ? "#icon-check" : "#icon-alert");
    }

    /*
     * Readiness score and a badge that tells what the score allows in this phase.
     * A rover traverse takes the crew hours away from the base and its medical bay, so it asks for more (85).
     */
    var ROVER_READINESS = 85;

    function renderReadiness() {
        var score = person.readiness;
        var onRover = phase.key === "in" && App.getContext(profile.member) === "rover";
        var cleared = score >= (onRover ? ROVER_READINESS : 80);
        var labels = {
            pre: cleared ? "Cleared for training" : "Light training today",
            "in": onRover ? (cleared ? "Ready for the traverse" : "Stay at the base today") : cleared ? "Ready for EVA" : "Light duty today",
            post: cleared ? "Cleared for rehab" : "Easy rehab today"
        };
        setText("[data-readiness-score]", score);
        setBadge($("[data-readiness-badge-wrap]"), cleared ? "ok" : "warn", labels[phase.key]);
    }

    // In flight, the readiness help follows where the person works today
    function flightReadinessHelp() {
        var start = "Readiness combines sleep, hydration, exercise and vital signs into one number from 0 to 100. ";
        var context = App.getContext(profile.member);
        if (context === "rover") {
            return start + "Above " + ROVER_READINESS + " means you are cleared for the rover traverse: you will be hours from the base and its medical bay, with only the rover kit.";
        }
        if (context === "base") {
            return start + "Above 80 means you are cleared for demanding tasks such as a spacewalk (EVA) outside the base.";
        }
        if (context === "transit") {
            return start + "Above 80 means you are cleared for demanding tasks, such as an emergency spacewalk (EVA) on the way.";
        }
        return start + "Above 80 means you are cleared for demanding tasks such as a spacewalk (EVA).";
    }

    // The phase greeting, used again when a new log clears every warning
    var defaultGreeting = "";

    function renderMode() {
        var mode = App.getMode();
        var attention = attentionText();
        defaultGreeting = {
            pre: "Your pre-flight checks are on track. Here is what to do today.",
            post: "Welcome back. Your body is readapting to gravity: take it step by step.",
            "in": "Your body is adapting well. Here is your health for today."
        }[phase.key];

        // Text follows the mission phase: before, during or after the flight
        if (phase.key === "pre") {
            setText("[data-mode-env]", "Earth gravity (training)");
            setText("[data-mode-day]", "Launch in " + phase.daysToLaunch + " days · " + mode.missionName);
            setText("[data-greeting-text]", isDoctor ? "The crew is in pre-flight training. Here are their baseline checks." : attention || "Your pre-flight checks are on track. Here is what to do today.");
            setText("[data-readiness-help]", "Readiness combines sleep, hydration, exercise and vital signs into one number from 0 to 100. Above 80 means you are cleared for high-risk training, such as spacewalk practice in the pool.");
            setText("[data-mass-value]", App.launchMass.toFixed(1));
            setText("[data-mass-badge]", "Baseline");
            setText("[data-mass-meta]", "Your reference before launch · Measured on a clinic scale");
        } else if (phase.key === "post") {
            setText("[data-mode-env]", "Earth gravity (readapting)");
            setText("[data-mode-day]", "Day " + phase.daysSinceLanding + " back on Earth · " + mode.missionName);
            setText("[data-greeting-text]", isDoctor ? "The crew is readapting to gravity. Here is where each one is in rehab." : attention || "Welcome back. Your body is readapting to gravity: take it step by step.");
            setText("[data-readiness-help]", "Readiness combines sleep, hydration, exercise and vital signs into one number from 0 to 100. Above 80 means you are cleared to move to the next rehab phase.");
            setText("[data-mass-value]", App.massOnDay(mode.length).toFixed(1));
            setText("[data-mass-badge]", "Recovering");
            setText("[data-mass-meta]", (App.launchMass - App.massOnDay(mode.length)).toFixed(1) + " kg less than at launch · Trend: slowly rising · Measured on a clinic scale after landing");
        } else {
            setText("[data-mode-env]", mode.env);
            setText("[data-mode-day]", "Mission day " + mode.day + " of " + mode.length + " · " + mode.missionName);
            setText("[data-readiness-help]", flightReadinessHelp());
            setText("[data-greeting-text]", isDoctor ? "Here is the crew today, most urgent first." : attention || "Your body is adapting well. Here is your health for today.");
            var mass = App.massOnDay(mode.day);
            setText("[data-mass-value]", mass.toFixed(1));
            setText("[data-mass-badge]", "Expected");
            setText("[data-mass-meta]", (App.launchMass - mass).toFixed(1) + " kg less than at launch · Trend: slowly falling · Measured on day " + mode.day + " (SLAMMD)");
        }

        // When the crew leads in flight, the astronaut is told who leads (the doctor already knows)
        $("[data-lead-alert]").hidden = !(mode.crewLeads && phase.key === "in" && !isDoctor);

        if (isDoctor) {
            return;
        }
        renderReadiness();
        renderRadiation(mode);
    }

    renderMode();

    // Space weather: real radiation storms and solar eruptions from NASA DONKI, loaded when the page is idle
    function formatWhen(iso) {
        var date = new Date(iso);
        if (isNaN(date.getTime())) {
            return "";
        }
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months[date.getMonth()] + " " + date.getDate() + ", " + App.formatTime(date);
    }

    function renderWeather(weather) {
        var state = WEATHER_STATES[weather.level];
        var weatherBadge = $("[data-weather-badge]");
        var text;

        if (weather.level === "danger") {
            text = "A solar radiation storm was recorded on " + formatWhen(weather.latestSep) + ". Keep your dosimeter on and move to the storm shelter when your medical lead calls it.";
        } else if (weather.level === "warn") {
            text = "A fast solar eruption (" + weather.fastest.speed + " km/s) left the Sun on " + formatWhen(weather.fastest.time) + ". It can trigger a radiation storm: know your shelter location and keep your dosimeter on.";
        } else if (weather.fastest) {
            text = "No radiation storms this week. " + (weather.cmeCount === 1
                ? "1 solar eruption, a slow one (" + weather.fastest.speed + " km/s)."
                : weather.cmeCount + " solar eruptions, all slow (fastest " + weather.fastest.speed + " km/s).") + " No action needed.";
        } else {
            text = "No radiation storms or solar eruptions this week. No action needed.";
        }

        setText("[data-weather-badge-text]", state.badge);
        setText("[data-weather-text]", text);
        setText("[data-weather-source]", weather.source === "nasa"
            ? "Source: NASA DONKI, last 7 days · updated " + App.formatTime(new Date(weather.fetchedAt))
            : "Simulated data: NASA DONKI could not be reached. We will retry on your next visit.");

        weatherBadge.classList.remove("badge--ok", "badge--warn", "badge--danger", "badge--soon");
        weatherBadge.classList.add("badge--" + weather.level);
        $("[data-weather-icon]").setAttribute("href", state.icon);
    }

    // Space weather only matters in flight: no request while on Earth (and the doctor home has no weather card)
    if (App.isFlight() && !isDoctor) {
        App.whenIdle(function () {
            App.loadSpaceWeather(renderWeather);
        });
    }

    /*
     * Health tasks: counter + saved on board for the current day, by stable task id (data-task="glucose"…).
     * Reminders (assets/js/reminders.js) read and write the same list on any page; "tasks:change" keeps both in step.
     */
    var tasks = document.querySelectorAll("[data-task]");
    var taskDay = App.todayKey();

    // The weekly ultrasound only shows on its exam day
    document.querySelectorAll("[data-task-weekly='ultrasound']").forEach(function (item) {
        item.hidden = !(App.reminders && App.reminders.isUltrasoundDay());
    });

    function loadTasks() {
        var saved = App.store.get("tasks:" + profile.member, null);
        var done = saved && saved.date === taskDay && Array.isArray(saved.done) ? saved.done : null;
        if (done) {
            tasks.forEach(function (task) {
                task.checked = done.indexOf(task.getAttribute("data-task")) !== -1;
            });
        }
    }
    loadTasks();

    function saveTasks() {
        var done = [];
        tasks.forEach(function (task) {
            if (task.checked) {
                done.push(task.getAttribute("data-task"));
            }
        });
        App.store.set("tasks:" + profile.member, { date: taskDay, done: done });
        document.dispatchEvent(new CustomEvent("tasks:change", { detail: { source: "home" } }));
    }

    // The next reminders of the day, in words: "Next: Retina scan (OCT) at 10:30 UTC · then …"
    function renderNext() {
        var line = $("[data-tasks-next]");
        if (!line || !App.reminders || !App.reminders.active) {
            return;
        }
        var upcoming = App.reminders.next(3);
        line.hidden = false;
        setText("[data-tasks-next-text]", upcoming.length
            ? upcoming.map(function (entry, index) {
                return (index ? "then " : "") + entry.title + " at " + App.formatTime(new Date(entry.time));
            }).join(" · ")
            : "All done for today.");
    }
    renderNext();
    document.addEventListener("tasks:change", renderNext);
    document.addEventListener("glucose:change", renderNext);
    window.setInterval(renderNext, 60000);

    // A reminder marked as done or the check-in (other scripts) update the list in place
    document.addEventListener("tasks:change", function (event) {
        if (event.detail && event.detail.source === "home") {
            return;
        }
        loadTasks();
        renderTasks();
    });

    // Only the list for the current phase counts
    function renderTasks() {
        var done = 0;
        var visible = 0;
        tasks.forEach(function (task) {
            var item = task.closest(".tasks__item");
            item.classList.toggle("tasks__item--done", task.checked);
            item.querySelector(".tasks__name").classList.toggle("tasks__name--done", task.checked);
            // Lists of other phases and tasks of another surface context (data-contexts) do not count
            if (!task.closest(".tasks__list").hidden && !item.hidden) {
                visible += 1;
                if (task.checked) {
                    done += 1;
                }
            }
        });
        setText("[data-tasks-counter]", done + " of " + visible + " done");
    }

    tasks.forEach(function (task) {
        task.addEventListener("change", function () {
            renderTasks();
            saveTasks();
        });
    });

    renderTasks();

    // Exercise is logged by the devices: the task fills up and ticks itself at the goal
    function renderExerciseTask() {
        var box = $("[data-task-auto='exercise']");
        if (!box || !byKey.exercise) {
            return;
        }
        var goal = App.crew.exerciseGoal();
        var minutes = Math.round(byKey.exercise.value);
        setText("[data-task-auto-meta]", minutes + " of " + goal + " min · logged by the exercise devices");
        var fill = $("[data-task-auto-fill]");
        if (fill) {
            fill.setAttribute("width", Math.min(120, Math.round((minutes / goal) * 120)));
        }
        if (minutes >= goal && !box.checked) {
            box.checked = true;
            renderTasks();
            saveTasks();
        }
    }
    renderExerciseTask();

    /*
     * Blood glucose card (assets/js/glucose.js): the glucometer is not a 24-hour sensor, so "Measure now" opens the
     * guided reading (assets/js/glucose-entry.js). Out of range, the card says how to get back to normal; only a
     * new reading in range clears it. The daily task ticks itself once there is a reading today.
     */
    var glucoseCard = $("[data-glucose-card]");
    var GLUCOSE_STEPS = {
        low: [["sugar", "I had 15 g of fast sugar"], ["wait", "I waited 15 minutes"]],
        high: [["water", "I drank 250 ml of water"], ["told", phase.key === "in" ? "I told the crew medical officer" : "I called my flight surgeon"]]
    };

    function sameDay(a, b) {
        return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
    }

    function renderGlucoseSteps(reading) {
        var box = $("[data-glucose-recheck]");
        box.hidden = reading.status === "ok";
        if (box.hidden) {
            return;
        }
        var kind = reading.value < App.glucose.range.low ? "low" : "high";
        var storeKey = "glucose-recheck:" + profile.member;
        var saved = App.store.get(storeKey, null);
        var done = saved && saved.time === reading.time ? saved.done : [];
        var target = $("[data-glucose-steps]");
        target.textContent = "";
        GLUCOSE_STEPS[kind].forEach(function (step) {
            var label = document.createElement("label");
            label.className = "choice";
            label.innerHTML = "<input class=\"choice__input\" type=\"checkbox\"><span class=\"choice__label\"></span>";
            var input = label.querySelector("input");
            input.checked = done.indexOf(step[0]) !== -1;
            label.querySelector(".choice__label").textContent = step[1];
            input.addEventListener("change", function () {
                var list = done.filter(function (key) {
                    return key !== step[0];
                });
                if (input.checked) {
                    list.push(step[0]);
                }
                done = list;
                App.store.set(storeKey, { time: reading.time, done: list });
            });
            target.appendChild(label);
        });
    }

    function renderGlucose() {
        if (!glucoseCard || isDoctor) {
            return;
        }
        var reading = App.glucose.latest(profile.member);
        var badge = $("[data-glucose-badge]");
        var measure = $("[data-glucose-measure] .button__text");
        if (!reading) {
            setText("[data-glucose-value]", "–");
            setBadge(badge, "soon", "No reading yet");
            setText("[data-glucose-meta]", "Measure before breakfast with the glucometer · normal 70–140 mg/dL");
            $("[data-glucose-recheck]").hidden = true;
            return;
        }
        var now = Date.now();
        setText("[data-glucose-value]", Math.round(reading.value));
        setBadge(badge, reading.status, App.statusWord(reading.status));
        glucoseCard.classList.toggle("vital-card--warn", reading.status === "warn");
        glucoseCard.classList.toggle("vital-card--danger", reading.status === "danger");
        App.drawSeries($("[data-glucose-line]"), App.glucose.history(profile.member, 7), "glucose");
        setText("[data-glucose-meta]", (sameDay(reading.time, now) ? "Measured at " : "Measured yesterday at ") + App.formatTime(new Date(reading.time)) +
            (reading.source === "saved" ? " · your reading" : " · glucometer") + " · normal 70–140 mg/dL");
        App.renderHealthInfo($("[data-glucose-info]"), "glucose", reading.status, reading.value);
        measure.textContent = reading.status === "ok" ? "Measure now" : "Measure again";
        renderGlucoseSteps(reading);

        // The daily check (in flight) ticks itself once there is a reading today
        var task = $("[data-task-auto='glucose']");
        if (task && sameDay(reading.time, now)) {
            setText("[data-glucose-task-meta]", "Done at " + App.formatTime(new Date(reading.time)) + " · " + App.glucose.metric.format(reading.value));
            if (!task.checked) {
                task.checked = true;
                renderTasks();
                saveTasks();
            }
        }
    }

    if (glucoseCard && !isDoctor) {
        $("[data-glucose-measure]").addEventListener("click", function (event) {
            App.glucoseEntry.open(event.currentTarget);
        });
        document.addEventListener("glucose:change", renderGlucose);
        renderGlucose();
    }

    /* ---------- Astronaut view: 3D figure, compact live cards and a floating card on the chosen dot (astronauts only) ---------- */
    var CARD_SIDES = { left: ["hr", "bp", "spo2", "resp"], right: ["temp", "sleep", "hydration", "exercise"] };
    var view = $("[data-body-pop]") && !isDoctor ? {} : null;
    var selectedKey = null;
    var opener = null;
    var astronaut = null;
    var lastStatus = {};
    var announcer = null;
    var pop = $("[data-body-pop]");
    var SHORT_STATUS = { ok: "OK", warn: "Watch", danger: "Act now", silent: "No signal" };

    function statusOfItem(item) {
        return item.signal ? item.status : "silent";
    }

    function badgeLevel(item) {
        return item.signal ? item.status : "soon";
    }

    function badgeText(item) {
        return item.signal ? STATUS_BADGES[item.status].text : "No signal";
    }

    // Compact cards: icon, name, value and a small status tag. Each one opens the floating card.
    function buildCards() {
        Object.keys(CARD_SIDES).forEach(function (side) {
            var list = $("[data-body-cards='" + side + "']");
            CARD_SIDES[side].forEach(function (key) {
                var li = document.createElement("li");
                li.className = "astronaut-view__item";
                li.innerHTML =
                    "<button class=\"body-card\" type=\"button\" aria-pressed=\"false\" aria-haspopup=\"dialog\" data-body-card=\"" + key + "\">" +
                    App.ringIcon(key, "body-card__icon") +
                    "<span class=\"body-card__text\"><span class=\"body-card__name\"></span><span class=\"body-card__value\"></span></span>" +
                    "<span class=\"body-card__tag\"><svg class=\"body-card__tag-icon\" aria-hidden=\"true\"><use href=\"#icon-check\"/></svg><span class=\"body-card__tag-text\"></span></span>" +
                    "</button>";
                li.querySelector(".body-card__name").textContent = byKey[key].label;
                var button = li.querySelector(".body-card");
                button.addEventListener("click", function () {
                    if (selectedKey === key) {
                        closePop();
                    } else {
                        openPop(key, button);
                    }
                });
                list.appendChild(li);
            });
        });
    }

    function renderCards() {
        today.forEach(function (item) {
            var card = $("[data-body-card='" + item.key + "']");
            if (!card) {
                return;
            }
            var level = statusOfItem(item);
            card.className = "body-card body-card--" + level + (selectedKey === item.key ? " body-card--selected" : "");
            card.setAttribute("aria-pressed", selectedKey === item.key ? "true" : "false");
            card.querySelector(".body-card__value").textContent = item.text;
            card.querySelector(".body-card__tag").className = "body-card__tag" + (level === "ok" ? "" : " body-card__tag--" + level);
            card.querySelector(".body-card__tag-text").textContent = SHORT_STATUS[level];
            card.querySelector(".body-card__tag use").setAttribute("href", level === "ok" ? "#icon-check" : level === "silent" ? "#icon-info" : "#icon-alert");
        });
        if (astronaut) {
            var map = {};
            today.forEach(function (item) {
                map[item.key] = statusOfItem(item);
            });
            astronaut.setStatus(map);
        }
    }

    // Announce only real changes (e.g. back to normal), never every 5-second sample
    function announceChanges() {
        var messages = [];
        today.forEach(function (item) {
            var level = statusOfItem(item);
            var before = lastStatus[item.key];
            if (before && before !== level) {
                messages.push(level === "silent"
                    ? item.label + ": no signal."
                    : item.label + (level === "ok" ? " back in range: " : " needs attention: ") + item.text + ".");
            }
            lastStatus[item.key] = level;
        });
        if (messages.length && announcer) {
            announcer.textContent = messages.join(" ");
        }
    }

    function renderHead() {
        var text = App.signalText(profile.member, true);
        var notice = $("[data-sensor-notice]");
        notice.hidden = !text;
        if ($("[data-sensor-notice-text]").textContent !== text) {
            $("[data-sensor-notice-text]").textContent = text;
        }
        setText("[data-live-text]", (text ? "Some sensors are silent" : "Live from your shirt, water dispenser and exercise devices") + " · " + App.formatTime(new Date()));

        // Callout: what pulls readiness down, with a shortcut to the floating card
        var flagged = today.filter(function (item) {
            return item.status !== "ok";
        });
        var callout = $("[data-body-callout]");
        callout.hidden = !flagged.length;
        if (flagged.length) {
            var diff = person.readiness - person.yesterday;
            var calloutText = (diff < 0 ? "Readiness dropped " + (-diff) + (diff === -1 ? " point" : " points") + " since yesterday. " : "") +
                (flagged.length === 1 ? "Your " + flagged[0].label.toLowerCase() + " needs attention." : flagged.length + " readings need attention: " + flagged.map(function (item) {
                    return item.label.toLowerCase();
                }).join(", ") + ".");
            if ($("[data-body-callout-text]").textContent !== calloutText) {
                $("[data-body-callout-text]").textContent = calloutText;
            }
            $("[data-body-callout-action]").onclick = function () {
                openPop(flagged[0].key, $("[data-body-callout-action]"));
            };
        }
    }

    /* ---------- Floating card ---------- */
    function renderPop() {
        var item = byKey[selectedKey];
        if (!item) {
            return;
        }
        var source = { "Astroskin shirt": "Shirt", "Water dispenser": "Water dispenser", "Exercise devices": "Exercise devices" }[item.source];
        var time = App.formatTime(new Date(item.updated));
        $("[data-pop-icon]").innerHTML = App.ringIcon(item.key, "body-pop__svg");
        setText("[data-pop-title]", item.label);
        setText("[data-pop-value]", item.text);
        setBadge($("[data-pop-badge]"), badgeLevel(item), badgeText(item));
        App.drawSeries($("[data-pop-line]"), App.crew.series24h(profile.member, item.key), item.key);
        setText("[data-pop-meta]", (item.signal ? source + " · " + time : "No signal since " + time) + " · last 24 h · normal " + item.normal);
        App.renderHealthInfo($("[data-pop-info]"), item.key, item.status);
        $("[data-temp-recheck]").hidden = item.key !== "temp" || (item.status === "ok" && !App.crew.getRecheck(profile.member).reading);
        pop.classList.toggle("body-pop--warn", item.status === "warn" && item.signal);
        pop.classList.toggle("body-pop--danger", item.status === "danger" && item.signal);
        if (item.key === "temp") {
            renderTemp();
        }
    }

    // Wide stage: the card docks on the right, level with the dot, and the figure slides left to stay visible.
    // Narrow stage (phones): a sheet at the bottom of the stage (CSS).
    var WIDE_STAGE = 560;

    function placePop(x, y) {
        var stage = pop.parentNode;
        var width = stage.clientWidth;
        var height = stage.clientHeight;
        var popHeight = pop.offsetHeight;
        var wide = width >= WIDE_STAGE;
        pop.classList.toggle("body-pop--docked", wide);
        if (!wide) {
            return;
        }
        var top = Math.max(12, Math.min(height - popHeight - 12, y - 48));
        pop.style.setProperty("--pop-top", Math.round(top) + "px");
        pop.style.setProperty("--pop-arrow", Math.round(Math.max(20, Math.min(popHeight - 20, y - top))) + "px");
    }

    function shiftFigure(open) {
        if (!astronaut) {
            return;
        }
        var wide = pop.parentNode.clientWidth >= WIDE_STAGE;
        astronaut.setShift(open && wide ? -(pop.offsetWidth + 24) / 2 : 0);
    }

    // from: the button that opened it (card or callout), or null for a tap on the 3D figure
    function openPop(key, from) {
        selectedKey = key;
        opener = from || null;
        renderCards();
        renderPop();
        pop.hidden = false;
        if (astronaut) {
            astronaut.select(key);
            // Place first: the docked width decides how far the figure slides
            var point = astronaut.screenOf(key);
            placePop(point.x, point.y);
            shiftFigure(true);
        } else {
            placePop(pop.parentNode.clientWidth / 2, 80);
        }
        pop.focus();
    }

    function closePop() {
        // Opened by a tap on the 3D figure: on narrow screens the matching card sits below the stage,
        // so focus goes back to it without scrolling the figure out of view
        var fromFigure = !opener;
        var back = opener || $("[data-body-card='" + selectedKey + "']");
        selectedKey = null;
        opener = null;
        pop.hidden = true;
        if (astronaut) {
            astronaut.select(null);
            shiftFigure(false);
        }
        renderCards();
        if (back) {
            back.focus(fromFigure ? { preventScroll: true } : undefined);
        }
    }

    function refreshBody() {
        loadToday();
        setText("[data-greeting-text]", attentionText() || defaultGreeting);
        renderHead();
        renderCards();
        if (selectedKey) {
            renderPop();
        }
        renderExerciseTask();
        announceChanges();
    }

    // The 3D figure loads after the page is idle; until then (or without WebGL) the poster text stays
    // WebGL can exist in the browser and still be off (hardware acceleration disabled, blocked GPU): try a context
    function webglOn() {
        try {
            var canvas = document.createElement("canvas");
            return Boolean(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
        } catch (error) {
            return false;
        }
    }

    function loadAstronaut() {
        var host = $("[data-astronaut-canvas]");
        var fallback = $("[data-astronaut-fallback]");
        var retry = $("[data-astronaut-retry]");
        // Says why: WebGL off (a browser setting) or a load error (network, file), which "Try again" can fix
        function unavailable(reason) {
            fallback.hidden = false;
            fallback.textContent = reason === "webgl"
                ? "3D view unavailable: WebGL is off in this browser (turn on hardware acceleration in the browser settings). Your readings are in the cards."
                : "Could not load the 3D view. Check the connection and try again. Your readings are in the cards.";
            retry.hidden = reason === "webgl";
            $(".astronaut-view__controls").hidden = true;
        }
        fallback.hidden = false;
        fallback.textContent = "Loading the 3D astronaut…";
        retry.hidden = true;
        if (!webglOn()) {
            unavailable("webgl");
            return;
        }
        import(App.rootUrl("assets/js/astronaut-3d.js")).then(function (module) {
            return module.mountAstronaut(host, {
                modelUrl: App.rootUrl("assets/models/emu.glb"),
                dracoPath: App.rootUrl("assets/vendor/three/addons/libs/draco/gltf/"),
                onSelect: function (key) {
                    if (key === selectedKey) {
                        closePop();
                    } else {
                        openPop(key, null);
                    }
                },
                // Anywhere else on the body: the symptom check-in for that region (pages/home/body-checkin.js)
                onRegion: function (region) {
                    if (selectedKey) {
                        closePop();
                    }
                    if (App.bodyCheckin) {
                        App.bodyCheckin.open(region, null);
                    }
                },
                onHover: function (region, x, y) {
                    if (App.bodyCheckin) {
                        App.bodyCheckin.hover(region, x, y);
                    }
                },
                // The floating card follows its dot while the figure turns
                onProject: function (key, x, y, visible) {
                    if (key === selectedKey && !pop.hidden && visible) {
                        placePop(x, y);
                    }
                    pop.classList.toggle("body-pop--behind", !visible);
                }
            });
        }).then(function (mounted) {
            astronaut = mounted;
            fallback.hidden = true;
            if (App.bodyCheckin) {
                App.bodyCheckin.attach(mounted);
            }
            // Nausea mode: the figure stops floating and turning on its own
            // (checked: a cached older module without it must not stop the figure from showing)
            if (typeof mounted.setCalm === "function") {
                mounted.setCalm(Boolean(App.nausea && App.nausea.isOn()));
                document.addEventListener("nausea:change", function (event) {
                    mounted.setCalm(event.detail.on);
                });
            }
            host.classList.add("astronaut-view__canvas--ready");
            renderCards();
            if (selectedKey) {
                astronaut.select(selectedKey);
            }
        }).catch(function (error) {
            console.error("3D astronaut:", error);
            // A half-built canvas from the failed attempt goes, so "Try again" starts clean
            host.textContent = "";
            unavailable("load");
        });
    }

    /* Body temperature: the steps are logged, then the shirt rechecks on its own; only a reading in range clears "Watch" */
    function leadName() {
        return App.getMedicalLead().name.replace(/ \(.*\)/, "").toLowerCase();
    }

    function renderTemp() {
        var state = App.crew.getRecheck(profile.member);
        var item = byKey.temp;
        var level = item.status;
        var reading = state.reading;
        var shirtOn = item.signal;
        var auto = "";

        $("[data-temp-exit]").hidden = level === "ok";
        $("[data-temp-steps]").hidden = level === "ok";
        document.querySelectorAll("[data-temp-step]").forEach(function (step) {
            step.checked = Boolean(state.steps[step.getAttribute("data-temp-step")]);
            step.closest(".choice").classList.toggle("choice--active", step.checked);
        });

        if (level === "danger") {
            auto = "Tell your " + leadName() + " now. Keep resting and drinking water while you wait.";
        } else if (level !== "ok" && !shirtOn) {
            auto = "The shirt is off, so it cannot recheck. Put it back on and it takes the new reading.";
        } else if (level !== "ok" && state.autoAt) {
            auto = "Both steps done. The shirt takes a new reading at " + App.formatTime(new Date(state.autoAt)) + " (in about " + Math.max(1, Math.round((state.autoAt - Date.now()) / 1000)) + " s in this demo, 30 min on board).";
        } else if (level !== "ok") {
            auto = "When both steps are done, the shirt takes a new reading on its own.";
        }
        if ($("[data-temp-auto]").textContent !== auto) {
            $("[data-temp-auto]").textContent = auto;
        }

        var result = !reading ? "" : level === "ok"
            ? "Back to normal: " + reading.value.toFixed(1) + " °C at " + reading.time + " (shirt). Keep drinking water today."
            : "New reading: " + reading.value.toFixed(1) + " °C at " + reading.time + " (shirt). Still outside the normal range: do both steps again" + (shirtOn ? " and the shirt rechecks." : ".");
        if ($("[data-temp-result]").textContent !== result) {
            $("[data-temp-result]").textContent = result;
        }
    }

    if (view) {
        announcer = document.createElement("p");
        announcer.className = "sr-only";
        announcer.setAttribute("aria-live", "polite");
        $(".astronaut-view__container").appendChild(announcer);
        buildCards();

        document.querySelectorAll("[data-temp-step]").forEach(function (step) {
            step.addEventListener("change", function () {
                var state = App.crew.getRecheck(profile.member);
                state.steps[step.getAttribute("data-temp-step")] = step.checked;
                App.crew.saveRecheck(profile.member, state);
                if (state.steps.water && state.steps.rest) {
                    App.crew.scheduleRecheck(profile.member);
                } else {
                    App.crew.cancelRecheck(profile.member);
                }
                renderTemp();
            });
        });

        $("[data-pop-close]").addEventListener("click", closePop);
        pop.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                event.stopPropagation();
                closePop();
            }
        });

        // Turn buttons (the alternative to dragging) and arrow keys on them
        document.querySelectorAll("[data-astronaut-turn]").forEach(function (button) {
            var direction = Number(button.getAttribute("data-astronaut-turn"));
            button.addEventListener("click", function () {
                if (astronaut) {
                    astronaut.turn(direction * Math.PI / 4);
                }
            });
            button.addEventListener("keydown", function (event) {
                if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && astronaut) {
                    event.preventDefault();
                    astronaut.turn((event.key === "ArrowLeft" ? -1 : 1) * Math.PI / 8);
                }
            });
        });

        document.addEventListener("health:sample", refreshBody);
        refreshBody();
        App.whenIdle(loadAstronaut);
        // After a load error: try again without reloading the page (focus stays on the stage text)
        $("[data-astronaut-retry]").addEventListener("click", function () {
            $(".astronaut-view__controls").hidden = false;
            loadAstronaut();
            $("[data-astronaut-fallback]").focus();
        });

        // For tests: the mounted figure
        window.App.astronautView = function () {
            return astronaut;
        };
    }
})();
