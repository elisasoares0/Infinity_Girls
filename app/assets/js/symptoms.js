/*
 * Body check-in (App.symptoms): what a crew member feels, on a region of the body, with how strong it is (1 to 5).
 * Saved in the backend's body_checkin table (App.records); a nausea or vomiting log also fills the day's
 * avaliacoes_diarias.enjoo_gravidade_escala and turns on nausea mode (assets/js/nausea-mode.js).
 * Every text here is fixed (never generated): the advice for each level comes from the tables below.
 *   App.symptoms.regions → [{ id, label, text, symptoms: [{ id, label, icon, hint, learn, sos, warning, nausea, glucose }] }]
 *   App.symptoms.protocol(regionId, symptomId, level) → the advice for that level (saved as protocolo_acao)
 *   App.symptoms.sosFor(regionId, symptomId, level) → emergency scenario to offer ("chest-pain"…) or null
 *   App.symptoms.save(member, regionId, symptomId, level) → the saved row; fires "symptoms:change"
 *   App.symptoms.today(member) → today's rows, newest first; App.symptoms.resolve(id) marks one better
 *   App.symptoms.needsDoctor(row) → true when the crew medical officer should look at it (severe or a warning sign)
 * Region ids are the backend values of regiao_anatomica; symptom ids are the values of sintoma.
 */
(function () {
    "use strict";

    var App = window.App;

    var ICONS = {
        pain: "<path d=\"M13 3L5 14h6l-1 7 8-11h-6z\"/>",
        eye: "<path d=\"M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
        spin: "<path d=\"M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4-4 6 6 0 1 1-6 6\"/>",
        drop: "<path d=\"M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z\"/>",
        heart: "<path d=\"M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z\"/>",
        breath: "<path d=\"M3 9h11a3 3 0 1 0-3-3M3 15h14a3 3 0 1 1-3 3\"/>",
        pulse: "<path d=\"M3 12h4l2-5 4 10 2-5h6\"/>",
        sugar: "<rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"2\"/><path d=\"M5 10h14M10 5v14\"/>",
        gut: "<path d=\"M8 3v4a4 4 0 0 0 4 4h1a5 5 0 0 1 0 10H9\"/>",
        tingle: "<path d=\"M6 7v.01M12 5v.01M18 7v.01M6 17v.01M12 19v.01M18 17v.01M9 12v.01M15 12v.01\"/>",
        joint: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M4 4l5.5 5.5M20 20l-5.5-5.5\"/>",
        stretch: "<path d=\"M4 19l5-5 4 4 7-10\"/>"
    };

    var NAUSEA_HINT = "Keep your head still, look at one fixed point and take small sips of water.";

    var REGIONS = [
        {
            id: "cabeca",
            label: "Head",
            text: "Headache, eyes, balance and motion sickness",
            symptoms: [
                { id: "dor_de_cabeca", label: "Headache", icon: "pain", hint: "Drink water, rest your eyes and check the CO₂ reading of your module." },
                { id: "visao_turva", label: "Blurry vision", icon: "eye", hint: "Note when it started. The retina scan (OCT) checks your eyes for swelling.", learn: "sans" },
                { id: "tontura", label: "Dizziness", icon: "spin", hint: "Hold on to something fixed and keep your head still until it passes.", learn: "sensorimotor" },
                { id: "nausea", label: "Nausea or motion sickness", icon: "spin", hint: NAUSEA_HINT, nausea: true, learn: "sensorimotor" }
            ]
        },
        {
            id: "torax",
            label: "Chest",
            text: "Heart and breathing",
            symptoms: [
                { id: "dor_no_peito", label: "Chest pain", icon: "heart", hint: "Stop what you are doing and rest.", sos: "chest-pain", learn: "cardiovascular" },
                { id: "falta_de_ar", label: "Short of breath", icon: "breath", hint: "Stop, rest and check your oxygen (SpO₂) on the shirt reading.", sos: "low-oxygen", learn: "hypoxia" },
                { id: "palpitacao", label: "Racing or skipping heartbeat", icon: "pulse", hint: "Rest and breathe slowly. The shirt keeps recording your heart rhythm.", learn: "cardiovascular" }
            ]
        },
        {
            id: "abdomen",
            label: "Abdomen & metabolism",
            text: "Blood sugar, digestion and motion sickness",
            symptoms: [
                { id: "nausea", label: "Nausea", icon: "spin", hint: NAUSEA_HINT, nausea: true, learn: "sensorimotor" },
                { id: "vomito", label: "Vomiting", icon: "drop", hint: "Use an emesis bag, rinse your mouth and sip water slowly to replace what you lost.", nausea: true, learn: "sensorimotor" },
                { id: "desconforto_abdominal", label: "Abdominal discomfort", icon: "gut", hint: "Note what you ate and when. Gas and constipation are common in microgravity.", learn: "nutrition" },
                { id: "fraqueza_hipoglicemia", label: "Weak or shaky", icon: "sugar", hint: "Measure your blood sugar now. If it is low, take 15 g of fast sugar.", glucose: true, learn: "nutrition" }
            ]
        },
        {
            id: "costas",
            label: "Back",
            text: "Spine and muscles",
            symptoms: [
                { id: "dor_nas_costas", label: "Back pain", icon: "pain", hint: "Your spine lengthens without gravity. Gentle knee-to-chest stretches and your exercise plan help.", learn: "bone" },
                { id: "rigidez", label: "Stiffness", icon: "stretch", hint: "Stretch slowly and move often. Keep up your exercise sessions.", learn: "fitness" }
            ]
        },
        {
            id: "bracos",
            label: "Arms & hands",
            text: "Hands, joints and spacewalk gloves",
            symptoms: [
                { id: "dor_nas_maos", label: "Hand or finger pain", icon: "pain", hint: "Common after spacewalks (glove fit). Rest your hands and report any nail or skin damage.", learn: "eva-injury" },
                { id: "dormencia", label: "Numbness or tingling", icon: "tingle", hint: "Move your fingers and change position. Right after a spacewalk it can be decompression sickness.", warning: true, learn: "decompression" },
                { id: "dor_articular", label: "Joint pain", icon: "joint", hint: "Rest the joint. Right after a spacewalk, joint pain can be decompression sickness.", warning: true, learn: "decompression" }
            ]
        },
        {
            id: "pernas",
            label: "Legs & feet",
            text: "Muscles, bones and blood flow",
            symptoms: [
                { id: "dor_panturrilha", label: "Calf pain or swelling", icon: "drop", hint: "Do not massage the leg. A swollen, painful calf can be a blood clot.", warning: true, learn: "cardiovascular" },
                { id: "caibra", label: "Muscle cramp", icon: "stretch", hint: "Stretch the muscle gently and drink water.", learn: "fitness" },
                { id: "dor_ossea", label: "Joint or bone pain", icon: "joint", hint: "Rest it and note when it hurts. Your exercise plan protects your bones in space.", learn: "bone" }
            ]
        }
    ];

    var LEVELS = ["", "Very mild", "Mild", "Moderate", "Strong", "Severe"];

    function region(id) {
        return REGIONS.filter(function (item) {
            return item.id === id;
        })[0] || null;
    }

    function symptom(regionId, symptomId) {
        var area = region(regionId);
        return area ? area.symptoms.filter(function (item) {
            return item.id === symptomId;
        })[0] || null : null;
    }

    function icon(name, className) {
        return "<svg class=\"" + className + "\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">" + (ICONS[name] || ICONS.pain) + "</svg>";
    }

    // "flight surgeon" on Earth and with the ground leading; "crew medical officer" on the way to Mars
    function lead() {
        return App.getMedicalLead().name.replace(/ \(.*\)/, "").toLowerCase();
    }

    function band(level) {
        return level >= 4 ? "severe" : level === 3 ? "moderate" : "mild";
    }

    // Emergency scenario to offer: a warning sign in the chest, from level 3, in flight
    function sosFor(regionId, symptomId, level) {
        var item = symptom(regionId, symptomId);
        return item && item.sos && level >= 3 && App.isFlight() ? item.sos : null;
    }

    function isWarning(item, level) {
        return Boolean(item && (item.sos || item.warning) && level >= 3);
    }

    // The advice for a level: self-care, tell the medical lead at the next check, or now (fixed texts)
    function protocol(regionId, symptomId, level) {
        var item = symptom(regionId, symptomId);
        if (!item) {
            return "";
        }
        var who = "your " + lead();
        if (sosFor(regionId, symptomId, level)) {
            return "Warning sign: start SOS now. " + item.hint;
        }
        if (isWarning(item, level)) {
            return "Warning sign: tell " + who + " now. " + item.hint;
        }
        if (band(level) === "severe") {
            return "Strong: tell " + who + " now. " + item.hint;
        }
        if (band(level) === "moderate") {
            return "Moderate: tell " + who + " at the next health check. " + item.hint;
        }
        return "Mild: self-care. " + item.hint;
    }

    function today(member) {
        var key = App.todayKey();
        return App.records.list("body_checkin", { usuario_id: member }).filter(function (row) {
            return String(row.registrado_em).slice(0, 10) === key;
        });
    }

    function save(member, regionId, symptomId, level) {
        var item = symptom(regionId, symptomId);
        if (!item) {
            throw new Error("Unknown symptom: " + regionId + "/" + symptomId);
        }
        var row = App.records.insert("body_checkin", {
            usuario_id: member,
            regiao_anatomica: regionId,
            sintoma: symptomId,
            intensidade: level,
            protocolo_acao: protocol(regionId, symptomId, level),
            resolvido: false
        });
        if (item.nausea) {
            // The day's motion sickness score is the strongest nausea or vomiting logged today
            var strongest = today(member).filter(function (saved) {
                var kind = symptom(saved.regiao_anatomica, saved.sintoma);
                return kind && kind.nausea;
            }).reduce(function (max, saved) {
                return Math.max(max, saved.intensidade);
            }, 0);
            App.records.upsert("avaliacoes_diarias", {
                usuario_id: member,
                data_registro: App.todayKey(),
                enjoo_gravidade_escala: strongest
            }, ["usuario_id", "data_registro"]);
            if (App.nausea) {
                App.nausea.logged(member, row);
            }
        }
        document.dispatchEvent(new CustomEvent("symptoms:change", { detail: { member: member, row: row } }));
        return row;
    }

    function resolve(id) {
        var row = App.records.update("body_checkin", id, { resolvido: true });
        document.dispatchEvent(new CustomEvent("symptoms:change", { detail: { member: row.usuario_id, row: row } }));
        return row;
    }

    function needsDoctor(row) {
        var item = symptom(row.regiao_anatomica, row.sintoma);
        return !row.resolvido && (row.intensidade >= 4 || isWarning(item, row.intensidade));
    }

    // "Nausea 3/5", for lists and alerts
    function label(row) {
        var item = symptom(row.regiao_anatomica, row.sintoma);
        return (item ? item.label : row.sintoma) + " " + row.intensidade + "/5";
    }

    App.symptoms = {
        regions: REGIONS,
        levels: LEVELS,
        region: region,
        symptom: symptom,
        icon: icon,
        protocol: protocol,
        sosFor: sosFor,
        band: band,
        save: save,
        today: today,
        resolve: resolve,
        needsDoctor: needsDoctor,
        label: label
    };
})();
