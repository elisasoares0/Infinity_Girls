/*
 * "Ask the assistant" (App.assistant), on every page. A local search over what the app already says: the emergency
 * guides and the medical kit (in flight), what each indicator means, the Learn page risks of this phase and how to
 * use the app. It never writes new text: every answer is a passage quoted word for word, with its source and link,
 * and the same question always gives the same answer. Works offline (the Learn page is kept by the service worker).
 * Safety rule (CLAUDE.md): no language model decides anything; "Not a medical device" is always on screen, and an
 * emergency question in flight offers SOS first.
 *   App.assistant.ask(question) → Promise<{ answers: [{ title, source, text, href }], emergency }>
 *   App.assistant.open(opener)
 * Search: BM25 over word stems, with a small synonym list (sugar → glucose, faint → collapse…).
 */
(function () {
    "use strict";

    var App = window.App;
    var MIN_SCORE = 1.2;

    var STOP = ("a an and are as at be but by can do does for from how i if in into is it its me my of on or our so " +
        "that the their them then there these they this to was we what when where which who why will with you your " +
        "should would could am have has had get got about any some need").split(" ");

    var SYNONYMS = {
        sugar: ["glucose"], glycemia: ["glucose"], hypoglycemia: ["glucose", "low"], diabet: ["glucose"],
        faint: ["collapse", "respond"], fainted: ["collapse", "respond"], unconscious: ["collapse", "respond"], passed: ["collapse"],
        breath: ["breathing"], breathe: ["breathing"], oxygen: ["spo2", "oxygen"], saturation: ["spo2"],
        pulse: ["heart"], heartbeat: ["heart"], bp: ["pressure"], clot: ["ultrasound", "vein"], vein: ["ultrasound"],
        blurry: ["vision", "sans"], blur: ["vision", "sans"], eye: ["vision", "sans"], eyes: ["vision", "sans"],
        tired: ["sleep"], insomnia: ["sleep"], nap: ["sleep"], drink: ["hydration", "water"], water: ["hydration"],
        thirsty: ["hydration"], fever: ["temperature", "fever"], hot: ["temperature"], sad: ["mood"], anxious: ["stress"],
        stressed: ["stress"], lonely: ["isolation", "mood"], storm: ["radiation", "shelter"], solar: ["radiation"],
        workout: ["exercise"], gym: ["exercise"], treadmill: ["exercise"], bones: ["bone"], dizzy: ["balance", "sensorimotor"],
        nausea: ["motion", "sickness"], spacewalk: ["eva", "spacewalk"], suit: ["eva", "suit"], dust: ["dust"],
        notification: ["reminder", "notification"], remind: ["reminder"], alarm: ["reminder"], goal: ["goal"], streak: ["goal", "streak"]
    };

    // How to use the app: short passages in the app's own words
    var APP_HELP = [
        { title: "Reminders", text: "At the time of each health task, a reminder shows above the tab bar with Done, In 15 min and Open. In Profile, Reminders, you can have them spoken out loud and turn on device notifications.", href: "pages/profile/index.html" },
        { title: "Daily goals and achievements", text: "Four goals a day: water, exercise, sleep and the check-in. A day counts toward your streak when all four are met. Only you see your goals and achievements.", href: "index.html#goals", profiles: "female male" },
        { title: "Daily check-in", text: "One tap for mood and one for stress, with an optional private note. Only your medical team sees it. Open it from the Mood check-in task or Check in now in Daily goals.", href: "index.html#goals", profiles: "female male" },
        { title: "Measure blood glucose", text: "On Home, Blood glucose, press Measure now: follow the steps, then connect the glucometer by Bluetooth or type the number in mg/dL or mmol/L.", href: "index.html", profiles: "female male" },
        { title: "Neck vein ultrasound", text: "Once a week, in flight: on the Body page press Start guided exam, follow the steps and send the image. The medical team reads it; the app never gives a diagnosis.", href: "pages/body/index.html#ultrasound", phases: "in", profiles: "female male" },
        { title: "Who sees my data", text: "On the Privacy page you choose who sees each kind of health data. Private medical conferences stay between you and your flight surgeon.", href: "pages/privacy/index.html", profiles: "female male" },
        { title: "SOS and emergencies", text: "In flight, the red SOS button in the header alerts the crew with your location, says your vital signs out loud and shows the guide one step at a time.", href: "pages/emergency/index.html", phases: "in" }
    ];

    // Questions that need SOS first, not an answer (in flight): which emergency scenario to start
    var EMERGENCIES = [
        { pattern: /not breathing|stopped breathing|no breath|unconscious|not respond|collapsed|passed out|cardiac arrest/, scenario: "collapse", guide: "collapse" },
        { pattern: /chest pain|chest pressure|heart attack|crushing/, scenario: "chest-pain", guide: "chest" },
        { pattern: /can.?t breathe|cannot breathe|choking|short of breath/, scenario: "low-oxygen", guide: "breathing" },
        { pattern: /(very )?low (blood )?(sugar|glucose)|hypoglyc/, scenario: "low-glucose", guide: "glucose" },
        { pattern: /bleeding (a lot|heavily|badly)|heavy bleeding|severe bleeding/, scenario: "manual", guide: "bleeding" }
    ];

    function stem(word) {
        if (word.length > 5 && /ies$/.test(word)) {
            return word.slice(0, -3) + "y";
        }
        if (word.length > 5 && /ing$/.test(word)) {
            return word.slice(0, -3);
        }
        if (word.length > 4 && /ed$/.test(word)) {
            return word.slice(0, -2);
        }
        if (word.length > 3 && /s$/.test(word) && !/ss$/.test(word)) {
            return word.slice(0, -1);
        }
        return word;
    }

    function tokens(text) {
        return String(text).toLowerCase().replace(/spo₂/g, "spo2").split(/[^a-z0-9₂]+/).filter(function (word) {
            return word.length > 1 && STOP.indexOf(word) === -1;
        }).map(stem);
    }

    function expand(words) {
        var all = words.slice();
        words.forEach(function (word) {
            Object.keys(SYNONYMS).forEach(function (key) {
                if (stem(key) === word) {
                    SYNONYMS[key].forEach(function (extra) {
                        all.push(stem(extra));
                    });
                }
            });
        });
        return all;
    }

    /* ---------- The knowledge: only what the app already shows, for this phase and profile ---------- */
    var index = null;

    function visible(entry) {
        var phase = App.getPhase().key;
        var profile = App.getProfile().key;
        return (!entry.phases || entry.phases.split(" ").indexOf(phase) !== -1) &&
            (!entry.profiles || entry.profiles.split(" ").indexOf(profile) !== -1);
    }

    function fromLearn() {
        return fetch(App.rootUrl("pages/learn/index.html")).then(function (response) {
            return response.ok ? response.text() : "";
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, "text/html");
            var phase = App.getPhase().key;
            var passages = [];
            doc.querySelectorAll("section[data-phases]").forEach(function (section) {
                if (section.getAttribute("data-phases").split(" ").indexOf(phase) === -1) {
                    return;
                }
                section.querySelectorAll(".risk").forEach(function (risk) {
                    var name = risk.querySelector(".risk__name");
                    var text = Array.prototype.map.call(risk.querySelectorAll(".risk__row"), function (row) {
                        return row.querySelector(".risk__label").textContent + ": " + row.querySelector(".risk__text").textContent;
                    }).join(" ");
                    passages.push({
                        title: name ? name.textContent.trim() : "Health risk",
                        source: "Learn",
                        text: text,
                        href: App.rootUrl("pages/learn/index.html") + "#risk-" + risk.getAttribute("data-risk")
                    });
                });
            });
            return passages;
        }).catch(function () {
            return [];
        });
    }

    function build() {
        var passages = [];
        var flight = App.isFlight();
        // Emergency guides and the kit are flight procedures: only in flight
        if (flight && App.guides) {
            App.guides.list.forEach(function (guide) {
                passages.push({
                    title: guide.title, source: "Emergency guide", guide: guide.id,
                    text: guide.signs + " " + guide.steps.join(" ") + " Escalate if: " + guide.escalate,
                    href: App.rootUrl("pages/emergency/index.html") + "#guide-" + guide.id
                });
            });
            Object.keys(App.guides.kit).forEach(function (key) {
                var item = App.guides.kit[key];
                passages.push({ title: item.name, source: "Medical kit", text: item.how, href: App.rootUrl("pages/emergency/index.html") });
            });
        }
        if (App.healthKeys) {
            App.healthKeys().forEach(function (key) {
                var info = App.healthInfo(key);
                var metric = App.crew.getMetric(key);
                var outOfRange = key === "glucose"
                    ? "If it is low: " + App.healthAdvice(key, "warn", 0) + " If it is high: " + App.healthAdvice(key, "warn", 999)
                    : "If it is out of range: " + App.healthAdvice(key, "warn");
                passages.push({
                    title: metric ? metric.label : key, source: "Indicator",
                    text: "How it is measured: " + info.how + " Why it matters: " + info.why + " " + outOfRange,
                    href: App.rootUrl(App.getProfile().key === "doctor" ? "index.html#crew" : "pages/vitals/index.html")
                });
            });
        }
        APP_HELP.filter(visible).forEach(function (entry) {
            passages.push({ title: entry.title, source: "Using the app", text: entry.text, href: App.rootUrl(entry.href) });
        });
        return fromLearn().then(function (learn) {
            passages = passages.concat(learn);
            // BM25 statistics; the title counts twice
            var docs = passages.map(function (passage) {
                var words = tokens(passage.title).concat(tokens(passage.title), tokens(passage.text));
                var counts = {};
                words.forEach(function (word) {
                    counts[word] = (counts[word] || 0) + 1;
                });
                return { passage: passage, counts: counts, length: words.length };
            });
            var df = {};
            docs.forEach(function (doc) {
                Object.keys(doc.counts).forEach(function (word) {
                    df[word] = (df[word] || 0) + 1;
                });
            });
            var avg = docs.reduce(function (sum, doc) {
                return sum + doc.length;
            }, 0) / Math.max(1, docs.length);
            return { docs: docs, df: df, avg: avg };
        });
    }

    // A passage must cover at least half of the question's words (a word counts when it or a synonym is there)
    var MIN_COVERAGE = 0.5;

    function search(data, question) {
        var original = tokens(question).filter(function (word, position, all) {
            return all.indexOf(word) === position;
        });
        var groups = original.map(function (word) {
            return expand([word]);
        });
        var query = expand(tokens(question));
        var unique = query.filter(function (word, position) {
            return query.indexOf(word) === position;
        });
        var k1 = 1.2;
        var b = 0.75;
        var n = data.docs.length;
        return data.docs.map(function (doc) {
            var score = 0;
            unique.forEach(function (word) {
                var tf = doc.counts[word] || 0;
                if (!tf) {
                    return;
                }
                var idf = Math.log(1 + (n - data.df[word] + 0.5) / (data.df[word] + 0.5));
                score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * doc.length / data.avg));
            });
            var covered = groups.filter(function (group) {
                return group.some(function (word) {
                    return doc.counts[word];
                });
            }).length;
            return { passage: doc.passage, score: score, coverage: groups.length ? covered / groups.length : 0 };
        }).filter(function (item) {
            return item.score >= MIN_SCORE && item.coverage >= MIN_COVERAGE;
        }).sort(function (a, b) {
            return b.score - a.score || (a.passage.title < b.passage.title ? -1 : 1);
        });
    }

    function ask(question) {
        if (!index) {
            index = build();
        }
        var text = String(question || "").toLowerCase();
        var emergency = null;
        if (App.isFlight()) {
            emergency = EMERGENCIES.filter(function (item) {
                return item.pattern.test(text);
            })[0] || null;
        }
        return index.then(function (data) {
            var results = search(data, question).slice(0, 3).map(function (item) {
                return item.passage;
            });
            // The guide of an emergency question goes first
            if (emergency) {
                var guide = data.docs.filter(function (doc) {
                    return doc.passage.guide === emergency.guide;
                })[0];
                if (guide) {
                    results = [guide.passage].concat(results.filter(function (passage) {
                        return passage !== guide.passage;
                    })).slice(0, 3);
                }
            }
            return { answers: results, emergency: emergency, terms: expand(tokens(question)) };
        });
    }

    /* ---------- Dialog ---------- */
    var dialog = null;
    var opener = null;
    var lastAnswer = "";
    var SUGGESTIONS = {
        in: ["My blood sugar is low", "How is heart rate measured?", "Why is my vision blurry?", "What do I do in a solar storm?", "How do I do the neck ultrasound?"],
        earth: ["Why do I need a bone scan?", "How do I turn on reminders?", "Why does sleep matter?", "How do I check in?"]
    };

    // Writes text with the query's words marked, without HTML injection
    function markText(target, text, terms) {
        target.textContent = "";
        String(text).split(/(\s+)/).forEach(function (part) {
            var clean = stem(part.toLowerCase().replace(/[^a-z0-9₂]/g, ""));
            if (clean.length > 2 && terms.indexOf(clean) !== -1) {
                var mark = document.createElement("mark");
                mark.className = "ask__mark";
                mark.textContent = part;
                target.appendChild(mark);
            } else {
                target.appendChild(document.createTextNode(part));
            }
        });
    }

    function render(result, question) {
        var box = dialog.querySelector("[data-ask-answer]");
        box.textContent = "";
        var heading = document.createElement("h3");
        heading.className = "ask__question";
        heading.textContent = "“" + question + "”";
        box.appendChild(heading);

        if (result.emergency) {
            var urgent = document.createElement("div");
            urgent.className = "notice notice--danger ask__urgent";
            urgent.innerHTML = "<svg class=\"notice__icon\" aria-hidden=\"true\"><use href=\"#icon-alert\"/></svg><div class=\"notice__text\"><p class=\"notice__title\">This sounds like an emergency.</p><p>Start SOS: the crew gets your location and the voice guides you step by step.</p></div>";
            var sos = document.createElement("button");
            sos.type = "button";
            sos.className = "button button--primary ask__sos";
            sos.innerHTML = "<span class=\"button__text\">Start SOS</span>";
            sos.addEventListener("click", function () {
                dialog.close();
                App.emergency.start(result.emergency.scenario, "assistant");
            });
            urgent.querySelector(".notice__text").appendChild(sos);
            box.appendChild(urgent);
        }

        if (!result.answers.length) {
            var none = document.createElement("p");
            none.className = "ask__none";
            none.textContent = "I could not find this in the guides of this app. Ask your " + (App.isFlight() ? "crew medical officer" : "flight surgeon") + ".";
            box.appendChild(none);
            lastAnswer = none.textContent;
            return;
        }

        result.answers.forEach(function (passage, position) {
            var card = document.createElement("article");
            card.className = "ask__result" + (position === 0 ? " ask__result--main" : "");
            card.innerHTML = "<p class=\"ask__source\"></p><h4 class=\"ask__title\"></h4><p class=\"ask__text\"></p>" +
                "<a class=\"button button--tertiary button--flush ask__link\"><span class=\"button__text\"></span></a>";
            card.querySelector(".ask__source").textContent = (position === 0 ? "Best match · " : "Related · ") + "From " + passage.source;
            card.querySelector(".ask__title").textContent = passage.title;
            var text = position === 0 ? passage.text : passage.text.split(/(?<=\.)\s/)[0];
            markText(card.querySelector(".ask__text"), text, result.terms);
            var link = card.querySelector(".ask__link");
            link.href = passage.href;
            link.querySelector(".button__text").textContent = "Open " + passage.title;
            box.appendChild(card);
        });
        lastAnswer = result.answers[0].title + ". " + result.answers[0].text;
        dialog.querySelector("[data-ask-speak]").hidden = !(App.voice && App.voice.isSupported());
    }

    function submit(question) {
        var clean = String(question || "").trim();
        var status = dialog.querySelector("[data-ask-status]");
        if (!clean) {
            status.textContent = "Type or say a question first.";
            dialog.querySelector("#ask-question").focus();
            return Promise.resolve();
        }
        status.textContent = "Searching the guides…";
        return ask(clean).then(function (result) {
            render(result, clean);
            status.textContent = result.answers.length
                ? "Found " + result.answers.length + (result.answers.length === 1 ? " answer" : " answers") + " from the app's guides."
                : "No answer in the guides.";
        });
    }

    function buildDialog() {
        dialog = document.createElement("dialog");
        dialog.className = "ask";
        dialog.setAttribute("aria-labelledby", "ask-title");
        dialog.innerHTML =
            "<div class=\"ask__container\">" +
            "<div class=\"ask__head\"><div class=\"ask__heading\">" +
            "<h2 class=\"ask__heading-title\" id=\"ask-title\">Ask the assistant</h2>" +
            "<p class=\"ask__subtitle\">Answers come only from the guides in this app, with their source. It works offline.</p></div>" +
            "<button class=\"ask__close\" type=\"button\" aria-label=\"Close\"><svg class=\"ask__close-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></button></div>" +
            "<form class=\"ask__form\" role=\"search\" novalidate>" +
            "<label class=\"field__label\" for=\"ask-question\">Your question</label>" +
            "<div class=\"ask__row\"><input class=\"field__input ask__input\" id=\"ask-question\" type=\"text\" autocomplete=\"off\" enterkeyhint=\"search\">" +
            "<button class=\"ask__mic\" type=\"button\" aria-label=\"Ask by voice\" aria-pressed=\"false\" hidden data-ask-mic><svg class=\"ask__mic-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21\"/></svg></button>" +
            "<button class=\"button button--primary ask__submit\" type=\"submit\"><span class=\"button__text\">Ask</span></button></div>" +
            "</form>" +
            "<div class=\"ask__chips\" role=\"group\" aria-label=\"Example questions\"></div>" +
            "<p class=\"ask__status\" role=\"status\" data-ask-status></p>" +
            "<div class=\"ask__answer\" data-ask-answer></div>" +
            "<button class=\"button button--secondary ask__speak\" type=\"button\" hidden data-ask-speak><span class=\"button__text\">Read the answer aloud</span></button>" +
            "<p class=\"ask__disclaimer\"></p>" +
            "</div>";
        document.body.appendChild(dialog);
        dialog.querySelector(".ask__disclaimer").textContent = "Not a medical device. " + (App.isFlight()
            ? "In an emergency, press SOS."
            : "In an emergency, call your flight surgeon or the local emergency number.");

        var input = dialog.querySelector("#ask-question");
        var chips = dialog.querySelector(".ask__chips");
        SUGGESTIONS[App.isFlight() ? "in" : "earth"].forEach(function (text) {
            var chip = document.createElement("button");
            chip.type = "button";
            chip.className = "ask__chip";
            chip.textContent = text;
            chip.addEventListener("click", function () {
                input.value = text;
                submit(text);
            });
            chips.appendChild(chip);
        });

        dialog.querySelector(".ask__form").addEventListener("submit", function (event) {
            event.preventDefault();
            submit(input.value);
        });

        dialog.querySelector("[data-ask-speak]").addEventListener("click", function () {
            App.voice.speak(lastAnswer, { priority: "info" });
        });

        // Voice question: one phrase, only where the browser recognizes speech (it needs a connection)
        var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        var mic = dialog.querySelector("[data-ask-mic]");
        if (Recognition && navigator.onLine !== false) {
            mic.hidden = false;
            mic.addEventListener("click", function () {
                var recognizer = new Recognition();
                recognizer.lang = "en-US";
                recognizer.interimResults = false;
                mic.setAttribute("aria-pressed", "true");
                dialog.querySelector("[data-ask-status]").textContent = "Listening…";
                recognizer.onresult = function (event) {
                    input.value = event.results[0][0].transcript;
                    submit(input.value);
                };
                recognizer.onend = function () {
                    mic.setAttribute("aria-pressed", "false");
                };
                recognizer.onerror = function () {
                    dialog.querySelector("[data-ask-status]").textContent = "Could not hear the question. Type it instead.";
                };
                try {
                    recognizer.start();
                } catch (error) {
                    mic.setAttribute("aria-pressed", "false");
                }
            });
        }

        dialog.querySelector(".ask__close").addEventListener("click", function () {
            dialog.close();
        });
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) {
                dialog.close();
            }
        });
        dialog.addEventListener("close", function () {
            if (opener && document.contains(opener)) {
                opener.focus();
            }
        });
    }

    function open(from) {
        if (!dialog) {
            buildDialog();
        }
        opener = from || document.activeElement;
        dialog.showModal();
        dialog.querySelector("#ask-question").focus();
        if (!index) {
            index = build();
        }
    }

    App.assistant = { ask: ask, open: open };

    var toggle = document.querySelector("[data-ask-open]");
    if (toggle) {
        toggle.hidden = !App.getSession();
        toggle.addEventListener("click", function () {
            open(toggle);
        });
    }
})();
