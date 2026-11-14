(function () {
"use strict";
var App = window.App;
var store = App.store;
var MEMBER_BY_PROFILE = { female: "silva", male: "tanaka", doctor: "okafor" };
var ROLE_LABELS = { astronaut: "Astronaut", doctor: "Doctor (crew medical officer)" };
var seedPromise = null;
var missionPromise = null;
function missions() {
if (!missionPromise) {
missionPromise = fetch(App.rootUrl("assets/data/missions.json"))
.then(function (response) {
return response.ok ? response.json() : { missions: [] };
})
.then(function (data) {
return Array.isArray(data.missions) ? data.missions : [];
})
.catch(function () {
return [];
});
}
return missionPromise;
}
var DAY_MS = 864e5;
function todayUTC() {
var now = new Date();
return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
function phaseOf(mission) {
var launch = Date.parse(mission.launchDate + "T00:00:00Z");
var landing = launch + mission.lengthDays * DAY_MS;
var today = todayUTC();
var key = today < launch ? "pre" : today >= landing ? "post" : "in";
return {
key: key,
launch: launch,
landing: landing,
day: Math.round((today - launch) / DAY_MS)
};
}
function phaseChoices() {
return missions().then(function (list) {
return ["pre", "in", "post"].map(function (key) {
var mission = list.filter(function (item) {
return !isNaN(Date.parse(item.launchDate)) && phaseOf(item).key === key;
})[0];
return mission ? { phase: key, mission: mission, info: phaseOf(mission) } : null;
}).filter(Boolean);
});
}
function defaultMissionId(choices) {
var saved = store.get("sign-in-mission", null);
var savedChoice = choices.filter(function (choice) {
return choice.mission.id === saved;
})[0];
var inFlight = choices.filter(function (choice) {
return choice.phase === "in";
})[0];
var pick = savedChoice || inFlight || choices[0];
return pick ? pick.mission.id : null;
}
function seeds() {
if (!seedPromise) {
seedPromise = fetch(App.rootUrl("assets/data/accounts.json"))
.then(function (response) {
return response.ok ? response.json() : { accounts: [] };
})
.then(function (data) {
return Array.isArray(data.accounts) ? data.accounts : [];
})
.catch(function () {
return [];
});
}
return seedPromise;
}
function localAccounts() {
var list = store.get("accounts", []);
return Array.isArray(list) ? list : [];
}
function saveLocal(list) {
store.set("accounts", list);
}
function load() {
return seeds().then(function (seedList) {
var local = localAccounts();
var byId = {};
local.forEach(function (account) {
byId[account.nasaId] = account;
});
var merged = seedList.map(function (account) {
return byId[account.nasaId] || account;
});
local.forEach(function (account) {
if (!seedList.some(function (seed) {
return seed.nasaId === account.nasaId;
})) {
merged.push(account);
}
});
return merged;
});
}
function normalizeNasaId(value) {
return String(value || "").trim().toLowerCase();
}
function identify(value) {
var text = String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
var astronaut = text.match(/^AST[\s-]?(\d{3,6})$/);
if (astronaut) {
return { role: "astronaut", idNumber: "AST-" + astronaut[1], label: ROLE_LABELS.astronaut };
}
var crm = text.match(/^CRM[\s-]?(?:([A-Z]{2})[\s-]?)?(\d{4,7})(?:\s?\/\s?([A-Z]{2}))?$/);
if (crm) {
var state = crm[1] || crm[3];
return { role: "doctor", idNumber: "CRM" + (state ? "-" + state : "") + " " + crm[2], label: ROLE_LABELS.doctor };
}
return null;
}
function ageOf(birthDate) {
var birth = new Date(birthDate + "T00:00:00Z");
if (isNaN(birth.getTime())) {
return null;
}
var now = new Date();
var age = now.getUTCFullYear() - birth.getUTCFullYear();
if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) {
age -= 1;
}
return age;
}
function check(data, fields) {
var errors = {};
if (fields.indexOf("nasaId") !== -1 && !/^[a-z0-9][a-z0-9._-]{2,29}$/.test(normalizeNasaId(data.nasaId))) {
errors.nasaId = "Enter your NASA ID: 3 to 30 letters or numbers, for example hsilva.";
}
if (fields.indexOf("name") !== -1 && String(data.name || "").trim().length < 2) {
errors.name = "Enter your full name.";
}
if (fields.indexOf("password") !== -1 && !(String(data.password || "").length >= 8 && /[a-z]/i.test(data.password) && /\d/.test(data.password))) {
errors.password = "Use at least 8 characters, with letters and numbers.";
}
if (fields.indexOf("confirm") !== -1 && data.confirm !== data.password) {
errors.confirm = "The two passwords are not the same.";
}
if (fields.indexOf("idNumber") !== -1 && !identify(data.idNumber)) {
errors.idNumber = "Enter an astronaut ID like AST-1234 or a medical license (CRM) like CRM-SP 123456.";
}
var who = identify(data.idNumber);
var role = data.role || (who && who.role);
if (fields.indexOf("sex") !== -1 && role === "astronaut" && data.sex !== "Female" && data.sex !== "Male") {
errors.sex = "Choose your sex: it turns on the matching health module.";
}
if (fields.indexOf("birthDate") !== -1) {
var age = ageOf(data.birthDate);
if (age === null) {
errors.birthDate = "Enter your date of birth.";
} else if (age < 18 || age > 80) {
errors.birthDate = "Check the date: crew members are between 18 and 80 years old.";
}
}
return errors;
}
function hex(buffer) {
return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
return byte.toString(16).padStart(2, "0");
}).join("");
}
function hashPassword(salt, password) {
if (!window.crypto || !window.crypto.subtle) {
return Promise.reject(new Error("This browser cannot protect passwords here. Open the app over https or localhost."));
}
return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + password)).then(hex);
}
function newSalt() {
var bytes = new Uint8Array(16);
window.crypto.getRandomValues(bytes);
return hex(bytes.buffer);
}
function profileOf(account) {
if (account.role === "doctor") {
return "doctor";
}
return account.sex === "Male" ? "male" : "female";
}
function startSession(account, missionId) {
var session = current();
var keep = session && session.mission ? session.mission.id : null;
return Promise.all([missions(), phaseChoices()]).then(function (results) {
var id = missionId || keep || defaultMissionId(results[1]);
var mission = results[0].filter(function (item) {
return item.id === id;
})[0] || null;
if (mission) {
store.set("sign-in-mission", mission.id);
}
writeSession(account, mission);
});
}
function writeSession(account, mission) {
var profile = profileOf(account);
store.set("session", {
nasaId: account.nasaId,
name: account.name,
idNumber: account.idNumber,
role: account.role,
roleLabel: ROLE_LABELS[account.role],
sex: account.sex || "",
birthDate: account.birthDate,
profile: profile,
member: account.member || MEMBER_BY_PROFILE[profile],
demo: Boolean(account.demo),
mission: mission
});
}
function current() {
return App.getSession();
}
function findAccount(nasaId) {
return load().then(function (list) {
return list.filter(function (account) {
return account.nasaId === nasaId;
})[0] || null;
});
}
function signIn(nasaId, password, missionId) {
var id = normalizeNasaId(nasaId);
return findAccount(id).then(function (account) {
if (!account) {
throw new Error("NASA ID or password is not correct.");
}
return hashPassword(account.salt, password).then(function (hash) {
if (hash !== account.hash) {
throw new Error("NASA ID or password is not correct.");
}
return startSession(account, missionId).then(function () {
return account;
});
});
});
}
function register(data) {
var errors = check(data, ["nasaId", "name", "idNumber", "sex", "birthDate", "password", "confirm"]);
if (Object.keys(errors).length) {
return Promise.reject({ errors: errors });
}
var who = identify(data.idNumber);
var nasaId = normalizeNasaId(data.nasaId);
return load().then(function (list) {
if (list.some(function (account) {
return account.nasaId === nasaId;
})) {
throw { errors: { nasaId: "This NASA ID already has an account. Sign in instead." } };
}
if (list.some(function (account) {
return account.idNumber === who.idNumber;
})) {
throw { errors: { idNumber: "This ID is already linked to another account." } };
}
var salt = newSalt();
return hashPassword(salt, data.password).then(function (hash) {
var account = {
nasaId: nasaId,
name: String(data.name).trim(),
idNumber: who.idNumber,
role: who.role,
sex: data.sex || "",
birthDate: data.birthDate,
salt: salt,
hash: hash,
demo: false,
createdAt: new Date().toISOString()
};
saveLocal(localAccounts().concat(account));
return startSession(account).then(function () {
return account;
});
});
});
}
function saveCurrent(change) {
var session = current();
if (!session) {
return Promise.reject(new Error("Sign in again to change your data."));
}
return findAccount(session.nasaId).then(function (account) {
if (!account) {
throw new Error("This account no longer exists on this device.");
}
var updated = {};
Object.keys(account).forEach(function (key) {
updated[key] = account[key];
});
return Promise.resolve(change(updated)).then(function () {
var others = localAccounts().filter(function (item) {
return item.nasaId !== updated.nasaId;
});
saveLocal(others.concat(updated));
return startSession(updated).then(function () {
return updated;
});
});
});
}
function update(changes) {
var session = current();
var errors = check({ name: changes.name, sex: changes.sex, birthDate: changes.birthDate, role: session && session.role }, ["name", "sex", "birthDate"]);
if (Object.keys(errors).length) {
return Promise.reject({ errors: errors });
}
return saveCurrent(function (account) {
account.name = String(changes.name).trim();
account.sex = changes.sex || "";
account.birthDate = changes.birthDate;
});
}
function changePassword(oldPassword, newPassword, confirm) {
var errors = check({ password: newPassword, confirm: confirm }, ["password", "confirm"]);
if (Object.keys(errors).length) {
return Promise.reject({ errors: errors });
}
return saveCurrent(function (account) {
return hashPassword(account.salt, oldPassword).then(function (hash) {
if (hash !== account.hash) {
throw { errors: { current: "Your current password is not correct." } };
}
account.salt = newSalt();
return hashPassword(account.salt, newPassword).then(function (newHash) {
account.hash = newHash;
});
});
});
}
function remove() {
var session = current();
if (!session || session.demo) {
return Promise.reject(new Error("Test accounts cannot be deleted."));
}
saveLocal(localAccounts().filter(function (account) {
return account.nasaId !== session.nasaId;
}));
store.remove("session");
return Promise.resolve();
}
function demoAccounts() {
return seeds().then(function (list) {
return list.filter(function (account) {
return account.demo;
});
});
}
App.accounts = {
load: load,
identify: identify,
check: check,
ageOf: ageOf,
signIn: signIn,
register: register,
current: current,
update: update,
changePassword: changePassword,
remove: remove,
demoAccounts: demoAccounts,
missions: missions,
phaseChoices: phaseChoices,
defaultMissionId: defaultMissionId,
roleLabels: ROLE_LABELS,
demoPassword: "Mission2026"
};
})();