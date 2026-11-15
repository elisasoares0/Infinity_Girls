// Design system rules that hold on every page: one component for each job (sheet, icon button, list, segmented),
// Phosphor icons only, and the brand color rules (pesquisas/brand.pdf)
const fs = require("fs");
const path = require("path");
const { test, expect } = require("./fixtures");

const ROOT = path.join(__dirname, "..");
const PAGES = ["index.html"].concat(fs.readdirSync(path.join(ROOT, "pages")).map(function (name) {
    return "pages/" + name + "/index.html";
}).filter(function (file) {
    return fs.existsSync(path.join(ROOT, file));
}));
const SCRIPTS = fs.readdirSync(path.join(ROOT, "assets/js")).map(function (name) {
    return "assets/js/" + name;
}).concat(fs.readdirSync(path.join(ROOT, "pages")).reduce(function (list, name) {
    const dir = path.join(ROOT, "pages", name);
    return list.concat(fs.readdirSync(dir).filter(function (file) {
        return file.endsWith(".js");
    }).map(function (file) {
        return "pages/" + name + "/" + file;
    }));
}, []));
const STYLES = ["assets/css/base.css"].concat(fs.readdirSync(path.join(ROOT, "pages")).map(function (name) {
    return "pages/" + name + "/" + name + ".css";
}).filter(function (file) {
    return fs.existsSync(path.join(ROOT, file));
}));

function read(file) {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
}

test("every dialog except the SOS is a .sheet", function () {
    PAGES.concat(SCRIPTS).forEach(function (file) {
        const text = read(file);
        (text.match(/<dialog class="[^"]*"/g) || []).forEach(function (tag) {
            if (tag.indexOf("\"sos\"") === -1) {
                expect(tag, file).toMatch(/class="sheet[ "]/);
            }
        });
        (text.match(/dialog\.className = "[^"]*"/g) || []).forEach(function (line) {
            expect(line, file).toMatch(/"sheet[ "]/);
        });
    });
});

test("close and minimize buttons are .icon-button", function () {
    PAGES.concat(SCRIPTS).forEach(function (file) {
        const text = read(file).replace(/\\"/g, "\"");
        (text.match(/<button class="[^"]*__(close|minimize)[^"]*"/g) || []).forEach(function (tag) {
            expect(tag, file).toContain("icon-button");
        });
    });
});

test("icons are Phosphor (256 × 256): no 24px stroke icons, except the drawn mood faces", function () {
    PAGES.concat(SCRIPTS).forEach(function (file) {
        const text = read(file).replace(/\\"/g, "\"");
        (text.match(/<svg[^>]*viewBox="0 0 24 24"[^>]*>/g) || []).forEach(function (tag) {
            expect(tag, file).toContain("checkin__face");
        });
    });
});

test("page styles never redraw a card surface or a dialog: they use .card and .sheet", function () {
    STYLES.forEach(function (file) {
        const css = read(file);
        // the exact surface of .card, copied into another block
        const copies = css.match(/\{[^}]*background-color: var\(--color-surface\);[^}]*box-shadow: var\(--shadow-card\);[^}]*\}/g) || [];
        // base.css owns the components; the design system page draws its own samples (ds__)
        const allowed = copies.filter(function (block) {
            return file === "assets/css/base.css" || file === "pages/design-system/design-system.css";
        });
        expect(copies.length - allowed.length, file).toBe(0);
        // only the sheet (and the SOS, a centered alert) draw a backdrop
        expect(css, file).not.toMatch(/\n\.(?!sheet::|sos::)[a-z-]+::backdrop/);
    });
});

test("brand: Rocket Red and Neon Yellow are never the background of text", function () {
    STYLES.forEach(function (file) {
        const css = read(file);
        const rules = css.match(/[^{}]+\{[^}]*\}/g) || [];
        rules.forEach(function (rule) {
            const selector = rule.slice(0, rule.indexOf("{")).trim();
            // swatches on the design system page and chart legends are graphics, not text backgrounds
            if (/ds__chip|swatch|legend/.test(selector)) {
                return;
            }
            expect(rule, file + " " + selector).not.toMatch(/background(-color)?:\s*var\(--(rocket-red|neon-yellow)\)/);
        });
    });
});

// tools/chrome.js once left a stray \r behind at every run (shown as dozens of empty lines in the editor)
test("source files have one line ending, no stray carriage returns and no runs of empty lines", function () {
    PAGES.concat(SCRIPTS, STYLES, ["tools/chrome.js", "tools/build.js", "tools/motion.js", "tools/vendor.js", "sw.js"]).forEach(function (file) {
        const text = read(file);
        expect(/\r\r/.test(text), file + ": stray \\r").toBe(false);
        const crlf = (text.match(/\r\n/g) || []).length;
        const lines = (text.match(/\n/g) || []).length;
        expect(crlf === 0 || crlf === lines, file + ": mixed line endings").toBe(true);
        expect(/\n(?:[ \t]*\r?\n){3,}/.test(text), file + ": 3 or more empty lines in a row").toBe(false);
    });
});

test("spacing comes from tokens: no raw px gap or padding in the component styles", function () {
    STYLES.forEach(function (file) {
        const css = read(file);
        const raw = css.match(/\n\s*(gap|padding[a-z-]*):[^;]*\b[1-9]\d*px[^;]*;/g) || [];
        expect(raw.filter(function (decl) {
            return decl.indexOf("var(--") === -1;
        }), file).toEqual([]);
    });
});
