// Health messages chat: every reminder (tasks, medication, exams, results) and the doctor's new alerts arrive as
// messages, the chat opens by itself without taking the focus, and the page cards stay as they are
const { test, expect } = require("@playwright/test");
const { freshStart, signIn, expectNoA11yViolations } = require("./helpers");

async function start(page, time, account) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
    await page.clock.install({ time: new Date(time) });
    await freshStart(page);
    await signIn(page, account || "hsilva", "in");
}

function message(page, title) {
    return page.locator(".inbox__message", { has: page.locator(".inbox__message-title", { hasText: title }) });
}

test("a due task arrives in the chat without taking the focus, and Done ticks the task", async function ({ page }) {
    await start(page, "2026-11-14T10:31:00Z");
    const panel = page.locator(".inbox__panel");
    await expect(panel).toBeVisible();
    await expect(page.locator(".reminder")).toHaveCount(0);
    const item = message(page, "Retina scan (OCT)");
    await expect(item).toBeVisible();
    expect(await page.evaluate(function () {
        return document.activeElement.closest(".inbox") === null;
    })).toBe(true);
    await expect(page.locator("[data-inbox-toggle]")).toHaveAttribute("aria-label", /Health messages, \d+ new/);
    await item.locator("[data-inbox-action='done']").click();
    await expect(item.locator(".inbox__state")).toContainText("Done at 10:31 UTC");
    await expect(item.locator("[data-inbox-action]")).toHaveCount(0);
    await expect(page.locator("[data-task='oct']")).toBeChecked();
    // The fixed card stays as it was: the tasks band still lists the task
    await expect(page.locator("[data-task='oct']")).toBeVisible();
});

test("In 15 min moves the message and brings it back later", async function ({ page }) {
    await start(page, "2026-11-14T10:31:00Z");
    const item = message(page, "Retina scan (OCT)");
    await item.locator("[data-inbox-action='snooze']").click();
    await expect(item.locator(".inbox__state")).toContainText("Moved to 10:46 UTC");
    await page.clock.fastForward("16:00");
    await expect(message(page, "Retina scan (OCT)").locator("[data-inbox-action='done']")).toBeVisible();
});

test("medication: vitamin D at 08:00 and the pill at 21:00, marked as taken from the chat", async function ({ page }) {
    await start(page, "2026-11-14T08:05:00Z");
    const vitamin = message(page, "Take Vitamin D, 1000 IU");
    await expect(vitamin).toBeVisible();
    await expect(vitamin.locator(".inbox__meta")).toContainText("Medication");
    await vitamin.locator("[data-inbox-action='done']").click();
    await expect(vitamin.locator(".inbox__state")).toContainText("Taken at 08:05 UTC");

    await page.clock.setFixedTime(new Date("2026-11-14T21:02:00Z"));
    await page.reload();
    const pill = message(page, "Take your contraceptive pill");
    await expect(pill).toBeVisible();
    await pill.locator("[data-inbox-action='done']").click();
    await expect(pill.locator(".inbox__state")).toContainText("Taken at");
    const state = await page.evaluate(function () {
        return JSON.parse(localStorage.getItem("astro-health:womens-health"));
    });
    expect(state.takenOn).toBe("2026-11-14");
});

test("minimize folds the chat into its button, which reopens it", async function ({ page }) {
    await start(page, "2026-11-14T10:31:00Z");
    const panel = page.locator(".inbox__panel");
    await expect(panel).toBeVisible();
    await page.locator("[data-inbox-minimize]").click();
    await expect(panel).toBeHidden();
    const toggle = page.locator("[data-inbox-toggle]");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("[data-inbox-count]")).not.toBeEmpty();
    await toggle.click();
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
});

test("the tasks band says what comes next, and the demo button sends it to the chat now", async function ({ page }) {
    await start(page, "2026-11-14T06:00:00Z");
    await expect(page.locator("[data-tasks-next-text]")).toContainText("Blood glucose check at 07:00 UTC");
    await expect(page.locator(".inbox__panel")).toBeHidden();
    await page.click("[data-demo-open]");
    await page.click("[data-demo-reminder]");
    await expect(message(page, "Blood glucose check")).toBeVisible();
});

test("the doctor gets the open crew alerts as a message, with the panel cards unchanged", async function ({ page }) {
    await start(page, "2026-11-14T10:31:00Z", "cokafor");
    const panel = page.locator(".inbox__panel");
    await expect(panel).toBeVisible();
    await expect(panel.locator(".inbox__message").first().locator(".inbox__meta")).toContainText("Crew alert");
    await expect(panel.locator(".inbox__open").first()).toHaveAttribute("href", /#alerts-title$/);
    await expect(page.locator(".alerts")).toBeVisible();
});

test("the chat has no accessibility violations @a11y", async function ({ page }) {
    await start(page, "2026-11-14T10:31:00Z");
    await expect(page.locator(".inbox__panel")).toBeVisible();
    await expectNoA11yViolations(page, "health messages chat");
});
