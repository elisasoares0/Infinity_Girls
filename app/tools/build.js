/*
 * Production build without dependencies: copies the site to dist/ and minifies CSS, JS and HTML.
 * Usage: node tools/build.js
 * The minifiers are conservative (comments + whitespace only) so they never change behavior. JS block comments are
 * removed only when they start a line (the project style), so a "/*" inside a string (accept="image/*") is never taken
 * for a comment. Every minified JS file is then checked with node --check: a broken file stops the build (and the deploy).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

// Only what the site needs at runtime
const INCLUDE = ["index.html", "sw.js", "assets", "pages"];

function minifyCss(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*([{};,>])\s*/g, "$1")
        .replace(/:\s+/g, ":")
        .replace(/;}/g, "}")
        .trim();
}

function minifyJs(js) {
    return js
        .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, "")
        .split("\n")
        .map(function (line) {
            return line.trim();
        })
        // Whole-line comments only: never touch "//" inside strings such as URLs
        .filter(function (line) {
            return line && line.indexOf("//") !== 0;
        })
        .join("\n");
}

function minifyHtml(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, "")
        .split("\n")
        .map(function (line) {
            return line.trim();
        })
        .filter(Boolean)
        .join("\n");
}

const MINIFIERS = { ".css": minifyCss, ".js": minifyJs, ".html": minifyHtml };

let before = 0;
let after = 0;
const minifiedJs = [];

function copy(source, target) {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
        fs.mkdirSync(target, { recursive: true });
        fs.readdirSync(source).forEach(function (name) {
            copy(path.join(source, name), path.join(target, name));
        });
        return;
    }
    // Third-party files (assets/vendor/) are already minified: copied as they are
    const minify = source.split(path.sep).indexOf("vendor") === -1 ? MINIFIERS[path.extname(source)] : null;
    if (minify) {
        const text = fs.readFileSync(source, "utf8");
        const output = minify(text);
        before += Buffer.byteLength(text);
        after += Buffer.byteLength(output);
        fs.writeFileSync(target, output);
        if (path.extname(source) === ".js") {
            minifiedJs.push(target);
        }
    } else {
        fs.copyFileSync(source, target);
    }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
INCLUDE.forEach(function (entry) {
    copy(path.join(ROOT, entry), path.join(DIST, entry));
});

// A minified file that no longer parses must never reach the deploy
const broken = minifiedJs.filter(function (file) {
    return childProcess.spawnSync(process.execPath, ["--check", file], { encoding: "utf8" }).status !== 0;
});
if (broken.length) {
    console.error("Build failed: these minified files do not parse:\n" + broken.map(function (file) {
        return "  " + path.relative(ROOT, file);
    }).join("\n"));
    process.exit(1);
}

console.log("dist/ ready · CSS, JS and HTML: " + (before / 1024).toFixed(1) + " KB → " + (after / 1024).toFixed(1) + " KB");
