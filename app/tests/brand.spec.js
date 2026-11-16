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

// Decorations: a gradient line ends each hero, the footer rises in a wave, the astronaut band has curved edges
test("the hero ends with a brand gradient line, the footer has a wave and the astronaut band is curved", async function ({ page }, testInfo) {
    await open(page, "/index.html");
    const home = await page.evaluate(function () {
        var line = getComputedStyle(document.querySelector(".greeting__container"), "::after");
        var band = getComputedStyle(document.querySelector(".astronaut-view__layout"));
        var wave = getComputedStyle(document.querySelector(".app-footer"), "::before");
        return {
            lineWidth: parseFloat(line.width),
            lineHeight: line.height,
            lineImage: line.backgroundImage,
            bandMask: band.maskImage || band.webkitMaskImage,
            waveHeight: wave.height
        };
    });
    expect(home.lineWidth).toBeGreaterThan(200);
    expect(home.lineHeight).toBe("4px");
    expect(home.lineImage).toContain("linear-gradient");
    expect(home.bandMask).toContain("horizon-edge-top.svg");
    expect(home.waveHeight).toBe(testInfo.project.name === "phone" ? "40px" : "56px");
    await page.goto("/pages/vitals/index.html");
    const inner = await page.evaluate(function () {
        var line = getComputedStyle(document.querySelector(".page-intro__container"), "::after");
        return { width: parseFloat(line.width), image: line.backgroundImage };
    });
    expect(inner.width).toBeGreaterThan(200);
    expect(inner.image).toContain("linear-gradient");
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
