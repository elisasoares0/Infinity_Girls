(function () {
"use strict";
var App = window.App;
var dialog = document.querySelector("[data-sos]");
var banner = document.querySelector("[data-crew-alert]");
if (!dialog || !App.crew || !App.guides) {
return;
}
var profile = App.getProfile();
var isDoctor = profile.key === "doctor";
var CRITICAL_KEYS = ["resp", "spo2", "hr", "bp", "temp"];
var SPOKEN = {
hr: function (item) {
return "heart rate " + Math.round(item.value);
},
spo2: function (item) {
return "oxygen " + Math.round(item.value) + " percent";
},
resp: function (item) {
return item.value === 0 ? "no breathing detected" : "breathing " + Math.round(item.value) + " a minute";
},
glucose: function (item) {
return "blood glucose " + Math.round(item.value) + " milligrams per deciliter";
},
bp: function (item) {
return "blood pressure " + item.text.replace(" mmHg", "").replace("/", " over ");
},
temp: function (item) {
return "temperature " + item.value.toFixed(1) + " degrees";
}
};
function $(selector) {
return dialog.querySelector(selector);
}
function spokenName(name) {
return String(name || "").replace(/^Cmdr\.\s/, "Commander ").replace(/^Eng\.\s/, "Engineer ")
.replace(/^Dr\.\s/, "Doctor ").replace(/^Spc\.\s/, "Specialist ");
}
function initialsOf(name) {
return String(name || "").split(/[s.]+/).filter(Boolean).slice(0, 2).map(function (word) {
return word.charAt(0).toUpperCase();
}).join("");
}
function nowUtc() {
return App.formatTime(new Date());
}
var state = App.store.get("sos", null);
function save() {
App.store.set("sos", state);
}
function guideOf(current) {
var scenario = App.guides.scenarios[current.scenario] || App.guides.scenarios.manual;
var id = current.guide || scenario.guide;
return id ? App.guides.byId(id) : null;
}
function ownMember() {
return profile.member;
}
function criticalVitals(member) {
var order = { danger: 0, warn: 1, ok: 2 };
return App.crew.todayVitals(member).filter(function (item) {
return CRITICAL_KEYS.indexOf(item.key) !== -1 && item.signal;
}).sort(function (a, b) {
return order[a.status] - order[b.status];
}).filter(function (item, index) {
return item.status !== "ok" || index < 3;
}).slice(0, 5).map(function (item) {
return { key: item.key, label: item.label, text: item.text, status: item.status, value: item.value };
});
}
function spokenVitals(vitals, self) {
var parts = vitals.filter(function (item) {
return item.status !== "ok" && SPOKEN[item.key];
}).map(function (item) {
return SPOKEN[item.key](item);
});
if (!parts.length) {
return "";
}
var text = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0];
return self ? "your " + text.replace(/, /g, ", your ").replace(/ and /, " and your ").replace("your no breathing", "no breathing") : text;
}
function scenarioFrom(vitals) {
var sim = App.crew.getEmergencySim();
if (sim) {
return sim.scenario;
}
var byKey = {};
vitals.forEach(function (item) {
byKey[item.key] = item;
});
if (byKey.resp && byKey.resp.value === 0) {
return "collapse";
}
if (byKey.spo2 && byKey.spo2.status === "danger") {
return "low-oxygen";
}
if (byKey.temp && byKey.temp.status === "danger") {
return "high-fever";
}
return "critical";
}
var hearButton = $("[data-sos-hear]");
function say(text) {
if (!App.voice) {
return;
}
App.voice.speak(text, { priority: "emergency" });
hearButton.hidden = App.voice.canSpeak() || !App.voice.isOn() || !App.voice.isSupported();
if (navigator.vibrate) {
navigator.vibrate([400, 200, 400]);
}
}
hearButton.addEventListener("click", function () {
hearButton.hidden = true;
App.voice.repeat();
});
function fillScenario(template, current) {
var kit = App.habitat.kitModule(current.location ? current.location.id : null);
var responder = current.responder;
return App.guides.fill(template, {
name: spokenName(current.memberName),
vitals: current.spokenVitals,
location: current.location ? current.location.label.split(" · ")[0] : "the habitat",
kit: kit.label.split(" · ")[0],
responder: responder ? spokenName(responder.name) + " is " + App.habitat.hopsText(responder.hops) + "." : ""
});
}
function start(scenarioKey, reason) {
if (state && state.mode === "self" && !state.closed) {
open();
return;
}
var member = ownMember();
var person = App.crew.members[member];
var vitals = isDoctor ? [] : criticalVitals(member);
var glucose = scenarioKey === "low-glucose" && App.glucose ? App.glucose.latest(member) : null;
if (glucose) {
vitals = [{ key: "glucose", label: App.glucose.metric.label, text: App.glucose.metric.format(glucose.value), status: glucose.status, value: glucose.value }].concat(vitals);
}
var scenario = App.guides.scenarios[scenarioKey] || App.guides.scenarios.manual;
var location = App.habitat.locationOf(member);
var responder = App.habitat.responderFor(member, location.id);
state = {
mode: "self",
scenario: scenarioKey,
reason: reason,
title: scenario.title,
member: member,
memberName: person ? person.name : profile.name,
role: person ? person.role : "",
vitals: vitals,
spokenVitals: spokenVitals(vitals, !scenario.nearby),
location: { id: location.id, label: location.label },
responder: responder,
guide: scenario.guide,
step: 0,
log: [],
startedAt: Date.now(),
closed: false
};
state.alertId = App.crewLink ? App.crewLink.raise({
member: member,
memberName: state.memberName,
role: state.role,
scenario: scenarioKey,
title: scenario.title,
vitals: vitals.map(function (item) {
return { key: item.key, label: item.label, text: item.text, status: item.status, value: item.value };
}),
location: state.location
}) : null;
save();
open();
say(fillScenario(scenario.nearby || scenario.self, state));
speakStep();
}
var announced = {};
function respondTo(alert) {
var scenario = App.guides.scenarios[alert.scenario] || App.guides.scenarios.manual;
state = {
mode: "responder",
alertId: alert.id,
scenario: alert.scenario,
title: alert.title,
member: alert.member,
memberName: alert.memberName,
role: alert.role,
vitals: alert.vitals || [],
spokenVitals: spokenVitals(alert.vitals || [], false),
location: alert.location,
guide: scenario.guide,
step: 0,
log: [],
startedAt: alert.clientTime,
closed: false
};
save();
open();
}
var stepCount = $("[data-sos-step-count]");
var stepText = $("[data-sos-step-text]");
var stepHow = $("[data-sos-step-how]");
var nextButton = $("[data-sos-next]");
var pick = $("[data-sos-pick]");
var pickSelect = $("[data-sos-pick-select]");
var metronomeHolder = $("[data-sos-metronome]");
var crewLine = $("[data-sos-crew]");
var logLine = $("[data-sos-log]");
var locationSelect = $("[data-sos-location]");
var commandsButton = $("[data-sos-commands]");
var stopListening = null;
var beats = null;
App.guides.list.forEach(function (guide) {
var option = document.createElement("option");
option.value = guide.id;
option.textContent = guide.title;
pickSelect.appendChild(option);
});
pickSelect.addEventListener("change", function () {
if (!state || !pickSelect.value) {
return;
}
state.guide = pickSelect.value;
state.step = 0;
save();
renderStep();
speakStep();
});
function renderVitals() {
var list = $("[data-sos-vitals]");
list.textContent = "";
(state.vitals || []).forEach(function (item) {
var li = document.createElement("li");
var level = item.status === "danger" ? "danger" : item.status === "warn" ? "warn" : "ok";
li.className = "sos__vital sos__vital--" + level;
li.innerHTML = "<span class=\"sos__vital-label\"></span><span class=\"sos__vital-value\"></span>" +
"<span class=\"badge badge--" + level + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"#" + (level === "ok" ? "icon-check" : "icon-alert") + "\"/></svg><span class=\"badge__text\"></span></span>";
li.querySelector(".sos__vital-label").textContent = item.label;
li.querySelector(".sos__vital-value").textContent = item.text;
li.querySelector(".badge__text").textContent = level === "danger" ? "Act now" : level === "warn" ? "Watch" : "OK";
list.appendChild(li);
});
list.hidden = !(state.vitals || []).length;
}
function renderStep() {
var guide = guideOf(state);
pick.hidden = Boolean(guide);
metronomeHolder.hidden = !(guide && guide.cpr);
if (!guide) {
stepCount.textContent = "Pick what is happening";
stepText.textContent = "Choose the closest guide below. The crew is already on the way.";
stepHow.textContent = "";
nextButton.hidden = true;
return;
}
nextButton.hidden = false;
var done = state.step >= guide.steps.length;
stepCount.textContent = done ? "All " + guide.steps.length + " steps done" : "Step " + (state.step + 1) + " of " + guide.steps.length + " · " + guide.title;
stepText.textContent = done ? "Keep checking breathing and the vital signs until the crew medical officer takes over." : guide.steps[state.step];
stepHow.textContent = "";
if (!done) {
App.guides.kitFor(guide.steps[state.step]).forEach(function (kit) {
var p = document.createElement("p");
p.className = "sos__how";
p.innerHTML = "<span class=\"sos__how-label\"></span> ";
p.querySelector(".sos__how-label").textContent = "How to use the " + kit.name.toLowerCase() + ":";
p.appendChild(document.createTextNode(kit.how));
stepHow.appendChild(p);
});
}
nextButton.querySelector(".button__text").textContent = done ? "Done" : state.step === guide.steps.length - 1 ? "Mark done" : "Next step";
$("[data-sos-guide-link]").href = App.rootUrl("pages/emergency/index.html") + "#guide-" + guide.id;
}
function speakStep() {
var guide = guideOf(state);
if (!guide || state.step >= guide.steps.length) {
return;
}
say("Step " + (state.step + 1) + ". " + guide.steps[state.step]);
}
function renderLog() {
logLine.textContent = state.log.length
? "Log: " + state.log.map(function (entry) {
return entry.time + " · " + entry.text;
}).join(" · ")
: "Each step you mark is saved with its UTC time and sent to Earth at the next contact.";
}
function renderCrew() {
var alert = state.alertId && App.crewLink ? App.crewLink.get(state.alertId) : null;
var responders = (alert && alert.responders) || [];
var status = App.crewLink ? App.crewLink.status() : "off";
var line;
if (state.mode === "self") {
line = responders.length
? responders.map(function (item) {
return item.name;
}).join(" and ") + (responders.length === 1 ? " is" : " are") + " on the way."
: status === "offline" || navigator.onLine === false
? "No connection: the alert reaches the crew when the link is back. Call out to anyone nearby."
: "Alert sent to the crew with your location." + (state.responder ? " " + state.responder.name + " is " + App.habitat.hopsText(state.responder.hops) + "." : "");
} else {
var mine = responders.some(function (item) {
return item.member === ownMember();
});
line = mine ? "You are on the way. " : "";
line += responders.length ? "Responding: " + responders.map(function (item) {
return item.name;
}).join(", ") + "." : "Nobody has answered yet.";
}
crewLine.textContent = line;
$("[data-sos-respond]").hidden = state.mode !== "responder" || responders.some(function (item) {
return item.member === ownMember();
});
$("[data-sos-resolve]").hidden = !(state.mode === "responder" && isDoctor);
$("[data-sos-cancel]").hidden = state.mode !== "self";
}
function renderMap() {
var loc = state.location || {};
var responders = [];
if (state.mode === "responder") {
responders.push({ module: App.habitat.locationOf(ownMember()).id, initials: "You" });
} else if (state.responder) {
responders.push({ module: App.habitat.locationOf(state.responder.member).id, initials: initialsOf(state.responder.name) });
}
App.habitat.renderMap($("[data-sos-map]"), { alert: loc.id, responders: responders });
$("[data-sos-map-text]").textContent = App.habitat.describe(loc.id);
var field = $("[data-sos-location-field]");
field.hidden = state.mode !== "self";
if (state.mode === "self") {
locationSelect.textContent = "";
App.habitat.modules().forEach(function (module) {
var option = document.createElement("option");
option.value = module.id;
option.textContent = module.label;
option.selected = module.id === loc.id;
locationSelect.appendChild(option);
});
}
}
function render() {
dialog.classList.toggle("sos--responder", state.mode === "responder");
$("[data-sos-eyebrow]").textContent = (state.mode === "self" ? "Emergency" : "Crew emergency") + " · started " + App.formatTime(new Date(state.startedAt));
$("[data-sos-title]").textContent = state.mode === "self"
? state.title
: state.memberName + " needs help · " + state.title.toLowerCase();
renderVitals();
renderStep();
renderCrew();
renderMap();
renderLog();
renderBanner();
}
function open() {
if (!state) {
return;
}
state.closed = false;
save();
render();
if (!dialog.open) {
dialog.showModal();
}
$("[data-sos-title]").focus();
}
function minimize() {
if (state) {
state.closed = true;
save();
}
if (dialog.open) {
dialog.close();
}
if (beats) {
beats.stop();
}
renderBanner();
}
function finish(message) {
if (stopListening) {
stopListening();
stopListening = null;
}
if (beats) {
beats.stop();
}
if (dialog.open) {
dialog.close();
}
state = null;
App.store.remove("sos");
renderBanner();
if (App.voice) {
App.voice.stop();
if (message) {
App.voice.speak(message, { priority: "info" });
}
}
setCommands(false);
}
dialog.addEventListener("cancel", function (event) {
event.preventDefault();
});
function nextStep(fromVoice) {
var guide = guideOf(state);
if (!guide) {
return;
}
if (state.step >= guide.steps.length) {
minimize();
return;
}
var time = nowUtc();
state.log.push({ time: time, text: "step " + (state.step + 1) + " done" });
var pageLog = App.store.get("emergency-log", {});
pageLog[guide.id] = pageLog[guide.id] || {};
pageLog[guide.id][state.step] = time;
App.store.set("emergency-log", pageLog);
state.step += 1;
save();
renderStep();
renderLog();
if (state.step >= guide.steps.length) {
say("All steps done. Keep checking breathing until the crew medical officer takes over.");
} else {
speakStep();
}
if (!fromVoice) {
nextButton.focus();
}
}
nextButton.addEventListener("click", function () {
nextStep(false);
});
$("[data-sos-repeat]").addEventListener("click", function () {
if (App.voice) {
App.voice.repeat();
}
});
$("[data-sos-minimize]").addEventListener("click", minimize);
$("[data-sos-cancel]").addEventListener("click", function () {
var button = $("[data-sos-cancel]");
if (button.getAttribute("data-confirm") !== "yes") {
if (App.voice) {
App.voice.stop();
}
button.setAttribute("data-confirm", "yes");
button.querySelector(".button__text").textContent = "Tap again to cancel the alert";
window.setTimeout(function () {
button.removeAttribute("data-confirm");
button.querySelector(".button__text").textContent = "I'm OK, cancel the alert";
}, 5000);
return;
}
button.removeAttribute("data-confirm");
button.querySelector(".button__text").textContent = "I'm OK, cancel the alert";
if (state.alertId && App.crewLink) {
App.crewLink.resolve(state.alertId);
}
if (App.crew.getEmergencySim()) {
App.crew.setEmergencySim(null);
syncPreview();
}
finish("Alert cancelled. The crew has been told you are OK.");
});
$("[data-sos-respond]").addEventListener("click", function () {
App.crewLink.respond(state.alertId);
say("The crew knows you are on the way to " + (state.location ? state.location.label.split(" · ")[0] : "them") + ".");
renderCrew();
speakStep();
});
$("[data-sos-resolve]").addEventListener("click", function () {
App.crewLink.resolve(state.alertId);
if (App.crew.getEmergencySim()) {
App.crew.setEmergencySim(null);
syncPreview();
}
finish("Emergency resolved. Thank you.");
});
locationSelect.addEventListener("change", function () {
App.habitat.setLocation(state.member, locationSelect.value);
var module = App.habitat.moduleById(locationSelect.value);
state.location = { id: module.id, label: module.label };
save();
renderMap();
});
(function () {
var toggle = metronomeHolder.querySelector("[data-sos-beat]");
var dot = metronomeHolder.querySelector(".metronome__beat");
var clock = metronomeHolder.querySelector(".metronome__clock");
beats = App.guides.metronome({
onBeat: function (count, elapsed) {
dot.classList.toggle("metronome__beat--on", count % 2 === 0);
var seconds = Math.floor(elapsed / 1000);
clock.textContent = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
},
onCycle: function () {
say("Two minutes. Check breathing.");
}
});
toggle.addEventListener("click", function () {
var on = !beats.isRunning();
if (on) {
beats.start();
} else {
beats.stop();
}
toggle.setAttribute("aria-pressed", on ? "true" : "false");
toggle.querySelector(".button__text").textContent = on ? "Stop the beat" : "Start the compression beat";
});
})();
var commandsStatus = $("[data-sos-commands-status]");
var COMMAND_PROBLEMS = {
"not-allowed": "Voice commands need the microphone. Allow it in the browser, or use the buttons.",
"service-not-allowed": "Voice commands need the microphone. Allow it in the browser, or use the buttons.",
"audio-capture": "No microphone found. Use the buttons.",
network: "Voice commands need a connection. Use the buttons.",
ended: "Voice commands stopped. Turn them on again, or use the buttons."
};
function setCommands(on, problem) {
if (!on && stopListening) {
stopListening();
}
if (!on) {
stopListening = null;
}
commandsButton.setAttribute("aria-pressed", on ? "true" : "false");
commandsButton.querySelector(".button__text").textContent = on ? "Stop voice commands" : "Voice commands";
commandsStatus.textContent = on
? "Listening. Say “next”, “repeat” or “help”. The app does not listen while it is talking."
: problem ? COMMAND_PROBLEMS[problem] || COMMAND_PROBLEMS.ended : "";
commandsStatus.hidden = !commandsStatus.textContent;
}
commandsButton.hidden = !(App.voice && App.voice.canListen());
commandsButton.addEventListener("click", function () {
if (stopListening) {
setCommands(false);
return;
}
stopListening = App.voice.listen({
next: function () {
nextStep(true);
},
repeat: function () {
App.voice.repeat();
},
help: function () {
say("Help is on the way. " + crewLine.textContent);
}
}, {
onStop: function (reason) {
stopListening = null;
setCommands(false, reason);
}
});
setCommands(Boolean(stopListening), stopListening ? null : "network");
});
var openAlerts = [];
function renderBanner() {
if (!banner) {
return;
}
var others = openAlerts.filter(function (alert) {
return alert.member !== ownMember();
});
var text = "";
if (state && state.mode === "self") {
text = "Your emergency is open: " + state.title.toLowerCase() + ". " + crewLine.textContent;
} else if (others.length) {
var first = others[0];
text = first.memberName + " needs help in " + (first.location ? first.location.label.split(" · ")[0] : "the habitat") + ": " + first.title.toLowerCase() + "." +
(others.length > 1 ? " " + (others.length - 1) + " more open." : "");
banner.setAttribute("data-alert-id", first.id);
}
banner.hidden = !text || (dialog.open && (!others.length || (state && state.alertId === others[0].id)));
banner.querySelector("[data-crew-alert-text]").textContent = text;
}
banner.querySelector("[data-crew-alert-open]").addEventListener("click", function () {
if (state && state.mode === "self") {
open();
return;
}
var id = banner.getAttribute("data-alert-id");
var alert = openAlerts.filter(function (item) {
return item.id === id;
})[0];
if (alert) {
respondTo(alert);
}
});
function onAlerts(list) {
openAlerts = list;
var newest = list.filter(function (alert) {
return alert.member !== ownMember() && !announced[alert.id];
})[0];
list.forEach(function (alert) {
if (alert.member !== ownMember() && alert !== newest) {
announced[alert.id] = true;
}
});
list.forEach(function (alert) {
if (alert.member === ownMember()) {
(alert.responders || []).forEach(function (responder) {
var key = alert.id + ":" + responder.member;
if (!announced[key] && state && state.alertId === alert.id) {
announced[key] = true;
say(spokenName(responder.name) + " is on the way.");
}
});
return;
}
if (!announced[alert.id]) {
announced[alert.id] = true;
var scenario = App.guides.scenarios[alert.scenario] || App.guides.scenarios.manual;
var current = {
memberName: alert.memberName,
spokenVitals: spokenVitals(alert.vitals || [], false),
location: alert.location
};
if (!(state && state.mode === "self")) {
respondTo(alert);
}
say(fillScenario(scenario.crew, current));
}
});
if (state && state.mode === "responder" && !list.some(function (alert) {
return alert.id === state.alertId;
})) {
finish("The emergency of " + spokenName(state.memberName) + " is resolved.");
}
if (state && dialog.open) {
renderCrew();
}
renderBanner();
}
if (App.crewLink) {
App.crewLink.subscribe(onAlerts);
document.addEventListener("crewlink:status", function () {
if (state && dialog.open) {
renderCrew();
}
});
}
var lastDanger = null;
function dangerKeys() {
return App.crew.todayVitals(ownMember()).filter(function (item) {
return CRITICAL_KEYS.indexOf(item.key) !== -1 && item.signal && (item.status === "danger" || (item.key === "resp" && item.value === 0));
}).map(function (item) {
return item.key;
});
}
function check() {
if (!App.isFlight() || isDoctor || !App.getSavedProfileKey()) {
return;
}
var keys = dangerKeys();
var fresh = lastDanger !== null && keys.some(function (key) {
return lastDanger.indexOf(key) === -1;
});
lastDanger = keys;
if (fresh && !(state && state.mode === "self")) {
start(scenarioFrom(criticalVitals(ownMember())), "reading");
}
}
document.addEventListener("health:sample", check);
document.querySelectorAll("[data-sos-open]").forEach(function (button) {
button.addEventListener("click", function () {
if (state) {
open();
} else {
start("manual", "button");
}
});
});
var preview = document.querySelector("[data-emergency-preview]");
function syncPreview() {
if (preview) {
var sim = App.crew.getEmergencySim();
preview.value = sim ? sim.scenario : "none";
}
}
if (preview) {
syncPreview();
preview.addEventListener("change", function () {
App.crew.setEmergencySim(preview.value === "none" ? null : preview.value);
var demo = document.querySelector("[data-demo-panel]");
if (preview.value === "none") {
document.dispatchEvent(new CustomEvent("health:sample", { detail: { time: Date.now() } }));
return;
}
if (demo && demo.open) {
demo.close();
}
if (isDoctor) {
simulateCrewAlert(preview.value);
} else {
document.dispatchEvent(new CustomEvent("health:sample", { detail: { time: Date.now() } }));
if (!(state && state.mode === "self")) {
start(preview.value, "simulation");
}
}
});
}
function simulateCrewAlert(scenarioKey) {
var member = App.crew.demoMember();
var person = App.crew.members[member];
var scenario = App.guides.scenarios[scenarioKey] || App.guides.scenarios.manual;
var location = App.habitat.locationOf(member);
App.crewLink.raise({
member: member,
memberName: person.name,
role: person.role,
scenario: scenarioKey,
title: scenario.title,
vitals: criticalVitals(member).map(function (item) {
return { key: item.key, label: item.label, text: item.text, status: item.status, value: item.value };
}),
location: { id: location.id, label: location.label }
});
}
lastDanger = App.getSavedProfileKey() && !isDoctor ? dangerKeys() : [];
if (state && !state.closed) {
open();
} else if (state) {
renderBanner();
}
App.emergency = {
start: start,
open: open,
active: function () {
return state;
}
};
})();