// Blood glucose: guided reading (typed or Bluetooth), backend-shaped rows, recheck, emergency and the doctor's view
const { test, expect } = require("@playwright/test");
const { freshStart, signIn, setTheme, expectNoA11yViolations } = require("./helpers");

// No real crew alerts from these tests: the app behaves as offline for Firebase
async function blockFirebase(page) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
}

async function measure(page, value, unit) {
    await page.click("[data-glucose-measure]");
    const dialog = page.locator(".glucose-entry");
    await expect(dialog).toBeVisible();
    if (unit) {
        await dialog.locator("#glucose-unit").selectOption(unit);
    }
    await dialog.locator("#glucose-value").fill(String(value));
    await dialog.locator(".glucose-entry__save").click();
    return dialog;
}

test("the home card shows the latest reading with its status", async function ({ page }) {
    await blockFirebase(page);
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await expect(page.locator("[data-glucose-value]")).toHaveText(/^\d+$/);
    await expect(page.locator("[data-glucose-badge] .badge__text")).toHaveText(/In range|Watch|Act now/);
    await expect(page.locator("[data-glucose-info] .health-info__learn")).toHaveAttribute("href", /#risk-nutrition$/);
});

test("a low reading is saved as a backend row and shows how to get back to normal", async function ({ page }) {
    await blockFirebase(page);
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    const dialog = await measure(page, 62);
    await expect(dialog).toBeHidden();
    await expect(page.locator("[data-glucose-value]")).toHaveText("62");
    await expect(page.locator("[data-glucose-badge] .badge__text")).toHaveText("Watch");
    await expect(page.locator("[data-glucose-recheck]")).toBeVisible();
    await expect(page.locator("[data-glucose-steps]")).toContainText("I had 15 g of fast sugar");
    await expect(page.locator("[data-task-auto='glucose']")).toBeChecked();
    const row = await page.evaluate(function () {
        return App.records.latest("sinais_vitais", "silva");
    });
    expect(row.glicose_mg_dl).toBe(62);
    expect(row.ambiente_missao).toBe("estacao");
    expect(row.status_alerta).toBe("alerta");
    expect(row.frequencia_cardiaca_bpm).toBeGreaterThan(20);
    expect(row.oxigenacao_spo2).toBeGreaterThan(50);
    expect(row.registrado_em).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test("mmol/L is converted and impossible readings are refused", async function ({ page }) {
    await blockFirebase(page);
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    let dialog = await measure(page, 700);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("#glucose-error")).toBeVisible();
    await expect(dialog.locator("#glucose-value")).toHaveAttribute("aria-invalid", "true");
    await dialog.locator(".glucose-entry__close").click();
    dialog = await measure(page, 5, "mmol");
    await expect(dialog).toBeHidden();
    await expect(page.locator("[data-glucose-value]")).toHaveText("90");
});

test("Bluetooth glucometer measurements are decoded to mg/dL", async function ({ page }) {
    await freshStart(page);
    const values = await page.evaluate(function () {
        // flags, sequence (2), base time 2026-11-13 07:10:00 (7), SFLOAT concentration (2), type/location (1)
        function reading(flags, sfloat) {
            return new DataView(new Uint8Array([flags, 1, 0, 0xEA, 0x07, 11, 13, 7, 10, 0, sfloat & 0xFF, sfloat >> 8, 0x11]).buffer);
        }
        return [
            App.glucose.parseMeasurement(reading(0x02, 0xB060)).mgDl, // 96 × 10^-5 kg/L = 96 mg/dL
            App.glucose.parseMeasurement(reading(0x06, 0xC032)).mgDl, // 50 × 10^-4 mol/L = 5.0 mmol/L
            App.glucose.parseMeasurement(reading(0x02, 0x07FF)).mgDl  // "not a number": no reading
        ];
    });
    expect(values[0]).toBe(96);
    expect(values[1]).toBeCloseTo(90.1, 1);
    expect(values[2]).toBeNull();
});

test("a very low reading in flight starts the low blood sugar emergency", async function ({ page }) {
    await blockFirebase(page);
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await measure(page, 48);
    await expect(page.locator(".sos")).toBeVisible();
    await expect(page.locator("[data-sos-title]")).toHaveText("Low blood sugar");
    await expect(page.locator("[data-sos-vitals]")).toContainText("48 mg/dL");
});

test("the doctor sees the glucose row and the alert", async function ({ page }) {
    await blockFirebase(page);
    await freshStart(page);
    await signIn(page, "cokafor", "in");
    await page.evaluate(function () {
        App.glucose.save("tanaka", 152, "manual");
    });
    await page.reload();
    const card = page.locator("[data-crew-list] > li[data-member='tanaka']");
    await expect(card).toContainText("152 mg/dL · Watch");
    await expect(page.locator(".alerts")).toContainText("High blood glucose");
});

for (const theme of ["light", "dark"]) {
    test("the glucose dialog has no accessibility violations (" + theme + ") @a11y", async function ({ page }) {
        await blockFirebase(page);
        await freshStart(page);
        await signIn(page, "hsilva", "in");
        await setTheme(page, theme);
        await page.click("[data-glucose-measure]");
        await expect(page.locator(".glucose-entry")).toBeVisible();
        await expectNoA11yViolations(page, "glucose dialog " + theme);
    });
}
