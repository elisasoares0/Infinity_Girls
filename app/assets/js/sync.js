/*
 * Sends the health records to the AstroHealth API (App.sync).
 *
 * The device stays the first place a record is saved (App.records), so every screen works offline. When the person
 * is signed in on the server (App.api.isSignedIn()), each write fired by App.records ("records:change") joins a queue
 * ("sync-outbox") that is sent in order as soon as there is a connection. Both sign-ins reach the server: with an ID
 * (AST-1234) directly, and with a NASA ID (hsilva) after the password is checked here (accounts.js, linkServer, which
 * creates the server account the first time). If the server could not be reached at sign-in, the records stay here.
 *
 * Tables sent (the ones that exist in SGBD/schema.sql and in api/main.py):
 *   sinais_vitais       insert → POST /sinais-vitais
 *   exames_imagem       insert → POST /exames-imagem (multipart, the image from IndexedDB); update → PATCH …/parecer
 *   body_checkin        insert → POST /body-checkin; update → PATCH /body-checkin/{id}
 *   avaliacoes_diarias  today's row → PUT /avaliacoes-diarias/hoje (once mood and stress are filled in)
 *   gamificacao_metas   today's row → PUT /gamificacao/hoje
 * The women's health tables (diario_saude_feminina, anamnese_saude_feminina, saude_ossea, sinais_trombose) are not
 * in the database yet: they stay on this device.
 *
 * Only rows of the signed-in person are sent (usuario_id is the crew member key here; the server uses the token).
 * Local ids map to server ids in "sync-remote-ids", so an update reaches the right row.
 *   App.sync.flush() → sends what is waiting; App.sync.status() → { state, pending }
 *   "sync:status" event on each change; [data-sync-status] elements show it in text.
 */
(function () {
    "use strict";

    var App = window.App;
    var store = App.store;
    var OUTBOX = "sync-outbox";
    var REMOTE = "sync-remote-ids";
    var MAX_TRIES = 5;
    var RETRY_MS = 60000;
    var DAILY = { avaliacoes_diarias: true, gamificacao_metas: true };
    var SENT = { sinais_vitais: true, exames_imagem: true, body_checkin: true, avaliacoes_diarias: true, gamificacao_metas: true };

    var busy = false;
    var timer = 0;
    var lastState = "local";

    function outbox() {
        var list = store.get(OUTBOX, []);
        return Array.isArray(list) ? list : [];
    }

    function saveOutbox(list) {
        store.set(OUTBOX, list);
    }

    function remoteIds() {
        return store.get(REMOTE, {}) || {};
    }

    function remoteId(table, localId) {
        return remoteIds()[table + ":" + localId] || null;
    }

    function setRemoteId(table, localId, id) {
        var map = remoteIds();
        map[table + ":" + localId] = id;
        store.set(REMOTE, map);
    }

    function session() {
        return App.getSession ? App.getSession() : null;
    }

    function signedIn() {
        var current = session();
        return Boolean(App.api && App.api.isSignedIn() && current && current.idNumber);
    }

    function isToday(date) {
        return date === App.todayKey();
    }

    function findRow(table, localId) {
        return App.records.list(table).filter(function (row) {
            return row.id === localId;
        })[0] || null;
    }

    // Copies the columns that are set (the API fills in its defaults for the rest)
    function pick(row, columns) {
        var body = {};
        columns.forEach(function (column) {
            if (row[column] !== undefined && row[column] !== null) {
                body[column] = row[column];
            }
        });
        return body;
    }

    /* ---------- Queue ---------- */

    function enqueue(detail) {
        var current = session();
        var row = detail.row;
        // The doctor's review is written on the patient's scan; everything else must be the person's own row
        var review = detail.table === "exames_imagem" && detail.op === "update" && current && current.role === "doctor";
        if (!SENT[detail.table] || !current || !row || (row.usuario_id !== current.member && !review)) {
            return;
        }
        var owner = current.idNumber;
        var list = outbox();
        if (DAILY[detail.table]) {
            // One row per person and day on the server: only the latest version needs to go
            list = list.filter(function (item) {
                return !(item.table === detail.table && item.owner === owner && item.date === row.data_registro);
            });
            list.push({ op: "daily", table: detail.table, localId: row.id, date: row.data_registro, owner: owner, tries: 0 });
        } else if (detail.op === "insert" || detail.op === "update") {
            list.push({ op: detail.op, table: detail.table, localId: row.id, owner: owner, tries: 0 });
        }
        saveOutbox(list);
        announce();
        flush();
    }

    /* ---------- One request per queued item ---------- */

    function sendVitals(row) {
        if (row.pressao_diastolica_mmhg === undefined || row.pressao_diastolica_mmhg === null) {
            return null;
        }
        var body = pick(row, ["frequencia_cardiaca_bpm", "oxigenacao_spo2", "glicose_mg_dl", "cetonas_mmol", "cortisol_saliva_ng",
            "marcador_imune_status", "temperatura_celsius", "horas_sono", "calorias_kcal", "proteina_g", "vitamina_d_ui", "calcio_mg",
            "ambiente_missao", "pressao_diastolica_mmhg"]);
        body.pressao_sistolica_mmhg = row.pressao_arterial_mmhg;
        return App.api.request("/sinais-vitais", { method: "POST", body: body });
    }

    function sendScan(row) {
        return App.records.files.get(row.imagem_url).then(function (blob) {
            if (!blob) {
                return null;
            }
            var region = String(row.regiao_anatomica).replace(/_/g, " ");
            var note = row.observacao_astronauta ? ". Note: " + row.observacao_astronauta : "";
            var form = new FormData();
            form.append("arquivo", blob, "scan." + (String(blob.type).split("/")[1] || "webp"));
            form.append("regiao_anatomica", row.regiao_anatomica);
            form.append("tipo_exame", row.tipo_exame);
            form.append("descricao_imagem", ("Venous ultrasound of the " + region + note).slice(0, 500));
            if (row.observacao_astronauta) {
                form.append("observacao_astronauta", row.observacao_astronauta);
            }
            return App.api.request("/exames-imagem", { method: "POST", body: form });
        });
    }

    function sendReview(row) {
        var id = remoteId("exames_imagem", row.id);
        var current = session();
        if (!id || !current || current.role !== "doctor" || row.status_leitura === "pendente") {
            return null;
        }
        return App.api.request("/exames-imagem/" + id + "/parecer", {
            method: "PATCH",
            body: { status_leitura: row.status_leitura, parecer_medico: row.parecer_medico || "" }
        });
    }

    function sendCheckin(row, op) {
        if (op === "update") {
            var id = remoteId("body_checkin", row.id);
            return id ? App.api.request("/body-checkin/" + id, { method: "PATCH", body: { resolvido: Boolean(row.resolvido) } }) : null;
        }
        return App.api.request("/body-checkin", {
            method: "POST",
            body: pick(row, ["regiao_anatomica", "sintoma", "intensidade", "protocolo_acao"])
        });
    }

    function sendDaily(table, row) {
        if (!isToday(row.data_registro)) {
            return null;
        }
        if (table === "avaliacoes_diarias") {
            // The server needs mood and stress; a nausea-only log waits for the full check-in
            if (!row.humor_escala || !row.estresse_escala) {
                return null;
            }
            return App.api.request("/avaliacoes-diarias/hoje", {
                method: "PUT",
                body: pick(row, ["humor_escala", "estresse_escala", "enjoo_gravidade_escala", "sans_visao_turva", "sans_complexo_b_tomado",
                    "sans_manguito_coxa_usado", "teste_equilibrio_aprovado", "notas_privadas"])
            });
        }
        return App.api.request("/gamificacao/hoje", {
            method: "PUT",
            body: {
                hidratacao_atual_ml: Math.min(10000, Math.round(row.hidratacao_atual_ml || 0)),
                exercicio_concluido: Boolean(row.exercicio_concluido),
                sono_meta_atingida: Boolean(row.sono_meta_atingida)
            }
        });
    }

    // Resolves with the server row, or null when there is nothing to send for this item
    function send(item) {
        var row = findRow(item.table, item.localId);
        if (!row) {
            return Promise.resolve(null);
        }
        var request = null;
        if (item.op === "daily") {
            request = sendDaily(item.table, row);
        } else if (item.table === "sinais_vitais" && item.op === "insert") {
            request = sendVitals(row);
        } else if (item.table === "exames_imagem") {
            request = item.op === "insert" ? sendScan(row) : sendReview(row);
        } else if (item.table === "body_checkin") {
            request = sendCheckin(row, item.op);
        }
        return Promise.resolve(request).then(function (saved) {
            if (saved && saved.id && item.op === "insert") {
                setRemoteId(item.table, item.localId, saved.id);
            }
            return saved;
        });
    }

    /* ---------- Sending ---------- */

    function schedule() {
        window.clearTimeout(timer);
        timer = outbox().length ? window.setTimeout(flush, RETRY_MS) : 0;
    }

    // Sends the waiting items of the signed-in person, in order; stops at the first network problem
    function flush() {
        if (busy || !signedIn()) {
            announce();
            return Promise.resolve();
        }
        if (navigator.onLine === false) {
            announce("offline");
            schedule();
            return Promise.resolve();
        }
        var owner = session().idNumber;
        busy = true;
        announce("sending");

        function next() {
            var item = outbox().filter(function (entry) {
                return entry.owner === owner;
            })[0];
            if (!item) {
                return Promise.resolve("synced");
            }
            return send(item).then(function () {
                drop(item);
                return next();
            }, function (problem) {
                if (problem && problem.offline) {
                    return "offline";
                }
                if (problem && problem.status === 401) {
                    return "signed-out";
                }
                // Refused data (422, 403…) never sends again; a server error is tried a few more times
                if (problem && problem.status >= 400 && problem.status < 500) {
                    window.console.warn("App.sync: the server refused a " + item.table + " row", problem);
                    drop(item);
                    return next();
                }
                item.tries += 1;
                if (item.tries >= MAX_TRIES) {
                    window.console.warn("App.sync: gave up on a " + item.table + " row", problem);
                    drop(item);
                    return next();
                }
                update(item);
                return "error";
            });
        }

        return next().then(function (state) {
            busy = false;
            announce(state);
            schedule();
        });
    }

    function drop(item) {
        saveOutbox(outbox().filter(function (entry) {
            return !(entry.table === item.table && entry.localId === item.localId && entry.op === item.op && entry.owner === item.owner);
        }));
    }

    function update(item) {
        saveOutbox(outbox().map(function (entry) {
            return entry.table === item.table && entry.localId === item.localId && entry.op === item.op && entry.owner === item.owner ? item : entry;
        }));
    }

    /* ---------- State, in text ---------- */

    function pending() {
        var current = session();
        return current ? outbox().filter(function (item) {
            return item.owner === current.idNumber;
        }).length : 0;
    }

    function status() {
        return { state: lastState, pending: pending() };
    }

    var TEXT = {
        local: "Saved on this device only: the health server could not be reached at sign-in",
        offline: "Offline: saved on this device, sent when the connection is back",
        sending: "Sending to the health server…",
        error: "The health server did not answer. Saved on this device, trying again in a minute",
        "signed-out": "Session expired: sign in again with your crew ID to send the records"
    };

    function describe(state, count) {
        if (state === "synced" && !count) {
            return "Synced with the health server";
        }
        if (state === "synced" || state === "waiting") {
            return count + (count === 1 ? " record" : " records") + " waiting to send";
        }
        return TEXT[state] || TEXT.local;
    }

    // state: what the last attempt found ("sending", "error"…); without one, worked out from the session and the queue
    function announce(state) {
        var count = pending();
        var previous = lastState;
        if (!signedIn()) {
            lastState = "local";
        } else if (navigator.onLine === false) {
            lastState = "offline";
        } else if (state) {
            lastState = state;
        } else if (lastState !== "error" && lastState !== "sending") {
            lastState = count ? "waiting" : "synced";
        }
        var text = describe(lastState, count);
        Array.prototype.forEach.call(document.querySelectorAll("[data-sync-status]"), function (element) {
            if (element.textContent !== text) {
                element.textContent = text;
            }
        });
        animate(previous, lastState);
        document.dispatchEvent(new CustomEvent("sync:status", { detail: { state: lastState, pending: count } }));
    }

    // Decoration next to the text (App.motion): an orbit while sending, a closing circle + check when it is all sent
    var shown = null;
    function animate(from, to) {
        var host = document.querySelector("[data-sync-motion]");
        if (!host || !App.motion || to === shown) {
            return;
        }
        shown = to;
        if (to === "sending") {
            App.motion.play("orbit-loader", host, { loop: true });
        } else if (to === "synced" && from === "sending") {
            App.motion.play("sync-done", host);
        } else if (to !== "synced") {
            App.motion.stop(host);
        }
    }

    document.addEventListener("records:change", function (event) {
        enqueue(event.detail);
    });
    window.addEventListener("online", function () {
        flush();
    });
    window.addEventListener("offline", function () {
        announce("offline");
    });
    document.addEventListener("DOMContentLoaded", function () {
        announce();
        flush();
    });

    // A sign-in on the server sends what this person left waiting
    if (App.api) {
        ["signIn", "register"].forEach(function (name) {
            var original = App.api[name];
            App.api[name] = function () {
                return original.apply(App.api, arguments).then(function (user) {
                    window.setTimeout(flush, 0);
                    return user;
                });
            };
        });
    }

    App.sync = {
        flush: flush,
        status: status,
        pending: pending
    };
})();
