/*
 * Design system page: the live samples (segmented control, sample sheet, Lottie animations).
 * The real components behave the same way in the app; this file only wires the samples on this page.
 */
(function () {
    "use strict";

    var App = window.App;

    // Segmented control (a group of aria-pressed buttons): one selected option, its name said in text
    var group = document.querySelector("[data-ds-segmented]");
    var groupText = document.querySelector("[data-ds-segmented-text]");
    if (group) {
        group.addEventListener("click", function (event) {
            var option = event.target.closest(".segmented__option");
            if (!option) {
                return;
            }
            Array.prototype.forEach.call(group.querySelectorAll(".segmented__option"), function (item) {
                var on = item === option;
                item.classList.toggle("segmented__option--active", on);
                item.setAttribute("aria-pressed", on ? "true" : "false");
            });
            groupText.textContent = "Showing: " + option.textContent.trim();
        });
    }

    // Sample sheet: opens with showModal, closes by its buttons or Esc, the focus goes back to the opener
    var sheet = document.querySelector("[data-ds-sheet]");
    var opener = document.querySelector("[data-ds-sheet-open]");
    if (sheet && opener) {
        opener.addEventListener("click", function () {
            sheet.showModal();
            sheet.querySelector("[data-ds-sheet-close]").focus();
        });
        Array.prototype.forEach.call(sheet.querySelectorAll("[data-ds-sheet-close]"), function (button) {
            button.addEventListener("click", function () {
                sheet.close();
            });
        });
        sheet.addEventListener("close", function () {
            opener.focus();
        });
    }

    // Chart sample: the same App.charts.line the app uses (real size, 12px axis labels, normal range named in the legend)
    var chartSvg = document.querySelector("[data-ds-chart]");
    if (chartSvg && App.charts) {
        var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        var values = [92, 95, 89, 97, 93, 90, 96];
        App.charts.line(chartSvg, values.map(function (value, index) {
            return { x: index, y: value, title: days[index] + ": " + value + " mg/dL" };
        }), {
            yMin: 60, yMax: 120, yTicks: [70, 90, 110], xMax: 6, band: [70, 99],
            xTicks: days.map(function (day, index) { return { x: index, label: day }; })
        });
        App.charts.table(document.querySelector("[data-ds-chart-table]"), "Fasting glucose this week, mg/dL", ["Day", "mg/dL"],
            values.map(function (value, index) { return [days[index], String(value)]; }));
    }

    // Lottie samples: Play runs the animation once (the loader loops for 3 seconds)
    Array.prototype.forEach.call(document.querySelectorAll("[data-ds-motion]"), function (button) {
        button.addEventListener("click", function () {
            var name = button.getAttribute("data-ds-motion");
            var host = document.querySelector("[data-ds-motion-host='" + name + "']");
            if (!App.motion || !host) {
                return;
            }
            var loop = name === "orbit-loader";
            App.motion.play(name, host, { loop: loop }).then(function (animation) {
                if (animation && loop) {
                    window.setTimeout(function () {
                        animation.goToAndStop(0, true);
                    }, 3000);
                }
            });
        });
    });
})();
