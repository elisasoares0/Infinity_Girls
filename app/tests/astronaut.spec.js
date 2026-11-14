// Astronaut home: readiness on top of the space band, centered over the figure, and the compact cards
const { test, expect } = require("@playwright/test");
const { freshStart, signIn } = require("./helpers");

test("readiness is centered above the 3D astronaut", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    const readiness = await page.locator(".astronaut-view__readiness").boundingBox();
    const stage = await page.locator(".astronaut-view__stage").boundingBox();
    expect(readiness.y + readiness.height).toBeLessThanOrEqual(stage.y + 1);
    expect(Math.abs((readiness.x + readiness.width / 2) - (stage.x + stage.width / 2))).toBeLessThan(2);
    await expect(page.locator("[data-readiness-badge]")).not.toBeEmpty();
    await expect(page.locator("[data-body-cards] li")).toHaveCount(8);
    const scrollWidth = await page.evaluate(function () {
        return document.documentElement.scrollWidth;
    });
    expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize().width);
});

test("the floating card lines up its actions with the text", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await page.locator("[data-body-card]").first().click();
    const pop = page.locator(".body-pop");
    await expect(pop).toBeVisible();
    await expect(pop.locator(".health-info__learn")).toBeVisible();
    // Measured in one pass: the live readings redraw the card every few seconds
    const offsets = await pop.evaluate(function (card) {
        var todo = card.querySelector(".health-info__todo").getBoundingClientRect().left;
        return Array.prototype.filter.call(card.querySelectorAll(".health-info__actions .button__text, .body-pop__actions .button__text"), function (label) {
            return label.offsetParent !== null;
        }).map(function (label) {
            return Math.abs(label.getBoundingClientRect().left - todo);
        });
    });
    expect(offsets.length).toBeGreaterThanOrEqual(2);
    offsets.forEach(function (offset) {
        expect(offset).toBeLessThanOrEqual(1);
    });
});
