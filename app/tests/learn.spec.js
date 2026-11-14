// Learn page: your health risks by phase, opened on the right risk from the indicators and the guides
const { test, expect } = require("@playwright/test");
const { freshStart, signIn } = require("./helpers");

test("an indicator in Vitals opens its risk on the Learn page", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await page.goto("/pages/vitals/index.html");
    await page.locator("[data-ring-segments] button").first().click();
    const link = page.locator(".health-info__learn").first();
    await expect(link).toBeVisible();
    const risk = /#risk-([a-z-]+)$/.exec(await link.getAttribute("href"))[1];
    await link.click();
    await expect(page).toHaveURL(new RegExp("/pages/learn/index.html#risk-" + risk + "$"));
    const details = page.locator("#risk-" + risk);
    await expect(details).toHaveAttribute("open", "");
    await expect(details.locator("summary")).toBeFocused();
    await expect(page.locator(".hazard")).toHaveCount(5);
    await expect(page.locator(".hazards .risk")).toHaveCount(17);
});

test("the chest pain guide links to the heart risk", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "cokafor", "in");
    await page.goto("/pages/emergency/index.html");
    const chest = page.locator("[data-guide-list] > li").filter({ hasText: "Chest pain or pressure" });
    await chest.locator("summary").first().click();
    await chest.locator(".guide__learn").click();
    await expect(page).toHaveURL(/#risk-cardiovascular$/);
    await expect(page.locator("#risk-cardiovascular")).toHaveAttribute("open", "");
});

test("before the flight the Learn page shows only the exams, with no radiation", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "pre");
    await page.goto("/pages/learn/index.html");
    await expect(page.locator(".exam-reasons")).toBeVisible();
    await expect(page.locator(".hazards")).toBeHidden();
    await expect(page.locator(".readapt")).toBeHidden();
    await expect(page.locator("main")).not.toContainText(/radiation/i, { useInnerText: true });
});
