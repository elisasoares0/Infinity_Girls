/*
 * Micro-interactions with Lottie (App.motion). Animations drawn for the app (tools/motion.js → assets/motion/*.json),
 * played by lottie-web (MIT, assets/vendor/lottie/lottie_light.min.js: SVG renderer only).
 *   App.motion.play(name, host, { loop }) → Promise of the animation, or null when it does not play
 *   App.motion.stop(host)
 * Rules (design system, "Motion"):
 *   - Decoration only: host is aria-hidden; the same news is always in text (visible or aria-live) next to it.
 *   - The player and the file load on the first play, never with the page (PageSpeed).
 *   - Reduced motion (device setting) and nausea mode: the last frame, still.
 *   - Never inside the SOS dialog or an emergency guide: an emergency stays calm.
 *   - One color: the text color of the host (currentColor), so it follows the theme and its contrast.
 *   - Without the player or the file (offline, blocked), nothing breaks: whatever the host shows stays.
 */
(function () {
    "use strict";

    var App = window.App;
    var player = null;
    var files = {};
    var playing = new WeakMap();

    function calm() {
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        return reduce || document.documentElement.hasAttribute("data-nausea");
    }

    function loadPlayer() {
        if (window.lottie) {
            return Promise.resolve(window.lottie);
        }
        if (!player) {
            player = new Promise(function (resolve, reject) {
                var script = document.createElement("script");
                script.src = App.rootUrl("assets/vendor/lottie/lottie_light.min.js");
                script.async = true;
                script.onload = function () {
                    if (window.lottie) {
                        resolve(window.lottie);
                    } else {
                        reject(new Error("lottie did not load"));
                    }
                };
                script.onerror = function () {
                    player = null;
                    reject(new Error("lottie did not load"));
                };
                document.head.appendChild(script);
            });
        }
        return player;
    }

    function loadFile(name) {
        if (!files[name]) {
            files[name] = fetch(App.rootUrl("assets/motion/" + name + ".json")).then(function (response) {
                if (!response.ok) {
                    throw new Error("motion file " + name);
                }
                return response.json();
            }).catch(function (error) {
                delete files[name];
                throw error;
            });
        }
        return files[name];
    }

    // "rgb(7, 23, 63)" → [0.027, 0.09, 0.247, 1]
    function rgba(cssColor) {
        var parts = String(cssColor).match(/[\d.]+/g) || [255, 255, 255];
        return [parts[0] / 255, parts[1] / 255, parts[2] / 255, 1];
    }

    // Every stroke and fill color of the file becomes the host's text color (a fresh copy each time)
    function recolor(data, color) {
        var copy = JSON.parse(JSON.stringify(data));
        (function walk(node) {
            if (Array.isArray(node)) {
                node.forEach(walk);
            } else if (node && typeof node === "object") {
                if ((node.ty === "st" || node.ty === "fl") && node.c) {
                    node.c = { a: 0, k: color };
                }
                Object.keys(node).forEach(function (key) {
                    walk(node[key]);
                });
            }
        })(copy);
        return copy;
    }

    function stop(host) {
        var current = playing.get(host);
        if (current) {
            current.destroy();
            playing.delete(host);
        }
        host.classList.remove("motion--playing");
    }

    function play(name, host, options) {
        if (!host || host.closest(".sos, .guide, [data-emergency]")) {
            return Promise.resolve(null);
        }
        options = options || {};
        return Promise.all([loadPlayer(), loadFile(name)]).then(function (loaded) {
            stop(host);
            var still = calm();
            var data = recolor(loaded[1], rgba(window.getComputedStyle(host).color));
            var animation = loaded[0].loadAnimation({
                container: host,
                renderer: "svg",
                loop: Boolean(options.loop) && !still,
                autoplay: !still,
                animationData: data,
                rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: false }
            });
            playing.set(host, animation);
            host.classList.add("motion--playing");
            var svg = host.querySelector("svg");
            if (svg) {
                svg.setAttribute("aria-hidden", "true");
                svg.setAttribute("focusable", "false");
            }
            if (still) {
                animation.goToAndStop(data.op - 1, true);
            }
            return animation;
        }).catch(function () {
            return null;
        });
    }

    App.motion = {
        play: play,
        stop: stop
    };
})();
