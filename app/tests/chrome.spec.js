// Shared chrome written by tools/chrome.js: every page carries the same footer (credits and the Presentation mode button)
const { test, expect } = require("./fixtures");
const fs = require("fs");
const path = require("path");
const { freshStart, signIn } = require("./helpers");

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

test("the Presentation mode button is in the footer, not in the header", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    for (const url of ["/index.html", "/pages/vitals/index.html", "/pages/profile/index.html", "/pages/learn/index.html"]) {
        await page.goto(url);
        await expect(page.locator(".app-footer [data-demo-open]")).toHaveCount(1);
        await expect(page.locator(".app-header [data-demo-open]")).toHaveCount(0);
    }
    await page.locator("[data-demo-open]").click();
    await expect(page.locator("[data-demo-panel]")).toBeVisible();
});

test("every page has the same single footer", function () {
    const reference = footer("index.html");
    expect(reference).toHaveLength(1);
    PAGES.forEach(function (file) {
        expect(footer(file), file).toEqual(reference);
    });
});
