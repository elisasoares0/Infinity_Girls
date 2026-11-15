(function () {
"use strict";
var App = window.App;
if (!App.isFlight()) {
return; // On Earth the page only shows how to call for help
}
var GUIDES = App.guides.list;
function $(selector) {
return document.querySelector(selector);
}
function setText(selector, text) {
var el = $(selector);
if (el) {
el.textContent = text;
}
}
(function renderLead() {
var mode = App.getMode();
var isDoctor = App.getProfile().key === "doctor";
var notice = $("[data-lead-notice]");
var onBoard = mode.crewLeads || App.isLinkLost();
notice.classList.toggle("notice--warn", onBoard);
notice.classList.toggle("notice--info", !onBoard);
notice.querySelector("use").setAttribute("href", onBoard ? "#icon-alert" : "#icon-info");
if (App.isLinkLost()) {
setText("[data-lead-title]", isDoctor ? "No contact with Earth: you lead" : "No contact with Earth: Dr. Okafor leads on board");
setText("[data-lead-text]", "Start the steps now. Everything you tick is saved with the time and sent at the next contact.");
} else if (mode.crewLeads) {
setText("[data-lead-title]", isDoctor ? "You lead on board" : "Call Dr. Okafor and start the steps");
setText("[data-lead-text]", "Earth is " + mode.delay + " away in each direction. Start now and send the log; do not wait for a reply.");
} else {
setText("[data-lead-title]", "Call the flight surgeon and start the steps");
setText("[data-lead-text]", "The delay is " + mode.delay + ". " + (isDoctor ? "Lead on board while the flight surgeon joins." : "Dr. Okafor helps on board while the flight surgeon joins."));
}
})();
var log = App.store.get("emergency-log", {});
function save() {
App.store.set("emergency-log", log);
}
function logText(guide) {
var entries = log[guide.id] || {};
var lines = Object.keys(entries).sort(function (a, b) {
return a - b;
}).map(function (index) {
return entries[index] + " · step " + (Number(index) + 1) + " done";
});
return lines.length
? lines.join(" · ") + ". Saved on board" + (App.isLinkLost() ? ", sent at the next contact." : " and sent at the next sync.")
: "Nothing logged yet. Tick each step as you do it.";
}
var LOOK = {
collapse: { icon: "<path d=\"M72,144H32a8,8,0,0,1,0-16H67.72l13.62-20.44a8,8,0,0,1,13.32,0l25.34,38,9.34-14A8,8,0,0,1,136,128h24a8,8,0,0,1,0,16H140.28l-13.62,20.44a8,8,0,0,1-13.32,0L88,126.42l-9.34,14A8,8,0,0,1,72,144ZM178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,.75,0,1.5,0,2.25a8,8,0,1,0,16-.5c0-.58,0-1.17,0-1.75A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46c0,53.61-77.76,102.15-96,112.8-10.83-6.31-42.63-26-66.68-52.21a8,8,0,1,0-11.8,10.82c31.17,34,72.93,56.68,74.69,57.63a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40Z\"/>", level: "critical" },
chest: { icon: "<path d=\"M178,40a61.6,61.6,0,0,0-43.84,18.16L128,64.32l-6.16-6.16A62,62,0,0,0,16,102c0,70,103.79,126.67,108.21,129a8,8,0,0,0,7.58,0C136.21,228.67,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102a46,46,0,0,1,78.53-32.53l6.16,6.16L106.34,86a8,8,0,0,0,0,11.31l24.53,24.53-16.53,16.52a8,8,0,0,0,11.32,11.32l22.18-22.19a8,8,0,0,0,0-11.31L123.31,91.63l22.16-22.16A46,46,0,0,1,224,102C224,155.61,146.24,204.15,128,214.8Z\"/>", level: "critical" },
breathing: { icon: "<path d=\"M184,184a32,32,0,0,1-32,32c-13.7,0-26.95-8.93-31.5-21.22a8,8,0,0,1,15-5.56C137.74,195.27,145,200,152,200a16,16,0,0,0,0-32H40a8,8,0,0,1,0-16H152A32,32,0,0,1,184,184Zm-64-80a32,32,0,0,0,0-64c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C105.74,60.73,113,56,120,56a16,16,0,0,1,0,32H24a8,8,0,0,0,0,16Zm88-32c-13.7,0-26.95,8.93-31.5,21.22a8,8,0,0,0,15,5.56C193.74,92.73,201,88,208,88a16,16,0,0,1,0,32H32a8,8,0,0,0,0,16H208a32,32,0,0,0,0-64Z\"/>", level: "critical" },
glucose: { icon: "<path d=\"M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM128,216a72.08,72.08,0,0,1-72-72c0-57.23,55.47-105,72-118,16.53,13,72,60.75,72,118A72.08,72.08,0,0,1,128,216Zm55.89-62.66a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z\"/>", level: "urgent" },
allergy: { icon: "<path d=\"M237.66,66.34l-48-48a8,8,0,0,0-11.32,11.32L196.69,48,168,76.69,133.66,42.34a8,8,0,0,0-11.32,11.32L128.69,60l-84,84A15.86,15.86,0,0,0,40,155.31v49.38L18.34,226.34a8,8,0,0,0,11.32,11.32L51.31,216h49.38A15.86,15.86,0,0,0,112,211.31l84-84,6.34,6.35a8,8,0,0,0,11.32-11.32L179.31,88,208,59.31l18.34,18.35a8,8,0,0,0,11.32-11.32ZM100.69,200H56V155.31l18-18,20.34,20.35a8,8,0,0,0,11.32-11.32L85.31,126,98,113.31l20.34,20.35a8,8,0,0,0,11.32-11.32L109.31,102,140,71.31,184.69,116Z\"/>", level: "critical" },
bleeding: { icon: "<path d=\"M184.57,128l27.71-27.72a40,40,0,1,0-56.56-56.56L128,71.43,100.28,43.72a40,40,0,1,0-56.56,56.56L71.43,128,43.72,155.72a40,40,0,1,0,56.56,56.56L128,184.57l27.72,27.71a40,40,0,1,0,56.56-56.56ZM167,55A24,24,0,1,1,201,89l-27.72,27.72L139.31,82.75Zm-5.09,73L128,161.94,94.06,128,128,94.06ZM55,89h0A24,24,0,1,1,89,55l27.72,27.72L82.75,116.69ZM89,201A24,24,0,1,1,55,167l27.72-27.72,33.94,33.94Zm112,0A24,24,0,0,1,167,201l-27.72-27.72,33.94-33.94L201,167A24,24,0,0,1,201,201Zm-85-73a12,12,0,1,1,12,12A12,12,0,0,1,116,128Z\"/>", level: "critical" },
head: { icon: "<path d=\"M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,0,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Zm16-52a8,8,0,0,1-8,8h-4a36,36,0,0,1-36-36V80a8,8,0,0,1,16,0v4a20,20,0,0,0,20,20h4A8,8,0,0,1,208,112ZM60,120H56a8,8,0,0,1,0-16h4A20,20,0,0,0,80,84V80a8,8,0,0,1,16,0v4A36,36,0,0,1,60,120Z\"/>", level: "urgent" },
eye: { icon: "<path d=\"M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z\"/>", level: "urgent" },
burn: { icon: "<path d=\"M183.89,153.34a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68ZM216,144a88,88,0,0,1-176,0c0-27.92,11-56.47,32.66-84.85a8,8,0,0,1,11.93-.89l24.12,23.41,22-60.41a8,8,0,0,1,12.63-3.41C165.21,36,216,84.55,216,144Zm-16,0c0-46.09-35.79-85.92-58.21-106.33L119.52,98.74a8,8,0,0,1-13.09,3L80.06,76.16C64.09,99.21,56,122,56,144a72,72,0,0,0,144,0Z\"/>", level: "urgent" },
air: { icon: "<path d=\"M160,40A88.09,88.09,0,0,0,81.29,88.67,64,64,0,1,0,72,216h88a88,88,0,0,0,0-176Zm0,160H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.11A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,72,72Zm-8-72V88a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,172,164Z\"/>", level: "critical" }
};
var LEVEL = {
critical: { badge: "badge--danger", text: "Life-threatening" },
urgent: { badge: "badge--warn", text: "Urgent" }
};
function progressText(guide) {
var done = Object.keys(log[guide.id] || {}).length;
return done ? done + " of " + guide.steps.length + " done" : "";
}
var list = $("[data-guide-list]");
var template = $("[data-guide-template]");
var items = [];
function minutes(ms) {
var total = Math.floor(ms / 1000);
return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
}
function metronomeBlock() {
var block = document.createElement("div");
block.className = "metronome";
block.innerHTML =
"<button class=\"button button--primary metronome__toggle\" type=\"button\" aria-pressed=\"false\"><span class=\"button__text\">Start the compression beat</span></button>" +
"<span class=\"metronome__beat\" aria-hidden=\"true\"></span>" +
"<p class=\"metronome__time\"><span class=\"metronome__label\">Time</span> <span class=\"metronome__clock\">0:00</span></p>" +
"<p class=\"metronome__note\">110 compressions a minute, at the beat. Every 2 minutes, check breathing and swap with a crewmate if you can.</p>" +
"<p class=\"metronome__status\" role=\"status\"></p>";
var toggle = block.querySelector(".metronome__toggle");
var beat = block.querySelector(".metronome__beat");
var clock = block.querySelector(".metronome__clock");
var status = block.querySelector(".metronome__status");
var beats = App.guides.metronome({
onBeat: function (count, elapsed) {
beat.classList.toggle("metronome__beat--on", count % 2 === 0);
clock.textContent = minutes(elapsed);
},
onCycle: function (cycles) {
var text = "Two minutes. Check breathing.";
status.textContent = cycles * 2 + " minutes: check breathing.";
if (App.voice) {
App.voice.speak(text, { priority: "emergency" });
}
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
status.textContent = on ? "Beat on: 110 a minute." : "Beat stopped at " + clock.textContent + ".";
});
return block;
}
function openGuide(id) {
var target = document.getElementById("guide-" + id);
if (!target) {
return;
}
if (target.hidden) {
search.value = "";
filter();
}
var details = target.querySelector("[data-guide-details]");
details.open = true;
target.scrollIntoView({ block: "start" });
details.querySelector("summary").focus();
}
GUIDES.forEach(function (guide) {
var item = template.content.firstElementChild.cloneNode(true);
var progress = item.querySelector("[data-guide-progress]");
var logEl = item.querySelector("[data-guide-log]");
var look = LOOK[guide.id] || { icon: "", level: "urgent" };
item.classList.add("guide--" + look.level);
var icon = item.querySelector("[data-guide-icon]");
icon.classList.add("guide__icon--" + look.level);
icon.innerHTML = "<svg class=\"guide__icon-svg\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\">" + look.icon + "</svg>";
item.querySelector("[data-guide-badge]").classList.add(LEVEL[look.level].badge);
item.querySelector("[data-guide-badge-text]").textContent = LEVEL[look.level].text;
item.querySelector("[data-guide-title]").textContent = guide.title;
item.querySelector("[data-guide-signs]").textContent = guide.signs;
item.querySelector("[data-guide-escalate]").textContent = guide.escalate;
progress.textContent = progressText(guide);
logEl.textContent = logText(guide);
var steps = item.querySelector("[data-guide-steps]");
var inputs = [];
guide.steps.forEach(function (step, index) {
var li = document.createElement("li");
var label = document.createElement("label");
var input = document.createElement("input");
var content = document.createElement("span");
var text = document.createElement("span");
var time = document.createElement("span");
label.className = "choice";
content.className = "choice__content";
input.className = "choice__input";
input.type = "checkbox";
text.className = "choice__label";
text.textContent = (index + 1) + ". " + step;
time.className = "guide__time";
function render() {
var at = log[guide.id] && log[guide.id][index];
input.checked = Boolean(at);
time.textContent = at ? "Done at " + at : "";
time.hidden = !at;
label.classList.toggle("choice--active", input.checked);
}
input.addEventListener("change", function () {
log[guide.id] = log[guide.id] || {};
if (input.checked) {
log[guide.id][index] = App.formatTime(new Date());
} else {
delete log[guide.id][index];
}
save();
render();
progress.textContent = progressText(guide);
logEl.textContent = logText(guide);
});
render();
inputs.push(render);
content.appendChild(text);
content.appendChild(time);
label.appendChild(input);
label.appendChild(content);
li.appendChild(label);
App.guides.kitFor(step).forEach(function (kit) {
var how = document.createElement("details");
how.className = "help guide__how";
how.innerHTML = "<summary class=\"help__summary\"><span class=\"help__label\"></span></summary><p class=\"help__text\"></p>";
how.querySelector(".help__label").textContent = "How to use the " + kit.name.toLowerCase();
how.querySelector(".help__text").textContent = kit.how;
li.appendChild(how);
});
steps.appendChild(li);
});
if (guide.cpr) {
item.querySelector(".guide__body").insertBefore(metronomeBlock(), item.querySelector("[data-guide-escalate]").parentNode);
}
if (guide.collapseLink) {
var collapse = document.createElement("a");
collapse.className = "button button--secondary guide__collapse";
collapse.href = "#guide-collapse";
collapse.innerHTML = "<span class=\"button__text\">The person collapsed</span>";
collapse.addEventListener("click", function (event) {
event.preventDefault();
openGuide("collapse");
});
item.querySelector(".guide__body").insertBefore(collapse, item.querySelector("[data-guide-escalate]").parentNode);
}
if (guide.learn) {
var learn = document.createElement("a");
learn.className = "guide__learn";
learn.href = App.rootUrl("pages/learn/index.html") + "#risk-" + guide.learn;
learn.innerHTML = "<span class=\"guide__learn-text\">Why this happens in space</span>";
item.querySelector(".guide__body").insertBefore(learn, item.querySelector("[data-guide-log]").parentNode);
}
item.id = "guide-" + guide.id;
item.querySelector("[data-guide-clear]").addEventListener("click", function () {
delete log[guide.id];
save();
inputs.forEach(function (render) {
render();
});
progress.textContent = progressText(guide);
logEl.textContent = "Log cleared. " + logText(guide);
});
list.appendChild(item);
items.push({ guide: guide, el: item });
});
var search = $("[data-guide-search]");
var count = $("[data-guide-count]");
function filter() {
var words = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
var shown = 0;
items.forEach(function (entry) {
var haystack = (entry.guide.title + " " + entry.guide.signs + " " + entry.guide.keywords).toLowerCase();
var match = words.every(function (word) {
return haystack.indexOf(word) !== -1;
});
entry.el.hidden = !match;
if (match) {
shown += 1;
}
});
$("[data-guide-empty]").hidden = shown !== 0;
count.textContent = words.length
? shown + (shown === 1 ? " procedure matches" : " procedures match") + " “" + search.value.trim() + "”"
: GUIDES.length + " procedures";
}
search.addEventListener("input", filter);
filter();
function openFromHash() {
var match = /^#guide-([a-z-]+)$/.exec(window.location.hash);
if (match) {
openGuide(match[1]);
}
}
window.addEventListener("hashchange", openFromHash);
openFromHash();
})();