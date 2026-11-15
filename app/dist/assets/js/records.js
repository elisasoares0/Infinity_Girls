(function () {
"use strict";
var App = window.App;
var MAX_ROWS = 500;
var SCHEMA = {
sinais_vitais: {
columns: {
usuario_id: { required: true },
ambiente_missao: { values: ["nave", "estacao", "lua_base", "lua_rover", "marte_base", "marte_rover"] },
frequencia_cardiaca_bpm: { required: true, range: [20, 250] },
pressao_arterial_mmhg: { required: true, range: [40, 300] },
oxigenacao_spo2: { required: true, range: [50, 100] },
glicose_mg_dl: { required: true, range: [0.1, 9999] },
cetonas_mmol: {},
cortisol_saliva_ng: {},
marcador_imune_status: { values: ["normal", "elevado", "baixo"] },
calorias_kcal: {},
proteina_g: {},
vitamina_d_ui: {},
calcio_mg: {},
temperatura_celsius: {},
horas_sono: {},
status_alerta: { required: true, values: ["normal", "alerta"] }
}
},
exames_imagem: {
columns: {
usuario_id: { required: true },
tipo_exame: { required: true, values: ["ultrassom_venoso", "oct_retina", "outro"] },
regiao_anatomica: { required: true },
imagem_url: { required: true },
observacao_astronauta: {},
status_leitura: { required: true, values: ["pendente", "normal", "atencao", "critico"] },
parecer_medico: {},
avaliado_por: {}
}
},
avaliacoes_diarias: {
columns: {
usuario_id: { required: true },
data_registro: { required: true },
humor_escala: { range: [1, 5] },
estresse_escala: { range: [1, 5] },
enjoo_gravidade_escala: { range: [0, 5] },
teste_equilibrio_aprovado: {},
sans_visao_turva: {},
sans_complexo_b_tomado: {},
sans_manguito_coxa_usado: {},
notas_privadas: {}
}
},
gamificacao_metas: {
stamp: "atualizado_em",
columns: {
usuario_id: { required: true },
data_registro: { required: true },
meta_hidratacao_ml: { range: [0, 20000] },
hidratacao_atual_ml: { range: [0, 20000] },
exercicio_concluido: {},
sono_meta_atingida: {},
checkin_realizado: {},
sequencia_dias: { range: [0, 100000] },
conquistas_desbloqueadas: {}
}
},
body_checkin: {
columns: {
usuario_id: { required: true },
regiao_anatomica: { required: true },
sintoma: { required: true },
intensidade: { required: true, range: [1, 5] },
protocolo_acao: {},
resolvido: {}
}
}
};
var ENVIRONMENTS = {
station: "estacao",
transit: "nave",
"moon-base": "lua_base",
"moon-rover": "lua_rover",
"mars-base": "marte_base",
"mars-rover": "marte_rover"
};
function environment(member) {
if (!App.isFlight()) {
return null;
}
var key = App.getModeKey();
if (key === "station") {
return ENVIRONMENTS.station;
}
var context = App.getContext(member);
return context === "transit" ? ENVIRONMENTS.transit : ENVIRONMENTS[key + "-" + context] || null;
}
function validate(table, row) {
var schema = SCHEMA[table];
if (!schema) {
throw new Error("Unknown table: " + table);
}
Object.keys(row).forEach(function (column) {
if (!schema.columns[column]) {
throw new Error(table + ": unknown column " + column);
}
});
Object.keys(schema.columns).forEach(function (column) {
var rule = schema.columns[column];
var value = row[column];
if (value === undefined || value === null) {
if (rule.required) {
throw new Error(table + "." + column + " is required");
}
return;
}
if (rule.values && rule.values.indexOf(value) === -1) {
throw new Error(table + "." + column + ": " + value + " is not allowed");
}
if (rule.range && !(value >= rule.range[0] && value <= rule.range[1])) {
throw new Error(table + "." + column + ": " + value + " is out of range");
}
});
}
function readTable(table) {
var rows = App.store.get("records:" + table, []);
return Array.isArray(rows) ? rows : [];
}
function writeTable(table, rows) {
App.store.set("records:" + table, rows.slice(0, MAX_ROWS));
}
function insert(table, row, at) {
validate(table, row);
var rows = readTable(table);
var saved = {};
Object.keys(row).forEach(function (column) {
saved[column] = row[column];
});
saved.id = rows.reduce(function (max, item) {
return Math.max(max, item.id || 0);
}, 0) + 1;
saved[SCHEMA[table].stamp || "registrado_em"] = at || new Date().toISOString();
rows.unshift(saved);
writeTable(table, rows);
return saved;
}
function ownColumns(table, row) {
var copy = {};
Object.keys(SCHEMA[table].columns).forEach(function (column) {
if (row[column] !== undefined) {
copy[column] = row[column];
}
});
return copy;
}
function update(table, id, patch) {
var rows = readTable(table);
var index = rows.findIndex(function (row) {
return row.id === id;
});
if (index === -1) {
throw new Error(table + ": no row " + id);
}
var next = ownColumns(table, rows[index]);
Object.keys(patch).forEach(function (column) {
next[column] = patch[column];
});
validate(table, next);
Object.keys(next).forEach(function (column) {
rows[index][column] = next[column];
});
if (SCHEMA[table].stamp) {
rows[index][SCHEMA[table].stamp] = new Date().toISOString();
}
writeTable(table, rows);
return rows[index];
}
function upsert(table, row, keys) {
var match = readTable(table).filter(function (item) {
return keys.every(function (key) {
return item[key] === row[key];
});
})[0];
return match ? update(table, match.id, row) : insert(table, row);
}
function list(table, filter) {
var usuario = filter && filter.usuario_id;
return readTable(table).filter(function (row) {
return !usuario || row.usuario_id === usuario;
}).sort(function (a, b) {
var stamp = SCHEMA[table].stamp || "registrado_em";
return Date.parse(b[stamp]) - Date.parse(a[stamp]);
});
}
function latest(table, usuario) {
return list(table, { usuario_id: usuario })[0] || null;
}
var FILE_DB = "astro-health-files";
var dbPromise = null;
function openFiles() {
if (!dbPromise) {
dbPromise = new Promise(function (resolve, reject) {
var request = window.indexedDB.open(FILE_DB, 1);
request.onupgradeneeded = function () {
request.result.createObjectStore("files");
};
request.onsuccess = function () {
resolve(request.result);
};
request.onerror = function () {
reject(request.error);
};
});
}
return dbPromise;
}
function fileRequest(mode, run) {
return openFiles().then(function (db) {
return new Promise(function (resolve, reject) {
var transaction = db.transaction("files", mode);
var request = run(transaction.objectStore("files"));
transaction.oncomplete = function () {
resolve(request.result);
};
transaction.onerror = function () {
reject(transaction.error);
};
});
});
}
var files = {
put: function (bucket, path, blob) {
var key = bucket + "/" + path;
return fileRequest("readwrite", function (store) {
return store.put(blob, key);
}).then(function () {
return "local://" + key;
});
},
get: function (url) {
return fileRequest("readonly", function (store) {
return store.get(String(url).replace("local://", ""));
});
},
url: function (url) {
return files.get(url).then(function (blob) {
return blob ? URL.createObjectURL(blob) : null;
});
}
};
App.records = {
schema: SCHEMA,
files: files,
update: update,
upsert: upsert,
insert: insert,
list: list,
latest: latest,
environment: environment
};
})();