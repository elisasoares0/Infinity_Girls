/* Sign-in screen on the home (shown until someone signs in): two tabs, sign in and create account.
   Accounts and rules live in assets/js/accounts.js (App.accounts). After a sign-in the home reloads with that profile. */
(function () {
    "use strict";

    var App = window.App;
    var root = document.querySelector("[data-auth]");
    if (!root || App.getSavedProfileKey() || !App.accounts) {
        return;
    }

    var accounts = App.accounts;
    var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-auth-tab]"));
    var signinForm = root.querySelector("[data-auth-form='signin']");
    var signupForm = root.querySelector("[data-auth-form='signup']");

    /* ---------- Tabs (arrow keys move between them, as in the Vitals tabs) ---------- */
    function selectTab(name, moveFocus) {
        tabs.forEach(function (tab) {
            var on = tab.getAttribute("data-auth-tab") === name;
            tab.classList.toggle("segmented__option--active", on);
            tab.setAttribute("aria-selected", on ? "true" : "false");
            tab.tabIndex = on ? 0 : -1;
            document.getElementById(tab.getAttribute("aria-controls")).hidden = !on;
            if (on && moveFocus) {
                tab.focus();
            }
        });
    }

    tabs.forEach(function (tab, index) {
        tab.addEventListener("click", function () {
            selectTab(tab.getAttribute("data-auth-tab"), false);
        });
        tab.addEventListener("keydown", function (event) {
            var next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key];
            if (next === undefined) {
                return;
            }
            event.preventDefault();
            var target = tabs[(next + tabs.length) % tabs.length];
            selectTab(target.getAttribute("data-auth-tab"), true);
        });
    });

    /* ---------- Show or hide the password ---------- */
    root.querySelectorAll("[data-auth-reveal]").forEach(function (button) {
        var input = document.getElementById(button.getAttribute("aria-controls"));
        button.addEventListener("click", function () {
            var show = input.type === "password";
            input.type = show ? "text" : "password";
            button.setAttribute("aria-pressed", show ? "true" : "false");
            button.querySelector(".button__text").textContent = show ? "Hide" : "Show";
            button.setAttribute("aria-label", (show ? "Hide" : "Show") + " password");
        });
        button.setAttribute("aria-label", "Show password");
    });

    /* ---------- Errors written next to each field ---------- */
    function fieldOf(form, name) {
        return form.querySelector("[name='" + name + "']");
    }

    function errorOf(form, name) {
        var input = fieldOf(form, name);
        var id = name === "sex" ? "signup-sex-error" : input.getAttribute("aria-describedby").split(" ").pop();
        return document.getElementById(id);
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
        form.querySelector("[data-auth-error]").textContent = "";
    }

    // errors: { field: message }. Focus goes to the first field with a problem, in the order of the form
    function showErrors(form, errors) {
        var first = null;
        Array.prototype.forEach.call(form.elements, function (input) {
            var message = errors[input.name];
            if (!message || !input.name) {
                return;
            }
            var error = errorOf(form, input.name);
            error.textContent = message;
            error.hidden = false;
            if (input.type !== "radio") {
                input.setAttribute("aria-invalid", "true");
                input.classList.add("field__input--invalid");
            }
            if (!first) {
                first = input;
            }
        });
        if (first) {
            first.focus();
        }
    }

    // While it waits (the health server can take a few seconds): the text says so, and an orbit turns next to it
    function busy(form, on, text) {
        var button = form.querySelector(".auth__submit");
        button.disabled = on;
        button.querySelector(".button__text").textContent = text;
        form.setAttribute("aria-busy", on ? "true" : "false");
        var loader = button.querySelector(".motion");
        if (on && !loader && window.App.motion) {
            loader = document.createElement("span");
            loader.className = "motion motion--md";
            loader.setAttribute("aria-hidden", "true");
            button.insertBefore(loader, button.firstChild);
            window.App.motion.play("orbit-loader", loader, { loop: true });
        } else if (!on && loader) {
            window.App.motion.stop(loader);
            loader.remove();
        }
    }

    /* ---------- Sign in ---------- */
    signinForm.addEventListener("submit", function (event) {
        event.preventDefault();
        clearErrors(signinForm);
        var nasaId = fieldOf(signinForm, "nasaId").value;
        var password = fieldOf(signinForm, "password").value;
        var errors = {};
        if (!nasaId.trim()) {
            errors.nasaId = "Enter your crew ID or NASA ID.";
        }
        if (!password) {
            errors.password = "Enter your password.";
        }
        if (Object.keys(errors).length) {
            showErrors(signinForm, errors);
            return;
        }
        busy(signinForm, true, "Signing in…");
        var phase = signinForm.querySelector("input[name='missionId']:checked");
        accounts.signIn(nasaId, password, phase ? phase.value : null).then(function () {
            window.location.reload();
        }).catch(function (problem) {
            busy(signinForm, false, "Sign in");
            signinForm.querySelector("[data-auth-error]").textContent = problem.message || "Could not sign in. Try again.";
            fieldOf(signinForm, "password").value = "";
            fieldOf(signinForm, "nasaId").focus();
        });
    });

    /* ---------- Create account: the ID says who you are ---------- */
    var idInput = fieldOf(signupForm, "idNumber");
    var roleLine = root.querySelector("[data-auth-role]");
    var sexBox = root.querySelector("[data-auth-sex]");

    function renderRole() {
        var who = accounts.identify(idInput.value);
        var text = who ? "Recognized as: " + who.label + " · " + who.idNumber : "";
        if (roleLine.textContent !== text) {
            roleLine.textContent = text;
        }
        sexBox.hidden = !who;
        root.querySelector("[data-auth-sex-legend]").textContent = who && who.role === "doctor" ? "Sex (optional)" : "Sex";
    }
    idInput.addEventListener("input", renderRole);

    signupForm.querySelectorAll("input[name='sex']").forEach(function (radio) {
        radio.addEventListener("change", function () {
            signupForm.querySelectorAll("input[name='sex']").forEach(function (other) {
                other.closest(".choice").classList.toggle("choice--active", other.checked);
            });
        });
    });

    signupForm.addEventListener("submit", function (event) {
        event.preventDefault();
        clearErrors(signupForm);
        var sex = signupForm.querySelector("input[name='sex']:checked");
        var data = {
            name: fieldOf(signupForm, "name").value,
            idNumber: idInput.value,
            sex: sex ? sex.value : "",
            birthDate: fieldOf(signupForm, "birthDate").value,
            password: fieldOf(signupForm, "password").value,
            confirm: fieldOf(signupForm, "confirm").value
        };
        busy(signupForm, true, "Creating account…");
        accounts.register(data).then(function () {
            window.location.reload();
        }).catch(function (problem) {
            busy(signupForm, false, "Create account");
            if (problem && problem.errors) {
                // The sex choice only shows once the ID is recognized
                if (problem.errors.sex) {
                    sexBox.hidden = false;
                }
                showErrors(signupForm, problem.errors);
            } else {
                signupForm.querySelector("[data-auth-error]").textContent = (problem && problem.message) || "Could not create the account. Try again.";
            }
        });
    });

    /* ---------- Flight phase to open the app in (one mission per phase, from mission control) ---------- */
    var DESTINATIONS = { station: "Space station", moon: "Moon", mars: "Mars" };
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function day(ms) {
        var date = new Date(ms);
        return MONTHS[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
    }

    function phaseMeta(choice) {
        var mission = choice.mission;
        var when = choice.phase === "pre" ? "launch " + day(choice.info.launch)
            : choice.phase === "post" ? "landed " + day(choice.info.landing)
                : "day " + choice.info.day + " of " + mission.lengthDays;
        return mission.name + " · " + DESTINATIONS[mission.destination] + " · " + when;
    }

    // The three rows are in the HTML; this fills in each phase's mission and hides a phase with none
    var phaseRows = Array.prototype.slice.call(root.querySelectorAll("[data-auth-phase]"));

    function markActive() {
        phaseRows.forEach(function (row) {
            row.classList.toggle("choice--active", row.querySelector("input").checked);
        });
    }

    phaseRows.forEach(function (row) {
        row.querySelector("input").addEventListener("change", markActive);
    });

    accounts.phaseChoices().then(function (choices) {
        var selected = accounts.defaultMissionId(choices);
        phaseRows.forEach(function (row) {
            var choice = choices.filter(function (item) {
                return item.phase === row.getAttribute("data-auth-phase");
            })[0];
            var input = row.querySelector("input");
            row.hidden = !choice;
            input.disabled = !choice;
            if (choice) {
                input.value = choice.mission.id;
                input.checked = choice.mission.id === selected;
                row.querySelector("[data-auth-phase-text]").textContent = phaseMeta(choice);
            }
        });
        markActive();
    });

    /* ---------- Demo accounts: one tap fills the sign-in form with the crew ID (the server login) ---------- */
    accounts.demoAccounts().then(function (list) {
        var target = root.querySelector("[data-auth-demo]");
        list.forEach(function (account) {
            var li = document.createElement("li");
            li.className = "auth__demo-item";
            li.innerHTML =
                "<div class=\"auth__demo-text\"><p class=\"auth__demo-name\"></p><p class=\"auth__demo-meta\"></p></div>" +
                "<button class=\"button button--secondary\" type=\"button\"><span class=\"button__text\">Use this account</span></button>";
            li.querySelector(".auth__demo-name").textContent = account.name;
            li.querySelector(".auth__demo-meta").textContent = accounts.roleLabels[account.role] + (account.role === "astronaut" ? " (" + account.sex.toLowerCase() + ")" : "") + " · " + account.idNumber;
            var button = li.querySelector("button");
            button.setAttribute("aria-label", "Use the account of " + account.name);
            button.addEventListener("click", function () {
                selectTab("signin", false);
                clearErrors(signinForm);
                // The crew ID signs in on the health server (created there from this account the first time)
                fieldOf(signinForm, "nasaId").value = account.idNumber;
                fieldOf(signinForm, "password").value = accounts.demoPassword;
                signinForm.querySelector(".auth__submit").focus();
            });
            target.appendChild(li);
        });
    });

    // Wake the health server while the person types (the free plan sleeps after 15 idle minutes)
    if (window.App.api) {
        window.App.api.wake();
    }
})();
