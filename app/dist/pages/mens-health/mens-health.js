(function () {
"use strict";
var App = window.App;
var mode = App.getMode();
var modeKey = App.getModeKey();
var OCT_ALERT_RISE = 15; // µm: earlier than the general +20 µm, since SANS is more common in men
var NOISE_LIMIT = 65; // dBA over 24 h (limit used by this prototype)
var NOISE_TODAY = { station: 62, moon: 58, mars: 60 }; // dBA (simulated)
var HEARING_TEST_EVERY = 30; // days
if (App.getProfile().key !== "male") {
document.querySelectorAll("main > section").forEach(function (section) {
section.hidden = !(section.classList.contains("page-intro") || section.hasAttribute("data-other-profile"));
});
return;
}
var state = App.store.get("mens-health", {});
state.enabled = state.enabled !== false;
function $(selector) {
return document.querySelector(selector);
}
function setText(selector, text) {
var el = $(selector);
if (el) {
el.textContent = text;
}
}
function save() {
App.store.set("mens-health", state);
}
function announce(message) {
setText("[data-announcer]", message);
}
function todayKey() {
return new Date().toISOString().slice(0, 10);
}
function setBadge(name, level, text, icon) {
var badge = $("[data-" + name + "-badge]");
badge.classList.remove("badge--ok", "badge--warn", "badge--danger", "badge--soon");
badge.classList.add("badge--" + level);
$("[data-" + name + "-icon]").setAttribute("href", icon || (level === "ok" ? "#icon-check" : "#icon-alert"));
setText("[data-" + name + "-badge-text]", text);
}
function sharingSummary() {
var sharing = App.getPrivacy().mens;
var people = [];
if (sharing.surgeon) {
people.push("your flight surgeon");
}
if (sharing.cmo) {
people.push("the crew medical officer");
}
if (sharing.research) {
people.push("researchers (anonymized)");
}
return people.length ? "Shared with you and " + people.join(", ") + "." : "Only you can see this module.";
}
function canMedicalLeadSee() {
var sharing = App.getPrivacy().mens;
return App.getMedicalLead().crewLeads ? sharing.cmo : sharing.surgeon;
}
var moduleSwitch = $("[data-module-switch]");
var contents = document.querySelectorAll("[data-module-content]");
function renderModule() {
moduleSwitch.checked = state.enabled;
setText("[data-module-state]", state.enabled ? "On" : "Off");
contents.forEach(function (section) {
section.hidden = !state.enabled || !App.isPhaseVisible(section);
});
}
moduleSwitch.addEventListener("change", function () {
state.enabled = moduleSwitch.checked;
save();
renderModule();
announce(state.enabled ? "Men's health focus turned on. Its sections for this mission phase are now shown below." : "Men's health focus turned off. Your saved data stays on this device.");
});
(function () {
var oct = App.getOctExams(OCT_ALERT_RISE);
var points = oct.exams.map(function (e) {
return { x: e.day, y: e.value, title: (e.day === 0 ? "Launch" : "Day " + e.day) + ": " + e.value + " µm" };
});
var lastDay = App.missionDayFor(mode);
App.charts.line($("[data-oct-chart]"), points, {
yMin: 330, yMax: 380, yTicks: [330, 340, 350, 360, 370, 380],
xTicks: App.charts.dayTicks(lastDay), xMax: Math.max(lastDay, 1),
threshold: oct.threshold,
isWarn: function (p) { return p.y >= oct.threshold; }
});
setText("[data-oct-summary]", oct.rise + " µm above your launch value (earlier alert at +" + OCT_ALERT_RISE + " µm). " +
(oct.alert ? "Above the alert level: your medical lead reviews today's scan." : "Within the normal range."));
setBadge("oct", oct.alert ? "warn" : "ok", oct.alert ? "Review today" : "Normal");
$("[data-oct-card]").classList.toggle("card--warn", oct.alert);
App.charts.table($("[data-oct-table]"), "Retina thickness at the optic nerve, in micrometers", ["Mission day", "Thickness (µm)"],
oct.exams.map(function (e) { return [e.day === 0 ? "Launch" : String(e.day), String(e.value)]; }));
})();
var eyeInputs = document.querySelectorAll("[data-eye-symptom]");
var eyeResult = $("[data-eye-result]");
eyeInputs.forEach(function (input) {
input.addEventListener("change", function () {
input.closest(".choice").classList.toggle("choice--active", input.checked);
});
});
function notice(level, title, lines) {
var icon = level === "info" ? "#icon-check" : "#icon-alert";
eyeResult.innerHTML = '<div class="notice notice--' + level + '"><svg class="notice__icon" aria-hidden="true"><use href="' + icon + '"/></svg><div class="notice__text"><p class="notice__title"></p></div></div>';
eyeResult.querySelector(".notice__title").textContent = title;
var text = eyeResult.querySelector(".notice__text");
lines.forEach(function (line) {
var p = document.createElement("p");
p.textContent = line;
text.appendChild(p);
});
}
function renderEyeLog() {
var log = state.eyes;
if (!log || log.date !== todayKey()) {
eyeResult.textContent = "";
return;
}
if (!log.symptoms.length) {
notice("info", "Logged at " + log.time + ": no vision changes today.", ["Thanks. Keep up the daily check-in."]);
return;
}
var lines = [
"You logged: " + log.symptoms.join(", ").toLowerCase() + ".",
"Avoid long close-up work today and do a near-vision chart test. Sudden loss of vision or a strong headache needs your medical lead now."
];
lines.push(canMedicalLeadSee()
? "Shared with your medical lead: " + App.getMedicalLead().name.toLowerCase() + ". " + (App.isFlight() ? "Today's OCT scan will be reviewed with this in mind." : "Your post-flight eye exam will take this into account.")
: "Not shared: your medical lead cannot see this check-in. You can share it in Privacy.");
notice("warn", "Logged at " + log.time + ": vision changes to review", lines);
}
function logEyes(symptoms) {
state.eyes = { date: todayKey(), time: App.formatTime(new Date()), symptoms: symptoms };
state.logs = (state.logs || 0) + 1;
save();
renderEyeLog();
renderResearch();
}
$("[data-eye-log]").addEventListener("click", function () {
var chosen = [];
eyeInputs.forEach(function (input) {
if (input.checked) {
chosen.push(input.value);
}
});
if (!chosen.length) {
notice("info", "Choose at least one change", ["Or press No changes today."]);
return;
}
logEyes(chosen);
});
$("[data-eye-none]").addEventListener("click", function () {
eyeInputs.forEach(function (input) {
input.checked = false;
input.closest(".choice").classList.remove("choice--active");
});
logEyes([]);
});
if (state.eyes && state.eyes.date === todayKey()) {
eyeInputs.forEach(function (input) {
input.checked = state.eyes.symptoms.indexOf(input.value) !== -1;
input.closest(".choice").classList.toggle("choice--active", input.checked);
});
}
(function () {
var noise = NOISE_TODAY[modeKey];
var over = noise >= NOISE_LIMIT;
setText("[data-noise-value]", String(noise));
$("[data-noise-fill]").setAttribute("width", Math.min(100, (noise / 85) * 100).toFixed(1));
$("[data-noise-fill]").classList.toggle("hearing__fill--warn", over);
setBadge("noise", over ? "warn" : "ok", over ? "Over limit" : "Below limit");
setText("[data-noise-text]", (over ? "Above" : "Below") + " the 24-hour limit used in this prototype (" + NOISE_LIMIT + " dBA). Wear earplugs during exercise and in loud modules.");
})();
function daysSince(dateKey) {
return Math.floor((Date.parse(todayKey()) - Date.parse(dateKey)) / 864e5);
}
function renderHearingTest() {
var last = state.hearingTest;
var button = $("[data-test-button]");
if (last) {
var due = HEARING_TEST_EVERY - daysSince(last);
setBadge("test", due > 0 ? "ok" : "warn", due > 0 ? "Next in " + due + " days" : "Due now", due > 0 ? "#icon-check" : "#icon-alert");
setText("[data-test-text]", "Last test logged on " + last + ". On-board hearing tests run every " + HEARING_TEST_EVERY + " days, so slow changes are seen early.");
setText("[data-test-button-text]", "Undo last log");
button.classList.remove("button--secondary");
button.classList.add("button--tertiary");
} else if (App.getPhase().key === "pre") {
setBadge("test", "soon", "Baseline before launch", "#icon-clock");
setText("[data-test-text]", "A baseline hearing test before launch is the reference for every test in flight.");
setText("[data-test-button-text]", "Log hearing test done");
button.classList.add("button--secondary");
button.classList.remove("button--tertiary");
} else if (App.getPhase().key === "post") {
setBadge("test", "warn", "Post-flight test due", "#icon-alert");
setText("[data-test-text]", "A hearing test after landing is compared with your pre-flight baseline to see any change from the mission.");
setText("[data-test-button-text]", "Log hearing test done");
button.classList.add("button--secondary");
button.classList.remove("button--tertiary");
} else {
setBadge("test", "soon", "Due in 5 days", "#icon-clock");
setText("[data-test-text]", "On-board hearing tests run every " + HEARING_TEST_EVERY + " days, so slow changes are seen early.");
setText("[data-test-button-text]", "Log hearing test done");
button.classList.add("button--secondary");
button.classList.remove("button--tertiary");
}
}
$("[data-test-button]").addEventListener("click", function () {
if (state.hearingTest) {
state.hearingTest = null;
state.logs = Math.max(0, (state.logs || 0) - 1);
announce("Hearing test log removed.");
} else {
state.hearingTest = todayKey();
state.logs = (state.logs || 0) + 1;
announce("Hearing test logged for today. Next one in " + HEARING_TEST_EVERY + " days.");
}
save();
renderHearingTest();
renderResearch();
});
(function () {
var dose = App.getRadiation(mode);
var phaseNow = App.getPhase();
setText("[data-dose-total]", Math.round(dose.total) + " mSv");
setText("[data-dose-end]", Math.round(dose.projected) + " mSv");
if (phaseNow.key === "pre") {
setText("[data-repro-title]", "Reproductive health");
setText("[data-repro-text]", "In flight, the cells that make sperm are among the most radiation-sensitive in the body, and testosterone drops during long missions before recovering after landing. Ask in your private medical conference if you want a baseline check before launch.");
} else if (phaseNow.key === "post") {
setText("[data-repro-title]", "Reproductive health");
setText("[data-repro-text]", "Day " + phaseNow.daysSinceLanding + " back on Earth: testosterone usually returns to normal about 15 days after landing. The cells that make sperm are sensitive to radiation, and studies of spaceflight found less mobile sperm and more DNA damage in sperm.");
}
})();
var researchSwitch = $("[data-research-switch]");
function renderResearch() {
var shared = App.getPrivacy().mens.research;
researchSwitch.checked = shared;
setText("[data-research-state]", shared ? "Anonymized data shared" : "Not shared");
setText("[data-research-count]", shared
? "Your anonymized logs this mission: " + (state.logs || 0) + ". Thank you for helping future crews."
: "Not shared. You can change this anytime.");
}
researchSwitch.addEventListener("change", function () {
var privacy = App.getPrivacy();
privacy.mens.research = researchSwitch.checked;
App.savePrivacy(privacy);
renderResearch();
setText("[data-sharing-summary]", sharingSummary());
announce(researchSwitch.checked
? "Researchers now get your anonymized men's health data. Your name is never shared."
: "Researchers no longer get your men's health data.");
});
setText("[data-sharing-summary]", sharingSummary());
renderModule();
renderEyeLog();
renderHearingTest();
renderResearch();
})();