// Presentation mode: no hint text under the fields; the automatic option names the real value
const { test, expect } = require("@playwright/test");
const { freshStart, signIn } = require("./helpers");

test("Presentation mode shows the real value in each automatic option", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await page.click("[data-demo-open]");
    const panel = page.locator("[data-demo-panel]");
    await expect(panel).toBeVisible();
    await expect(panel.locator(".demo__field .field__hint")).toHaveCount(0);
    await expect(panel.locator("[data-demo-auto='mode']")).toHaveText(/^Real mission: /);
    await expect(panel.locator("[data-demo-auto='phase']")).toHaveText(/now in flight, day \d+/);
});
