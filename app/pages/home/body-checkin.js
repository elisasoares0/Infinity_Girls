/*
 * Body check-in on the astronaut home (App.bodyCheckin): log a symptom on a region of the body, with how strong it is.
 * Opened by a click or tap on the 3D body (home.js passes onRegion here), or by the region shortcuts on the stage
 * (visually hidden until focused: the keyboard, screen reader and no-WebGL way in). "Log nausea or vomiting", next to
 * the section title, opens it with only those two symptoms. Data and the advice for each level: App.symptoms
 * (assets/js/symptoms.js); saved in body_checkin. Nausea or vomiting also turns on nausea mode.
 * The mouse hover over the body shows a label on the stage (aria-hidden: the shortcuts are the accessible way in).
 *   App.bodyCheckin.open(regionId, from, { only: [symptomIds] }), .hover(regionId, x, y), .attach(view)
 */
(function () {
    "use strict";

    var App = window.App;
    var dialog = document.querySelector("[data-symptom]");
    var profile = App.getProfile();
    if (!dialog || !App.symptoms || profile.key === "doctor" || !App.getSavedProfileKey()) {
        return;
    }

    var member = profile.member;
    var form = dialog.querySelector("[data-symptom-form]");
    var range = dialog.querySelector("[data-symptom-level]");
    var label = document.querySelector("[data-region-label]");
    var status = document.querySelector("[data-symptoms-status]");
    var view = null;
    var region = null;
    var only = null;
    var opener = null;
    var NAUSEA_ONLY = ["nausea", "vomito"];

    function $(selector) {
        return dialog.querySelector(selector);
    }

    function chosenSymptom() {
        var input = form.querySelector("input[name='symptom']:checked");
        return input ? input.value : null;
    }

    function level() {
        return Number(range.value);
    }

    /* ---------- Building the choices ---------- */
    function renderOptions() {
        var box = $("[data-symptom-options]");
        var area = App.symptoms.region(region);
        box.innerHTML = "";
        area.symptoms.filter(function (item) {
            return !only || only.indexOf(item.id) !== -1;
        }).forEach(function (item) {
            var option = document.createElement("label");
            option.className = "symptom__option";
            option.innerHTML = "<input class=\"symptom__input\" type=\"radio\" name=\"symptom\">" +
                "<span class=\"symptom__option-icon\">" + App.symptoms.icon(item.icon, "symptom__option-svg") + "</span>" +
                "<span class=\"symptom__option-name\"></span>";
            option.querySelector("input").value = item.id;
            option.querySelector(".symptom__option-name").textContent = item.label;
            box.appendChild(option);
        });
    }

    function renderTitle() {
        var area = App.symptoms.region(region);
        $("[data-symptom-title]").textContent = only ? "Nausea or vomiting" : area.label;
        $("[data-symptom-text]").textContent = only ? "Motion sickness. Saving it simplifies the screen so it is easier to read." : area.text;
    }

    // Level badge, spoken value, the advice for this level and the shortcuts it calls for
    function renderLevel() {
        var value = level();
        var name = App.symptoms.levels[value];
        var symptomId = chosenSymptom();
        var item = symptomId ? App.symptoms.symptom(region, symptomId) : null;
        var band = App.symptoms.band(value);
        $("[data-symptom-badge]").textContent = "Level " + value + "/5";
        $("[data-symptom-badge]").className = "symptom__badge symptom__badge--" + band;
        range.setAttribute("aria-valuetext", value + " of 5, " + name.toLowerCase());
        $("[data-symptom-protocol]").textContent = item
            ? App.symptoms.protocol(region, symptomId, value)
            : name + ". Choose what you feel to see what to do.";
        var sos = item ? App.symptoms.sosFor(region, symptomId, value) : null;
        $("[data-symptom-sos]").hidden = !sos;
        $("[data-symptom-glucose]").hidden = !(item && item.glucose && App.glucoseEntry);
        var learn = $("[data-symptom-learn]");
        learn.hidden = !(item && item.learn);
        if (item && item.learn) {
            learn.href = App.rootUrl("pages/learn/index.html") + "#risk-" + item.learn;
        }
        form.querySelectorAll(".symptom__option").forEach(function (option) {
            option.classList.toggle("symptom__option--checked", option.querySelector("input").checked);
        });
    }

    function setRegion(id) {
        region = id;
        renderTitle();
        renderOptions();
        renderLevel();
        if (view) {
            view.highlight(region);
        }
    }

    /* ---------- Open and close ---------- */
    function open(id, from, settings) {
        if (!App.symptoms.region(id)) {
            return;
        }
        opener = from || document.activeElement;
        only = settings && settings.only ? settings.only : null;
        form.reset();
        range.value = "2";
        $("[data-symptom-error]").hidden = true;
        setRegion(id);
        hover(null);
        dialog.showModal();
        makeRoom(true);
        var first = form.querySelector("input[name='symptom']");
        if (first) {
            first.focus();
        }
    }

    function close() {
        if (dialog.open) {
            dialog.close();
        }
    }

    /*
     * From 768px the sheet is a drawer on the right: slide the figure into the part of the stage still in view,
     * so the lit region stays visible next to the questions.
     */
    function makeRoom(open) {
        if (!view) {
            return;
        }
        var stage = document.querySelector(".astronaut-view__stage");
        if (!open || !stage || !window.matchMedia("(min-width: 768px)").matches) {
            view.setShift(0);
            return;
        }
        var rect = stage.getBoundingClientRect();
        var free = Math.min(rect.right, dialog.getBoundingClientRect().left);
        view.setShift(Math.min(0, (rect.left + free) / 2 - (rect.left + rect.width / 2)));
    }

    dialog.addEventListener("close", function () {
        if (view) {
            view.highlight(null);
            makeRoom(false);
        }
        var back = opener && document.body.contains(opener) ? opener : document.querySelector("[data-symptom-open]");
        opener = null;
        if (back) {
            back.focus();
        }
    });
    // A tap outside the sheet (on the backdrop) closes it
    dialog.addEventListener("click", function (event) {
        if (event.target === dialog) {
            close();
        }
    });
    $("[data-symptom-close]").addEventListener("click", close);
    $("[data-symptom-cancel]").addEventListener("click", close);

    form.addEventListener("change", function () {
        $("[data-symptom-error]").hidden = true;
        renderLevel();
    });
    range.addEventListener("input", renderLevel);

    $("[data-symptom-sos]").addEventListener("click", function () {
        var scenario = App.symptoms.sosFor(region, chosenSymptom(), level());
        save();
        if (scenario && App.emergency) {
            App.emergency.start(scenario, "symptom");
        }
    });
    $("[data-symptom-glucose]").addEventListener("click", function () {
        close();
        App.glucoseEntry.open(document.querySelector("[data-symptom-open]"));
    });

    function save() {
        var symptomId = chosenSymptom();
        var error = $("[data-symptom-error]");
        if (!symptomId) {
            error.textContent = "Choose what you feel.";
            error.hidden = false;
            form.querySelector("input[name='symptom']").focus();
            return null;
        }
        var row = App.symptoms.save(member, region, symptomId, level());
        var item = App.symptoms.symptom(region, symptomId);
        status.textContent = "Saved at " + App.formatTime(new Date(row.registrado_em)) + ": " + App.symptoms.label(row) + "." +
            (item.nausea ? " Nausea mode is on: the screen shows only what matters." : "") +
            (App.symptoms.needsDoctor(row) && App.isFlight() ? " Your medical team can see it." : "");
        // Nausea or vomiting: focus (and the scroll) goes up to the nausea bar, so the change is in view
        if (item.nausea && App.nausea && App.nausea.element()) {
            opener = App.nausea.element();
        }
        close();
        return row;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        save();
    });

    // Next to the title: nausea and vomiting only (they turn on nausea mode)
    document.querySelector("[data-symptom-open]").addEventListener("click", function (event) {
        open("abdomen", event.currentTarget, { only: NAUSEA_ONLY });
    });
    // Region shortcuts on the stage (shown when focused): the keyboard way to any region
    document.querySelectorAll("[data-symptom-region]").forEach(function (button) {
        button.addEventListener("click", function () {
            open(button.getAttribute("data-symptom-region"), button);
        });
    });

    /* ---------- Today's symptoms ---------- */
    var list = document.querySelector("[data-symptoms-list]");

    function renderList() {
        var rows = App.symptoms.today(member);
        document.querySelector("[data-symptoms]").hidden = !rows.length;
        list.innerHTML = "";
        rows.forEach(function (row) {
            var area = App.symptoms.region(row.regiao_anatomica);
            var item = App.symptoms.symptom(row.regiao_anatomica, row.sintoma);
            var li = document.createElement("li");
            li.className = "symptoms__item" + (row.resolvido ? " symptoms__item--better" : "");
            li.innerHTML =
                "<span class=\"symptoms__icon\">" + App.symptoms.icon(item ? item.icon : "pain", "symptoms__svg") + "</span>" +
                "<div class=\"symptoms__text\">" +
                "<p class=\"symptoms__name\"></p>" +
                "<p class=\"symptoms__meta\"></p>" +
                "</div>" +
                "<span class=\"symptoms__level\"></span>";
            li.querySelector(".symptoms__name").textContent = item ? item.label : row.sintoma;
            li.querySelector(".symptoms__meta").textContent = (area ? area.label : row.regiao_anatomica) + " · " + App.formatTime(new Date(row.registrado_em)) +
                (row.resolvido ? " · feeling better" : App.symptoms.needsDoctor(row) && App.isFlight() ? " · your medical team can see it" : "");
            var badge = li.querySelector(".symptoms__level");
            badge.textContent = row.intensidade + "/5";
            badge.className = "symptoms__level symptoms__level--" + (row.resolvido ? "better" : App.symptoms.band(row.intensidade));
            if (!row.resolvido) {
                var button = document.createElement("button");
                button.className = "button button--secondary symptoms__better";
                button.type = "button";
                button.innerHTML = "<span class=\"button__text\">Feeling better</span>";
                button.setAttribute("aria-label", "Feeling better: " + (item ? item.label : row.sintoma) + " at " + App.formatTime(new Date(row.registrado_em)));
                button.addEventListener("click", function () {
                    App.symptoms.resolve(row.id);
                    status.textContent = (item ? item.label : row.sintoma) + " marked as better.";
                    var next = list.querySelector(".symptoms__better");
                    (next || document.querySelector("[data-symptom-open]")).focus();
                });
                li.appendChild(button);
            }
            list.appendChild(li);
        });
    }

    document.addEventListener("symptoms:change", renderList);
    renderList();

    /* ---------- Hover label on the stage (mouse only) ---------- */
    function hover(id, x, y) {
        if (!label) {
            return;
        }
        var area = id ? App.symptoms.region(id) : null;
        if (!area || dialog.open) {
            label.hidden = true;
            return;
        }
        label.textContent = area.label + " · click to log a symptom";
        label.style.setProperty("--label-x", Math.round(x) + "px");
        label.style.setProperty("--label-y", Math.round(y) + "px");
        label.hidden = false;
    }

    App.bodyCheckin = {
        open: open,
        hover: hover,
        attach: function (mounted) {
            view = mounted;
        },
        // For tests: the 3D view (null until it loads, or without WebGL)
        view: function () {
            return view;
        }
    };
})();
