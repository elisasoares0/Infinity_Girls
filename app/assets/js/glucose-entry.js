/*
 * "Measure now" for blood glucose (App.glucoseEntry), on the Home and Vitals pages.
 * A dialog with the guided steps of a finger-prick reading and the result: typed (mg/dL or mmol/L) or read from a
 * Bluetooth glucometer (standard Glucose Profile) where the browser supports Web Bluetooth.
 * Saving goes through App.glucose.save (a sinais_vitais row). A reading below 54 mg/dL in flight starts the
 * low blood sugar emergency (assets/js/emergency-engine.js); on Earth it tells the person to call the flight surgeon.
 *   App.glucoseEntry.open(opener) → opens the dialog; the focus goes back to opener on close
 */
(function () {
    "use strict";

    var App = window.App;
    var range = App.glucose.range;
    var dialog = null;
    var opener = null;
    var announcer = null;

    var STEPS = [
        "Wash and dry your hands.",
        "Put a new test strip in the glucometer.",
        "Prick the side of a fingertip with the lancet.",
        "Touch the drop of blood to the end of the strip.",
        "Read the number after 5 seconds and enter it below."
    ];
    var UNITS = {
        mgdl: { hint: "Between " + range.min + " and " + range.max + " mg/dL.", toMgDl: function (v) { return v; } },
        mmol: { hint: "Between 1.1 and 33.3 mmol/L.", toMgDl: App.glucose.mmolToMgDl }
    };

    function build() {
        dialog = document.createElement("dialog");
        dialog.className = "sheet glucose-entry";
        dialog.setAttribute("aria-labelledby", "glucose-entry-title");
        dialog.innerHTML =
            "<div class=\"glucose-entry__container\">" +
            "<div class=\"glucose-entry__head\"><div class=\"glucose-entry__heading\">" +
            "<h2 class=\"glucose-entry__title\" id=\"glucose-entry-title\">Measure blood glucose</h2>" +
            "<p class=\"glucose-entry__subtitle\">With the glucometer from the medical kit</p></div>" +
            "<button class=\"icon-button glucose-entry__close\" type=\"button\" aria-label=\"Close\"><svg class=\"icon-button__icon\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z\"/></svg></button></div>" +
            "<ol class=\"glucose-entry__steps\"></ol>" +
            "<div class=\"glucose-entry__bluetooth\" hidden>" +
            "<button class=\"button button--secondary\" type=\"button\" data-glucose-connect><span class=\"button__text\">Connect glucometer</span></button>" +
            "<p class=\"glucose-entry__note\" aria-live=\"polite\" data-glucose-bluetooth></p></div>" +
            "<form class=\"glucose-entry__form\" novalidate>" +
            "<div class=\"glucose-entry__row\">" +
            "<div class=\"field\"><label class=\"field__label\" for=\"glucose-value\">Reading</label>" +
            "<input class=\"field__input\" id=\"glucose-value\" type=\"number\" inputmode=\"decimal\" step=\"any\" required aria-describedby=\"glucose-hint glucose-error\"></div>" +
            "<div class=\"field glucose-entry__unit\"><label class=\"field__label\" for=\"glucose-unit\">Unit</label>" +
            "<select class=\"field__input\" id=\"glucose-unit\"><option value=\"mgdl\">mg/dL</option><option value=\"mmol\">mmol/L</option></select></div>" +
            "</div>" +
            "<p class=\"field__hint\" id=\"glucose-hint\"></p>" +
            "<p class=\"field__error\" id=\"glucose-error\" hidden></p>" +
            "<button class=\"button button--primary glucose-entry__save\" type=\"submit\"><span class=\"button__text\">Save reading</span></button>" +
            "</form></div>";
        var steps = dialog.querySelector(".glucose-entry__steps");
        STEPS.forEach(function (text) {
            var li = document.createElement("li");
            li.className = "glucose-entry__step";
            li.textContent = text;
            steps.appendChild(li);
        });
        document.body.appendChild(dialog);

        announcer = document.createElement("p");
        announcer.className = "sr-only";
        announcer.setAttribute("aria-live", "polite");
        document.body.appendChild(announcer);

        var input = dialog.querySelector("#glucose-value");
        var unit = dialog.querySelector("#glucose-unit");
        var hint = dialog.querySelector("#glucose-hint");
        var error = dialog.querySelector("#glucose-error");

        function renderHint() {
            hint.textContent = UNITS[unit.value].hint;
        }
        renderHint();
        unit.addEventListener("change", renderHint);

        function showError(text) {
            error.textContent = text;
            error.hidden = !text;
            input.classList.toggle("field__input--invalid", Boolean(text));
            if (text) {
                input.setAttribute("aria-invalid", "true");
            } else {
                input.removeAttribute("aria-invalid");
            }
        }
        input.addEventListener("input", function () {
            showError("");
        });

        dialog.querySelector(".glucose-entry__form").addEventListener("submit", function (event) {
            event.preventDefault();
            var typed = parseFloat(String(input.value).replace(",", "."));
            if (isNaN(typed)) {
                showError("Enter the number shown on the glucometer.");
                input.focus();
                return;
            }
            var mgDl = UNITS[unit.value].toMgDl(typed);
            if (mgDl < range.min || mgDl > range.max) {
                showError("This reading is outside what a glucometer shows. " + UNITS[unit.value].hint + " Measure again.");
                input.focus();
                return;
            }
            finish(mgDl, "manual");
        });

        dialog.querySelector(".glucose-entry__close").addEventListener("click", function () {
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

        // Web Bluetooth: Chrome and Edge on desktop and Android, only on a secure page
        if (navigator.bluetooth && window.isSecureContext) {
            dialog.querySelector(".glucose-entry__bluetooth").hidden = false;
            dialog.querySelector("[data-glucose-connect]").addEventListener("click", connect);
        }
    }

    function finish(mgDl, source) {
        var member = App.getProfile().member;
        App.glucose.save(member, mgDl, source);
        var status = App.glucose.status(mgDl);
        var text = "Saved: " + App.glucose.metric.format(mgDl) + ". " + (status === "ok" ? "In range." : status === "warn" ? "Watch." : "Act now.");
        dialog.close();
        if (status === "danger" && mgDl < range.actLow) {
            if (App.isFlight() && App.emergency) {
                App.emergency.start("low-glucose", "glucose");
                return;
            }
            text += " Take 15 g of fast sugar now and call your flight surgeon.";
        } else if (status === "danger") {
            text += App.isFlight() ? " Tell the crew medical officer now." : " Call your flight surgeon now.";
        }
        announcer.textContent = text;
    }

    /*
     * Glucose Profile: service 0x1808, Glucose Measurement 0x2A18 (notify) and the Record Access Control Point
     * 0x2A52 (indicate). Asks the meter for its last stored record (opcode 1 "report stored records", operator 6 "last").
     */
    function connect() {
        var note = dialog.querySelector("[data-glucose-bluetooth]");
        var device = null;
        note.textContent = "Choose your glucometer in the list…";
        navigator.bluetooth.requestDevice({ filters: [{ services: ["glucose"] }] }).then(function (chosen) {
            device = chosen;
            note.textContent = "Connecting to " + (device.name || "the glucometer") + "…";
            return device.gatt.connect();
        }).then(function (server) {
            return server.getPrimaryService("glucose");
        }).then(function (service) {
            return Promise.all([
                service.getCharacteristic("glucose_measurement"),
                service.getCharacteristic("record_access_control_point")
            ]);
        }).then(function (characteristics) {
            var measurement = characteristics[0];
            var control = characteristics[1];
            var last = null;
            measurement.addEventListener("characteristicvaluechanged", function (event) {
                var reading = App.glucose.parseMeasurement(event.target.value);
                if (reading.mgDl !== null) {
                    last = reading;
                }
            });
            control.addEventListener("characteristicvaluechanged", function () {
                // The meter answers on the control point once every record was sent
                if (device.gatt.connected) {
                    device.gatt.disconnect();
                }
                if (!last) {
                    note.textContent = "No reading found on the glucometer. Measure, then connect again or type the number.";
                    return;
                }
                dialog.querySelector("#glucose-unit").value = "mgdl";
                dialog.querySelector("#glucose-unit").dispatchEvent(new Event("change"));
                dialog.querySelector("#glucose-value").value = Math.round(last.mgDl);
                note.textContent = "Read from the glucometer: " + App.glucose.metric.format(last.mgDl) + " at " + App.formatTime(new Date(last.time)) + ". Check it and save.";
            });
            return measurement.startNotifications().then(function () {
                return control.startNotifications();
            }).then(function () {
                return control.writeValue(new Uint8Array([0x01, 0x06]));
            });
        }).catch(function (problem) {
            if (device && device.gatt.connected) {
                device.gatt.disconnect();
            }
            note.textContent = problem && problem.name === "NotFoundError"
                ? "No glucometer chosen. Type the number instead."
                : "Could not read the glucometer. Type the number instead.";
        });
    }

    function open(from) {
        if (!dialog) {
            build();
        }
        opener = from || document.activeElement;
        var input = dialog.querySelector("#glucose-value");
        input.value = "";
        input.classList.remove("field__input--invalid");
        input.removeAttribute("aria-invalid");
        dialog.querySelector("#glucose-error").hidden = true;
        var note = dialog.querySelector("[data-glucose-bluetooth]");
        if (note) {
            note.textContent = "";
        }
        dialog.showModal();
        input.focus();
    }

    App.glucoseEntry = { open: open };
})();
