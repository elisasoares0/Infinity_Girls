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
    // The space band runs edge to edge
    const band = await page.locator(".astronaut-view__layout").boundingBox();
    const clientWidth = await page.evaluate(function () {
        return document.documentElement.clientWidth;
    });
    expect(Math.abs(band.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(band.width - clientWidth)).toBeLessThanOrEqual(1);
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

// A tap on a sensor dot opens the card; closing it keeps the figure where it was (on phones the cards sit below)
test("closing the card opened from the 3D figure does not scroll the page", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await expect(page.locator(".astronaut-view__canvas--ready")).toHaveCount(1, { timeout: 90000 });
    await page.locator(".astronaut-view__stage").scrollIntoViewIfNeeded();
    const pop = page.locator(".body-pop");
    const keys = await page.locator("[data-body-card]").evaluateAll(function (cards) {
        return cards.map(function (card) {
            return card.getAttribute("data-body-card");
        });
    });
    let opened = null;
    for (const key of keys) {
        const point = await page.evaluate(function (name) {
            var host = document.querySelector("[data-astronaut-canvas]").getBoundingClientRect();
            var spot = window.App.astronautView().screenOf(name);
            return { x: host.left + spot.x, y: host.top + spot.y };
        }, key);
        await page.mouse.click(point.x, point.y);
        if (await pop.isVisible()) {
            opened = key;
            break;
        }
    }
    expect(opened).not.toBeNull();
    for (const close of ["button", "Escape"]) {
        if (!(await pop.isVisible())) {
            const point = await page.evaluate(function (name) {
                var host = document.querySelector("[data-astronaut-canvas]").getBoundingClientRect();
                var spot = window.App.astronautView().screenOf(name);
                return { x: host.left + spot.x, y: host.top + spot.y };
            }, opened);
            await page.mouse.click(point.x, point.y);
            await expect(pop).toBeVisible();
        }
        const before = await page.evaluate(function () {
            return window.scrollY;
        });
        if (close === "button") {
            await page.locator("[data-pop-close]").click();
        } else {
            await page.keyboard.press("Escape");
        }
        await expect(pop).toBeHidden();
        const after = await page.evaluate(function () {
            return window.scrollY;
        });
        expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
        await expect(page.locator("[data-body-card='" + opened + "']")).toBeFocused();
    }
});

// The service worker would answer from its cache, out of reach of page.route: blocked here
test.describe("3D load error", function () {
    test.use({ serviceWorkers: "block" });

    test("a 3D load error says so and Try again loads it without reloading", async function ({ page }) {
        await page.route(/emu\.glb$/, function (route) {
            return route.abort();
        });
        await freshStart(page);
        await signIn(page, "hsilva", "in");
        const fallback = page.locator("[data-astronaut-fallback]");
        await expect(fallback).toContainText("Could not load the 3D view", { timeout: 60000 });
        const retry = page.locator("[data-astronaut-retry]");
        await expect(retry).toBeVisible();
        await page.unroute(/emu\.glb$/);
        await retry.click();
        await expect(page.locator(".astronaut-view__canvas--ready")).toHaveCount(1, { timeout: 90000 });
        await expect(fallback).toBeHidden();
        await expect(retry).toBeHidden();
    });
});
