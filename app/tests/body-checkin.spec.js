// Body check-in: a symptom on a region of the 3D body (body_checkin), with how strong it is; no emergency guide link in the header
const { test, expect } = require("./fixtures");
const { freshStart, signIn, setTheme } = require("./helpers");

async function start(page, account, phase) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
    await freshStart(page);
    await signIn(page, account || "hsilva", phase || "in");
}

// Waits for the 3D figure, then returns a point of a region inside the stage
async function regionPoint(page, region) {
    await page.waitForFunction(function () {
        return window.App && App.bodyCheckin && App.bodyCheckin.view();
    }, null, { timeout: 90000 });
    await page.locator(".astronaut-view__stage").scrollIntoViewIfNeeded();
    return page.evaluate(function (name) {
        var view = App.bodyCheckin.view();
        var point = view.regionScreen(name);
        return { x: point.x, y: point.y, under: view.regionAt(point.x, point.y) };
    }, region);
}

test("the header has no emergency guide shortcut", async function ({ page }) {
    await start(page);
    await expect(page.locator(".app-header [data-sos-open]")).toBeVisible();
    await expect(page.locator("[data-emergency-link]")).toHaveCount(0);
    await expect(page.locator(".app-header a[href*='emergency']")).toHaveCount(0);
});

test("a click on the body opens the check-in for that region", async function ({ page }) {
    await start(page);
    const point = await regionPoint(page, "abdomen");
    expect(point.under).toBe("abdomen");
    await page.locator(".astronaut-view__canvas-el").click({ position: { x: point.x, y: point.y } });
    const dialog = page.locator("[data-symptom]");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("[data-symptom-title]")).toHaveText("Abdomen & metabolism");
    await expect(dialog.locator("[data-symptom-where]")).toBeHidden();
    await expect(dialog.locator("input[name='symptom']")).toHaveCount(4);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
});

// Opens a region from its shortcut on the stage, reached with the keyboard (hidden until focused)
async function openRegion(page, region) {
    const shortcut = page.locator("[data-symptom-region='" + region + "']");
    await shortcut.focus();
    await expect(shortcut).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-symptom]")).toBeVisible();
    return page.locator("[data-symptom]");
}

test("a keyboard shortcut opens a region: what and how strong, saved as a body_checkin row", async function ({ page }) {
    await start(page);
    const shortcut = page.locator("[data-symptom-region='costas']");
    const hidden = await shortcut.boundingBox();
    expect(hidden.width).toBeLessThanOrEqual(1);
    const dialog = await openRegion(page, "costas");
    await expect(dialog.locator("[data-symptom-title]")).toHaveText("Back");
    // Saving without a choice says what is missing
    await dialog.locator("button[type='submit']").click();
    await expect(dialog.locator("[data-symptom-error]")).toHaveText("Choose what you feel.");
    await dialog.locator("input[name='symptom'][value='dor_nas_costas']").check();
    await dialog.locator("#symptom-level").fill("2");
    await expect(dialog.locator("[data-symptom-badge]")).toHaveText("Level 2/5");
    await expect(dialog.locator("#symptom-level")).toHaveAttribute("aria-valuetext", "2 of 5, mild");
    await expect(dialog.locator("[data-symptom-protocol]")).toContainText("Mild: self-care.");
    await dialog.locator("button[type='submit']").click();
    await expect(dialog).toBeHidden();
    await expect(shortcut).toBeFocused();
    await expect(page.locator("[data-symptoms-status]")).toContainText("Back pain 2/5");
    const item = page.locator(".symptoms__item").first();
    await expect(item).toContainText("Back pain");
    await expect(item).toContainText("2/5");
    const row = await page.evaluate(function () {
        return App.records.list("body_checkin", { usuario_id: "silva" })[0];
    });
    expect(row.regiao_anatomica).toBe("costas");
    expect(row.sintoma).toBe("dor_nas_costas");
    expect(row.intensidade).toBe(2);
    expect(row.resolvido).toBe(false);
    expect(row.protocolo_acao).toContain("Mild: self-care.");
    expect(row.registrado_em).toBeTruthy();
    await item.locator(".symptoms__better").click();
    await expect(page.locator(".symptoms__item").first()).toContainText("feeling better");
    const resolved = await page.evaluate(function () {
        return App.records.list("body_checkin", { usuario_id: "silva" })[0].resolvido;
    });
    expect(resolved).toBe(true);
});

test("the button next to the title logs only nausea or vomiting", async function ({ page }) {
    await start(page);
    await expect(page.locator("[data-symptom-open]")).toHaveText("Log nausea or vomiting");
    await page.click("[data-symptom-open]");
    const dialog = page.locator("[data-symptom]");
    await expect(dialog.locator("[data-symptom-title]")).toHaveText("Nausea or vomiting");
    await expect(dialog.locator("input[name='symptom']")).toHaveCount(2);
    await expect(dialog.locator("input[name='symptom'][value='nausea']")).toBeFocused();
    await expect(dialog.locator("input[name='symptom'][value='vomito']")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-symptom-open]")).toBeFocused();
});

test("chest pain 4/5 in flight offers SOS and reaches the doctor", async function ({ page }) {
    await start(page);
    const dialog = await openRegion(page, "torax");
    await dialog.locator("input[name='symptom'][value='dor_no_peito']").check();
    await dialog.locator("#symptom-level").fill("4");
    await expect(dialog.locator("[data-symptom-protocol]")).toContainText("Warning sign: start SOS now.");
    await expect(dialog.locator("[data-symptom-sos]")).toBeVisible();
    await expect(dialog.locator("[data-symptom-badge]")).toHaveClass(/symptom__badge--severe/);
    await dialog.locator("button[type='submit']").click();
    await expect(page.locator(".symptoms__item").first()).toContainText("your medical team can see it");

    // The crew medical officer sees it in the alerts and on Cmdr. Silva's card
    await signIn(page, "cokafor", "in");
    await expect(page.locator(".alerts")).toContainText("Symptom reported: Chest pain 4/5");
});

test("on Earth a warning sign says to call the flight surgeon, without SOS", async function ({ page }) {
    await start(page, "hsilva", "pre");
    const dialog = await openRegion(page, "torax");
    await dialog.locator("input[name='symptom'][value='dor_no_peito']").check();
    await dialog.locator("#symptom-level").fill("4");
    await expect(dialog.locator("[data-symptom-sos]")).toBeHidden();
    await expect(dialog.locator("[data-symptom-protocol]")).toContainText("Warning sign: tell your flight surgeon now.");
});

// The check-in sheet follows the theme like the vital signs card (it used the fixed colors of the 3D stage)
test("the symptom sheet changes with the light and dark themes, like the vital signs card", async function ({ page }) {
    await start(page);
    const colors = {};
    for (const theme of ["light", "dark"]) {
        await setTheme(page, theme);
        const dialog = await openRegion(page, "costas");
        colors[theme] = await dialog.evaluate(function (element) {
            var style = window.getComputedStyle(element);
            var surface = window.getComputedStyle(document.documentElement).getPropertyValue("--color-surface").trim();
            var probe = document.createElement("div");
            probe.style.backgroundColor = "var(--color-surface)";
            document.body.appendChild(probe);
            var expected = window.getComputedStyle(probe).backgroundColor;
            probe.remove();
            return { background: style.backgroundColor, text: style.color, surface: expected, declared: surface };
        });
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
    }
    expect(colors.light.background).toBe(colors.light.surface);
    expect(colors.dark.background).toBe(colors.dark.surface);
    expect(colors.light.background).not.toBe(colors.dark.background);
    expect(colors.light.text).not.toBe(colors.dark.text);
});
