/*
 * Daily goals on the astronaut Home (assets/js/goals.js): a ring of four goals with a text list beside it,
 * the streak with the last 7 days, private achievements, a short celebration when all four are met, and the
 * daily check-in dialog (avaliacoes_diarias). The ring is decorative (aria-hidden): the list says it all in text.
 */
(function () {
    "use strict";

    var App = window.App;
    var section = document.querySelector(".goals");
    var profile = App.getProfile();
    if (!section || !App.getSession() || (profile.key !== "female" && profile.key !== "male")) {
        return;
    }
    var member = profile.member;
    var SVG_NS = "http://www.w3.org/2000/svg";
    var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var ICONS = {
        water: "<path d=\"M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z\"/>",
        exercise: "<path d=\"M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11\"/>",
        sleep: "<path d=\"M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z\"/>",
        checkin: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9 10v.1M15 10v.1\"/><path d=\"M8.5 14c1 1.7 2.2 2.4 3.5 2.4s2.5-.7 3.5-2.4\"/>",
        badge: "<path d=\"M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z\"/>",
        lock: "<rect x=\"5\" y=\"11\" width=\"14\" height=\"9\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 0 1 8 0v3\"/>",
        check: "<path d=\"M5 12.5l4.5 4.5L19 7.5\"/>"
    };
    var lastSaved = "";
    var lastMet = null;
    var live = section.querySelector("[data-goals-live]");

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function icon(name, className) {
        return "<svg class=\"" + className + "\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">" + ICONS[name] + "</svg>";
    }

    /* ---------- Ring: one quarter per goal, a track and a fill as long as the progress ---------- */
    function arcPath(startDeg, endDeg) {
        var r = 48;
        var toXY = function (deg) {
            var rad = (deg - 90) * Math.PI / 180;
            return (60 + r * Math.cos(rad)).toFixed(2) + " " + (60 + r * Math.sin(rad)).toFixed(2);
        };
        var large = endDeg - startDeg > 180 ? 1 : 0;
        return "M " + toXY(startDeg) + " A " + r + " " + r + " 0 " + large + " 1 " + toXY(endDeg);
    }

    function drawRing(goals) {
        var svg = $("[data-goals-ring]", section);
        svg.textContent = "";
        var gap = 10;
        goals.forEach(function (goal, index) {
            var start = index * 90 + gap / 2;
            var end = start + 90 - gap;
            var track = document.createElementNS(SVG_NS, "path");
            track.setAttribute("class", "goals__arc");
            track.setAttribute("d", arcPath(start, end));
            svg.appendChild(track);
            if (goal.progress > 0) {
                var fill = document.createElementNS(SVG_NS, "path");
                fill.setAttribute("class", "goals__arc goals__arc--fill");
                fill.setAttribute("d", arcPath(start, start + Math.max(2, (end - start) * goal.progress)));
                var title = document.createElementNS(SVG_NS, "title");
                title.textContent = goal.label + ": " + goal.text;
                fill.appendChild(title);
                svg.appendChild(fill);
            }
        });
    }

    function renderList(goals) {
        var list = $("[data-goals-list]", section);
        list.textContent = "";
        goals.forEach(function (goal) {
            var li = document.createElement("li");
            li.className = "goals__item" + (goal.met ? " goals__item--met" : "");
            li.innerHTML = icon(goal.key, "goals__item-icon") +
                "<span class=\"goals__item-text\"><span class=\"goals__item-name\"></span><span class=\"goals__item-value\"></span></span>" +
                "<span class=\"badge badge--" + (goal.met ? "ok" : "soon") + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" + (goal.met ? "#icon-check" : "#icon-info") + "\"/></svg><span class=\"badge__text\">" + (goal.met ? "Met" : "To do") + "</span></span>";
            li.querySelector(".goals__item-name").textContent = goal.label;
            li.querySelector(".goals__item-value").textContent = goal.text;
            list.appendChild(li);
        });
    }

    function renderWeek() {
        var week = $("[data-goals-week]", section);
        week.textContent = "";
        App.goals.days(7).forEach(function (day, index, all) {
            var met = ["water", "exercise", "sleep", "checkin"].filter(function (key) {
                return day.met[key];
            }).length;
            var isToday = index === all.length - 1;
            var li = document.createElement("li");
            li.className = "goals__day" + (day.all ? " goals__day--done" : "");
            li.innerHTML = "<span class=\"goals__day-name\"></span>" +
                (day.all ? icon("check", "goals__day-mark") : "<span class=\"goals__day-count\" aria-hidden=\"true\"></span>") +
                "<span class=\"sr-only\"></span>";
            li.querySelector(".goals__day-name").textContent = isToday ? "Today" : WEEKDAYS[day.date.getUTCDay()];
            if (!day.all) {
                li.querySelector(".goals__day-count").textContent = met + "/4";
            }
            li.querySelector(".sr-only").textContent = ": " + (day.all ? "all four goals" : met + " of 4 goals");
            week.appendChild(li);
        });
    }

    function renderBadges() {
        var shelf = $("[data-goals-badges]", section);
        shelf.textContent = "";
        App.goals.achievements().forEach(function (item) {
            var li = document.createElement("li");
            li.className = "goals__badge" + (item.unlocked ? " goals__badge--unlocked" : "");
            li.innerHTML = "<span class=\"goals__badge-medal" + (item.unlocked ? " goals__badge-medal--unlocked" : "") + "\">" + icon(item.unlocked ? "badge" : "lock", "goals__badge-icon") + "</span>" +
                "<span class=\"goals__badge-text\"><span class=\"goals__badge-name\"></span><span class=\"goals__badge-how\"></span>" +
                "<span class=\"goals__badge-bar\" aria-hidden=\"true\"><span class=\"goals__badge-fill\"></span></span>" +
                "<span class=\"goals__badge-progress\"></span></span>";
            li.querySelector(".goals__badge-name").textContent = item.name;
            li.querySelector(".goals__badge-how").textContent = item.how;
            li.querySelector(".goals__badge-progress").textContent = item.text;
            li.querySelector(".goals__badge-fill").style.setProperty("--progress", String(item.progress));
            shelf.appendChild(li);
        });
    }

    // All four goals: a short burst of confetti (only transform and opacity) and a spoken-friendly message
    function celebrate(streak) {
        live.textContent = "All four goals done today. Streak: " + streak + (streak === 1 ? " day." : " days.");
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var confetti = $("[data-goals-confetti]", section);
        if (reduce || !confetti) {
            return;
        }
        confetti.textContent = "";
        for (var i = 0; i < 28; i++) {
            var piece = document.createElement("span");
            piece.className = "goals__piece goals__piece--" + (i % 3 + 1);
            piece.style.setProperty("--x", (Math.round(((i * 37) % 100))) + "%");
            piece.style.setProperty("--delay", ((i % 7) * 60) + "ms");
            piece.style.setProperty("--turn", ((i * 53) % 360) + "deg");
            confetti.appendChild(piece);
        }
        confetti.hidden = false;
        window.setTimeout(function () {
            confetti.hidden = true;
            confetti.textContent = "";
        }, 1900);
    }

    function render() {
        var state = App.goals.today();
        $("[data-goals-met]", section).textContent = state.met;
        drawRing(state.goals);
        renderList(state.goals);
        $("[data-goals-streak]", section).textContent = state.streak;
        $("[data-goals-streak-unit]", section).textContent = state.streak === 1 ? "day" : "days";
        renderWeek();
        renderBadges();
        var checkin = state.goals[3];
        $("[data-checkin-open] .button__text", section).textContent = checkin.met ? "Edit today's check-in" : "Check in now";

        var signature = JSON.stringify(state.goals.map(function (goal) {
            return goal.met;
        })) + state.waterMl + state.streak;
        if (signature !== lastSaved) {
            lastSaved = signature;
            App.goals.save();
        }
        // Celebrate once a day, when the fourth goal closes while the app is open
        var key = "goals-celebrated:" + member;
        if (lastMet !== null && lastMet < 4 && state.met === 4 && App.store.get(key, null) !== App.todayKey()) {
            App.store.set(key, App.todayKey());
            celebrate(state.streak);
        }
        lastMet = state.met;
    }

    /* ---------- Daily check-in (avaliacoes_diarias) ---------- */
    var dialog = document.querySelector("[data-checkin]");
    var form = $("[data-checkin-form]", dialog);
    var opener = null;

    function syncOptions() {
        dialog.querySelectorAll(".checkin__option").forEach(function (option) {
            option.classList.toggle("checkin__option--checked", option.querySelector("input").checked);
        });
    }

    function openCheckin(from) {
        opener = from || document.activeElement;
        var saved = App.records.list("avaliacoes_diarias", { usuario_id: member }).filter(function (row) {
            return row.data_registro === App.todayKey();
        })[0];
        form.reset();
        if (saved) {
            var mood = form.querySelector("input[name='mood'][value='" + saved.humor_escala + "']");
            var stress = form.querySelector("input[name='stress'][value='" + saved.estresse_escala + "']");
            if (mood) {
                mood.checked = true;
            }
            if (stress) {
                stress.checked = true;
            }
            $("[data-checkin-note]", dialog).value = saved.notas_privadas || "";
        }
        $("[data-checkin-error]", dialog).hidden = true;
        syncOptions();
        dialog.showModal();
        var first = form.querySelector("input[name='mood']:checked") || form.querySelector("input[name='mood']");
        first.focus();
    }

    form.addEventListener("change", syncOptions);
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        var mood = form.querySelector("input[name='mood']:checked");
        var stress = form.querySelector("input[name='stress']:checked");
        var error = $("[data-checkin-error]", dialog);
        if (!mood || !stress) {
            error.textContent = !mood ? "Choose how your mood is today." : "Choose how stressed you feel.";
            error.hidden = false;
            (!mood ? form.querySelector("input[name='mood']") : form.querySelector("input[name='stress']")).focus();
            return;
        }
        var note = $("[data-checkin-note]", dialog).value.trim();
        App.records.upsert("avaliacoes_diarias", {
            usuario_id: member,
            data_registro: App.todayKey(),
            humor_escala: Number(mood.value),
            estresse_escala: Number(stress.value),
            notas_privadas: note || null
        }, ["usuario_id", "data_registro"]);
        // The check-in task ticks itself
        var saved = App.store.get("tasks:" + member, null);
        var done = saved && saved.date === App.todayKey() && Array.isArray(saved.done) ? saved.done : [];
        if (done.indexOf("checkin") === -1) {
            done.push("checkin");
        }
        App.store.set("tasks:" + member, { date: App.todayKey(), done: done });
        dialog.close();
        live.textContent = "Check-in saved. Only your medical team sees it.";
        document.dispatchEvent(new CustomEvent("tasks:change", { detail: { source: "checkin", task: "checkin" } }));
    });

    $("[data-checkin-close]", dialog).addEventListener("click", function () {
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

    $("[data-checkin-open]", section).addEventListener("click", function (event) {
        openCheckin(event.currentTarget);
    });

    // The "Mood check-in" task opens the check-in instead of a bare tick
    var task = document.querySelector("[data-task='checkin']");
    if (task) {
        task.addEventListener("click", function (event) {
            if (!task.checked) {
                return;
            }
            event.preventDefault();
            openCheckin(task);
        });
    }

    App.goalsPanel = { openCheckin: openCheckin, celebrate: celebrate };

    render();
    document.addEventListener("tasks:change", render);
    document.addEventListener("health:sample", render);
})();
