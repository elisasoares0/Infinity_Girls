// Emergency guides: listed in flight, each ticked step logged with its UTC time
const { test, expect } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

test("emergency guides log each step with a UTC time", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "cokafor", "in");
    await page.goto("/pages/emergency/index.html");
    const guides = page.locator("[data-guide-list] > li");
    await expect(guides.first()).toBeVisible();
    expect(await guides.count()).toBeGreaterThanOrEqual(8);
    const chest = guides.filter({ hasText: "Chest pain or pressure" });
    await chest.locator("summary").first().click();
    await chest.locator("input[type='checkbox']").first().check();
    await expect(chest.locator("[data-guide-log]")).toContainText(/\d{2}:\d{2} UTC/);
});
