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

    // Phosphor regular (assets/vendor/phosphor/regular), 256 × 256, drawn with currentColor
    var ICONS = {
        pain: "<path d=\"M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z\"/>",
        eye: "<path d=\"M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z\"/>",
        spin: "<path d=\"M248,144a8,8,0,0,1-16,0,96.11,96.11,0,0,0-96-96,88.1,88.1,0,0,0-88,88,80.09,80.09,0,0,0,80,80,72.08,72.08,0,0,0,72-72,64.07,64.07,0,0,0-64-64,56.06,56.06,0,0,0-56,56,48.05,48.05,0,0,0,48,48,40,40,0,0,0,40-40,32,32,0,0,0-32-32,24,24,0,0,0-24,24,16,16,0,0,0,16,16,8,8,0,0,0,8-8,8,8,0,0,1,0-16,16,16,0,0,1,16,16,24,24,0,0,1-24,24,32,32,0,0,1-32-32,40,40,0,0,1,40-40,48.05,48.05,0,0,1,48,48,56.06,56.06,0,0,1-56,56,64.07,64.07,0,0,1-64-64,72.08,72.08,0,0,1,72-72,80.09,80.09,0,0,1,80,80,88.1,88.1,0,0,1-88,88,96.11,96.11,0,0,1-96-96A104.11,104.11,0,0,1,136,32,112.12,112.12,0,0,1,248,144Z\"/>",
        drop: "<path d=\"M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM128,216a72.08,72.08,0,0,1-72-72c0-57.23,55.47-105,72-118,16.53,13,72,60.75,72,118A72.08,72.08,0,0,1,128,216Zm55.89-62.66a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z\"/>",
        heart: "<path d=\"M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z\"/>",
        breath: "<path d=\"M184,184a32,32,0,0,1-32,32c-13.7,0-26.95-8.93-31.5-21.22a8,8,0,0,1,15-5.56C137.74,195.27,145,200,152,200a16,16,0,0,0,0-32H40a8,8,0,0,1,0-16H152A32,32,0,0,1,184,184Zm-64-80a32,32,0,0,0,0-64c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C105.74,60.73,113,56,120,56a16,16,0,0,1,0,32H24a8,8,0,0,0,0,16Zm88-32c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C193.74,92.73,201,88,208,88a16,16,0,0,1,0,32H32a8,8,0,0,0,0,16H208a32,32,0,0,0,0-64Z\"/>",
        pulse: "<path d=\"M72,144H32a8,8,0,0,1,0-16H67.72l13.62-20.44a8,8,0,0,1,13.32,0l25.34,38,9.34-14A8,8,0,0,1,136,128h24a8,8,0,0,1,0,16H140.28l-13.62,20.44a8,8,0,0,1-13.32,0L88,126.42l-9.34,14A8,8,0,0,1,72,144ZM178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,.75,0,1.5,0,2.25a8,8,0,1,0,16-.5c0-.58,0-1.17,0-1.75A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46c0,53.61-77.76,102.15-96,112.8-10.83-6.31-42.63-26-66.68-52.21a8,8,0,1,0-11.8,10.82c31.17,34,72.93,56.68,74.69,57.63a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40Z\"/>",
        sugar: "<path d=\"M200,40H56A16,16,0,0,0,40,56V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,80H136V56h64ZM120,56v64H56V56ZM56,136h64v64H56Zm144,64H136V136h64v64Z\"/>",
        gut: "<path d=\"M224,104h-8.37a88,88,0,0,0-175.26,0H32a8,8,0,0,0-8,8,104.35,104.35,0,0,0,56,92.28V208a16,16,0,0,0,16,16h64a16,16,0,0,0,16-16v-3.72A104.35,104.35,0,0,0,232,112,8,8,0,0,0,224,104Zm-24.46,0H148.12a71.84,71.84,0,0,1,41.27-29.57A71.45,71.45,0,0,1,199.54,104ZM173.48,56.23q2.75,2.25,5.27,4.75a87.92,87.92,0,0,0-49.15,43H100.1A72.26,72.26,0,0,1,168,56C169.83,56,171.66,56.09,173.48,56.23ZM128,40a71.87,71.87,0,0,1,19,2.57A88.36,88.36,0,0,0,83.33,104H56.46A72.08,72.08,0,0,1,128,40Zm36.66,152A8,8,0,0,0,160,199.3V208H96v-8.7A8,8,0,0,0,91.34,192a88.29,88.29,0,0,1-51-72H215.63A88.29,88.29,0,0,1,164.66,192Z\"/>",
        tingle: "<path d=\"M72,60A12,12,0,1,1,60,48,12,12,0,0,1,72,60Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,128,48Zm68,24a12,12,0,1,0-12-12A12,12,0,0,0,196,72ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,128,116Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,184a12,12,0,1,0,12,12A12,12,0,0,0,60,184Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,128,184Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,196,184Z\"/>",
        joint: "<path d=\"M231.67,60.89a35.82,35.82,0,0,0-23.82-12.74,36,36,0,1,0-66.37,22.92.25.25,0,0,1,0,.08L71.17,141.51s0,0-.1,0a36,36,0,1,0-22.92,66.37,36,36,0,1,0,66.37-22.92.54.54,0,0,1,0-.08l70.35-70.36s0,0,.1,0a36,36,0,0,0,46.74-53.63ZM219.1,97.16a20,20,0,0,1-25.67,3.8,16,16,0,0,0-19.88,2.19l-70.4,70.4A16,16,0,0,0,101,193.43a20,20,0,1,1-36.75,7.5,8,8,0,0,0-7.91-9.24,8.5,8.5,0,0,0-1.23.1A20,20,0,1,1,62.57,155a16,16,0,0,0,19.88-2.19l70.4-70.4A16,16,0,0,0,155,62.57a20,20,0,1,1,36.75-7.5,8,8,0,0,0,9.14,9.14,20,20,0,0,1,18.17,33Z\"/>",
        stretch: "<path d=\"M128,80A32,32,0,1,0,96,48,32,32,0,0,0,128,80Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,128,32Zm96,72a8,8,0,0,1-8,8H136v26.72l51.15,21.93A8,8,0,0,1,192,168v48a8,8,0,0,1-16,0V173.28l-46.45-19.91L53.35,222a8,8,0,1,1-10.7-11.9L120,140.44V112H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,104Z\"/>"
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
        return "<svg class=\"" + className + "\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\">" + (ICONS[name] || ICONS.pain) + "</svg>";
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
