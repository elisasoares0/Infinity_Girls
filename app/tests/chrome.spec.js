// Shared chrome written by tools/chrome.js: every page carries the same footer (credits only)
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PAGES = ["index.html"].concat(fs.readdirSync(path.join(ROOT, "pages")).map(function (name) {
    return "pages/" + name + "/index.html";
}).filter(function (file) {
    return fs.existsSync(path.join(ROOT, file));
}));

function footer(file) {
    const match = fs.readFileSync(path.join(ROOT, file), "utf8").match(/<footer class="app-footer">[\s\S]*?<\/footer>/g);
    return match ? match : [];
}

test("every page has the same single footer", function () {
    const reference = footer("index.html");
    expect(reference).toHaveLength(1);
    PAGES.forEach(function (file) {
        expect(footer(file), file).toEqual(reference);
    });
});
