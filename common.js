/* =====================================================
   SKYBOOK — SHARED FRONT-END HELPERS
   Loaded on every page before the page's own script.

   window.SkyBook gives each page:
     api()            fetch wrapper (adds login token, handles errors)
     session          the logged-in user + token
     alert/confirm    nice dialogs instead of alert()/confirm()
     toast()          small pop-up message
     format helpers   money, times, dates
     requireAdmin()   sends non-admins to the login page
===================================================== */

(function () {
    "use strict";

    /* -------------------------------------------------
       API ADDRESS
       If the page is served by the Node server (port 3000)
       use the same origin. If it's opened with Live Server
       or straight from disk, talk to localhost:3000.
    ------------------------------------------------- */

    const API_BASE =
        location.protocol.startsWith("http") && location.port === "3000"
            ? ""
            : "http://localhost:3000";

    const TOKEN_KEY = "skybookToken";
    const USER_KEY = "skybookUser";


    /* -------------------------------------------------
       SESSION
    ------------------------------------------------- */

    function readJSON(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch {
            return null;
        }
    }

    const session = {
        get token() {
            return localStorage.getItem(TOKEN_KEY);
        },
        get user() {
            return this.token ? readJSON(USER_KEY) : null;
        },
        isAdmin() {
            return this.user?.role === "admin";
        },
        save(token, user) {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        },
        clear() {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    };


    /* -------------------------------------------------
       API
    ------------------------------------------------- */

    async function api(path, { method = "GET", body, query } = {}) {
        let url = API_BASE + path;

        if (query) {
            const params = new URLSearchParams();
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") {
                    params.set(key, value);
                }
            });
            const qs = params.toString();
            if (qs) url += "?" + qs;
        }

        const headers = {};
        if (body !== undefined) headers["Content-Type"] = "application/json";
        if (session.token) headers.Authorization = "Bearer " + session.token;

        let response;
        try {
            response = await fetch(url, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined
            });
        } catch {
            const error = new Error(
                "Can't reach the SkyBook server. Make sure it is running (npm start)."
            );
            error.status = 0;
            throw error;
        }

        let data = {};
        try {
            data = await response.json();
        } catch {
            /* empty or non-JSON response */
        }

        // Token expired or invalid → log out quietly.
        if (response.status === 401 && session.token) {
            session.clear();
            renderNav();
        }

        if (!response.ok || data.success === false) {
            const error = new Error(data.message || `Request failed (${response.status}).`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }


    /* -------------------------------------------------
       FORMATTING
    ------------------------------------------------- */

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatMoney(amount) {
        const n = Number(amount);
        if (!Number.isFinite(n)) return "₹0";
        return "₹" + n.toLocaleString("en-IN", {
            minimumFractionDigits: n % 1 ? 2 : 0,
            maximumFractionDigits: 2
        });
    }

    function formatTime(time) {
        return time ? String(time).slice(0, 5) : "--:--";
    }

    /** True when the arrival time is earlier than departure (lands next day). */
    function arrivesNextDay(departure, arrival) {
        return !!departure && !!arrival &&
            String(arrival).slice(0, 5) <= String(departure).slice(0, 5);
    }

    /** "2026-10-25" → "Sun, 25 Oct 2026" */
    function formatDate(dateString, options) {
        if (!dateString) return "--";
        const d = new Date(String(dateString).slice(0, 10) + "T00:00:00");
        if (Number.isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString("en-IN", options || {
            weekday: "short", day: "numeric", month: "short", year: "numeric"
        });
    }

    /** "2026-08-26 20:41:14" → "26 Aug 2026, 8:41 pm" */
    function formatDateTime(value) {
        if (!value) return "--";
        const d = new Date(String(value).replace(" ", "T"));
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "numeric", minute: "2-digit"
        });
    }

    /** Today's date in the browser's time zone as YYYY-MM-DD. */
    function today() {
        const now = new Date();
        return new Date(now - now.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 10);
    }

    function addDays(dateString, days) {
        const d = new Date(dateString + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    }

    function plural(count, word, pluralWord) {
        return `${count} ${count === 1 ? word : (pluralWord || word + "s")}`;
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_RE = /^[0-9]{10}$/;


    /* -------------------------------------------------
       DIALOGS (alert / confirm) and TOASTS
    ------------------------------------------------- */

    let dialogEl = null;

    function ensureDialog() {
        if (dialogEl) return dialogEl;

        dialogEl = document.createElement("div");
        dialogEl.className = "sb-dialog-overlay";
        dialogEl.setAttribute("role", "dialog");
        dialogEl.setAttribute("aria-modal", "true");
        dialogEl.innerHTML = `
            <div class="sb-dialog">
                <div class="sb-dialog-icon"></div>
                <h2 class="sb-dialog-title" id="sb-dialog-title"></h2>
                <p class="sb-dialog-message"></p>
                <div class="sb-dialog-actions"></div>
            </div>`;
        dialogEl.setAttribute("aria-labelledby", "sb-dialog-title");
        document.body.appendChild(dialogEl);
        return dialogEl;
    }

    function dialog({ title, message, icon = "ℹ️", buttons }) {
        const el = ensureDialog();
        const lastFocus = document.activeElement;

        el.querySelector(".sb-dialog-icon").textContent = icon;
        el.querySelector(".sb-dialog-title").textContent = title;
        el.querySelector(".sb-dialog-message").textContent = message || "";

        const actions = el.querySelector(".sb-dialog-actions");
        actions.innerHTML = "";

        return new Promise(resolve => {
            function close(value) {
                el.classList.remove("show");
                document.removeEventListener("keydown", onKey);
                if (lastFocus && lastFocus.focus) lastFocus.focus();
                resolve(value);
            }

            function onKey(event) {
                if (event.key === "Escape") close(false);
            }

            buttons.forEach(button => {
                const b = document.createElement("button");
                b.type = "button";
                b.textContent = button.label;
                b.className = "sb-btn " + (
                    button.danger ? "sb-btn-danger"
                        : button.primary ? "sb-btn-primary"
                            : "sb-btn-secondary"
                );
                b.addEventListener("click", () => close(button.value));
                actions.appendChild(b);
            });

            document.addEventListener("keydown", onKey);
            el.classList.add("show");
            actions.lastElementChild.focus();
        });
    }

    function showAlert(title, message, icon = "⚠️") {
        return dialog({
            title, message, icon,
            buttons: [{ label: "OK", primary: true, value: true }]
        });
    }

    function confirmDialog(title, message, {
        confirmLabel = "Confirm",
        cancelLabel = "Go back",
        icon = "❓",
        danger = false
    } = {}) {
        return dialog({
            title, message, icon,
            buttons: [
                { label: cancelLabel, value: false },
                { label: confirmLabel, value: true, primary: true, danger }
            ]
        });
    }

    let toastBox = null;

    function toast(message, type = "info") {
        if (!toastBox) {
            toastBox = document.createElement("div");
            toastBox.className = "sb-toasts";
            toastBox.setAttribute("aria-live", "polite");
            document.body.appendChild(toastBox);
        }

        const item = document.createElement("div");
        item.className = `sb-toast sb-toast-${type}`;
        item.textContent = message;
        toastBox.appendChild(item);

        setTimeout(() => item.classList.add("hide"), 3200);
        setTimeout(() => item.remove(), 3600);
    }


    /* -------------------------------------------------
       BUTTON LOADING STATE
    ------------------------------------------------- */

    function setBusy(button, busy, busyText = "Please wait…") {
        if (!button) return;
        if (busy) {
            button.dataset.label = button.innerHTML;
            button.textContent = busyText;
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
        } else {
            if (button.dataset.label) button.innerHTML = button.dataset.label;
            button.disabled = false;
            button.removeAttribute("aria-busy");
        }
    }


    /* -------------------------------------------------
       NAVIGATION BAR
       Any element with [data-nav-links] gets Login, or the
       user's name + Logout (and an Admin link for admins).
    ------------------------------------------------- */

    function logout() {
        session.clear();
        location.href = "login.html";
    }

    function renderNav() {
        const nav = document.querySelector("[data-nav-links]");
        if (!nav) return;

        nav.querySelectorAll("[data-auth]").forEach(el => el.remove());

        const user = session.user;
        const page = location.pathname.split("/").pop() || "index.html";

        if (!user) {
            nav.insertAdjacentHTML(
                "beforeend",
                `<a data-auth href="login.html">Login</a>`
            );
        } else {
            if (user.role === "admin" && !nav.querySelector('a[href="admin-dashboard.html"]')) {
                nav.insertAdjacentHTML(
                    "beforeend",
                    `<a data-auth href="admin-dashboard.html">Admin</a>`
                );
            }
            nav.insertAdjacentHTML(
                "beforeend",
                `<span data-auth class="sb-nav-user" title="${escapeHTML(user.email)}">👤 ${escapeHTML(user.name.split(" ")[0])}</span>
                 <button data-auth type="button" class="sb-nav-logout">Logout</button>`
            );
            nav.querySelector(".sb-nav-logout").addEventListener("click", logout);
        }

        nav.querySelectorAll("a").forEach(link => {
            const isCurrent = link.getAttribute("href") === page;
            link.classList.toggle("active", isCurrent);
            if (isCurrent) link.setAttribute("aria-current", "page");
        });
    }

    /** Admin pages call this first. Returns false (and redirects) if not an admin. */
    function requireAdmin() {
        if (session.isAdmin()) return true;
        const next = encodeURIComponent(location.pathname.split("/").pop());
        location.replace(`login.html?next=${next}`);
        return false;
    }

    /** Wires an eye button that shows/hides a password input. */
    function bindPasswordToggle(button, input) {
        if (!button || !input) return;
        button.addEventListener("click", () => {
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            button.textContent = show ? "🙈" : "👁";
            button.setAttribute("aria-label", show ? "Hide password" : "Show password");
        });
    }

    document.addEventListener("DOMContentLoaded", renderNav);


    /* -------------------------------------------------
       PUBLIC
    ------------------------------------------------- */

    window.SkyBook = {
        API_BASE,
        api,
        session,
        logout,
        renderNav,
        requireAdmin,
        alert: showAlert,
        confirm: confirmDialog,
        toast,
        setBusy,
        bindPasswordToggle,
        escapeHTML,
        formatMoney,
        formatTime,
        formatDate,
        formatDateTime,
        arrivesNextDay,
        today,
        addDays,
        plural,
        EMAIL_RE,
        PHONE_RE
    };
})();
