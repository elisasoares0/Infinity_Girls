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
    "pages/learn/index.html": null
};

const ICONS = {
    home: "<path d=\"M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z\"/>",
    vitals: "<path d=\"M3 12h4l2-5 4 10 2-5h6\"/>",
    tasks: "<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"3\"/><path d=\"M8.5 12l2.5 2.5 4.5-5\"/>",
    emergency: "<path d=\"M12 3l9.5 17h-19z\"/><path d=\"M12 10v4.5M12 17.5v.1\"/>",
    privacy: "<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>",
    profile: "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>"
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
            <img class="app-header__logo" src="${prefix}assets/img/logo-space-apps.svg" width="561" height="221" alt="NASA Space Apps Challenge 2026">
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
                    <button class="theme-toggle" type="button" aria-label="Switch to dark theme" title="Switch to dark theme" data-theme-toggle><svg class="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-theme-icon="moon"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/></svg><svg class="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-theme-icon="sun" hidden><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><span class="theme-toggle__text" data-theme-label>Dark</span></button>
                    <button class="ask-toggle" type="button" aria-haspopup="dialog" aria-label="Ask the assistant" title="Ask the assistant" data-ask-open><svg class="ask-toggle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h16v10H10l-4 3.5v-3.5H4z"/><path d="M9 9.5h6M9 12.5h3.5"/></svg><span class="ask-toggle__text">Ask</span></button>
                    <button class="demo-toggle" type="button" aria-haspopup="dialog" aria-controls="demo-panel" aria-label="Presentation mode (demo)" title="Presentation mode (demo)" data-demo-open><svg class="demo-toggle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg><span class="demo-toggle__flag" aria-hidden="true" data-demo-badge hidden>!</span></button>
                    <button class="sos-toggle" type="button" aria-haspopup="dialog" aria-controls="sos-dialog" aria-label="SOS: get help now" data-phases="in" data-profiles="female male doctor" data-sos-open><svg class="sos-toggle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.1"/></svg><span class="sos-toggle__text">SOS</span></button>
                    <a class="app-header__emergency" href="${prefix}pages/emergency/index.html" data-phases="in" data-emergency-link><svg class="app-header__emergency-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M9 5V3.5h6V5M12 9.5v6M9 12.5h6"/></svg><span class="app-header__emergency-text">Emergency guide</span></a>
                </div>
            </div>
            <p class="sr-only" aria-live="polite" data-connection-announcer></p>
        </div>
        <div class="crew-alert" role="alert" data-crew-alert hidden>
            <div class="crew-alert__container">
                <svg class="crew-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.1"/></svg>
                <p class="crew-alert__text" data-crew-alert-text></p>
                <button class="button button--secondary crew-alert__open" type="button" data-crew-alert-open><span class="button__text">Open</span></button>
            </div>
        </div>
    </header>`;
}

// Footer: the same credits on every page. A note that belongs to one page goes in that page's content, not here.
const FOOTER = `<footer class="app-footer">
        <div class="app-footer__container">
            <p class="app-footer__text">Prototype with simulated health data for the NASA Space Apps Challenge 2026. Radiation limit from the NASA Office of the Chief Health and Medical Officer. Space weather from NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information).</p>
            <p class="app-footer__text">Fonts: Fira Sans and Overpass, SIL Open Font License.</p>
        </div>
    </footer>`;

/*
 * Presentation mode: the demo controls, kept apart from the real data in a dialog opened by the "Demo" button in the header.
 * In real use the mission comes from mission control and the readings from the sensors; these only simulate them.
 */
const DEMO = `<dialog class="demo" id="demo-panel" aria-labelledby="demo-title" data-demo-panel>
        <div class="demo__container">
            <div class="demo__head">
                <h2 class="demo__title" id="demo-title">Presentation mode</h2>
                <button class="demo__close" type="button" aria-label="Close Presentation mode" data-demo-close><svg class="demo__close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
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
        <svg class="voice-caption__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>
        <p class="voice-caption__text" aria-live="polite" data-voice-caption-text></p>
    </div>

    <dialog class="sos" id="sos-dialog" aria-labelledby="sos-title" data-sos>
        <div class="sos__container">
            <div class="sos__head">
                <div class="sos__heading">
                    <p class="sos__eyebrow" data-sos-eyebrow>Emergency</p>
                    <h2 class="sos__title" id="sos-title" tabindex="-1" data-sos-title>Help requested</h2>
                </div>
                <button class="sos__minimize" type="button" aria-label="Minimize: the alert stays open" data-sos-minimize><svg class="sos__minimize-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg></button>
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
const SHARED_SCRIPTS = ["crew-data.js", "records.js", "glucose.js", "health-info.js", "guides.js", "voice.js", "habitat.js", "crew-link.js", "emergency-engine.js", "reminders.js", "assistant.js"];

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
                            <svg class="tab-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[tab.key]}</svg>
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
 * (no layout shift). The phase follows App.getPhase(): Presentation mode preview, otherwise the mission dates.
 */
const THEME_INIT = '<script data-theme-init>(function(){var d=document.documentElement,g=function(k){try{return JSON.parse(localStorage.getItem("astro-health:"+k));}catch(e){return null;}},t=g("theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}d.setAttribute("data-theme",t);var s=g("session"),p=s&&/^(female|male|doctor)$/.test(s.profile)?s.profile:"",v=g("phase-preview"),m=s&&s.mission,h="in";d.setAttribute("data-session",p?"in":"out");if(p){d.setAttribute("data-profile",p);}if(v==="pre"||v==="in"||v==="post"){h=v;}else if(!g("mode-preview")&&m&&!isNaN(Date.parse(m.launchDate))){var n=new Date(),a=Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()),l=Date.parse(m.launchDate+"T00:00:00Z");h=a<l?"pre":a>=l+m.lengthDays*864e5?"post":"in";}d.setAttribute("data-phase",h);})();</script>';

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
    // and any dialog from a previous run, before writing the header (it holds the Demo button now) and the panel
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
