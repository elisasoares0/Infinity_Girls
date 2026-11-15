// Nausea mode (space accessibility): on after a nausea log, only what matters stays easy to read, on every page
const { test, expect } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

async function start(page) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
    await freshStart(page);
    await signIn(page, "hsilva", "in");
}

async function logNausea(page, symptom, level) {
    await page.click("[data-symptom-open]");
    const dialog = page.locator("[data-symptom]");
    await dialog.locator("input[name='symptom'][value='" + symptom + "']").check();
    await dialog.locator("#symptom-level").fill(String(level));
    await dialog.locator("button[type='submit']").click();
    await expect(dialog).toBeHidden();
}

function fontSize(page, selector) {
    return page.locator(selector).first().evaluate(function (el) {
        return parseFloat(getComputedStyle(el).fontSize);
    });
}

test("logging nausea turns on nausea mode and saves the day's motion sickness score", async function ({ page }) {
    await start(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-nausea", "on");
    const bodyBefore = await fontSize(page, ".astronaut-view__live-text");
    await logNausea(page, "nausea", 2);
    await logNausea(page, "vomito", 3);
    await expect(page.locator("html")).toHaveAttribute("data-nausea", "on");
    const banner = page.locator(".nausea");
    await expect(banner).toBeVisible();
    await expect(banner.locator("[data-nausea-meta]")).toContainText("Vomiting 3/5");
    await expect(banner.locator(".nausea__step")).toHaveCount(4);
    const daily = await page.evaluate(function () {
        return App.records.list("avaliacoes_diarias", { usuario_id: "silva" })[0];
    });
    expect(daily.enjoo_gravidade_escala).toBe(3);
    expect(daily.data_registro).toBe(new Date().toISOString().slice(0, 10));

    // A compact bar, not a poster: the steps are folded, the essential line is one step larger than the rest
    await expect(banner.locator(".nausea__step").first()).toBeHidden();
    const box = await banner.boundingBox();
    expect(box.height).toBeLessThan(300);
    await banner.locator(".nausea__summary").click();
    await expect(banner.locator(".nausea__step").first()).toBeVisible();
    const meta = await fontSize(page, ".nausea__meta");
    const body = await fontSize(page, ".astronaut-view__live-text");
    expect(meta).toBeGreaterThan(body);
    expect(meta).toBeLessThanOrEqual(18);
    expect(body).toBeLessThan(bodyBefore + 0.01);
    expect(body).toBeGreaterThanOrEqual(12);
    // The mood check-in goal does not count a nausea-only row
    const checkin = await page.evaluate(function () {
        return App.goals.today().goals.filter(function (goal) {
            return goal.key === "checkin";
        })[0].met;
    });
    expect(checkin).toBe(false);
});

test("after a second nausea log the page goes up to the nausea bar", async function ({ page }) {
    await start(page);
    await logNausea(page, "nausea", 2);
    await page.locator("[data-symptoms]").scrollIntoViewIfNeeded();
    await logNausea(page, "vomito", 4);
    const panel = page.locator(".nausea__panel");
    await expect(panel).toBeFocused();
    await expect(panel).toBeInViewport();
    await expect(panel.locator("[data-nausea-meta]")).toContainText("Vomiting 4/5");
});

test("nausea mode stays on across pages from the first paint, and I feel better turns it off", async function ({ page }) {
    await start(page);
    await logNausea(page, "nausea", 3);
    // The inline theme script sets it before any app script runs
    const response = await page.goto("/pages/vitals/index.html", { waitUntil: "commit" });
    expect(response.ok()).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("data-nausea", "on");
    await expect(page.locator(".nausea")).toBeVisible();
    await page.locator("[data-nausea-off]").click();
    await expect(page.locator("html")).not.toHaveAttribute("data-nausea", "on");
    await expect(page.locator(".nausea")).toBeHidden();
    await page.goto("/index.html");
    await expect(page.locator("html")).not.toHaveAttribute("data-nausea", "on");
});

test("Profile turns nausea mode on and off by hand", async function ({ page }) {
    await start(page);
    await page.goto("/pages/profile/index.html");
    const toggle = page.locator("[data-nausea-toggle]");
    await expect(toggle).not.toBeChecked();
    await toggle.check();
    await expect(page.locator("html")).toHaveAttribute("data-nausea", "on");
    await expect(page.locator("[data-nausea-state]")).toHaveText("On");
    await expect(page.locator("[data-nausea-status]")).toContainText("until you turn it off");
    await toggle.uncheck();
    await expect(page.locator("html")).not.toHaveAttribute("data-nausea", "on");
    await expect(page.locator("[data-nausea-state]")).toHaveText("Off");
});

test("nausea mode ends by itself 24 hours after the last log", async function ({ page }) {
    await start(page);
    await page.evaluate(function () {
        localStorage.setItem("astro-health:nausea:silva", JSON.stringify({ on: true, since: Date.now() - 2 * 864e5, until: Date.now() - 1000 }));
    });
    await page.reload();
    await expect(page.locator("html")).not.toHaveAttribute("data-nausea", "on");
    await expect(page.locator(".nausea")).toHaveCount(0);
});
