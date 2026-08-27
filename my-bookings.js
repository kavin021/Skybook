/* =====================================================
   SKYBOOK - MY BOOKINGS
   N-PASSENGER / N-TICKET VERSION
   FRONTEND: LIVE SERVER
   BACKEND: NODE.JS ON PORT 3000
===================================================== */


/* =====================================================
   FIND BOOKING
===================================================== */

async function findBooking() {

    const bookingInput =
        document.getElementById("booking-id");

    const resultBox =
        document.getElementById("booking-result");


    if (!bookingInput || !resultBox) {

        console.error(
            "❌ My Bookings elements not found."
        );

        return;
    }


    const bookingID =
        bookingInput.value.trim();


    /* =================================================
       VALIDATION
    ================================================= */

    if (bookingID === "") {

        alert(
            "Please enter a Booking ID."
        );

        return;
    }


    if (!/^\d+$/.test(bookingID)) {

        alert(
            "Please enter a valid Booking ID."
        );

        return;
    }


    /* =================================================
       SHOW RESULT AREA
    ================================================= */

    resultBox.style.display =
        "block";


    resultBox.innerHTML = `

        <div class="error-message">

            <h2>
                🔎 Searching...
            </h2>

            <p>
                Retrieving your booking...
            </p>

        </div>

    `;


    /* =================================================
       CALL BACKEND
    ================================================= */

    try {

        const response =
            await fetch(
                `http://localhost:3000/api/bookings/${encodeURIComponent(bookingID)}`
            );


        const data =
            await response.json();


        console.log(
            "📦 My Bookings API response:",
            data
        );


        /* =================================================
           ERROR RESPONSE
        ================================================= */

        if (!response.ok) {

            resultBox.innerHTML = `

                <div class="error-message">

                    <h2>
                        ❌ Booking Not Found
                    </h2>

                    <p>
                        ${escapeHTML(
                            data.message ||
                            "No booking was found."
                        )}
                    </p>

                </div>

            `;

            return;
        }


        /* =================================================
           GET BOOKING
        ================================================= */

        const booking =
            data.booking;


        if (
            !booking ||
            typeof booking !== "object"
        ) {

            throw new Error(
                "Booking data missing from server response."
            );
        }


        console.log(
            "🎫 Booking:",
            booking
        );


        /* =================================================
           NORMALIZE ARRAYS
        ================================================= */

        const passengers =
            Array.isArray(
                booking.passengers
            )
                ? booking.passengers
                : [];


        const tickets =
            Array.isArray(
                booking.tickets
            )
                ? booking.tickets
                : [];


        /* =================================================
           DISPLAY BOOKING
        ================================================= */

        displayBooking(
            booking,
            passengers,
            tickets,
            resultBox
        );

    }


    /* =================================================
       CONNECTION ERROR
    ================================================= */

    catch (error) {

        console.error(
            "❌ Booking lookup error:",
            error
        );


        resultBox.innerHTML = `

            <div class="error-message">

                <h2>
                    ⚠️ Server Error
                </h2>

                <p>
                    Could not connect to SkyBook server.
                </p>

                <p>
                    Make sure
                    <strong>node server.js</strong>
                    is running on port 3000.
                </p>

            </div>

        `;

    }

}



/* =====================================================
   DISPLAY BOOKING
===================================================== */

function displayBooking(
    booking,
    passengers,
    tickets,
    resultBox
) {


    /* =================================================
       BASIC BOOKING DATA
    ================================================= */

    const bookingID =
        safeValue(
            booking.bookingID,
            "--"
        );


    const bookingStatus =
        safeValue(
            booking.bookingStatus,
            "CONFIRMED"
        );


    const airlineName =
        safeValue(
            booking.airlineName,
            "--"
        );


    const flightNumber =
        safeValue(
            booking.flightNumber,
            "--"
        );


    const source =
        safeValue(
            booking.source,
            "--"
        );


    const destination =
        safeValue(
            booking.destination,
            "--"
        );


    const duration =
        safeValue(
            booking.duration,
            "--"
        );


    const departureTime =
        formatTime(
            booking.departureTime
        );


    const arrivalTime =
        formatTime(
            booking.arrivalTime
        );


    const totalFare =
        formatFare(
            booking.totalFare
        );


    /* =================================================
       PASSENGER COUNT
    ================================================= */

    const passengerCount =
        Number(
            booking.passengerCount
        ) || passengers.length || 1;


    /* =================================================
       PASSENGER HTML
    ================================================= */

    let passengerHTML = "";


    if (
        passengers.length > 0
    ) {

        passengerHTML =
            passengers
                .map(
                    function(passenger, index) {

                        const passengerName =
                            safeValue(
                                passenger.name,
                                `${safeValue(
                                    passenger.firstName,
                                    ""
                                )} ${safeValue(
                                    passenger.lastName,
                                    ""
                                )}`.trim() || "--"
                            );


                        const email =
                            safeValue(
                                passenger.email,
                                "--"
                            );


                        const phone =
                            safeValue(
                                passenger.phone,
                                "--"
                            );


                        return `

                            <div class="passenger-card"
                                 style="
                                    display: block;
                                    margin-bottom: 18px;
                                 ">

                                <div class="section-title"
                                     style="margin-bottom: 15px;">

                                    👤 Passenger
                                    ${index + 1}

                                </div>


                                <div class="passenger-info">


                                    <div class="info-box">

                                        <div class="info-label">

                                            Name

                                        </div>

                                        <div class="info-value">

                                            ${escapeHTML(
                                                passengerName
                                            )}

                                        </div>

                                    </div>



                                    <div class="info-box">

                                        <div class="info-label">

                                            Email

                                        </div>

                                        <div class="info-value">

                                            ${escapeHTML(
                                                email
                                            )}

                                        </div>

                                    </div>



                                    <div class="info-box">

                                        <div class="info-label">

                                            Phone

                                        </div>

                                        <div class="info-value">

                                            ${escapeHTML(
                                                phone
                                            )}

                                        </div>

                                    </div>


                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =================================================
       FALLBACK IF PASSENGER ARRAY IS EMPTY
    ================================================= */

    else {

        const passengerName =
            `${safeValue(
                booking.firstName,
                ""
            )} ${safeValue(
                booking.lastName,
                ""
            )}`.trim()
            || "--";


        passengerHTML = `

            <div class="passenger-card"
                 style="
                    display: block;
                    margin-bottom: 18px;
                 ">

                <div class="section-title">

                    👤 Passenger Details

                </div>


                <div class="passenger-info">


                    <div class="info-box">

                        <div class="info-label">

                            Name

                        </div>

                        <div class="info-value">

                            ${escapeHTML(
                                passengerName
                            )}

                        </div>

                    </div>



                    <div class="info-box">

                        <div class="info-label">

                            Email

                        </div>

                        <div class="info-value">

                            ${escapeHTML(
                                booking.email
                            )}

                        </div>

                    </div>



                    <div class="info-box">

                        <div class="info-label">

                            Phone

                        </div>

                        <div class="info-value">

                            ${escapeHTML(
                                booking.phone
                            )}

                        </div>

                    </div>


                </div>

            </div>

        `;

    }



    /* =================================================
       TICKET HTML
    ================================================= */

    let ticketHTML = "";


    if (
        tickets.length > 0
    ) {

        ticketHTML =
            tickets
                .map(
                    function(ticket, index) {

                        return `

                            <div class="ticket-box">

                                <div class="ticket-label">

                                    Passenger ${index + 1}

                                </div>

                                <div class="ticket-value">

                                    ${escapeHTML(
                                        ticket.seatNumber ||
                                        "--"
                                    )}

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =================================================
       IF NO TICKETS
    ================================================= */

    if (
        tickets.length === 0
    ) {

        ticketHTML = `

            <div class="ticket-box">

                <div class="ticket-label">

                    Ticket ID

                </div>

                <div class="ticket-value">

                    ${escapeHTML(
                        booking.ticketID ||
                        "--"
                    )}

                </div>

            </div>



            <div class="ticket-box">

                <div class="ticket-label">

                    Seat

                </div>

                <div class="ticket-value">

                    ${escapeHTML(
                        booking.seatNumber ||
                        "--"
                    )}

                </div>

            </div>



            <div class="ticket-box">

                <div class="ticket-label">

                    Class

                </div>

                <div class="ticket-value">

                    ${escapeHTML(
                        booking.ticketClass ||
                        "--"
                    )}

                </div>

            </div>



            <div class="ticket-box">

                <div class="ticket-label">

                    Payment

                </div>

                <div class="ticket-value">

                    ${escapeHTML(
                        booking.paymentMode ||
                        "--"
                    )}

                </div>

            </div>

        `;

    }



    /* =================================================
       BOOKING DISPLAY
    ================================================= */

    resultBox.innerHTML = `

        <div class="booking-card">


            <!-- =================================================
                 BOOKING HEADER
            ================================================= -->

            <div class="booking-header">

                <h2>

                    🎫 Booking
                    #${escapeHTML(
                        bookingID
                    )}

                </h2>


                <div class="booking-status">

                    ✅
                    ${escapeHTML(
                        bookingStatus
                    )}

                </div>

            </div>



            <!-- =================================================
                 BOOKING BODY
            ================================================= -->

            <div class="booking-body">


                <!-- =================================================
                     PASSENGER DETAILS
                ================================================= -->

                <div class="passenger-section">

                    <div class="section-title">

                        👥 Passenger Details

                        <span
                            style="
                                font-size: 14px;
                                color: #777;
                                margin-left: 8px;
                            "
                        >
                            (${passengerCount}
                            ${passengerCount === 1
                                ? "Passenger"
                                : "Passengers"})
                        </span>

                    </div>


                    ${passengerHTML}

                </div>



                <!-- =================================================
                     FLIGHT
                ================================================= -->

                <div class="flight-section">


                    <div class="flight-airline">

                        ✈️

                        ${escapeHTML(
                            airlineName
                        )}

                        &nbsp;

                        (${escapeHTML(
                            flightNumber
                        )})

                    </div>



                    <div class="flight-route">


                        <!-- DEPARTURE -->

                        <div>

                            <div class="airport-time">

                                ${escapeHTML(
                                    departureTime
                                )}

                            </div>

                            <div class="airport-name">

                                ${escapeHTML(
                                    source
                                )}

                            </div>

                        </div>



                        <!-- MIDDLE -->

                        <div class="flight-middle">

                            <div>

                                ${escapeHTML(
                                    duration
                                )}

                            </div>


                            <div class="flight-line">

                            </div>


                            <div>

                                Direct

                            </div>

                        </div>



                        <!-- ARRIVAL -->

                        <div>

                            <div class="airport-time">

                                ${escapeHTML(
                                    arrivalTime
                                )}

                            </div>

                            <div class="airport-name">

                                ${escapeHTML(
                                    destination
                                )}

                            </div>

                        </div>


                    </div>

                </div>



                <!-- =================================================
                     TICKET DETAILS
                ================================================= -->

                <div class="ticket-section">


                    <div class="section-title">

                        🎫 Ticket Details

                    </div>


                    <div class="ticket-details">

                        ${ticketHTML}

                    </div>


                    <!-- FULL TICKET LIST -->

                    ${
                        tickets.length > 0
                            ? tickets.map(
                                function(ticket, index) {

                                    return `

                                        <div
                                            style="
                                                margin-top: 12px;
                                                padding: 12px 15px;
                                                background: #f4f8fc;
                                                border-radius: 10px;
                                                display: flex;
                                                justify-content: space-between;
                                                align-items: center;
                                                gap: 15px;
                                                flex-wrap: wrap;
                                            "
                                        >

                                            <strong>

                                                Passenger
                                                ${index + 1}

                                            </strong>


                                            <span>

                                                Ticket ID:
                                                <strong>
                                                    ${escapeHTML(
                                                        ticket.ticketID ||
                                                        "--"
                                                    )}
                                                </strong>

                                            </span>


                                            <span>

                                                Seat:
                                                <strong>
                                                    ${escapeHTML(
                                                        ticket.seatNumber ||
                                                        "--"
                                                    )}
                                                </strong>

                                            </span>


                                            <span>

                                                Class:
                                                <strong>
                                                    ${escapeHTML(
                                                        ticket.ticketClass ||
                                                        "--"
                                                    )}
                                                </strong>

                                            </span>


                                            <span>

                                                Status:
                                                <strong>
                                                    ${escapeHTML(
                                                        ticket.ticketStatus ||
                                                        "--"
                                                    )}
                                                </strong>

                                            </span>

                                        </div>

                                    `;

                                }
                            ).join("")
                            : ""
                    }

                </div>



                <!-- =================================================
                     PAYMENT
                ================================================= -->

                <div class="payment-section">


                    <div>

                        <div class="payment-success">

                            ${
                                String(
                                    booking.paymentStatus ||
                                    ""
                                ).toUpperCase() ===
                                "PAID"
                                    ? "✅ Payment Successful"
                                    : "💳 Payment"
                            }

                        </div>


                        <div>

                            Payment ID:

                            ${escapeHTML(
                                booking.paymentID ||
                                "--"
                            )}

                        </div>


                        <div
                            style="
                                margin-top: 4px;
                                color: #777;
                                font-size: 13px;
                            "
                        >

                            Mode:

                            ${escapeHTML(
                                booking.paymentMode ||
                                "--"
                            )}

                        </div>

                    </div>



                    <div class="total-fare">

                        ₹${totalFare}

                    </div>


                </div>


            </div>


        </div>

    `;

}



/* =====================================================
   SAFE VALUE
===================================================== */

function safeValue(
    value,
    fallback = "--"
) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return fallback;
    }


    return value;
}



/* =====================================================
   FORMAT FARE
===================================================== */

function formatFare(
    amount
) {

    const number =
        Number(amount);


    if (
        !Number.isFinite(number)
    ) {

        return "0.00";
    }


    return number.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}



/* =====================================================
   FORMAT TIME
===================================================== */

function formatTime(
    time
) {

    if (
        !time
    ) {

        return "--";
    }


    const value =
        String(time);


    /*
       MySQL TIME:
       10:30:00

       → 10:30
    */

    if (
        /^\d{2}:\d{2}/.test(
            value
        )
    ) {

        return value.substring(
            0,
            5
        );
    }


    /*
       ISO date/time fallback
    */

    if (
        value.includes("T")
    ) {

        const date =
            new Date(value);


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date.toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                }
            );

        }

    }


    return value;
}



/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "--";
    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}



/* =====================================================
   ENTER KEY SUPPORT
===================================================== */

const bookingInput =
    document.getElementById(
        "booking-id"
    );


if (
    bookingInput
) {

    bookingInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                findBooking();

            }

        }
    );

}