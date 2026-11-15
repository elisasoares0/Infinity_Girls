// Astro Health brand: logo in the header, About & Credits and the design system page
const { test, expect } = require("./fixtures");
const { freshStart, signIn, setTheme, expectNoA11yViolations } = require("./helpers");

async function open(page, path) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await page.goto(path);
}

test("the header shows the Astro Health logo, never the NASA insignia", async function ({ page }) {
    await open(page, "/pages/vitals/index.html");
    await expect(page.locator(".app-header").getByRole("img", { name: "Astro Health" })).toBeVisible();
    await expect(page.locator(".app-header img[src*='space-apps']")).toHaveCount(0);
    await expect(page).toHaveTitle(/^Astro Health/);
});

test("the dark theme draws the orbit in Neon Yellow", async function ({ page }) {
    await open(page, "/pages/vitals/index.html");
    await setTheme(page, "dark");
    const stroke = await page.locator(".app-header .brand-mark__orbit").evaluate(function (el) {
        return getComputedStyle(el).stroke;
    });
    expect(stroke).toBe("rgb(234, 254, 7)");
});

// Team decision: neutral black and dark gray backgrounds in the dark theme, the brand blues kept for the details
test("the dark theme has neutral gray backgrounds and keeps the blue for the details", async function ({ page }) {
    await open(page, "/pages/profile/index.html");
    await setTheme(page, "dark");
    const colors = await page.evaluate(function () {
        function bg(selector) {
            return getComputedStyle(document.querySelector(selector)).backgroundColor;
        }
        return {
            page: bg("body"),
            card: bg(".card"),
            footer: bg(".app-footer"),
            link: getComputedStyle(document.querySelector(".page-intro__back") || document.querySelector("a")).color
        };
    });
    expect(colors.page).toBe("rgb(18, 18, 18)");
    expect(colors.card).toBe("rgb(28, 28, 30)");
    expect(colors.footer).toBe("rgb(7, 23, 63)");
});

test("Profile links to the design system and to About & Credits", async function ({ page }) {
    await open(page, "/pages/profile/index.html");
    await page.getByRole("link", { name: "About & Credits" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About & Credits");
    await expect(page.getByRole("link", { name: /DONKI/ })).toBeVisible();
    await expect(page.getByText(/not endorsed by NASA/)).toBeVisible();
    await page.goto("/pages/profile/index.html");
    await page.getByRole("link", { name: "Design system" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Astro Health design system");
    await expect(page.getByRole("table", { name: "Button variants by state" })).toBeVisible();
});

for (const theme of ["light", "dark"]) {
    for (const path of ["/pages/about/index.html", "/pages/design-system/index.html"]) {
        test("no axe violations on " + path + " (" + theme + ") @a11y", async function ({ page }) {
            await open(page, path);
            await setTheme(page, theme);
            await expectNoA11yViolations(page, path + " (" + theme + ")");
        });
    }
}
