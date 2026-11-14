// Regression and accessibility tests (npm test). Uses the Chrome installed on the machine: no browser download.
const { defineConfig } = require("@playwright/test");

const PORT = 8090;

module.exports = defineConfig({
    testDir: "tests",
    timeout: 120000,
    expect: { timeout: 15000 },
    fullyParallel: false,
    workers: 1,
    reporter: [["list"]],
    use: {
        baseURL: "http://localhost:" + PORT,
        channel: "chrome",
        headless: true,
        colorScheme: "light",
        reducedMotion: "reduce",
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }
    },
    projects: [
        { name: "phone", use: { viewport: { width: 414, height: 900 }, isMobile: false } },
        { name: "desktop", use: { viewport: { width: 1280, height: 1000 } } }
    ],
    webServer: {
        command: "node tools/serve.js",
        env: { PORT: String(PORT) },
        url: "http://localhost:" + PORT + "/index.html",
        reuseExistingServer: true,
        timeout: 30000
    }
});
