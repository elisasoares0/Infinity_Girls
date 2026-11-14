// Daily goals: ring + text list, check-in saved as avaliacoes_diarias, gamificacao_metas row, achievements, celebration
const { test, expect } = require("@playwright/test");
const { freshStart, signIn } = require("./helpers");

async function start(page) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
    await freshStart(page);
    await signIn(page, "hsilva", "in");
}

test("four goals in text, saved as today's gamificacao_metas row", async function ({ page }) {
    await start(page);
    await expect(page.locator("[data-goals-list] > li")).toHaveCount(4);
    await expect(page.locator("[data-goals-list]")).toContainText("Water");
    await expect(page.locator("[data-goals-week] > li")).toHaveCount(7);
    await expect(page.locator("[data-goals-badges] > li")).toHaveCount(8);
    await expect(page.locator("[data-goals-badges]")).toContainText(/Unlocked|of \d+/);
    const row = await page.evaluate(function () {
        return App.records.latest("gamificacao_metas", "silva");
    });
    expect(row.meta_hidratacao_ml).toBe(2500);
    expect(row.data_registro).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof row.exercicio_concluido).toBe("boolean");
    expect(Array.isArray(row.conquistas_desbloqueadas)).toBe(true);
    expect(row.atualizado_em).toMatch(/T/);
});

test("the check-in from the task saves avaliacoes_diarias and completes the goal", async function ({ page }) {
    await start(page);
    await page.locator("[data-task='checkin']").click();
    const dialog = page.locator("[data-checkin]");
    await expect(dialog).toBeVisible();
    await dialog.locator(".checkin__save").click();
    await expect(dialog.locator("[data-checkin-error]")).toBeVisible();
    await dialog.locator("input[name='mood'][value='4']").check();
    await dialog.locator("input[name='stress'][value='2']").check();
    await dialog.locator("[data-checkin-note]").fill("Slept well");
    await dialog.locator(".checkin__save").click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("[data-task='checkin']")).toBeChecked();
    await expect(page.locator("[data-goals-list] > li").nth(3)).toContainText("mood 4 of 5, stress 2 of 5");
    const row = await page.evaluate(function () {
        return App.records.latest("avaliacoes_diarias", "silva");
    });
    expect(row.humor_escala).toBe(4);
    expect(row.estresse_escala).toBe(2);
    expect(row.notas_privadas).toBe("Slept well");
    const goals = await page.evaluate(function () {
        return App.records.latest("gamificacao_metas", "silva").checkin_realizado;
    });
    expect(goals).toBe(true);
});

test("all four goals are announced", async function ({ page }) {
    await start(page);
    await page.evaluate(function () {
        App.goalsPanel.celebrate(5);
    });
    await expect(page.locator("[data-goals-live]")).toHaveText("All four goals done today. Streak: 5 days.");
});
