// Accessibility: no axe WCAG A/AA violations on the main pages, in both themes @a11y
const { test, expect } = require("@playwright/test");
const { freshStart, signIn, setTheme, expectNoA11yViolations } = require("./helpers");

const ASTRONAUT_PAGES = ["/index.html", "/pages/vitals/index.html", "/pages/body/index.html", "/pages/privacy/index.html", "/pages/profile/index.html", "/pages/womens-health/index.html", "/pages/learn/index.html"];

for (const theme of ["light", "dark"]) {
    test("signed-out home has no violations (" + theme + ") @a11y", async function ({ page }) {
        await freshStart(page);
        await setTheme(page, theme);
        await expectNoA11yViolations(page, "sign-in " + theme);
    });

    test("astronaut pages have no violations (" + theme + ") @a11y", async function ({ page }) {
        await freshStart(page);
        await signIn(page, "hsilva", "in");
        await setTheme(page, theme);
        for (const url of ASTRONAUT_PAGES) {
            await page.goto(url);
            await expectNoA11yViolations(page, url + " " + theme);
        }
    });

    test("doctor pages have no violations (" + theme + ") @a11y", async function ({ page }) {
        await freshStart(page);
        await signIn(page, "cokafor", "in");
        await setTheme(page, theme);
        for (const url of ["/index.html", "/pages/emergency/index.html", "/pages/learn/index.html"]) {
            await page.goto(url);
            await expectNoA11yViolations(page, url + " " + theme);
        }
    });
}

for (const theme of ["light", "dark"]) {
    test("SOS dialog has no violations (" + theme + ") @a11y", async function ({ page }, testInfo) {
        test.skip(testInfo.project.name !== "phone", "Runs once, on the phone project");
        await freshStart(page);
        await signIn(page, "hsilva", "in");
        await setTheme(page, theme);
        await page.click("[data-sos-open]");
        const sos = page.locator("[data-sos]");
        await expect(sos).toBeVisible();
        await expectNoA11yViolations(page, "SOS dialog " + theme);
        await sos.locator("[data-sos-cancel]").click();
        await sos.locator("[data-sos-cancel]").click();
        await expect(sos).toBeHidden();
        // Let the cancellation reach Firestore before the page closes (no open test alerts left behind)
        await page.waitForTimeout(4000);
    });
}

// Phase 2 dialogs: the daily check-in (Home) and the guided ultrasound (Body), with no real crew alerts
for (const theme of ["light", "dark"]) {
    test("check-in and ultrasound dialogs have no violations (" + theme + ") @a11y", async function ({ page }) {
        await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
            return route.abort();
        });
        await freshStart(page);
        await signIn(page, "hsilva", "in");
        await setTheme(page, theme);
        await page.click("[data-checkin-open]");
        await expect(page.locator("[data-checkin]")).toBeVisible();
        await expectNoA11yViolations(page, "check-in " + theme);
        await page.keyboard.press("Escape");
        await page.goto("/pages/body/index.html#ultrasound");
        await page.click("[data-ultrasound-start]");
        await expect(page.locator(".scan")).toBeVisible();
        await expectNoA11yViolations(page, "ultrasound " + theme);
    });
}

// Body check-in sheet and nausea mode (large essential text, the rest smaller), in both themes
for (const theme of ["light", "dark"]) {
    test("body check-in and nausea mode have no violations (" + theme + ") @a11y", async function ({ page }) {
        await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
            return route.abort();
        });
        await freshStart(page);
        await signIn(page, "hsilva", "in");
        await setTheme(page, theme);
        await page.click("[data-symptom-open]");
        const dialog = page.locator("[data-symptom]");
        await dialog.locator("input[name='symptom'][value='nausea']").check();
        await expectNoA11yViolations(page, "body check-in " + theme);
        await dialog.locator("button[type='submit']").click();
        await expect(page.locator("html")).toHaveAttribute("data-nausea", "on");
        for (const url of ["/index.html", "/pages/vitals/index.html", "/pages/profile/index.html"]) {
            await page.goto(url);
            await expectNoA11yViolations(page, "nausea mode " + url + " " + theme);
        }
    });
}
