/*
 * Crew link (App.crewLink): emergency alerts between the crew's devices in real time.
 * Firestore (free Spark plan) with anonymous sign-in and an offline queue, loaded only after the page has loaded,
 * only with a session and in flight. A BroadcastChannel also delivers between tabs of the same device right away,
 * with or without a connection. On board this stands for the spacecraft's own network; Earth gets it at the next contact.
 *
 *   App.crewLink.raise(alert)      → alert id (written now, sent when there is a connection)
 *   App.crewLink.respond(id)       → "I'm on my way" from this device's crew member
 *   App.crewLink.resolve(id)       → closes the alert (the person who raised it, or the crew medical officer)
 *   App.crewLink.subscribe(fn)     → fn(alerts) with every open alert of the mission, on each change
 *   App.crewLink.status()          → "off" | "connecting" | "online" | "offline"
 *
 * Shared in an alert (privacy rule): who, the scenario, the vital signs of that alert and the location. Nothing else.
 * Rules: firestore.rules (missions/{missionId}/alerts/{alertId}).
 */
(function () {
    "use strict";

    var App = window.App;
    var MAX_AGE_MS = 2 * 36e5;
    var subscribers = [];
    var alerts = {};     // id → alert, merged from Firestore and the BroadcastChannel
    var pending = [];    // writes waiting for the sign-in
    var fb = null;       // the Firebase module, once loaded
    var db = null;
    var ready = false;
    var state = "off";
    var channel = null;

    function session() {
        return App.getSession ? App.getSession() : null;
    }

    function missionId() {
        var current = session();
        return current && current.mission ? current.mission.id : "demo";
    }

    function me() {
        var profile = App.getProfile();
        var member = profile.member;
        var person = App.crew && App.crew.members[member];
        return { member: member, name: person ? person.name : profile.name };
    }

    function notify() {
        var now = Date.now();
        var list = Object.keys(alerts).map(function (id) {
            return alerts[id];
        }).filter(function (alert) {
            return alert.status !== "resolved" && now - alert.clientTime < MAX_AGE_MS;
        }).sort(function (a, b) {
            return b.clientTime - a.clientTime;
        });
        subscribers.forEach(function (fn) {
            fn(list);
        });
    }

    function merge(id, data) {
        alerts[id] = Object.assign({}, alerts[id] || {}, data, { id: id });
        notify();
    }

    function setState(next) {
        state = next;
        document.dispatchEvent(new CustomEvent("crewlink:status", { detail: { status: next } }));
    }

    /* ---------- Same device: other tabs, even offline ---------- */
    if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("astro-health-crew");
        channel.onmessage = function (event) {
            var message = event.data || {};
            if (message.mission === missionId() && message.id && message.alert) {
                merge(message.id, message.alert);
            }
        };
    }

    function broadcast(id, alert) {
        if (channel) {
            channel.postMessage({ mission: missionId(), id: id, alert: alert });
        }
    }

    function newId() {
        var bytes = new Uint8Array(10);
        window.crypto.getRandomValues(bytes);
        return Array.prototype.map.call(bytes, function (byte) {
            return byte.toString(16).padStart(2, "0");
        }).join("");
    }

    /* ---------- Firestore ---------- */
    function alertsRef() {
        return fb.collection(db, "missions", missionId(), "alerts");
    }

    function flush() {
        if (!ready) {
            return;
        }
        while (pending.length) {
            var job = pending.shift();
            job();
        }
    }

    function run(job) {
        pending.push(job);
        flush();
    }

    function listen() {
        var q = fb.query(alertsRef(), fb.where("status", "in", ["open", "responding"]));
        fb.onSnapshot(q, function (snapshot) {
            snapshot.docChanges().forEach(function (change) {
                var data = change.doc.data();
                if (change.type === "removed") {
                    // Left the query: resolved (or no longer readable)
                    if (alerts[change.doc.id]) {
                        merge(change.doc.id, { status: "resolved" });
                    }
                    return;
                }
                merge(change.doc.id, data);
            });
            setState(snapshot.metadata.fromCache && navigator.onLine === false ? "offline" : "online");
        }, function () {
            setState("offline");
        });
    }

    function connect() {
        if (!App.getSavedProfileKey() || !App.isFlight()) {
            return;
        }
        setState("connecting");
        Promise.all([
            import(App.rootUrl("assets/vendor/firebase/firebase.js")),
            fetch(App.rootUrl("assets/data/firebase-config.json")).then(function (response) {
                return response.json();
            })
        ]).then(function (results) {
            fb = results[0];
            var app = fb.initializeApp(results[1]);
            db = fb.initializeFirestore(app, {
                localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() })
            });
            var auth = fb.getAuth(app);
            fb.onAuthStateChanged(auth, function (user) {
                if (user && !ready) {
                    ready = true;
                    listen();
                    flush();
                }
            });
            if (!auth.currentUser) {
                fb.signInAnonymously(auth).catch(function () {
                    setState("offline"); // Retried when the connection comes back
                });
            }
        }).catch(function () {
            setState("offline"); // Firebase could not load: the same-device channel still works
        });
    }

    window.addEventListener("online", function () {
        if (!fb) {
            connect();
        } else if (!ready) {
            var auth = fb.getAuth();
            fb.signInAnonymously(auth).catch(function () {});
        }
    });

    /* ---------- API ---------- */
    function raise(alert) {
        var id = newId();
        var now = Date.now();
        var data = {
            member: alert.member,
            memberName: alert.memberName,
            role: alert.role || "",
            scenario: alert.scenario,
            title: alert.title,
            vitals: (alert.vitals || []).slice(0, 10),
            location: alert.location,
            status: "open",
            responders: [],
            clientTime: now
        };
        merge(id, data);
        broadcast(id, data);
        run(function () {
            var ref = fb.doc(alertsRef(), id);
            fb.setDoc(ref, Object.assign({}, data, { createdAt: fb.serverTimestamp() })).catch(function () {});
        });
        return id;
    }

    function respond(id) {
        var who = me();
        var alert = alerts[id];
        if (!alert) {
            return;
        }
        var responder = { member: who.member, name: who.name, at: Date.now() };
        var responders = (alert.responders || []).filter(function (item) {
            return item.member !== who.member;
        }).concat(responder);
        merge(id, { status: "responding", responders: responders });
        broadcast(id, alerts[id]);
        run(function () {
            fb.updateDoc(fb.doc(alertsRef(), id), {
                status: "responding",
                responders: fb.arrayUnion(responder),
                updatedAt: fb.serverTimestamp()
            }).catch(function () {});
        });
    }

    function resolve(id) {
        if (!alerts[id]) {
            return;
        }
        merge(id, { status: "resolved" });
        broadcast(id, alerts[id]);
        run(function () {
            fb.updateDoc(fb.doc(alertsRef(), id), {
                status: "resolved",
                resolvedAt: fb.serverTimestamp(),
                updatedAt: fb.serverTimestamp()
            }).catch(function () {});
        });
    }

    function subscribe(fn) {
        subscribers.push(fn);
        notify();
    }

    // Loads after the page is ready, so it never slows the first paint
    if (document.readyState === "complete") {
        connect();
    } else {
        window.addEventListener("load", connect);
    }

    App.crewLink = {
        raise: raise,
        respond: respond,
        resolve: resolve,
        subscribe: subscribe,
        get: function (id) {
            return alerts[id] || null;
        },
        me: me,
        status: function () {
            return state;
        }
    };
})();
