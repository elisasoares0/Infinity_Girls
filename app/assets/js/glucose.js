/*
 * Blood glucose and the weekly lab results (App.glucose).
 * Glucose is a spot reading from the glucometer (finger prick), not a 24-hour sensor: one reading a day before
 * breakfast, plus any extra reading the person takes. New readings are saved as backend rows of sinais_vitais
 * (App.records), with a snapshot of the shirt's vital signs, as the schema requires.
 * History is simulated but deterministic, like assets/js/crew-data.js; a saved reading wins over the simulated one.
 *   App.glucose.metric → { key, label, unit, normal, status(v), format(v) }
 *   App.glucose.latest(member) → { value, status, time, source } | null
 *   App.glucose.history(member, days) → [{ date, value, status, time, source }], oldest first
 *   App.glucose.labs(member) → { date, items: [{ key, label, text, normal, status }] }
 *   App.glucose.save(member, mgDl, source) → the saved row (fires "glucose:change")
 *   App.glucose.parseMeasurement(dataView) → { sequence, time, mgDl } from a Bluetooth glucometer
 * Ranges are simplified examples, not medical instructions.
 */
(function () {
    "use strict";

    var App = window.App;
    var DAY_MS = 864e5;
    var MORNING = { hour: 7, minute: 10 }; // the daily reading before breakfast (UTC)
    var MMOL_TO_MGDL = 18.0182;

    function glucoseStatus(v) {
        return v < 54 || v > 250 ? "danger" : v < 70 || v > 140 ? "warn" : "ok";
    }

    var METRIC = {
        key: "glucose", label: "Blood glucose", unit: "mg/dL", normal: "70–140 mg/dL",
        status: glucoseStatus,
        format: function (v) { return Math.round(v) + " mg/dL"; }
    };

    // Usual morning value of each crew member, today's reading, and the latest weekly lab results
    var PEOPLE = {
        silva: { base: 94, today: 96, labs: { ketones: 0.2, cortisol: 5.1, immune: "normal" } },
        tanaka: { base: 101, today: 152, labs: { ketones: 0.4, cortisol: 7.6, immune: "elevado" } },
        okafor: { base: 97, today: 95, labs: { ketones: 0.1, cortisol: 4.6, immune: "normal" } },
        novak: { base: 88, today: 86, labs: { ketones: 0.3, cortisol: 11.2, immune: "normal" } }
    };

    var IMMUNE_TEXT = { normal: "Normal", elevado: "Raised", baixo: "Low" };

    // Small seeded random generator (same as crew-data.js) so history is stable
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

    function dayStart(time) {
        var date = new Date(time);
        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }

    function dayKey(time) {
        return new Date(dayStart(time)).toISOString().slice(0, 10);
    }

    function person(member) {
        return PEOPLE[member] || PEOPLE.silva;
    }

    // The simulated morning reading of one day (today's comes from PEOPLE, earlier days wander around the base)
    function simulatedOn(member, start) {
        var time = start + (MORNING.hour * 60 + MORNING.minute) * 60000;
        var value;
        if (start === dayStart(Date.now())) {
            value = person(member).today;
        } else {
            var random = seeded(member + ":glucose:" + dayKey(start));
            value = Math.round(person(member).base + (random() - 0.5) * 16);
        }
        return { value: value, status: glucoseStatus(value), time: time, source: "simulated" };
    }

    function savedReadings(member) {
        return App.records.list("sinais_vitais", { usuario_id: member }).map(function (row) {
            return { value: Number(row.glicose_mg_dl), status: glucoseStatus(Number(row.glicose_mg_dl)), time: Date.parse(row.registrado_em), source: "saved" };
        });
    }

    // One reading per day: the last one saved that day, else the simulated morning reading once its time has passed
    function history(member, days) {
        var saved = savedReadings(member);
        var now = Date.now();
        var today = dayStart(now);
        var list = [];
        for (var back = days - 1; back >= 0; back--) {
            var start = today - back * DAY_MS;
            var ofDay = saved.filter(function (item) {
                return dayStart(item.time) === start;
            })[0];
            var simulated = simulatedOn(member, start);
            var reading = ofDay || (simulated.time <= now ? simulated : null);
            if (reading) {
                list.push({ date: new Date(start), value: reading.value, status: reading.status, time: reading.time, source: reading.source });
            }
        }
        return list;
    }

    function latest(member) {
        var list = history(member, 2);
        return list.length ? list[list.length - 1] : null;
    }

    // Weekly saliva and blood collection, read by the on-board analyzer
    function labs(member) {
        var data = person(member).labs;
        var phase = App.getPhase();
        var back = phase.key === "in" ? phase.missionDay % 7 : 3;
        return {
            date: new Date(dayStart(Date.now()) - back * DAY_MS + 7.25 * 36e5),
            items: [
                { key: "ketones", label: "Ketones (blood)", text: data.ketones.toFixed(1) + " mmol/L", normal: "below 0.6 mmol/L", status: data.ketones > 1.5 ? "danger" : data.ketones >= 0.6 ? "warn" : "ok" },
                { key: "cortisol", label: "Cortisol (saliva, morning)", text: data.cortisol.toFixed(1) + " ng/mL", normal: "up to 8.0 ng/mL", status: data.cortisol > 8 ? "warn" : "ok" },
                { key: "immune", label: "Immune marker", text: IMMUNE_TEXT[data.immune], normal: "no change from your pre-flight sample", status: data.immune === "normal" ? "ok" : "warn" }
            ]
        };
    }

    /*
     * Saves a reading as a sinais_vitais row. The schema requires heart rate, blood pressure and SpO₂ in every row:
     * they come from the shirt at this moment (its last value when it has no signal).
     */
    function save(member, mgDl, source) {
        var vitals = {};
        App.crew.todayVitals(member).forEach(function (item) {
            vitals[item.key] = item.value;
        });
        var value = Math.round(mgDl * 10) / 10;
        var row = App.records.insert("sinais_vitais", {
            usuario_id: member,
            ambiente_missao: App.records.environment(member),
            frequencia_cardiaca_bpm: Math.round(vitals.hr),
            pressao_arterial_mmhg: Math.round(vitals.bp * 10) / 10,
            oxigenacao_spo2: Math.round(vitals.spo2 * 10) / 10,
            glicose_mg_dl: value,
            temperatura_celsius: Math.round(vitals.temp * 10) / 10,
            horas_sono: Math.round(vitals.sleep * 10) / 10,
            status_alerta: glucoseStatus(value) === "ok" ? "normal" : "alerta"
        });
        document.dispatchEvent(new CustomEvent("glucose:change", { detail: { member: member, value: value, source: source || "manual" } }));
        return row;
    }

    /* ---------- Bluetooth glucometer (standard Glucose Profile, service 0x1808) ---------- */

    // IEEE-11073 16-bit SFLOAT: 4-bit exponent and 12-bit mantissa, both signed; special values mean "no reading"
    function sfloat(raw) {
        if (raw === 0x07FF || raw === 0x0800 || raw === 0x07FE || raw === 0x0802 || raw === 0x0801) {
            return null;
        }
        var mantissa = raw & 0x0FFF;
        var exponent = raw >> 12;
        if (mantissa >= 0x0800) {
            mantissa -= 0x1000;
        }
        if (exponent >= 8) {
            exponent -= 16;
        }
        return mantissa * Math.pow(10, exponent);
    }

    /*
     * Glucose Measurement characteristic (0x2A18): flags, sequence number, base time, optional time offset,
     * then the concentration in kg/L (flag bit 2 off) or mol/L (bit 2 on), converted to mg/dL.
     */
    function parseMeasurement(view) {
        var flags = view.getUint8(0);
        var sequence = view.getUint16(1, true);
        var offset = 10;
        var minutes = 0;
        if (flags & 0x01) {
            minutes = view.getInt16(offset, true);
            offset += 2;
        }
        var time = Date.UTC(view.getUint16(3, true), view.getUint8(5) - 1, view.getUint8(6), view.getUint8(7), view.getUint8(8) + minutes, view.getUint8(9));
        if (!(flags & 0x02) || view.byteLength < offset + 2) {
            return { sequence: sequence, time: time, mgDl: null };
        }
        var concentration = sfloat(view.getUint16(offset, true));
        if (concentration === null) {
            return { sequence: sequence, time: time, mgDl: null };
        }
        var mgDl = flags & 0x04 ? concentration * 1000 * MMOL_TO_MGDL : concentration * 1e5;
        return { sequence: sequence, time: time, mgDl: Math.round(mgDl * 10) / 10 };
    }

    if (App.crew && App.crew.addSpotMetric) {
        App.crew.addSpotMetric(METRIC);
    }

    App.glucose = {
        metric: METRIC,
        status: glucoseStatus,
        latest: latest,
        history: history,
        labs: labs,
        save: save,
        parseMeasurement: parseMeasurement,
        mmolToMgDl: function (mmol) {
            return mmol * MMOL_TO_MGDL;
        },
        range: { min: 20, max: 600, low: 70, high: 140, actLow: 54, actHigh: 250 }
    };
})();
