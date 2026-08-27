/* =====================================================
   SKYBOOK - USER REGISTRATION
   FRONTEND: LIVE SERVER
   BACKEND: NODE.JS ON PORT 3000
===================================================== */

const API_BASE_URL =
    "http://localhost:3000";


/* =====================================================
   GET FORM
===================================================== */

const registerForm =
    document.getElementById(
        "register-form"
    );


/* =====================================================
   SHOW / HIDE PASSWORD
===================================================== */

const passwordInput =
    document.getElementById(
        "password"
    );


const togglePassword =
    document.getElementById(
        "toggle-password"
    );


if (
    togglePassword &&
    passwordInput
) {

    togglePassword.addEventListener(
        "click",
        function () {

            if (
                passwordInput.type ===
                "password"
            ) {

                passwordInput.type =
                    "text";

                togglePassword.textContent =
                    "🙈";

            } else {

                passwordInput.type =
                    "password";

                togglePassword.textContent =
                    "👁";

            }

        }
    );

}


/* =====================================================
   CUSTOM ALERT
===================================================== */

function showAlert(
    title,
    message,
    icon = "⚠️"
) {

    const overlay =
        document.getElementById(
            "custom-alert"
        );


    const alertTitle =
        document.getElementById(
            "alert-title"
        );


    const alertMessage =
        document.getElementById(
            "alert-message"
        );


    const alertIcon =
        document.getElementById(
            "alert-icon"
        );


    const alertButton =
        document.getElementById(
            "alert-button"
        );


    /* =================================================
       FALLBACK
    ================================================= */

    if (
        !overlay ||
        !alertTitle ||
        !alertMessage
    ) {

        alert(
            `${title}\n\n${message}`
        );

        return;

    }


    alertTitle.textContent =
        title;


    alertMessage.textContent =
        message;


    if (alertIcon) {

        alertIcon.textContent =
            icon;

    }


    overlay.classList.add(
        "show"
    );


    if (alertButton) {

        alertButton.onclick =
            function () {

                overlay.classList.remove(
                    "show"
                );

            };

    }

}


/* =====================================================
   REGISTER
===================================================== */

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* =================================================
               GET VALUES
            ================================================= */

            const name =
                document
                    .getElementById(
                        "name"
                    )
                    .value
                    .trim();


            const email =
                document
                    .getElementById(
                        "email"
                    )
                    .value
                    .trim();


            const phoneInput =
                document.getElementById(
                    "phone"
                );


            const phone =
                phoneInput
                    ? phoneInput.value.trim()
                    : "";


            const password =
                document
                    .getElementById(
                        "password"
                    )
                    .value;


            /* =================================================
               NAME VALIDATION
            ================================================= */

            if (
                name === ""
            ) {

                showAlert(
                    "Name Required",
                    "Please enter your full name.",
                    "👤"
                );

                return;
            }


            /* =================================================
               EMAIL VALIDATION
            ================================================= */

            if (
                email === ""
            ) {

                showAlert(
                    "Email Required",
                    "Please enter your email address.",
                    "📧"
                );

                return;
            }


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    email
                )
            ) {

                showAlert(
                    "Invalid Email",
                    "Please enter a valid email address.",
                    "⚠️"
                );

                return;
            }


            /* =================================================
               PHONE VALIDATION
            ================================================= */

            if (
                phone !== ""
            ) {

                const phonePattern =
                    /^[0-9]{10}$/;


                if (
                    !phonePattern.test(
                        phone
                    )
                ) {

                    showAlert(
                        "Invalid Phone",
                        "Please enter a valid 10-digit phone number.",
                        "📱"
                    );

                    return;
                }

            }


            /* =================================================
               PASSWORD VALIDATION
            ================================================= */

            if (
                password === ""
            ) {

                showAlert(
                    "Password Required",
                    "Please enter a password.",
                    "🔒"
                );

                return;
            }


            if (
                password.length < 6
            ) {

                showAlert(
                    "Password Too Short",
                    "Password must contain at least 6 characters.",
                    "🔒"
                );

                return;
            }


            /* =================================================
               SEND TO NODE SERVER
            ================================================= */

            try {

                console.log(
                    "👤 Creating SkyBook account..."
                );


                const response =
                    await fetch(
                        `${API_BASE_URL}/api/register`,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    name:
                                        name,

                                    email:
                                        email,

                                    phone:
                                        phone,

                                    password:
                                        password

                                })

                        }
                    );


                /* =================================================
                   READ RESPONSE
                ================================================= */

                const data =
                    await response.json();


                console.log(
                    "Registration response:",
                    data
                );


                /* =================================================
                   SUCCESS
                ================================================= */

                if (
                    response.ok &&
                    data.success
                ) {

                    showAlert(
                        "Account Created",
                        "Your SkyBook account has been created successfully!",
                        "🎉"
                    );


                    /* =============================================
                       GO TO LOGIN
                    ============================================= */

                    setTimeout(
                        function () {

                            window.location.href =
                                "login.html";

                        },
                        1200
                    );


                    return;

                }


                /* =================================================
                   EMAIL ALREADY EXISTS
                ================================================= */

                if (
                    response.status ===
                    409
                ) {

                    showAlert(
                        "Account Already Exists",
                        data.message ||
                            "An account with this email already exists.",
                        "📧"
                    );

                    return;

                }


                /* =================================================
                   OTHER SERVER ERROR
                ================================================= */

                showAlert(
                    "Registration Failed",
                    data.message ||
                        "Unable to create your account.",
                    "❌"
                );

            }


            /* =================================================
               CONNECTION ERROR
            ================================================= */

            catch (
                error
            ) {

                console.error(
                    "❌ Registration error:",
                    error
                );


                showAlert(
                    "Server Error",
                    "Unable to connect to the SkyBook server. Please make sure server.js is running on port 3000.",
                    "⚠️"
                );

            }

        }
    );

} else {

    console.error(
        "❌ register-form was not found."
    );

}