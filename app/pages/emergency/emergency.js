/*
 * Emergency procedures: stored on board (service worker), so they work without a link to Earth.
 * Each ticked step is saved with its UTC time; the list of steps and times is the log sent at the next contact.
 * Steps that use the medical kit say how to use it; the CPR guide has a 110-a-minute metronome and a 2-minute cycle timer.
 * #guide-<id> in the address opens that guide (the SOS dialog and "The person collapsed" link here).
 */
(function () {
    "use strict";

    var App = window.App;

    if (!App.isFlight()) {
        return; // On Earth the page only shows how to call for help
    }

    // Guides live in assets/js/guides.js (App.guides), shared with the SOS dialog and the crew alerts
    var GUIDES = App.guides.list;

    function $(selector) {
        return document.querySelector(selector);
    }

    function setText(selector, text) {
        var el = $(selector);
        if (el) {
            el.textContent = text;
        }
    }

    // Who leads right now: distance, the link with Earth and who is holding the device
    (function renderLead() {
        var mode = App.getMode();
        var isDoctor = App.getProfile().key === "doctor";
        var notice = $("[data-lead-notice]");
        var onBoard = mode.crewLeads || App.isLinkLost();
        notice.classList.toggle("notice--warn", onBoard);
        notice.classList.toggle("notice--info", !onBoard);
        notice.querySelector("use").setAttribute("href", onBoard ? "#icon-alert" : "#icon-info");

        if (App.isLinkLost()) {
            setText("[data-lead-title]", isDoctor ? "No contact with Earth: you lead" : "No contact with Earth: Dr. Okafor leads on board");
            setText("[data-lead-text]", "Start the steps now. Everything you tick is saved with the time and sent at the next contact.");
        } else if (mode.crewLeads) {
            setText("[data-lead-title]", isDoctor ? "You lead on board" : "Call Dr. Okafor and start the steps");
            setText("[data-lead-text]", "Earth is " + mode.delay + " away in each direction. Start now and send the log; do not wait for a reply.");
        } else {
            setText("[data-lead-title]", "Call the flight surgeon and start the steps");
            setText("[data-lead-text]", "The delay is " + mode.delay + ". " + (isDoctor ? "Lead on board while the flight surgeon joins." : "Dr. Okafor helps on board while the flight surgeon joins."));
        }
    })();

    // Log saved on board: { guideId: { stepIndex: "HH:MM UTC" } }, kept until cleared or sent
    var log = App.store.get("emergency-log", {});

    function save() {
        App.store.set("emergency-log", log);
    }

    function logText(guide) {
        var entries = log[guide.id] || {};
        var lines = Object.keys(entries).sort(function (a, b) {
            return a - b;
        }).map(function (index) {
            return entries[index] + " · step " + (Number(index) + 1) + " done";
        });
        return lines.length
            ? lines.join(" · ") + ". Saved on board" + (App.isLinkLost() ? ", sent at the next contact." : " and sent at the next sync.")
            : "Nothing logged yet. Tick each step as you do it.";
    }

    function progressText(guide) {
        var done = Object.keys(log[guide.id] || {}).length;
        return done ? done + " of " + guide.steps.length + " done" : "";
    }

    var list = $("[data-guide-list]");
    var template = $("[data-guide-template]");
    var items = [];

    function minutes(ms) {
        var total = Math.floor(ms / 1000);
        return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
    }

    // CPR guide: 110-a-minute beat (sound + visual) and the 2-minute cycle with a spoken reminder
    function metronomeBlock() {
        var block = document.createElement("div");
        block.className = "metronome";
        block.innerHTML =
            "<button class=\"button button--primary metronome__toggle\" type=\"button\" aria-pressed=\"false\"><span class=\"button__text\">Start the compression beat</span></button>" +
            "<span class=\"metronome__beat\" aria-hidden=\"true\"></span>" +
            "<p class=\"metronome__time\"><span class=\"metronome__label\">Time</span> <span class=\"metronome__clock\">0:00</span></p>" +
            "<p class=\"metronome__note\">110 compressions a minute, at the beat. Every 2 minutes, check breathing and swap with a crewmate if you can.</p>" +
            "<p class=\"metronome__status\" role=\"status\"></p>";
        var toggle = block.querySelector(".metronome__toggle");
        var beat = block.querySelector(".metronome__beat");
        var clock = block.querySelector(".metronome__clock");
        var status = block.querySelector(".metronome__status");
        var beats = App.guides.metronome({
            onBeat: function (count, elapsed) {
                beat.classList.toggle("metronome__beat--on", count % 2 === 0);
                clock.textContent = minutes(elapsed);
            },
            onCycle: function (cycles) {
                var text = "Two minutes. Check breathing.";
                status.textContent = cycles * 2 + " minutes: check breathing.";
                if (App.voice) {
                    App.voice.speak(text, { priority: "emergency" });
                }
            }
        });
        toggle.addEventListener("click", function () {
            var on = !beats.isRunning();
            if (on) {
                beats.start();
            } else {
                beats.stop();
            }
            toggle.setAttribute("aria-pressed", on ? "true" : "false");
            toggle.querySelector(".button__text").textContent = on ? "Stop the beat" : "Start the compression beat";
            status.textContent = on ? "Beat on: 110 a minute." : "Beat stopped at " + clock.textContent + ".";
        });
        return block;
    }

    // Opens one guide, closes the search filter if it hides it, and moves the keyboard there
    function openGuide(id) {
        var target = document.getElementById("guide-" + id);
        if (!target) {
            return;
        }
        if (target.hidden) {
            search.value = "";
            filter();
        }
        var details = target.querySelector("[data-guide-details]");
        details.open = true;
        target.scrollIntoView({ block: "start" });
        details.querySelector("summary").focus();
    }

    GUIDES.forEach(function (guide) {
        var item = template.content.firstElementChild.cloneNode(true);
        var progress = item.querySelector("[data-guide-progress]");
        var logEl = item.querySelector("[data-guide-log]");
        item.querySelector("[data-guide-title]").textContent = guide.title;
        item.querySelector("[data-guide-signs]").textContent = guide.signs;
        item.querySelector("[data-guide-escalate]").textContent = guide.escalate;
        progress.textContent = progressText(guide);
        logEl.textContent = logText(guide);

        var steps = item.querySelector("[data-guide-steps]");
        var inputs = [];
        guide.steps.forEach(function (step, index) {
            var li = document.createElement("li");
            var label = document.createElement("label");
            var input = document.createElement("input");
            var content = document.createElement("span");
            var text = document.createElement("span");
            var time = document.createElement("span");
            // Box + one text column (step, then the time it was done), so the box stays centered on the text
            label.className = "choice";
            content.className = "choice__content";
            input.className = "choice__input";
            input.type = "checkbox";
            text.className = "choice__label";
            text.textContent = (index + 1) + ". " + step;
            time.className = "guide__time";

            function render() {
                var at = log[guide.id] && log[guide.id][index];
                input.checked = Boolean(at);
                time.textContent = at ? "Done at " + at : "";
                time.hidden = !at;
                label.classList.toggle("choice--active", input.checked);
            }

            input.addEventListener("change", function () {
                log[guide.id] = log[guide.id] || {};
                if (input.checked) {
                    log[guide.id][index] = App.formatTime(new Date());
                } else {
                    delete log[guide.id][index];
                }
                save();
                render();
                progress.textContent = progressText(guide);
                logEl.textContent = logText(guide);
            });

            render();
            inputs.push(render);
            content.appendChild(text);
            content.appendChild(time);
            label.appendChild(input);
            label.appendChild(content);
            li.appendChild(label);
            // Kit items in this step: how to use them, one tap away
            App.guides.kitFor(step).forEach(function (kit) {
                var how = document.createElement("details");
                how.className = "help guide__how";
                how.innerHTML = "<summary class=\"help__summary\"><span class=\"help__label\"></span></summary><p class=\"help__text\"></p>";
                how.querySelector(".help__label").textContent = "How to use the " + kit.name.toLowerCase();
                how.querySelector(".help__text").textContent = kit.how;
                li.appendChild(how);
            });
            steps.appendChild(li);
        });

        if (guide.cpr) {
            item.querySelector(".guide__body").insertBefore(metronomeBlock(), item.querySelector("[data-guide-escalate]").parentNode);
        }
        if (guide.collapseLink) {
            var collapse = document.createElement("a");
            collapse.className = "button button--secondary guide__collapse";
            collapse.href = "#guide-collapse";
            collapse.innerHTML = "<span class=\"button__text\">The person collapsed</span>";
            collapse.addEventListener("click", function (event) {
                event.preventDefault();
                openGuide("collapse");
            });
            item.querySelector(".guide__body").insertBefore(collapse, item.querySelector("[data-guide-escalate]").parentNode);
        }
        // Why this can happen in space: the risk on the Learn page (not in the SOS dialog, to keep it focused)
        if (guide.learn) {
            var learn = document.createElement("a");
            learn.className = "guide__learn";
            learn.href = App.rootUrl("pages/learn/index.html") + "#risk-" + guide.learn;
            learn.innerHTML = "<span class=\"guide__learn-text\">Why this happens in space</span>";
            item.querySelector(".guide__body").insertBefore(learn, item.querySelector("[data-guide-log]").parentNode);
        }
        item.id = "guide-" + guide.id;

        item.querySelector("[data-guide-clear]").addEventListener("click", function () {
            delete log[guide.id];
            save();
            inputs.forEach(function (render) {
                render();
            });
            progress.textContent = progressText(guide);
            logEl.textContent = "Log cleared. " + logText(guide);
        });

        list.appendChild(item);
        items.push({ guide: guide, el: item });
    });

    // Search by symptom: filters the list as you type
    var search = $("[data-guide-search]");
    var count = $("[data-guide-count]");

    function filter() {
        var words = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
        var shown = 0;
        items.forEach(function (entry) {
            var haystack = (entry.guide.title + " " + entry.guide.signs + " " + entry.guide.keywords).toLowerCase();
            var match = words.every(function (word) {
                return haystack.indexOf(word) !== -1;
            });
            entry.el.hidden = !match;
            if (match) {
                shown += 1;
            }
        });
        $("[data-guide-empty]").hidden = shown !== 0;
        count.textContent = words.length
            ? shown + (shown === 1 ? " procedure matches" : " procedures match") + " “" + search.value.trim() + "”"
            : GUIDES.length + " procedures";
    }

    search.addEventListener("input", filter);
    filter();

    // #guide-<id> opens that guide (from the SOS dialog, a crew alert or "The person collapsed")
    function openFromHash() {
        var match = /^#guide-([a-z-]+)$/.exec(window.location.hash);
        if (match) {
            openGuide(match[1]);
        }
    }
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
})();
