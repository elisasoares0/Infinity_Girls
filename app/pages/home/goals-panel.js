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
        water: "<path d=\"M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM128,216a72.08,72.08,0,0,1-72-72c0-57.23,55.47-105,72-118,16.53,13,72,60.75,72,118A72.08,72.08,0,0,1,128,216Zm55.89-62.66a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z\"/>",
        exercise: "<path d=\"M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z\"/>",
        sleep: "<path d=\"M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z\"/>",
        checkin: "<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM80,108a12,12,0,1,1,12,12A12,12,0,0,1,80,108Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,176,108Zm-1.07,48c-10.29,17.79-27.4,28-46.93,28s-36.63-10.2-46.92-28a8,8,0,1,1,13.84-8c7.47,12.91,19.21,20,33.08,20s25.61-7.1,33.07-20a8,8,0,0,1,13.86,8Z\"/>",
        badge: "<path d=\"M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z\"/>",
        lock: "<path d=\"M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z\"/>",
        check: "<path d=\"M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z\"/>"
    };
    var lastSaved = "";
    var lastMet = null;
    var live = section.querySelector("[data-goals-live]");

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function icon(name, className) {
        return "<svg class=\"" + className + "\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\">" + ICONS[name] + "</svg>";
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
        var achievements = App.goals.achievements();
        // The summary stays on the card; the full list opens on demand ("See all achievements")
        $("[data-goals-badges-count]", section).textContent = achievements.filter(function (item) {
            return item.unlocked;
        }).length + " of " + achievements.length + " unlocked";
        achievements.forEach(function (item) {
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
