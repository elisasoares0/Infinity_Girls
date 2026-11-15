// Emergency end to end: an astronaut collapses, the voice speaks, the crew medical officer's device gets the alert
// in real time (Firestore), answers "I'm on my way", and the astronaut's device announces it.
const { test, expect, API } = require("./fixtures");
const { freshStart, signIn } = require("./helpers");

// Records what the voice assistant says (speechSynthesis is real, the test only listens)
async function spyVoice(context) {
    await context.addInitScript(function () {
        window.__spoken = [];
        if (window.speechSynthesis) {
            var speak = window.speechSynthesis.speak.bind(window.speechSynthesis);
            window.speechSynthesis.speak = function (utterance) {
                window.__spoken.push(utterance.text);
                speak(utterance);
            };
        }
    });
}

test.describe.configure({ mode: "serial" });

test("collapse: voice, crew alert, responder and announcement", async function ({ browser }, testInfo) {
    test.skip(testInfo.project.name !== "desktop", "Runs once, on the desktop project");
    const astronautContext = await browser.newContext({ viewport: { width: 414, height: 900 } });
    const doctorContext = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await spyVoice(astronautContext);
    await spyVoice(doctorContext);
    // These devices are not the fixture's page: keep them off the real health server too
    await astronautContext.route(API, function (route) {
        return route.abort();
    });
    await doctorContext.route(API, function (route) {
        return route.abort();
    });
    const astronaut = await astronautContext.newPage();
    const doctor = await doctorContext.newPage();

    await freshStart(astronaut);
    await signIn(astronaut, "hsilva", "in");
    await freshStart(doctor);
    await signIn(doctor, "cokafor", "in");
    // Both devices connected to the crew link
    for (const page of [astronaut, doctor]) {
        await expect.poll(function () {
            return page.evaluate(function () {
                return window.App.crewLink.status();
            });
        }, { timeout: 30000 }).toBe("online");
    }
    // A tap on the doctor's page lets the browser speak there
    await doctor.click("body");

    // The astronaut collapses (Presentation mode)
    await astronaut.click("[data-demo-open]");
    await astronaut.selectOption("[data-emergency-preview]", "collapse");
    const sos = astronaut.locator("[data-sos]");
    await expect(sos).toBeVisible();
    await expect(sos.locator("[data-sos-title]")).toHaveText("Not responding");
    await expect(sos.locator("[data-sos-step-text]")).toContainText("Check if the person responds");
    await expect(sos.locator("[data-sos-metronome]")).toBeVisible();
    await expect.poll(function () {
        return astronaut.evaluate(function () {
            return window.__spoken.join(" | ");
        });
    }).toContain("Commander Silva is not breathing");
    await expect(astronaut.locator("[data-voice-caption-text]")).not.toBeEmpty();

    // The doctor's device gets it, with the location, and answers
    const alertDialog = doctor.locator("[data-sos]");
    await expect(alertDialog).toBeVisible({ timeout: 20000 });
    await expect(alertDialog.locator("[data-sos-title]")).toContainText("Cmdr. Silva needs help");
    await expect(alertDialog.locator("[data-sos-map-text]")).toContainText("Location:");
    await expect.poll(function () {
        return doctor.evaluate(function () {
            return window.__spoken.join(" | ");
        });
    }).toContain("is not breathing in");
    await alertDialog.locator("[data-sos-respond]").click();

    // The astronaut's device shows and says who is coming
    await expect(sos.locator("[data-sos-crew]")).toContainText("Dr. Okafor is on the way", { timeout: 20000 });
    await expect.poll(function () {
        return astronaut.evaluate(function () {
            return window.__spoken.join(" | ");
        });
    }, { timeout: 60000 }).toContain("Doctor Okafor is on the way");

    // Steps are logged with UTC time
    await sos.locator("[data-sos-next]").click();
    await expect(sos.locator("[data-sos-log]")).toContainText(/\d{2}:\d{2} UTC · step 1 done/);

    // False alarm: cancel (two taps) closes it on both devices
    await sos.locator("[data-sos-cancel]").click();
    await sos.locator("[data-sos-cancel]").click();
    await expect(sos).toBeHidden();
    await expect(alertDialog).toBeHidden({ timeout: 20000 });

    await astronautContext.close();
    await doctorContext.close();
});
