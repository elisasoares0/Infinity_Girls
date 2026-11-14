(function () {
"use strict";
var App = window.App;
var STATUS_WORD = { ok: "In range", warn: "Watch", danger: "Act now" };
var ADVICE = {
sleep: { ok: "Keep your sleep window and dim the lights 30 minutes before.", warn: "Take a 20-minute nap before 14:00 and keep the sleep station dark and cool." },
hydration: { ok: "On pace for 2.5 L today.", warn: "Drink 250 ml now and keep your water bag within reach. The dispenser counts it." },
exercise: { ok: "On track for today's goal.", warn: "Plan a 30-minute session on the treadmill or the resistance device. The device logs it." },
hr: { ok: "In range. Nothing to do.", warn: "Rest for 10 minutes. The shirt keeps measuring." },
bp: { ok: "In range. Nothing to do.", warn: "Sit still for 5 minutes. The shirt keeps measuring." },
spo2: { ok: "In range. Nothing to do.", warn: "Check the sensor fit and the cabin air. The shirt keeps measuring." },
resp: { ok: "In range. Nothing to do.", warn: "Rest and breathe slowly for 5 minutes. The shirt keeps measuring." },
temp: { ok: "In range. Nothing to do.", warn: "Drink 250 ml of water and rest for 30 minutes. The shirt rechecks after that." },
glucose: { ok: "In range. Measure again tomorrow before breakfast.", low: "Take 15 g of fast sugar now and measure again in 15 minutes.", high: "Drink 250 ml of water, tell the medical team and measure again before the next meal." }
};
var CONTEXT_ADVICE = {
rover: {
hydration: "On the drive, drink 250 ml every hour from the rover water bag.",
exercise: "The traverse counts as light activity, not as your session.",
temp: "In the rover, cool the cabin and use the rover kit thermometer if you feel unwell."
},
base: {
hydration: "After a spacewalk, drink 500 ml within the hour: the suit dries you out.",
exercise: "Walking in partial gravity loads your bones less than on Earth: keep your full session.",
temp: "After a spacewalk, rest in the base for 30 minutes before the next reading."
}
};
function healthAdvice(key, status, value) {
var text = key === "glucose" && status !== "ok"
? ADVICE.glucose[value < App.glucose.range.low ? "low" : "high"]
: ADVICE[key][status === "ok" ? "ok" : "warn"];
var context = App.getContext ? App.getContext() : null;
var extra = context && CONTEXT_ADVICE[context] ? CONTEXT_ADVICE[context][key] : "";
return extra ? text + " " + extra : text;
}
var RISKS = { sleep: "sleep", hydration: "nutrition", exercise: "fitness", hr: "cardiovascular", bp: "cardiovascular", spo2: "hypoxia", resp: "hypoxia", temp: "immune", glucose: "nutrition" };
var INFO = {
glucose: {
how: "With the glucometer from the medical kit: a drop of blood from the side of a fingertip on a test strip, read in 5 seconds. Connect the meter by Bluetooth or type the number.",
why: "Sugar is your body's fuel. Stress, less exercise and changes in insulin in space can raise it; a skipped meal on a busy day can drop it, with shaking, confusion and fainting."
},
sleep: {
how: "The Astroskin shirt follows your breathing, heart rate and movement through the night to tell sleep from rest.",
why: "Sleep restores attention and mood. On board, light and noise break it, and short nights raise the risk of mistakes."
},
hydration: {
how: "The water dispenser counts every 250 ml drink it pours for you.",
why: "In weightlessness body fluids move to the head and you feel less thirsty. Water protects the kidneys from stones and keeps you sharp."
},
exercise: {
how: "The treadmill, the bike and the resistance device log the minutes of each session on their own.",
why: "Without gravity, bones and muscles weaken month after month. Daily exercise is the main protection."
},
hr: {
how: "Electrodes in the Astroskin shirt record your heartbeat (ECG) all the time.",
why: "Heart rate shows effort, stress, fever or fluid loss. A very fast or very slow heart can make you faint."
},
bp: {
how: "The shirt estimates blood pressure from the timing of your heartbeat and the pulse wave.",
why: "In space, fluids shift toward the head. Low pressure can make you faint, mostly when you are back in gravity."
},
spo2: {
how: "The Astroskin shirt shines light through your skin and reads how red your blood is.",
why: "Oxygen keeps your brain and heart working. Low values come with cabin air problems or lung trouble."
},
resp: {
how: "A band in the shirt measures how your chest rises and falls.",
why: "Fast breathing can mean effort, fever, anxiety or a lung problem. No breathing is an emergency: the crew is alerted at once."
},
temp: {
how: "A sensor in the shirt reads your skin temperature and estimates your core temperature.",
why: "Fever is an early sign of infection. In a closed cabin, an infection can spread to the whole crew."
}
};
App.healthInfo = function (key) {
return INFO[key];
};
App.healthKeys = function () {
return Object.keys(INFO);
};
App.healthAdvice = healthAdvice;
App.healthRisk = function (key) {
return RISKS[key];
};
App.statusWord = function (status) {
return STATUS_WORD[status];
};
})();