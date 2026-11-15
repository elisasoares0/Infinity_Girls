(function () {
"use strict";
var App = window.App;
var HISTORY_DAYS = 30;
var WATER_TARGET_ML = 2500;
var WATER_MET_ML = 2200;
var SLEEP_MET_H = 6.5;
var member = App.getProfile().member;
function seeded(text) {
var h = 2166136261;
for (var i = 0; i < text.length; i++) {
h = Math.imul(h ^ text.charCodeAt(i), 16777619);
}
h += 0x6D2B79F5;
var t = Math.imul(h ^ (h >>> 15), h | 1);
t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function dayKey(date) {
return date.toISOString().slice(0, 10);
}
function checkinOn(key) {
return App.records.list("avaliacoes_diarias", { usuario_id: member }).filter(function (row) {
return row.data_registro === key && row.humor_escala != null;
})[0] || null;
}
function pastCheckin(date) {
return seeded(member + ":checkin:" + dayKey(date)) < 0.9;
}
function days(count) {
var water = App.crew.history(member, "hydration", count);
var exercise = App.crew.history(member, "exercise", count);
var sleep = App.crew.history(member, "sleep", count);
var goal = App.crew.exerciseGoal();
return water.map(function (day, index) {
var isToday = index === count - 1;
var key = dayKey(day.date);
var met = {
water: day.value * 1000 >= WATER_MET_ML,
exercise: exercise[index].value >= goal * 0.8,
sleep: sleep[index].value >= SLEEP_MET_H,
checkin: isToday ? Boolean(checkinOn(key)) : Boolean(checkinOn(key)) || pastCheckin(day.date)
};
return { date: day.date, met: met, all: met.water && met.exercise && met.sleep && met.checkin };
});
}
function streakOf(list) {
var count = 0;
for (var i = list.length - 1; i >= 0; i--) {
if (list[i].all) {
count += 1;
} else if (i !== list.length - 1) {
break;
}
}
return count;
}
function bestRun(list, test) {
var best = 0;
var run = 0;
list.forEach(function (day) {
run = test(day) ? run + 1 : 0;
best = Math.max(best, run);
});
return best;
}
function today() {
var vitals = {};
App.crew.todayVitals(member).forEach(function (item) {
vitals[item.key] = item;
});
var goal = App.crew.exerciseGoal();
var waterMl = Math.round(vitals.hydration.value * 1000);
var minutes = Math.round(vitals.exercise.value);
var slept = vitals.sleep.value;
var checkin = checkinOn(App.todayKey());
var goals = [
{
key: "water", label: "Water", progress: Math.min(1, waterMl / WATER_MET_ML), met: waterMl >= WATER_MET_ML,
text: (waterMl / 1000).toFixed(1) + " of " + (WATER_TARGET_ML / 1000).toFixed(1) + " L · met at " + (WATER_MET_ML / 1000).toFixed(1) + " L"
},
{
key: "exercise", label: "Exercise", progress: Math.min(1, minutes / (goal * 0.8)), met: minutes >= goal * 0.8,
text: minutes + " of " + goal + " min · met at " + Math.round(goal * 0.8) + " min"
},
{
key: "sleep", label: "Sleep", progress: Math.min(1, slept / SLEEP_MET_H), met: slept >= SLEEP_MET_H,
text: vitals.sleep.text + " last night · met at 6 h 30 min"
},
{
key: "checkin", label: "Check-in", progress: checkin ? 1 : 0, met: Boolean(checkin),
text: checkin ? "Done · mood " + checkin.humor_escala + " of 5, stress " + checkin.estresse_escala + " of 5" : "Not yet · one tap, private"
}
];
var list = days(HISTORY_DAYS);
return {
goals: goals,
met: goals.filter(function (item) {
return item.met;
}).length,
streak: streakOf(list),
waterMl: waterMl
};
}
function achievements() {
var list = days(HISTORY_DAYS);
function count(test) {
return list.filter(test).length;
}
var defs = [
{ id: "first-full-day", name: "First full day", how: "All four goals in one day.", value: count(function (d) { return d.all; }), need: 1, unit: "day" },
{ id: "streak-3", name: "Three in a row", how: "All four goals three days in a row.", value: bestRun(list, function (d) { return d.all; }), need: 3, unit: "days" },
{ id: "streak-7", name: "Full week", how: "All four goals seven days in a row.", value: bestRun(list, function (d) { return d.all; }), need: 7, unit: "days" },
{ id: "streak-30", name: "Mission month", how: "All four goals thirty days in a row.", value: bestRun(list, function (d) { return d.all; }), need: 30, unit: "days" },
{ id: "hydration-7", name: "Steady water", how: "Water goal seven days in a row.", value: bestRun(list, function (d) { return d.met.water; }), need: 7, unit: "days" },
{ id: "exercise-10", name: "Strong bones", how: "Exercise goal on ten days.", value: count(function (d) { return d.met.exercise; }), need: 10, unit: "days" },
{ id: "sleep-7", name: "Rested crew", how: "Sleep goal seven nights in a row.", value: bestRun(list, function (d) { return d.met.sleep; }), need: 7, unit: "nights" },
{ id: "checkin-14", name: "Open line", how: "Fourteen daily check-ins.", value: count(function (d) { return d.met.checkin; }), need: 14, unit: "check-ins" }
];
return defs.map(function (def) {
var value = Math.min(def.value, def.need);
return {
id: def.id, name: def.name, how: def.how, unlocked: def.value >= def.need,
progress: value / def.need,
text: def.value >= def.need ? "Unlocked" : value + " of " + def.need + " " + def.unit
};
});
}
function save() {
var state = today();
var byKey = {};
state.goals.forEach(function (item) {
byKey[item.key] = item.met;
});
return App.records.upsert("gamificacao_metas", {
usuario_id: member,
data_registro: App.todayKey(),
meta_hidratacao_ml: WATER_TARGET_ML,
hidratacao_atual_ml: state.waterMl,
exercicio_concluido: byKey.exercise,
sono_meta_atingida: byKey.sleep,
checkin_realizado: byKey.checkin,
sequencia_dias: state.streak,
conquistas_desbloqueadas: achievements().filter(function (item) {
return item.unlocked;
}).map(function (item) {
return item.id;
})
}, ["usuario_id", "data_registro"]);
}
App.goals = {
today: today,
days: days,
achievements: achievements,
save: save
};
})();