/* Pre-flight exams (before the flight only), from App.crew.preflightExams (assets/js/crew-data.js).
   Doctor: a side panel opened from each crew card (App.examPanel.open), with that person's exams by status
   (to schedule, scheduled, done) and booking inside each exam's window.
   Astronaut: their own exams, read-only (the flight surgeon books them). Both read the same bookings. */
(function () {
    "use strict";

    var App = window.App;
    if (!App.getSavedProfileKey() || App.getPhase().key !== "pre" || !App.crew || !App.crew.preflightExams) {
        return;
    }

    var crew = App.crew;
    var profile = App.getProfile();
    var phase = App.getPhase();
    var DAY_MS = 864e5;
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var STATUS = {
        open: { label: "To schedule", badge: "soon", icon: "#icon-info" },
        dueSoon: { label: "Due soon", badge: "warn", icon: "#icon-alert" },
        scheduled: { label: "Scheduled", badge: "soon", icon: "#icon-clock" },
        done: { label: "Done", badge: "ok", icon: "#icon-check" }
    };

    function $(selector) {
        return document.querySelector(selector);
    }

    function day(ms, withYear) {
        var date = new Date(ms);
        return MONTHS[date.getUTCMonth()] + " " + date.getUTCDate() + (withYear ? ", " + date.getUTCFullYear() : "");
    }

    // ISO date (yyyy-mm-dd) for the date input
    function isoDay(ms) {
        return new Date(ms).toISOString().slice(0, 10);
    }

    function statusOf(exam) {
        return exam.dueSoon ? STATUS.dueSoon : STATUS[exam.status];
    }

    // The line under the exam name, by status
    function metaOf(exam) {
        if (exam.status === "scheduled") {
            return day(exam.at, true) + ", " + App.formatTime(new Date(exam.at)) + " · " + exam.place;
        }
        if (exam.status === "done") {
            return "Done " + day(exam.at, true) + (exam.result ? " · " + exam.result : "");
        }
        var range = day(exam.opens) + " – " + day(exam.closes, true);
        return exam.windowOpen ? "Window " + range + (exam.dueSoon ? " · closes in " + Math.round((exam.closes - phase.today.getTime()) / DAY_MS) + " days" : "") : "Window opens " + day(exam.opens, true) + " (" + range + ")";
    }

    function badgeHtml(exam) {
        var status = statusOf(exam);
        return "<span class=\"badge badge--" + status.badge + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" + status.icon + "\"/></svg><span class=\"badge__text\">" + status.label + "</span></span>";
    }

    // Order inside each status: what closes first, what comes first, the latest done
    function compareExams(a, b) {
        if (a.status === "open") {
            return a.closes - b.closes;
        }
        if (a.status === "scheduled") {
            return a.at - b.at;
        }
        return b.at - a.at;
    }

    function sortExams(list) {
        return list.sort(compareExams);
    }

    /* ---------- Astronaut: own exams, read-only ---------- */
    function renderMine() {
        var target = $("[data-my-exams]");
        if (!target) {
            return;
        }
        var exams = crew.preflightExams(profile.member);
        var order = { scheduled: 0, open: 1, done: 2 };
        var groups = { scheduled: [], open: [], done: [] };
        exams.forEach(function (exam) {
            groups[exam.status].push(exam);
        });
        target.textContent = "";
        Object.keys(order).forEach(function (key) {
            sortExams(groups[key]).forEach(function (exam) {
                var li = document.createElement("li");
                li.className = "card tasks__exam" + (exam.status === "done" ? " tasks__exam--done" : "");
                li.innerHTML =
                    "<div class=\"tasks__exam-head\"><p class=\"tasks__name\"></p>" + badgeHtml(exam) + "</div>" +
                    "<p class=\"tasks__meta tasks__exam-when\"></p><p class=\"tasks__meta\"></p>";
                li.querySelector(".tasks__name").textContent = exam.name;
                li.querySelector(".tasks__exam-when").textContent = exam.status === "open"
                    ? metaOf(exam) + " · your flight surgeon books it"
                    : metaOf(exam);
                li.querySelectorAll(".tasks__meta")[1].textContent = exam.what;
                target.appendChild(li);
            });
        });
        var count = { done: groups.done.length, scheduled: groups.scheduled.length, open: groups.open.length };
        var subtitle = $("[data-my-exams-subtitle]");
        subtitle.textContent = count.done + " done, " + count.scheduled + " scheduled, " + count.open + " still to schedule. " +
            "Your flight surgeon books each exam; ask at your next conference if a date does not work for you.";
    }

    if (profile.key !== "doctor") {
        renderMine();
        return;
    }

    /* ---------- Doctor: one crew member's exams, in a side panel opened from their crew card ---------- */
    var members = crew.members;
    var panel = $("[data-exam-panel]");
    var statusLine = $("[data-exam-panel-status]");
    var current = null;   // crew member shown in the panel
    var openForm = null;  // key of the exam whose booking form is open
    var changed = false;  // a booking changed while the panel was open: the crew card redraws on close
    var launch = phase.launch.getTime();

    if (!panel) {
        return;
    }

    function announce(text) {
        statusLine.textContent = text;
    }

    // Booking form inside the exam: date within the window + one of the clinic time slots
    function bookingForm(exam) {
        var member = current;
        var id = "exam-" + member + "-" + exam.key;
        var tomorrow = phase.today.getTime() + DAY_MS;
        var min = Math.max(tomorrow, exam.opens);
        var form = document.createElement("form");
        form.className = "exam-panel__form";
        form.noValidate = true;
        var slots = crew.examSlots.map(function (slot, index) {
            var checked = exam.at ? new Date(exam.at).getUTCHours() === slot.hour && new Date(exam.at).getUTCMinutes() === slot.minute : index === 0;
            return "<label class=\"choice choice--chip\"><input class=\"choice__input\" type=\"radio\" name=\"" + id + "-slot\" value=\"" + index + "\"" + (checked ? " checked" : "") + "><span class=\"choice__label\">" + slot.label + " UTC</span></label>";
        }).join("");
        form.innerHTML =
            "<div class=\"exam-panel__fields\">" +
            "<div class=\"field\"><label class=\"field__label\" for=\"" + id + "-date\">Date</label>" +
            "<p class=\"field__hint\" id=\"" + id + "-hint\"></p>" +
            "<input class=\"field__input\" id=\"" + id + "-date\" type=\"date\" aria-describedby=\"" + id + "-hint " + id + "-error\">" +
            "<p class=\"field__error\" id=\"" + id + "-error\" hidden></p></div>" +
            "<fieldset class=\"exam-panel__slots\"><legend class=\"field__label exam-panel__legend\">Time</legend><div class=\"exam-panel__slot-list\">" + slots + "</div></fieldset>" +
            "</div>" +
            "<div class=\"exam-panel__actions\"><button class=\"button button--primary\" type=\"submit\"><span class=\"button__text\">Save</span></button>" +
            "<button class=\"button button--tertiary\" type=\"button\" data-exam-close><span class=\"button__text\">Cancel</span></button></div>";
        var input = form.querySelector("input[type='date']");
        var error = form.querySelector(".field__error");
        input.min = isoDay(min);
        input.max = isoDay(exam.closes);
        input.value = exam.at ? isoDay(exam.at) : isoDay(min);
        form.querySelector(".field__hint").textContent = "Inside the window: " + day(min) + " to " + day(exam.closes, true) + ".";

        form.querySelectorAll(".choice__input").forEach(function (radio) {
            radio.closest(".choice").classList.toggle("choice--active", radio.checked);
            radio.addEventListener("change", function () {
                form.querySelectorAll(".choice__input").forEach(function (other) {
                    other.closest(".choice").classList.toggle("choice--active", other.checked);
                });
            });
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            var picked = Date.parse(input.value + "T00:00:00Z");
            if (isNaN(picked) || picked < min || picked > exam.closes) {
                error.textContent = "Choose a date between " + day(min) + " and " + day(exam.closes, true) + ".";
                error.hidden = false;
                input.setAttribute("aria-invalid", "true");
                input.classList.add("field__input--invalid");
                input.focus();
                return;
            }
            var slot = crew.examSlots[Number(form.querySelector(".choice__input:checked").value)];
            var at = picked + (slot.hour * 60 + slot.minute) * 60000;
            crew.scheduleExam(member, exam.key, at);
            openForm = null;
            changed = true;
            announce(exam.name + " scheduled on " + day(at, true) + " at " + slot.label + " UTC.");
            render(exam.key);
        });
        form.querySelector("[data-exam-close]").addEventListener("click", function () {
            openForm = null;
            render(exam.key);
        });
        return form;
    }

    function examItem(exam) {
        var li = document.createElement("li");
        li.className = "list__row list__row--stack exam-panel__item";
        li.setAttribute("data-exam", exam.key);
        li.innerHTML =
            "<div class=\"exam-panel__item-head\"><h4 class=\"exam-panel__name\"></h4>" + badgeHtml(exam) + "</div>" +
            "<p class=\"exam-panel__meta\"></p><p class=\"exam-panel__what\"></p>";
        li.querySelector(".exam-panel__name").textContent = exam.name;
        li.querySelector(".exam-panel__meta").textContent = metaOf(exam);
        li.querySelector(".exam-panel__what").textContent = exam.what;

        if (exam.status === "done") {
            return li;
        }
        if (openForm === exam.key) {
            li.appendChild(bookingForm(exam));
            return li;
        }
        var actions = document.createElement("div");
        actions.className = "exam-panel__actions";
        var book = document.createElement("button");
        book.type = "button";
        book.className = "button " + (exam.status === "open" ? "button--primary" : "button--secondary");
        book.setAttribute("data-exam-open", "");
        book.setAttribute("aria-label", (exam.status === "open" ? "Schedule " : "Change the date of ") + exam.name);
        book.innerHTML = "<span class=\"button__text\">" + (exam.status === "open" ? "Schedule" : "Change date") + "</span>";
        book.addEventListener("click", function () {
            openForm = exam.key;
            render(exam.key, "input[type='date']");
        });
        actions.appendChild(book);
        if (exam.status === "scheduled") {
            var cancel = document.createElement("button");
            cancel.type = "button";
            cancel.className = "button button--tertiary";
            cancel.setAttribute("aria-label", "Cancel " + exam.name);
            cancel.innerHTML = "<span class=\"button__text\">Cancel</span>";
            cancel.addEventListener("click", function () {
                crew.cancelExam(current, exam.key);
                changed = true;
                announce(exam.name + " cancelled. It is back in To schedule.");
                render(exam.key);
            });
            actions.appendChild(cancel);
        }
        li.appendChild(actions);
        return li;
    }

    // focusKey: the exam to keep the keyboard on after a redraw; focusSelector: what to focus inside it
    function render(focusKey, focusSelector) {
        var groups = { open: [], scheduled: [], done: [] };
        crew.preflightExams(current).forEach(function (exam) {
            groups[exam.status].push(exam);
        });
        Object.keys(groups).forEach(function (status) {
            var list = panel.querySelector("[data-exam-list='" + status + "']");
            var items = sortExams(groups[status]);
            list.textContent = "";
            items.forEach(function (exam) {
                list.appendChild(examItem(exam));
            });
            if (!items.length) {
                var none = document.createElement("li");
                none.className = "exam-panel__none";
                none.textContent = "None";
                list.appendChild(none);
            }
            panel.querySelector("[data-exam-count='" + status + "']").textContent = "(" + items.length + ")";
        });

        if (!focusKey) {
            return;
        }
        var item = panel.querySelector("[data-exam='" + focusKey + "']");
        var target = item ? item.querySelector(focusSelector || "[data-exam-open]") || item.querySelector("button") : null;
        if (target) {
            target.focus();
            return;
        }
        // No button left on the exam (it is done): keep the keyboard on its group
        var group = item ? item.closest(".exam-panel__group") : null;
        (group ? group.querySelector(".exam-panel__group-title") : panel.querySelector(".exam-panel__close")).focus();
    }

    function open(member) {
        if (!members[member]) {
            return;
        }
        current = member;
        openForm = null;
        changed = false;
        announce("");
        var person = members[member];
        $("#exam-panel-title").textContent = "Pre-flight exams · " + person.name;
        $("[data-exam-panel-subtitle]").textContent = person.role + " · launch " + day(launch, true) +
            " · quarantine starts " + day(launch - 14 * DAY_MS, true) + ". Each exam has a window set by the flight rules.";
        render();
        panel.showModal();
        var first = panel.querySelector("[data-exam-open]") || panel.querySelector(".exam-panel__close");
        first.focus();
    }

    panel.querySelector("[data-exam-panel-close]").addEventListener("click", function () {
        panel.close();
    });
    // A tap on the backdrop closes it, like the Presentation mode panel
    panel.addEventListener("click", function (event) {
        if (event.target === panel) {
            panel.close();
        }
    });
    // On close the crew card redraws with the new counts, then the keyboard goes back to its button
    panel.addEventListener("close", function () {
        if (changed) {
            document.dispatchEvent(new CustomEvent("exams:change", { detail: { member: current } }));
        }
        var opener = document.querySelector("[data-exams-member='" + current + "']");
        if (opener) {
            opener.focus();
        }
    });

    App.examPanel = { open: open };
})();
