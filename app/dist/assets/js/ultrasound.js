(function () {
"use strict";
var App = window.App;
var DAY_MS = 864e5;
var BUCKET = "exames-imagem";
var REGION = "veia_jugular_interna_esquerda";
var MAX_SIDE = 1280;
var STATUS = {
pendente: { word: "Waiting for the medical team", short: "Waiting", level: "soon", icon: "#icon-info" },
normal: { word: "Normal", short: "Normal", level: "ok", icon: "#icon-check" },
atencao: { word: "Watch", short: "Watch", level: "warn", icon: "#icon-alert" },
critico: { word: "Act now", short: "Act now", level: "danger", icon: "#icon-alert" }
};
var STEPS = [
"Sit and strap in. Turn your head to the right.",
"Put a line of gel on the probe of the ultrasound device.",
"Place the probe on the left side of your neck, just above the collarbone.",
"Hold still for 5 seconds while the device shows the vein.",
"Save the image on the device, then add it below."
];
function seeded(text) {
var h = 2166136261;
for (var i = 0; i < text.length; i++) {
h = Math.imul(h ^ text.charCodeAt(i), 16777619);
}
return function () {
h += 0x6D2B79F5;
var t = h;
t = Math.imul(t ^ (t >>> 15), t | 1);
t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
function seed() {
if (App.store.get("ultrasound-seeded", false) || !App.isFlight()) {
return;
}
App.store.set("ultrasound-seeded", true);
var today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
Object.keys(App.crew.members).forEach(function (member) {
App.records.insert("exames_imagem", {
usuario_id: member, tipo_exame: "ultrassom_venoso", regiao_anatomica: REGION,
imagem_url: "sample://" + member + "/week", observacao_astronauta: null,
status_leitura: "normal", parecer_medico: "The vein compresses fully and blood flows normally. No clot. Next scan in 7 days.",
avaliado_por: "okafor"
}, new Date(today - 7 * DAY_MS + 9.6 * 36e5).toISOString());
});
App.records.insert("exames_imagem", {
usuario_id: "tanaka", tipo_exame: "ultrassom_venoso", regiao_anatomica: REGION,
imagem_url: "sample://tanaka/yesterday", observacao_astronauta: "Slight pressure on the left side of the neck when I lie in the sleeping bag.",
status_leitura: "pendente", parecer_medico: null, avaliado_por: null
}, new Date(today - DAY_MS + 9.5 * 36e5).toISOString());
}
function list(member) {
return App.records.list("exames_imagem", { usuario_id: member }).filter(function (row) {
return row.tipo_exame === "ultrassom_venoso";
});
}
function pendingAll() {
return App.records.list("exames_imagem").filter(function (row) {
return row.tipo_exame === "ultrassom_venoso";
});
}
function sampleCanvas(key) {
var random = seeded(key);
var canvas = document.createElement("canvas");
canvas.width = 480;
canvas.height = 360;
var ctx = canvas.getContext("2d");
ctx.fillStyle = "rgb(0, 0, 0)";
ctx.fillRect(0, 0, 480, 360);
ctx.save();
ctx.beginPath();
ctx.moveTo(190, 20);
ctx.lineTo(290, 20);
ctx.lineTo(450, 340);
ctx.lineTo(30, 340);
ctx.closePath();
ctx.clip();
for (var i = 0; i < 9000; i++) {
var y = random() * 330 + 20;
var shade = Math.round(40 + random() * 110 * (1 - y / 520));
ctx.fillStyle = "rgb(" + shade + "," + shade + "," + shade + ")";
ctx.fillRect(random() * 480, y, 2 + random() * 3, 1 + random() * 2);
}
ctx.fillStyle = "rgba(10,10,10,0.92)";
ctx.beginPath();
ctx.ellipse(205, 170, 58, 30, 0, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.arc(300, 205, 20, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
ctx.fillStyle = "rgb(221, 221, 221)";
ctx.font = "14px sans-serif";
ctx.fillText("EXAMPLE IMAGE", 12, 24);
ctx.fillText("L neck · IJV", 380, 24);
for (var cm = 1; cm <= 6; cm++) {
ctx.fillRect(468, 20 + cm * 50, 8, 2);
}
return canvas;
}
function toBlob(canvas) {
return new Promise(function (resolve) {
canvas.toBlob(function (blob) {
resolve(blob);
}, "image/webp", 0.8);
});
}
function imageUrl(row) {
if (/^sample:\/\//.test(row.imagem_url)) {
return toBlob(sampleCanvas(row.imagem_url)).then(function (blob) {
return URL.createObjectURL(blob);
});
}
return App.records.files.url(row.imagem_url);
}
function normalize(source, width, height) {
var scale = Math.min(1, MAX_SIDE / Math.max(width, height));
var canvas = document.createElement("canvas");
canvas.width = Math.round(width * scale);
canvas.height = Math.round(height * scale);
canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
return toBlob(canvas);
}
function save(member, blob, note) {
var path = member + "/" + new Date().toISOString().replace(/[:.]/g, "-") + ".webp";
return App.records.files.put(BUCKET, path, blob).then(function (url) {
var row = App.records.insert("exames_imagem", {
usuario_id: member, tipo_exame: "ultrassom_venoso", regiao_anatomica: REGION,
imagem_url: url, observacao_astronauta: note || null, status_leitura: "pendente",
parecer_medico: null, avaliado_por: null
});
var saved = App.store.get("tasks:" + member, null);
var done = saved && saved.date === App.todayKey() && Array.isArray(saved.done) ? saved.done : [];
if (done.indexOf("ultrasound") === -1) {
done.push("ultrasound");
}
App.store.set("tasks:" + member, { date: App.todayKey(), done: done });
document.dispatchEvent(new CustomEvent("tasks:change", { detail: { source: "ultrasound", task: "ultrasound" } }));
document.dispatchEvent(new CustomEvent("ultrasound:change", { detail: { id: row.id } }));
return row;
});
}
function review(id, status, note, doctor) {
var row = App.records.update("exames_imagem", id, { status_leitura: status, parecer_medico: note || null, avaliado_por: doctor });
document.dispatchEvent(new CustomEvent("ultrasound:change", { detail: { id: id } }));
return row;
}
function badge(status) {
var info = STATUS[status];
return "<span class=\"badge badge--" + info.level + "\"><svg class=\"badge__icon\" aria-hidden=\"true\"><use href=\"" + info.icon + "\"/></svg><span class=\"badge__text\">" + info.short + "</span></span>";
}
function dateText(iso) {
var date = new Date(iso);
return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getUTCMonth()] + " " + date.getUTCDate() + " · " + App.formatTime(date);
}
var dialog = null;
var opener = null;
var stream = null;
var pending = null; // the Blob waiting to be sent
function stopCamera() {
if (stream) {
stream.getTracks().forEach(function (track) {
track.stop();
});
stream = null;
}
}
function build() {
dialog = document.createElement("dialog");
dialog.className = "scan";
dialog.setAttribute("aria-labelledby", "scan-title");
dialog.innerHTML =
"<div class=\"scan__container\">" +
"<div class=\"scan__head\"><div class=\"scan__heading\">" +
"<h2 class=\"scan__title\" id=\"scan-title\">Neck vein ultrasound</h2>" +
"<p class=\"scan__subtitle\">Guided, about 3 minutes. The medical team reads the image: the app never gives a diagnosis.</p></div>" +
"<button class=\"scan__close\" type=\"button\" aria-label=\"Close\"><svg class=\"scan__close-icon\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z\"/></svg></button></div>" +
"<ol class=\"scan__steps\"></ol>" +
"<fieldset class=\"scan__source\"><legend class=\"scan__legend\">Image from</legend><div class=\"scan__choices\">" +
"<label class=\"choice\"><input class=\"choice__input\" type=\"radio\" name=\"scan-source\" value=\"file\" checked><span class=\"choice__label\">The ultrasound device (saved image)</span></label>" +
"<label class=\"choice\" data-scan-camera-choice><input class=\"choice__input\" type=\"radio\" name=\"scan-source\" value=\"camera\"><span class=\"choice__label\">This device's camera, pointed at the ultrasound screen</span></label>" +
"<label class=\"choice\"><input class=\"choice__input\" type=\"radio\" name=\"scan-source\" value=\"sample\"><span class=\"choice__label\">Example image (presentation)</span></label>" +
"</div></fieldset>" +
"<div class=\"scan__panel\" data-scan-panel=\"file\"><label class=\"field__label\" for=\"scan-file\">Choose the image</label><input class=\"scan__file\" id=\"scan-file\" type=\"file\" accept=\"image
function mountAstronaut(root) {
var member = App.getProfile().member;
var urls = [];
function render() {
urls.forEach(function (url) {
URL.revokeObjectURL(url);
});
urls = [];
var rows = list(member);
var latest = rows[0];
var summary = root.querySelector("[data-ultrasound-latest]");
var history = root.querySelector("[data-ultrasound-history]");
var notice = root.querySelector("[data-ultrasound-notice]");
history.textContent = "";
if (!latest) {
summary.innerHTML = "<p class=\"card__text\">No scan yet. The first one takes about 3 minutes.</p>";
notice.hidden = true;
return;
}
var info = STATUS[latest.status_leitura];
summary.innerHTML = "<div class=\"card__header\"><p class=\"ultrasound__date\"></p>" + badge(latest.status_leitura) + "</div>" +
"<p class=\"ultrasound__state\"></p><p class=\"ultrasound__review\"></p>";
summary.querySelector(".ultrasound__date").textContent = "Last scan: " + dateText(latest.registrado_em);
summary.querySelector(".ultrasound__state").textContent = info.word + (latest.status_leitura === "pendente" ? ". You will see the reading here." : ".");
summary.querySelector(".ultrasound__review").textContent = latest.parecer_medico
? "Medical team: " + latest.parecer_medico
: latest.observacao_astronauta ? "Your note: " + latest.observacao_astronauta : "";
notice.hidden = latest.status_leitura !== "atencao" && latest.status_leitura !== "critico";
root.querySelector("[data-ultrasound-notice-text]").textContent = latest.status_leitura === "critico"
? "Act now: talk to your crew medical officer today. " + (latest.parecer_medico || "")
: "Watch: follow the medical team's advice. " + (latest.parecer_medico || "");
rows.forEach(function (row) {
var li = document.createElement("li");
li.className = "ultrasound__item";
li.innerHTML = "<img class=\"ultrasound__thumb\" width=\"120\" height=\"90\" alt=\"\" loading=\"lazy\" decoding=\"async\">" +
"<span class=\"ultrasound__item-text\"><span class=\"ultrasound__item-date\"></span>" + badge(row.status_leitura) + "</span>";
li.querySelector(".ultrasound__item-date").textContent = dateText(row.registrado_em);
li.querySelector(".ultrasound__thumb").alt = "Ultrasound image from " + dateText(row.registrado_em);
imageUrl(row).then(function (url) {
if (url) {
urls.push(url);
li.querySelector(".ultrasound__thumb").src = url;
}
});
history.appendChild(li);
});
}
root.querySelector("[data-ultrasound-start]").addEventListener("click", function (event) {
open(event.currentTarget);
});
document.addEventListener("ultrasound:change", render);
render();
}
function mountReview(root) {
var listEl = root.querySelector("[data-ultrasound-review-list]");
var live = root.querySelector("[data-ultrasound-review-live]");
var members = App.crew.members;
function render() {
listEl.textContent = "";
var rows = pendingAll().filter(function (row) {
return App.getPrivacy(row.usuario_id).vitals.cmo;
}).sort(function (a, b) {
var wait = (a.status_leitura === "pendente" ? 0 : 1) - (b.status_leitura === "pendente" ? 0 : 1);
return wait || Date.parse(b.registrado_em) - Date.parse(a.registrado_em);
}).slice(0, 6);
root.querySelector("[data-ultrasound-review-count]").textContent = rows.filter(function (row) {
return row.status_leitura === "pendente";
}).length + " waiting";
rows.forEach(function (row) {
var person = members[row.usuario_id] || { name: row.usuario_id };
var li = document.createElement("li");
li.className = "card scans__item";
var id = "scan-" + row.id;
var reviewed = row.status_leitura !== "pendente";
li.innerHTML =
"<div class=\"card__header\"><h3 class=\"card__title\"></h3>" + badge(row.status_leitura) + "</div>" +
"<p class=\"scans__meta\"></p>" +
(reviewed ? "<details class=\"help scans__details\"><summary class=\"help__summary\"><span class=\"help__label\">See image and reading</span></summary><div class=\"scans__body\">" : "<div class=\"scans__body\">") +
"<button class=\"scans__zoom\" type=\"button\" aria-expanded=\"false\"><img class=\"scans__image\" width=\"240\" height=\"180\" alt=\"\" loading=\"lazy\" decoding=\"async\"><span class=\"scans__zoom-text\">Enlarge image</span></button>" +
"<p class=\"scans__note\"></p>" +
"<form class=\"scans__form\" novalidate>" +
"<fieldset class=\"scans__status\"><legend class=\"scans__legend\">Reading</legend><div class=\"scans__choices\">" +
["normal", "atencao", "critico"].map(function (value) {
return "<label class=\"choice\"><input class=\"choice__input\" type=\"radio\" name=\"" + id + "-status\" value=\"" + value + "\"" + (row.status_leitura === value ? " checked" : "") + "><span class=\"choice__label\">" + STATUS[value].word + "</span></label>";
}).join("") +
"</div></fieldset>" +
"<div class=\"field scans__field\"><label class=\"field__label\" for=\"" + id + "-note\">Reading for the crew member</label>" +
"<textarea class=\"field__input scans__textarea\" id=\"" + id + "-note\" maxlength=\"500\" rows=\"3\"></textarea></div>" +
"<p class=\"field__error\" hidden></p>" +
"<button class=\"button button--primary\" type=\"submit\"><span class=\"button__text\">Save reading</span></button></form>" +
(reviewed ? "</div></details>" : "</div>");
li.querySelector(".card__title").textContent = person.name;
li.querySelector(".scans__meta").textContent = "Neck vein, left · " + dateText(row.registrado_em) + (row.avaliado_por ? " · read by " + (members[row.avaliado_por] ? members[row.avaliado_por].name : row.avaliado_por) : "");
li.querySelector(".scans__note").textContent = row.observacao_astronauta ? "Note from " + person.name + ": " + row.observacao_astronauta : "No note from the crew member.";
li.querySelector(".scans__textarea").value = row.parecer_medico || "";
li.querySelector(".scans__image").alt = "Ultrasound of the left neck vein, " + person.name + ", " + dateText(row.registrado_em);
imageUrl(row).then(function (url) {
if (url) {
li.querySelector(".scans__image").src = url;
}
});
var zoom = li.querySelector(".scans__zoom");
zoom.addEventListener("click", function () {
var large = zoom.getAttribute("aria-expanded") !== "true";
zoom.setAttribute("aria-expanded", large ? "true" : "false");
li.querySelector(".scans__image").classList.toggle("scans__image--large", large);
li.querySelector(".scans__zoom-text").textContent = large ? "Make image smaller" : "Enlarge image";
});
li.querySelector(".scans__form").addEventListener("submit", function (event) {
event.preventDefault();
var chosen = li.querySelector("input[name='" + id + "-status']:checked");
var error = li.querySelector(".field__error");
var note = li.querySelector(".scans__textarea").value.trim();
if (!chosen || !note) {
error.textContent = !chosen ? "Choose the reading." : "Write the reading for the crew member.";
error.hidden = false;
(chosen ? li.querySelector(".scans__textarea") : li.querySelector(".choice__input")).focus();
return;
}
review(row.id, chosen.value, note, App.getProfile().member);
li.querySelector(".card__header .badge").outerHTML = badge(chosen.value);
li.querySelector(".scans__meta").textContent = "Neck vein, left · " + dateText(row.registrado_em) + " · read by " + App.getProfile().name;
error.hidden = true;
live.textContent = "Reading saved for " + person.name + ": " + STATUS[chosen.value].word + ".";
});
listEl.appendChild(li);
});
root.querySelector("[data-ultrasound-review-empty]").hidden = rows.length > 0;
}
render();
window.addEventListener("storage", function (event) {
if (event.key && event.key.indexOf("records:exames_imagem") !== -1) {
render();
}
});
}
App.ultrasound = {
STATUS: STATUS,
list: list,
pending: pendingAll,
imageUrl: imageUrl,
save: save,
review: review,
open: open
};
seed();
var astronautRoot = document.querySelector("[data-ultrasound]");
if (astronautRoot && App.isFlight() && App.getProfile().key !== "doctor") {
mountAstronaut(astronautRoot);
}
var reviewRoot = document.querySelector("[data-ultrasound-review]");
if (reviewRoot && App.isFlight() && App.getProfile().key === "doctor") {
mountReview(reviewRoot);
}
})();