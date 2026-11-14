/*
 * Crew health data shared by Home, Vitals and the crew medical panel.
 * Everything is simulated but deterministic: the same day always gives the same numbers on every page.
 */
(function () {
    "use strict";

    var App = window.App;
    var DAY_MS = 864e5;

    /*
     * Indicators. status(value, today) returns "ok", "warn" or "danger".
     * Hydration and exercise build up during the day, so today's status follows the pace, not the daily goal.
     */
    var METRICS = [
        {
            key: "sleep", label: "Sleep", unit: "h", normal: "6.5 h or more",
            status: function (v) { return v >= 6.5 ? "ok" : v >= 4.5 ? "warn" : "danger"; },
            format: function (v) { return Math.floor(v) + " h " + String(Math.round((v % 1) * 60)).padStart(2, "0") + " min"; }
        },
        {
            key: "hydration", label: "Hydration", unit: "L", normal: "2.5 L a day",
            status: function (v, today) { return today ? (v >= 1.5 ? "ok" : v >= 1 ? "warn" : "danger") : (v >= 2.2 ? "ok" : v >= 1.6 ? "warn" : "danger"); },
            format: function (v, today) { return v.toFixed(1) + (today ? " of 2.5 L" : " L"); }
        },
        {
            key: "exercise", label: "Exercise", unit: "min", normal: "goal for this phase",
            status: function (v, today, goal) { return today ? (v >= goal * 0.3 ? "ok" : "warn") : (v >= goal * 0.8 ? "ok" : v >= goal * 0.5 ? "warn" : "danger"); },
            format: function (v, today, goal) { return Math.round(v) + (today ? " of " + goal + " min" : " min"); }
        },
        {
            key: "hr", label: "Heart rate", unit: "bpm", normal: "50–90 bpm",
            status: function (v) { return v >= 50 && v <= 90 ? "ok" : v >= 40 && v <= 110 ? "warn" : "danger"; },
            format: function (v) { return Math.round(v) + " bpm"; }
        },
        {
            key: "bp", label: "Blood pressure", unit: "mmHg", normal: "90–130 / 60–85 mmHg",
            // value is the systolic pressure; the diastolic is stored next to it
            status: function (v) { return v >= 90 && v <= 130 ? "ok" : v >= 80 && v <= 150 ? "warn" : "danger"; },
            format: function (v, today, goal, extra) { return Math.round(v) + "/" + Math.round(extra) + " mmHg"; }
        },
        {
            key: "spo2", label: "Oxygen saturation", unit: "%", normal: "95–100 %",
            status: function (v) { return v >= 95 ? "ok" : v >= 90 ? "warn" : "danger"; },
            format: function (v) { return Math.round(v) + " % SpO₂"; }
        },
        {
            key: "resp", label: "Respiration", unit: "breaths/min", normal: "12–20 breaths/min",
            status: function (v) { return v >= 12 && v <= 20 ? "ok" : v >= 10 && v <= 24 ? "warn" : "danger"; },
            format: function (v) { return Math.round(v) + " breaths/min"; }
        },
        {
            key: "temp", label: "Body temperature", unit: "°C", normal: "36.1–37.5 °C",
            status: function (v) { return v >= 39 || v < 35 ? "danger" : v >= 36.1 && v <= 37.5 ? "ok" : "warn"; },
            format: function (v) { return v.toFixed(1) + " °C"; }
        }
    ];

    /*
     * Crew members. "today" is this morning's data; "base" is each person's usual value
     * (history wanders around it). Novak has had short nights; Tanaka's fever started yesterday.
     */
    var MEMBERS = {
        silva: {
            key: "silva", name: "Cmdr. Silva", role: "Commander", sex: "Female", age: 41, readiness: 86, yesterday: 89, mood: "7 h 10 min · good", dataFrom: "08:41",
            today: { sleep: 7.17, hydration: 1.9, exercise: 45, hr: 62, bp: 118, bpDia: 76, spo2: 98, resp: 14, temp: 37.6 },
            base: { sleep: 7.1, hydration: 2.4, exercise: 112, hr: 62, bp: 117, bpDia: 75, spo2: 98, resp: 14, temp: 36.7 },
            tempTrend: "rising for 3 h"
        },
        tanaka: {
            key: "tanaka", name: "Eng. Tanaka", role: "Flight engineer", sex: "Male", age: 38, readiness: 58, yesterday: 71, mood: "5 h 50 min · tired", dataFrom: "07:55",
            today: { sleep: 6.1, hydration: 1.4, exercise: 20, hr: 88, bp: 124, bpDia: 80, spo2: 97, resp: 18, temp: 38.2 },
            base: { sleep: 7.0, hydration: 2.4, exercise: 110, hr: 66, bp: 121, bpDia: 78, spo2: 98, resp: 14, temp: 36.7 },
            tempTrend: "rising for 6 h"
        },
        okafor: {
            key: "okafor", name: "Dr. Okafor", role: "Crew medical officer", sex: "Male", age: 45, readiness: 79, yesterday: 81, mood: "6 h 40 min · good", dataFrom: "08:30",
            today: { sleep: 6.67, hydration: 2.1, exercise: 60, hr: 58, bp: 112, bpDia: 72, spo2: 99, resp: 13, temp: 36.8 },
            base: { sleep: 6.9, hydration: 2.5, exercise: 115, hr: 58, bp: 113, bpDia: 72, spo2: 99, resp: 13, temp: 36.7 },
            tempTrend: "stable"
        },
        novak: {
            key: "novak", name: "Spc. Novak", role: "Mission specialist", sex: "Female", age: 34, readiness: 61, yesterday: 66, mood: "4 h 50 min · third short night", dataFrom: "06:30 · battery not docked",
            today: { sleep: 4.83, hydration: 1.8, exercise: 30, hr: 70, bp: 120, bpDia: 78, spo2: 98, resp: 15, temp: 36.7 },
            base: { sleep: 6.6, hydration: 2.3, exercise: 105, hr: 68, bp: 119, bpDia: 77, spo2: 98, resp: 15, temp: 36.6 },
            tempTrend: "stable"
        }
    };

    // How far each indicator wanders day to day, and where an unusual day lands
    var SPREAD = { sleep: 0.5, hydration: 0.2, exercise: 10, hr: 4, bp: 5, spo2: 0.7, resp: 1.2, temp: 0.2 };
    var OUTLIER = { sleep: -2.2, hydration: -0.7, exercise: -55, hr: 30, bp: 18, spo2: -4, resp: 7, temp: 1.0 };

    // Spot readings that are not 24-hour sensors (the glucometer, assets/js/glucose.js): found by getMetric only
    var SPOT_METRICS = [];

    function addSpotMetric(metric) {
        SPOT_METRICS.push(metric);
    }

    function getMetric(key) {
        return METRICS.concat(SPOT_METRICS).filter(function (metric) {
            return metric.key === key;
        })[0];
    }

    // Exercise goal follows the phase: training before, the full program in flight, rehab after
    function exerciseGoal() {
        var phase = App.getPhase().key;
        return phase === "pre" ? 90 : phase === "post" ? 45 : 120;
    }

    // Small seeded random generator (mulberry32) so history is stable
    function seeded(text) {
        var h = 2166136261;
        for (var i = 0; i < text.length; i++) {
            h = Math.imul(h ^ text.charCodeAt(i), 16777619);
        }
        return function () {
            h += 0x6D2B79F5;
            var t = h;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* ---------- Continuous monitoring: the sensors send data 24 hours a day ---------- */

    var SAMPLE_MS = 5000;           // a new shirt sample every 5 s
    var AUTO_RECHECK_MS = 20000;    // demo: the shirt's next reading after the steps (about 30 min on board)
    var SHIRT_KEYS = ["sleep", "hr", "bp", "spo2", "resp", "temp"];
    var SOURCES = {
        sleep: "Astroskin shirt", hr: "Astroskin shirt", bp: "Astroskin shirt", spo2: "Astroskin shirt",
        resp: "Astroskin shirt", temp: "Astroskin shirt", hydration: "Water dispenser", exercise: "Exercise devices"
    };
    // Live wobble (never enough to change the status) and the day/night swing used by the 24 h view
    var JITTER = { hr: 2, bp: 2, spo2: 0.6, resp: 1, temp: 0.05 };
    var SWING = { hr: 6, bp: 6, spo2: 0.4, resp: 1.5, temp: 0.3 };
    // Water dispenser draws (250 ml every N minutes) and scheduled exercise sessions (UTC hours)
    var DRINK_EVERY_MIN = { silva: 45, tanaka: 80, okafor: 50, novak: 60 };
    var SESSIONS = { silva: [[14, 15]], tanaka: [], okafor: [[10, 11]], novak: [[16, 16.5]] };
    var HOUR_MS = 36e5;

    // Demo only: "connected", "shirt-off" or "dispenser-off", with the time the signal stopped
    function getSensors() {
        var saved = App.store.get("sensors", null);
        return saved && saved.state ? saved : { state: "connected", since: null };
    }

    function setSensors(state) {
        App.store.set("sensors", { state: state, since: state === "connected" ? null : Date.now() });
    }

    // The demo selector acts on the astronaut using the app (Cmdr. Silva on the doctor profile)
    function demoMember() {
        var profile = App.getProfile();
        return profile.key === "doctor" ? "silva" : profile.member;
    }

    // Is this indicator receiving data now? Returns { on, since, source }
    function signalOf(member, key) {
        var sensors = getSensors();
        var off = member === demoMember() && (
            (sensors.state === "shirt-off" && SHIRT_KEYS.indexOf(key) !== -1) ||
            (sensors.state === "dispenser-off" && key === "hydration"));
        return { on: !off, since: off ? sensors.since : null, source: SOURCES[key] };
    }

    // Which sensors are silent for one member: { shirt, dispenser, since, keys }
    function sensorState(member) {
        var keys = METRICS.map(function (metric) {
            return metric.key;
        }).filter(function (key) {
            return !signalOf(member, key).on;
        });
        return {
            shirt: keys.indexOf("hr") !== -1,
            dispenser: keys.indexOf("hydration") !== -1,
            since: getSensors().since,
            keys: keys
        };
    }

    // The moment today's live data started (first visit of the day): water and exercise build up from here
    function liveAnchor() {
        var saved = App.store.get("live-anchor", null);
        if (!saved || saved.date !== App.todayKey()) {
            saved = { date: App.todayKey(), time: Date.now() };
            App.store.set("live-anchor", saved);
        }
        return saved.time;
    }

    function dayStartOf(time) {
        var date = new Date(time);
        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }

    // Minutes inside this member's exercise sessions between two moments of today
    function sessionMinutes(member, from, to) {
        var start = dayStartOf(to);
        return SESSIONS[member].reduce(function (total, session) {
            var a = Math.max(from, start + session[0] * HOUR_MS);
            var b = Math.min(to, start + session[1] * HOUR_MS);
            return total + Math.max(0, (b - a) / 6e4);
        }, 0);
    }

    /*
     * Temperature recheck, saved per crew member for the current day:
     * { date, steps: { water, rest }, reading: { value, time, source }, autoAt }.
     * Once both steps are done the shirt takes a new reading on its own (autoAt); only that reading
     * can bring the status back to normal. With the shirt off there is no recheck until it is back on.
     */
    function getRecheck(member) {
        var saved = App.store.get("recheck:" + member, null);
        if (!saved || saved.date !== App.todayKey()) {
            saved = { date: App.todayKey(), steps: {}, reading: null, autoAt: null };
        }
        if (!saved.steps) {
            saved.steps = {};
        }
        if (saved.autoAt && Date.now() >= saved.autoAt && signalOf(member, "temp").on) {
            var previous = saved.reading ? saved.reading.value : MEMBERS[member].today.temp;
            // After water and rest the temperature moves about 0.4 °C toward 37.0
            var value = previous > 37 ? Math.max(37, previous - 0.4) : Math.min(37, previous + 0.4);
            value = Math.round(value * 10) / 10;
            saved.reading = { value: value, time: App.formatTime(new Date(saved.autoAt)), source: "shirt" };
            saved.autoAt = null;
            // Still out of range: the steps start again for the next recheck
            if (temperatureCheck(value).status !== "resolved") {
                saved.steps = {};
            }
            App.store.set("recheck:" + member, saved);
        }
        return saved;
    }

    function saveRecheck(member, state) {
        App.store.set("recheck:" + member, state);
    }

    // Both steps done: the shirt rechecks a little later. Returns the time of that reading, or null if the shirt is off
    function scheduleRecheck(member) {
        var recheck = getRecheck(member);
        if (!signalOf(member, "temp").on) {
            recheck.autoAt = null;
            saveRecheck(member, recheck);
            return null;
        }
        recheck.autoAt = recheck.autoAt || Date.now() + AUTO_RECHECK_MS;
        saveRecheck(member, recheck);
        return recheck.autoAt;
    }

    function cancelRecheck(member) {
        var recheck = getRecheck(member);
        recheck.autoAt = null;
        saveRecheck(member, recheck);
    }

    function temperatureOf(member) {
        var recheck = getRecheck(member);
        return recheck.reading ? recheck.reading.value : MEMBERS[member].today.temp;
    }

    // Live wobble for this 5-second sample, kept small enough that the status stays the same
    function wobble(member, key, base, time) {
        if (!JITTER[key]) {
            return base;
        }
        var metric = getMetric(key);
        var random = seeded(member + key + Math.floor(time / SAMPLE_MS));
        var value = base + (random() - 0.5) * 2 * JITTER[key];
        if (key === "spo2") {
            value = Math.min(100, value);
        }
        return metric.status(value, true, 120) === metric.status(base, true, 120) ? value : base;
    }

    // The value of one indicator right now, or frozen at the moment its sensor stopped (nothing is typed by hand)
    /*
     * Presentation mode only: an emergency scenario replaces the live readings of the demo crew member
     * (the person signed in on this device) so the SOS flow can be shown. Values are fixed, without wobble.
     */
    var EMERGENCY_VALUES = {
        "chest-pain": { hr: 142, bp: 158, bpDia: 98, spo2: 89, resp: 24 },
        collapse: { hr: 36, bp: 70, bpDia: 40, spo2: 80, resp: 0 },
        "low-oxygen": { hr: 112, spo2: 84, resp: 26 },
        "high-fever": { hr: 108, temp: 39.4 }
    };

    function getEmergencySim() {
        var saved = App.store.get("emergency-sim", null);
        return saved && EMERGENCY_VALUES[saved.scenario] ? saved : null;
    }

    function setEmergencySim(scenario) {
        App.store.set("emergency-sim", EMERGENCY_VALUES[scenario] ? { scenario: scenario, since: Date.now() } : null);
    }

    // The simulated value of one indicator, or undefined when nothing is simulated for it
    function simulatedValue(member, key) {
        var sim = getEmergencySim();
        if (!sim || member !== demoMember() || !signalOf(member, key).on) {
            return undefined;
        }
        return EMERGENCY_VALUES[sim.scenario][key];
    }

    function todayValue(member, key) {
        var person = MEMBERS[member];
        var signal = signalOf(member, key);
        var simulated = simulatedValue(member, key);
        if (simulated !== undefined) {
            return simulated;
        }
        var now = Date.now();
        var until = signal.on ? now : signal.since;
        var anchor = liveAnchor();
        var value;

        if (key === "temp") {
            value = temperatureOf(member);
            return signal.on ? Math.round(wobble(member, key, value, now) * 10) / 10 : value;
        }
        if (key === "hydration") {
            value = person.today.hydration + 0.25 * Math.floor(Math.max(0, until - anchor) / (DRINK_EVERY_MIN[member] * 6e4));
        } else if (key === "exercise") {
            // Morning data is stored for the 120-minute in-flight program; other phases scale to their goal
            value = Math.round(person.today.exercise * exerciseGoal() / 120) + Math.round(sessionMinutes(member, anchor, until));
            value = Math.min(value, exerciseGoal());
        } else {
            value = signal.on ? wobble(member, key, person.today[key], now) : person.today[key];
        }
        if (key === "hydration") {
            return Math.round(value * 100) / 100;
        }
        return key === "sleep" ? value : Math.round(value);
    }

    function todayDiastolic(member) {
        var simulated = simulatedValue(member, "bpDia");
        if (simulated !== undefined) {
            return simulated;
        }
        var signal = signalOf(member, "bp");
        var base = MEMBERS[member].today.bpDia;
        return signal.on ? Math.round(base + (seeded(member + "dia" + Math.floor(Date.now() / SAMPLE_MS))() - 0.5) * 2) : base;
    }

    // When this indicator last got data: a time (ms)
    function updatedAt(member, key) {
        var signal = signalOf(member, key);
        if (!signal.on) {
            return signal.since;
        }
        if (key === "sleep") {
            return dayStartOf(Date.now()) + 6 * HOUR_MS;
        }
        if (key === "hydration") {
            var every = DRINK_EVERY_MIN[member] * 6e4;
            var anchor = liveAnchor();
            var draws = Math.floor((Date.now() - anchor) / every);
            return draws > 0 ? anchor + draws * every : anchor;
        }
        return Math.floor(Date.now() / SAMPLE_MS) * SAMPLE_MS;
    }

    // Today's indicators for one member: [{ key, label, value, text, status, normal, signal, source, updated }]
    function todayVitals(member) {
        var goal = exerciseGoal();
        return METRICS.map(function (metric) {
            var value = todayValue(member, metric.key);
            var signal = signalOf(member, metric.key);
            return {
                key: metric.key,
                label: metric.label,
                value: value,
                text: metric.format(value, true, goal, todayDiastolic(member)),
                status: metric.status(value, true, goal),
                normal: metric.key === "exercise" ? goal + " min today" : metric.normal,
                signal: signal.on,
                since: signal.since,
                source: signal.source,
                updated: updatedAt(member, metric.key)
            };
        });
    }

    /*
     * The last 24 hours of one indicator, every 30 minutes, ending now: [{ time, value }].
     * value is null while the sensor was silent. Sleep is 1 while asleep and 0 awake;
     * water and exercise add up from the start of the crew day (06:00 UTC).
     */
    function series24h(member, key) {
        var person = MEMBERS[member];
        var now = Date.now();
        var current = todayValue(member, key);
        var signal = signalOf(member, key);
        var step = HOUR_MS / 2;
        var list = [];

        function swing(time) {
            var hour = (time % (24 * HOUR_MS)) / HOUR_MS;
            return Math.cos(((hour - 17) / 24) * 2 * Math.PI);
        }
        // A fever or a low reading grows over the hours in the trend ("rising for 3 h")
        var rampHours = Number((person.tempTrend.match(/(\d+) h/) || [0, 0])[1]);

        for (var i = 48; i >= 0; i--) {
            var time = now - i * step;
            var value;
            if (!signal.on && time > signal.since) {
                value = null;
            } else if (key === "sleep") {
                // Asleep in the hours before waking up at 06:00 UTC
                var hour = (time % (24 * HOUR_MS)) / HOUR_MS;
                value = ((hour - (6 - person.today.sleep)) + 24) % 24 < person.today.sleep ? 1 : 0;
            } else if (key === "hydration" || key === "exercise") {
                var dayStart = dayStartOf(now) + 6 * HOUR_MS;
                if (now < dayStart) {
                    dayStart -= 24 * HOUR_MS;
                }
                var full = key === "hydration" ? person.base.hydration : exerciseGoal();
                value = time >= dayStart
                    ? current * Math.min(1, (time - dayStart) / Math.max(step, now - dayStart))
                    : full * Math.min(1, Math.max(0, (time - (dayStart - 24 * HOUR_MS)) / (16 * HOUR_MS)));
            } else {
                var random = seeded(member + key + Math.floor(time / step));
                value = current + (swing(time) - swing(now)) * SWING[key] + (i === 0 ? 0 : (random() - 0.5) * JITTER[key]);
                if (key === "temp" && rampHours) {
                    var start = person.base.temp + (swing(time) - swing(now)) * SWING.temp;
                    var progress = Math.min(1, Math.max(0, 1 - (now - time) / (rampHours * HOUR_MS)));
                    value = start + (current - start) * progress;
                }
                if (key === "spo2") {
                    value = Math.min(100, value);
                }
            }
            list.push({ time: time, value: value });
        }
        return list;
    }

    /*
     * Daily history for one indicator, oldest first, ending today: [{ date, value, extra, status }].
     * Days are tied to the calendar date, so yesterday stays the same tomorrow.
     */
    function history(member, key, days) {
        var person = MEMBERS[member];
        var metric = getMetric(key);
        var goal = exerciseGoal();
        var today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
        var list = [];

        for (var ago = days - 1; ago >= 0; ago--) {
            var date = new Date(today - ago * DAY_MS);
            var random = seeded(member + key + date.toISOString().slice(0, 10));
            var value;
            var extra = person.base.bpDia + (random() - 0.5) * 6;

            if (ago === 0) {
                value = todayValue(member, key);
                extra = todayDiastolic(member);
            } else {
                value = person.base[key] + (random() - 0.5) * 2 * SPREAD[key];
                if (random() < 0.035) {
                    value += OUTLIER[key];
                }
                // The story behind today's alerts
                if (member === "novak" && key === "sleep" && ago <= 2) {
                    value = 4.7 + random() * 0.4;
                }
                if (member === "tanaka" && key === "temp" && ago === 1) {
                    value = 37.4;
                }
            }
            if (key === "spo2") {
                value = Math.min(100, value);
            }
            // Past days are stored for the 120-minute program; today is already scaled by todayValue
            if (key === "exercise" && ago > 0) {
                value = Math.max(0, Math.round(value * goal / 120));
            }
            list.push({ date: date, value: value, extra: extra, status: metric.status(value, ago === 0, goal), text: metric.format(value, ago === 0, goal, extra) });
        }
        return list;
    }

    // Readiness score per day, ending today
    function readinessHistory(member, days) {
        var person = MEMBERS[member];
        var today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
        var list = [];
        for (var ago = days - 1; ago >= 0; ago--) {
            var date = new Date(today - ago * DAY_MS);
            var random = seeded(member + "readiness" + date.toISOString().slice(0, 10));
            var value = ago === 0 ? person.readiness : ago === 1 ? person.yesterday : Math.round(person.yesterday + (random() - 0.4) * 10);
            list.push({ date: date, value: Math.max(0, Math.min(100, value)) });
        }
        return list;
    }

    /* ---------- Alerts for the crew medical officer (panel and doctor home) ---------- */

    var BLEEDING_CLEAR_DAYS = 3;

    function temperatureCheck(value) {
        if (value >= 39) {
            return { status: "urgent", note: "At or above 39 °C: follow the escalation step now." };
        }
        if (value >= 36.1 && value <= 37.5) {
            return { status: "resolved" };
        }
        return { status: "open", note: value < 36.1 ? "Below the normal range: warm the crew member and recheck in 30 minutes." : "Still above the normal range: keep fluids and rest, recheck in 30 minutes." };
    }

    // Saved on board for the current day: ticked steps, the last recheck and the result, per alert
    function getAlertStore() {
        var saved = App.store.get("crew-alerts", null);
        if (!saved || saved.date !== App.todayKey() || !saved.items) {
            saved = { date: App.todayKey(), items: {} };
        }
        return saved;
    }

    /*
     * Builds today's alerts from the crew data and each member's sharing choices.
     * Every alert says what brings it back to normal ("exit") and, only for tests the sensors cannot run (the urine strip), how to log the result ("fields").
     */
    function buildAlerts() {
        var saved = getAlertStore();
        var womens = App.store.get("womens-health", {});
        var silvaPrivacy = App.getPrivacy("silva");
        var alerts = [];

        function stateOf(alert) {
            if (!saved.items[alert.id]) {
                saved.items[alert.id] = { steps: [], reading: null, status: "open", note: "", time: "" };
            }
            return saved.items[alert.id];
        }

        // Fever or low temperature, for every member who shares vital signs with the crew medical officer
        Object.keys(MEMBERS).forEach(function (member) {
            var person = MEMBERS[member];
            var start = person.today.temp;
            if (start >= 36.1 && start <= 37.5) {
                return;
            }
            if (!App.getPrivacy(member).vitals.cmo) {
                return;
            }
            alerts.push({
                id: "temp-" + member,
                member: member,
                level: "warn",
                title: start >= 37.6 ? "Rising temperature" : "Low temperature",
                who: person.name,
                text: start.toFixed(1) + " °C, " + person.tempTrend + ". Readiness " + person.readiness + ".",
                steps: [
                    "Ask about cough, sore throat, urinary pain and wounds.",
                    "Give 500 ml of fluids and rest. Use the fever medicine from the on-board kit as listed in the crew medical checklist.",
                    "If there are breathing symptoms, move the crew member to a separate sleep station.",
                    "Let the shirt recheck the temperature 30 minutes after fluids and rest."
                ],
                escalate: "Temperature reaches 39 °C, confusion, trouble breathing, or no improvement after 24 hours.",
                urgent: false,
                log: "Each temperature reading, symptoms and medicines with the time given.",
                exit: "the shirt's next temperature reading is between 36.1 and 37.5 °C. With every step ticked, the shirt rechecks on its own.",
                temperature: true,
                describe: function (reading) {
                    return reading.value.toFixed(1) + " °C";
                }
            });
        });

        // Sleep comes from the shirt, like the other vital signs
        if (App.getPrivacy("novak").vitals.cmo) {
            alerts.push({
                id: "novak-sleep",
                member: "novak",
                level: "warn",
                title: "Not enough sleep",
                who: "Spc. Novak",
                text: "4 h 50 min of sleep, the third short night in a row. Shirt battery not docked since 06:30.",
                steps: [
                    "Move demanding tasks such as spacewalks and robotics to another crew member today.",
                    "Allow a 20-minute nap before 14:00.",
                    "Check light, noise and temperature in the sleep station.",
                    "Ask the crew member to dock the shirt battery so new data reaches the panel."
                ],
                escalate: "A fourth short night, mood changes or mistakes during tasks.",
                urgent: false,
                log: "Hours slept, naps, caffeine and any task changes.",
                exit: "the shirt measures a night of at least 6 hours of sleep, with its battery docked so the data is current. This updates on its own."
            });
        }

        // Blood glucose out of range (latest glucometer reading, assets/js/glucose.js), for members who share vital signs
        Object.keys(MEMBERS).forEach(function (member) {
            var reading = App.glucose ? App.glucose.latest(member) : null;
            if (!reading || reading.status === "ok" || !App.getPrivacy(member).vitals.cmo) {
                return;
            }
            var low = reading.value < App.glucose.range.low;
            alerts.push({
                id: "glucose-" + member,
                member: member,
                level: reading.status === "danger" ? "danger" : "warn",
                title: low ? "Low blood glucose" : "High blood glucose",
                who: MEMBERS[member].name,
                text: App.glucose.metric.format(reading.value) + " with the glucometer at " + App.formatTime(new Date(reading.time)) + "." +
                    (low ? "" : " Fever, stress and less exercise can raise it."),
                steps: low ? [
                    "If the crew member is awake and can swallow, give 15 g of fast sugar (one tube of glucose gel).",
                    "Ask for a new glucometer reading after 15 minutes.",
                    "Once above 70 mg/dL, make sure they eat a snack or the next meal."
                ] : [
                    "Ask about thirst, frequent urination, nausea and any medicine taken today.",
                    "Check the weekly ketones in the lab results.",
                    "Ask for 250 ml of water and a new glucometer reading before the next meal."
                ],
                escalate: low
                    ? "Below 54 mg/dL, confusion or cannot swallow: open the “Low blood sugar” guide."
                    : "Above 250 mg/dL, ketones above 1.5 mmol/L, vomiting or confusion.",
                urgent: reading.status === "danger",
                log: "Glucometer readings with time, what was eaten or drunk, and symptoms.",
                exit: "a new glucometer reading is between 70 and 140 mg/dL. The crew member measures it; the panel updates on its own."
            });
        });

        // Neck vein ultrasounds waiting for a reading for more than 24 hours (exames_imagem, assets/js/ultrasound.js)
        if (App.records) {
            App.records.list("exames_imagem").filter(function (row) {
                return row.tipo_exame === "ultrassom_venoso" && row.status_leitura === "pendente" &&
                    Date.now() - Date.parse(row.registrado_em) > DAY_MS && MEMBERS[row.usuario_id] && App.getPrivacy(row.usuario_id).vitals.cmo;
            }).forEach(function (row) {
                alerts.push({
                    id: "ultrasound-" + row.id,
                    member: row.usuario_id,
                    level: "warn",
                    title: "Ultrasound waiting for your reading",
                    who: MEMBERS[row.usuario_id].name,
                    text: "Neck vein scan sent at " + App.formatTime(new Date(row.registrado_em)) + ", more than a day ago." + (row.observacao_astronauta ? " Note: " + row.observacao_astronauta : ""),
                    steps: [
                        "Open the image in “Images to review” below.",
                        "Check that the vein compresses fully and that blood flows.",
                        "Save the reading and a short note for the crew member."
                    ],
                    escalate: "The vein does not compress, or the crew member reports neck swelling, pain or a headache.",
                    urgent: false,
                    log: "Your reading and the advice given.",
                    exit: "you save a reading for this scan. This updates on its own."
                });
            });
        }

        // Women's health data from Cmdr. Silva, only if she shares it with the crew medical officer
        var shares = womens.enabled !== false && silvaPrivacy.womens.cmo;
        var bleedingDaysAgo = null;
        if (shares && womens.plan === "pill" && Array.isArray(womens.periods)) {
            womens.periods.forEach(function (key) {
                var age = Math.floor((Date.now() - Date.parse(key + "T00:00:00Z")) / DAY_MS);
                if (age >= 0 && age < 7 && (bleedingDaysAgo === null || age < bleedingDaysAgo)) {
                    bleedingDaysAgo = age;
                }
            });
        }
        if (bleedingDaysAgo !== null) {
            alerts.push({
                id: "silva-bleeding",
                member: "silva",
                level: "warn",
                title: "Unexpected bleeding",
                who: "Cmdr. Silva (shared with you)",
                text: "Bleeding logged this week while on the continuous pill.",
                steps: [
                    "Talk in private and ask about missed or late pills.",
                    "Check for dizziness, pain or heavy bleeding.",
                    "Confirm hygiene supplies are within reach.",
                    "Review the pill schedule with the flight surgeon at the next contact."
                ],
                escalate: "Heavy bleeding, strong pain, dizziness or fainting.",
                urgent: false,
                log: "Days with bleeding and any missed pills.",
                exit: BLEEDING_CLEAR_DAYS + " days in a row with no bleeding logged. This updates on its own from the cycle calendar.",
                auto: bleedingDaysAgo >= BLEEDING_CLEAR_DAYS ? "No bleeding logged for " + bleedingDaysAgo + " days (cycle calendar)" : null
            });
        }

        var urinary = shares && womens.urinary && womens.urinary.symptoms && womens.urinary.symptoms.length ? womens.urinary : null;
        if (urinary) {
            alerts.push({
                id: "silva-urinary",
                member: "silva",
                level: "warn",
                title: "Urinary symptoms",
                who: "Cmdr. Silva (shared with you)",
                text: "Logged at " + urinary.time + ": " + urinary.symptoms.join(", ").toLowerCase() + ".",
                steps: [
                    "Confirm the symptoms in private and take the temperature.",
                    "Run a urine test strip from the medical kit.",
                    "Increase fluids to at least 2.5 L today.",
                    "If the strip is positive, start the treatment listed in the crew medical checklist."
                ],
                escalate: "Fever, back pain or blood in the urine.",
                urgent: false,
                log: "Test strip result, temperature and any medicine given.",
                exit: "a negative urine test strip.",
                fields: [{ key: "strip", kind: "select", label: "Test strip result", options: ["Negative", "Positive"] }],
                check: function (reading) {
                    return reading.strip === "Negative"
                        ? { status: "resolved" }
                        : { status: "open", note: "Positive: start the treatment in the crew medical checklist and run a new strip in 48 hours." };
                },
                describe: function (reading) {
                    return "a " + reading.strip.toLowerCase() + " test strip";
                }
            });
        }

        /*
         * Status of an alert: a temperature alert follows the shirt's latest recheck (the same one the
         * astronaut sees on Home); the urine strip follows the result saved on the panel; the others stay open.
         */
        function statusOf(alert) {
            if (alert.auto) {
                return "resolved";
            }
            var state = stateOf(alert);
            if (alert.temperature) {
                var recheck = getRecheck(alert.member);
                if (!recheck.reading) {
                    return "open";
                }
                var result = temperatureCheck(recheck.reading.value).status;
                return result === "resolved" && state.reopened ? "open" : result;
            }
            return state.status;
        }

        function levelOf(alert) {
            return statusOf(alert) === "urgent" ? "danger" : alert.level;
        }

        // Worst open level for one member: "ok", "warn" or "danger"
        function memberLevel(member) {
            var level = "ok";
            alerts.forEach(function (alert) {
                if (alert.member !== member || statusOf(alert) === "resolved") {
                    return;
                }
                level = levelOf(alert) === "danger" || level === "danger" ? "danger" : "warn";
            });
            return level;
        }

        // Saves a test result typed on the panel (only the urine strip: everything else comes from the sensors)
        function saveReading(alert, reading) {
            var state = stateOf(alert);
            var outcome = alert.check(reading);
            state.reading = reading;
            state.note = outcome.note || "";
            state.time = App.formatTime(new Date());
            state.status = outcome.status;
            state.reopened = false;
            App.store.set("crew-alerts", saved);
            return outcome;
        }

        function reopen(alert) {
            var state = stateOf(alert);
            state.status = "open";
            state.note = "";
            state.reopened = true;
            App.store.set("crew-alerts", saved);
        }

        function saveSteps() {
            App.store.set("crew-alerts", saved);
        }

        return {
            list: alerts,
            stateOf: stateOf,
            statusOf: statusOf,
            levelOf: levelOf,
            memberLevel: memberLevel,
            saveReading: saveReading,
            saveSteps: saveSteps,
            reopen: reopen
        };
    }

    /*
     * Pre-flight exams (before the flight). Each exam has a window in days before launch, from the flight rules
     * found in the research: bone scan (DXA) within 45 days, pregnancy test within 10 days, annual certification, etc.
     * SEED is a simulated starting point per person, fitted to the real dates: an exam whose window has closed is done,
     * and an exam cannot be done before its window opens. The doctor's bookings ("exams:<member>") win over the seed;
     * a booked date that has passed counts as done, with results pending.
     */
    var PREFLIGHT_EXAMS = [
        { key: "certification", name: "Annual flight certification exam", what: "Full medical exam that clears the crew member to fly.", place: "Flight Medicine Clinic", window: [365, 30], result: "Cleared to fly" },
        { key: "hearing", name: "Hearing test (audiogram)", what: "Baseline before months of noise on board.", place: "Flight Medicine Clinic", window: [180, 30], result: "Baseline recorded" },
        { key: "oct", name: "Baseline retina scan (OCT)", what: "Reference for the eye checks in flight (SANS).", place: "Eye clinic", window: [90, 14], result: "Baseline recorded" },
        { key: "samples", name: "Blood, urine and saliva samples", what: "Immune system and metabolism baseline.", place: "Clinical lab", window: [60, 10], result: "Results in range" },
        { key: "qct", name: "Hip structure scan (QCT)", what: "3D hip strength, for missions of 6 months or more.", place: "Imaging center", window: [60, 14], result: "Baseline recorded", minLength: 180 },
        { key: "dxa", name: "Baseline bone scan (DXA)", what: "Hip, spine, forearm and heel; compared with the scan 5 days after landing.", place: "Bone and muscle lab", window: [45, 7], result: "Baseline recorded" },
        { key: "conference", name: "Private medical conference", what: "With the flight surgeon. The notes stay private.", place: "Flight surgeon's office", window: [30, 3], result: "Notes kept private" },
        // Restricted record: only the status and the date are shown, never a result
        { key: "pregnancy", name: "Pregnancy test", what: "Required within 10 days before launch.", place: "Flight Medicine Clinic", window: [10, 1], result: "", sex: "Female" }
    ];
    var EXAM_SLOTS = [{ hour: 9, minute: 0, label: "09:00" }, { hour: 10, minute: 30, label: "10:30" }, { hour: 14, minute: 0, label: "14:00" }];
    var EXAM_SEED = {
        silva: { certification: "done", hearing: "done", oct: "done", samples: "scheduled", qct: "open", dxa: "scheduled", conference: "open", pregnancy: "open" },
        tanaka: { certification: "done", hearing: "scheduled", oct: "open", samples: "open", qct: "open", dxa: "open", conference: "scheduled" },
        okafor: { certification: "done", hearing: "done", oct: "done", samples: "done", qct: "scheduled", dxa: "scheduled", conference: "done" },
        novak: { certification: "done", hearing: "open", oct: "scheduled", samples: "open", qct: "open", dxa: "open", conference: "open", pregnancy: "open" }
    };

    function atSlot(dayMs, slot) {
        return dayMs + (slot.hour * 60 + slot.minute) * 60000;
    }

    function examBookings(member) {
        var saved = App.store.get("exams:" + member, {});
        return saved && typeof saved === "object" ? saved : {};
    }

    // The exams of one crew member, fitted to the current phase dates (real mission or Presentation mode)
    function preflightExams(member) {
        var person = MEMBERS[member];
        var phase = App.getPhase();
        var today = phase.today.getTime();
        var launch = phase.launch.getTime();
        var length = App.getMode().length;
        var seed = EXAM_SEED[member] || {};
        var booked = examBookings(member);
        var now = Date.now();
        // Spreads the simulated dates so the crew does not share one day per exam
        var spread = Math.max(0, Object.keys(MEMBERS).indexOf(member));

        // A day between first and last (both in ms), picked by exam and person
        function pick(first, last, index) {
            var days = Math.floor((last - first) / DAY_MS);
            return first + (days > 0 ? ((index * 11 + spread * 7) % (days + 1)) : 0) * DAY_MS;
        }

        return PREFLIGHT_EXAMS.filter(function (exam) {
            return (!exam.sex || (person && person.sex === exam.sex)) && (!exam.minLength || length >= exam.minLength);
        }).map(function (exam, index) {
            var opens = launch - exam.window[0] * DAY_MS;
            var closes = launch - exam.window[1] * DAY_MS;
            var item = {
                key: exam.key, name: exam.name, what: exam.what, place: exam.place,
                opens: opens, closes: closes, status: "open", at: null, result: "", dueSoon: false,
                windowOpen: today >= opens
            };
            var saved = booked[exam.key];
            var plan = saved && saved.at ? "booked" : saved && saved.status === "open" ? "open" : seed[exam.key] || "open";

            if (plan === "booked") {
                item.at = saved.at;
                item.status = saved.at < now ? "done" : "scheduled";
                item.result = item.status === "done" ? (exam.result ? "Results pending from the clinic" : "") : "";
            } else if (today > closes) {
                // The window has closed: the flight rules require it, so it was done
                item.status = "done";
                item.at = atSlot(pick(opens, closes, index), EXAM_SLOTS[(index + spread) % 3]);
                item.result = exam.result;
            } else if (plan === "done") {
                var latest = Math.min(closes, today - 2 * DAY_MS);
                if (latest >= opens) {
                    item.status = "done";
                    item.at = atSlot(pick(opens, latest, index), EXAM_SLOTS[(index + spread) % 3]);
                    item.result = exam.result;
                }
            } else if (plan === "scheduled") {
                var day = Math.max(today + (2 + index * 3 + spread) * DAY_MS, opens + (2 + spread) * DAY_MS);
                if (day > closes) {
                    day = Math.min(closes, Math.max(today + (1 + spread) * DAY_MS, opens));
                }
                if (day <= closes) {
                    item.status = "scheduled";
                    item.at = atSlot(day, EXAM_SLOTS[(index + spread) % 3]);
                }
            }
            item.dueSoon = item.status === "open" && item.windowOpen && closes - today <= 14 * DAY_MS;
            return item;
        });
    }

    function examSummary(member) {
        var summary = { done: 0, scheduled: 0, open: 0 };
        preflightExams(member).forEach(function (exam) {
            summary[exam.status] += 1;
        });
        return summary;
    }

    // at: time in ms (UTC). The caller checks it is inside the exam's window
    function scheduleExam(member, key, at) {
        var booked = examBookings(member);
        booked[key] = { at: at };
        App.store.set("exams:" + member, booked);
    }

    function cancelExam(member, key) {
        var booked = examBookings(member);
        booked[key] = { status: "open" };
        App.store.set("exams:" + member, booked);
    }

    App.crew = {
        preflightExams: preflightExams,
        examSummary: examSummary,
        scheduleExam: scheduleExam,
        cancelExam: cancelExam,
        examSlots: EXAM_SLOTS,
        metrics: METRICS,
        members: MEMBERS,
        getMetric: getMetric,
        addSpotMetric: addSpotMetric,
        exerciseGoal: exerciseGoal,
        todayVitals: todayVitals,
        history: history,
        readinessHistory: readinessHistory,
        getRecheck: getRecheck,
        scheduleRecheck: scheduleRecheck,
        cancelRecheck: cancelRecheck,
        series24h: series24h,
        sensorState: sensorState,
        signalOf: signalOf,
        getSensors: getSensors,
        setSensors: setSensors,
        sampleMs: SAMPLE_MS,
        sessions: SESSIONS,
        getEmergencySim: getEmergencySim,
        setEmergencySim: setEmergencySim,
        demoMember: demoMember,
        saveRecheck: saveRecheck,
        temperatureCheck: temperatureCheck,
        buildAlerts: buildAlerts
    };
})();
