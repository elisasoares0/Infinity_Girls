/*
 * Health records shaped like the backend (App.records).
 * Tables and columns keep the backend names (../db/schema.sql, Supabase/Postgres), which are external identifiers in
 * Portuguese; the rest of the app speaks English. Rows are saved on this device first (App.store, "records:<table>"),
 * so the app works offline; each write fires "records:change", and App.sync (assets/js/sync.js) sends it to the API.
 *   App.records.insert(table, row) → the saved row (with id and registrado_em), or throws on an invalid row
 *   App.records.list(table, { usuario_id }) → rows, newest first
 *   App.records.latest(table, usuario_id) → the newest row or null
 *   App.records.upsert(table, row, keys) → insert, or update the row with the same keys (UNIQUE in the schema)
 *   App.records.update(table, id, patch) → the updated row
 *   App.records.remove(table, id) → deletes the row
 *   App.records.environment() → ambiente_missao for the signed-in person right now
 *   App.records.files.put(bucket, path, blob) → imagem_url ("local://<bucket>/<path>"); files.url(imagem_url) → object URL
 *     (IndexedDB on this device, in place of the private Supabase Storage bucket)
 * usuario_id is the crew member key today ("silva", "tanaka"…); with Supabase Auth it becomes the user's UUID.
 */
(function () {
    "use strict";

    var App = window.App;
    var MAX_ROWS = 500;

    /*
     * Columns and CHECK constraints copied from the backend schema.
     * required: NOT NULL without default; values: allowed values (CHECK ... IN); range: [min, max];
 * items: allowed elements of a text[] column.
     */
    var SCHEMA = {
        sinais_vitais: {
            columns: {
                usuario_id: { required: true },
                ambiente_missao: { values: ["nave", "estacao", "lua_base", "lua_rover", "marte_base", "marte_rover"] },
                frequencia_cardiaca_bpm: { required: true, range: [20, 250] },
                pressao_arterial_mmhg: { required: true, range: [40, 300] },
                // The systolic is pressao_arterial_mmhg; the diastolic was added by SGBD/ajustes_api.sql
                pressao_diastolica_mmhg: { range: [30, 160] },
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
        // Women's health diary: one row per person and day, every field optional (only the keys are required)
        diario_saude_feminina: {
            stamp: "atualizado_em",
            columns: {
                usuario_id: { required: true },
                data_registro: { required: true },
                sangramento: { values: ["nenhum", "escape", "leve", "moderado", "intenso"] },
                colica_escala: { range: [0, 3] },
                sintomas: { items: ["dor_cabeca", "seios_sensiveis", "inchaco", "humor", "cansaco", "nausea", "dor_lombar", "acne", "corrimento_coceira", "ondas_calor", "sono_ruim", "tontura"] },
                notas_privadas: {}
            }
        },
        // Women's health anamnesis: one row per person (UNIQUE usuario_id), mapped before launch with the flight surgeon.
        // In flight and after landing it is read only and feeds the advice of the daily logs.
        anamnese_saude_feminina: {
            stamp: "atualizado_em",
            columns: {
                usuario_id: { required: true },
                condicoes_previas: { items: ["colica_intensa", "sangramento_intenso", "endometriose", "sop", "anemia", "enxaqueca_aura", "infeccao_urinaria_repetida", "candidiase_repetida"] },
                fatores_risco_osseo: { items: ["historico_familiar", "fratura_previa", "ciclo_ausente", "injecao_trimestral", "tabagismo", "baixo_peso"] },
                fatores_risco_trombose: { items: ["pilula_estrogenio", "historico_pessoal", "historico_familiar", "disturbio_coagulacao", "tabagismo"] }
            }
        },
        // Bone health: countermeasures taken and bone pain (density comes from the DXA scans, risk from the anamnesis)
        saude_ossea: {
            stamp: "atualizado_em",
            columns: {
                usuario_id: { required: true },
                data_registro: { required: true },
                calcio_tomado: {},
                vitamina_d_tomada: {},
                dor_ossea: { items: ["costas", "quadril", "joelhos", "pes", "punhos"] },
                queda_ou_impacto: {}
            }
        },
        // Blood clot warning signs; status_alerta is set by the app from the signs and the anamnesis
        sinais_trombose: {
            stamp: "atualizado_em",
            columns: {
                usuario_id: { required: true },
                data_registro: { required: true },
                sinais: { items: ["inchaco_um_lado", "dor_panturrilha", "calor_vermelhidao", "inchaco_pescoco", "dor_cabeca_forte", "falta_ar_subita", "dor_peito"] },
                status_alerta: { required: true, values: ["normal", "atencao", "critico"] }
            }
        },
        // Body check-in: a symptom on a region of the 3D body (assets/js/symptoms.js)
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

    // ambiente_missao from the destination and the surface context (null on Earth: the backend has no value for it)
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

    // Same checks the database would run: unknown columns, NOT NULL, CHECK ranges and allowed values
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
            // items: a text[] column whose elements must come from the list (CHECK (col <@ ARRAY[...]))
            if (rule.items && (!Array.isArray(value) || value.some(function (item) {
                return rule.items.indexOf(item) === -1;
            }))) {
                throw new Error(table + "." + column + ": " + value + " is not allowed");
            }
            if (rule.values && rule.values.indexOf(value) === -1) {
                throw new Error(table + "." + column + ": " + value + " is not allowed");
            }
            if (rule.range && !(value >= rule.range[0] && value <= rule.range[1])) {
                throw new Error(table + "." + column + ": " + value + " is out of range");
            }
        });
    }

    /* ---------- Storage: on this device first; App.sync (assets/js/sync.js) sends the changes to the API ---------- */

    // Tells App.sync (and anyone else) that a row was written: { op: "insert" | "update" | "remove", table, row }
    function changed(op, table, row) {
        document.dispatchEvent(new CustomEvent("records:change", { detail: { op: op, table: table, row: row } }));
    }

    function readTable(table) {
        var rows = App.store.get("records:" + table, []);
        return Array.isArray(rows) ? rows : [];
    }

    function writeTable(table, rows) {
        App.store.set("records:" + table, rows.slice(0, MAX_ROWS));
    }

    // at: only to seed example rows with a past time (ISO); the database fills it with now()
    function insert(table, row, at) {
        validate(table, row);
        var rows = readTable(table);
        var saved = {};
        Object.keys(row).forEach(function (column) {
            saved[column] = row[column];
        });
        // id and the time column are filled by the database (BIGSERIAL, DEFAULT now())
        saved.id = rows.reduce(function (max, item) {
            return Math.max(max, item.id || 0);
        }, 0) + 1;
        saved[SCHEMA[table].stamp || "registrado_em"] = at || new Date().toISOString();
        rows.unshift(saved);
        writeTable(table, rows);
        // Example rows seeded with a past time stay on this device
        if (!at) {
            changed("insert", table, saved);
        }
        return saved;
    }

    // Columns of a saved row that the schema knows (drops id and the time column before validating)
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
        changed("update", table, rows[index]);
        return rows[index];
    }

    // Like INSERT ... ON CONFLICT (keys) DO UPDATE: one row per usuario_id and data_registro
    function upsert(table, row, keys) {
        var match = readTable(table).filter(function (item) {
            return keys.every(function (key) {
                return item[key] === row[key];
            });
        })[0];
        return match ? update(table, match.id, row) : insert(table, row);
    }

    // Like DELETE ... WHERE id = ?: used when the person clears a log they wrote
    function remove(table, id) {
        if (!SCHEMA[table]) {
            throw new Error("Unknown table: " + table);
        }
        writeTable(table, readTable(table).filter(function (row) {
            return row.id !== id;
        }));
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

    /* ---------- Files: IndexedDB in place of the private Supabase Storage bucket ---------- */
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
        remove: remove,
        list: list,
        latest: latest,
        environment: environment
    };
})();
