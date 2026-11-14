// Shared steps for the tests: clean storage, sign in with a flight phase, run axe
const { expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const PASSWORD = "Mission2026";

// Starts from an empty device (no session, no saved choices)
async function freshStart(page) {
    await page.goto("/index.html");
    await page.evaluate(function () {
        localStorage.clear();
        sessionStorage.clear();
    });
    await page.goto("/index.html");
}

// phase: "pre" | "in" | "post"
async function signIn(page, nasaId, phase) {
    await page.evaluate(function () {
        localStorage.removeItem("astro-health:session");
    });
    await page.goto("/index.html");
    await page.fill("#signin-nasa-id", nasaId);
    await page.fill("#signin-password", PASSWORD);
    // Wait for the missions to fill the phase choices
    await expect(page.locator("[data-auth-phase='" + phase + "'] input")).toHaveValue(/.+/);
    await page.check("[data-auth-phase='" + phase + "'] input");
    await Promise.all([
        page.waitForEvent("load"),
        page.click("[data-auth-form='signin'] .auth__submit")
    ]);
    await expect(page.locator("html")).toHaveAttribute("data-session", "in");
}

async function setTheme(page, theme) {
    await page.evaluate(function (value) {
        localStorage.setItem("astro-health:theme", JSON.stringify(value));
    }, theme);
    await page.reload();
}

// No WCAG A/AA (2.0 to 2.2) violations
async function expectNoA11yViolations(page, label) {
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const summary = results.violations.map(function (v) {
        return v.id + ": " + v.nodes.slice(0, 3).map(function (n) {
            return n.target.join(" ");
        }).join(" | ");
    });
    expect(summary, "axe violations on " + label).toEqual([]);
}

module.exports = { freshStart, signIn, setTheme, expectNoA11yViolations, PASSWORD };
