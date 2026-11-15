// Women's health: optional daily log (bleeding, spotting, cramps, symptoms), bone health and blood clot signs
const { test, expect } = require("@playwright/test");
const { freshStart, signIn, setTheme, expectNoA11yViolations } = require("./helpers");

async function blockFirebase(page) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
}

async function openPage(page, phase) {
    await blockFirebase(page);
    await freshStart(page);
    await signIn(page, "hsilva", phase || "in");
    await page.goto("/pages/womens-health/index.html");
}

// Sections come in groups (Cycle, Body, History): open one like the user does
function showGroup(page, name) {
    return page.locator(".wh-nav").getByRole("button", { name: name, exact: true }).click();
}

function rows(page, table) {
    return page.evaluate(function (name) {
        return JSON.parse(localStorage.getItem("astro-health:records:" + name) || "[]");
    }, table);
}

test("sections show one group at a time, and a link to a section opens its group", async function ({ page }) {
    await openPage(page);
    await expect(page.locator(".calendar")).toBeVisible();
    await expect(page.locator(".bone")).toBeHidden();
    await showGroup(page, "Body");
    await expect(page.locator(".bone")).toBeVisible();
    await expect(page.locator(".calendar")).toBeHidden();
    await expect(page.locator(".wh-nav").getByRole("button", { name: "Body", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/pages/womens-health/index.html#history");
    await expect(page.locator(".history")).toBeVisible();
    await expect(page.locator(".diary")).toBeHidden();
});

test("the daily log saves only what was filled in and shows spotting on the calendar", async function ({ page }) {
    await openPage(page);
    const diary = page.locator(".diary");
    await expect(diary).toBeVisible();

    // Nothing chosen: nothing is saved
    await diary.getByRole("button", { name: "Save this day" }).click();
    await expect(page.locator("[data-diary-result]")).toContainText("Nothing to save");
    expect(await rows(page, "diario_saude_feminina")).toEqual([]);

    // Only spotting and cramps: symptoms and notes stay null
    await diary.getByText("Spotting", { exact: true }).click();
    await diary.getByText("Severe", { exact: true }).click();
    await diary.getByRole("button", { name: "Save this day" }).click();
    await expect(page.locator("[data-diary-result]")).toContainText("Saved for");
    await expect(page.locator("[data-diary-result]")).toContainText("Severe cramps");

    const saved = await rows(page, "diario_saude_feminina");
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ usuario_id: "silva", sangramento: "escape", colica_escala: 3, sintomas: null, notas_privadas: null });

    // Spotting shows on today's calendar day, not as a period
    const today = saved[0].data_registro;
    const day = page.locator("[data-day='" + today + "']");
    await expect(day).toHaveClass(/calendar__day--spotting/);
    await expect(day).not.toHaveClass(/calendar__day--period/);
    await expect(page.locator("[data-diary-history] .diary__entry")).toHaveCount(1);

    // Clearing the day removes the row and the calendar mark
    await diary.getByRole("button", { name: "Clear this day" }).click();
    expect(await rows(page, "diario_saude_feminina")).toEqual([]);
    await expect(day).not.toHaveClass(/calendar__day--spotting/);
});

test("the calendar marks bleeding or spotting by the chosen mark and opens the day in the daily log", async function ({ page }) {
    await openPage(page);
    const calendar = page.locator(".calendar");
    await calendar.getByRole("button", { name: "Clear history" }).click();
    const today = await page.evaluate(function () {
        return new Date().toISOString().slice(0, 10);
    });
    const day = page.locator("[data-day='" + today + "']");

    // On the continuous pill bleeding is suppressed, so spotting is the first choice
    await expect(calendar.getByRole("radio", { name: "Spotting" })).toBeChecked();
    await day.click();
    await expect(day).toHaveClass(/calendar__day--spotting/);
    await expect(page.locator("[data-cal-status]")).toContainText("Spotting logged");

    // Tapping the same mark again undoes it
    await day.click();
    await expect(day).not.toHaveClass(/calendar__day--spotting/);
    await expect(page.locator("[data-cal-status]")).toContainText("Spotting removed");

    // Bleeding replaces spotting on the same day; "Clear the day" removes any mark
    await day.click();
    await calendar.getByText("Bleeding", { exact: true }).click();
    await day.click();
    await expect(day).toHaveClass(/calendar__day--period/);
    await expect(day).not.toHaveClass(/calendar__day--spotting/);
    await calendar.getByText("Clear the day").click();
    await day.click();
    await expect(day).not.toHaveClass(/calendar__day--period/);

    // The shortcut opens that day in the daily log
    await calendar.getByText("Spotting", { exact: true }).click();
    await day.click();
    await page.locator("[data-cal-details]").click();
    await expect(page.locator("[data-diary-date]")).toBeFocused();
    await expect(page.locator("[data-diary-date]")).toHaveValue(today);
});

test("spotting marked on the calendar updates that day's bleeding answer in the daily log", async function ({ page }) {
    await openPage(page);
    const diary = page.locator(".diary");
    await diary.getByText("Light", { exact: true }).click();
    await diary.getByRole("button", { name: "Save this day" }).click();
    const key = (await rows(page, "diario_saude_feminina"))[0].data_registro;
    await page.locator(".calendar").getByText("Spotting", { exact: true }).click();
    await page.locator("[data-day='" + key + "']").click();
    expect((await rows(page, "diario_saude_feminina"))[0].sangramento).toBe("escape");
});

test("heavy bleeding marks the period and warns about space anemia", async function ({ page }) {
    await openPage(page);
    const diary = page.locator(".diary");
    await diary.getByText("Heavy", { exact: true }).click();
    await diary.getByText("Unusual discharge or itching").click();
    await diary.getByRole("button", { name: "Save this day" }).click();
    await expect(page.locator("[data-diary-result] .notice--warn")).toContainText("space anemia");
    await expect(page.locator("[data-diary-result]")).toContainText("yeast");
    const saved = await rows(page, "diario_saude_feminina");
    await expect(page.locator("[data-day='" + saved[0].data_registro + "']")).toHaveClass(/calendar__day--period/);
});

test("before launch the health history is filled in and saved as one row", async function ({ page }) {
    await openPage(page, "pre");
    await showGroup(page, "History");
    const history = page.locator(".history");
    await expect(history.locator("[data-history-form]")).toBeVisible();
    await expect(history.locator(".history__summary")).toBeHidden();
    expect(await rows(page, "anamnese_saude_feminina")).toEqual([]);
    await expect(page.locator("[data-bone-history]")).toContainText("Fill in your health history");

    await history.getByText("Broken bone before").click();
    await history.getByText("Had a clot before").click();
    await history.getByText("Anemia", { exact: true }).click();
    await history.getByRole("button", { name: "Save health history" }).click();
    await expect(page.locator("[data-history-result]")).toContainText("not asked again");
    await expect(page.locator("[data-history-status]")).toContainText("Saved on");

    const saved = await rows(page, "anamnese_saude_feminina");
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ usuario_id: "silva", condicoes_previas: ["anemia"], fatores_risco_osseo: ["fratura_previa"], fatores_risco_trombose: ["historico_pessoal"] });
    await expect(page.locator("[data-bone-history]")).toContainText("broken bone before");
});

test("in flight the health history is read only and the logs do not ask for risk factors", async function ({ page }) {
    await openPage(page);
    await showGroup(page, "History");
    const history = page.locator(".history");
    await expect(history.locator("[data-history-form]")).toBeHidden();
    await expect(history.locator("[data-history-list]")).toContainText("Osteoporosis in the family");
    await expect(history.locator("[data-history-demo]")).toBeVisible();
    await expect(page.locator(".bone")).not.toContainText("What raises your risk");
    await expect(page.locator(".clot")).not.toContainText("What raises your risk");
    await expect(page.locator("[data-clot-history]")).toContainText("pill with estrogen");
    // A read-only reference in flight: it comes after the logs used every day
    const order = await page.evaluate(function () {
        return Array.prototype.map.call(document.querySelectorAll("main > section"), function (section) {
            return section.className;
        });
    });
    expect(order.indexOf("history")).toBeGreaterThan(order.indexOf("clot"));
});

test("bone log advises after a fall, using the health history", async function ({ page }) {
    await openPage(page);
    await showGroup(page, "Body");
    const bone = page.locator(".bone");
    await bone.getByText("Calcium taken").click();
    await bone.getByText("I had a fall or a hard knock").click();
    await bone.getByRole("button", { name: "Save bone log" }).click();
    await expect(page.locator("[data-bone-result] .notice--warn")).toContainText("fall");
    // Demo history has osteoporosis in the family
    await expect(page.locator("[data-bone-result]")).toContainText("makes a fracture more likely");

    const saved = await rows(page, "saude_ossea");
    expect(saved[0]).toMatchObject({ calcio_tomado: true, vitamina_d_tomada: null, queda_ou_impacto: true, dor_ossea: null });
    expect(saved[0]).not.toHaveProperty("fatores_risco");
});

test("a clot sign is more urgent with a past clot in the health history", async function ({ page }) {
    await openPage(page, "pre");
    await showGroup(page, "History");
    await page.locator(".history").getByText("Had a clot before").click();
    await page.locator(".history").getByRole("button", { name: "Save health history" }).click();
    await showGroup(page, "Body");
    await page.locator(".clot").getByText("Pain or cramp in one calf").click();
    await page.locator(".clot").getByRole("button", { name: "Log signs" }).click();
    await expect(page.locator("[data-clot-result]")).toContainText("Tell your medical lead now");
    await expect(page.locator("[data-clot-result]")).toContainText("had a clot before");
});

test("blood clot signs: watch for a swollen leg, act now with chest pain", async function ({ page }) {
    await openPage(page);
    await showGroup(page, "Body");
    const clot = page.locator(".clot");
    await clot.getByText("Swelling in one leg or arm").click();
    await clot.getByRole("button", { name: "Log signs" }).click();
    await expect(page.locator("[data-clot-result] .notice--warn")).toContainText("Do not rub or massage");
    expect((await rows(page, "sinais_trombose"))[0].status_alerta).toBe("atencao");

    await clot.getByText("Chest pain", { exact: true }).click();
    await clot.getByRole("button", { name: "Log signs" }).click();
    await expect(page.locator("[data-clot-result] .notice--danger")).toContainText("press SOS");
    await expect(page.locator("[data-clot-result]").getByRole("button", { name: "Start SOS" })).toBeVisible();
    const saved = await rows(page, "sinais_trombose");
    expect(saved).toHaveLength(1);
    expect(saved[0].status_alerta).toBe("critico");

    await clot.getByRole("button", { name: "No signs today" }).click();
    await expect(page.locator("[data-clot-result]")).toContainText("no warning signs");
    expect((await rows(page, "sinais_trombose"))[0].status_alerta).toBe("normal");
});

test("on Earth the urgent clot signs point to the local emergency number", async function ({ page }) {
    await openPage(page, "pre");
    await showGroup(page, "Body");
    const clot = page.locator(".clot");
    await clot.getByText("Sudden shortness of breath").click();
    await clot.getByRole("button", { name: "Log signs" }).click();
    await expect(page.locator("[data-clot-result]")).toContainText("local emergency number");
    await expect(page.locator("[data-clot-result]").getByRole("button", { name: "Start SOS" })).toHaveCount(0);
});

for (const theme of ["light", "dark"]) {
    test("women's health logs have no axe violations (" + theme + ") @a11y", async function ({ page }) {
        await openPage(page);
        await setTheme(page, theme);
        await page.locator(".diary").getByText("Spotting", { exact: true }).click();
        await page.locator(".diary").getByRole("button", { name: "Save this day" }).click();
        await showGroup(page, "Body");
        await page.locator(".clot").getByText("Chest pain", { exact: true }).click();
        await page.locator(".clot").getByRole("button", { name: "Log signs" }).click();
        await expectNoA11yViolations(page, "women's health (" + theme + ")");
    });
}
