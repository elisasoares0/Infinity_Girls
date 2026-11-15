/*
 * Health messages (App.inbox): a small chat that receives every temporary notification (task, medication and exam
 * reminders, reading results, and the doctor's new alerts), in place of toasts over the interface.
 * Emergencies are not here: SOS keeps its own dialog and the banner in the header.
 * A new message opens the chat on its own, without taking the focus (WCAG 3.2: no change of context); its words go to
 * a polite live region. Minimized, the chat is a round button above the tab bar with the number of new messages.
 * The fixed cards of each page stay as they are: the chat only replaces the temporary pop-ups.
 * Today's messages are kept per person ("inbox:<member>"), so they survive moving between pages.
 *   App.inbox.post({ id, kind, title, text, time, href, actions: [{ key, label }] }) → shows it (again, if it was
 *     snoozed or acted on and comes back)
 *   App.inbox.resolve(id, state, note)   state: "done" | "snoozed" | "seen"; note: shown under the message
 *   App.inbox.on(kind, fn(actionKey, message))   the source acts on its own messages (fn returns { state, note })
 *   App.inbox.items() · open() · minimize()
 */
(function () {
    "use strict";

    var App = window.App;
    var profile = App.getProfile();
    var member = profile.member;
    var signedIn = Boolean(App.getSavedProfileKey());
    var handlers = {};
    var root = null;
    var panel = null;
    var list = null;
    var toggle = null;
    var badge = null;
    var announcer = null;
    var collapseTimer = null;

    var KIND_LABELS = {
        task: "Reminder",
        medication: "Medication",
        exam: "Exam",
        result: "Result",
        alert: "Crew alert",
        info: "Update"
    };

    var ICONS = {
        task: "<path d=\"M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z\"/><path d=\"M10 20.5a2 2 0 0 0 4 0\"/>",
        medication: "<rect x=\"3\" y=\"9\" width=\"18\" height=\"7\" rx=\"3.5\" transform=\"rotate(-35 12 12.5)\"/><path d=\"M10 8.5l4 6\"/>",
        exam: "<rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\"/><path d=\"M9 4V2.5h6V4M9 10h6M9 14h4\"/>",
        result: "<path d=\"M4 12l5 5L20 6\"/>",
        alert: "<path d=\"M12 3l9.5 17h-19z\"/><path d=\"M12 10v4.5M12 17.5v.1\"/>",
        info: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7.5v.1\"/>"
    };

    function icon(kind, className) {
        return "<svg class=\"" + className + "\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">" + (ICONS[kind] || ICONS.info) + "</svg>";
    }

    /* ---------- Today's messages ---------- */
    function read() {
        var saved = App.store.get("inbox:" + member, null);
        return saved && saved.date === App.todayKey() && Array.isArray(saved.items)
            ? saved
            : { date: App.todayKey(), items: [], open: false, seen: [] };
    }

    function write(value) {
        App.store.set("inbox:" + member, value);
    }

    function find(value, id) {
        return value.items.filter(function (item) {
            return item.id === id;
        })[0] || null;
    }

    function pending(value) {
        return value.items.filter(function (item) {
            return item.state === "pending";
        });
    }

    // New or back again: at the end of the chat, pending, and the chat opens
    function post(message) {
        if (!signedIn || !message || !message.id) {
            return;
        }
        var value = read();
        var item = find(value, message.id);
        if (item && item.state === "pending") {
            return;
        }
        if (item) {
            value.items.splice(value.items.indexOf(item), 1);
        }
        value.items.push({
            id: message.id,
            kind: message.kind || "info",
            title: message.title,
            text: message.text || "",
            time: message.time || Date.now(),
            href: message.href || "",
            actions: message.actions || [],
            state: "pending",
            note: ""
        });
        value.open = true;
        write(value);
        render();
        openPanel(false);
        announce("New message. " + (KIND_LABELS[message.kind] || "Update") + ": " + message.title + ". " + (message.text || ""));
    }

    function resolve(id, state, note) {
        var value = read();
        var item = find(value, id);
        if (!item || (item.state === state && item.note === (note || ""))) {
            return;
        }
        item.state = state;
        item.note = note || "";
        write(value);
        render();
        // Nothing left to act on: the chat folds back into its button after a moment
        if (!pending(value).length) {
            window.clearTimeout(collapseTimer);
            collapseTimer = window.setTimeout(function () {
                if (!pending(read()).length && !panel.contains(document.activeElement)) {
                    minimize(false);
                }
            }, 2500);
        }
    }

    function act(item, key) {
        var handler = handlers[item.kind];
        var outcome = handler ? handler(key, item) : null;
        if (outcome && outcome.state) {
            resolve(item.id, outcome.state, outcome.note);
            announce(outcome.note || "");
        } else if (key === "seen") {
            resolve(item.id, "seen", "Seen at " + App.formatTime(new Date()) + ".");
        }
    }

    /* ---------- The chat ---------- */
    function build() {
        root = document.createElement("div");
        root.className = "inbox";
        root.innerHTML =
            "<section class=\"inbox__panel\" id=\"inbox-panel\" aria-labelledby=\"inbox-title\" data-essential hidden>" +
            "<div class=\"inbox__head\">" +
            "<div class=\"inbox__heading\">" +
            "<h2 class=\"inbox__title\" id=\"inbox-title\">Health messages</h2>" +
            "<p class=\"inbox__subtitle\">Reminders and updates for today, in UTC</p>" +
            "</div>" +
            "<button class=\"inbox__minimize\" type=\"button\" aria-label=\"Minimize health messages\" data-inbox-minimize>" +
            "<svg class=\"inbox__minimize-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M6 12h12\"/></svg>" +
            "</button>" +
            "</div>" +
            "<ol class=\"inbox__list\" data-inbox-list></ol>" +
            "</section>" +
            "<button class=\"inbox__toggle\" type=\"button\" aria-controls=\"inbox-panel\" aria-expanded=\"false\" data-inbox-toggle hidden>" +
            icon("task", "inbox__toggle-icon") +
            "<span class=\"inbox__count\" aria-hidden=\"true\" data-inbox-count hidden></span>" +
            "</button>" +
            "<p class=\"sr-only\" aria-live=\"polite\" data-inbox-announcer></p>";
        document.body.appendChild(root);
        panel = root.querySelector(".inbox__panel");
        list = root.querySelector("[data-inbox-list]");
        toggle = root.querySelector("[data-inbox-toggle]");
        badge = root.querySelector("[data-inbox-count]");
        announcer = root.querySelector("[data-inbox-announcer]");

        toggle.addEventListener("click", function () {
            if (panel.hidden) {
                openPanel(true);
            } else {
                minimize(true);
            }
        });
        root.querySelector("[data-inbox-minimize]").addEventListener("click", function () {
            minimize(true);
        });
        panel.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                event.stopPropagation();
                minimize(true);
            }
        });
        list.addEventListener("click", function (event) {
            var button = event.target.closest("[data-inbox-action]");
            if (!button) {
                return;
            }
            var item = find(read(), button.closest("[data-inbox-id]").getAttribute("data-inbox-id"));
            if (item) {
                act(item, button.getAttribute("data-inbox-action"));
            }
        });
    }

    function announce(text) {
        if (!announcer || !text) {
            return;
        }
        announcer.textContent = "";
        window.setTimeout(function () {
            announcer.textContent = text;
        }, 50);
    }

    // Above the tab bar (a bar on phones, a floating pill on large screens), like the voice caption
    function place() {
        var tabBar = document.querySelector(".tab-bar");
        var rect = tabBar && !tabBar.hidden ? tabBar.getBoundingClientRect() : null;
        var bottom = rect && rect.height ? Math.max(0, window.innerHeight - rect.top) : 0;
        root.style.setProperty("--inbox-bottom", Math.round(bottom) + "px");
    }

    function stateText(item) {
        return item.note || "";
    }

    function render() {
        if (!root) {
            return;
        }
        var value = read();
        var waiting = pending(value).length;
        list.innerHTML = "";
        value.items.forEach(function (item) {
            var li = document.createElement("li");
            li.className = "inbox__message inbox__message--" + item.kind + (item.state === "pending" ? "" : " inbox__message--closed");
            li.setAttribute("data-inbox-id", item.id);
            li.innerHTML =
                "<span class=\"inbox__avatar\">" + icon(item.kind, "inbox__avatar-icon") + "</span>" +
                "<div class=\"inbox__bubble\">" +
                "<p class=\"inbox__meta\"></p>" +
                "<p class=\"inbox__message-title\"></p>" +
                "<p class=\"inbox__text\"></p>" +
                "<p class=\"inbox__state\"></p>" +
                "<div class=\"inbox__actions\"></div>" +
                "</div>";
            li.querySelector(".inbox__meta").textContent = (KIND_LABELS[item.kind] || "Update") + " · " + App.formatTime(new Date(item.time));
            li.querySelector(".inbox__message-title").textContent = item.title;
            li.querySelector(".inbox__text").textContent = item.text;
            li.querySelector(".inbox__text").hidden = !item.text;
            var state = li.querySelector(".inbox__state");
            state.textContent = stateText(item);
            state.hidden = !state.textContent;
            var actions = li.querySelector(".inbox__actions");
            if (item.state === "pending") {
                item.actions.forEach(function (action, index) {
                    var button = document.createElement("button");
                    button.type = "button";
                    button.className = "button " + (index === 0 ? "button--primary" : "button--secondary") + " inbox__action";
                    button.setAttribute("data-inbox-action", action.key);
                    button.innerHTML = "<span class=\"button__text\"></span>";
                    button.querySelector(".button__text").textContent = action.label;
                    // The name starts with the visible label (WCAG 2.5.3) and says which message it acts on
                    button.setAttribute("aria-label", action.label + ": " + item.title);
                    actions.appendChild(button);
                });
            }
            if (item.href) {
                var link = document.createElement("a");
                link.className = "inbox__open";
                link.href = item.href;
                link.textContent = "Open";
                link.setAttribute("aria-label", "Open: " + item.title);
                actions.appendChild(link);
            }
            actions.hidden = !actions.children.length;
            list.appendChild(li);
        });
        toggle.hidden = !value.items.length;
        badge.hidden = !waiting;
        badge.textContent = String(waiting);
        toggle.setAttribute("aria-label", "Health messages" + (waiting ? ", " + waiting + " new" : ""));
        toggle.setAttribute("title", "Health messages");
        place();
    }

    // focus: true when the person asked (button); a new message opens it without moving the focus
    function openPanel(focus) {
        if (!root) {
            return;
        }
        window.clearTimeout(collapseTimer);
        place();
        panel.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        root.classList.add("inbox--open");
        var value = read();
        value.open = true;
        write(value);
        list.scrollTop = list.scrollHeight;
        if (focus) {
            var first = list.querySelector(".inbox__message:not(.inbox__message--closed) .inbox__action") || root.querySelector("[data-inbox-minimize]");
            first.focus();
        }
    }

    function minimize(focus) {
        if (!root || panel.hidden) {
            return;
        }
        var hadFocus = panel.contains(document.activeElement);
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        root.classList.remove("inbox--open");
        var value = read();
        value.open = false;
        write(value);
        if ((focus || hadFocus) && !toggle.hidden) {
            toggle.focus();
        }
    }

    App.inbox = {
        post: post,
        resolve: resolve,
        on: function (kind, fn) {
            handlers[kind] = fn;
        },
        items: function () {
            return read().items;
        },
        open: function () {
            openPanel(true);
        },
        minimize: function () {
            minimize(false);
        },
        icon: icon,
        // The doctor's seen alerts (so only new ones post a message)
        seen: function () {
            return read().seen || [];
        },
        markSeen: function (ids) {
            var value = read();
            value.seen = (value.seen || []).concat(ids.filter(function (id) {
                return (value.seen || []).indexOf(id) === -1;
            }));
            write(value);
        }
    };

    if (!signedIn) {
        return;
    }
    build();
    render();
    // Open on this page too when it was open on the last one and something still waits
    var start = read();
    if (start.open && pending(start).length) {
        openPanel(false);
    }
    window.addEventListener("resize", function () {
        if (!panel.hidden) {
            place();
        }
    }, { passive: true });
    window.addEventListener("load", place);
})();
