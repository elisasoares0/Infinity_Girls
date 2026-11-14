// Ask the assistant: local search over the app's own guides, with the source, a fallback and SOS for emergencies
const { test, expect } = require("@playwright/test");
const { freshStart, signIn, setTheme, expectNoA11yViolations } = require("./helpers");

async function start(page, phase) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
    await freshStart(page);
    await signIn(page, "hsilva", phase || "in");
}

async function ask(page, question) {
    const dialog = page.locator(".ask");
    if (!(await dialog.isVisible())) {
        await page.click("[data-ask-open]");
    }
    await dialog.locator("#ask-question").fill(question);
    await dialog.locator(".ask__submit").click();
    await expect(dialog.locator("[data-ask-status]")).not.toHaveText("Searching the guides…");
    return dialog;
}

test("a glucose question finds the guide, quoted with its source", async function ({ page }) {
    await start(page);
    const dialog = await ask(page, "my sugar is low, what do I do?");
    const main = dialog.locator(".ask__result--main");
    await expect(main.locator(".ask__title")).toHaveText("Low blood sugar");
    await expect(main.locator(".ask__source")).toContainText("From Emergency guide");
    await expect(main.locator(".ask__link")).toHaveAttribute("href", /emergency\/index\.html#guide-glucose$/);
    await expect(dialog.locator(".ask__disclaimer")).toContainText("Not a medical device");
});

test("an indicator question explains how it is measured", async function ({ page }) {
    await start(page);
    const dialog = await ask(page, "how is heart rate measured");
    await expect(dialog.locator(".ask__result--main .ask__title")).toHaveText("Heart rate");
    await expect(dialog.locator(".ask__result--main .ask__text")).toContainText("Electrodes in the Astroskin shirt");
});

test("no answer says so instead of inventing one", async function ({ page }) {
    await start(page);
    const dialog = await ask(page, "best pizza recipe in the galaxy");
    await expect(dialog.locator(".ask__none")).toContainText("I could not find this");
    await expect(dialog.locator(".ask__result")).toHaveCount(0);
});

test("an emergency question in flight offers SOS first", async function ({ page }) {
    await start(page);
    const dialog = await ask(page, "my crewmate is not breathing");
    await expect(dialog.locator(".ask__sos")).toBeVisible();
    await expect(dialog.locator(".ask__result--main .ask__title")).toHaveText("Not responding or not breathing");
    await dialog.locator(".ask__sos").click();
    await expect(page.locator(".sos")).toBeVisible();
});

test("on Earth there are no flight guides in the answers", async function ({ page }) {
    await start(page, "pre");
    const dialog = await ask(page, "chest pain");
    await expect(dialog.locator(".ask__sos")).toHaveCount(0);
    await expect(dialog.locator(".ask__source", { hasText: "Emergency guide" })).toHaveCount(0);
    await expect(dialog.locator(".ask__disclaimer")).toContainText("call your flight surgeon");
});

for (const theme of ["light", "dark"]) {
    test("the assistant has no accessibility violations (" + theme + ") @a11y", async function ({ page }) {
        await start(page);
        await setTheme(page, theme);
        await ask(page, "why is my vision blurry");
        await expectNoA11yViolations(page, "assistant " + theme);
    });
}
