/*
 * Offline app shell: every page, style, script, font and image is cached on install,
 * then served stale-while-revalidate. Live data (NASA DONKI) always goes to the network.
 * Bump CACHE_VERSION when the list changes.
 */
"use strict";

var CACHE_VERSION = "astro-health-v50";

var SHELL = [
    "./",
    "index.html",
    "pages/privacy/index.html",
    "pages/womens-health/index.html",
    "pages/body/index.html",
    "pages/mens-health/index.html",
    "pages/vitals/index.html",
    "pages/emergency/index.html",
    "pages/profile/index.html",
    "pages/learn/index.html",
    "assets/css/colors.css",
    "assets/css/spacing.css",
    "assets/css/fonts.css",
    "assets/css/base.css",
    "pages/home/home.css",
    "pages/privacy/privacy.css",
    "pages/learn/learn.css",
    "pages/womens-health/womens-health.css",
    "pages/body/body.css",
    "pages/mens-health/mens-health.css",
    "pages/vitals/vitals.css",
    "pages/emergency/emergency.css",
    "pages/profile/profile.css",
    "assets/js/app.js",
    "assets/js/api.js",
    "assets/js/crew-data.js",
    "assets/js/records.js",
    "assets/js/glucose.js",
    "assets/js/glucose-entry.js",
    "assets/js/health-info.js",
    "assets/js/inbox.js",
    "assets/js/reminders.js",
    "assets/js/symptoms.js",
    "assets/js/nausea-mode.js",
    "assets/js/goals.js",
    "assets/js/ultrasound.js",
    "assets/js/assistant-data.js",
    "assets/js/assistant.js",
    "pages/home/goals-panel.js",
    "pages/home/body-checkin.js",
    "assets/js/guides.js",
    "assets/js/voice.js",
    "assets/js/habitat.js",
    "assets/js/crew-link.js",
    "assets/js/emergency-engine.js",
    "assets/vendor/firebase/firebase.js",
    "assets/data/firebase-config.json",
    "assets/js/accounts.js",
    "assets/data/accounts.json",
    "assets/data/missions.json",
    "assets/js/today-ring.js",
    "assets/js/astronaut-3d.js",
    "assets/vendor/three/three.module.min.js",
    "assets/vendor/three/addons/loaders/GLTFLoader.js",
    "assets/vendor/three/addons/utils/BufferGeometryUtils.js",
    "assets/vendor/three/addons/loaders/DRACOLoader.js",
    "assets/vendor/three/addons/libs/draco/gltf/draco_decoder.wasm",
    "assets/vendor/three/addons/libs/draco/gltf/draco_wasm_wrapper.js",
    "assets/vendor/three/addons/environments/RoomEnvironment.js",
    "assets/models/emu.glb",
    "pages/home/home.js",
    "pages/home/crew-panel.js",
    "pages/home/exams.js",
    "pages/home/auth.js",
    "pages/privacy/privacy.js",
    "pages/learn/learn.js",
    "pages/womens-health/womens-health.js",
    "pages/body/body.js",
    "pages/mens-health/mens-health.js",
    "pages/vitals/vitals.js",
    "pages/emergency/emergency.js",
    "pages/profile/profile.js",
    "assets/fonts/fira-sans-latin-900-normal.woff2",
    "assets/fonts/fira-sans-latin-700-normal.woff2",
    "assets/fonts/overpass-latin-400-normal.woff2",
    "assets/fonts/overpass-latin-700-normal.woff2",
    "assets/img/logo-space-apps.svg",
    "assets/img/mascot-waving-200.webp",
    "assets/img/mascot-waving-400.webp",
    "assets/img/mascot-heart-160.webp",
    "assets/img/mascot-heart-320.webp",
    "assets/img/deco-orbits.webp",
    "assets/img/wave-edge-top.svg",
    "assets/img/wave-edge-bottom.svg",
    "assets/img/wave-lines.svg",
    "assets/img/wave-lines-flip.svg",
    "assets/img/stars.svg",
    "assets/img/deco-rosette.webp"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(function (cache) {
                // cache: "reload" skips the browser's HTTP cache (JS is kept an hour by firebase.json): a new version
                // never mixes a new page with an old module
                return cache.addAll(SHELL.map(function (path) {
                    return new Request(path, { cache: "reload" });
                }));
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (keys) {
                return Promise.all(keys.filter(function (key) {
                    return key !== CACHE_VERSION;
                }).map(function (key) {
                    return caches.delete(key);
                }));
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

// A reminder notification (assets/js/reminders.js) brings the app back, on the page it points to
self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    var url = event.notification.data && event.notification.data.url;
    event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windows) {
        var open = windows[0];
        if (open) {
            return open.focus().then(function (client) {
                return url ? client.navigate(url) : client;
            });
        }
        return self.clients.openWindow(url || "./");
    }));
});

self.addEventListener("fetch", function (event) {
    var request = event.request;
    var url = new URL(request.url);

    // Only same-origin GET requests; NASA DONKI and anything else go straight to the network
    if (request.method !== "GET" || url.origin !== self.location.origin) {
        return;
    }
    if (event.request.url.includes('supabase.co')) {
        return; // Deixa o Supabase ir direto para a internet sem passar pelo cache offline
    }

    event.respondWith(
        caches.open(CACHE_VERSION).then(function (cache) {
            return cache.match(request, { ignoreSearch: true }).then(function (cached) {
                // "no-cache" asks the server whether the file changed (cheap when it did not), never the stale HTTP copy
                var network = fetch(request.url, { cache: "no-cache", credentials: "same-origin" })
                    .then(function (response) {
                        if (response && response.ok) {
                            cache.put(request, response.clone());
                        }
                        return response;
                    })
                    .catch(function () {
                        return cached;
                    });
                // Serve the cached copy right away and refresh it in the background
                if (cached) {
                    event.waitUntil(network);
                    return cached;
                }
                return network;
            });
        })
    );
});
