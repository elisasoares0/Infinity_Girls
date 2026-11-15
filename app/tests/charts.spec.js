// Charts follow the Material data visualization hierarchy: drawn at real size (axis labels are 12px, never bigger
// than the card title), the summary in regular weight, and the legend above the chart on phones, below on desktop
const { test, expect } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

async function openBody(page) {
    await page.route(/googleapis\.com|firebaseio\.com/, function (route) {
        return route.abort();
    });
    await freshStart(page);
    await signIn(page, "hsilva", "in");
    await page.goto("/pages/body/index.html");
    await expect(page.locator("[data-mass-chart] .chart__line")).toHaveCount(1);
}

test("charts are drawn at their real size: 12px axis labels, smaller than the card title", async function ({ page }) {
    await openBody(page);
    const charts = await page.locator(".chart__svg").evaluateAll(function (svgs) {
        return svgs.filter(function (svg) {
            return svg.getBoundingClientRect().width > 0 && svg.querySelector(".chart__axis-label");
        }).map(function (svg) {
            var label = svg.querySelector(".chart__axis-label");
            var card = svg.closest(".card");
            var title = card && card.querySelector(".card__title");
            return {
                scale: svg.getScreenCTM().a,
                label: label.getBoundingClientRect().height,
                title: title ? parseFloat(window.getComputedStyle(title).fontSize) : 18
            };
        });
    });
    expect(charts.length).toBeGreaterThan(1);
    charts.forEach(function (chart) {
        expect(chart.scale).toBeGreaterThan(0.98);
        expect(chart.scale).toBeLessThan(1.02);
        // the rendered glyph box of 12px text is about 12–16px high, always below the title size
        expect(chart.label).toBeLessThan(chart.title);
    });
});

test("the summary is regular weight; the legend is above the chart on phones and below it on wider screens", async function ({ page }, testInfo) {
    await openBody(page);
    const layout = await page.locator("[data-mass-card] .chart").evaluate(function (chart) {
        var summary = chart.querySelector(".chart__summary");
        var legend = chart.querySelector(".chart__legend");
        var svg = chart.querySelector(".chart__svg");
        var table = chart.querySelector(".help");
        return {
            weight: window.getComputedStyle(summary).fontWeight,
            legendSize: parseFloat(window.getComputedStyle(legend).fontSize),
            legendTop: legend.getBoundingClientRect().top,
            svgTop: svg.getBoundingClientRect().top,
            tableTop: table.getBoundingClientRect().top
        };
    });
    expect(layout.weight).toBe("400");
    expect(layout.legendSize).toBe(12);
    if (testInfo.project.name === "phone") {
        expect(layout.legendTop).toBeLessThan(layout.svgTop);
    } else {
        expect(layout.legendTop).toBeGreaterThan(layout.svgTop);
    }
    // "Show data as a table" stays last in both layouts
    expect(layout.tableTop).toBeGreaterThan(Math.max(layout.legendTop, layout.svgTop));
});
