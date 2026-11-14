/* Privacy page: sharing switches saved on board and announced */
(function () {
    "use strict";

    var AUDIENCE_NAMES = {
        surgeon: "Flight surgeon",
        cmo: "Crew medical officer",
        research: "Researchers"
    };

    var switches = document.querySelectorAll("[data-privacy]");
    var status = document.querySelector("[data-privacy-status]");
    var privacy = window.App.getPrivacy();

    function stateText(audience, isOn) {
        if (audience === "research") {
            return isOn ? "Anonymized data shared" : "Not shared";
        }
        return isOn ? "Can see" : "Cannot see";
    }

    function renderSwitch(input) {
        var parts = input.getAttribute("data-privacy").split(".");
        var label = input.closest(".switch").querySelector("[data-switch-state]");
        label.textContent = stateText(parts[1], input.checked);
    }

    switches.forEach(function (input) {
        var parts = input.getAttribute("data-privacy").split(".");
        input.checked = privacy[parts[0]][parts[1]];
        renderSwitch(input);

        input.addEventListener("change", function () {
            privacy[parts[0]][parts[1]] = input.checked;
            var saved = window.App.savePrivacy(privacy);
            renderSwitch(input);

            var change = AUDIENCE_NAMES[parts[1]] + (input.checked
                ? (parts[1] === "research" ? " now get anonymized " : " can now see ")
                : (parts[1] === "research" ? " no longer get " : " can no longer see ")) + input.getAttribute("data-name") + ".";

            status.textContent = saved
                ? change + " Saved on board at " + window.App.formatTime(new Date()) + ", sent to Earth at next sync."
                : change + " Could not save on this device: the change lasts until you leave this page.";
        });
    });
})();
