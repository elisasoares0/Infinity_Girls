/*
 * Copies the free libraries the app uses into assets/vendor/<lib>/, so nothing loads from a CDN:
 *   node tools/vendor.js   (or: npm run vendor)
 * Each library is bundled into one minified ES module with its license next to it.
 * Versions are pinned in package.json.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const ROOT = path.join(__dirname, "..");
const pkg = require(path.join(ROOT, "package.json"));

async function firebase() {
    const out = path.join(ROOT, "assets/vendor/firebase");
    fs.mkdirSync(out, { recursive: true });
    await esbuild.build({
        entryPoints: [path.join(__dirname, "vendor-entries/firebase.js")],
        outfile: path.join(out, "firebase.js"),
        bundle: true,
        format: "esm",
        minify: true,
        target: "es2020",
        legalComments: "none",
        banner: { js: "/* Firebase JS SDK " + pkg.dependencies.firebase + " (Apache-2.0), see LICENSE. Bundled by tools/vendor.js */" }
    });
    // Firebase ships no LICENSE file in its npm packages: copy the standard Apache-2.0 text
    const apache = fs.readFileSync(path.join(ROOT, "node_modules/playwright-core/LICENSE"), "utf8");
    fs.writeFileSync(path.join(out, "LICENSE"), "Firebase JavaScript SDK " + pkg.dependencies.firebase + "\nCopyright Google LLC\nhttps://github.com/firebase/firebase-js-sdk\n\n" + apache);
    const size = fs.statSync(path.join(out, "firebase.js")).size;
    console.log("assets/vendor/firebase/firebase.js · " + (size / 1024).toFixed(1) + " KB");
}

// lottie-web (MIT): the light build (SVG renderer only), copied as it ships; assets/js/motion.js loads it on demand
function lottie() {
    const out = path.join(ROOT, "assets/vendor/lottie");
    const src = path.join(ROOT, "node_modules/lottie-web");
    fs.mkdirSync(out, { recursive: true });
    const code = fs.readFileSync(path.join(src, "build/player/lottie_light.min.js"), "utf8");
    fs.writeFileSync(path.join(out, "lottie_light.min.js"), "/* lottie-web " + pkg.dependencies["lottie-web"] + " (MIT), see LICENSE. Copied by tools/vendor.js */\n" + code);
    fs.copyFileSync(path.join(src, "LICENSE.md"), path.join(out, "LICENSE"));
    const size = fs.statSync(path.join(out, "lottie_light.min.js")).size;
    console.log("assets/vendor/lottie/lottie_light.min.js · " + (size / 1024).toFixed(1) + " KB");
}

firebase().then(lottie).catch(function (error) {
    console.error(error);
    process.exit(1);
});
