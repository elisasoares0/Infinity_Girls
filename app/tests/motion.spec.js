// Lottie micro-interactions (App.motion): loaded only when one plays, still with reduced motion, never in the SOS
const { test, expect } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

const PLAYER = /assets\/vendor\/lottie\/lottie_light\.min\.js$/;

// The first task of the list that is not done yet (the counter says it in text)
function openTask(page) {
    return page.locator(".tasks__checkbox:not(:checked):not([data-task-auto])").first();
}

test("the player is not downloaded with the page, only when an animation plays", async function ({ page }) {
    // Signing in already plays one (the orbit on the button while it waits): measure the home page loading after it
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    const requests = [];
    page.on("request", function (request) {
        if (PLAYER.test(request.url())) {
            requests.push(request.url());
        }
    });
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(500);
    expect(requests).toHaveLength(0);

    const key = await openTask(page).getAttribute("data-task");
    const task = page.locator(".tasks__checkbox[data-task='" + key + "']");
    await task.check();
    const overlay = page.locator(".motion--overlay");
    await expect(overlay.locator("svg")).toHaveCount(1);
    await expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(requests.length).toBeGreaterThan(0);
    // Decoration only: it goes away and the task stays done
    await expect(overlay).toHaveCount(0, { timeout: 8000 });
    await expect(task).toBeChecked();
});

test("with reduced motion the animation shows its last frame, still", async function ({ page }) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    const state = await page.evaluate(function () {
        var host = document.createElement("span");
        host.className = "motion";
        document.body.appendChild(host);
        return App.motion.play("success-check", host).then(function (animation) {
            return { paused: animation.isPaused, frame: Math.round(animation.currentFrame), last: animation.totalFrames - 1 };
        });
    });
    expect(state.paused).toBe(true);
    expect(state.frame).toBe(state.last);
});

test("nothing plays inside the SOS dialog", async function ({ page }) {
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    const result = await page.evaluate(function () {
        var host = document.createElement("span");
        host.className = "motion";
        document.querySelector(".sos").appendChild(host);
        return App.motion.play("success-check", host).then(function (animation) {
            return animation === null && !host.querySelector("svg");
        });
    });
    expect(result).toBe(true);
});
