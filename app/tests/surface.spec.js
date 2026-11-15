// Surface context on the Moon and Mars: transit, base or rover traverse change the header, readiness, tasks and map
const { test, expect } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

async function simulate(page, values) {
    await page.evaluate(function (entries) {
        Object.keys(entries).forEach(function (key) {
            localStorage.setItem("astro-health:" + key, JSON.stringify(entries[key]));
        });
    }, values);
    await page.reload();
}

test("rover traverse on the Moon: header, readiness, tasks and SOS map", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await simulate(page, { "mode-preview": "moon", "context-preview": "rover" });

    await expect(page.locator("[data-phase-label]").first()).toHaveText(/day \d+ · rover traverse · simulated$/);
    await expect(page.locator("[data-readiness-badge-wrap]")).toHaveText(/Ready for the traverse|Stay at the base today/);
    await expect(page.locator(".tasks__item[data-contexts='rover']").first()).toBeVisible();
    await expect(page.locator(".tasks__item[data-contexts='base']")).toBeHidden();
    const habitat = await page.evaluate(function () {
        return { location: App.habitat.locationOf("silva").id, describe: App.habitat.describe("rover"), responder: App.habitat.responderFor("silva", "rover").member };
    });
    expect(habitat.location).toBe("rover");
    expect(habitat.describe).toMatch(/minutes away/);
    expect(habitat.responder).toBe("novak");
});

test("Mars base shows the greenhouse; transit floats in microgravity", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await simulate(page, { "mode-preview": "mars", "context-preview": "base" });
    await expect(page.locator("[data-phase-label]").first()).toHaveText(/Mars base · simulated$/);
    const modules = await page.evaluate(function () {
        return App.habitat.modules().map(function (module) {
            return module.id;
        });
    });
    expect(modules).toContain("greenhouse");

    await simulate(page, { "context-preview": "transit" });
    await expect(page.locator("[data-phase-label]").first()).toHaveText(/on the way to Mars · simulated$/);
    expect(await page.evaluate(function () {
        return App.getMode().env;
    })).toMatch(/microgravity/);
});

test("the surface context field is disabled on the space station", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await page.click("[data-demo-open]");
    await expect(page.locator("[data-context-preview]")).toBeDisabled();
    await expect(page.locator("[data-demo-auto='context']")).toHaveText("Not used on the space station");
});

test("the doctor sees who is out on the rover", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "cokafor", "in");
    await simulate(page, { "mode-preview": "moon", "context-preview": "rover" });
    await expect(page.locator(".crew__fact", { hasText: "Rover traverse" })).toHaveCount(2);
});
