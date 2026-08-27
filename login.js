/* =====================================================
   SKYBOOK LOGIN
===================================================== */

const loginForm = document.getElementById("login-form");

const passwordInput =
    document.getElementById("password");

const togglePassword =
    document.getElementById("toggle-password");


/* =====================================================
   SHOW / HIDE PASSWORD
===================================================== */

togglePassword.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePassword.textContent = "🙈";

    } else {

        passwordInput.type = "password";

        togglePassword.textContent = "👁";

    }

});


/* =====================================================
   CUSTOM ALERT
===================================================== */

function showAlert(title, message, icon = "⚠️") {

    const overlay =
        document.getElementById("custom-alert");

    const alertTitle =
        document.getElementById("alert-title");

    const alertMessage =
        document.getElementById("alert-message");

    const alertIcon =
        document.getElementById("alert-icon");

    const alertButton =
        document.getElementById("alert-button");


    alertTitle.textContent = title;

    alertMessage.textContent = message;

    alertIcon.textContent = icon;

    overlay.classList.add("show");


    alertButton.onclick = function () {

        overlay.classList.remove("show");

    };

}


/* =====================================================
   LOGIN
===================================================== */

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    const email =
        document
            .getElementById("email")
            .value
            .trim();

    const password =
        passwordInput.value;


    /* =========================
       VALIDATION
    ========================== */

    if (email === "") {

        showAlert(
            "Email Required",
            "Please enter your email address.",
            "📧"
        );

        return;
    }


    if (password === "") {

        showAlert(
            "Password Required",
            "Please enter your password.",
            "🔒"
        );

        return;
    }


    /* =========================
       EMAIL VALIDATION
    ========================== */

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailPattern.test(email)) {

        showAlert(
            "Invalid Email",
            "Please enter a valid email address.",
            "⚠️"
        );

        return;
    }


    /* =========================
       SEND TO SERVER
    ========================== */

    try {

        const response =
            await fetch(
                "http://localhost:3000/api/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );


        const data =
            await response.json();


        /* =========================
           LOGIN SUCCESS
        ========================== */

        if (response.ok && data.success) {

            /*
             * Save logged-in user information
             * so My Bookings can use it later.
             */

            localStorage.setItem(
                "skybookUser",
                JSON.stringify(data.user)
            );


            showAlert(
                "Login Successful",
                "Welcome back, " +
                data.user.Name +
                "!",
                "🎉"
            );


            /*
             * Wait briefly so the user
             * can see the success message.
             */

            setTimeout(function () {

    if (data.user.role === "admin") {

        window.location.href =
            "admin-dashboard.html";

    } else {

        window.location.href =
            "index.html";

    }

}, 1200);


        } else {

            showAlert(
                "Login Failed",
                data.message ||
                "Incorrect email or password.",
                "❌"
            );

        }


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        showAlert(
            "Server Error",
            "Unable to connect to SkyBook server.",
            "⚠️"
        );

    }

});