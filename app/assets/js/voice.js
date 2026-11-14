/*
 * Voice assistant (App.voice): speaks with the device's own voices (speechSynthesis, free and offline)
 * and always shows the same words as a caption, so the voice is never the only channel.
 *   App.voice.speak(text, { priority: "emergency" | "info" })   emergency interrupts everything else
 *   App.voice.stop() / repeat() / isOn() / setOn(bool) / setRate(n) / canSpeak()
 *   App.voice.listen(commands)   optional voice commands ("next", "repeat", "help") when the browser has them
 * Browsers only speak after a tap on the page: until then, canSpeak() is false and the alert shows "Tap to hear".
 * What it says always comes from the guides and the measured values (assets/js/guides.js): it never makes up advice.
 */
(function () {
    "use strict";

    var App = window.App;
    var synth = window.speechSynthesis || null;
    var settings = App.store.get("voice", { on: true, rate: 1 });
    var queue = [];
    var speaking = null;
    var last = "";
    var activated = false;
    var caption = null;
    var captionText = null;
    var hideTimer = null;

    // Any tap or key press on the page lets the browser speak from then on
    function markActivated() {
        activated = true;
        document.dispatchEvent(new CustomEvent("voice:ready"));
    }
    ["pointerdown", "keydown"].forEach(function (type) {
        document.addEventListener(type, markActivated, { once: true, capture: true });
    });

    function englishVoice() {
        if (!synth) {
            return null;
        }
        var voices = synth.getVoices();
        return voices.filter(function (voice) {
            return /^en-US/i.test(voice.lang) && voice.localService;
        })[0] || voices.filter(function (voice) {
            return /^en-US/i.test(voice.lang);
        })[0] || voices.filter(function (voice) {
            return /^en/i.test(voice.lang);
        })[0] || null;
    }

    function showCaption(text, priority) {
        caption = caption || document.querySelector("[data-voice-caption]");
        if (!caption) {
            return;
        }
        captionText = captionText || caption.querySelector("[data-voice-caption-text]");
        // Sit just above the tab bar (a bar at the bottom on phones, a floating pill on large screens)
        var tabBar = document.querySelector(".tab-bar");
        var rect = tabBar && !tabBar.hidden ? tabBar.getBoundingClientRect() : null;
        var bottom = rect && rect.height ? Math.max(0, window.innerHeight - rect.top) : 0;
        caption.style.setProperty("--caption-bottom", Math.round(bottom) + "px");
        caption.classList.toggle("voice-caption--emergency", priority === "emergency");
        captionText.setAttribute("aria-live", priority === "emergency" ? "assertive" : "polite");
        captionText.textContent = text;
        caption.hidden = false;
        window.clearTimeout(hideTimer);
    }

    // The caption stays a few seconds after the voice ends (longer in an emergency)
    function scheduleHide(priority) {
        window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(function () {
            if (caption && !speaking && !queue.length) {
                caption.hidden = true;
            }
        }, priority === "emergency" ? 12000 : 6000);
    }

    function next() {
        if (speaking || !queue.length) {
            return;
        }
        var item = queue.shift();
        speaking = item;
        last = item.text;
        showCaption(item.text, item.priority);
        if (!synth || !settings.on) {
            speaking = null;
            scheduleHide(item.priority);
            next();
            return;
        }
        var utterance = new SpeechSynthesisUtterance(item.text);
        var voice = englishVoice();
        if (voice) {
            utterance.voice = voice;
        }
        utterance.lang = voice ? voice.lang : "en-US";
        utterance.rate = settings.rate || 1;
        // Some browsers never fire "end" (or cut long phrases): a watchdog keeps the queue moving
        var finished = false;
        var watchdog = null;
        function done() {
            if (finished) {
                return;
            }
            finished = true;
            window.clearTimeout(watchdog);
            if (speaking === item) {
                speaking = null;
            }
            scheduleHide(item.priority);
            next();
        }
        utterance.onend = utterance.onerror = done;
        watchdog = window.setTimeout(done, 1500 + item.text.length * 90 / (settings.rate || 1));
        synth.speak(utterance);
    }

    function speak(text, options) {
        var priority = (options && options.priority) || "info";
        if (!text) {
            return;
        }
        if (priority === "emergency" && (options === undefined || options.interrupt !== false)) {
            // An emergency takes over: drop what was waiting and cut what is being said
            queue = queue.filter(function (item) {
                return item.priority === "emergency";
            });
            if (speaking && speaking.priority !== "emergency" && synth) {
                speaking = null;
                synth.cancel();
            }
        }
        queue.push({ text: text, priority: priority });
        next();
    }

    function stop() {
        queue = [];
        speaking = null;
        if (synth) {
            synth.cancel();
        }
        if (caption) {
            caption.hidden = true;
        }
    }

    function save() {
        App.store.set("voice", settings);
    }

    /*
     * Voice commands, only where the browser offers speech recognition (in Chrome it needs a connection).
     * commands: { next: fn, repeat: fn, help: fn }. Returns a stop function, or null when not available.
     */
    function listen(commands) {
        var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition || navigator.onLine === false) {
            return null;
        }
        var recognizer = new Recognition();
        var stopped = false;
        recognizer.lang = "en-US";
        recognizer.continuous = true;
        recognizer.interimResults = false;
        recognizer.onresult = function (event) {
            var said = event.results[event.results.length - 1][0].transcript.toLowerCase();
            Object.keys(commands).forEach(function (word) {
                if (said.indexOf(word) !== -1) {
                    commands[word]();
                }
            });
        };
        recognizer.onend = function () {
            if (!stopped) {
                try {
                    recognizer.start();
                } catch (error) {
                    stopped = true;
                }
            }
        };
        try {
            recognizer.start();
        } catch (error) {
            return null;
        }
        return function () {
            stopped = true;
            recognizer.stop();
        };
    }

    // Some browsers load their voice list late
    if (synth && typeof synth.addEventListener === "function") {
        synth.addEventListener("voiceschanged", englishVoice);
    }

    App.voice = {
        speak: speak,
        stop: stop,
        repeat: function () {
            if (last) {
                speak(last, { priority: "emergency" });
            }
        },
        isOn: function () {
            return settings.on !== false;
        },
        setOn: function (on) {
            settings.on = Boolean(on);
            save();
            if (!on && synth) {
                synth.cancel();
            }
        },
        rate: function () {
            return settings.rate || 1;
        },
        setRate: function (rate) {
            settings.rate = Math.min(1.5, Math.max(0.7, Number(rate) || 1));
            save();
        },
        canSpeak: function () {
            return Boolean(synth) && settings.on !== false && activated;
        },
        isSupported: function () {
            return Boolean(synth);
        },
        canListen: function () {
            return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition) && navigator.onLine !== false;
        },
        listen: listen,
        lastText: function () {
            return last;
        }
    };
})();
