// Health records reach the API (App.sync): a crew ID sign-in sends each new row, offline rows wait in the queue,
// and a NASA ID sign-in keeps everything on this device. The health server is simulated here.
const { test, expect, API } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

const USER = {
    id: "0f6f1c1e-0000-4000-8000-000000000427",
    idNumber: "AST-0427",
    name: "Helena Silva",
    role: "astronaut",
    sex: "Female",
    birthDate: "1985-03-14",
    mission: "Artemis IV",
    bloodType: "N/I"
};

// The simulated server: answers like api/main.py and keeps what it received.
// known: the IDs that already have an account there (others get "incorrect" until /auth/cadastro creates them)
async function fakeServer(page, known) {
    const calls = [];
    // ID → the user the server sends back (like perfil_publico in api/main.py)
    const accounts = new Map((known || ["AST-0427"]).map(function (id) {
        return [id, Object.assign({}, USER, { idNumber: id })];
    }));
    let nextId = 100;
    await page.route(API, function (route) {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        const method = request.method();
        const call = { method: method, path: path, type: request.headers()["content-type"] || "" };
        if (call.type.indexOf("application/json") === 0) {
            call.body = request.postDataJSON();
        }
        calls.push(call);
        let body = {};
        let status = 200;
        if (path === "/auth/login") {
            if (!accounts.has(call.body.idNumber)) {
                return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: { message: "ID or password is incorrect." } }) });
            }
            body = { access_token: "token", refresh_token: "refresh", expires_in: 3600, user: accounts.get(call.body.idNumber) };
        } else if (path === "/auth/cadastro") {
            const created = Object.assign({}, USER, {
                idNumber: call.body.idNumber, name: call.body.name, sex: call.body.sex, birthDate: call.body.birthDate
            });
            accounts.set(call.body.idNumber, created);
            status = 201;
            body = { access_token: "token", refresh_token: "refresh", expires_in: 3600, user: created };
        } else if (path === "/auth/sair") {
            return route.fulfill({ status: 204 });
        } else if (method === "POST") {
            status = 201;
            nextId += 1;
            body = { id: nextId };
        } else if (method === "PATCH") {
            body = { id: Number(path.split("/")[2]) };
        }
        return route.fulfill({ status: status, contentType: "application/json", body: JSON.stringify(body) });
    });
    return calls;
}

async function blockFirebase(page) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
}

async function measure(page, value) {
    await page.click("[data-glucose-measure]");
    const dialog = page.locator(".glucose-entry");
    await dialog.locator("#glucose-value").fill(String(value));
    await dialog.locator(".glucose-entry__save").click();
    await expect(dialog).toBeHidden();
}

function sent(calls, method, path) {
    return calls.filter(function (call) {
        return call.method === method && call.path === path;
    });
}

test("a crew ID sign-in sends vital signs, symptoms and scans to the server", async function ({ page }) {
    await blockFirebase(page);
    const calls = await fakeServer(page);
    await freshStart(page);
    await signIn(page, "AST-0427", "in");
    expect(sent(calls, "POST", "/auth/login")[0].body).toEqual({ idNumber: "AST-0427", password: "Mission2026" });

    // A blood sugar reading: systolic and diastolic, never the local member key or the alert (the server sets them)
    await measure(page, 92);
    await expect.poll(function () {
        return sent(calls, "POST", "/sinais-vitais").length;
    }).toBe(1);
    const vitals = sent(calls, "POST", "/sinais-vitais")[0].body;
    expect(vitals.glicose_mg_dl).toBe(92);
    expect(vitals.pressao_sistolica_mmhg).toBeGreaterThan(vitals.pressao_diastolica_mmhg);
    expect(vitals.pressao_diastolica_mmhg).toBeGreaterThan(30);
    expect(vitals.usuario_id).toBeUndefined();
    expect(vitals.status_alerta).toBeUndefined();

    // A symptom, then "feeling better": the update reaches the same row on the server
    await page.evaluate(function () {
        var row = App.records.insert("body_checkin", {
            usuario_id: "silva", regiao_anatomica: "costas", sintoma: "dor_nas_costas", intensidade: 2,
            protocolo_acao: "Mild: self-care.", resolvido: false
        });
        App.records.update("body_checkin", row.id, { resolvido: true });
    });
    await expect.poll(function () {
        return calls.filter(function (call) {
            return call.method === "PATCH" && /^\/body-checkin\/\d+$/.test(call.path);
        }).length;
    }).toBe(1);
    expect(sent(calls, "POST", "/body-checkin")[0].body).toEqual({
        regiao_anatomica: "costas", sintoma: "dor_nas_costas", intensidade: 2, protocolo_acao: "Mild: self-care."
    });

    // An ultrasound: the image goes as a file, with its text alternative
    await page.evaluate(function () {
        var blob = new Blob([new Uint8Array([82, 73, 70, 70])], { type: "image/webp" });
        return App.records.files.put("exames-imagem", "silva/test.webp", blob).then(function (url) {
            App.records.insert("exames_imagem", {
                usuario_id: "silva", tipo_exame: "ultrassom_venoso", regiao_anatomica: "veia_jugular_interna_esquerda",
                imagem_url: url, observacao_astronauta: null, status_leitura: "pendente", parecer_medico: null, avaliado_por: null
            });
        });
    });
    await expect.poll(function () {
        return sent(calls, "POST", "/exames-imagem").length;
    }).toBe(1);
    expect(sent(calls, "POST", "/exames-imagem")[0].type).toContain("multipart/form-data");

    await page.goto("/pages/profile/index.html");
    await expect(page.locator("[data-sync-status]")).toHaveText("Synced with the health server");
});

test("offline, new records wait on the device and go when the connection is back", async function ({ page, context }) {
    await blockFirebase(page);
    const calls = await fakeServer(page);
    await freshStart(page);
    await signIn(page, "AST-0427", "in");
    await page.goto("/pages/profile/index.html");
    await context.setOffline(true);
    await page.evaluate(function () {
        App.records.insert("body_checkin", {
            usuario_id: "silva", regiao_anatomica: "cabeca", sintoma: "dor_de_cabeca", intensidade: 3, resolvido: false
        });
    });
    await expect(page.locator("[data-sync-status]")).toHaveText(/^Offline: saved on this device/);
    expect(await page.evaluate(function () {
        return App.sync.pending();
    })).toBe(1);
    expect(sent(calls, "POST", "/body-checkin")).toHaveLength(0);

    await context.setOffline(false);
    await expect.poll(function () {
        return sent(calls, "POST", "/body-checkin").length;
    }).toBe(1);
    await expect(page.locator("[data-sync-status]")).toHaveText("Synced with the health server");
    expect(await page.evaluate(function () {
        return App.sync.pending();
    })).toBe(0);
});

test("a NASA ID sign-in also signs in on the server with the account's ID, and sends the records", async function ({ page }) {
    await blockFirebase(page);
    const calls = await fakeServer(page);
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    expect(sent(calls, "POST", "/auth/login")[0].body).toEqual({ idNumber: "AST-0427", password: "Mission2026" });
    expect(sent(calls, "POST", "/auth/cadastro")).toHaveLength(0);
    await measure(page, 95);
    await expect.poll(function () {
        return sent(calls, "POST", "/sinais-vitais").length;
    }).toBe(1);
});

test("the first NASA ID sign-in creates the account on the server from the test account", async function ({ page }) {
    await blockFirebase(page);
    const calls = await fakeServer(page, []);
    await freshStart(page);
    await signIn(page, "ktanaka", "in");
    expect(sent(calls, "POST", "/auth/cadastro")[0].body).toEqual({
        idNumber: "AST-0388", name: "Kenji Tanaka", password: "Mission2026", birthDate: "1988-07-02", sex: "Male"
    });
    await page.goto("/pages/profile/index.html");
    await expect(page.locator("[data-sync-status]")).toHaveText("Synced with the health server");
});

test("a demo account fills the crew ID and signs in on the server, created there the first time", async function ({ page }) {
    await blockFirebase(page);
    const calls = await fakeServer(page, []);
    await freshStart(page);
    await page.locator(".auth__demo .help__summary").click();
    const silva = page.locator(".auth__demo-item", { hasText: "Helena Silva" });
    await expect(silva.locator(".auth__demo-meta")).toContainText("AST-0427");
    await expect(silva.locator(".auth__demo-meta")).not.toContainText("hsilva");
    await silva.locator("button").click();
    await expect(page.locator("#signin-nasa-id")).toHaveValue("AST-0427");
    await expect(page.locator("#signin-password")).toHaveValue("Mission2026");
    await page.check("[data-auth-phase='in'] input");
    await Promise.all([
        page.waitForEvent("load"),
        page.click("[data-auth-form='signin'] .auth__submit")
    ]);
    await expect(page.locator("html")).toHaveAttribute("data-session", "in");
    expect(sent(calls, "POST", "/auth/login")[0].body).toEqual({ idNumber: "AST-0427", password: "Mission2026" });
    expect(sent(calls, "POST", "/auth/cadastro")[0].body).toEqual({
        idNumber: "AST-0427", name: "Helena Silva", password: "Mission2026", birthDate: "1985-03-14", sex: "Female"
    });
    await page.goto("/pages/profile/index.html");
    await expect(page.locator("[data-sync-status]")).toHaveText("Synced with the health server");
    // The test account keeps its NASA ID on the Profile
    await expect(page.locator("[data-personal='nasaId']")).toHaveText("hsilva");
});

// Create account asks for the ID only (no NASA ID): it is the login, here and on the server
async function createAccount(page, idNumber) {
    await page.click("#auth-tab-signup");
    const form = page.locator("[data-auth-form='signup']");
    await expect(form.locator("[name='nasaId']")).toHaveCount(0);
    await form.locator("#signup-name").fill("Ana Costa");
    await form.locator("#signup-id-number").fill(idNumber);
    await form.locator("input[name='sex'][value='Female']").check();
    await form.locator("[name='birthDate']").fill("1990-05-20");
    await form.locator("#signup-password").fill("Orbit2026x");
    await form.locator("[name='confirm']").fill("Orbit2026x");
    await Promise.all([
        page.waitForEvent("load"),
        form.locator(".auth__submit").click()
    ]);
    await expect(page.locator("html")).toHaveAttribute("data-session", "in");
}

test("create account asks for the ID only, creates it on the server, and it signs in with that ID", async function ({ page }) {
    await blockFirebase(page);
    const calls = await fakeServer(page, []);
    await freshStart(page);
    await createAccount(page, "ast 2001");
    expect(sent(calls, "POST", "/auth/cadastro")[0].body).toEqual({
        idNumber: "AST-2001", name: "Ana Costa", password: "Orbit2026x", birthDate: "1990-05-20", sex: "Female"
    });
    await page.goto("/pages/profile/index.html");
    await expect(page.locator("[data-personal='idNumber']")).toHaveText("AST-2001");
    await expect(page.locator("[data-personal-nasa-row]")).toBeHidden();
    await page.locator("[data-sign-out]").first().click();
    await signInWith(page, "AST-2001", "Orbit2026x");
    expect(sent(calls, "POST", "/auth/login").pop().body).toEqual({ idNumber: "AST-2001", password: "Orbit2026x" });
});

test("an account created offline signs in with its ID and reaches the server later", async function ({ page }) {
    // The fixture keeps the real server unreachable: the account is created on this device
    await blockFirebase(page);
    await freshStart(page);
    await createAccount(page, "AST-2002");
    await page.goto("/pages/profile/index.html");
    await expect(page.locator("[data-personal='idNumber']")).toHaveText("AST-2002");
    await page.locator("[data-sign-out]").first().click();
    // Back online, the server does not know it yet: the local password is checked and the account is created there
    const calls = await fakeServer(page, []);
    await signInWith(page, "AST-2002", "Orbit2026x");
    expect(sent(calls, "POST", "/auth/login")[0].body.idNumber).toBe("AST-2002");
    expect(sent(calls, "POST", "/auth/cadastro")[0].body.idNumber).toBe("AST-2002");
});

async function signInWith(page, login, password) {
    await page.goto("/index.html");
    await page.fill("#signin-nasa-id", login);
    await page.fill("#signin-password", password);
    await Promise.all([
        page.waitForEvent("load"),
        page.click("[data-auth-form='signin'] .auth__submit")
    ]);
    await expect(page.locator("html")).toHaveAttribute("data-session", "in");
}

test("with the server out of reach, a NASA ID sign-in keeps the records on this device", async function ({ page }) {
    // No fake server: the fixture makes the real one unreachable
    await blockFirebase(page);
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await measure(page, 95);
    await page.goto("/pages/profile/index.html");
    await expect(page.locator("[data-sync-status]")).toHaveText("Saved on this device only: the health server could not be reached at sign-in");
});
