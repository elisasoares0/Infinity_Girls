/*
 * Writes the app's Lottie micro-interactions to assets/motion/*.json (node tools/motion.js).
 * Drawn here, not downloaded: one color (white, recolored at play time by assets/js/motion.js to the text color of
 * where it plays, so it follows the theme and its contrast), 30 fps, at most 1 second, a 96 × 96 box.
 * The last frame is always a complete, still picture: that is what reduced motion and nausea mode show.
 *   success-check  a circle draws itself, then a check            (a task ticked)
 *   heart-pulse    a heart beats twice and rests                  (all of today's goals met)
 *   orbit-loader   a dot orbits a ring, looping                   (waiting for the health server)
 *   sync-done      an arc turns and closes into a circle + check  (records synced)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "../assets/motion");
const WHITE = [1, 1, 1, 1];
const EASE_OUT = { i: { x: [0.2], y: [1] }, o: { x: [0.4], y: [0] } };

// Animated value: [[frame, value], …] (value is a number or an array)
function anim(keys) {
    return {
        a: 1,
        k: keys.map(function (key, i) {
            const value = Array.isArray(key[1]) ? key[1] : [key[1]];
            const frame = { t: key[0], s: value };
            return i < keys.length - 1 ? Object.assign(frame, EASE_OUT) : frame;
        })
    };
}

function still(value) {
    return { a: 0, k: value };
}

function transform(extra) {
    return Object.assign({ ty: "tr", p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100) }, extra || {});
}

function stroke(width) {
    return { ty: "st", c: still(WHITE), o: still(100), w: still(width), lc: 2, lj: 2 };
}

function fill() {
    return { ty: "fl", c: still(WHITE), o: still(100), r: 1 };
}

function trim(end, start) {
    return { ty: "tm", s: start || still(0), e: end, o: still(0), m: 1 };
}

function ellipse(size) {
    return { ty: "el", p: still([0, 0]), s: still([size, size]) };
}

// Path: points [x, y] with in/out tangents relative to each point
function shape(points, closed) {
    return {
        ty: "sh",
        ks: still({
            v: points.map(function (p) { return p.v; }),
            i: points.map(function (p) { return p.i || [0, 0]; }),
            o: points.map(function (p) { return p.o || [0, 0]; }),
            c: Boolean(closed)
        })
    };
}

function layer(name, index, items, op, ks) {
    return {
        ddd: 0, ind: index, ty: 4, nm: name, sr: 1,
        ks: Object.assign({ o: still(100), r: still(0), p: still([48, 48, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]) }, ks || {}),
        ao: 0,
        shapes: [{ ty: "gr", nm: name, it: items.concat([transform()]) }],
        ip: 0, op: op, st: 0, bm: 0
    };
}

function file(name, op, layers) {
    return { v: "5.7.4", fr: 30, ip: 0, op: op, w: 96, h: 96, nm: name, ddd: 0, assets: [], layers: layers };
}

const CHECK = [{ v: [-15, 1] }, { v: [-5, 11] }, { v: [16, -11] }];

const ANIMATIONS = {
    "success-check": file("success-check", 27, [
        layer("check", 1, [shape(CHECK, false), trim(anim([[9, 0], [21, 100]])), stroke(7)], 27),
        layer("circle", 2, [ellipse(76), trim(anim([[0, 0], [14, 100]])), stroke(6)], 27,
            { s: anim([[14, [100, 100, 100]], [19, [108, 108, 100]], [26, [100, 100, 100]]]) })
    ]),
    "heart-pulse": file("heart-pulse", 30, [
        layer("heart", 1, [shape([
            { v: [0, 28], i: [12, -10], o: [-12, -10] },
            { v: [-28, -4], i: [0, 12], o: [0, -16] },
            { v: [0, -16], i: [-12, -16], o: [12, -16] },
            { v: [28, -4], i: [0, -16], o: [0, 12] }
        ], true), fill()], 30, {
            s: anim([[0, [100, 100, 100]], [5, [116, 116, 100]], [10, [100, 100, 100]], [15, [112, 112, 100]], [22, [100, 100, 100]]])
        })
    ]),
    "orbit-loader": file("orbit-loader", 30, [
        layer("dot", 1, [{ ty: "el", p: still([0, -32]), s: still([14, 14]) }, fill()], 30, { r: anim([[0, 0], [30, 360]]) }),
        layer("ring", 2, [ellipse(64), stroke(4)], 30, { o: still(35) })
    ]),
    "sync-done": file("sync-done", 30, [
        layer("check", 1, [shape(CHECK, false), trim(anim([[15, 0], [27, 100]])), stroke(7)], 30),
        layer("circle", 2, [ellipse(76), trim(anim([[0, 0], [14, 100]]), anim([[0, 0], [8, 0], [14, 0]])), stroke(6)], 30,
            { r: anim([[0, -90], [14, 270]]) })
    ])
};

fs.mkdirSync(OUT, { recursive: true });
Object.keys(ANIMATIONS).forEach(function (name) {
    const json = JSON.stringify(ANIMATIONS[name]);
    fs.writeFileSync(path.join(OUT, name + ".json"), json);
    console.log("assets/motion/" + name + ".json · " + (json.length / 1024).toFixed(1) + " KB");
});
