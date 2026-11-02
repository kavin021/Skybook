/* =====================================================
   SKYBOOK — LOGIN
===================================================== */

(function () {
    "use strict";

    const { api, session, setBusy, EMAIL_RE } = SkyBook;

    const $ = id => document.getElementById(id);

    /** Only allow redirects to our own pages (e.g. ?next=admin-seats.html). */
    function nextPage(role) {
        const next = new URLSearchParams(location.search).get("next") || "";
        const safe = /^[a-z0-9-]+\.html$/i.test(next) ? next : "";

        if (role === "admin") {
            return safe.startsWith("admin-") ? safe : "admin-dashboard.html";
        }
        return safe && !safe.startsWith("admin-") ? safe : "index.html";
    }

    async function onSubmit(event) {
        event.preventDefault();

        const email = $("email").value.trim();
        const password = $("password").value;

        if (!EMAIL_RE.test(email)) {
            return SkyBook.alert("Check your email", "Please enter a valid email address.", "📧");
        }
        if (!password) {
            return SkyBook.alert("Password required", "Please enter your password.", "🔒");
        }

        const button = $("login-button");
        setBusy(button, true, "Logging in…");

        try {
            const { token, user } = await api("/api/login", {
                method: "POST",
                body: { email, password }
            });

            session.save(token, user);
            location.href = nextPage(user.role);
        } catch (error) {
            setBusy(button, false);
            $("password").value = "";
            $("password").focus();
            SkyBook.alert("Login failed", error.message, "❌");
        }
    }

    function init() {
        const params = new URLSearchParams(location.search);
        const wantsAdmin = (params.get("next") || "").startsWith("admin-");
        const user = session.user;

        // Already logged in with the right kind of account? Go straight on.
        if (user && (!wantsAdmin || user.role === "admin")) {
            location.replace(nextPage(user.role));
            return;
        }

        if (params.get("email")) $("email").value = params.get("email");
        if (params.get("registered")) {
            SkyBook.toast("Account created — please log in.", "success");
            $("password").focus();
        }
        if (wantsAdmin) {
            document.querySelector(".auth-subtitle").textContent = user
                ? `You're signed in as ${user.email}, which isn't an administrator. Log in with an admin account to continue.`
                : "Please log in with an administrator account.";
        }

        SkyBook.bindPasswordToggle($("toggle-password"), $("password"));
        $("login-form").addEventListener("submit", onSubmit);
    }

    document.addEventListener("DOMContentLoaded", init);
})();
