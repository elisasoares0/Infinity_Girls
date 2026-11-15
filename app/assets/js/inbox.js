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

    // Phosphor regular (assets/vendor/phosphor/regular), 256 × 256, drawn with currentColor
    var ICONS = {
        task: "<path d=\"M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z\"/>",
        medication: "<path d=\"M216.42,39.6a53.26,53.26,0,0,0-75.32,0L39.6,141.09a53.26,53.26,0,0,0,75.32,75.31h0L216.43,114.91A53.31,53.31,0,0,0,216.42,39.6ZM103.61,205.09h0a37.26,37.26,0,0,1-52.7-52.69L96,107.31,148.7,160ZM205.11,103.6,160,148.69,107.32,96l45.1-45.09a37.26,37.26,0,0,1,52.69,52.69ZM189.68,82.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,1,1-11.31-11.32l24-24A8,8,0,0,1,189.68,82.34Z\"/>",
        exam: "<path d=\"M168,152a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,152Zm-8-40H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm56-64V216a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V48A16,16,0,0,1,56,32H92.26a47.92,47.92,0,0,1,71.48,0H200A16,16,0,0,1,216,48ZM96,64h64a32,32,0,0,0-64,0ZM200,48H173.25A47.93,47.93,0,0,1,176,64v8a8,8,0,0,1-8,8H88a8,8,0,0,1-8-8V64a47.93,47.93,0,0,1,2.75-16H56V216H200Z\"/>",
        result: "<path d=\"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z\"/>",
        alert: "<path d=\"M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z\"/>",
        info: "<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z\"/>"
    };

    function icon(kind, className) {
        return "<svg class=\"" + className + "\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\">" + (ICONS[kind] || ICONS.info) + "</svg>";
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
            "<button class=\"icon-button inbox__minimize\" type=\"button\" aria-label=\"Minimize health messages\" data-inbox-minimize>" +
            "<svg class=\"icon-button__icon\" viewBox=\"0 0 256 256\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z\"/></svg>" +
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
