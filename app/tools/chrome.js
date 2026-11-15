/*
 * Writes the shared page chrome (theme script, header, footer, tab bar, Presentation mode panel) into every page,
 * so all pages stay identical. Run after adding a page or changing the navigation:
 *   node tools/chrome.js
 * Each item is shown to the profiles in data-profiles (see App.isVisible in assets/js/app.js).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// Page file → active tab key
const PAGES = {
    "index.html": "home",
    "pages/vitals/index.html": "vitals",
    "pages/emergency/index.html": "emergency",
    "pages/privacy/index.html": "privacy",
    "pages/profile/index.html": "profile",
    "pages/body/index.html": null,
    "pages/womens-health/index.html": null,
    "pages/mens-health/index.html": null,
    "pages/learn/index.html": null,
    "pages/about/index.html": null,
    "pages/design-system/index.html": null
};

const ICONS = {
    home: "<path d=\"M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z\"/>",
    vitals: "<path d=\"M72,144H32a8,8,0,0,1,0-16H67.72l13.62-20.44a8,8,0,0,1,13.32,0l25.34,38,9.34-14A8,8,0,0,1,136,128h24a8,8,0,0,1,0,16H140.28l-13.62,20.44a8,8,0,0,1-13.32,0L88,126.42l-9.34,14A8,8,0,0,1,72,144ZM178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,.75,0,1.5,0,2.25a8,8,0,1,0,16-.5c0-.58,0-1.17,0-1.75A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46c0,53.61-77.76,102.15-96,112.8-10.83-6.31-42.63-26-66.68-52.21a8,8,0,1,0-11.8,10.82c31.17,34,72.93,56.68,74.69,57.63a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40Z\"/>",
    tasks: "<path d=\"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM224,48V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM208,208V48H48V208H208Z\"/>",
    emergency: "<path d=\"M216,88H168V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V88H40a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16H88v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V168h48a16,16,0,0,0,16-16V104A16,16,0,0,0,216,88Zm0,64H160a8,8,0,0,0-8,8v56H104V160a8,8,0,0,0-8-8H40V104H96a8,8,0,0,0,8-8V40h48V96a8,8,0,0,0,8,8h56Z\"/>",
    privacy: "<path d=\"M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z\"/>",
    profile: "<path d=\"M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z\"/>"
};

// key, label, href from the site root, profiles, scroll-spy target on the home page
const TABS = [
    { key: "home", label: "Home", href: "index.html", homeHref: "#main", target: "home" },
    { key: "vitals", label: "Vitals", href: "pages/vitals/index.html", profiles: "female male" },
    { key: "tasks", label: "Tasks", href: "index.html#tasks", homeHref: "#tasks", target: "tasks", profiles: "female male" },
    { key: "emergency", label: "Emergency", href: "pages/emergency/index.html", profiles: "doctor" },
    { key: "privacy", label: "Privacy", href: "pages/privacy/index.html", profiles: "female male" },
    { key: "profile", label: "Profile", href: "pages/profile/index.html" }
];

function header(prefix) {
    return `<header class="app-header">
        <div class="app-header__container">
            <span class="app-header__logo" role="img" aria-label="Astro Health"><svg class="brand-mark" viewBox="330 500 1280 960" aria-hidden="true" focusable="false"><ellipse class="brand-mark__orbit-back" transform="rotate(-19 965 982)" cx="965" cy="982" rx="656" ry="178" fill="none" stroke-width="10"/><path class="brand-mark__heart" stroke-width="16" d="M965 648C918 567 845 522 756 522C680 522 605 560 547 630C497 694 475 762 475 828C475 1010 610 1210 965 1445C1320 1210 1457 1010 1457 828C1457 762 1435 694 1385 630C1327 560 1252 522 1176 522C1087 522 1014 567 965 648Z"/><polyline class="brand-mark__pulse" points="594,977 791,977 861,838 942,1140 1024,745 1104,977 1335,977" fill="none" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/><ellipse class="brand-mark__halo" transform="rotate(-19 965 982)" cx="965" cy="982" rx="656" ry="178" fill="none" stroke-width="36" pathLength="360" stroke-dasharray="186 174" stroke-dashoffset="6"/><ellipse class="brand-mark__orbit" transform="rotate(-19 965 982)" cx="965" cy="982" rx="656" ry="178" fill="none" stroke-width="12" stroke-linecap="round" pathLength="360" stroke-dasharray="186 174" stroke-dashoffset="6"/><path class="brand-mark__star" stroke-width="26" stroke-linejoin="round" paint-order="stroke" d="M1409 905L1435 965L1496 992L1435 1018L1409 1078L1383 1018L1322 992L1383 965Z"/></svg><span class="app-header__wordmark" aria-hidden="true"><span class="app-header__word">Astro</span> <span class="app-header__word app-header__word--accent">Health</span></span></span>
            <div class="app-header__bar">
                <dl class="status-bar" aria-label="Mission and connection status">
                    <div class="status-bar__item">
                        <dt>Phase</dt>
                        <dd class="status-bar__value" data-phase-label>In flight · day 42</dd>
                    </div>
                    <div class="status-bar__item" data-phases="in">
                        <dt>Last sync</dt>
                        <dd class="status-bar__value"><time datetime="08:42" data-last-sync>08:42 UTC</time></dd>
                    </div>
                    <div class="status-bar__item" data-phases="in">
                        <dt>Signal delay</dt>
                        <dd class="status-bar__value" data-mode-delay>&lt; 1 s</dd>
                    </div>
                    <div class="status-bar__item" data-phases="in">
                        <dt>Medical lead</dt>
                        <dd class="status-bar__value" data-mode-lead>Flight surgeon (ground)</dd>
                    </div>
                    <div class="status-bar__item status-bar__item--offline status-bar__item--hidden" data-connection>
                        <dt>Connection</dt>
                        <dd class="status-bar__value">Offline · saved on board</dd>
                    </div>
                </dl>
                <div class="app-header__actions">
                    <button class="theme-toggle" type="button" aria-label="Switch to dark theme" title="Switch to dark theme" data-theme-toggle><svg class="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" data-theme-icon="moon"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"/></svg><svg class="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" data-theme-icon="sun" hidden><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg><span class="theme-toggle__text" data-theme-label>Dark</span></button>
                    <button class="ask-toggle" type="button" aria-haspopup="dialog" aria-label="Ask the assistant" title="Ask the assistant" data-ask-open><svg class="ask-toggle__icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.13,16.13,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78l.09-.07L83,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM40,224h0ZM216,192H80a8,8,0,0,0-5.23,1.95L40,224V64H216ZM88,112a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,112Zm0,32a8,8,0,0,1,8-8h64a8,8,0,1,1,0,16H96A8,8,0,0,1,88,144Z"/></svg><span class="ask-toggle__text">Ask</span></button>
                    <button class="sos-toggle" type="button" aria-haspopup="dialog" aria-controls="sos-dialog" aria-label="SOS: get help now" data-phases="in" data-profiles="female male doctor" data-sos-open data-essential><svg class="sos-toggle__icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg><span class="sos-toggle__text">SOS</span></button>
                </div>
            </div>
            <p class="sr-only" aria-live="polite" data-connection-announcer></p>
        </div>
        <div class="crew-alert" role="alert" data-crew-alert hidden>
            <div class="crew-alert__container">
                <svg class="crew-alert__icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg>
                <p class="crew-alert__text" data-crew-alert-text></p>
                <button class="button button--secondary crew-alert__open" type="button" data-crew-alert-open><span class="button__text">Open</span></button>
            </div>
        </div>
    </header>`;
}

// Footer: the same credits on every page, and the Presentation mode (demo) button. A note that belongs to one page
// goes in that page's content, not here.
const FOOTER = `<footer class="app-footer">
        <div class="app-footer__container">
            <p class="app-footer__text">Prototype with simulated health data for the NASA Space Apps Challenge 2026. Radiation limit from the NASA Office of the Chief Health and Medical Officer. Space weather from NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information).</p>
            <p class="app-footer__text">Fonts: Fira Sans and Overpass, SIL Open Font License.</p>
            <button class="demo-toggle" type="button" aria-haspopup="dialog" aria-controls="demo-panel" aria-label="Presentation mode (demo)" title="Presentation mode (demo)" data-demo-open><svg class="demo-toggle__icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M40,88H73a32,32,0,0,0,62,0h81a8,8,0,0,0,0-16H135a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16Zm64-24A16,16,0,1,1,88,80,16,16,0,0,1,104,64ZM216,168H199a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16h97a32,32,0,0,0,62,0h17a8,8,0,0,0,0-16Zm-48,24a16,16,0,1,1,16-16A16,16,0,0,1,168,192Z"/></svg><span class="demo-toggle__flag" aria-hidden="true" data-demo-badge hidden>!</span></button>
        </div>
    </footer>`;

/*
 * Presentation mode: the demo controls, kept apart from the real data in a dialog opened by the "Demo" button in the footer.
 * In real use the mission comes from mission control and the readings from the sensors; these only simulate them.
 */
const DEMO = `<dialog class="demo" id="demo-panel" aria-labelledby="demo-title" data-demo-panel>
        <div class="demo__container">
            <div class="demo__head">
                <h2 class="demo__title" id="demo-title">Presentation mode</h2>
                <button class="demo__close" type="button" aria-label="Close Presentation mode" data-demo-close><svg class="demo__close-icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg></button>
            </div>
            <p class="demo__text">For the presentation only. In real use, the mission comes from mission control and the readings come from the sensors on their own.</p>
            <div class="demo__fields">
                <div class="field demo__field">
                    <label class="field__label" for="mode-preview">Mission destination</label>
                    <select class="field__input" id="mode-preview" data-mode-preview>
                        <option value="auto" data-demo-auto="mode">Real mission</option>
                        <option value="station">Simulate: Space station</option>
                        <option value="moon">Simulate: Moon</option>
                        <option value="mars">Simulate: Mars</option>
                    </select>
                </div>
                <div class="field demo__field">
                    <label class="field__label" for="phase-preview">Mission phase</label>
                    <select class="field__input" id="phase-preview" data-phase-preview>
                        <option value="auto" data-demo-auto="phase">From the mission dates</option>
                        <option value="pre">Simulate: Before flight</option>
                        <option value="in">Simulate: In flight</option>
                        <option value="post">Simulate: After flight</option>
                    </select>
                </div>
                <div class="field demo__field">
                    <label class="field__label" for="context-preview">Surface context (Moon and Mars)</label>
                    <select class="field__input" id="context-preview" data-context-preview>
                        <option value="auto" data-demo-auto="context">From the mission plan</option>
                        <option value="transit">Simulate: in transit</option>
                        <option value="base">Simulate: surface base</option>
                        <option value="rover">Simulate: rover traverse</option>
                    </select>
                </div>
                <div class="field demo__field">
                    <label class="field__label" for="link-preview">Connection with Earth (in flight)</label>
                    <select class="field__input" id="link-preview" data-link-preview>
                        <option value="connected">Real: follows this device's connection</option>
                        <option value="lost">Simulate: link lost</option>
                    </select>
                </div>
                <div class="field demo__field">
                    <label class="field__label" for="sensor-preview">Health sensors</label>
                    <select class="field__input" id="sensor-preview" data-sensor-preview>
                        <option value="connected">Real: all sending data</option>
                        <option value="shirt-off">Simulate: Astroskin shirt off</option>
                        <option value="dispenser-off">Simulate: water dispenser offline</option>
                    </select>
                </div>
                <div class="field demo__field">
                    <label class="field__label" for="emergency-preview">Emergency (in flight)</label>
                    <select class="field__input" id="emergency-preview" data-emergency-preview>
                        <option value="none">Real: no emergency</option>
                        <option value="chest-pain">Simulate: chest pain</option>
                        <option value="collapse">Simulate: collapse, not breathing</option>
                        <option value="low-oxygen">Simulate: low oxygen</option>
                        <option value="high-fever">Simulate: high fever</option>
                    </select>
                </div>
            </div>
            <button class="button button--secondary demo__reminder" type="button" data-demo-reminder hidden><span class="button__text">Show the next reminder now</span></button>
            <p class="demo__status" role="status" data-demo-status></p>
            <button class="button button--secondary demo__reset" type="button" data-demo-reset><span class="button__text">Back to the real mission</span></button>
        </div>
    </dialog>`;

/*
 * Emergency UI on every page (assets/js/emergency-engine.js, voice.js, crew-link.js): the SOS dialog that walks
 * through a guide one step at a time, the crew alert banner, and the caption that shows what the voice says.
 */
const EMERGENCY_UI = `<!-- emergency ui -->
    <div class="voice-caption" data-voice-caption hidden>
        <svg class="voice-caption__icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M155.51,24.81a8,8,0,0,0-8.42.88L77.25,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V32A8,8,0,0,0,155.51,24.81ZM32,96H72v64H32ZM144,207.64,88,164.09V91.91l56-43.55Zm54-106.08a40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.58,24,24,0,0,0,0-31.72,8,8,0,0,1,12-10.58ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z"/></svg>
        <p class="voice-caption__text" aria-live="polite" data-voice-caption-text></p>
    </div>

    <dialog class="sos" id="sos-dialog" aria-labelledby="sos-title" data-sos data-essential>
        <div class="sos__container">
            <div class="sos__head">
                <div class="sos__heading">
                    <p class="sos__eyebrow" data-sos-eyebrow>Emergency</p>
                    <h2 class="sos__title" id="sos-title" tabindex="-1" data-sos-title>Help requested</h2>
                </div>
                <button class="sos__minimize" type="button" aria-label="Minimize: the alert stays open" data-sos-minimize><svg class="sos__minimize-icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z"/></svg></button>
            </div>
            <button class="button button--primary sos__hear" type="button" data-sos-hear hidden><span class="button__text">Tap to hear the instructions</span></button>
            <ul class="sos__vitals" aria-label="Vital signs" data-sos-vitals></ul>
            <p class="sos__crew" role="status" data-sos-crew></p>
            <section class="sos__step" aria-labelledby="sos-step-count">
                <p class="sos__step-count" id="sos-step-count" data-sos-step-count></p>
                <p class="sos__step-text" aria-live="polite" data-sos-step-text></p>
                <div class="sos__step-how" data-sos-step-how></div>
                <div class="field sos__pick" data-sos-pick hidden>
                    <label class="field__label" for="sos-pick">What is happening?</label>
                    <select class="field__input" id="sos-pick" data-sos-pick-select>
                        <option value="">Choose a guide</option>
                    </select>
                </div>
                <div class="metronome" data-sos-metronome hidden>
                    <button class="button button--primary metronome__toggle" type="button" aria-pressed="false" data-sos-beat><span class="button__text">Start the compression beat</span></button>
                    <span class="metronome__beat" aria-hidden="true"></span>
                    <p class="metronome__time"><span class="metronome__label">Time</span> <span class="metronome__clock">0:00</span></p>
                    <p class="metronome__note">110 compressions a minute, at the beat. Every 2 minutes, check breathing.</p>
                </div>
                <div class="sos__actions">
                    <button class="button button--primary" type="button" data-sos-next><span class="button__text">Next step</span></button>
                    <button class="button button--secondary" type="button" data-sos-repeat><span class="button__text">Repeat</span></button>
                    <button class="button button--secondary" type="button" aria-pressed="false" data-sos-commands hidden><span class="button__text">Voice commands</span></button>
                </div>
                <p class="sos__commands" role="status" data-sos-commands-status hidden></p>
            </section>
            <div class="sos__responder-actions">
                <button class="button button--primary" type="button" data-sos-respond hidden><span class="button__text">I'm on my way</span></button>
                <button class="button button--secondary" type="button" data-sos-resolve hidden><span class="button__text">Resolved</span></button>
            </div>
            <section class="sos__where" aria-labelledby="sos-where-title">
                <h3 class="sos__where-title" id="sos-where-title">Where</h3>
                <svg class="habitat-map" aria-hidden="true" data-sos-map></svg>
                <p class="sos__map-text" data-sos-map-text></p>
                <div class="field sos__location" data-sos-location-field>
                    <label class="field__label" for="sos-location">I'm in…</label>
                    <select class="field__input" id="sos-location" data-sos-location></select>
                </div>
            </section>
            <p class="sos__log" data-sos-log></p>
            <div class="sos__footer">
                <a class="button button--tertiary" href="#" data-sos-guide-link><span class="button__text">Open the full guide</span></a>
                <button class="button button--tertiary sos__cancel" type="button" data-sos-cancel><span class="button__text">I'm OK, cancel the alert</span></button>
            </div>
            <p class="sos__note">Guides are simplified examples, not medical instructions. In a real emergency, follow the crew medical checklist.</p>
        </div>
    </dialog>
    <!-- /emergency ui -->`;

// Shared scripts on every page, right after app.js, in this order (each one deferred)
const SHARED_SCRIPTS = ["crew-data.js", "records.js", "api.js", "sync.js", "glucose.js", "health-info.js", "guides.js", "voice.js", "habitat.js", "crew-link.js", "emergency-engine.js", "inbox.js", "reminders.js", "symptoms.js", "nausea-mode.js", "assistant-data.js", "assistant.js"];

function sharedScripts(html, prefix, file) {
    SHARED_SCRIPTS.forEach(function (name) {
        html = html.split("\n    <script src=\"" + prefix + "assets/js/" + name + "\" defer></script>").join("");
    });
    const app = "<script src=\"" + prefix + "assets/js/app.js\" defer></script>";
    if (html.indexOf(app) === -1) {
        throw new Error(file + ": app.js script not found");
    }
    const block = SHARED_SCRIPTS.map(function (name) {
        return "\n    <script src=\"" + prefix + "assets/js/" + name + "\" defer></script>";
    }).join("");
    return html.replace(app, app + block);
}

function tabBar(file, prefix, active) {
    const isHome = file === "index.html";
    const items = TABS.map(function (tab) {
        const href = isHome && tab.homeHref ? tab.homeHref : prefix + tab.href;
        const isActive = tab.key === active;
        const classes = "tab-bar__link" + (isActive ? " tab-bar__link--active" : "");
        const current = isActive ? (isHome ? " aria-current=\"location\"" : " aria-current=\"page\"") : "";
        const target = isHome && tab.target ? ` data-tab-target="${tab.target}"` : "";
        const profiles = tab.profiles ? ` data-profiles="${tab.profiles}"` : "";
        return `                <li${profiles}>
                    <a class="${classes}" href="${href}"${target}${current}>
                        <span class="tab-bar__icon-wrap">
                            <svg class="tab-bar__icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${ICONS[tab.key]}</svg>
                        </span>
                        ${tab.label}
                    </a>
                </li>`;
    }).join("\n");
    return `<nav class="tab-bar" aria-label="Main navigation">
        <div class="tab-bar__container">
            <ul class="tab-bar__list">
${items}
            </ul>
        </div>
    </nav>`;
}

// Sets the theme on <html> before the first paint: the saved choice, or the device setting.
// Inline on purpose (the only inline script): a deferred file would flash the light theme first.
/*
 * Runs before the first paint (the only inline script): sets the theme, and the session, profile and mission
 * phase as attributes on <html>, so base.css hides what this person and phase do not see before app.js runs
 * (no layout shift). Also data-nausea="on" while nausea mode is on (assets/js/nausea-mode.js), so the page
 * opens already simplified. The phase follows App.getPhase(): Presentation mode preview, otherwise the mission dates.
 */
const THEME_INIT = '<script data-theme-init>(function(){var d=document.documentElement,g=function(k){try{return JSON.parse(localStorage.getItem("astro-health:"+k));}catch(e){return null;}},t=g("theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}d.setAttribute("data-theme",t);var s=g("session"),p=s&&/^(female|male|doctor)$/.test(s.profile)?s.profile:"",v=g("phase-preview"),m=s&&s.mission,h="in";d.setAttribute("data-session",p?"in":"out");if(p){d.setAttribute("data-profile",p);}if(v==="pre"||v==="in"||v==="post"){h=v;}else if(!g("mode-preview")&&m&&!isNaN(Date.parse(m.launchDate))){var n=new Date(),a=Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()),l=Date.parse(m.launchDate+"T00:00:00Z");h=a<l?"pre":a>=l+m.lengthDays*864e5?"post":"in";}d.setAttribute("data-phase",h);var x=s&&s.member&&g("nausea:"+s.member);if(p&&p!=="doctor"&&x&&x.on&&(!x.until||x.until>Date.now())){d.setAttribute("data-nausea","on");}})();</script>';

function replaceOnce(html, pattern, value, file, name) {
    if (!pattern.test(html)) {
        throw new Error(file + ": " + name + " not found");
    }
    return html.replace(pattern, function () {
        return value;
    });
}

Object.keys(PAGES).forEach(function (file) {
    const full = path.join(ROOT, file);
    const prefix = file === "index.html" ? "" : "../../";
    let html = fs.readFileSync(full, "utf8");
    if (/<script data-theme-init>/.test(html)) {
        html = replaceOnce(html, /<script data-theme-init>[\s\S]*?<\/script>/, THEME_INIT, file, "theme init");
    } else {
        const viewport = html.match(/<meta name="viewport"[^>]*>/);
        if (!viewport) {
            throw new Error(file + ": viewport meta not found");
        }
        html = html.replace(viewport[0], viewport[0] + "\n    " + THEME_INIT);
    }
    // Older layouts: demo controls in the footer, or a floating Demo button right before the dialog. Remove them,
    // and any dialog from a previous run, before writing the header, the footer (it holds the Demo button now) and the panel
    html = html.replace(/\s*<div class="app-footer__demo">[\s\S]*?<\/div>/, "");
    html = html.replace(/\s*<button class="demo-toggle"[^\n]*<\/button>\s*<dialog class="demo"[\s\S]*?<\/dialog>/, "");
    html = html.replace(/\s*<dialog class="demo"[\s\S]*?<\/dialog>/, "");
    html = html.replace(/\s*<!-- emergency ui -->[\s\S]*?<!-- \/emergency ui -->/, "");
    html = sharedScripts(html, prefix, file);
    html = replaceOnce(html, /<header class="app-header">[\s\S]*?<\/header>/, header(prefix), file, "header");
    html = replaceOnce(html, /<footer class="app-footer">[\s\S]*?<\/footer>/, FOOTER, file, "footer");
    html = replaceOnce(html, /<nav class="tab-bar"[\s\S]*?<\/nav>/, tabBar(file, prefix, PAGES[file]) + "\n\n    " + DEMO + "\n\n    " + EMERGENCY_UI, file, "tab bar");
    fs.writeFileSync(full, html);
});

console.log("Chrome written to " + Object.keys(PAGES).length + " pages");
