/* Profile page: who is using the app, their mission, shortcuts, and sign out */
(function () {
    "use strict";

    var App = window.App;
    var profile = App.getProfile();
    var mode = App.getMode();
    var lead = App.getMedicalLead();

    function setText(selector, text) {
        var el = document.querySelector(selector);
        if (el) {
            el.textContent = text;
        }
    }

    setText("[data-profile-label]", profile.label);
    setText("[data-profile-name]", profile.name);
    setText("[data-profile-sees]", profile.sees);
    setText("[data-profile-role]", profile.role);
    // The mission comes from mission control (missions.json); its phase is chosen at sign-in and copied into the session
    var DESTINATIONS = { Station: "Space station", Moon: "Moon", Mars: "Mars" };
    var phase = App.getPhase();
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function shortDate(date) {
        return MONTHS[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
    }
    setText("[data-profile-mission]", mode.missionName);
    setText("[data-profile-destination]", DESTINATIONS[mode.name] + " · " + mode.env);
    setText("[data-profile-launch]", shortDate(phase.launch));
    setText("[data-profile-landing]", shortDate(phase.landing));
    setText("[data-profile-length]", mode.length + " days");
    var simulations = App.getSimulations();
    var simulationBox = document.querySelector("[data-profile-simulation]");
    if (simulationBox) {
        simulationBox.hidden = !simulations.length;
        setText("[data-profile-simulation-text]", "Simulating " + simulations.map(function (item) {
            return item.text;
        }).join(", ") + ". The real mission is shown again when you turn it off.");
    }
    if (!App.getMission()) {
        setText("[data-profile-mission-note]", "No mission was chosen at sign-in: the app shows an example mission. Sign out and choose a flight phase.");
    }
    setText("[data-profile-lead]", profile.key === "doctor" && lead.crewLeads ? "You, on board" : lead.name);

    // Shortcuts for this profile
    var LINKS = {
        female: [["Women's health", "../womens-health/index.html"], ["Privacy: who sees your data", "../privacy/index.html"], ["Your vital signs over time", "../vitals/index.html"]],
        male: [["Men's health focus", "../mens-health/index.html"], ["Privacy: who sees your data", "../privacy/index.html"], ["Your vital signs over time", "../vitals/index.html"]],
        doctor: [["Crew panel: records and alerts", "../../index.html#crew"], ["Emergency procedures", "../emergency/index.html"]]
    };
    // Every profile: the health risks of this phase, in plain words (pages/learn/)
    Object.keys(LINKS).forEach(function (key) {
        LINKS[key].push(["Your health risks", "../learn/index.html"]);
    });
    var links = document.querySelector("[data-profile-links]");
    LINKS[profile.key].forEach(function (pair) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.className = "account__link";
        a.href = pair[1];
        a.innerHTML = "<span class=\"account__link-text\"></span><svg class=\"account__link-icon\" aria-hidden=\"true\"><use href=\"#icon-arrow\"/></svg>";
        a.querySelector(".account__link-text").textContent = pair[0];
        li.appendChild(a);
        links.appendChild(li);
    });

    /* ---------- Personal data of the signed-in account (assets/js/accounts.js) ---------- */
    var accounts = App.accounts;
    var statusLine = document.querySelector("[data-personal-status]");
    var opener = null;

    function formatDate(iso) {
        var date = new Date(iso + "T00:00:00Z");
        if (isNaN(date.getTime())) {
            return "Not informed";
        }
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
    }

    function renderPersonal() {
        var session = App.getSession();
        if (!session) {
            return;
        }
        var age = accounts ? accounts.ageOf(session.birthDate) : null;
        var values = {
            name: session.name,
            nasaId: session.nasaId,
            idNumber: session.idNumber,
            roleLabel: session.roleLabel,
            sex: session.sex || "Not informed",
            age: age === null ? "Not informed" : age + " years",
            birthDate: formatDate(session.birthDate)
        };
        Object.keys(values).forEach(function (key) {
            setText("[data-personal='" + key + "']", values[key]);
        });
        setText("[data-personal-id-label]", session.role === "doctor" ? "Medical license (CRM)" : "Astronaut ID");
        setText("[data-personal-note]", session.demo
            ? "Mission crew test account. Changes are saved only on this device."
            : "Account created on this device. Health data in this prototype is simulated.");
        setText("[data-profile-name]", session.name);
        document.querySelector("[data-personal-open='delete']").hidden = session.demo;
    }

    // One panel open at a time, opened by its button; Cancel or saving brings the focus back
    function openPanel(name, button) {
        document.querySelectorAll("[data-personal-form]").forEach(function (panel) {
            panel.hidden = panel.getAttribute("data-personal-form") !== name;
        });
        document.querySelectorAll("[data-personal-open]").forEach(function (other) {
            other.setAttribute("aria-expanded", other.getAttribute("data-personal-open") === name ? "true" : "false");
        });
        opener = button;
        statusLine.textContent = "";
        var panel = document.querySelector("[data-personal-form='" + name + "']");
        if (name === "edit") {
            var session = App.getSession();
            panel.querySelector("[name='name']").value = session.name;
            panel.querySelector("[name='birthDate']").value = session.birthDate || "";
            panel.querySelectorAll("[name='sex']").forEach(function (radio) {
                radio.checked = radio.value === session.sex;
                radio.closest(".choice").classList.toggle("choice--active", radio.checked);
            });
            setText("[data-personal-sex-legend]", session.role === "doctor" ? "Sex (optional)" : "Sex");
        }
        if (name === "password") {
            panel.reset();
        }
        if (panel.tagName === "FORM") {
            clearErrors(panel);
        }
        var first = panel.querySelector("input, button");
        if (first) {
            first.focus();
        }
    }

    function closePanels(message) {
        document.querySelectorAll("[data-personal-form]").forEach(function (panel) {
            panel.hidden = true;
        });
        document.querySelectorAll("[data-personal-open]").forEach(function (button) {
            button.setAttribute("aria-expanded", "false");
        });
        statusLine.textContent = message || "";
        if (opener && !opener.hidden) {
            opener.focus();
        }
    }

    function clearErrors(form) {
        form.querySelectorAll(".field__error").forEach(function (error) {
            error.hidden = true;
            error.textContent = "";
        });
        form.querySelectorAll("[aria-invalid]").forEach(function (input) {
            input.removeAttribute("aria-invalid");
            input.classList.remove("field__input--invalid");
        });
    }

    // errors: { field name: message }; the first field with a problem gets the focus
    function showErrors(form, errors) {
        var first = null;
        Array.prototype.forEach.call(form.elements, function (input) {
            if (!input.name || !errors[input.name]) {
                return;
            }
            var errorId = input.type === "radio" ? form.querySelector("fieldset").getAttribute("aria-describedby") : input.getAttribute("aria-describedby").split(" ").pop();
            var error = document.getElementById(errorId);
            error.textContent = errors[input.name];
            error.hidden = false;
            if (input.type !== "radio") {
                input.setAttribute("aria-invalid", "true");
                input.classList.add("field__input--invalid");
            }
            first = first || input;
        });
        if (first) {
            first.focus();
        }
    }

    if (accounts && App.getSession()) {
        renderPersonal();

        document.querySelectorAll("[data-personal-open]").forEach(function (button) {
            button.addEventListener("click", function () {
                openPanel(button.getAttribute("data-personal-open"), button);
            });
        });
        document.querySelectorAll("[data-personal-cancel]").forEach(function (button) {
            button.addEventListener("click", function () {
                closePanels("");
            });
        });
        document.querySelectorAll("[data-personal-form] [name='sex']").forEach(function (radio) {
            radio.addEventListener("change", function () {
                document.querySelectorAll("[data-personal-form] [name='sex']").forEach(function (other) {
                    other.closest(".choice").classList.toggle("choice--active", other.checked);
                });
            });
        });

        var editForm = document.querySelector("[data-personal-form='edit']");
        editForm.addEventListener("submit", function (event) {
            event.preventDefault();
            clearErrors(editForm);
            var sex = editForm.querySelector("[name='sex']:checked");
            accounts.update({
                name: editForm.querySelector("[name='name']").value,
                sex: sex ? sex.value : "",
                birthDate: editForm.querySelector("[name='birthDate']").value
            }).then(function () {
                renderPersonal();
                closePanels("Personal data saved.");
            }).catch(function (problem) {
                if (problem && problem.errors) {
                    showErrors(editForm, problem.errors);
                } else {
                    statusLine.textContent = (problem && problem.message) || "Could not save. Try again.";
                }
            });
        });

        var passwordForm = document.querySelector("[data-personal-form='password']");
        passwordForm.addEventListener("submit", function (event) {
            event.preventDefault();
            clearErrors(passwordForm);
            var current = passwordForm.querySelector("[name='current']").value;
            if (!current) {
                showErrors(passwordForm, { current: "Enter your current password." });
                return;
            }
            accounts.changePassword(current, passwordForm.querySelector("[name='password']").value, passwordForm.querySelector("[name='confirm']").value).then(function () {
                passwordForm.reset();
                closePanels("Password changed. Use the new one next time you sign in.");
            }).catch(function (problem) {
                if (problem && problem.errors) {
                    showErrors(passwordForm, problem.errors);
                } else {
                    statusLine.textContent = (problem && problem.message) || "Could not change the password. Try again.";
                }
            });
        });

        document.querySelector("[data-personal-delete]").addEventListener("click", function () {
            accounts.remove().then(function () {
                window.location.href = App.rootUrl("index.html");
            }).catch(function (problem) {
                closePanels(problem.message);
            });
        });
    }

    // Sign out: back to the sign-in screen on the home
    /* ---------- Reminders (App.reminders): spoken reminders and device notifications ---------- */
    (function () {
        var spoken = document.querySelector("[data-reminder-spoken]");
        if (!spoken || !App.reminders) {
            return;
        }
        var spokenState = document.querySelector("[data-reminder-spoken-state]");
        var notifyButton = document.querySelector("[data-reminder-notify]");
        var notifyStatus = document.querySelector("[data-reminder-notify-status]");

        function render() {
            var settings = App.reminders.settings();
            spoken.checked = settings.spoken;
            spokenState.textContent = settings.spoken ? "On" : "Off";
            if (!("Notification" in window)) {
                notifyStatus.textContent = "Device notifications: this browser does not support them. Reminders show on screen.";
                notifyButton.hidden = true;
            } else if (Notification.permission === "denied") {
                notifyStatus.textContent = "Device notifications: blocked in the browser settings. Reminders show on screen.";
                notifyButton.hidden = true;
            } else {
                var on = Notification.permission === "granted" && settings.notify;
                notifyStatus.textContent = on ? "Device notifications: on, when the app is not on screen." : "Device notifications: off.";
                notifyButton.querySelector(".button__text").textContent = on ? "Turn off device notifications" : "Turn on device notifications";
                notifyButton.hidden = false;
            }
        }

        spoken.addEventListener("change", function () {
            App.reminders.setSettings({ spoken: spoken.checked });
            render();
        });
        notifyButton.addEventListener("click", function () {
            var settings = App.reminders.settings();
            if (Notification.permission === "granted" && settings.notify) {
                App.reminders.setSettings({ notify: false });
                render();
                return;
            }
            App.reminders.requestNotifications().then(render);
        });
        render();
    })();

    /* ---------- Voice assistant (App.voice) and where the crew finds you (App.habitat) ---------- */
    (function () {
        var on = document.querySelector("[data-voice-on]");
        if (!on || !App.voice) {
            return;
        }
        var stateText = document.querySelector("[data-voice-state]");
        var rate = document.querySelector("[data-voice-rate]");
        var test = document.querySelector("[data-voice-test]");
        var supported = App.voice.isSupported();
        document.querySelector("[data-voice-unsupported]").hidden = supported;
        on.checked = App.voice.isOn();
        on.disabled = !supported;
        stateText.textContent = on.checked ? "On" : "Off";
        rate.value = String(App.voice.rate());
        if (!rate.value) {
            rate.value = "1";
        }
        on.addEventListener("change", function () {
            App.voice.setOn(on.checked);
            stateText.textContent = on.checked ? "On" : "Off";
        });
        rate.addEventListener("change", function () {
            App.voice.setRate(rate.value);
        });
        test.hidden = !supported;
        test.addEventListener("click", function () {
            App.voice.speak("This is your voice assistant. In an emergency I will tell you your vital signs and what to do, step by step.", { priority: "info" });
        });

        var where = document.querySelector("[data-voice-location]");
        if (where && App.habitat && App.isFlight()) {
            var current = App.habitat.locationOf(profile.member).id;
            App.habitat.modules().forEach(function (module) {
                var option = document.createElement("option");
                option.value = module.id;
                option.textContent = module.label;
                option.selected = module.id === current;
                where.appendChild(option);
            });
            where.addEventListener("change", function () {
                App.habitat.setLocation(profile.member, where.value);
            });
        }
    })();

    var signOutButton = document.querySelector("[data-sign-out]");
    if (signOutButton) {
        signOutButton.addEventListener("click", App.signOut);
    }
})();
