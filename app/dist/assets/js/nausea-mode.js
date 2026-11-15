(function () {
"use strict";
var App = window.App;
var DAY_MS = 864e5;
var profile = App.getProfile();
var member = profile.member;
var astronaut = Boolean(App.getSavedProfileKey()) && profile.key !== "doctor";
var banner = null;
var shown = null;
function key(who) {
return "nausea:" + (who || member);
}
function read(who) {
var state = App.store.get(key(who), null);
return state && typeof state === "object" ? state : { on: false };
}
function isOn() {
var state = read();
return astronaut && Boolean(state.on) && (!state.until || state.until > Date.now());
}
function write(state, who) {
App.store.set(key(who), state);
apply();
}
function logged(who, row) {
var state = read(who);
var now = Date.now();
write({
on: true,
since: state.on && state.since ? state.since : now,
until: now + DAY_MS,
last: { text: App.symptoms ? App.symptoms.label(row) : "", at: now }
}, who);
}
function on() {
var state = read();
write({ on: true, since: state.on && state.since ? state.since : Date.now(), until: null, last: state.last || null });
}
function off() {
write({ on: false });
}
var STEPS = [
"Keep your head still and look at one fixed point.",
"Take small sips of water.",
"Keep an emesis bag close (medical kit).",
"Vomited more than twice, or water does not stay down? Tell your {lead} now."
];
function steps() {
var lead = App.getMedicalLead().name.replace(/ \(.*\)/, "").toLowerCase();
return STEPS.map(function (step) {
return step.replace("{lead}", lead);
});
}
function metaText() {
var state = read();
var last = state.last && state.last.text ? state.last.text + " at " + App.formatTime(new Date(state.last.at)) + ". " : "";
return last + "Head still, eyes on one fixed point, small sips of water.";
}
function buildBanner(main) {
banner = document.createElement("section");
banner.className = "nausea";
banner.setAttribute("aria-labelledby", "nausea-title");
banner.setAttribute("data-essential", "");
banner.innerHTML =
"<div class=\"nausea__container\">" +
"<div class=\"nausea__panel\" tabindex=\"-1\">" +
"<svg class=\"nausea__icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4-4 6 6 0 1 1-6 6\"/></svg>" +
"<div class=\"nausea__body\">" +
"<p class=\"nausea__title\" id=\"nausea-title\">Nausea mode</p>" +
"<p class=\"nausea__meta\" data-nausea-meta></p>" +
"<details class=\"nausea__more\">" +
"<summary class=\"nausea__summary\">What helps now</summary>" +
"<ol class=\"nausea__steps\" data-nausea-steps></ol>" +
"</details>" +
"</div>" +
"<div class=\"nausea__actions\">" +
"<button class=\"button button--primary\" type=\"button\" data-nausea-off><span class=\"button__text\">I feel better</span></button>" +
"<button class=\"button button--secondary\" type=\"button\" data-nausea-read><span class=\"button__text\">Read aloud</span></button>" +
"</div>" +
"</div></div>";
banner.querySelector("[data-nausea-off]").addEventListener("click", function () {
off();
var target = document.querySelector("main h1") || document.querySelector("main");
if (target) {
if (!target.hasAttribute("tabindex")) {
target.setAttribute("tabindex", "-1");
}
target.focus();
}
});
banner.querySelector("[data-nausea-read]").addEventListener("click", function () {
if (App.voice) {
App.voice.speak("Nausea mode. " + steps().join(" "), { priority: "info" });
}
});
main.insertBefore(banner, main.firstChild);
}
function renderBanner(active) {
var main = document.querySelector("main");
if (!main) {
return;
}
if (!active) {
if (banner) {
banner.hidden = true;
}
return;
}
if (!banner) {
buildBanner(main);
}
banner.querySelector("[data-nausea-meta]").textContent = metaText();
var list = banner.querySelector("[data-nausea-steps]");
list.innerHTML = "";
steps().forEach(function (text) {
var item = document.createElement("li");
item.className = "nausea__step";
item.textContent = text;
list.appendChild(item);
});
banner.hidden = false;
}
function apply() {
var active = isOn();
if (active) {
document.documentElement.setAttribute("data-nausea", "on");
} else {
document.documentElement.removeAttribute("data-nausea");
}
renderBanner(active);
if (shown !== active) {
var first = shown === null;
shown = active;
if (!first) {
document.dispatchEvent(new CustomEvent("nausea:change", { detail: { on: active } }));
}
}
}
App.nausea = {
isOn: isOn,
on: on,
off: off,
logged: logged,
state: function () {
return read();
},
element: function () {
return banner && !banner.hidden ? banner.querySelector(".nausea__panel") : null;
}
};
if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", apply);
} else {
apply();
}
window.setInterval(apply, 60000);
window.addEventListener("storage", function (event) {
if (event.key && event.key.indexOf("nausea:") !== -1) {
apply();
}
});
})();