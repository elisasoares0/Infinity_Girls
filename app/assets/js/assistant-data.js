/*
 * Answers from live data for "Ask the assistant" (App.assistantData), on every page.
 * The question is matched against fixed intents (English patterns); each intent computes its answer from the data the
 * app already shows (App.crew, App.glucose, App.symptoms, App.reminders, App.records, App.getRadiation) and writes it
 * with fixed sentence templates: the numbers come from the sensors and records, the words never come from a model,
 * and the same data always gives the same answer. Every answer says where to see it in the app.
 * Out-of-range advice reuses App.healthAdvice (the "What to do" of each indicator); nothing here gives a diagnosis.
 *   App.assistantData.detect(question) → [{ type, key?, member?, trend? }]   (at most 3)
 *   App.assistantData.answer(intent) → { title, text, facts: [{ label, value, status }], href, linkText }
 */
(function () {
    "use strict";

    var App = window.App;
    var MAX_INTENTS = 3;
    var EVA_READINESS = 80;
    var ROVER_READINESS = 85;

    var VITAL_PATTERNS = [
        { key: "hr", pattern: /heart ?rate|\bpulse\b|heartbeat|\bbpm\b|\bheart\b/ },
        { key: "bp", pattern: /blood pressure|\bbp\b|\bpressure\b/ },
        { key: "spo2", pattern: /oxygen|spo2|spo₂|saturation/ },
        { key: "resp", pattern: /respirat|breathing rate|\bbreaths?\b/ },
        { key: "temp", pattern: /temperature|fever|\btemp\b/ },
        { key: "sleep", pattern: /sleep|slept|\bnight\b|\brested\b/ },
        { key: "hydration", pattern: /\bwater\b|hydrat|\bdrink|thirst/ },
        { key: "exercise", pattern: /exercis|workout|treadmill|\bgym\b|\btraining\b/ },
        { key: "glucose", pattern: /glucose|\bsugar\b|glyc/ }
    ];
    var TREND = /\bweek\b|\btrend|last (few |\d+ )?days|lately|compared|yesterday|history|average|over time/;
    // Questions about how or why something works go to the guides, not to the numbers
    var HOW_TO = /\bmeasured\b|\bhow (do|to|does|can)\b|\bwhat (is|are|does) (a|an|the)\b|\bwhy (do|does|are|is it)\b(?! my)/;
    var OVERVIEW = /\bhealth\b|how am i|am i (ok|okay|fine|well|good)|how do i (look|feel)|\bstatus\b|\bsummary\b|\boverall\b|how('s| is) my body|how am i doing|my day\b|\btoday\b/;
    var PRIVACY = /privacy|\bshare|who (sees|can see)|researcher/;

    var MEMBER_NAMES = [
        { member: "silva", pattern: /silva|commander/ },
        { member: "tanaka", pattern: /tanaka|engineer/ },
        { member: "okafor", pattern: /okafor/ },
        { member: "novak", pattern: /novak|specialist/ }
    ];

    var STATUS = { ok: "OK", warn: "Watch", danger: "Act now", silent: "No signal", info: "" };

    function own() {
        return App.getProfile().member;
    }

    function isDoctor() {
        return App.getProfile().key === "doctor";
    }

    function time(ms) {
        return App.formatTime(new Date(ms));
    }

    function lead() {
        return App.getMedicalLead().name.replace(/ \(.*\)/, "").toLowerCase();
    }

    function fact(label, value, status) {
        return { label: label, value: value, status: status || "info" };
    }

    function vitals(member) {
        return App.crew.todayVitals(member);
    }

    function vital(member, key) {
        return vitals(member).filter(function (item) {
            return item.key === key;
        })[0];
    }

    function levelOf(item) {
        return item.signal ? item.status : "silent";
    }

    function sourceText(item) {
        var source = { "Astroskin shirt": "your shirt", "Water dispenser": "the water dispenser", "Exercise devices": "the exercise devices" }[item.source] || "the sensors";
        return item.signal ? "From " + source + " at " + time(item.updated) + "." : "No signal from " + source + " since " + time(item.updated) + ".";
    }

    function list(words) {
        return words.length < 2 ? words.join("") : words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
    }

    /* ---------- Answers ---------- */

    function overview(member, who) {
        var items = vitals(member);
        var flagged = items.filter(function (item) {
            return item.signal && item.status !== "ok";
        });
        var silent = items.filter(function (item) {
            return !item.signal;
        });
        var person = App.crew.members[member];
        var diff = person.readiness - person.yesterday;
        var parts = [];
        parts.push(flagged.length
            ? (who ? who + ": " : "Overall: ") + flagged.length + " of " + items.length + " readings need attention: " + list(flagged.map(function (item) {
                return item.label.toLowerCase() + " (" + item.text + ", " + STATUS[item.status] + ")";
            })) + "."
            : (who ? who + ": all " : "Overall you are in good shape: all ") + items.length + " readings are in range.");
        if (silent.length) {
            parts.push("No signal from: " + list(silent.map(function (item) {
                return item.label.toLowerCase();
            })) + ".");
        }
        parts.push("Readiness " + person.readiness + "/100" + (diff ? " (" + (diff > 0 ? "up " : "down ") + Math.abs(diff) + " since yesterday)" : "") + ".");
        var facts = items.map(function (item) {
            return fact(item.label, item.signal ? item.text : "No signal", levelOf(item));
        });
        if (App.glucose) {
            var glucose = App.glucose.latest(member);
            if (glucose) {
                facts.push(fact(App.glucose.metric.label, App.glucose.metric.format(glucose.value) + " at " + time(glucose.time), glucose.status));
                if (glucose.status !== "ok") {
                    parts.push("Blood glucose " + App.glucose.metric.format(glucose.value) + ": " + STATUS[glucose.status] + ".");
                }
            }
        }
        if (App.symptoms) {
            var open = App.symptoms.today(member).filter(function (row) {
                return !row.resolvido;
            });
            if (open.length) {
                parts.push("Symptoms logged today: " + open.map(App.symptoms.label).join(", ") + ".");
            }
        }
        if (flagged.length && !who) {
            var advice = App.healthAdvice(flagged[0].key, flagged[0].status, flagged[0].value);
            parts.push("First, " + flagged[0].label.toLowerCase() + ": " + advice.charAt(0).toLowerCase() + advice.slice(1));
        }
        facts.push(fact("Readiness", person.readiness + "/100", person.readiness >= EVA_READINESS ? "ok" : "warn"));
        return {
            title: who ? who + " today" : "Your health today",
            text: parts.join(" "),
            facts: facts,
            href: App.rootUrl(isDoctor() ? "index.html#crew" : "index.html#vitals"),
            linkText: isDoctor() ? "Crew panel" : "Your body now (Home)"
        };
    }

    function vitalAnswer(member, key) {
        if (key === "glucose") {
            return glucoseAnswer(member);
        }
        var item = vital(member, key);
        var level = levelOf(item);
        var text = item.label + " now: " + (item.signal ? item.text + ", " + STATUS[item.status] : "no signal (last " + item.text + ")") + ". Normal: " + item.normal + ". " + sourceText(item);
        if (item.signal && item.status !== "ok") {
            text += " What to do: " + App.healthAdvice(key, item.status, item.value);
        }
        if (key === "sleep") {
            var week = App.crew.history(member, "sleep", 7);
            var average = week.reduce(function (sum, day) {
                return sum + day.value;
            }, 0) / week.length;
            text += " Your 7-day average is " + App.crew.getMetric("sleep").format(average, false) + ".";
        }
        return {
            title: item.label,
            text: text,
            facts: [fact("Now", item.signal ? item.text : "No signal", level), fact("Normal", item.normal)],
            href: App.rootUrl("pages/vitals/index.html"),
            linkText: "Vitals"
        };
    }

    function glucoseAnswer(member) {
        var reading = App.glucose ? App.glucose.latest(member) : null;
        if (!reading) {
            return { title: "Blood glucose", text: "No glucometer reading yet. Measure it on Home, Blood glucose, Measure now.", facts: [], href: App.rootUrl("index.html"), linkText: "Blood glucose (Home)" };
        }
        var value = App.glucose.metric.format(reading.value);
        var text = "Last reading: " + value + " at " + time(reading.time) + ", " + STATUS[reading.status] + ". Normal: 70–140 mg/dL. What to do: " +
            App.healthAdvice("glucose", reading.status === "ok" ? "ok" : reading.status, reading.value);
        return {
            title: "Blood glucose",
            text: text,
            facts: [fact("Last reading", value, reading.status), fact("Normal", "70–140 mg/dL")],
            href: App.rootUrl("pages/vitals/index.html"),
            linkText: "Vitals"
        };
    }

    function trendAnswer(member, key) {
        var days;
        var format;
        var label;
        if (key === "glucose") {
            days = App.glucose ? App.glucose.history(member, 7) : [];
            format = function (value) {
                return App.glucose.metric.format(value);
            };
            label = "Blood glucose";
        } else {
            var metric = App.crew.getMetric(key);
            var goal = App.crew.exerciseGoal();
            days = App.crew.history(member, key, 7);
            format = function (value, extra) {
                return metric.format(value, false, goal, extra);
            };
            label = metric.label;
        }
        if (!days.length) {
            return { title: label + " this week", text: "No readings in the last 7 days.", facts: [], href: App.rootUrl("pages/vitals/index.html"), linkText: "Vitals" };
        }
        var sum = 0;
        var low = days[0];
        var high = days[0];
        days.forEach(function (day) {
            sum += day.value;
            low = day.value < low.value ? day : low;
            high = day.value > high.value ? day : high;
        });
        var average = sum / days.length;
        var averageExtra = days.reduce(function (total, day) {
            return total + (day.extra || 0);
        }, 0) / days.length;
        var outside = days.filter(function (day) {
            return day.status !== "ok";
        }).length;
        var dayName = function (day) {
            return day.date.toISOString().slice(5, 10).replace("-", "/");
        };
        var today = days[days.length - 1];
        return {
            title: label + " this week",
            text: "Last " + days.length + " days: average " + format(average, averageExtra) + ", lowest " + format(low.value, low.extra) + " (" + dayName(low) + "), highest " + format(high.value, high.extra) + " (" + dayName(high) + "). " +
                (outside ? outside + " of " + days.length + " days outside the normal range." : "Every day in the normal range.") + " Today: " + format(today.value, today.extra) + ".",
            facts: [
                fact("Average", format(average, averageExtra)),
                fact("Lowest", format(low.value, low.extra) + " · " + dayName(low), low.status),
                fact("Highest", format(high.value, high.extra) + " · " + dayName(high), high.status),
                fact("Days outside the range", outside + " of " + days.length, outside ? "warn" : "ok")
            ],
            href: App.rootUrl("pages/vitals/index.html"),
            linkText: "Vitals, Weekly"
        };
    }

    function readinessAnswer(member) {
        var person = App.crew.members[member];
        var phase = App.getPhase().key;
        var rover = phase === "in" && App.getContext && App.getContext(member) === "rover";
        var limit = rover ? ROVER_READINESS : EVA_READINESS;
        var cleared = person.readiness >= limit;
        var what = phase === "in" ? (rover ? "the rover traverse" : "a spacewalk (EVA)") : phase === "pre" ? "full training" : "full rehab";
        var diff = person.readiness - person.yesterday;
        var pulling = vitals(member).filter(function (item) {
            return item.signal && item.status !== "ok";
        });
        var text = "Readiness " + person.readiness + "/100" + (diff ? ", " + (diff > 0 ? "up " : "down ") + Math.abs(diff) + " since yesterday" : "") + ". " +
            "Above " + limit + " clears you for " + what + ": " + (cleared ? "you are cleared." : "you are not cleared today.") +
            (pulling.length ? " What pulls it down: " + list(pulling.map(function (item) {
                return item.label.toLowerCase() + " (" + item.text + ")";
            })) + "." : " Sleep, water, exercise and vital signs are all in range.");
        return {
            title: "Readiness",
            text: text,
            facts: [fact("Today", person.readiness + "/100", cleared ? "ok" : "warn"), fact("Yesterday", person.yesterday + "/100"), fact("Needed for " + what, limit + "/100")],
            href: App.rootUrl("index.html#vitals"),
            linkText: "Readiness (Home)"
        };
    }

    function symptomsAnswer(member) {
        var rows = App.symptoms ? App.symptoms.today(member) : [];
        return {
            title: "Symptoms today",
            text: rows.length
                ? "You logged " + rows.length + (rows.length === 1 ? " symptom" : " symptoms") + " today: " + rows.map(function (row) {
                    return App.symptoms.label(row) + " at " + time(Date.parse(row.registrado_em)) + (row.resolvido ? " (feeling better)" : "");
                }).join(", ") + "."
                : "No symptoms logged today. Tap the body on Home, or use the region shortcuts, to log one.",
            facts: rows.map(function (row) {
                return fact(App.symptoms.label(row), row.resolvido ? "Feeling better" : time(Date.parse(row.registrado_em)), row.resolvido ? "ok" : App.symptoms.band(row.intensidade) === "mild" ? "ok" : App.symptoms.band(row.intensidade) === "moderate" ? "warn" : "danger");
            }),
            href: App.rootUrl("index.html#vitals"),
            linkText: "Your body now (Home)"
        };
    }

    function plan() {
        return App.reminders && App.reminders.active ? App.reminders.today() : [];
    }

    function tasksAnswer() {
        var items = plan().filter(function (entry) {
            return entry.kind !== "medication";
        });
        var left = items.filter(function (entry) {
            return !entry.done;
        });
        var upcoming = left.filter(function (entry) {
            return entry.time >= Date.now() - 60 * 60000;
        }).slice(0, 3);
        return {
            title: "Your tasks today",
            text: items.length
                ? (items.length - left.length) + " of " + items.length + " done. " + (upcoming.length ? "Next: " + upcoming.map(function (entry) {
                    return entry.title + " at " + time(entry.time);
                }).join(", ") + "." : "Nothing left for today.")
                : "No health tasks planned for today.",
            facts: upcoming.map(function (entry) {
                return fact(entry.title, time(entry.time), entry.time < Date.now() ? "warn" : "info");
            }),
            href: App.rootUrl("index.html#tasks"),
            linkText: "Health tasks (Home)"
        };
    }

    function medicationAnswer() {
        var meds = plan().filter(function (entry) {
            return entry.kind === "medication";
        });
        return {
            title: "Medication today",
            text: meds.length
                ? meds.map(function (entry) {
                    return entry.title.replace(/^Take /, "") + " at " + time(entry.time) + ": " + (entry.done ? "taken" : entry.time <= Date.now() ? "not taken yet" : "later today");
                }).join(". ") + "."
                : "No medication planned for today.",
            facts: meds.map(function (entry) {
                return fact(entry.title.replace(/^Take /, ""), entry.done ? "Taken" : time(entry.time), entry.done ? "ok" : entry.time <= Date.now() ? "warn" : "info");
            }),
            href: App.rootUrl(App.getProfile().key === "female" ? "pages/womens-health/index.html" : "index.html#tasks"),
            linkText: App.getProfile().key === "female" ? "Women's health" : "Health tasks (Home)"
        };
    }

    function ultrasoundAnswer(member) {
        var rows = App.records ? App.records.list("exames_imagem", { usuario_id: member }).filter(function (row) {
            return row.tipo_exame === "ultrassom_venoso";
        }) : [];
        var words = { pendente: ["Waiting for the medical team", "info"], normal: ["Normal", "ok"], atencao: ["Watch", "warn"], critico: ["Act now", "danger"] };
        var latest = rows[0];
        return {
            title: "Neck vein ultrasound",
            text: latest
                ? "Last scan on " + latest.registrado_em.slice(0, 10) + ": " + words[latest.status_leitura][0] + "." + (latest.parecer_medico ? " Reading: " + latest.parecer_medico : "")
                : "No scan yet. Once a week in flight, the Body page guides you step by step.",
            facts: latest ? [fact("Last scan", words[latest.status_leitura][0], words[latest.status_leitura][1])] : [],
            href: App.rootUrl("pages/body/index.html#ultrasound"),
            linkText: "Body, ultrasound"
        };
    }

    function radiationAnswer() {
        var dose = App.getRadiation(App.getMode());
        return {
            title: "Radiation dose",
            text: "Received so far: " + Math.round(dose.total) + " of " + dose.limit + " mSv (career limit). Today's rate: " + dose.daily.toFixed(2) + " mSv a day. At this rate the mission ends at " + Math.round(dose.projected) + " mSv: " +
                (dose.state === "ok" ? "well within the limit." : dose.state === "warn" ? "close to the limit, talk to your " + lead() + " about shielding." : "above the limit, talk to your " + lead() + " now."),
            facts: [fact("Received", Math.round(dose.total) + " mSv", dose.state), fact("Projected at mission end", Math.round(dose.projected) + " mSv", dose.state), fact("Career limit", dose.limit + " mSv")],
            href: App.rootUrl("index.html"),
            linkText: "Radiation (Home)"
        };
    }

    function todoAnswer(member) {
        var flagged = vitals(member).filter(function (item) {
            return item.signal && item.status !== "ok";
        });
        var silent = vitals(member).filter(function (item) {
            return !item.signal;
        });
        var steps = flagged.map(function (item) {
            return item.label + " (" + item.text + "): " + App.healthAdvice(item.key, item.status, item.value);
        });
        if (silent.length) {
            steps.push("Put the shirt back on (or check the dispenser): no signal from " + list(silent.map(function (item) {
                return item.label.toLowerCase();
            })) + ".");
        }
        var due = plan().filter(function (entry) {
            return !entry.done && entry.time <= Date.now();
        });
        if (due.length) {
            steps.push("Due now: " + list(due.slice(0, 3).map(function (entry) {
                return entry.title;
            })) + ".");
        }
        return {
            title: "What to do now",
            text: steps.length ? steps.join(" ") : "Nothing needs your attention right now. Keep drinking water and follow today's tasks.",
            facts: flagged.map(function (item) {
                return fact(item.label, item.text, item.status);
            }).concat(due.slice(0, 3).map(function (entry) {
                return fact(entry.title, "Due at " + time(entry.time), "warn");
            })),
            href: App.rootUrl("index.html#vitals"),
            linkText: "Your body now (Home)"
        };
    }

    // Doctor: the whole crew, who needs attention first
    function crewAnswer() {
        var alerts = App.isFlight() ? App.crew.buildAlerts() : null;
        var rows = Object.keys(App.crew.members).map(function (member) {
            var person = App.crew.members[member];
            var shared = App.getPrivacy(member).vitals.cmo;
            var open = alerts ? alerts.list.filter(function (alert) {
                return alert.member === member && alerts.statusOf(alert) !== "resolved";
            }) : [];
            var urgent = open.some(function (alert) {
                return alert.urgent;
            });
            var level = !shared ? "info" : urgent ? "danger" : open.length || person.readiness < EVA_READINESS ? "warn" : "ok";
            return { member: member, person: person, shared: shared, open: open, level: level };
        }).sort(function (a, b) {
            var order = { danger: 0, warn: 1, ok: 2, info: 3 };
            return order[a.level] - order[b.level];
        });
        var attention = rows.filter(function (row) {
            return row.level === "danger" || row.level === "warn";
        });
        return {
            title: "The crew today",
            text: attention.length
                ? "Needs attention first: " + attention.map(function (row) {
                    return row.person.name + " (readiness " + row.person.readiness + (row.open.length ? ", " + row.open.length + (row.open.length === 1 ? " open alert: " : " open alerts: ") + row.open.map(function (alert) {
                        return alert.title;
                    }).join(", ") : "") + ")";
                }).join("; ") + "."
                : "Everyone is in range today, with no open alerts.",
            facts: rows.map(function (row) {
                return fact(row.person.name, row.shared ? "Readiness " + row.person.readiness + (row.open.length ? " · " + row.open.length + " alert" + (row.open.length === 1 ? "" : "s") : "") : "Not shared by crew member", row.level);
            }),
            href: App.rootUrl("index.html#crew"),
            linkText: "Crew panel"
        };
    }

    function memberAnswer(member) {
        var person = App.crew.members[member];
        if (!App.getPrivacy(member).vitals.cmo && member !== own()) {
            return { title: person.name + " today", text: "Not shared by crew member. Ask them directly or check the alerts.", facts: [], href: App.rootUrl("index.html#crew"), linkText: "Crew panel" };
        }
        return overview(member, person.name);
    }

    /* ---------- Detecting what the question asks ---------- */

    function detect(question) {
        var text = String(question || "").toLowerCase();
        var intents = [];
        if (!text.trim() || PRIVACY.test(text)) {
            return intents;
        }
        function add(intent) {
            var same = intents.some(function (item) {
                return item.type === intent.type && item.key === intent.key && item.member === intent.member;
            });
            if (!same && intents.length < MAX_INTENTS) {
                intents.push(intent);
            }
        }
        if (isDoctor()) {
            MEMBER_NAMES.forEach(function (entry) {
                if (entry.pattern.test(text)) {
                    add({ type: "member", member: entry.member });
                }
            });
            if (/\bcrew\b|everyone|\bteam\b|who needs|attention|\balerts?\b|who is (sick|unwell)/.test(text)) {
                add({ type: "crew" });
            }
            return intents;
        }
        var howTo = HOW_TO.test(text);
        var trend = TREND.test(text);
        if (/what should i do|what do i do now|what can i do|advice|recommend/.test(text)) {
            add({ type: "todo" });
        }
        if (/ready|readiness|\beva\b|spacewalk|traverse|cleared/.test(text)) {
            add({ type: "readiness" });
        }
        if (!howTo) {
            VITAL_PATTERNS.forEach(function (entry) {
                if (entry.pattern.test(text)) {
                    add({ type: trend ? "trend" : "vital", key: entry.key });
                }
            });
            if (/symptom|did i log|what i logged|my log\b/.test(text)) {
                add({ type: "symptoms" });
            }
            if (/medic|vitamin|\bpills?\b|tablet/.test(text)) {
                add({ type: "medication" });
            }
            if (/ultrasound|neck (vein )?scan|scan result/.test(text) && /result|reading|my |last|status/.test(text)) {
                add({ type: "ultrasound" });
            }
            if (/radiation|\bmsv\b|sievert/.test(text) && App.isFlight()) {
                add({ type: "radiation" });
            }
            if (/what('s| is) next|\bnext\b|to ?do\b|\btasks?\b|left today|\bagenda\b|\bschedule\b/.test(text) && !intents.some(function (item) {
                return item.type === "todo";
            })) {
                add({ type: "tasks" });
            }
            if (!intents.length && OVERVIEW.test(text)) {
                add({ type: "overview" });
            }
        }
        return intents;
    }

    function answer(intent) {
        var member = own();
        switch (intent.type) {
            case "overview":
                return overview(member);
            case "vital":
                return vitalAnswer(member, intent.key);
            case "trend":
                return trendAnswer(member, intent.key);
            case "readiness":
                return readinessAnswer(member);
            case "symptoms":
                return symptomsAnswer(member);
            case "tasks":
                return tasksAnswer();
            case "medication":
                return medicationAnswer();
            case "ultrasound":
                return ultrasoundAnswer(member);
            case "radiation":
                return radiationAnswer();
            case "todo":
                return todoAnswer(member);
            case "crew":
                return crewAnswer();
            case "member":
                return memberAnswer(intent.member);
            default:
                return null;
        }
    }

    App.assistantData = {
        detect: detect,
        answer: answer,
        statusText: function (status) {
            return STATUS[status] || "";
        }
    };
})();
