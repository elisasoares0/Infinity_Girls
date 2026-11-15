/*
 * Accounts: sign in, create account, edit personal data (App.accounts). Used by the home sign-in screen and the Profile page.
 *
 * Prototype without a server:
 *   - assets/data/accounts.json holds the crew test accounts (read-only, password "Mission2026");
 *   - accounts created or edited in the app are saved on this device (store "accounts"), and win over the JSON;
 *   - passwords are kept as SHA-256(salt + ":" + password) with a random salt per account. This is not real security.
 *
 * Missions (destination, launch date, length) come from assets/data/missions.json, set by mission control.
 * The flight phase is chosen at sign-in (one mission per phase, see phaseChoices); the session keeps a copy
 * of that mission so every page knows it at once. Accounts are not tied to a mission.
 *
 * The role comes from the ID: "AST-1234" is an astronaut, "CRM-SP 123456" (or "CRM 123456/SP") is a doctor.
 * Astronauts see the module of their sex; every account uses the simulated health data of the crew member
 * with the same profile (assets/js/crew-data.js), with its own name and ID.
 *
 * Crew accounts on the server (App.api, assets/js/api.js):
 *   - signing in with an ID (AST-1234 / CRM-SP 123456) checks the password on the server;
 *     signing in with a NASA ID (hsilva) keeps working on this device only, as before (test accounts, offline);
 *   - creating an account creates it on the server; with no connection it is created on this device instead;
 *   - a copy of a server account is kept here ({ remote: true }, no password) so the Profile page can edit it.
 */
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

    /* ---------- Flight phase of each mission (same math as App.getPhase, from the real dates) ---------- */
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

    // One mission per phase, in the order of missions.json: [{ phase, mission, info }], before → in → after
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

    // The mission to open the app in when none is chosen: the last choice, or the in-flight one
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

    // Every account: the JSON ones, replaced by their edited copy when there is one, then the ones created here
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

    /* ---------- Rules ---------- */

    function normalizeNasaId(value) {
        return String(value || "").trim().toLowerCase();
    }

    // "ast 1234" → astronaut "AST-1234"; "crm sp 123456" or "CRM 123456/SP" → doctor "CRM-SP 123456"
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

    // Field checks shared by the sign-in screen and the Profile page: { field: message } for every problem
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

    /* ---------- Passwords ---------- */

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

    /* ---------- Session ---------- */

    function profileOf(account) {
        if (account.role === "doctor") {
            return "doctor";
        }
        return account.sex === "Male" ? "male" : "female";
    }

    /*
     * Saves the session, with a copy of the mission. Resolves when it is saved.
     * Mission: the one chosen at sign-in, else the one of the current session (editing the profile keeps the phase),
     * else the last choice or the in-flight mission.
     */
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
            remote: Boolean(account.remote),
            userId: account.userId || null,
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

    // Local copy of a server account. extra.nasaId keeps the NASA ID typed at sign-up for display
    function remoteAccount(user, extra) {
        var known = localAccounts().filter(function (account) {
            return account.remote && account.idNumber === user.idNumber;
        })[0];
        return {
            nasaId: (extra && extra.nasaId) || (known && known.nasaId) || user.idNumber,
            name: user.name,
            idNumber: user.idNumber,
            role: user.role,
            sex: user.sex || "",
            birthDate: user.birthDate,
            userId: user.id,
            remote: true,
            demo: false
        };
    }

    function keepRemote(account) {
        saveLocal(localAccounts().filter(function (item) {
            return item.nasaId !== account.nasaId && !(item.remote && item.idNumber === account.idNumber);
        }).concat(account));
        return account;
    }

    var LINK_WAIT_MS = 15000;

    /*
     * An account checked on this device (NASA ID sign-in) also signs in on the health server with its ID and the same
     * password, so App.sync can send its records. The first time, the server account does not exist yet: it is
     * created from this account's data. Never blocks the sign-in for long (the page reloads right after it):
     * after LINK_WAIT_MS, with no connection or with a different password on the server, the person goes on
     * on this device only. Resolves with "linked", "created" or "local".
     */
    function linkServer(account, password) {
        if (!App.api || !account.idNumber) {
            return Promise.resolve("local");
        }
        // Never keep someone else's server session on this device
        if (App.api.isSignedIn()) {
            App.api.signOut();
        }
        var link = App.api.signIn(account.idNumber, password).then(function () {
            return "linked";
        }, function (problem) {
            if (!problem || problem.status !== 401) {
                return "local";
            }
            // "ID or password is incorrect": the ID is not on the server yet (or has another password there)
            return App.api.register({
                idNumber: account.idNumber,
                name: account.name,
                password: password,
                birthDate: account.birthDate,
                sex: account.role === "astronaut" ? account.sex : null
            }).then(function () {
                return "created";
            }, function () {
                return "local";
            });
        });
        var wait = new Promise(function (resolve) {
            window.setTimeout(function () {
                resolve("local");
            }, LINK_WAIT_MS);
        });
        return Promise.race([link, wait]);
    }

    function signInLocal(nasaId, password, missionId) {
        return findAccount(nasaId).then(function (account) {
            if (!account || !account.hash) {
                throw new Error("ID or password is not correct.");
            }
            return hashPassword(account.salt, password).then(function (hash) {
                if (hash !== account.hash) {
                    throw new Error("ID or password is not correct.");
                }
                return linkServer(account, password).then(function () {
                    return startSession(account, missionId);
                }).then(function () {
                    return account;
                });
            });
        });
    }

    // Resolves with the account, or rejects with a message that never says which part was wrong.
    // login: a NASA ID (this device) or an ID like AST-1234 (server). missionId: the flight phase chosen on the sign-in screen
    function signIn(login, password, missionId) {
        var who = identify(login);
        if (!who) {
            return signInLocal(normalizeNasaId(login), password, missionId);
        }
        // An account on this device with this ID (a test account, or one created offline); signInLocal also links it
        // to the server, creating it there the first time
        function onThisDevice(problem) {
            return load().then(function (list) {
                var local = list.filter(function (account) {
                    return account.idNumber === who.idNumber && account.hash;
                })[0];
                if (!local) {
                    throw new Error((problem && problem.message) || "ID or password is not correct.");
                }
                return signInLocal(local.nasaId, password, missionId);
            });
        }
        if (!App.api) {
            return onThisDevice(null);
        }
        return App.api.signIn(who.idNumber, password).then(function (user) {
            var account = keepRemote(remoteAccount(user));
            return startSession(account, missionId).then(function () {
                return account;
            });
        }, function (problem) {
            // No connection, or not on the server yet
            if (problem && (problem.offline || problem.status === 401)) {
                return onThisDevice(problem);
            }
            throw new Error((problem && problem.message) || "Could not sign in. Try again.");
        });
    }

    // The account on this device only (no connection to the server)
    function registerLocal(data, who, nasaId) {
        return load().then(function (list) {
            if (list.some(function (account) {
                return account.idNumber === who.idNumber || account.nasaId === nasaId;
            })) {
                throw { errors: { idNumber: "This ID already has an account. Sign in with it instead." } };
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

    // data: { name, password, confirm, idNumber, sex, birthDate }. Rejects with { errors } or an Error.
    // The ID (AST-1234 / CRM-SP 123456) is the login, as on the server; only the test accounts also have a NASA ID.
    // The account is created on the server; with no connection, on this device.
    // A new account opens in the last chosen phase, or in flight
    function register(data) {
        var errors = check(data, ["name", "idNumber", "sex", "birthDate", "password", "confirm"]);
        if (Object.keys(errors).length) {
            return Promise.reject({ errors: errors });
        }
        var who = identify(data.idNumber);
        var nasaId = who.idNumber;
        if (!App.api) {
            return registerLocal(data, who, nasaId);
        }
        return App.api.register({
            idNumber: who.idNumber,
            name: String(data.name).trim(),
            password: data.password,
            birthDate: data.birthDate,
            sex: who.role === "astronaut" ? data.sex : null
        }).then(function (user) {
            var account = keepRemote(remoteAccount(user, { nasaId: nasaId }));
            return startSession(account).then(function () {
                return account;
            });
        }, function (problem) {
            if (problem && problem.offline) {
                return registerLocal(data, who, nasaId);
            }
            if (problem && problem.status === 409) {
                throw { errors: { idNumber: "This ID already has an account. Sign in with it instead." } };
            }
            if (problem && problem.fields) {
                throw { errors: problem.fields };
            }
            throw new Error((problem && problem.message) || "Could not create the account. Try again.");
        });
    }

    // Saves a changed copy of the signed-in account on this device (test accounts too) and refreshes the session
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

    // changes: { name, sex, birthDate }. Rejects with { errors }
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
            if (account.remote) {
                throw { errors: { current: "Crew account passwords are changed by mission control for now." } };
            }
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

    // Only accounts created in the app can be deleted; the crew test accounts stay
    function remove() {
        var session = current();
        if (!session || session.demo) {
            return Promise.reject(new Error("Test accounts cannot be deleted."));
        }
        saveLocal(localAccounts().filter(function (account) {
            return account.nasaId !== session.nasaId;
        }));
        store.remove("session");
        if (App.api) {
            App.api.signOut();
        }
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
