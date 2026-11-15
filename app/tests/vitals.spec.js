// Vitals Overall: one numbered square per mission day
const { test, expect } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

test("Overall shows one numbered square per day of the long mission", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    const header = await page.locator("[data-phase-label]").first().textContent();
    const day = Number(header.match(/day (\d+)/)[1]);
    await page.goto("/pages/vitals/index.html");
    await page.getByRole("tab", { name: /overall/i }).click();
    const grid = page.locator(".heatmap").first();
    await expect(grid.locator(".heatmap__cell")).toHaveCount(day);
    await expect(grid.locator(".heatmap__cell").first()).toHaveText("1");
    await expect(grid.locator(".heatmap__cell").last()).toHaveText(String(day));
    const font = await grid.locator(".heatmap__day").first().evaluate(function (el) {
        return getComputedStyle(el).fontSize;
    });
    expect(font).toBe("12px");
});
