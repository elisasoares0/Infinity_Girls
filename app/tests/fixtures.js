// The Playwright test with one rule for every spec: the real health server (assets/js/api.js) is never reached.
// Its requests fail as if offline, so sign-in and sign-up fall back to this device and no test creates real accounts.
// A spec that needs the server routes the same address afterwards (the last route registered answers first).
const base = require("@playwright/test");

const API = /astrohealth-api\.onrender\.com/;

const test = base.test.extend({
    page: async function ({ page }, use) {
        await page.route(API, function (route) {
            return route.abort();
        });
        await use(page);
    }
});

module.exports = { test: test, expect: base.expect, API: API };
