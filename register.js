/* =====================================================
   SKYBOOK — CREATE ACCOUNT
===================================================== */

(function () {
    "use strict";

    const { api, session, setBusy, EMAIL_RE, PHONE_RE } = SkyBook;

    const $ = id => document.getElementById(id);

    function setError(id, message) {
        $(id).closest(".sb-field").classList.toggle("invalid", !!message);
        $(id).setAttribute("aria-invalid", message ? "true" : "false");
        $(id + "-error").textContent = message;
    }

    function validate() {
        const values = {
            name: $("name").value.trim().replace(/\s+/g, " "),
            email: $("email").value.trim(),
            phone: $("phone").value.trim(),
            password: $("password").value,
            confirm: $("confirm-password").value
        };

        const errors = {
            name: values.name.length >= 2 ? "" : "Please enter your full name.",
            email: EMAIL_RE.test(values.email) ? "" : "Please enter a valid email address.",
            phone: !values.phone || PHONE_RE.test(values.phone) ? "" : "Phone must be 10 digits.",
            password: values.password.length >= 6 ? "" : "Use at least 6 characters.",
            "confirm-password": values.confirm === values.password ? "" : "Passwords don't match."
        };

        let first = null;
        Object.entries(errors).forEach(([id, message]) => {
            setError(id, message);
            if (message && !first) first = id;
        });

        if (first) {
            $(first).focus();
            return null;
        }
        return values;
    }

    async function onSubmit(event) {
        event.preventDefault();

        const values = validate();
        if (!values) return;

        const button = $("register-button");
        setBusy(button, true, "Creating account…");

        try {
            await api("/api/register", {
                method: "POST",
                body: {
                    name: values.name,
                    email: values.email,
                    phone: values.phone,
                    password: values.password
                }
            });

            location.href = `login.html?registered=1&email=${encodeURIComponent(values.email)}`;
        } catch (error) {
            setBusy(button, false);

            if (error.status === 409) {
                setError("email", error.message);
                $("email").focus();
            } else {
                SkyBook.alert("Couldn't create account", error.message, "❌");
            }
        }
    }

    function init() {
        if (session.user) {
            location.replace("index.html");
            return;
        }

        SkyBook.bindPasswordToggle($("toggle-password"), $("password"));

        $("phone").addEventListener("input", e => {
            e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
        });

        // Clear an error as soon as the field is edited.
        $("register-form").addEventListener("input", e => {
            if (e.target.id) setError(e.target.id, "");
        });

        $("register-form").addEventListener("submit", onSubmit);
    }

    document.addEventListener("DOMContentLoaded", init);
})();
