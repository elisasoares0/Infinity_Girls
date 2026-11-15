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

test("how is my health today answers from the data, with where to see it, not privacy", async function ({ page }) {
    await start(page);
    const dialog = await ask(page, "how is my health today?");
    const card = dialog.locator(".ask__data").first();
    await expect(card.locator(".ask__title")).toHaveText("Your health today");
    await expect(card.locator(".ask__fact")).toHaveCount(10);
    await expect(card.locator(".ask__fact .badge").first()).toBeVisible();
    await expect(card.locator(".ask__where")).toContainText("Where to see it");
    await expect(dialog.locator(".ask__title", { hasText: "Who sees my data" })).toHaveCount(0);
    await expect(dialog.locator("[data-ask-status]")).toContainText("Answered from your data");
});

test("a question with two topics gets two answers with the same numbers as the app", async function ({ page }) {
    await start(page);
    const dialog = await ask(page, "did I sleep well and is my heart rate ok?");
    await expect(dialog.locator(".ask__data")).toHaveCount(2);
    const values = await page.evaluate(function () {
        var items = App.crew.todayVitals("silva");
        return items.filter(function (item) {
            return item.key === "hr" || item.key === "sleep";
        }).map(function (item) {
            return item.text;
        });
    });
    for (const value of values) {
        await expect(dialog.locator(".ask__data", { hasText: value })).toHaveCount(1);
    }
});

test("a week trend gives the average, lowest and highest", async function ({ page }) {
    await start(page);
    const dialog = await ask(page, "heart rate this week");
    const card = dialog.locator(".ask__data").first();
    await expect(card.locator(".ask__title")).toHaveText("Heart rate this week");
    await expect(card.locator(".ask__fact-label")).toHaveText(["Average", "Lowest", "Highest", "Days outside the range"]);
});

test("readiness says the score and what clears a spacewalk", async function ({ page }) {
    await start(page);
    const dialog = await ask(page, "am I ready for EVA?");
    const card = dialog.locator(".ask__data").first();
    await expect(card.locator(".ask__text")).toContainText("Readiness 86/100");
    await expect(card.locator(".ask__text")).toContainText("Above 80 clears you for a spacewalk (EVA)");
});

test("the doctor asks who needs attention and gets the crew in order", async function ({ page }) {
    await page.route(/googleapis.com|firebaseio.com/, function (route) {
        return route.abort();
    });
    await freshStart(page);
    await signIn(page, "cokafor", "in");
    const dialog = await ask(page, "who needs attention?");
    const card = dialog.locator(".ask__data").first();
    await expect(card.locator(".ask__title")).toHaveText("The crew today");
    await expect(card.locator(".ask__text")).toContainText("Needs attention first");
    await expect(card.locator(".ask__fact")).toHaveCount(4);
});

for (const theme of ["light", "dark"]) {
    test("the assistant has no accessibility violations (" + theme + ") @a11y", async function ({ page }) {
        await start(page);
        await setTheme(page, theme);
        await ask(page, "why is my vision blurry");
        await expectNoA11yViolations(page, "assistant " + theme);
    });
}
