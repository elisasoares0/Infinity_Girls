/*
 * AstroHealth API client (App.api): the bridge to the Python back end (api/ folder, FastAPI on top of Supabase).
 *
 * - Base address: the Render deploy. To use a local API while developing, run in the browser console:
 *     localStorage.setItem("astro-health:api-base", JSON.stringify("http://localhost:8000"))
 *   and remove it to go back to the deploy.
 * - Tokens from /auth/login and /auth/cadastro are kept in the store ("api-auth") and sent as Bearer.
 *   An expired access token is renewed once with the refresh token before giving up.
 * - Errors always reject with { status, message, fields, offline }:
 *     offline: true  → the API could not be reached (no network, or the server is waking up and timed out);
 *     fields         → { fieldName: message }, same field names as the sign-in and sign-up forms.
 *
 * The free Render plan puts the API to sleep after 15 idle minutes; the first request after that can take
 * close to a minute, so requests wait up to 60 s.
 */
(function () {
    "use strict";

    var App = window.App;
    var store = App.store;
    var DEFAULT_BASE = "https://astrohealth-api.onrender.com";
    var TIMEOUT_MS = 60000;
    var AUTH_KEY = "api-auth";

    function base() {
        var custom = store.get("api-base", null);
        return String(typeof custom === "string" && custom ? custom : DEFAULT_BASE).replace(/\/+$/, "");
    }

    /* ---------- Tokens ---------- */

    function getAuth() {
        var auth = store.get(AUTH_KEY, null);
        return auth && auth.accessToken ? auth : null;
    }

    function saveAuth(data) {
        if (!data || !data.access_token) {
            return;
        }
        store.set(AUTH_KEY, {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || null,
            expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000
        });
    }

    function clearAuth() {
        store.remove(AUTH_KEY);
    }

    /* ---------- Requests ---------- */

    function problem(status, message, fields, offline) {
        return { status: status, message: message, fields: fields || null, offline: Boolean(offline) };
    }

    function send(path, options, token) {
        var headers = { Accept: "application/json" };
        var body = options.body;
        if (body !== undefined && !(body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(body);
        }
        if (token) {
            headers.Authorization = "Bearer " + token;
        }
        var controller = window.AbortController ? new AbortController() : null;
        var timer = controller ? setTimeout(function () {
            controller.abort();
        }, TIMEOUT_MS) : null;

        return fetch(base() + path, {
            method: options.method || "GET",
            headers: headers,
            body: body,
            signal: controller ? controller.signal : undefined
        }).then(function (response) {
            clearTimeout(timer);
            if (response.status === 204) {
                return { ok: true, status: 204, data: null };
            }
            return response.json().catch(function () {
                return null;
            }).then(function (data) {
                return { ok: response.ok, status: response.status, data: data };
            });
        }, function () {
            clearTimeout(timer);
            throw problem(0, "The health server could not be reached. Check the connection and try again.", null, true);
        });
    }

    function renew() {
        var auth = getAuth();
        if (!auth || !auth.refreshToken) {
            return Promise.reject(problem(401, "Your session has expired. Sign in again."));
        }
        return send("/auth/renovar", { method: "POST", body: { refresh_token: auth.refreshToken } }).then(function (result) {
            if (!result.ok) {
                clearAuth();
                throw problem(401, "Your session has expired. Sign in again.");
            }
            saveAuth(result.data);
            return getAuth().accessToken;
        });
    }

    /*
     * request("/sinais-vitais", { method: "POST", body: {...}, auth: true }) → resolves with the JSON body.
     * auth: send the saved token (default true). A 401 renews the token once and repeats the request.
     */
    function request(path, options) {
        options = options || {};
        var useAuth = options.auth !== false;
        var auth = useAuth ? getAuth() : null;
        if (useAuth && !auth) {
            return Promise.reject(problem(401, "Sign in to continue."));
        }
        var ready = auth && auth.expiresAt - Date.now() < 30000 ? renew() : Promise.resolve(auth && auth.accessToken);

        return ready.then(function (token) {
            return send(path, options, token).then(function (result) {
                if (result.status === 401 && useAuth && !options.retried) {
                    return renew().then(function (fresh) {
                        return send(path, options, fresh);
                    });
                }
                return result;
            });
        }).then(function (result) {
            if (result.ok) {
                return result.data;
            }
            var detail = result.data && result.data.detail;
            var message = detail && typeof detail === "object" && detail.message ? detail.message
                : typeof detail === "string" ? detail
                : "The health server did not answer as expected. Try again in a moment.";
            throw problem(result.status, message, detail && detail.fields);
        });
    }

    /* ---------- Auth ---------- */

    function signIn(idNumber, password) {
        return request("/auth/login", { method: "POST", auth: false, body: { idNumber: idNumber, password: password } })
            .then(function (data) {
                saveAuth(data);
                return data.user;
            });
    }

    // data: { idNumber, name, password, birthDate, sex, bloodType }
    function register(data) {
        return request("/auth/cadastro", { method: "POST", auth: false, body: data }).then(function (result) {
            if (result && result.access_token) {
                saveAuth(result);
                return result.user;
            }
            // Email confirmation is on in Supabase: the account exists, but there is no session yet
            return signIn(data.idNumber, data.password);
        });
    }

    function signOut() {
        var auth = getAuth();
        clearAuth();
        if (auth) {
            // Best effort: the local sign-out never waits for the server
            send("/auth/sair", { method: "POST" }, auth.accessToken).catch(function () {});
        }
    }

    // Wakes the server up in the background (free plan sleeps after 15 idle minutes)
    function wake() {
        return send("/saude", {}, null).then(function (result) {
            return result.ok;
        }, function () {
            return false;
        });
    }

    // Signing out of the app also forgets the API tokens
    var appSignOut = App.signOut;
    App.signOut = function () {
        signOut();
        return appSignOut.apply(App, arguments);
    };

    App.api = {
        base: base,
        request: request,
        signIn: signIn,
        register: register,
        signOut: signOut,
        wake: wake,
        isSignedIn: function () {
            return Boolean(getAuth());
        }
    };
})();
