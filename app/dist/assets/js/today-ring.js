(function () {
"use strict";
var App = window.App;
var ICONS = {
sleep: "<path d=\"M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z\"/>",
hydration: "<path d=\"M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z\"/>",
exercise: "<path d=\"M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11\"/>",
hr: "<path d=\"M12 20s-7.5-4.5-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.5 12 20 12 20z\"/>",
bp: "<path d=\"M4 16.5a8 8 0 1 1 16 0\"/><path d=\"M12 16.5l3.5-5\"/>",
spo2: "<path d=\"M12 4v7\"/><path d=\"M12 11c-1.5 0-2.5-2-4.5-2C5.5 9 4 12 4 15.5 4 18 5 20 7 20c3 0 5-2.5 5-6\"/><path d=\"M12 11c1.5 0 2.5-2 4.5-2 2 0 3.5 3 3.5 6.5 0 2.5-1 4.5-3 4.5-3 0-5-2.5-5-6\"/>",
resp: "<path d=\"M3 9h11a3 3 0 1 0-3-3\"/><path d=\"M3 15h14a3 3 0 1 1-3 3\"/><path d=\"M3 12h7\"/>",
temp: "<path d=\"M10 14.2V5.5a2 2 0 0 1 4 0v8.7a4 4 0 1 1-4 0z\"/><path d=\"M12 10v7\"/>",
signal: "<path d=\"M2 9.5a15 15 0 0 1 20 0\"/><path d=\"M5.5 13a10 10 0 0 1 13 0\"/><path d=\"M9 16.5a5 5 0 0 1 6 0\"/><path d=\"M12 20h.01\"/>",
close: "<path d=\"M6 6l12 12M18 6L6 18\"/>"
};
var STATUS_WORD = { ok: "In range", warn: "Watch", danger: "Act now" };
function renderHealthInfo(container, key, status, value) {
var info = App.healthInfo(key);
var todo = App.healthAdvice(key, status, value);
container.classList.add("health-info");
container.innerHTML =
"<p class=\"health-info__todo\"><span class=\"health-info__label\">What to do:</span> <span class=\"health-info__todo-text\"></span></p>" +
"<details class=\"help health-info__more\"><summary class=\"help__summary\"><span class=\"help__label\">How it is measured and why it matters</span></summary>" +
"<dl class=\"health-info__list\">" +
"<div class=\"health-info__row\"><dt class=\"health-info__label\">How it is measured</dt><dd class=\"health-info__text\" data-info=\"how\"></dd></div>" +
"<div class=\"health-info__row\"><dt class=\"health-info__label\">Why it matters</dt><dd class=\"health-info__text\" data-info=\"why\"></dd></div>" +
"</dl></details>" +
"<div class=\"health-info__actions\">" +
"<button class=\"button button--tertiary button--flush health-info__speak\" type=\"button\"><span class=\"button__text\">Explain out loud</span></button>" +
"<a class=\"button button--tertiary button--flush health-info__learn\"><span class=\"button__text\">Learn about this risk</span></a>" +
"</div>";
container.querySelector(".health-info__todo-text").textContent = todo;
container.querySelector("[data-info='how']").textContent = info.how;
container.querySelector("[data-info='why']").textContent = info.why;
var learn = container.querySelector(".health-info__learn");
learn.href = App.rootUrl("pages/learn/index.html") + "#risk-" + App.healthRisk(key);
learn.setAttribute("aria-label", "Learn about this risk: " + App.crew.getMetric(key).label.toLowerCase());
var speak = container.querySelector(".health-info__speak");
speak.hidden = !(App.voice && App.voice.isSupported());
speak.setAttribute("aria-label", "Explain out loud: " + App.crew.getMetric(key).label.toLowerCase());
speak.addEventListener("click", function () {
App.voice.speak(App.crew.getMetric(key).label + ". How it is measured: " + info.how + " Why it matters: " + info.why + " What to do: " + todo, { priority: "info" });
});
}
var SVG = "<svg class=\"CLASS\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><use href=\"#ring-icon-KEY\"/></svg>";
function icon(key, className) {
return SVG.replace("KEY", key).replace("CLASS", className);
}
function ensureSprite() {
if (document.getElementById("ring-icon-sleep")) {
return;
}
var holder = document.createElement("div");
holder.innerHTML = "<svg class=\"sr-only\" aria-hidden=\"true\" focusable=\"false\">" + Object.keys(ICONS).map(function (key) {
return "<symbol id=\"ring-icon-" + key + "\" viewBox=\"0 0 24 24\">" + ICONS[key] + "</symbol>";
}).join("") + "</svg>";
document.body.insertBefore(holder.firstChild, document.body.firstChild);
}
function signalText(member, own) {
var state = App.crew.sensorState(member);
if (!state.keys.length) {
return "";
}
var since = state.since ? " since " + App.formatTime(new Date(state.since)) : "";
var what = state.shirt ? "Astroskin shirt not sending" + since + "." : "Water dispenser offline" + since + ".";
return what + (own ? (state.shirt ? " Put it back on so the readings continue." : " Your drinks are counted again when it is back online.") : " Showing the last reading.");
}
function drawSeries(svg, series, key) {
var values = series.map(function (point) {
return point.value;
}).filter(function (value) {
return value !== null;
});
svg.textContent = "";
if (!values.length) {
return;
}
var min = key === "sleep" ? 0 : Math.min.apply(null, values);
var max = key === "sleep" ? 1 : Math.max.apply(null, values);
var pad = key === "sleep" ? 0 : Math.max((max - min) * 0.15, key === "temp" ? 0.1 : 1);
min -= pad;
max += pad;
var segments = [[]];
series.forEach(function (point, index) {
if (point.value === null) {
if (segments[segments.length - 1].length) {
segments.push([]);
}
return;
}
var x = (index / (series.length - 1)) * 120;
var y = 30 - ((point.value - min) / (max - min || 1)) * 28;
segments[segments.length - 1].push(x.toFixed(1) + "," + y.toFixed(1));
});
segments.forEach(function (points) {
if (points.length < 2) {
return;
}
var line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
line.setAttribute("points", points.join(" "));
line.setAttribute("fill", "none");
line.setAttribute("stroke", "currentColor");
line.setAttribute("stroke-width", "2");
line.setAttribute("stroke-linejoin", "round");
line.setAttribute("vector-effect", "non-scaling-stroke");
svg.appendChild(line);
});
}
var instances = 0;
function todayRing(container, options) {
ensureSprite();
instances += 1;
var member = options.member;
var person = App.crew.members[member];
var own = options.own !== false;
var selected = null;
var shownStatus = null;
container.innerHTML =
"<div class=\"health-ring\">" +
"<div class=\"health-ring__main\">" +
"<div class=\"health-ring__dial\">" +
"<ul class=\"health-ring__segments\" aria-label=\"Today's indicators. Choose one to see details.\" data-ring-segments></ul>" +
"<div class=\"health-ring__center\" aria-live=\"polite\">" +
"<p class=\"health-ring__value\" data-ring-value></p>" +
"<p class=\"health-ring__caption\" data-ring-caption></p>" +
"</div>" +
"</div>" +
"<p class=\"health-ring__live\">" + icon("signal", "health-ring__live-icon") + "<span class=\"health-ring__live-text\" data-ring-live></span></p>" +
"<div class=\"health-ring__actions\">" +
(options.trendsHref ? "<a class=\"button button--secondary\" data-ring-trends><span class=\"button__text\">See trends</span></a>" : "") +
(options.onTrends ? "<button class=\"button button--secondary\" type=\"button\" data-ring-trends><span class=\"button__text\">See trends</span></button>" : "") +
"<button class=\"button button--tertiary\" type=\"button\" data-ring-reset hidden><span class=\"button__text\">Show readiness</span></button>" +
"</div>" +
"</div>" +
"<div class=\"health-ring__side\">" +
"<p class=\"health-ring__signal\" data-ring-signal hidden></p>" +
"<section class=\"health-ring__detail\" aria-label=\"Selected indicator\" data-ring-detail hidden tabindex=\"-1\"></section>" +
"<div class=\"health-ring__callout\" data-ring-callout>" +
"<p class=\"health-ring__callout-text\" data-ring-callout-text></p>" +
"<button class=\"button button--primary health-ring__callout-button\" type=\"button\" data-ring-callout-action><span class=\"button__text\">See what to do</span></button>" +
"</div>" +
"<div class=\"summary-bars\">" +
"<h3 class=\"summary-bars__title\">Summary</h3>" +
"<ul class=\"summary-bars__list\" data-ring-summary></ul>" +
"</div>" +
"</div>" +
"</div>";
if (options.trendsHref) {
container.querySelector("[data-ring-trends]").href = options.trendsHref;
}
if (options.onTrends) {
container.querySelector("[data-ring-trends]").addEventListener("click", options.onTrends);
}
function q(selector) {
return container.querySelector(selector);
}
function renderSegments(list) {
var segments = q("[data-ring-segments]");
if (segments.children.length !== list.length) {
segments.textContent = "";
list.forEach(function (item, index) {
var li = document.createElement("li");
li.className = "health-ring__item";
var button = document.createElement("button");
button.type = "button";
button.style.setProperty("--angle", (index * 360 / list.length) + "deg");
button.setAttribute("data-key", item.key);
button.innerHTML = "<span class=\"health-ring__mark\">" + icon(item.key, "health-ring__icon") +
"<span class=\"health-ring__flag\" aria-hidden=\"true\">!</span></span>";
button.addEventListener("click", function () {
select(selected === item.key ? null : item.key, false);
});
button.addEventListener("keydown", function (event) {
if (event.key === "Escape") {
select(null, false);
}
});
li.appendChild(button);
segments.appendChild(li);
});
}
list.forEach(function (item, index) {
var button = segments.children[index].firstChild;
button.className = "health-ring__segment health-ring__segment--" + item.status +
(item.signal ? "" : " health-ring__segment--silent") + (selected === item.key ? " health-ring__segment--selected" : "");
button.setAttribute("aria-pressed", selected === item.key ? "true" : "false");
button.setAttribute("aria-label", item.label + ": " + item.text + ", " + STATUS_WORD[item.status].toLowerCase() + (item.signal ? "" : ", no signal"));
button.querySelector(".health-ring__flag").hidden = item.status === "ok";
});
}
function renderCenter(list) {
var flagged = list.filter(function (item) {
return item.status !== "ok";
});
var item = list.filter(function (entry) {
return entry.key === selected;
})[0];
var value = q("[data-ring-value]");
var caption = item
? item.label + " · " + STATUS_WORD[item.status]
: "Readiness · " + (flagged.length ? flagged.length + (flagged.length === 1 ? " needs attention" : " need attention") : "all in range");
if (item) {
if (value.textContent !== item.text) {
value.textContent = item.text;
}
} else if (!value.querySelector(".health-ring__score")) {
value.innerHTML = "<span class=\"health-ring__score\"></span><span class=\"health-ring__unit\">/100</span>";
value.querySelector(".health-ring__score").textContent = person.readiness;
}
if (q("[data-ring-caption]").textContent !== caption) {
q("[data-ring-caption]").textContent = caption;
}
q("[data-ring-reset]").hidden = !item;
}
function renderDetail(list, full) {
var detail = q("[data-ring-detail]");
var item = list.filter(function (entry) {
return entry.key === selected;
})[0];
if (!item) {
detail.hidden = true;
detail.textContent = "";
shownStatus = null;
return;
}
var stamp = item.status + (item.signal ? "" : "-silent");
if (!full && shownStatus === stamp && detail.firstChild) {
detail.querySelector(".health-ring__detail-value").textContent = item.text;
detail.querySelector(".health-ring__detail-source").textContent = sourceText(item);
drawSeries(detail.querySelector(".health-ring__detail-line"), App.crew.series24h(member, item.key), item.key);
return;
}
shownStatus = stamp;
var week = App.crew.history(member, item.key, 7);
var inRange = week.filter(function (day) {
return day.status === "ok";
}).length;
var max = Math.max.apply(null, week.map(function (day) {
return day.value;
})) || 1;
detail.innerHTML =
"<div class=\"health-ring__detail-head\">" + icon(item.key, "health-ring__detail-icon") +
"<h3 class=\"health-ring__detail-title\"></h3>" +
"<span class=\"badge badge--" + item.status + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" + (item.status === "ok" ? "#icon-check" : "#icon-alert") + "\"/></svg><span class=\"badge__text\"></span></span></div>" +
"<p class=\"health-ring__detail-value\"></p>" +
"<p class=\"health-ring__detail-source\"></p>" +
"<p class=\"health-ring__detail-label\">Last 24 hours</p>" +
"<svg class=\"health-ring__detail-line\" viewBox=\"0 0 120 32\" preserveAspectRatio=\"none\" aria-hidden=\"true\"></svg>" +
"<p class=\"health-ring__detail-label\">Last 7 days</p>" +
"<div class=\"health-ring__days\" aria-hidden=\"true\"></div>" +
"<p class=\"health-ring__detail-meta\"></p>" +
"<div class=\"health-ring__detail-info\"></div>";
detail.querySelector(".health-ring__detail-title").textContent = item.label;
detail.querySelector(".badge__text").textContent = STATUS_WORD[item.status];
detail.querySelector(".health-ring__detail-value").textContent = item.text;
detail.querySelector(".health-ring__detail-source").textContent = sourceText(item);
detail.querySelector(".health-ring__detail-meta").textContent = "Normal: " + item.normal + " · " + inRange + " of 7 days in range";
renderHealthInfo(detail.querySelector(".health-ring__detail-info"), item.key, item.status);
drawSeries(detail.querySelector(".health-ring__detail-line"), App.crew.series24h(member, item.key), item.key);
var days = detail.querySelector(".health-ring__days");
week.forEach(function (day) {
var bar = document.createElement("span");
bar.className = "health-ring__day health-ring__day--" + day.status;
bar.style.setProperty("--fill", Math.max(8, Math.round((day.value / max) * 100)) + "%");
days.appendChild(bar);
});
detail.hidden = false;
}
function sourceText(item) {
var time = App.formatTime(new Date(item.updated));
return item.signal
? "From the " + item.source.toLowerCase().replace("astroskin", "Astroskin") + " · updated " + time
: "No signal from the " + item.source.toLowerCase().replace("astroskin", "Astroskin") + " since " + time + " · last value";
}
function renderCallout(list) {
var flagged = list.filter(function (item) {
return item.status !== "ok";
});
var diff = person.readiness - person.yesterday;
var reason = flagged.length ? " Main reason: " + flagged.map(function (item) {
return item.label.toLowerCase();
}).join(", ") + "." : "";
var who = options.ownerName ? options.ownerName + "'s" : "Your";
var text = diff < 0
? who + " readiness dropped " + (-diff) + (diff === -1 ? " point" : " points") + " compared to yesterday." + reason
: who + " readiness is " + (diff === 0 ? "the same as" : "up " + diff + (diff === 1 ? " point from" : " points from")) + " yesterday." + reason;
q("[data-ring-callout]").classList.toggle("health-ring__callout--warn", diff < 0 && flagged.length > 0);
if (q("[data-ring-callout-text]").textContent !== text) {
q("[data-ring-callout-text]").textContent = text;
}
var action = q("[data-ring-callout-action]");
action.hidden = !flagged.length;
action.onclick = function () {
select(flagged[0].key, true);
};
}
function renderSummary(list) {
var byKey = {};
list.forEach(function (item) {
byKey[item.key] = item;
});
var goal = App.crew.exerciseGoal();
var inRange = ["hr", "bp", "spo2", "resp", "temp"].filter(function (key) {
return byKey[key].status === "ok";
}).length;
var columns = [
{ key: "sleep", label: "Sleep", value: byKey.sleep.value.toFixed(1) + " h", ratio: byKey.sleep.value / 8, status: byKey.sleep.status, spoken: "Sleep: " + byKey.sleep.text + " of an 8 h goal" },
{ key: "hydration", label: "Water", value: byKey.hydration.value.toFixed(1) + " L", ratio: byKey.hydration.value / 2.5, status: byKey.hydration.status, spoken: "Water: " + byKey.hydration.text },
{ key: "exercise", label: "Exercise", value: Math.round(byKey.exercise.value) + " min", ratio: byKey.exercise.value / goal, status: byKey.exercise.status, spoken: "Exercise: " + byKey.exercise.text },
{ key: "hr", label: "In range", value: inRange + "/5", ratio: inRange / 5, status: inRange === 5 ? "ok" : "warn", spoken: inRange + " of 5 vital signs in range" }
];
var target = q("[data-ring-summary]");
target.textContent = "";
columns.forEach(function (column) {
var li = document.createElement("li");
li.className = "summary-bars__item";
li.innerHTML =
"<span class=\"summary-bars__value\" aria-hidden=\"true\"></span>" +
"<span class=\"summary-bars__track\" aria-hidden=\"true\"><span class=\"summary-bars__fill summary-bars__fill--" + column.status + "\"></span></span>" +
icon(column.key, "summary-bars__icon") +
"<span class=\"summary-bars__label\" aria-hidden=\"true\"></span>" +
"<span class=\"sr-only\"></span>";
li.querySelector(".summary-bars__value").textContent = column.value;
li.querySelector(".summary-bars__label").textContent = column.label;
li.querySelector(".sr-only").textContent = column.spoken + ".";
li.querySelector(".summary-bars__fill").style.setProperty("--fill", Math.min(100, Math.max(4, Math.round(column.ratio * 100))) + "%");
target.appendChild(li);
});
}
function renderSignal() {
var text = signalText(member, own);
q("[data-ring-signal]").hidden = !text;
if (q("[data-ring-signal]").textContent !== text) {
q("[data-ring-signal]").textContent = text;
}
q("[data-ring-live]").textContent = text
? "Some sensors silent · " + App.formatTime(new Date())
: "Live from the sensors · " + App.formatTime(new Date());
}
function render(full) {
var list = App.crew.todayVitals(member);
renderSegments(list);
renderCenter(list);
renderDetail(list, full);
renderCallout(list);
renderSummary(list);
renderSignal();
}
function select(key, moveFocus) {
selected = key;
render(true);
var target = key ? container.querySelector("[data-key='" + key + "']") : null;
if (moveFocus && key) {
q("[data-ring-detail]").focus();
} else if (target) {
target.focus();
}
}
q("[data-ring-reset]").addEventListener("click", function () {
var was = selected;
select(null, false);
var back = container.querySelector("[data-key='" + was + "']");
if (back) {
back.focus();
}
});
document.addEventListener("health:sample", function () {
render(false);
});
render(true);
return { render: render, select: select };
}
App.todayRing = todayRing;
App.drawSeries = drawSeries;
App.signalText = signalText;
App.renderHealthInfo = renderHealthInfo;
App.ringIcon = function (key, className) {
ensureSprite();
return icon(key, className);
};
})();