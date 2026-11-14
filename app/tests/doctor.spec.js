// Doctor before the flight: exam counts on each crew card open that person's exams in a side panel
const { test, expect } = require("@playwright/test");
const { freshStart, signIn } = require("./helpers");

test("schedule and cancel a pre-flight exam from a crew card", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "cokafor", "pre");
    await expect(page.locator(".exams")).toHaveCount(0);
    const button = page.locator("[data-exams-member='novak']");
    await expect(button).toContainText("to schedule");
    const before = await button.locator(".crew__exams-counts").textContent();

    await button.click();
    const panel = page.locator("[data-exam-panel]");
    await expect(panel).toBeVisible();
    await expect(page.locator("#exam-panel-title")).toContainText("Spc. Novak");

    const first = panel.locator("[data-exam-list='open'] > li").first();
    const key = await first.getAttribute("data-exam");
    await first.locator("[data-exam-open]").click();
    const date = panel.locator("[data-exam='" + key + "'] input[type='date']");
    await expect(date).toBeFocused();

    // Outside the window: error; inside: scheduled
    await date.fill("2020-01-01");
    await panel.locator("[data-exam='" + key + "'] button[type='submit']").click();
    await expect(panel.locator("[data-exam='" + key + "'] .field__error")).toContainText("Choose a date between");
    const min = await date.getAttribute("min");
    await date.fill(min);
    await panel.locator("[data-exam='" + key + "'] button[type='submit']").click();
    await expect(panel.locator("[data-exam-panel-status]")).toContainText("scheduled on");
    await expect(panel.locator("[data-exam-list='scheduled'] [data-exam='" + key + "']")).toHaveCount(1);

    // Esc closes, the card shows new counts and the focus goes back to it
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    // The card redraws on the dialog's close event, right after the browser restores the focus
    await expect(page.locator("[data-exams-member='novak'] .crew__exams-counts")).not.toHaveText(before);
    await expect(page.locator("[data-exams-member='novak']")).toBeFocused();

    // Cancel puts it back to To schedule
    await page.locator("[data-exams-member='novak']").click();
    await panel.locator("[data-exam='" + key + "'] .button--tertiary").click();
    await expect(panel.locator("[data-exam-list='open'] [data-exam='" + key + "']")).toHaveCount(1);
});
