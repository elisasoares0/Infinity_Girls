// Active reminders: a toast at the time of each task (never taking the focus), Done, snooze, Next line and the demo button
const { test, expect } = require("@playwright/test");
const { freshStart, signIn } = require("./helpers");

async function start(page, time) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
    await page.clock.install({ time: new Date(time) });
    await freshStart(page);
    await signIn(page, "hsilva", "in");
}

test("a due task shows a reminder that does not take the focus, and Done ticks the task", async function ({ page }) {
    await start(page, "2026-11-14T10:31:00Z");
    const toast = page.locator(".reminder");
    await expect(toast).toBeVisible();
    const title = await toast.locator(".reminder__title").textContent();
    const due = await page.evaluate(function (name) {
        return App.reminders.today().filter(function (entry) {
            return entry.title === name;
        })[0];
    }, title);
    expect(due.done).toBe(false);
    expect(await page.evaluate(function () {
        return document.activeElement.closest(".reminder") === null;
    })).toBe(true);
    await toast.locator(".reminder__done").click();
    await expect(toast).toBeHidden();
    const after = await page.evaluate(function (id) {
        return App.reminders.today().filter(function (entry) {
            return entry.id === id;
        })[0].done;
    }, due.id);
    expect(after).toBe(true);
    if (due.task) {
        await expect(page.locator("[data-task='" + due.task + "']")).toBeChecked();
    }
});

test("In 15 min hides the reminder and brings it back later", async function ({ page }) {
    await start(page, "2026-11-14T10:31:00Z");
    const toast = page.locator(".reminder");
    await expect(toast).toBeVisible();
    const title = await toast.locator(".reminder__title").textContent();
    await toast.locator(".reminder__snooze").click();
    await expect(toast).toBeHidden();
    await page.clock.fastForward("16:00");
    await expect(toast).toBeVisible();
    await expect(toast.locator(".reminder__title")).toHaveText(title);
});

test("the tasks band says what comes next, and the demo button shows it now", async function ({ page }) {
    await start(page, "2026-11-14T06:00:00Z");
    await expect(page.locator("[data-tasks-next-text]")).toContainText("Blood glucose check at 07:00 UTC");
    await expect(page.locator(".reminder")).toBeHidden();
    await page.click("[data-demo-open]");
    await page.click("[data-demo-reminder]");
    await expect(page.locator(".reminder")).toBeVisible();
    await expect(page.locator(".reminder__title")).toHaveText("Blood glucose check");
});
