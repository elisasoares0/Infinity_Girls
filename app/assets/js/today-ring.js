/*
 * "Today" view for an astronaut: a ring of 8 capsules (one per indicator, real buttons), the readiness score
 * in the middle, a detail panel, a callout with an action and summary columns. Used by the Vitals page.
 * Data from assets/js/crew-data.js (App.crew), which the sensors feed 24 hours a day: nothing is typed by hand.
 *   App.todayRing(container, { member, own, trendsHref, onTrends, ownerName })
 * It updates in place on every "health:sample" (every 5 s) so focus is never lost.
 *
 * Also shared with Home:
 *   App.signalText(member, own)  which sensors are silent and what to do about it.
 *   App.ringIcon(key, className); App.healthAdvice and App.statusWord come from assets/js/health-info.js.
 *   App.drawSeries(svg, series, key)  24-hour mini line.
 */
(function () {
    "use strict";

    var App = window.App;

    var ICONS = {
        sleep: "<path d=\"M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z\"/>",
        hydration: "<path d=\"M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM128,216a72.08,72.08,0,0,1-72-72c0-57.23,55.47-105,72-118,16.53,13,72,60.75,72,118A72.08,72.08,0,0,1,128,216Zm55.89-62.66a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z\"/>",
        exercise: "<path d=\"M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z\"/>",
        hr: "<path d=\"M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z\"/>",
        bp: "<path d=\"M207.06,72.67A111.24,111.24,0,0,0,128,40h-.4C66.07,40.21,16,91,16,153.13V176a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V152A111.25,111.25,0,0,0,207.06,72.67ZM224,176H119.71l54.76-75.3a8,8,0,0,0-12.94-9.42L99.92,176H32V153.13c0-3.08.15-6.12.43-9.13H56a8,8,0,0,0,0-16H35.27c10.32-38.86,44-68.24,84.73-71.66V80a8,8,0,0,0,16,0V56.33A96.14,96.14,0,0,1,221,128H200a8,8,0,0,0,0,16h23.67c.21,2.65.33,5.31.33,8Z\"/>",
        spo2: "<path d=\"M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM200,144a70.57,70.57,0,0,1-.46,8H136V136h63.64Q200,140,200,144ZM183.39,88H136V72h36.89A175.85,175.85,0,0,1,183.39,88ZM136,200h37.19A71.67,71.67,0,0,1,136,215.54Zm0-16V168h59.87a72,72,0,0,1-8,16Zm0-64V104h55.39a116.84,116.84,0,0,1,5.45,16Zm23.89-64H136V32.6A257.22,257.22,0,0,1,159.89,56ZM56,144c0-50,42.26-92.71,64-111.4V215.54A72.08,72.08,0,0,1,56,144Z\"/>",
        resp: "<path d=\"M184,184a32,32,0,0,1-32,32c-13.7,0-26.95-8.93-31.5-21.22a8,8,0,0,1,15-5.56C137.74,195.27,145,200,152,200a16,16,0,0,0,0-32H40a8,8,0,0,1,0-16H152A32,32,0,0,1,184,184Zm-64-80a32,32,0,0,0,0-64c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C105.74,60.73,113,56,120,56a16,16,0,0,1,0,32H24a8,8,0,0,0,0,16Zm88-32c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C193.74,92.73,201,88,208,88a16,16,0,0,1,0,32H32a8,8,0,0,0,0,16H208a32,32,0,0,0,0-64Z\"/>",
        temp: "<path d=\"M136,153V88a8,8,0,0,0-16,0v65a32,32,0,1,0,16,0Zm-8,47a16,16,0,1,1,16-16A16,16,0,0,1,128,200Zm40-66V48a40,40,0,0,0-80,0v86a64,64,0,1,0,80,0Zm-40,98a48,48,0,0,1-27.42-87.4A8,8,0,0,0,104,138V48a24,24,0,0,1,48,0v90a8,8,0,0,0,3.42,6.56A48,48,0,0,1,128,232Z\"/>",
        signal: "<path d=\"M140,204a12,12,0,1,1-12-12A12,12,0,0,1,140,204ZM237.08,87A172,172,0,0,0,18.92,87,8,8,0,0,0,29.08,99.37a156,156,0,0,1,197.84,0A8,8,0,0,0,237.08,87ZM205,122.77a124,124,0,0,0-153.94,0A8,8,0,0,0,61,135.31a108,108,0,0,1,134.06,0,8,8,0,0,0,11.24-1.3A8,8,0,0,0,205,122.77Zm-32.26,35.76a76.05,76.05,0,0,0-89.42,0,8,8,0,0,0,9.42,12.94,60,60,0,0,1,70.58,0,8,8,0,1,0,9.42-12.94Z\"/>",
        close: "<path d=\"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z\"/>"
    };

    var STATUS_WORD = { ok: "In range", warn: "Watch", danger: "Act now" };


    /*
     * "What to do" stays visible; "how it is measured" and "why it matters" open on demand, and the button reads
     * the three out loud (App.voice). container: an empty element; status: "ok" | "warn" | "danger".
     */
    function renderHealthInfo(container, key, status, value) {
        var info = App.healthInfo(key);
        var todo = App.healthAdvice(key, status, value);
        container.classList.add("health-info");
        container.innerHTML =
            "<p class=\"health-info__todo\"><span class=\"health-info__label\">What to do:</span> <span class=\"health-info__todo-text\"></span></p>" +
            "<details class=\"help health-info__more\"><summary class=\"help__summary\"><span class=\"help__label\">How it is measured and why it matters</span></summary>" +
            "<dl class=\"health-info__list\">" +
            "<div class=\"health-info__row\"><dt class=\"health-info__label\">How it is measured</dt><dd class=\"health-info__text\" data-info=\"how\"></dd></div>" +
            "<div class=\"health-info__row\"><dt class=\"health-info__label\">Why it matters</dt><dd class=\"health-info__text\" data-info=\"why\"></dd></div>" +
            "</dl></details>" +
            "<div class=\"health-info__actions\">" +
            "<button class=\"button button--tertiary button--flush health-info__speak\" type=\"button\"><span class=\"button__text\">Explain out loud</span></button>" +
            "<a class=\"button button--tertiary button--flush health-info__learn\"><span class=\"button__text\">Learn about this risk</span></a>" +
            "</div>";
        container.querySelector(".health-info__todo-text").textContent = todo;
        container.querySelector("[data-info='how']").textContent = info.how;
        container.querySelector("[data-info='why']").textContent = info.why;
        var learn = container.querySelector(".health-info__learn");
        learn.href = App.rootUrl("pages/learn/index.html") + "#risk-" + App.healthRisk(key);
        // The accessible names start with the visible text (WCAG 2.5.3) and add which indicator
        learn.setAttribute("aria-label", "Learn about this risk: " + App.crew.getMetric(key).label.toLowerCase());
        var speak = container.querySelector(".health-info__speak");
        speak.hidden = !(App.voice && App.voice.isSupported());
        speak.setAttribute("aria-label", "Explain out loud: " + App.crew.getMetric(key).label.toLowerCase());
        speak.addEventListener("click", function () {
            App.voice.speak(App.crew.getMetric(key).label + ". How it is measured: " + info.how + " Why it matters: " + info.why + " What to do: " + todo, { priority: "info" });
        });
    }

    var SVG = "<svg class=\"CLASS\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><use href=\"#ring-icon-KEY\"/></svg>";

    function icon(key, className) {
        return SVG.replace("KEY", key).replace("CLASS", className);
    }

    // One sprite per page, added once
    function ensureSprite() {
        if (document.getElementById("ring-icon-sleep")) {
            return;
        }
        var holder = document.createElement("div");
        holder.innerHTML = "<svg class=\"sr-only\" aria-hidden=\"true\" focusable=\"false\">" + Object.keys(ICONS).map(function (key) {
            return "<symbol id=\"ring-icon-" + key + "\" viewBox=\"0 0 256 256\">" + ICONS[key] + "</symbol>";
        }).join("") + "</svg>";
        document.body.insertBefore(holder.firstChild, document.body.firstChild);
    }

    // "Astroskin shirt not sending since 10:12 UTC." for the silent sensors of one member, or ""
    function signalText(member, own) {
        var state = App.crew.sensorState(member);
        if (!state.keys.length) {
            return "";
        }
        var since = state.since ? " since " + App.formatTime(new Date(state.since)) : "";
        var what = state.shirt ? "Astroskin shirt not sending" + since + "." : "Water dispenser offline" + since + ".";
        return what + (own ? (state.shirt ? " Put it back on so the readings continue." : " Your drinks are counted again when it is back online.") : " Showing the last reading.");
    }

    /*
     * Normal range shaded behind the line (same limits as the "ok" status in crew-data.js and glucose.js),
     * so a reading outside it is visible at a glance. The text summary next to the chart says the same.
     */
    var NORMAL_BAND = { hr: [50, 90], bp: [90, 130], spo2: [95, 100], resp: [12, 20], temp: [36.1, 37.5], glucose: [70, 140] };

    function svgNode(name, attrs) {
        var node = document.createElementNS("http://www.w3.org/2000/svg", name);
        Object.keys(attrs).forEach(function (attr) {
            node.setAttribute(attr, attrs[attr]);
        });
        return node;
    }

    /* ---------- 24-hour mini line (SVG viewBox 0 0 120 32, aria-hidden) ---------- */
    function drawSeries(svg, series, key) {
        var values = series.map(function (point) {
            return point.value;
        }).filter(function (value) {
            return value !== null;
        });
        svg.textContent = "";
        if (!values.length) {
            return;
        }
        var band = NORMAL_BAND[key];
        var min = key === "sleep" ? 0 : Math.min.apply(null, band ? values.concat(band) : values);
        var max = key === "sleep" ? 1 : Math.max.apply(null, band ? values.concat(band) : values);
        var pad = key === "sleep" ? 0 : Math.max((max - min) * 0.15, key === "temp" ? 0.1 : 1);
        min -= pad;
        max += pad;
        if (band) {
            var top = 30 - ((band[1] - min) / (max - min || 1)) * 28;
            var bottom = 30 - ((band[0] - min) / (max - min || 1)) * 28;
            svg.appendChild(svgNode("rect", { "class": "series-band", x: 0, y: top.toFixed(1), width: 120, height: (bottom - top).toFixed(1) }));
            [top, bottom].forEach(function (y) {
                svg.appendChild(svgNode("line", { "class": "series-band__edge", x1: 0, x2: 120, y1: y.toFixed(1), y2: y.toFixed(1), "vector-effect": "non-scaling-stroke" }));
            });
        }
        var segments = [[]];
        series.forEach(function (point, index) {
            if (point.value === null) {
                if (segments[segments.length - 1].length) {
                    segments.push([]);
                }
                return;
            }
            var x = (index / (series.length - 1)) * 120;
            var y = 30 - ((point.value - min) / (max - min || 1)) * 28;
            segments[segments.length - 1].push(x.toFixed(1) + "," + y.toFixed(1));
        });
        segments.forEach(function (points) {
            if (points.length < 2) {
                return;
            }
            var line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            line.setAttribute("points", points.join(" "));
            line.setAttribute("fill", "none");
            line.setAttribute("stroke", "currentColor");
            line.setAttribute("stroke-width", "2");
            line.setAttribute("stroke-linejoin", "round");
            line.setAttribute("vector-effect", "non-scaling-stroke");
            svg.appendChild(line);
        });
    }

    /* ---------- The ring ---------- */
    var instances = 0;

    function todayRing(container, options) {
        ensureSprite();
        instances += 1;
        var member = options.member;
        var person = App.crew.members[member];
        var own = options.own !== false;
        var selected = null;
        var shownStatus = null;

        container.innerHTML =
            "<div class=\"health-ring\">" +
            "<div class=\"health-ring__main\">" +
            "<div class=\"health-ring__dial\">" +
            "<ul class=\"health-ring__segments\" aria-label=\"Today's indicators. Choose one to see details.\" data-ring-segments></ul>" +
            "<div class=\"health-ring__center\" aria-live=\"polite\">" +
            "<p class=\"health-ring__value\" data-ring-value></p>" +
            "<p class=\"health-ring__caption\" data-ring-caption></p>" +
            "</div>" +
            "</div>" +
            "<p class=\"health-ring__live\">" + icon("signal", "health-ring__live-icon") + "<span class=\"health-ring__live-text\" data-ring-live></span></p>" +
            "<div class=\"health-ring__actions\">" +
            (options.trendsHref ? "<a class=\"button button--secondary\" data-ring-trends><span class=\"button__text\">See trends</span></a>" : "") +
            (options.onTrends ? "<button class=\"button button--secondary\" type=\"button\" data-ring-trends><span class=\"button__text\">See trends</span></button>" : "") +
            "<button class=\"button button--tertiary\" type=\"button\" data-ring-reset hidden><span class=\"button__text\">Show readiness</span></button>" +
            "</div>" +
            "</div>" +
            "<div class=\"health-ring__side\">" +
            "<p class=\"health-ring__signal\" data-ring-signal hidden></p>" +
            "<section class=\"health-ring__detail\" aria-label=\"Selected indicator\" data-ring-detail hidden tabindex=\"-1\"></section>" +
            "<div class=\"health-ring__callout\" data-ring-callout>" +
            "<p class=\"health-ring__callout-text\" data-ring-callout-text></p>" +
            "<button class=\"button button--primary health-ring__callout-button\" type=\"button\" data-ring-callout-action><span class=\"button__text\">See what to do</span></button>" +
            "</div>" +
            "<div class=\"summary-bars\">" +
            "<h3 class=\"summary-bars__title\">Summary</h3>" +
            "<ul class=\"summary-bars__list\" data-ring-summary></ul>" +
            "</div>" +
            "</div>" +
            "</div>";

        if (options.trendsHref) {
            container.querySelector("[data-ring-trends]").href = options.trendsHref;
        }
        if (options.onTrends) {
            container.querySelector("[data-ring-trends]").addEventListener("click", options.onTrends);
        }

        function q(selector) {
            return container.querySelector(selector);
        }

        /* Capsules: built once, then updated in place so a focused capsule keeps focus */
        function renderSegments(list) {
            var segments = q("[data-ring-segments]");
            if (segments.children.length !== list.length) {
                segments.textContent = "";
                list.forEach(function (item, index) {
                    var li = document.createElement("li");
                    li.className = "health-ring__item";
                    var button = document.createElement("button");
                    button.type = "button";
                    button.style.setProperty("--angle", (index * 360 / list.length) + "deg");
                    button.setAttribute("data-key", item.key);
                    button.innerHTML = "<span class=\"health-ring__mark\">" + icon(item.key, "health-ring__icon") +
                        "<span class=\"health-ring__flag\" aria-hidden=\"true\">!</span></span>";
                    button.addEventListener("click", function () {
                        select(selected === item.key ? null : item.key, false);
                    });
                    button.addEventListener("keydown", function (event) {
                        if (event.key === "Escape") {
                            select(null, false);
                        }
                    });
                    li.appendChild(button);
                    segments.appendChild(li);
                });
            }
            list.forEach(function (item, index) {
                var button = segments.children[index].firstChild;
                button.className = "health-ring__segment health-ring__segment--" + item.status +
                    (item.signal ? "" : " health-ring__segment--silent") + (selected === item.key ? " health-ring__segment--selected" : "");
                button.setAttribute("aria-pressed", selected === item.key ? "true" : "false");
                button.setAttribute("aria-label", item.label + ": " + item.text + ", " + STATUS_WORD[item.status].toLowerCase() + (item.signal ? "" : ", no signal"));
                button.querySelector(".health-ring__flag").hidden = item.status === "ok";
            });
        }

        function renderCenter(list) {
            var flagged = list.filter(function (item) {
                return item.status !== "ok";
            });
            var item = list.filter(function (entry) {
                return entry.key === selected;
            })[0];
            var value = q("[data-ring-value]");
            var caption = item
                ? item.label + " · " + STATUS_WORD[item.status]
                : "Readiness · " + (flagged.length ? flagged.length + (flagged.length === 1 ? " needs attention" : " need attention") : "all in range");
            if (item) {
                if (value.textContent !== item.text) {
                    value.textContent = item.text;
                }
            } else if (!value.querySelector(".health-ring__score")) {
                value.innerHTML = "<span class=\"health-ring__score\"></span><span class=\"health-ring__unit\">/100</span>";
                value.querySelector(".health-ring__score").textContent = person.readiness;
            }
            // Only rewrite the live region when something changed, so screen readers are not flooded every 5 s
            if (q("[data-ring-caption]").textContent !== caption) {
                q("[data-ring-caption]").textContent = caption;
            }
            q("[data-ring-reset]").hidden = !item;
        }

        /* Detail for the selected indicator: rebuilt when the choice or the status changes, numbers updated in place */
        function renderDetail(list, full) {
            var detail = q("[data-ring-detail]");
            var item = list.filter(function (entry) {
                return entry.key === selected;
            })[0];
            if (!item) {
                detail.hidden = true;
                detail.textContent = "";
                shownStatus = null;
                return;
            }
            var stamp = item.status + (item.signal ? "" : "-silent");
            if (!full && shownStatus === stamp && detail.firstChild) {
                detail.querySelector(".health-ring__detail-value").textContent = item.text;
                detail.querySelector(".health-ring__detail-source").textContent = sourceText(item);
                drawSeries(detail.querySelector(".health-ring__detail-line"), App.crew.series24h(member, item.key), item.key);
                return;
            }
            shownStatus = stamp;
            var week = App.crew.history(member, item.key, 7);
            var inRange = week.filter(function (day) {
                return day.status === "ok";
            }).length;
            var max = Math.max.apply(null, week.map(function (day) {
                return day.value;
            })) || 1;

            detail.innerHTML =
                "<div class=\"health-ring__detail-head\">" + icon(item.key, "health-ring__detail-icon") +
                "<h3 class=\"health-ring__detail-title\"></h3>" +
                "<span class=\"badge badge--" + item.status + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" + (item.status === "ok" ? "#icon-check" : "#icon-alert") + "\"/></svg><span class=\"badge__text\"></span></span></div>" +
                "<p class=\"health-ring__detail-value\"></p>" +
                "<p class=\"health-ring__detail-source\"></p>" +
                "<p class=\"health-ring__detail-label\">Last 24 hours</p>" +
                "<svg class=\"health-ring__detail-line\" viewBox=\"0 0 120 32\" preserveAspectRatio=\"none\" aria-hidden=\"true\"></svg>" +
                "<p class=\"health-ring__detail-label\">Last 7 days</p>" +
                "<div class=\"health-ring__days\" aria-hidden=\"true\"></div>" +
                "<p class=\"health-ring__detail-meta\"></p>" +
                "<div class=\"health-ring__detail-info\"></div>";
            detail.querySelector(".health-ring__detail-title").textContent = item.label;
            detail.querySelector(".badge__text").textContent = STATUS_WORD[item.status];
            detail.querySelector(".health-ring__detail-value").textContent = item.text;
            detail.querySelector(".health-ring__detail-source").textContent = sourceText(item);
            detail.querySelector(".health-ring__detail-meta").textContent = "Normal: " + item.normal + " · " + inRange + " of 7 days in range";
            renderHealthInfo(detail.querySelector(".health-ring__detail-info"), item.key, item.status);
            drawSeries(detail.querySelector(".health-ring__detail-line"), App.crew.series24h(member, item.key), item.key);

            var days = detail.querySelector(".health-ring__days");
            week.forEach(function (day) {
                var bar = document.createElement("span");
                bar.className = "health-ring__day health-ring__day--" + day.status;
                bar.style.setProperty("--fill", Math.max(8, Math.round((day.value / max) * 100)) + "%");
                days.appendChild(bar);
            });

            detail.hidden = false;
        }

        function sourceText(item) {
            var time = App.formatTime(new Date(item.updated));
            return item.signal
                ? "From the " + item.source.toLowerCase().replace("astroskin", "Astroskin") + " · updated " + time
                : "No signal from the " + item.source.toLowerCase().replace("astroskin", "Astroskin") + " since " + time + " · last value";
        }

        /* Callout: change since yesterday and the next step */
        function renderCallout(list) {
            var flagged = list.filter(function (item) {
                return item.status !== "ok";
            });
            var diff = person.readiness - person.yesterday;
            var reason = flagged.length ? " Main reason: " + flagged.map(function (item) {
                return item.label.toLowerCase();
            }).join(", ") + "." : "";
            var who = options.ownerName ? options.ownerName + "'s" : "Your";
            var text = diff < 0
                ? who + " readiness dropped " + (-diff) + (diff === -1 ? " point" : " points") + " compared to yesterday." + reason
                : who + " readiness is " + (diff === 0 ? "the same as" : "up " + diff + (diff === 1 ? " point from" : " points from")) + " yesterday." + reason;
            q("[data-ring-callout]").classList.toggle("health-ring__callout--warn", diff < 0 && flagged.length > 0);
            if (q("[data-ring-callout-text]").textContent !== text) {
                q("[data-ring-callout-text]").textContent = text;
            }
            var action = q("[data-ring-callout-action]");
            action.hidden = !flagged.length;
            action.onclick = function () {
                select(flagged[0].key, true);
            };
        }

        /* Summary columns */
        function renderSummary(list) {
            var byKey = {};
            list.forEach(function (item) {
                byKey[item.key] = item;
            });
            var goal = App.crew.exerciseGoal();
            var inRange = ["hr", "bp", "spo2", "resp", "temp"].filter(function (key) {
                return byKey[key].status === "ok";
            }).length;
            var columns = [
                { key: "sleep", label: "Sleep", value: byKey.sleep.value.toFixed(1) + " h", ratio: byKey.sleep.value / 8, status: byKey.sleep.status, spoken: "Sleep: " + byKey.sleep.text + " of an 8 h goal" },
                { key: "hydration", label: "Water", value: byKey.hydration.value.toFixed(1) + " L", ratio: byKey.hydration.value / 2.5, status: byKey.hydration.status, spoken: "Water: " + byKey.hydration.text },
                { key: "exercise", label: "Exercise", value: Math.round(byKey.exercise.value) + " min", ratio: byKey.exercise.value / goal, status: byKey.exercise.status, spoken: "Exercise: " + byKey.exercise.text },
                { key: "hr", label: "In range", value: inRange + "/5", ratio: inRange / 5, status: inRange === 5 ? "ok" : "warn", spoken: inRange + " of 5 vital signs in range" }
            ];
            var target = q("[data-ring-summary]");
            target.textContent = "";
            columns.forEach(function (column) {
                var li = document.createElement("li");
                li.className = "summary-bars__item";
                li.innerHTML =
                    "<span class=\"summary-bars__value\" aria-hidden=\"true\"></span>" +
                    "<span class=\"summary-bars__track\" aria-hidden=\"true\"><span class=\"summary-bars__fill summary-bars__fill--" + column.status + "\"></span></span>" +
                    icon(column.key, "summary-bars__icon") +
                    "<span class=\"summary-bars__label\" aria-hidden=\"true\"></span>" +
                    "<span class=\"sr-only\"></span>";
                li.querySelector(".summary-bars__value").textContent = column.value;
                li.querySelector(".summary-bars__label").textContent = column.label;
                li.querySelector(".sr-only").textContent = column.spoken + ".";
                li.querySelector(".summary-bars__fill").style.setProperty("--fill", Math.min(100, Math.max(4, Math.round(column.ratio * 100))) + "%");
                target.appendChild(li);
            });
        }

        // Live line, and which sensor is silent
        function renderSignal() {
            var text = signalText(member, own);
            q("[data-ring-signal]").hidden = !text;
            if (q("[data-ring-signal]").textContent !== text) {
                q("[data-ring-signal]").textContent = text;
            }
            q("[data-ring-live]").textContent = text
                ? "Some sensors silent · " + App.formatTime(new Date())
                : "Live from the sensors · " + App.formatTime(new Date());
        }

        function render(full) {
            var list = App.crew.todayVitals(member);
            renderSegments(list);
            renderCenter(list);
            renderDetail(list, full);
            renderCallout(list);
            renderSummary(list);
            renderSignal();
        }

        function select(key, moveFocus) {
            selected = key;
            render(true);
            var target = key ? container.querySelector("[data-key='" + key + "']") : null;
            if (moveFocus && key) {
                q("[data-ring-detail]").focus();
            } else if (target) {
                target.focus();
            }
        }

        q("[data-ring-reset]").addEventListener("click", function () {
            var was = selected;
            select(null, false);
            var back = container.querySelector("[data-key='" + was + "']");
            if (back) {
                back.focus();
            }
        });

        // New sensor data every 5 s
        document.addEventListener("health:sample", function () {
            render(false);
        });

        render(true);
        return { render: render, select: select };
    }

    App.todayRing = todayRing;
    App.drawSeries = drawSeries;
    App.signalText = signalText;
    App.renderHealthInfo = renderHealthInfo;


    // Indicator icon for other views (Home, Weekly, Overall): adds the sprite if needed
    App.ringIcon = function (key, className) {
        ensureSprite();
        return icon(key, className);
    };
})();
