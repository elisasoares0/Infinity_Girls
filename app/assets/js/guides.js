/*
 * Emergency guides shared by the Emergency page, the SOS dialog and the crew alerts (App.guides).
 * Stored on board by the service worker, so they work without a link to Earth.
 * Guides and kit instructions are simplified examples, to be validated by a flight surgeon; they are not medical instructions.
 *
 * Scenarios (App.guides.scenarios) tie an emergency to its guide and to the words the voice assistant says.
 * Spoken text is always built from these templates and the measured values: never generated.
 */
(function () {
    "use strict";

    var App = window.App;

    /*
     * How to use each piece of the medical kit, in plain words. A guide step that names a kit item
     * gets a "How to do this" line with this text.
     */
    var KIT = {
        ecg: { name: "ECG leads", match: /ECG/, how: "Peel the backing off the 4 stickers. Put two under the collarbones and two on the lower ribs, left and right. Clip the leads by color, press Record and keep still for 10 seconds." },
        oximeter: { name: "Finger oximeter", match: /SpO₂/, how: "Clip it on a warm finger, nail up, and wait 10 seconds without moving. The Astroskin shirt also reads SpO₂ on its own." },
        penlight: { name: "Penlight", match: /penlight|pupils/i, how: "Shine the light into each eye from the side for 2 seconds. Both pupils should get smaller at the same speed and look the same size." },
        defibrillator: { name: "Defibrillator", match: /defibrillator/i, how: "Open the lid: it turns on and talks. Put one pad under the right collarbone and one on the left side below the armpit. Nobody touches the person while it analyzes or shocks." },
        oxygen: { name: "Oxygen mask", match: /oxygen mask|Give oxygen/i, how: "Open the valve on the mask until the bag fills, put the mask over nose and mouth and pull the strap behind the head." },
        injector: { name: "Epinephrine auto-injector", match: /auto-injector/i, how: "Pull off the safety cap, press the tip firmly on the outer thigh until it clicks and hold for 3 seconds. It works through clothes." },
        glucometer: { name: "Glucometer", match: /glucometer/i, how: "Wash and dry your hands. Put a new strip in the meter, prick the side of a fingertip with the lancet and touch the drop to the end of the strip. The number shows in 5 seconds." },
        gel: { name: "Glucose gel", match: /fast sugar|glucose gel/i, how: "Tear the top off one tube (15 g of sugar) and squeeze it all into the mouth, between the cheek and the gums. Only if the person is awake and can swallow." },
        tourniquet: { name: "Tourniquet", match: /tourniquet/i, how: "Wrap it 5 cm above the wound, pull the strap tight, turn the rod until the bleeding stops, lock it and write the time on the strap." }
    };

    // Ordered by how fast they can become life-threatening. learn: the risk on the Learn page (pages/learn/) behind it
    var GUIDES = [
        {
            id: "collapse",
            learn: "cardiovascular",
            title: "Not responding or not breathing",
            signs: "The person does not answer, does not move, or is not breathing normally.",
            keywords: "collapse collapsed unconscious not breathing no breath cpr heart stop cardiac arrest defibrillator aed faint",
            steps: [
                "Check if the person responds and breathes: speak loudly, tap the shoulders and look at the chest for 10 seconds.",
                "Call the crew. The app has already sent the alert with the location; shout for help too.",
                "Restrain the person on the medical restraint or against a wall and start chest compressions as in the crew medical checklist: hard and fast, at the beat of the metronome.",
                "Turn on the defibrillator from the medical kit and follow its voice.",
                "Keep going until the person breathes or the crew medical officer takes over."
            ],
            escalate: "This is the most urgent guide. Do not stop compressions for more than 10 seconds.",
            cpr: true
        },
        {
            id: "chest",
            learn: "cardiovascular",
            title: "Chest pain or pressure",
            signs: "Pain, tightness or pressure in the chest, sometimes in the arm, jaw or back.",
            keywords: "chest heart pain pressure tight arm jaw back",
            steps: [
                "Stop all activity. Sit or strap in.",
                "Tell the crew medical officer and note the time the pain started.",
                "Attach the ECG leads from the medical kit and store the reading.",
                "Give aspirin from the kit only if the crew medical checklist lists it and there is no allergy.",
                "Give oxygen if SpO₂ is below 94 %."
            ],
            escalate: "Pain lasts more than 10 minutes, fainting, SpO₂ below 90 % or an irregular heartbeat on the ECG.",
            collapseLink: true
        },
        {
            id: "breathing",
            learn: "hypoxia",
            title: "Trouble breathing",
            signs: "Short of breath, wheezing, cannot finish a sentence.",
            keywords: "breathing breath short wheeze choking air oxygen asthma",
            steps: [
                "Check the cabin air alarm first. If it sounds, go to “Smoke or toxic air”.",
                "Put on the oxygen mask from the medical kit.",
                "Sit upright and strap in.",
                "Measure SpO₂ and breathing rate every 5 minutes.",
                "If there is wheezing, use the inhaler from the kit as listed in the checklist."
            ],
            escalate: "SpO₂ below 90 % with oxygen, blue lips, or cannot speak."
        },
        {
            id: "glucose",
            learn: "nutrition",
            title: "Low blood sugar",
            signs: "Shaky, sweaty, hungry, confused or a glucometer reading below 70 mg/dL.",
            keywords: "glucose sugar low hypoglycemia shaky sweaty confused faint glucometer diabetes",
            steps: [
                "Measure with the glucometer from the medical kit. Below 70 mg/dL is low.",
                "If the person is awake and can swallow, give 15 g of fast sugar: one tube of glucose gel from the kit or a juice pouch.",
                "Wait 15 minutes and measure again with the glucometer.",
                "Still below 70 mg/dL: give 15 g of fast sugar again and measure after 15 minutes.",
                "Above 70 mg/dL: eat a snack or the next meal, and tell the crew medical officer."
            ],
            escalate: "Below 54 mg/dL, confused or cannot swallow (give nothing by mouth), or still low after two rounds. If the person stops responding, go to “Not responding or not breathing”."
        },
        {
            id: "allergy",
            learn: "immune",
            title: "Severe allergic reaction",
            signs: "Swelling of lips or throat, hives, trouble breathing after food, medicine or a sting.",
            keywords: "allergy allergic swelling hives rash itch throat anaphylaxis",
            steps: [
                "Use the epinephrine auto-injector from the kit on the outer thigh. Note the time.",
                "Lie flat with legs raised. If breathing is hard, sit up instead.",
                "Give oxygen.",
                "Keep a second injector ready: it can be used after 5 to 15 minutes if there is no improvement."
            ],
            escalate: "Throat swelling, trouble breathing or fainting."
        },
        {
            id: "bleeding",
            learn: "eva-injury",
            title: "Heavy bleeding",
            signs: "A cut or wound that keeps bleeding.",
            keywords: "bleeding blood cut wound",
            steps: [
                "Put on gloves.",
                "Press hard on the wound with gauze. Blood forms floating drops in microgravity, so cover it fully.",
                "Keep pressing for 10 minutes without lifting. If it soaks through, add gauze on top.",
                "If a limb keeps bleeding, put the tourniquet from the kit above the wound and note the time.",
                "Collect floating drops with absorbent wipes."
            ],
            escalate: "Bleeding does not stop after 10 minutes of pressure, dizziness, or pale and cold skin."
        },
        {
            id: "head",
            learn: "sensorimotor",
            title: "Head injury or fainting",
            signs: "Hit to the head, fainted, dizzy or confused.",
            keywords: "head hit faint fainting dizzy unconscious confused concussion",
            steps: [
                "If the head was hit hard, do not move the neck.",
                "Check that the person responds and breathes.",
                "Measure heart rate, blood pressure and SpO₂.",
                "Check the pupils with the penlight and ask for name, place and date.",
                "Recheck every 15 minutes for 4 hours."
            ],
            escalate: "Does not wake up, vomiting, seizure, unequal pupils or confusion getting worse.",
            collapseLink: true
        },
        {
            id: "eye",
            learn: "eva-injury",
            title: "Eye injury or something in the eye",
            signs: "A particle, chemical splash or hit in the eye.",
            keywords: "eye eyes particle debris chemical splash vision",
            steps: [
                "Do not rub the eye.",
                "Rinse with the eyewash bottle from the kit for at least 15 minutes, holding the eyelids open.",
                "If a chemical splashed, keep rinsing and note the product name.",
                "Cover the eye with a shield that does not press on it.",
                "Test vision with the chart in the kit."
            ],
            escalate: "Vision loss, strong pain or an object stuck in the eye."
        },
        {
            id: "burn",
            learn: "operations",
            title: "Burn",
            signs: "Burn from heat, a hot liquid or electricity.",
            keywords: "burn heat fire hot scald electrical shock",
            steps: [
                "Stop the source. If it is electrical, cut the power first.",
                "Cool the burn with water from the kit pouch for 20 minutes.",
                "Remove rings and tight items before swelling starts.",
                "Cover loosely with the burn dressing.",
                "Give pain medicine as listed in the checklist."
            ],
            escalate: "Burn larger than the person's palm, on the face, hands or genitals, or any electrical burn."
        },
        {
            id: "air",
            learn: "hypoxia",
            title: "Smoke or toxic air",
            signs: "Smoke, a strange smell or the cabin air alarm.",
            keywords: "smoke fire fumes alarm ammonia toxic gas air smell",
            steps: [
                "Put on your mask or breathing device now.",
                "Follow the emergency checklist for the alarm with the commander.",
                "Move to the safe module agreed for this alarm.",
                "Check each crew member: breathing, SpO₂ and eyes.",
                "Rinse eyes and skin that touched chemicals."
            ],
            escalate: "SpO₂ below 90 %, coughing blood or confusion."
        }
    ];

    /*
     * Emergency scenarios: which guide to follow and what the voice says.
     * self: spoken to the person on their own device. nearby: spoken to the people around (the person cannot act).
     * crew: spoken on the other crew devices. Placeholders: {name} {vitals} {location} {responder} {kit}.
     */
    var SCENARIOS = {
        "chest-pain": {
            title: "Chest pain",
            guide: "chest",
            self: "{name}, {vitals}. Stop what you are doing and strap in. I am alerting the crew. {responder}",
            crew: "{name} needs help in {location}. Chest pain, {vitals}. Bring the medical kit from {kit}."
        },
        collapse: {
            title: "Not responding",
            guide: "collapse",
            nearby: "{name} is not breathing. {vitals}. Crew: start chest compressions now. Bring the defibrillator from {kit}. {responder}",
            crew: "{name} is not breathing in {location}. Start chest compressions. Bring the defibrillator from {kit}."
        },
        "low-oxygen": {
            title: "Low oxygen",
            guide: "breathing",
            self: "{name}, {vitals}. Put on the oxygen mask from the medical kit and strap in. I am alerting the crew. {responder}",
            crew: "{name} needs help in {location}. Low oxygen, {vitals}. Bring the oxygen from {kit}."
        },
        "low-glucose": {
            title: "Low blood sugar",
            guide: "glucose",
            self: "{name}, {vitals}. Take one tube of glucose gel from the medical kit now and sit down. I am alerting the crew. {responder}",
            crew: "{name} has low blood sugar in {location}. {vitals}. Bring the glucose gel from {kit}."
        },
        "high-fever": {
            title: "High fever",
            guide: "head",
            self: "{name}, {vitals}. Stop and rest, drink water and tell the crew medical officer. I am alerting the crew. {responder}",
            crew: "{name} has a high fever in {location}. {vitals}. Check on them with the medical kit."
        },
        critical: {
            title: "Vital signs need action",
            guide: null,
            self: "{name}, {vitals}. Stop what you are doing and strap in. I am alerting the crew. {responder}",
            crew: "{name} needs help in {location}. {vitals}. Bring the medical kit from {kit}."
        },
        manual: {
            title: "Help requested",
            guide: null,
            self: "{name}, I am alerting the crew now. {responder} Tell me what is happening: pick the closest guide.",
            crew: "{name} asked for help in {location}. Go now and bring the medical kit from {kit}."
        }
    };

    function byId(id) {
        return GUIDES.filter(function (guide) {
            return guide.id === id;
        })[0] || null;
    }

    // Kit items named in a step, with how to use them
    function kitFor(step) {
        return Object.keys(KIT).filter(function (key) {
            return KIT[key].match.test(step);
        }).map(function (key) {
            return KIT[key];
        });
    }

    // Fills a scenario template: unknown placeholders are dropped, spaces tidied
    function fill(template, values) {
        return template.replace(/\{(\w+)\}/g, function (match, key) {
            return values[key] || "";
        }).replace(/\s+/g, " ").replace(/\s+([.,])/g, "$1").trim();
    }

    /*
     * Chest compressions metronome: 110 beats a minute with Web Audio (no sound file), and a 2-minute cycle timer.
     * onBeat(count) and onCycle(cycles) let the page show the pulse and speak "Two minutes. Check breathing."
     * Audio only starts after a tap (browser rule), which is how it is always started.
     */
    function metronome(options) {
        var bpm = (options && options.bpm) || 110;
        var audio = null;
        var timer = null;
        var started = 0;
        var beats = 0;
        var lastCycle = 0;

        function click() {
            if (!audio) {
                return;
            }
            var osc = audio.createOscillator();
            var gain = audio.createGain();
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.25, audio.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(audio.destination);
            osc.start();
            osc.stop(audio.currentTime + 0.09);
        }

        function tick() {
            beats += 1;
            click();
            if (options && options.onBeat) {
                options.onBeat(beats, Date.now() - started);
            }
            var cycles = Math.floor((Date.now() - started) / 120000);
            if (cycles > lastCycle) {
                lastCycle = cycles;
                if (options && options.onCycle) {
                    options.onCycle(cycles);
                }
            }
        }

        return {
            start: function () {
                if (timer) {
                    return;
                }
                try {
                    var Context = window.AudioContext || window.webkitAudioContext;
                    audio = audio || (Context ? new Context() : null);
                    if (audio && audio.state === "suspended") {
                        audio.resume();
                    }
                } catch (error) {
                    audio = null; // No sound: the visual beat still runs
                }
                started = Date.now();
                beats = 0;
                lastCycle = 0;
                tick();
                timer = window.setInterval(tick, 60000 / bpm);
            },
            stop: function () {
                window.clearInterval(timer);
                timer = null;
            },
            isRunning: function () {
                return Boolean(timer);
            },
            elapsed: function () {
                return timer ? Date.now() - started : 0;
            }
        };
    }

    App.guides = {
        list: GUIDES,
        kit: KIT,
        scenarios: SCENARIOS,
        byId: byId,
        kitFor: kitFor,
        fill: fill,
        metronome: metronome
    };
})();
