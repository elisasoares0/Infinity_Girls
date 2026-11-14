(function () {
"use strict";
var App = window.App;
var HOUR_MS = 36e5;
var HABITATS = {
station: {
name: "Space station",
modules: [
{ id: "columbus", label: "Columbus lab", x: 1, y: 0 },
{ id: "kibo", label: "Kibo lab", x: 0, y: 1 },
{ id: "node2", label: "Node 2 · crew quarters", x: 1, y: 1 },
{ id: "lab", label: "US Lab · medical kit", x: 2, y: 1, kit: true },
{ id: "node1", label: "Node 1 · galley", x: 3, y: 1 },
{ id: "node3", label: "Node 3 · exercise", x: 3, y: 2 },
{ id: "cupola", label: "Cupola", x: 3, y: 3 }
],
links: [["columbus", "node2"], ["kibo", "node2"], ["node2", "lab"], ["lab", "node1"], ["node1", "node3"], ["node3", "cupola"]],
sleep: "node2",
galley: "node1",
exercise: "node3",
work: { silva: "lab", tanaka: "kibo", okafor: "columbus", novak: "cupola" }
},
"mars-transit": {
name: "Mars transit vehicle",
modules: [
{ id: "command", label: "Command deck", x: 0, y: 0 },
{ id: "galley", label: "Galley", x: 1, y: 0 },
{ id: "quarters", label: "Crew quarters", x: 2, y: 0 },
{ id: "exercise", label: "Exercise bay", x: 3, y: 0 },
{ id: "medical", label: "Medical bay · medical kit", x: 1, y: 1, kit: true },
{ id: "airlock", label: "Airlock", x: 3, y: 1 }
],
links: [["command", "galley"], ["galley", "quarters"], ["quarters", "exercise"], ["galley", "medical"], ["exercise", "airlock"]],
sleep: "quarters",
galley: "galley",
exercise: "exercise",
work: { silva: "command", tanaka: "command", okafor: "medical", novak: "airlock" }
},
"moon-base": {
name: "Lunar base",
modules: [
{ id: "galley", label: "Galley", x: 0, y: 0 },
{ id: "habitat", label: "Habitat · crew quarters", x: 1, y: 0 },
{ id: "lab", label: "Lab", x: 2, y: 0 },
{ id: "medical", label: "Medical · medical kit", x: 1, y: 1, kit: true },
{ id: "airlock", label: "Airlock", x: 2, y: 1 },
{ id: "eva", label: "EVA site · 340 m northeast", x: 3, y: 1, outside: true }
],
links: [["galley", "habitat"], ["habitat", "lab"], ["habitat", "medical"], ["lab", "airlock"], ["airlock", "eva"]],
sleep: "habitat",
galley: "galley",
exercise: "habitat",
work: { silva: "lab", tanaka: "airlock", okafor: "medical", novak: "eva" }
},
"moon-transit": {
name: "Orion crew module",
modules: [
{ id: "seats", label: "Crew seats · sleep", x: 0, y: 0 },
{ id: "galley", label: "Galley · water", x: 1, y: 0 },
{ id: "stowage", label: "Stowage · medical kit", x: 2, y: 0, kit: true },
{ id: "flywheel", label: "Flywheel · exercise", x: 1, y: 1 },
{ id: "hygiene", label: "Hygiene bay", x: 2, y: 1 }
],
links: [["seats", "galley"], ["galley", "stowage"], ["galley", "flywheel"], ["stowage", "hygiene"]],
sleep: "seats",
galley: "galley",
exercise: "flywheel",
work: { silva: "seats", tanaka: "stowage", okafor: "galley", novak: "seats" }
},
"mars-base": {
name: "Mars base",
modules: [
{ id: "greenhouse", label: "Greenhouse", x: 0, y: 0 },
{ id: "galley", label: "Galley", x: 1, y: 0 },
{ id: "habitat", label: "Habitat · crew quarters", x: 2, y: 0 },
{ id: "lab", label: "Lab", x: 3, y: 0 },
{ id: "exercise", label: "Exercise bay", x: 1, y: 1 },
{ id: "medical", label: "Medical · medical kit", x: 2, y: 1, kit: true },
{ id: "airlock", label: "Airlock", x: 3, y: 1 },
{ id: "eva", label: "EVA site · 500 m south", x: 3, y: 2, outside: true }
],
links: [["greenhouse", "galley"], ["galley", "habitat"], ["habitat", "lab"], ["galley", "exercise"], ["habitat", "medical"], ["lab", "airlock"], ["airlock", "eva"]],
sleep: "habitat",
galley: "galley",
exercise: "exercise",
work: { silva: "lab", tanaka: "greenhouse", okafor: "medical", novak: "eva" }
}
};
var ROVER = { id: "rover", label: "Pressurized rover · 12 km out · rover kit", kit: true, outside: true, rover: true };
var ROVER_MINUTES = 40;
function contextOf(member) {
return App.getContext ? App.getContext(member) : null;
}
function anyoneOnRover() {
var members = App.crew ? Object.keys(App.crew.members) : [];
return members.some(function (member) {
return contextOf(member) === "rover";
});
}
function habitat() {
var key = App.getModeKey ? App.getModeKey() : "station";
if (key === "station") {
return HABITATS.station;
}
var surface = App.getSurface ? App.getSurface() : null;
var place = HABITATS[key + (surface === "transit" ? "-transit" : "-base")];
if (!anyoneOnRover()) {
return place;
}
var cols = 0;
place.modules.forEach(function (module) {
cols = Math.max(cols, module.x + 1);
});
var rover = { id: ROVER.id, label: ROVER.label, kit: true, outside: true, rover: true, x: cols, y: 0 };
return {
name: place.name,
modules: place.modules.concat([rover]),
links: place.links,
sleep: place.sleep,
galley: place.galley,
exercise: place.exercise,
work: place.work
};
}
function moduleById(id) {
return habitat().modules.filter(function (item) {
return item.id === id;
})[0] || null;
}
function kitModule(moduleId) {
if (moduleId === ROVER.id && moduleById(ROVER.id)) {
return moduleById(ROVER.id);
}
return habitat().modules.filter(function (item) {
return item.kit && !item.rover;
})[0];
}
function hops(from, to) {
if (from === to) {
return 0;
}
var links = habitat().links;
var seen = {};
var frontier = [from];
seen[from] = true;
for (var distance = 1; frontier.length; distance++) {
var nextFrontier = [];
for (var i = 0; i < frontier.length; i++) {
for (var j = 0; j < links.length; j++) {
var link = links[j];
var other = link[0] === frontier[i] ? link[1] : link[1] === frontier[i] ? link[0] : null;
if (other && !seen[other]) {
if (other === to) {
return distance;
}
seen[other] = true;
nextFrontier.push(other);
}
}
}
frontier = nextFrontier;
}
return Infinity;
}
function routineModule(member, now) {
var place = habitat();
var date = new Date(now);
var hour = date.getUTCHours() + date.getUTCMinutes() / 60;
if (hour >= 22 || hour < 6) {
return place.sleep;
}
if ([7, 12, 19].some(function (meal) {
return hour >= meal && hour < meal + 0.75;
})) {
return place.galley;
}
var sessions = (App.crew && App.crew.sessions && App.crew.sessions[member]) || [];
if (sessions.some(function (session) {
return hour >= session[0] && hour < session[1];
})) {
return place.exercise;
}
return place.work[member] || place.galley;
}
function locationOf(member) {
if (contextOf(member) === "rover" && moduleById(ROVER.id)) {
return { id: ROVER.id, label: ROVER.label, kit: true, outside: true };
}
var saved = App.store.get("location:" + member, null);
var id = saved && saved.until > Date.now() && moduleById(saved.id) ? saved.id : routineModule(member, Date.now());
var module = moduleById(id) || habitat().modules[0];
return { id: module.id, label: module.label, kit: Boolean(module.kit), outside: Boolean(module.outside) };
}
function setLocation(member, id) {
if (moduleById(id)) {
App.store.set("location:" + member, { id: id, until: Date.now() + 2 * HOUR_MS });
}
}
function responderFor(member, moduleId) {
var members = App.crew ? App.crew.members : {};
var others = Object.keys(members).filter(function (key) {
return key !== member;
}).map(function (key) {
return { member: key, name: members[key].name, hops: hops(locationOf(key).id, moduleId) };
});
if (moduleId === ROVER.id) {
var partner = others.filter(function (item) {
return locationOf(item.member).id === ROVER.id;
})[0];
if (partner) {
partner.hops = 0;
return partner;
}
}
var medical = others.filter(function (item) {
return item.member === "okafor";
})[0];
others.sort(function (a, b) {
return a.hops - b.hops;
});
return medical || others[0] || null;
}
function hopsText(count) {
return count === 0 ? "in the same module" : count === 1 ? "one module away" : count === Infinity ? "outside the habitat" : count + " modules away";
}
function describe(moduleId) {
var module = moduleById(moduleId) || habitat().modules[0];
if (module.rover) {
return "Location: pressurized rover, 12 km from the base. Medical kit: rover kit, in the rover. " +
"The base is about " + ROVER_MINUTES + " minutes away.";
}
var kit = kitModule(moduleId);
var away = hops(moduleId, kit.id);
return "Location: " + module.label + ". Medical kit: " + kit.label.replace(" · medical kit", "") +
(away === 0 ? ", in this module." : ", " + hopsText(away) + ".");
}
var SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(name, attrs, text) {
var el = document.createElementNS(SVG_NS, name);
Object.keys(attrs || {}).forEach(function (key) {
el.setAttribute(key, attrs[key]);
});
if (text) {
el.textContent = text;
}
return el;
}
function renderMap(svg, options) {
var place = habitat();
var cellW = 132;
var cellH = 64;
var gapX = 20;
var gapY = 22;
var cols = 0;
var rows = 0;
place.modules.forEach(function (module) {
cols = Math.max(cols, module.x + 1);
rows = Math.max(rows, module.y + 1);
});
var width = cols * cellW + (cols - 1) * gapX;
var height = rows * cellH + (rows - 1) * gapY;
svg.setAttribute("viewBox", "0 0 " + width + " " + height);
svg.setAttribute("aria-hidden", "true");
svg.textContent = "";
function center(module) {
return { x: module.x * (cellW + gapX) + cellW / 2, y: module.y * (cellH + gapY) + cellH / 2 };
}
place.links.forEach(function (link) {
var a = center(moduleById(link[0]));
var b = center(moduleById(link[1]));
svg.appendChild(svgEl("line", { "class": "habitat-map__link", x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
});
place.modules.forEach(function (module) {
var x = module.x * (cellW + gapX);
var y = module.y * (cellH + gapY);
var isAlert = options && options.alert === module.id;
var cls = "habitat-map__module" + (module.kit ? " habitat-map__module--kit" : "") +
(module.outside ? " habitat-map__module--outside" : "") + (isAlert ? " habitat-map__module--alert" : "");
svg.appendChild(svgEl("rect", { "class": cls, x: x, y: y, width: cellW, height: cellH, rx: 10 }));
var words = module.label.split(" · ");
svg.appendChild(svgEl("text", { "class": isAlert ? "habitat-map__label habitat-map__label--alert" : "habitat-map__label", x: x + 10, y: y + 24 }, (isAlert ? "! " : "") + words[0]));
if (words[1]) {
svg.appendChild(svgEl("text", { "class": isAlert ? "habitat-map__note habitat-map__note--alert" : "habitat-map__note", x: x + 10, y: y + 44 }, words[1]));
}
});
((options && options.responders) || []).forEach(function (responder, index) {
var module = moduleById(responder.module);
if (!module) {
return;
}
var c = center(module);
var cx = c.x + cellW / 2 - 16 - index * 26;
var cy = c.y + cellH / 2 - 14;
svg.appendChild(svgEl("circle", { "class": "habitat-map__person", cx: cx, cy: cy, r: 12 }));
svg.appendChild(svgEl("text", { "class": "habitat-map__initials", x: cx, y: cy + 4, "text-anchor": "middle" }, responder.initials));
});
}
App.habitat = {
modules: function () {
return habitat().modules;
},
name: function () {
return habitat().name;
},
locationOf: locationOf,
contextOf: contextOf,
roverMinutes: ROVER_MINUTES,
setLocation: setLocation,
responderFor: responderFor,
hops: hops,
hopsText: hopsText,
kitModule: kitModule,
moduleById: moduleById,
describe: describe,
renderMap: renderMap
};
})();