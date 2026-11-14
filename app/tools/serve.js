/*
 * Static server for development and tests: serves the app root (not dist/).
 *   node tools/serve.js            (or: npm run serve) → http://localhost:8080
 *   PORT=9000 node tools/serve.js
 * It listens on every network interface, so phones on the same Wi-Fi can open the address it prints.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".png": "image/png",
    ".woff2": "font/woff2",
    ".glb": "model/gltf-binary",
    ".wasm": "application/wasm",
    ".txt": "text/plain; charset=utf-8"
};
// Never served: tooling, tests and dependencies
const BLOCKED = /^\/(node_modules|tests|tools|test-results|playwright-report|dist|\.git)(\/|$)/;

http.createServer(function (req, res) {
    let url = decodeURIComponent(req.url.split("?")[0]);
    if (url.endsWith("/")) {
        url += "index.html";
    }
    const file = path.normalize(path.join(ROOT, url));
    if (!file.startsWith(ROOT) || BLOCKED.test(url)) {
        res.writeHead(404);
        res.end();
        return;
    }
    fs.readFile(file, function (err, data) {
        if (err) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
        res.end(data);
    });
}).listen(PORT, "0.0.0.0", function () {
    const lan = Object.values(os.networkInterfaces()).flat().filter(function (item) {
        return item && item.family === "IPv4" && !item.internal;
    }).map(function (item) {
        return "http://" + item.address + ":" + PORT;
    });
    console.log("Serving the app at http://localhost:" + PORT + (lan.length ? " (same Wi-Fi: " + lan.join(", ") + ")" : ""));
});
