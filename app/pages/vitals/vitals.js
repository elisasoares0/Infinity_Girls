/*
 * Vital signs: today (readiness ring + each indicator), the last 7 days, and the whole mission day by day.
 * Data from assets/js/crew-data.js. Every chart has a text summary and a data table; status never relies on color alone.
 * The crew medical officer can open a crew member with ?member=<key>, only if that person shares vital signs.
 */
(function () {
    "use strict";

    var App = window.App;
    var crew = App.crew;
    var profile = App.getProfile();
    var phase = App.getPhase();
    var mode = App.getMode();
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var STATUS = {
        ok: { word: "In range", badge: "Normal", icon: "#icon-check" },
        warn: { word: "Watch", badge: "Watch", icon: "#icon-alert" },
        danger: { word: "Act now", badge: "Act now", icon: "#icon-alert" }
    };

    // Chart scales: [min, max] of the axis and the normal band for each indicator
    function scaleFor(key) {
        var goal = crew.exerciseGoal();
        return {
            sleep: { min: 3, max: 10, band: [6.5, 10], ticks: [4, 7, 10] },
            hydration: { min: 0.5, max: 3.5, band: [2.2, 3.5], ticks: [1, 2, 3] },
            exercise: { min: 0, max: Math.round(goal * 1.5), band: [Math.round(goal * 0.8), Math.round(goal * 1.5)], ticks: [0, goal, Math.round(goal * 1.5)] },
            hr: { min: 40, max: 110, band: [50, 90], ticks: [50, 70, 90, 110] },
            bp: { min: 80, max: 150, band: [90, 130], ticks: [90, 110, 130, 150] },
            spo2: { min: 88, max: 100, band: [95, 100], ticks: [90, 95, 100] },
            resp: { min: 8, max: 26, band: [12, 20], ticks: [10, 15, 20, 25] },
            temp: { min: 35.5, max: 39.5, band: [36.1, 37.5], ticks: [36, 37, 38, 39] }
        }[key];
    }

    function $(selector) {
        return document.querySelector(selector);
    }

    function setText(selector, text) {
        var el = $(selector);
        if (el) {
            el.textContent = text;
        }
    }

    function shortDate(date) {
        return MONTHS[date.getUTCMonth()] + " " + date.getUTCDate();
    }

    function setBadge(badge, level, text) {
        badge.classList.remove("badge--ok", "badge--warn", "badge--danger");
        badge.classList.add("badge--" + level);
        badge.querySelector("use").setAttribute("href", STATUS[level].icon);
        badge.querySelector(".badge__text").textContent = text;
    }

    function worst(list) {
        return list.indexOf("danger") !== -1 ? "danger" : list.indexOf("warn") !== -1 ? "warn" : "ok";
    }

    // Whose data: your own, or (crew medical officer) a crew member from the panel
    var memberKey = profile.member;
    if (profile.key === "doctor") {
        var asked = new URLSearchParams(window.location.search).get("member");
        if (asked && crew.members[asked]) {
            memberKey = asked;
        }
    }
    var person = crew.members[memberKey];
    var isOwn = memberKey === profile.member;

    var phaseText = phase.key === "pre"
        ? "launch in " + phase.daysToLaunch + " days"
        : phase.key === "post"
            ? "day " + phase.daysSinceLanding + " back on Earth"
            : "mission day " + phase.missionDay + " of " + mode.length;
    setText("[data-vitals-eyebrow]", person.name + " · " + phaseText);
    setText("[data-vitals-title]", isOwn ? "Your vital signs" : person.name + "'s vital signs");
    if (!isOwn) {
        $("[data-vitals-back]").href = "../../index.html#crew";
        setText("[data-vitals-back-text]", "Back to crew panel");
        setText("[data-vitals-intro]", "Today, this week and the whole mission, as shared with you as crew medical officer. Normal ranges are simplified examples.");
    }

    // Privacy: the crew medical officer only sees what the crew member shares
    if (!isOwn && !App.getPrivacy(memberKey).vitals.cmo) {
        document.querySelectorAll("[data-vitals-content]").forEach(function (section) {
            section.hidden = true;
        });
        $("[data-vitals-blocked]").hidden = false;
        return;
    }

    /* ---------- Blood glucose (glucometer readings) and the weekly lab results, below the tabs ---------- */
    function renderGlucose() {
        var days = App.glucose.history(memberKey, 14);
        var latest = days[days.length - 1];
        var section = $("[data-glucose-chart-card]");
        if (latest) {
            setBadge($("[data-glucose-badge]"), latest.status, STATUS[latest.status].badge);
            section.classList.toggle("card--warn", latest.status === "warn");
            section.classList.toggle("card--danger", latest.status === "danger");
            var inRange = days.filter(function (day) {
                return day.status === "ok";
            }).length;
            setText("[data-glucose-summary]", "Latest " + App.glucose.metric.format(latest.value) + " on " + shortDate(latest.date) + " at " + App.formatTime(new Date(latest.time)) +
                ": " + STATUS[latest.status].word.toLowerCase() + ". " + inRange + " of " + days.length + " days in range (70–140 mg/dL).");
        }
        var max = Math.max(200, Math.ceil(Math.max.apply(null, days.map(function (day) {
            return day.value;
        }).concat([0])) / 50) * 50);
        var points = days.map(function (day, index) {
            return { x: index, y: day.value, title: shortDate(day.date) + ": " + App.glucose.metric.format(day.value) };
        });
        if (points.length > 1) {
            App.charts.line($("[data-glucose-chart]"), points, {
                yMin: 40, yMax: max, yTicks: [50, 100, 150, 200].filter(function (tick) {
                    return tick <= max;
                }),
                // Every 4th day counted back from the latest, so the last two labels never collide
                xTicks: points.filter(function (p, index) {
                    return (points.length - 1 - index) % 4 === 0;
                }).map(function (p) {
                    return { x: p.x, label: shortDate(days[p.x].date) };
                }),
                xMax: points.length - 1,
                band: [70, 140],
                isWarn: function (p) { return App.glucose.status(p.y) !== "ok"; }
            });
        }
        var table = $("[data-glucose-table]");
        table.textContent = "";
        App.charts.table(table, "Blood glucose by day", ["Date", "Time", "Glucose (mg/dL)", "Status"], days.map(function (day) {
            return [shortDate(day.date), App.formatTime(new Date(day.time)), String(Math.round(day.value)), STATUS[day.status].word];
        }));

        var labs = App.glucose.labs(memberKey);
        setText("[data-labs-date]", "Collected on " + shortDate(labs.date) + " at " + App.formatTime(labs.date) + " · blood and saliva, read by the on-board analyzer.");
        var list = $("[data-labs-list]");
        list.textContent = "";
        labs.items.forEach(function (item) {
            var li = document.createElement("li");
            li.className = "glucose__lab";
            li.innerHTML = "<div class=\"glucose__lab-text\"><span class=\"glucose__lab-name\"></span><span class=\"glucose__lab-value\"></span><span class=\"glucose__lab-normal\"></span></div>" +
                "<span class=\"badge badge--" + item.status + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" + STATUS[item.status].icon + "\"/></svg><span class=\"badge__text\"></span></span>";
            li.querySelector(".glucose__lab-name").textContent = item.label;
            li.querySelector(".glucose__lab-value").textContent = item.text;
            li.querySelector(".glucose__lab-normal").textContent = "Normal: " + item.normal;
            li.querySelector(".badge__text").textContent = STATUS[item.status].badge;
            list.appendChild(li);
        });
    }

    // Only the person measures their own glucose; the crew medical officer reads it
    if (isOwn) {
        var measure = $("[data-glucose-measure]");
        measure.hidden = false;
        measure.addEventListener("click", function () {
            App.glucoseEntry.open(measure);
        });
        document.addEventListener("glucose:change", renderGlucose);
    }
    renderGlucose();

    /* ---------- Tabs (WAI-ARIA tabs: arrows, Home and End move between them) ---------- */
    var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-tab]"));
    var rendered = {};

    function selectTab(name, focus) {
        tabs.forEach(function (tab) {
            var on = tab.getAttribute("data-tab") === name;
            tab.setAttribute("aria-selected", on ? "true" : "false");
            tab.tabIndex = on ? 0 : -1;
            tab.classList.toggle("tabs__tab--active", on);
            if (on && focus) {
                tab.focus();
            }
        });
        document.querySelectorAll("[data-panel]").forEach(function (panel) {
            panel.hidden = panel.getAttribute("data-panel") !== name;
        });
        // Charts are drawn the first time their tab opens
        if (!rendered[name]) {
            rendered[name] = true;
            ({ today: renderToday, week: renderWeek, mission: renderMission })[name]();
        }
        try {
            window.localStorage.setItem("astro-health:vitals-tab", name);
        } catch (error) {
            // Remembering the tab is only a convenience
        }
    }

    tabs.forEach(function (tab, index) {
        tab.addEventListener("click", function () {
            selectTab(tab.getAttribute("data-tab"), false);
        });
        tab.addEventListener("keydown", function (event) {
            var next = null;
            if (event.key === "ArrowRight") {
                next = tabs[(index + 1) % tabs.length];
            } else if (event.key === "ArrowLeft") {
                next = tabs[(index - 1 + tabs.length) % tabs.length];
            } else if (event.key === "Home") {
                next = tabs[0];
            } else if (event.key === "End") {
                next = tabs[tabs.length - 1];
            }
            if (next) {
                event.preventDefault();
                selectTab(next.getAttribute("data-tab"), true);
            }
        });
    });

    /* ---------- Today: the interactive ring (assets/js/today-ring.js) ---------- */
    function renderTodayBadge() {
        var flagged = crew.todayVitals(memberKey).filter(function (item) {
            return item.status !== "ok";
        });
        var level = worst(flagged.map(function (item) {
            return item.status;
        }));
        setBadge($("[data-today-badge]"), level, flagged.length ? flagged.length + " to watch" : "All in range");
    }

    function renderToday() {
        renderTodayBadge();
        App.todayRing($("[data-today-ring]"), {
            member: memberKey,
            own: isOwn,
            ownerName: isOwn ? null : person.name.split(" ")[1],
            onTrends: function () {
                selectTab("week", true);
            }
        });
        document.addEventListener("health:sample", renderTodayBadge);
    }

    /* ---------- Week ---------- */
    function dayLabel(date, index, total) {
        return index === total - 1 ? "Today" : WEEKDAYS[date.getUTCDay()];
    }

    function renderWeek() {
        var readiness = crew.readinessHistory(memberKey, 7);
        var weekData = {};
        crew.metrics.forEach(function (metric) {
            weekData[metric.key] = crew.history(memberKey, metric.key, 7);
        });

        // Columns are buttons: choosing a day lists its 8 readings below
        var bars = $("[data-week-bars]");
        bars.textContent = "";
        readiness.forEach(function (day, index) {
            var label = dayLabel(day.date, index, readiness.length);
            var li = document.createElement("li");
            li.className = "week-bars__item";
            var button = document.createElement("button");
            button.type = "button";
            button.className = "week-bars__day";
            button.setAttribute("data-day", index);
            button.setAttribute("aria-label", label + ", " + shortDate(day.date) + ": readiness " + day.value);
            button.innerHTML =
                "<span class=\"week-bars__value\" aria-hidden=\"true\"></span>" +
                "<span class=\"week-bars__track\" aria-hidden=\"true\"><span class=\"week-bars__goal\"></span>" +
                "<span class=\"week-bars__fill" + (day.value >= 80 ? "" : " week-bars__fill--low") + "\"></span></span>" +
                "<span class=\"week-bars__label\" aria-hidden=\"true\"></span>";
            button.querySelector(".week-bars__value").textContent = day.value;
            button.querySelector(".week-bars__label").textContent = label;
            button.querySelector(".week-bars__fill").style.setProperty("--fill", day.value + "%");
            button.addEventListener("click", function () {
                showDay(index);
            });
            li.appendChild(button);
            bars.appendChild(li);
        });

        function showDay(index) {
            bars.querySelectorAll(".week-bars__day").forEach(function (button) {
                var on = Number(button.getAttribute("data-day")) === index;
                button.setAttribute("aria-pressed", on ? "true" : "false");
                button.classList.toggle("week-bars__day--selected", on);
            });
            var date = readiness[index].date;
            setText("[data-day-title]", (index === 6 ? "Today" : WEEKDAYS[date.getUTCDay()]) + " · " + shortDate(date) + " · readiness " + readiness[index].value);
            var listEl = $("[data-day-list]");
            listEl.textContent = "";
            crew.metrics.forEach(function (metric) {
                var day = weekData[metric.key][index];
                var li = document.createElement("li");
                li.className = "day-detail__item day-detail__item--" + day.status;
                li.innerHTML = App.ringIcon(metric.key, "day-detail__icon") +
                    "<span class=\"day-detail__label\"></span><span class=\"day-detail__value\"></span>" +
                    "<span class=\"badge badge--" + day.status + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" + STATUS[day.status].icon + "\"/></svg><span class=\"badge__text\"></span></span>";
                li.querySelector(".day-detail__label").textContent = metric.label;
                li.querySelector(".day-detail__value").textContent = day.text;
                li.querySelector(".badge__text").textContent = STATUS[day.status].badge;
                listEl.appendChild(li);
            });
        }
        showDay(6);

        var values = readiness.map(function (day) {
            return day.value;
        });
        var low = Math.min.apply(null, values);
        var lowDay = readiness[values.indexOf(low)];
        var average = Math.round(values.reduce(function (a, b) {
            return a + b;
        }, 0) / values.length);
        var above = values.filter(function (value) {
            return value >= 80;
        }).length;
        var lowIsToday = values.lastIndexOf(low) === values.length - 1;
        setText("[data-week-summary]", "Average " + average + ". Lowest: " + low + (lowIsToday ? " today" : " on " + dayLabel(lowDay.date, values.indexOf(low), values.length)) +
            (lowIsToday ? "" : ", today " + person.readiness) + ". " + above + " of 7 days at 80 or above (the mark on each column). Choose a day to see its readings.");
        App.charts.table($("[data-week-table]"), "Readiness, last 7 days", ["Day", "Readiness"], readiness.map(function (day, index) {
            return [dayLabel(day.date, index, readiness.length) + " · " + shortDate(day.date), String(day.value)];
        }));

        // One line chart per indicator, with the normal range as a band
        var list = $("[data-week-list]");
        list.textContent = "";
        crew.metrics.forEach(function (metric) {
            var week = weekData[metric.key];
            var scale = scaleFor(metric.key);
            var id = "week-" + metric.key;
            var li = document.createElement("li");
            li.className = "card";
            li.innerHTML =
                "<h3 class=\"card__title week__title\">" + App.ringIcon(metric.key, "week__icon") + "<span class=\"week__name\"></span></h3>" +
                "<p class=\"chart__summary\"></p>" +
                "<div class=\"chart\"><svg class=\"chart__svg\" aria-hidden=\"true\"></svg>" +
                "<details class=\"help\"><summary class=\"help__summary\"><span class=\"help__label\">Show data as a table</span></summary><div class=\"chart__table-wrap\"></div></details></div>";
            li.querySelector(".week__name").textContent = metric.label;
            li.querySelector(".card__title").id = id;

            App.charts.line(li.querySelector(".chart__svg"), week.map(function (day, index) {
                return {
                    x: index,
                    y: Math.min(scale.max, Math.max(scale.min, day.value)),
                    status: day.status,
                    title: dayLabel(day.date, index, 7) + ": " + day.text + " (" + STATUS[day.status].word.toLowerCase() + ")"
                };
            }), {
                yMin: scale.min,
                yMax: scale.max,
                yTicks: scale.ticks,
                xMax: 6,
                xTicks: [{ x: 0, label: dayLabel(week[0].date, 0, 7) }, { x: 3, label: dayLabel(week[3].date, 3, 7) }, { x: 6, label: "Today" }],
                band: scale.band,
                isWarn: function (point) {
                    return point.status !== "ok";
                }
            });

            var inRange = week.filter(function (day) {
                return day.status === "ok";
            }).length;
            var outside = week.filter(function (day) {
                return day.status !== "ok";
            }).map(function (day, index) {
                return dayLabel(day.date, week.indexOf(day), 7);
            });
            li.querySelector(".chart__summary").textContent = inRange + " of 7 days in range (normal " + metric.normal + "). Today " + week[6].text + "." +
                (outside.length ? " Outside the range: " + outside.join(", ") + "." : "");
            App.charts.table(li.querySelector(".chart__table-wrap"), metric.label + ", last 7 days", ["Day", metric.label, "Status"], week.map(function (day, index) {
                return [dayLabel(day.date, index, 7) + " · " + shortDate(day.date), day.text, STATUS[day.status].word];
            }));
            list.appendChild(li);
        });
    }

    /* ---------- Mission ---------- */
    // How many days to show and what to call them in this phase
    function missionSpan() {
        if (phase.key === "pre") {
            return { days: 28, title: "Last 4 weeks of training" };
        }
        if (phase.key === "post") {
            return { days: mode.length + phase.daysSinceLanding, title: "The whole mission and your days back on Earth" };
        }
        return { days: Math.max(1, phase.missionDay), title: "Every day since launch" };
    }

    function renderMission() {
        var span = missionSpan();
        // Day by day up to a year; longer spans group the days into weeks
        var byWeek = span.days > 365;
        var unit = phase.key === "pre" ? "training day" : "mission day";
        var after = phase.key === "post" ? " From day " + (mode.length + 1) + " you are back on Earth; the landing day has a thick border." : "";
        setText("[data-mission-title]", span.title);
        setText("[data-mission-subtitle]", byWeek
            ? "One square per week (" + Math.ceil(span.days / 7) + " weeks), numbered by week, oldest first. A week is marked when any day in it was outside the range. Hover a square for details, or open the table."
            : "One square per day (" + span.days + " days), numbered by " + unit + ", oldest first." + after + " Hover a square for its value, or open the table.");

        // History for every indicator, and which days had every reading in range
        var all = {};
        crew.metrics.forEach(function (metric) {
            all[metric.key] = crew.history(memberKey, metric.key, span.days);
        });
        var dayOk = [];
        for (var d = 0; d < span.days; d++) {
            dayOk.push(crew.metrics.every(function (metric) {
                return all[metric.key][d].status === "ok";
            }));
        }
        var okDays = dayOk.filter(Boolean).length;
        var best = 0;
        var run = 0;
        dayOk.forEach(function (ok) {
            run = ok ? run + 1 : 0;
            best = Math.max(best, run);
        });
        var current = 0;
        for (var c = dayOk.length - 1; c >= 0 && dayOk[c]; c--) {
            current += 1;
        }

        // Summary tiles, like the streak and success-rate blocks of a habit tracker
        var stats = [
            ["Current streak", current + (current === 1 ? " day" : " days"), "all readings in range"],
            ["Days in range", Math.round((okDays / span.days) * 100) + " %", okDays + " of " + span.days + " days"],
            ["Best streak", best + (best === 1 ? " day" : " days"), "all readings in range"],
            ["Days tracked", String(span.days), phase.key === "pre" ? "in training" : phase.key === "post" ? "mission + home" : "since launch"]
        ];
        var statsEl = $("[data-mission-stats]");
        statsEl.textContent = "";
        stats.forEach(function (stat) {
            var li = document.createElement("li");
            li.className = "stats__item";
            li.innerHTML = "<p class=\"stats__label\"></p><p class=\"stats__value\"></p><p class=\"stats__note\"></p>";
            li.querySelector(".stats__label").textContent = stat[0];
            li.querySelector(".stats__value").textContent = stat[1];
            li.querySelector(".stats__note").textContent = stat[2];
            statsEl.appendChild(li);
        });

        // One grid per indicator
        var list = $("[data-mission-list]");
        list.textContent = "";
        var landingIndex = phase.key === "post" ? mode.length : -1;
        crew.metrics.forEach(function (metric) {
            var days = all[metric.key];
            var cells = [];
            var rows = [];
            if (byWeek) {
                for (var w = 0; w < days.length; w += 7) {
                    var chunk = days.slice(w, w + 7);
                    var okCount = chunk.filter(function (day) {
                        return day.status === "ok";
                    }).length;
                    var status = worst(chunk.map(function (day) {
                        return day.status;
                    }));
                    var label = "Week " + (w / 7 + 1) + " (" + shortDate(chunk[0].date) + " to " + shortDate(chunk[chunk.length - 1].date) + ")";
                    cells.push({ status: status, label: String(w / 7 + 1), title: label + ": " + okCount + " of " + chunk.length + " days in range" });
                    rows.push([label, okCount + " of " + chunk.length + " days in range", STATUS[status].word]);
                }
            } else {
                days.forEach(function (day, index) {
                    var where = index === landingIndex ? " · landing day" : "";
                    var name = "Day " + (index + 1) + " · " + shortDate(day.date) + where;
                    cells.push({
                        status: day.status,
                        label: String(index + 1),
                        mark: index === landingIndex ? "landing" : "",
                        title: name + ": " + day.text + " (" + STATUS[day.status].word.toLowerCase() + ")"
                    });
                    rows.push([name, day.text, STATUS[day.status].word]);
                });
            }

            var inRange = days.filter(function (day) {
                return day.status === "ok";
            }).length;
            var streak = 0;
            var longest = 0;
            days.forEach(function (day) {
                streak = day.status === "ok" ? streak + 1 : 0;
                longest = Math.max(longest, streak);
            });

            var li = document.createElement("li");
            li.className = "card";
            li.innerHTML =
                "<div class=\"card__header\"><h3 class=\"card__title mission__title\">" + App.ringIcon(metric.key, "mission__icon") + "<span class=\"mission__name\"></span></h3><p class=\"mission__rate\"></p></div>" +
                "<p class=\"chart__summary\"></p>" +
                "<ol class=\"heatmap\" aria-hidden=\"true\"></ol>" +
                "<details class=\"help\"><summary class=\"help__summary\"><span class=\"help__label\">Show data as a table</span></summary><div class=\"chart__table-wrap mission__table\"></div></details>";
            li.querySelector(".mission__name").textContent = metric.label;
            li.setAttribute("data-metric", metric.key);
            li.querySelector(".mission__rate").textContent = "Every day · " + Math.round((inRange / days.length) * 100) + " % in range";
            li.querySelector(".chart__summary").textContent = inRange + " of " + days.length + " days in range (normal " + metric.normal + "). Longest streak in range: " + longest + " days. Today: " + days[days.length - 1].text + ".";
            App.charts.heatmap(li.querySelector(".heatmap"), cells);
            App.charts.table(li.querySelector(".chart__table-wrap"), metric.label + ", " + span.title.toLowerCase(), [byWeek ? "Week" : "Day", byWeek ? "Days in range" : metric.label, "Status"], rows);
            list.appendChild(li);
        });
        renderFilter();
    }

    // Chips: show every indicator or just one
    function renderFilter() {
        var holder = $("[data-mission-filter]");
        holder.textContent = "";
        var choices = [{ key: "all", label: "All" }].concat(crew.metrics.map(function (metric) {
            return { key: metric.key, label: metric.label };
        }));
        choices.forEach(function (choice) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "filter-chips__chip" + (choice.key === "all" ? " filter-chips__chip--active" : "");
            button.setAttribute("aria-pressed", choice.key === "all" ? "true" : "false");
            button.innerHTML = (choice.key === "all" ? "" : App.ringIcon(choice.key, "filter-chips__icon")) + "<span class=\"filter-chips__text\"></span>";
            button.querySelector(".filter-chips__text").textContent = choice.label;
            button.addEventListener("click", function () {
                holder.querySelectorAll(".filter-chips__chip").forEach(function (chip) {
                    var on = chip === button;
                    chip.setAttribute("aria-pressed", on ? "true" : "false");
                    chip.classList.toggle("filter-chips__chip--active", on);
                });
                document.querySelectorAll("[data-mission-list] > li").forEach(function (card) {
                    card.hidden = choice.key !== "all" && card.getAttribute("data-metric") !== choice.key;
                });
            });
            holder.appendChild(button);
        });
    }

    var saved = null;
    try {
        saved = window.localStorage.getItem("astro-health:vitals-tab");
    } catch (error) {
        saved = null;
    }
    selectTab(["today", "week", "mission"].indexOf(saved) !== -1 ? saved : "today", false);
})();
