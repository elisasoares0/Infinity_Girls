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
function renderStatus() {
var today = {};
App.crew.todayVitals(profile.member).forEach(function (item) {
today[item.key] = item;
});
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
requestAnimationFrame(function () {
requestAnimationFrame(function () {
target.scrollIntoView({ block: "start" });
});
});
}
renderStatus();
renderGravity();
if (document.readyState === "complete") {
openFromHash();
} else {
window.addEventListener("load", openFromHash);
}
window.addEventListener("hashchange", openFromHash);
document.addEventListener("health:sample", renderStatus);
document.addEventListener("glucose:change", renderStatus);
})();