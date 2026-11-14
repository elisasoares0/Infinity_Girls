(function () {
"use strict";
var STORE_PREFIX = "astro-health:";
var MODES = {
station: { name: "Station", env: "microgravity", delay: "< 1 s", delaySpoken: "under 1 second", lead: "Flight surgeon (ground)", day: 42, length: 180, daily: 0.6, crewLeads: false },
moon: { name: "Moon", env: "lunar gravity (0.16 g)", delay: "≈ 1.3 s", delaySpoken: "about 1.3 seconds", lead: "Flight surgeon (ground)", day: 6, length: 30, daily: 1.37, crewLeads: false, surface: { fromDay: 6, toDay: 25 } },
mars: { name: "Mars", env: "Martian gravity (0.38 g)", delay: "up to 22 min", delaySpoken: "up to 22 minutes", lead: "Crew medical officer", day: 210, length: 900, daily: 0.62, crewLeads: true, surface: { fromDay: 181, toDay: 720 } }
};
var CONTEXTS = { transit: "In transit", base: "Surface base", rover: "Rover traverse" };
var ROVER_CREW = { moon: ["tanaka", "novak"], mars: ["silva", "novak"] };
var ROVER_HOURS = [9, 13];
var ROVER_PARTNER = "novak";
var PRIVACY_DEFAULTS = {
vitals: { surgeon: true, cmo: true, research: false },
radiation: { surgeon: true, cmo: true, research: false },
body: { surgeon: true, cmo: true, research: false },
womens: { surgeon: false, cmo: false, research: false },
mens: { surgeon: false, cmo: false, research: false },
mood: { surgeon: true, cmo: false, research: false }
};
var PROFILES = {
female: { key: "female", member: "silva", name: "Cmdr. Silva", role: "Commander", label: "Astronaut", module: "womens", sees: "Your own health, with the women's health module turned on." },
male: { key: "male", member: "tanaka", name: "Eng. Tanaka", role: "Flight engineer", label: "Astronaut", module: "mens", sees: "Your own health, with the men's health focus turned on." },
doctor: { key: "doctor", member: "okafor", name: "Dr. Okafor", role: "Crew medical officer", label: "Doctor", module: null, sees: "The whole crew: status, alerts and decision guides." }
};
var DEFAULT_PROFILE = "female";
function readStorage(storage, key, fallback) {
try {
var raw = storage.getItem(STORE_PREFIX + key);
return raw === null ? fallback : JSON.parse(raw);
} catch (error) {
return fallback;
}
}
function writeStorage(storage, key, value) {
try {
storage.setItem(STORE_PREFIX + key, JSON.stringify(value));
return true;
} catch (error) {
return false;
}
}
var store = {
get: function (key, fallback) {
try {
return readStorage(window.localStorage, key, fallback);
} catch (error) {
return fallback;
}
},
set: function (key, value) {
try {
return writeStorage(window.localStorage, key, value);
} catch (error) {
return false;
}
},
remove: function (key) {
try {
window.localStorage.removeItem(STORE_PREFIX + key);
return true;
} catch (error) {
return false;
}
}
};
function getMission() {
var session = getSession();
var mission = session && session.mission;
return mission && MODES[mission.destination] && !isNaN(Date.parse(mission.launchDate)) ? mission : null;
}
function getModePreview() {
var key = store.get("mode-preview", null);
return MODES[key] ? key : null;
}
function getPhasePreview() {
var key = store.get("phase-preview", null);
return key === "pre" || key === "in" || key === "post" ? key : null;
}
function usesMission() {
return Boolean(getMission()) && !getModePreview() && !getPhasePreview();
}
function getModeKey() {
var mission = getMission();
return getModePreview() || (mission ? mission.destination : "station");
}
function currentMode() {
var base = MODES[getModeKey()];
var mode = {};
Object.keys(base).forEach(function (key) {
mode[key] = base[key];
});
var mission = getMission();
if (usesMission()) {
var launch = Date.parse(mission.launchDate + "T00:00:00Z");
mode.length = mission.lengthDays;
mode.day = Math.max(0, Math.min(mission.lengthDays, Math.round((todayUTC() - launch) / DAY_MS)));
mode.missionName = mission.name;
} else {
mode.missionName = getModePreview() || getPhasePreview() ? "Simulated mission" : (mission ? mission.name : "Simulated mission");
}
return mode;
}
function getContextPreview() {
var key = store.get("context-preview", null);
return CONTEXTS[key] ? key : null;
}
function surfacePlan() {
var key = getModeKey();
if (key === "station") {
return null;
}
if (usesMission()) {
var plan = getMission().surface;
return plan && plan.fromDay > 0 && plan.toDay >= plan.fromDay ? plan : null;
}
return MODES[key].surface;
}
function getSurface() {
var key = getModeKey();
if (key === "station" || getPhase().key !== "in") {
return null;
}
var preview = getContextPreview();
if (preview) {
return preview === "transit" ? "transit" : "surface";
}
var plan = surfacePlan();
if (!plan) {
return key === "moon" ? "surface" : "transit";
}
var day = getPhase().missionDay;
return day >= plan.fromDay && day <= plan.toDay ? "surface" : "transit";
}
function roverCrew() {
if (getContextPreview() === "rover") {
var own = getProfile().key === "doctor" ? "silva" : getProfile().member;
return [own, ROVER_PARTNER];
}
return ROVER_CREW[getModeKey()] || [];
}
function getContext(member, now) {
var surface = getSurface();
if (surface !== "surface") {
return surface;
}
member = member || getProfile().member;
var preview = getContextPreview();
if (preview) {
return preview === "rover" && roverCrew().indexOf(member) !== -1 ? "rover" : "base";
}
var hour = new Date(now || Date.now()).getUTCHours();
var onTraverse = getPhase().missionDay % 2 === 0 && hour >= ROVER_HOURS[0] && hour < ROVER_HOURS[1];
return onTraverse && roverCrew().indexOf(member) !== -1 ? "rover" : "base";
}
function contextText(member) {
var context = getContext(member);
if (context === "base") {
return MODES[getModeKey()].name + " base";
}
if (context === "rover") {
return "rover traverse";
}
if (context === "transit") {
var plan = surfacePlan();
return plan && getPhase().missionDay > plan.toDay ? "on the way home" : "on the way to " + (getModeKey() === "moon" ? "the Moon" : "Mars");
}
return "";
}
function getSimulations() {
var list = [];
if (getModePreview()) {
list.push({ key: "mode", text: "destination " + MODES[getModePreview()].name });
}
if (getPhasePreview()) {
list.push({ key: "phase", text: "phase " + PHASE_LABELS[getPhasePreview()].toLowerCase() });
}
if (getContextPreview() && getSurface()) {
list.push({ key: "context", text: CONTEXTS[getContextPreview()].toLowerCase() });
}
if (store.get("link-lost", false) === true) {
list.push({ key: "link", text: "no link with Earth" });
}
var emergency = store.get("emergency-sim", null);
if (emergency && emergency.scenario) {
list.push({ key: "emergency", text: "emergency " + emergency.scenario.replace("-", " ") });
}
var sensors = store.get("sensors", null);
if (sensors && sensors.state && sensors.state !== "connected") {
list.push({ key: "sensors", text: sensors.state === "shirt-off" ? "shirt off" : "water dispenser offline" });
}
return list;
}
function getSession() {
var session = store.get("session", null);
return session && PROFILES[session.profile] ? session : null;
}
function getSavedProfileKey() {
var session = getSession();
return session ? session.profile : null;
}
function getProfile() {
var session = getSession();
var base = PROFILES[session ? session.profile : DEFAULT_PROFILE];
if (!session) {
return base;
}
var profile = {};
Object.keys(base).forEach(function (key) {
profile[key] = base[key];
});
profile.name = session.name;
profile.account = session;
return profile;
}
function signOut() {
store.remove("session");
window.location.href = rootUrl("index.html");
}
function isProfileVisible(el) {
var profiles = el.getAttribute("data-profiles");
return !profiles || profiles.split(" ").indexOf(getProfile().key) !== -1;
}
function isLinkLost() {
return getPhase().key === "in" && (store.get("link-lost", false) === true || navigator.onLine === false);
}
function setText(selector, text) {
document.querySelectorAll(selector).forEach(function (el) {
el.textContent = text;
});
}
var DAY_MS = 864e5;
var PHASE_LABELS = { pre: "Before flight", "in": "In flight", post: "After flight" };
var PREVIEW_DAYS = { pre: 12, post: 9 }; // launch in 12 days / landed 9 days ago
function todayUTC() {
var now = new Date();
return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
function getPhase() {
var mode = currentMode();
var today = todayUTC();
var preview = getPhasePreview();
var launch;
var landing;
if (usesMission()) {
launch = Date.parse(getMission().launchDate + "T00:00:00Z");
} else if (preview === "pre") {
launch = today + PREVIEW_DAYS.pre * DAY_MS;
} else if (preview === "post") {
landing = today - PREVIEW_DAYS.post * DAY_MS;
launch = landing - mode.length * DAY_MS;
} else {
launch = today - mode.day * DAY_MS;
}
if (landing === undefined) {
landing = launch + mode.length * DAY_MS;
}
var key = today < launch ? "pre" : today >= landing ? "post" : "in";
return {
key: key,
label: PHASE_LABELS[key],
preview: preview,
simulated: !usesMission() && Boolean(getModePreview() || preview),
today: new Date(today),
launch: new Date(launch),
landing: new Date(landing),
missionDay: key === "pre" ? 0 : key === "post" ? mode.length : Math.round((today - launch) / DAY_MS),
daysToLaunch: Math.round((launch - today) / DAY_MS),
daysSinceLanding: Math.round((today - landing) / DAY_MS)
};
}
function getMedicalLead() {
var mode = currentMode();
if (getPhase().key !== "in") {
return { name: "Flight surgeon", crewLeads: false };
}
return { name: mode.lead, crewLeads: mode.crewLeads };
}
function isFlight() {
return getPhase().key === "in";
}
function missionDayFor(mode) {
var key = getPhase().key;
return key === "pre" ? 0 : key === "post" ? mode.length : mode.day;
}
function isPhaseVisible(el) {
var phases = el.getAttribute("data-phases");
return !phases || phases.split(" ").indexOf(getPhase().key) !== -1;
}
function isContextVisible(el) {
var contexts = el.getAttribute("data-contexts");
return !contexts || contexts.split(" ").indexOf(getContext()) !== -1;
}
function isVisible(el) {
return isPhaseVisible(el) && isProfileVisible(el) && isContextVisible(el);
}
function applyPhases() {
var root = document.documentElement;
var session = getSession();
root.setAttribute("data-session", session ? "in" : "out");
if (session) {
root.setAttribute("data-profile", getProfile().key);
} else {
root.removeAttribute("data-profile");
}
root.setAttribute("data-phase", getPhase().key);
document.querySelectorAll("[data-phases], [data-profiles], [data-contexts]").forEach(function (el) {
el.hidden = !isVisible(el);
});
}
function renderHeader() {
var mode = currentMode();
var phase = getPhase();
var simulated = getModePreview() || getPhasePreview() || (getContextPreview() && getSurface()) ? " · simulated" : "";
var where = contextText();
var onEarth = phase.key !== "in";
setText("[data-mode-delay]", onEarth ? "None (on Earth)" : isLinkLost() ? "Lost · working on board" : mode.delay);
setText("[data-mode-lead]", onEarth ? "Flight surgeon" : mode.lead);
setText("[data-phase-label]", (phase.key === "pre"
? phase.label + " · launch in " + phase.daysToLaunch + (phase.daysToLaunch === 1 ? " day" : " days")
: phase.key === "post"
? phase.label + " · day " + phase.daysSinceLanding + " home"
: phase.label + " · day " + phase.missionDay + (where ? " · " + where : "")) + simulated);
var emergencyLink = document.querySelector("[data-emergency-link]");
if (emergencyLink) {
emergencyLink.classList.toggle("app-header__emergency--urgent", isLinkLost());
}
}
function setMode(key) {
store.set("mode-preview", MODES[key] ? key : null);
renderHeader();
}
function getPrivacy(member) {
var saved = store.get("privacy:" + (member || getProfile().member), {});
var result = {};
Object.keys(PRIVACY_DEFAULTS).forEach(function (type) {
result[type] = {};
Object.keys(PRIVACY_DEFAULTS[type]).forEach(function (audience) {
var value = saved[type] && typeof saved[type][audience] === "boolean" ? saved[type][audience] : PRIVACY_DEFAULTS[type][audience];
result[type][audience] = value;
});
});
return result;
}
function savePrivacy(privacy, member) {
return store.set("privacy:" + (member || getProfile().member), privacy);
}
function formatTime(date) {
return String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + " UTC";
}
function todayKey() {
return new Date().toISOString().slice(0, 10);
}
function renderLastSync() {
var saved = store.get("last-sync", null);
var time = document.querySelector("[data-last-sync]");
if (saved && time) {
var date = new Date(saved);
time.setAttribute("datetime", date.toISOString());
time.textContent = formatTime(date);
}
}
function markSynced(timestamp) {
store.set("last-sync", timestamp);
renderLastSync();
}
var DONKI_URL = "https://api.nasa.gov/DONKI/";
var DONKI_KEY = "DEMO_KEY"; // Free public key; a personal api.nasa.gov key raises the rate limit
var WEATHER_CACHE_MS = 30 * 60 * 1000;
var FAST_CME_KMS = 1000;
function isoDate(date) {
return date.toISOString().slice(0, 10);
}
function buildWeather(source, sepEvents, cmeAnalyses) {
var fastest = null;
cmeAnalyses.forEach(function (cme) {
if (cme && typeof cme.speed === "number" && (!fastest || cme.speed > fastest.speed)) {
fastest = { speed: Math.round(cme.speed), time: cme.time21_5 || cme.associatedCMEstartTime };
}
});
var level = sepEvents.length ? "danger" : fastest && fastest.speed >= FAST_CME_KMS ? "warn" : "ok";
return {
source: source,
fetchedAt: Date.now(),
sepCount: sepEvents.length,
latestSep: sepEvents.length ? sepEvents[sepEvents.length - 1].eventTime : null,
cmeCount: cmeAnalyses.length,
fastest: fastest,
level: level
};
}
function fetchDonki(type, extra, signal) {
var end = new Date();
var start = new Date(end.getTime() - 7 * 24 * 36e5);
var url = DONKI_URL + type + "?startDate=" + isoDate(start) + "&endDate=" + isoDate(end) + extra + "&api_key=" + DONKI_KEY;
return fetch(url, signal ? { signal: signal } : {})
.then(function (response) {
if (!response.ok) {
throw new Error("DONKI " + type + " " + response.status);
}
return response.text();
})
.then(function (text) {
var data = text.trim() ? JSON.parse(text) : [];
return Array.isArray(data) ? data : [];
});
}
function loadSpaceWeather(callback) {
var cached = null;
try {
cached = readStorage(window.sessionStorage, "space-weather", null);
} catch (error) {
cached = null;
}
if (cached && cached.source === "nasa" && Date.now() - cached.fetchedAt < WEATHER_CACHE_MS) {
callback(cached);
return;
}
function fallback() {
callback(buildWeather("simulated", [], [{ speed: 640, time21_5: new Date(Date.now() - 36e5 * 20).toISOString() }]));
}
if (!("fetch" in window) || !("Promise" in window)) {
fallback();
return;
}
var controller = "AbortController" in window ? new AbortController() : null;
var timer = setTimeout(function () {
if (controller) {
controller.abort();
}
}, 6000);
Promise.all([
fetchDonki("SEP", "", controller && controller.signal),
fetchDonki("CMEAnalysis", "&mostAccurateOnly=true", controller && controller.signal)
])
.then(function (results) {
clearTimeout(timer);
var weather = buildWeather("nasa", results[0], results[1]);
try {
writeStorage(window.sessionStorage, "space-weather", weather);
} catch (error) {
}
callback(weather);
})
.catch(function () {
clearTimeout(timer);
fallback();
});
}
var CAREER_LIMIT = 600; // mSv, NASA OCHMO career limit (same for women and men)
var PRIOR_DOSE = 60; // mSv from previous missions (simulated)
var LAUNCH_MASS = 72.6; // kg
function massOnDay(day) {
return Math.round((LAUNCH_MASS - 2.4 * (1 - Math.exp(-day / 60))) * 10) / 10;
}
function getRadiation(mode) {
mode = mode || currentMode();
var total = PRIOR_DOSE + missionDayFor(mode) * mode.daily;
var projected = PRIOR_DOSE + mode.length * mode.daily;
var phase = getPhase().key;
var ratio = (phase === "post" ? total : projected) / CAREER_LIMIT;
return {
limit: CAREER_LIMIT,
total: total,
projected: projected,
daily: mode.daily,
prior: PRIOR_DOSE,
missionDose: mode.length * mode.daily,
phase: phase,
state: ratio >= 1 ? "danger" : ratio >= 0.75 ? "warn" : "ok"
};
}
var OCT_BASELINE = 340;
function getOctExams(alertRise) {
var lastDay = missionDayFor(currentMode());
var plateau = { station: 24, moon: 12, mars: 21 }[getModeKey()];
var valueOn = function (day) {
return Math.round(OCT_BASELINE + plateau * (1 - Math.exp(-day / 90)));
};
var step = Math.max(14, Math.ceil(lastDay / 10 / 7) * 7);
var exams = [];
for (var day = 0; day <= lastDay; day += step) {
exams.push({ day: day, value: valueOn(day) });
}
if (exams[exams.length - 1].day !== lastDay) {
exams.push({ day: lastDay, value: valueOn(lastDay) });
}
var latest = exams[exams.length - 1];
return {
baseline: OCT_BASELINE,
threshold: OCT_BASELINE + alertRise,
exams: exams,
latest: latest,
rise: latest.value - OCT_BASELINE,
alert: latest.value >= OCT_BASELINE + alertRise
};
}
var SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(name, attrs, text) {
var el = document.createElementNS(SVG_NS, name);
Object.keys(attrs || {}).forEach(function (key) {
el.setAttribute(key, attrs[key]);
});
if (text !== undefined) {
el.textContent = text;
}
return el;
}
var CHART = { width: 320, height: 168, left: 40, right: 12, top: 12, bottom: 28 };
function lineChart(svg, points, opts) {
var w = CHART.width, h = CHART.height;
var plotW = w - CHART.left - CHART.right, plotH = h - CHART.top - CHART.bottom;
var xMax = opts.xMax || points[points.length - 1].x;
var sx = function (x) { return CHART.left + (x / xMax) * plotW; };
var sy = function (y) { return CHART.top + (1 - (y - opts.yMin) / (opts.yMax - opts.yMin)) * plotH; };
svg.setAttribute("viewBox", "0 0 " + w + " " + h);
svg.textContent = "";
if (opts.band) {
svg.appendChild(svgEl("rect", { "class": "chart__band", x: CHART.left, y: sy(opts.band[1]), width: plotW, height: sy(opts.band[0]) - sy(opts.band[1]) }));
}
opts.yTicks.forEach(function (tick) {
svg.appendChild(svgEl("line", { "class": "chart__grid", x1: CHART.left, x2: w - CHART.right, y1: sy(tick), y2: sy(tick) }));
svg.appendChild(svgEl("text", { "class": "chart__axis-label", x: CHART.left - 6, y: sy(tick) + 4, "text-anchor": "end" }, String(tick)));
});
(opts.xTicks || []).forEach(function (tick) {
svg.appendChild(svgEl("text", { "class": "chart__axis-label", x: sx(tick.x), y: h - 8, "text-anchor": "middle" }, tick.label));
});
if (typeof opts.threshold === "number") {
svg.appendChild(svgEl("line", { "class": "chart__threshold", x1: CHART.left, x2: w - CHART.right, y1: sy(opts.threshold), y2: sy(opts.threshold) }));
}
svg.appendChild(svgEl("polyline", {
"class": "chart__line",
points: points.map(function (p) { return sx(p.x).toFixed(1) + "," + sy(p.y).toFixed(1); }).join(" ")
}));
points.forEach(function (p) {
var warn = opts.isWarn ? opts.isWarn(p) : false;
var dot = svgEl("circle", { "class": "chart__dot" + (warn ? " chart__dot--warn" : ""), cx: sx(p.x), cy: sy(p.y), r: 5 });
dot.appendChild(svgEl("title", {}, p.title));
svg.appendChild(dot);
});
}
function dayTicks(max) {
var step = max <= 7 ? 1 : max <= 35 ? 7 : max <= 70 ? 14 : max <= 210 ? 30 : 90;
var ticks = [];
for (var d = 0; d <= max; d += step) {
ticks.push({ x: d, label: d === 0 ? "Launch" : "Day " + d });
}
return ticks.length > 6 ? ticks.filter(function (t, i) { return i % 2 === 0; }) : ticks;
}
function barChart(svg, bars, opts) {
var w = CHART.width, h = CHART.height;
var grouped = bars.some(function (bar) { return bar.group; });
var extra = grouped ? 14 : 0;
var plotW = w - CHART.left - CHART.right, plotH = h - CHART.top - CHART.bottom - 14 - extra;
var top = CHART.top + 14;
var slot = plotW / bars.length;
var barW = Math.min(36, slot - 8);
var sy = function (v) { return top + (1 - v / opts.max) * plotH; };
var base = sy(0);
svg.setAttribute("viewBox", "0 0 " + w + " " + h);
svg.textContent = "";
svg.appendChild(svgEl("line", { "class": "chart__grid", x1: CHART.left, x2: w - CHART.right, y1: base, y2: base }));
if (typeof opts.goal === "number") {
svg.appendChild(svgEl("line", { "class": "chart__threshold", x1: CHART.left, x2: w - CHART.right, y1: sy(opts.goal), y2: sy(opts.goal) }));
svg.appendChild(svgEl("text", { "class": "chart__axis-label", x: CHART.left - 6, y: sy(opts.goal) + 4, "text-anchor": "end" }, String(opts.goal)));
}
bars.forEach(function (bar, index) {
var x = CHART.left + slot * index + (slot - barW) / 2;
var y = sy(Math.min(bar.value, opts.max));
var r = Math.min(4, base - y);
var d = "M" + x + "," + base + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y +
"H" + (x + barW - r) + "Q" + (x + barW) + "," + y + " " + (x + barW) + "," + (y + r) + "V" + base + "Z";
var path = svgEl("path", { "class": "chart__bar" + (bar.neutral ? " chart__bar--neutral" : ""), d: d });
path.appendChild(svgEl("title", {}, bar.title || bar.label + ": " + bar.valueLabel));
svg.appendChild(path);
if (bar.valueLabel) {
svg.appendChild(svgEl("text", { "class": "chart__value", x: x + barW / 2, y: y - 6, "text-anchor": "middle" }, bar.valueLabel));
}
if (bar.label) {
svg.appendChild(svgEl("text", { "class": "chart__axis-label", x: x + barW / 2, y: h - 8 - extra, "text-anchor": "middle" }, bar.label));
}
});
if (grouped) {
var groups = {};
bars.forEach(function (bar, index) {
if (!groups[bar.group]) {
groups[bar.group] = { first: index, last: index };
}
groups[bar.group].last = index;
});
Object.keys(groups).forEach(function (name) {
var center = CHART.left + slot * (groups[name].first + groups[name].last + 1) / 2;
svg.appendChild(svgEl("text", { "class": "chart__value", x: center, y: h - 6, "text-anchor": "middle" }, name));
});
}
}
function ringChart(svg, segments) {
var size = 240, center = size / 2, radius = 100, width = 22;
var gap = 0.05; // radians of empty space between arcs
var step = (Math.PI * 2) / segments.length;
svg.setAttribute("viewBox", "0 0 " + size + " " + size);
svg.textContent = "";
function point(angle, r) {
return (center + r * Math.cos(angle)).toFixed(2) + "," + (center + r * Math.sin(angle)).toFixed(2);
}
segments.forEach(function (segment, index) {
var start = -Math.PI / 2 + index * step + gap / 2;
var end = start + step - gap;
var outer = radius + width / 2, inner = radius - width / 2;
var d = "M" + point(start, outer) + "A" + outer + "," + outer + " 0 0 1 " + point(end, outer) +
"L" + point(end, inner) + "A" + inner + "," + inner + " 0 0 0 " + point(start, inner) + "Z";
var arc = svgEl("path", { "class": "ring__arc ring__arc--" + segment.status, d: d });
arc.appendChild(svgEl("title", {}, segment.title));
svg.appendChild(arc);
if (segment.status !== "ok") {
var mid = (start + end) / 2;
var at = point(mid, radius).split(",");
svg.appendChild(svgEl("text", { "class": "ring__mark ring__mark--" + segment.status, x: at[0], y: Number(at[1]) + 5, "text-anchor": "middle" }, "!"));
}
});
}
function escapeHtml(text) {
return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function heatmapChart(list, cells) {
list.innerHTML = cells.map(function (item) {
var status = /^(ok|warn|danger|none)$/.test(item.status) ? item.status : "none";
var className = "heatmap__cell heatmap__cell--" + status + (item.mark ? " heatmap__cell--" + item.mark : "");
return "<li class=\"" + className + "\" title=\"" + escapeHtml(item.title) + "\"><span class=\"heatmap__day\">" + escapeHtml(item.label) + "</span></li>";
}).join("");
}
function chartTable(container, caption, headers, rows) {
var table = document.createElement("table");
table.className = "chart__table";
var cap = document.createElement("caption");
cap.className = "sr-only";
cap.textContent = caption;
table.appendChild(cap);
var head = document.createElement("tr");
headers.forEach(function (text) {
var th = document.createElement("th");
th.className = "chart__cell";
th.scope = "col";
th.textContent = text;
head.appendChild(th);
});
var thead = document.createElement("thead");
thead.appendChild(head);
table.appendChild(thead);
var tbody = document.createElement("tbody");
rows.forEach(function (row) {
var tr = document.createElement("tr");
row.forEach(function (text) {
var td = document.createElement("td");
td.className = "chart__cell";
td.textContent = text;
tr.appendChild(td);
});
tbody.appendChild(tr);
});
table.appendChild(tbody);
container.textContent = "";
container.appendChild(table);
}
function whenIdle(task) {
function schedule() {
if ("requestIdleCallback" in window) {
window.requestIdleCallback(task, { timeout: 2000 });
} else {
setTimeout(task, 200);
}
}
if (document.readyState === "complete") {
schedule();
} else {
window.addEventListener("load", schedule);
}
}
var scriptUrl = document.currentScript && document.currentScript.src;
function rootUrl(path) {
return scriptUrl ? new URL("../../" + path, scriptUrl).href : path;
}
var homePath = new URL(rootUrl("index.html"), location.href).pathname;
if (!getSession() && location.pathname !== homePath && location.pathname !== homePath.replace(/index\.html$/, "")) {
location.replace(rootUrl("index.html"));
}
window.App = {
modes: MODES,
profiles: PROFILES,
getProfile: getProfile,
getSavedProfileKey: getSavedProfileKey,
getSession: getSession,
signOut: signOut,
isLinkLost: isLinkLost,
isVisible: isVisible,
rootUrl: rootUrl,
savePrivacy: savePrivacy,
store: store,
getModeKey: getModeKey,
getSurface: getSurface,
getContext: getContext,
contextText: contextText,
contexts: CONTEXTS,
roverCrew: roverCrew,
getMode: function () {
var mode = currentMode();
if (getSurface() === "transit") {
mode.env = "microgravity (in transit)";
}
return mode;
},
setMode: setMode,
getPrivacy: getPrivacy,
privacyDefaults: PRIVACY_DEFAULTS,
formatTime: formatTime,
loadSpaceWeather: function (callback) {
loadSpaceWeather(function (weather) {
if (weather.source === "nasa") {
markSynced(weather.fetchedAt);
}
callback(weather);
});
},
whenIdle: whenIdle,
getRadiation: getRadiation,
getOctExams: getOctExams,
getPhase: getPhase,
getMission: getMission,
getSimulations: getSimulations,
getMedicalLead: getMedicalLead,
launchMass: LAUNCH_MASS,
massOnDay: massOnDay,
isFlight: isFlight,
missionDayFor: missionDayFor,
isPhaseVisible: isPhaseVisible,
todayKey: todayKey,
charts: { line: lineChart, bars: barChart, table: chartTable, dayTicks: dayTicks, ring: ringChart, heatmap: heatmapChart }
};
renderHeader();
renderLastSync();
applyPhases();
var demoPanel = document.querySelector("[data-demo-panel]");
var demoToggle = document.querySelector("[data-demo-open]");
var DESTINATION_NAMES = { station: "Space station", moon: "Moon", mars: "Mars" };
function reopenAfterReload(control) {
try {
window.sessionStorage.setItem(STORE_PREFIX + "demo-reopen", control.id);
} catch (error) {
}
window.location.reload();
}
function renderDemoPanel() {
var mission = getMission();
var autoMode = document.querySelector("[data-demo-auto='mode']");
var autoPhase = document.querySelector("[data-demo-auto='phase']");
if (mission) {
var launch = Date.parse(mission.launchDate + "T00:00:00Z");
var landing = launch + mission.lengthDays * DAY_MS;
var today = todayUTC();
var realKey = today < launch ? "pre" : today >= landing ? "post" : "in";
var realText = realKey === "pre" ? "before flight, launch in " + Math.round((launch - today) / DAY_MS) + " days"
: realKey === "post" ? "after flight" : "in flight, day " + Math.round((today - launch) / DAY_MS);
autoMode.textContent = "Real mission: " + mission.name + " · " + DESTINATION_NAMES[mission.destination];
autoPhase.textContent = "From the mission dates (now " + realText + ")";
} else {
autoMode.textContent = "Example mission · Space station";
autoPhase.textContent = "Example dates";
}
renderContextField();
var simulations = getSimulations();
setText("[data-demo-status]", simulations.length
? "Simulating: " + simulations.map(function (item) {
return item.text;
}).join(", ") + "."
: "Showing the real mission and the live sensors.");
var badge = document.querySelector("[data-demo-badge]");
if (badge) {
badge.hidden = !simulations.length;
}
if (demoToggle) {
var label = "Presentation mode (demo)" + (simulations.length ? ", simulating " + simulations.length + (simulations.length === 1 ? " change" : " changes") : "");
demoToggle.setAttribute("aria-label", label);
demoToggle.setAttribute("title", label);
}
}
var contextSelect = document.querySelector("[data-context-preview]");
function renderContextField() {
var autoContext = document.querySelector("[data-demo-auto='context']");
if (!contextSelect || !autoContext) {
return;
}
var station = getModeKey() === "station";
var onEarth = getPhase().key !== "in";
contextSelect.disabled = station || onEarth;
if (station) {
autoContext.textContent = "Not used on the space station";
} else if (onEarth) {
autoContext.textContent = "Only in flight";
} else {
var saved = store.get("context-preview", null);
store.remove("context-preview");
var real = contextText();
if (saved) {
store.set("context-preview", saved);
}
autoContext.textContent = "From the mission plan (now " + real + ")";
}
}
if (contextSelect) {
contextSelect.value = getContextPreview() || "auto";
contextSelect.addEventListener("change", function () {
store.set("context-preview", contextSelect.value === "auto" ? null : contextSelect.value);
reopenAfterReload(contextSelect);
});
}
var modeSelect = document.querySelector("[data-mode-preview]");
if (modeSelect) {
modeSelect.value = getModePreview() || "auto";
modeSelect.addEventListener("change", function () {
store.set("mode-preview", modeSelect.value === "auto" ? null : modeSelect.value);
reopenAfterReload(modeSelect);
});
}
var phaseSelect = document.querySelector("[data-phase-preview]");
if (phaseSelect) {
phaseSelect.value = getPhasePreview() || "auto";
phaseSelect.addEventListener("change", function () {
store.set("phase-preview", phaseSelect.value === "auto" ? null : phaseSelect.value);
reopenAfterReload(phaseSelect);
});
}
var linkSelect = document.querySelector("[data-link-preview]");
if (linkSelect) {
linkSelect.value = store.get("link-lost", false) === true ? "lost" : "connected";
linkSelect.addEventListener("change", function () {
store.set("link-lost", linkSelect.value === "lost");
reopenAfterReload(linkSelect);
});
}
document.querySelectorAll("[data-demo-reset]").forEach(function (button) {
button.addEventListener("click", function () {
store.remove("mode-preview");
store.remove("phase-preview");
store.remove("context-preview");
store.set("link-lost", false);
store.set("sensors", { state: "connected", since: null });
store.remove("emergency-sim");
if (demoPanel && demoPanel.contains(button)) {
reopenAfterReload(button);
} else {
window.location.reload();
}
});
});
if (demoPanel && demoToggle) {
demoToggle.hidden = !getSession();
renderDemoPanel();
demoToggle.addEventListener("click", function () {
renderDemoPanel();
demoPanel.showModal();
});
document.querySelector("[data-demo-close]").addEventListener("click", function () {
demoPanel.close();
});
demoPanel.addEventListener("close", function () {
demoToggle.focus();
});
demoPanel.addEventListener("click", function (event) {
if (event.target === demoPanel) {
demoPanel.close();
}
});
var reopen = null;
try {
reopen = window.sessionStorage.getItem(STORE_PREFIX + "demo-reopen");
window.sessionStorage.removeItem(STORE_PREFIX + "demo-reopen");
} catch (error) {
reopen = null;
}
if (reopen && getSession()) {
demoPanel.showModal();
var again = document.getElementById(reopen);
if (again) {
again.focus();
}
}
}
var linkBanner = null;
function renderLinkBanner() {
var main = document.querySelector("main");
var lost = isLinkLost();
renderHeader();
if (!main || document.querySelector("[data-guide-list]")) {
return;
}
if (!lost) {
if (linkBanner) {
linkBanner.hidden = true;
}
return;
}
if (!linkBanner) {
linkBanner = document.createElement("section");
linkBanner.className = "link-lost";
linkBanner.setAttribute("aria-label", "Connection with Earth");
linkBanner.innerHTML =
"<div class=\"link-lost__container\">" +
"<div class=\"notice notice--warn\" role=\"status\">" +
"<svg class=\"notice__icon\" aria-hidden=\"true\"><use href=\"#icon-alert\"/></svg>" +
"<div class=\"notice__text\">" +
"<p class=\"notice__title\">No connection with Earth</p>" +
"<p>Your data and the emergency procedures work on board. Everything is sent at the next contact. " +
"<a class=\"link-lost__link\" data-link-emergency>Open emergency procedures</a></p>" +
"</div></div></div>";
linkBanner.querySelector("[data-link-emergency]").href = rootUrl("pages/emergency/index.html");
main.insertBefore(linkBanner, main.firstChild);
}
linkBanner.hidden = false;
}
renderLinkBanner();
var header = document.querySelector(".app-header");
var tabBar = document.querySelector(".tab-bar");
var hideAmount = 0;
function measureHeader() {
var bar = header.querySelector(".status-bar");
var logo = header.querySelector(".app-header__logo");
hideAmount = bar && logo && bar.offsetTop > logo.offsetTop + logo.offsetHeight / 2 ? bar.offsetTop - logo.offsetTop : 0;
header.style.setProperty("--header-hide", hideAmount + "px");
updateScrollPadding();
}
var FOCUS_MARGIN = 12;
function updateScrollPadding() {
var compact = header.classList.contains("app-header--compact");
var root = document.documentElement;
root.style.scrollPaddingTop = (header.offsetHeight - (compact ? hideAmount : 0) + FOCUS_MARGIN) + "px";
var barShown = tabBar && !tabBar.hidden && tabBar.offsetHeight > 0;
var barSpace = barShown ? Math.max(0, window.innerHeight - tabBar.getBoundingClientRect().top) : 0;
root.style.scrollPaddingBottom = barSpace + FOCUS_MARGIN + "px";
}
if (header && "ResizeObserver" in window) {
var resizeObserver = new ResizeObserver(measureHeader);
resizeObserver.observe(header);
if (tabBar) {
resizeObserver.observe(tabBar);
}
}
var sentinel = document.querySelector(".scroll-sentinel");
if (header && sentinel && "IntersectionObserver" in window) {
new IntersectionObserver(function (entries) {
header.classList.toggle("app-header--compact", !entries[0].isIntersecting);
updateScrollPadding();
}).observe(sentinel);
}
var connectionItem = document.querySelector("[data-connection]");
var connectionAnnouncer = document.querySelector("[data-connection-announcer]");
function renderConnection(announce) {
var offline = navigator.onLine === false;
if (connectionItem) {
connectionItem.classList.toggle("status-bar__item--hidden", !offline);
}
if (announce && connectionAnnouncer) {
connectionAnnouncer.textContent = offline
? "You are offline. Changes are saved on board and sent at the next sync."
: "Back online.";
}
}
window.addEventListener("online", function () {
renderConnection(true);
renderLinkBanner();
});
window.addEventListener("offline", function () {
renderConnection(true);
renderLinkBanner();
});
renderConnection(false);
var themeToggle = document.querySelector("[data-theme-toggle]");
var themeMeta = document.querySelector("meta[name='theme-color']");
var deviceDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function getTheme() {
return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
function applyTheme(theme) {
document.documentElement.setAttribute("data-theme", theme);
if (themeToggle) {
var next = theme === "dark" ? "light" : "dark";
var name = "Switch to " + next + " theme";
themeToggle.setAttribute("aria-label", name);
themeToggle.setAttribute("title", name);
var label = themeToggle.querySelector("[data-theme-label]");
if (label) {
label.textContent = next === "dark" ? "Dark" : "Light";
}
var moon = themeToggle.querySelector("[data-theme-icon='moon']");
var sun = themeToggle.querySelector("[data-theme-icon='sun']");
if (moon) {
moon.toggleAttribute("hidden", next !== "dark");
}
if (sun) {
sun.toggleAttribute("hidden", next !== "light");
}
}
if (themeMeta) {
themeMeta.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim());
}
document.dispatchEvent(new CustomEvent("theme:change", { detail: { theme: theme } }));
}
function setTheme(theme) {
store.set("theme", theme);
applyTheme(theme);
if (connectionAnnouncer) {
connectionAnnouncer.textContent = theme === "dark" ? "Dark theme on." : "Dark theme off.";
}
}
applyTheme(getTheme());
if (themeToggle) {
themeToggle.addEventListener("click", function () {
setTheme(getTheme() === "dark" ? "light" : "dark");
});
}
if (deviceDark && deviceDark.addEventListener) {
deviceDark.addEventListener("change", function (event) {
var saved = store.get("theme", null);
if (saved !== "dark" && saved !== "light") {
applyTheme(event.matches ? "dark" : "light");
}
});
}
window.App.getTheme = getTheme;
window.App.setTheme = setTheme;
function sampleNow() {
if (!document.hidden) {
document.dispatchEvent(new CustomEvent("health:sample", { detail: { time: Date.now() } }));
}
}
window.setInterval(sampleNow, 5000);
document.addEventListener("visibilitychange", sampleNow);
var sensorSelect = document.querySelector("[data-sensor-preview]");
if (sensorSelect) {
var savedSensors = store.get("sensors", null);
sensorSelect.value = savedSensors && savedSensors.state ? savedSensors.state : "connected";
sensorSelect.addEventListener("change", function () {
store.set("sensors", { state: sensorSelect.value, since: sensorSelect.value === "connected" ? null : Date.now() });
sampleNow();
if (demoPanel) {
renderDemoPanel();
}
});
}
function markReady() {
document.documentElement.setAttribute("data-ready", "");
}
if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", markReady);
} else {
markReady();
}
var scriptSrc = document.currentScript && document.currentScript.src;
if (scriptSrc && "serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
window.addEventListener("load", function () {
navigator.serviceWorker.register(new URL("../../sw.js", scriptSrc).href).catch(function () {
});
});
}
var tabs = document.querySelectorAll("[data-tab-target]");
if (!tabs.length || !("IntersectionObserver" in window)) {
return;
}
function setActive(id) {
tabs.forEach(function (tab) {
var isActive = tab.getAttribute("data-tab-target") === id;
tab.classList.toggle("tab-bar__link--active", isActive);
if (isActive) {
tab.setAttribute("aria-current", "location");
} else {
tab.removeAttribute("aria-current");
}
});
}
var observer = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) {
setActive(entry.target.id);
}
});
}, { rootMargin: "-45% 0px -45% 0px" });
tabs.forEach(function (tab) {
var section = document.getElementById(tab.getAttribute("data-tab-target"));
if (section) {
observer.observe(section);
}
});
})();