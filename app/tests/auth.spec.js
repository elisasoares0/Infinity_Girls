// Sign-in with a flight phase, and sign-up without a mission field
const { test, expect } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

test.beforeEach(async function ({ page }) {
    await freshStart(page);
});

test("sign-up has no mission field; sign-in offers the three flight phases", async function ({ page }) {
    await expect(page.locator("#signup-mission")).toHaveCount(0);
    const phases = page.locator("[data-auth-phases] .choice:visible");
    await expect(phases).toHaveCount(3);
    await expect(page.locator("[data-auth-phase='in'] input")).toBeChecked();
});

for (const [phase, label] of [["pre", /Before flight · launch in \d+ days/], ["in", /In flight · day \d+/], ["post", /After flight · day \d+ home/]]) {
    test("signing in " + phase + " shows that phase in the header", async function ({ page }) {
        await signIn(page, "hsilva", phase);
        await expect(page.locator("[data-phase-label]").first()).toHaveText(label);
    });
}

test("the last chosen phase comes back checked", async function ({ page }) {
    await signIn(page, "hsilva", "post");
    await page.evaluate(function () {
        localStorage.removeItem("astro-health:session");
    });
    await page.goto("/index.html");
    await expect(page.locator("[data-auth-phase='post'] input")).toBeChecked();
});
