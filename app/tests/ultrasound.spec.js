// Guided neck vein ultrasound: the astronaut sends an image (exames_imagem + file), the doctor reads it, the astronaut sees it
const { test, expect } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

async function start(page, account) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
    await page.clock.install({ time: new Date("2026-11-14T12:00:00Z") });
    await freshStart(page);
    await signIn(page, account, "in");
}

test("the astronaut sends a scan that waits for the medical team", async function ({ page }) {
    await start(page, "hsilva");
    await page.goto("/pages/body/index.html#ultrasound");
    const section = page.locator("[data-ultrasound]");
    await expect(section.locator("[data-ultrasound-latest]")).toContainText("Normal");
    await section.locator("[data-ultrasound-start]").click();
    const dialog = page.locator(".scan");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("[data-scan-send]")).toBeDisabled();
    await dialog.locator("input[name='scan-source'][value='sample']").check();
    await dialog.locator("[data-scan-sample]").click();
    await expect(dialog.locator("[data-scan-preview]")).toBeVisible();
    await dialog.locator("#scan-note").fill("No pain");
    await dialog.locator("[data-scan-send]").click();
    await expect(dialog).toBeHidden();
    await expect(section.locator("[data-ultrasound-latest]")).toContainText("Waiting for the medical team");
    const saved = await page.evaluate(function () {
        var row = App.ultrasound.list("silva")[0];
        return App.records.files.get(row.imagem_url).then(function (blob) {
            return { row: row, size: blob ? blob.size : 0, type: blob ? blob.type : "" };
        });
    });
    expect(saved.row.status_leitura).toBe("pendente");
    expect(saved.row.tipo_exame).toBe("ultrassom_venoso");
    expect(saved.row.imagem_url).toMatch(/^local:\/\/exames-imagem\/silva\//);
    expect(saved.row.observacao_astronauta).toBe("No pain");
    expect(saved.size).toBeGreaterThan(1000);
    expect(saved.type).toBe("image/webp");
});

test("the doctor reads a waiting scan, with an alert after 24 hours", async function ({ page }) {
    await start(page, "cokafor");
    await expect(page.locator(".alerts")).toContainText("Ultrasound waiting for your reading");
    const review = page.locator("[data-ultrasound-review]");
    // Waiting scans come first; the card is not redrawn after saving, so it stays the first one
    const card = review.locator(".scans__item", { hasText: "Eng. Tanaka" }).first();
    await expect(card.locator(".card__header .badge")).toContainText("Waiting");
    await expect(card).toBeVisible();
    await card.locator("button[type='submit']").click();
    await expect(card.locator(".field__error")).toBeVisible();
    await card.locator("input[value='normal']").check();
    await card.locator(".scans__textarea").fill("Vein compresses fully. No clot.");
    await card.locator("button[type='submit']").click();
    await expect(card.locator(".card__header .badge")).toContainText("Normal");
    const row = await page.evaluate(function () {
        return App.ultrasound.list("tanaka")[0];
    });
    expect(row.status_leitura).toBe("normal");
    expect(row.parecer_medico).toBe("Vein compresses fully. No clot.");
    expect(row.avaliado_por).toBe("okafor");
});

test("an Act now reading reaches the astronaut", async function ({ page }) {
    await start(page, "hsilva");
    await page.evaluate(function () {
        var row = App.ultrasound.list("silva")[0];
        App.ultrasound.review(row.id, "critico", "Possible clot. Come to the medical bay now.", "okafor");
    });
    await page.goto("/pages/body/index.html#ultrasound");
    await expect(page.locator("[data-ultrasound-notice]")).toBeVisible();
    await expect(page.locator("[data-ultrasound-notice-text]")).toContainText("Act now");
    await expect(page.locator(".inbox__message-title", { hasText: "Ultrasound reading: Act now" })).toBeVisible();
});
