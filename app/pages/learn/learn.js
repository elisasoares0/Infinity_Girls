/*
 * Learn page: your health risks for this mission phase.
 * Fills today's status next to each risk the sensors watch, says what gravity you are in, and opens the risk
 * named in the link (#risk-<id>, from the indicators and the emergency guides).
 */
(function () {
    "use strict";

    var App = window.App;
    var profile = App.getProfile();
    var STATUS = {
        ok: { word: "In range", icon: "#icon-check" },
        warn: { word: "Watch", icon: "#icon-alert" },
        danger: { word: "Act now", icon: "#icon-alert" }
    };
    var RANK = { ok: 0, warn: 1, danger: 2 };

    // Today's status of the indicators behind a risk: the worst of them, as a badge with icon and text
    function renderStatus() {
        var today = {};
        App.crew.todayVitals(profile.member).forEach(function (item) {
            today[item.key] = item;
        });
        // Blood glucose is a spot reading from the glucometer (assets/js/glucose.js), not a shirt sensor
        var glucose = App.glucose.latest(profile.member);
        if (glucose) {
            today.glucose = { status: glucose.status, signal: true };
        }
        document.querySelectorAll("[data-risk-status]").forEach(function (el) {
            var worst = null;
            el.getAttribute("data-risk-status").split(" ").forEach(function (key) {
                var item = today[key];
                if (item && item.signal !== false && STATUS[item.status] && (!worst || RANK[item.status] > RANK[worst])) {
                    worst = item.status;
                }
            });
            el.textContent = "";
            if (!worst) {
                return;
            }
            var badge = document.createElement("span");
            badge.className = "badge badge--" + worst;
            badge.innerHTML = "<svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" + STATUS[worst].icon + "\"/></svg><span class=\"badge__text\"></span>";
            badge.querySelector(".badge__text").textContent = "Today: " + STATUS[worst].word;
            el.appendChild(badge);
        });
    }

    // The gravity you are in now, from the destination and the surface context
    function renderGravity() {
        var key = App.getModeKey();
        var context = App.getContext(profile.member);
        var text = key === "station" || context === "transit"
            ? "Right now you float in microgravity."
            : key === "moon"
                ? "Right now you are in lunar gravity: you weigh about one sixth of your Earth weight."
                : "Right now you are in Martian gravity: you weigh about 38 % of your Earth weight.";
        document.querySelectorAll("[data-learn-gravity]").forEach(function (el) {
            el.textContent = text;
        });
    }

    /*
     * Opens the risk named in the address. Each phase has its own list, so the visible entry with the same
     * data-risk is used; when this phase has none, the page stays at the top.
     */
    function openFromHash() {
        var match = /^#risk-([a-z-]+)$/.exec(location.hash);
        if (!match) {
            return;
        }
        var target = Array.prototype.filter.call(document.querySelectorAll("[data-risk='" + match[1] + "']"), function (el) {
            return !el.closest("[hidden]") && App.isVisible(el);
        })[0];
        if (!target) {
            window.scrollTo(0, 0);
            return;
        }
        var focusable = target;
        if (target.tagName === "DETAILS") {
            target.open = true;
            focusable = target.querySelector("summary");
        } else {
            target.setAttribute("tabindex", "-1");
        }
        focusable.focus({ preventScroll: true });
        // Two frames later app.js has measured the sticky header (scroll padding), so the risk lands below it
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                target.scrollIntoView({ block: "start" });
            });
        });
    }

    renderStatus();
    renderGravity();
    // After load: the browser scrolls to the address fragment on its own and would drop an earlier focus
    if (document.readyState === "complete") {
        openFromHash();
    } else {
        window.addEventListener("load", openFromHash);
    }
    window.addEventListener("hashchange", openFromHash);

    // The shirt sends new readings every few seconds: keep the status current
    document.addEventListener("health:sample", renderStatus);
    document.addEventListener("glucose:change", renderStatus);
})();
