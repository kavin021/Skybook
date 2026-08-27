/* =====================================================
   SKYBOOK - BOOKING CONFIRMED PAGE
   N-PASSENGER VERSION
===================================================== */


/* =====================================================
   LOAD BOOKING DATA
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadBookingDetails();

    }
);


/* =====================================================
   LOAD BOOKING
===================================================== */

function loadBookingDetails() {

    const savedBooking =
        localStorage.getItem(
            "lastBooking"
        );


    if (!savedBooking) {

        console.error(
            "❌ No booking data found."
        );

        showBookingError();

        return;

    }


    try {

        const booking =
            JSON.parse(
                savedBooking
            );


        console.log(
            "🎫 Booking data:",
            booking
        );


        displayBooking(
            booking
        );

    }


    catch (error) {

        console.error(
            "❌ Could not read booking data:",
            error
        );

        showBookingError();

    }

}


/* =====================================================
   DISPLAY BOOKING
===================================================== */

function displayBooking(
    booking
) {

    /* =================================================
       BASIC BOOKING DETAILS
    ================================================= */

    setText(
        "booking-id",
        booking.bookingID ||
            "--"
    );


    /* =================================================
       PASSENGERS
    ================================================= */

    const passengers =
        Array.isArray(
            booking.passengers
        )
            ? booking.passengers
            : [];


    /* =================================================
       TICKETS
    ================================================= */

    const tickets =
        Array.isArray(
            booking.tickets
        )
            ? booking.tickets
            : [];


    /* =================================================
       FLIGHT NUMBER
    ================================================= */

    setText(
        "flight-number",
        booking.flightNumber ||
            "--"
    );


    /* =================================================
       PASSENGER SECTION
    ================================================= */

    displayPassengers(
        passengers
    );


    /* =================================================
       TICKET DETAILS
    ================================================= */

    displayTickets(
        tickets
    );


    /* =================================================
       TOTAL FARE
    ================================================= */

    const amount =
        Number(
            booking.amount
        );


    setText(
        "total-fare",
        Number.isFinite(amount)
            ? `₹${amount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
              })}`
            : "₹0.00"
    );


    /* =================================================
       FLIGHT DETAILS
    ================================================= */

    loadFlightDetails(
        booking.flightNumber
    );

}


/* =====================================================
   DISPLAY PASSENGERS
===================================================== */

/* =====================================================
   DISPLAY PASSENGERS
   PREMIUM N-PASSENGER LAYOUT
===================================================== */

function displayPassengers(
    passengers
) {

    const passengerName =
        document.getElementById(
            "passenger-name"
        );

    const passengerEmail =
        document.getElementById(
            "passenger-email"
        );

    const passengerPhone =
        document.getElementById(
            "passenger-phone"
        );


    /* =================================================
       NO PASSENGERS
    ================================================= */

    if (
        !Array.isArray(passengers) ||
        passengers.length === 0
    ) {

        if (passengerName) {
            passengerName.innerHTML =
                "--";
        }

        if (passengerEmail) {
            passengerEmail.innerHTML =
                "--";
        }

        if (passengerPhone) {
            passengerPhone.innerHTML =
                "--";
        }

        return;
    }


    /* =================================================
       GET ORIGINAL COLUMN CONTAINERS
    ================================================= */

    const nameContainer =
        passengerName
            ? passengerName.parentElement
            : null;

    const emailContainer =
        passengerEmail
            ? passengerEmail.parentElement
            : null;

    const phoneContainer =
        passengerPhone
            ? passengerPhone.parentElement
            : null;


    /* =================================================
       CREATE PREMIUM PASSENGER LIST
    ================================================= */

    let html = `
        <div class="confirmed-passenger-list">
    `;


    passengers.forEach(
        function (
            passenger,
            index
        ) {

            const passengerNumber =
                index + 1;

            const name =
                escapeHTML(
                    passenger.name ||
                    "--"
                );

            const email =
                escapeHTML(
                    passenger.email ||
                    "--"
                );

            const phone =
                escapeHTML(
                    passenger.phone ||
                    "--"
                );


            html += `

                <div
                    class="confirmed-passenger-card"
                >

                    <div
                        class="confirmed-passenger-header"
                    >

                        <div
                            class="confirmed-passenger-icon"
                        >
                            👤
                        </div>

                        <div>

                            <span
                                class="confirmed-passenger-label"
                            >
                                PASSENGER
                            </span>

                            <h4>
                                Passenger ${passengerNumber}
                            </h4>

                        </div>

                    </div>


                    <div
                        class="confirmed-passenger-info"
                    >

                        <div
                            class="confirmed-info-item"
                        >

                            <span>
                                FULL NAME
                            </span>

                            <strong>
                                ${name}
                            </strong>

                        </div>


                        <div
                            class="confirmed-info-item"
                        >

                            <span>
                                EMAIL
                            </span>

                            <strong>
                                ${email}
                            </strong>

                        </div>


                        <div
                            class="confirmed-info-item"
                        >

                            <span>
                                PHONE
                            </span>

                            <strong>
                                ${phone}
                            </strong>

                        </div>

                    </div>

                </div>

            `;
        }
    );


    html += `
        </div>
    `;


    /* =================================================
       USE NAME COLUMN AS MAIN CONTAINER
    ================================================= */

    if (passengerName) {

        passengerName.innerHTML =
            html;

        passengerName.classList.add(
            "confirmed-passenger-wrapper"
        );

    }


    /* =================================================
       HIDE OLD EMAIL + PHONE COLUMNS
    ================================================= */

    if (emailContainer) {

        emailContainer.style.display =
            "none";

    }


    if (phoneContainer) {

        phoneContainer.style.display =
            "none";

    }


    /* =================================================
       MAKE NAME COLUMN FULL WIDTH
    ================================================= */

    if (nameContainer) {

        nameContainer.classList.add(
            "confirmed-passenger-full"
        );

    }

}


/* =====================================================
   DISPLAY TICKETS
===================================================== */

function displayTickets(
    tickets
) {

    if (
        tickets.length ===
        0
    ) {

        setText(
            "ticket-id",
            "--"
        );

        setText(
            "seat-number",
            "--"
        );

        setText(
            "ticket-class",
            "Economy"
        );

        setText(
            "payment-status",
            "Success"
        );

        return;

    }


    /* =================================================
       SINGLE TICKET
    ================================================= */

    if (
        tickets.length ===
        1
    ) {

        const ticket =
            tickets[0];


        setText(
            "ticket-id",
            ticket.ticketID ||
                "--"
        );


        setText(
            "seat-number",
            ticket.seatNumber ||
                "--"
        );


        setText(
            "ticket-class",
            ticket.ticketClass ||
                "Economy"
        );


        setText(
            "payment-status",
            "Success"
        );


        return;

    }


    /* =================================================
       MULTIPLE TICKETS
    ================================================= */

    setHTML(
        "ticket-id",

        tickets
            .map(
                function (
                    ticket,
                    index
                ) {

                    return `
                        <div
                            style="
                                margin-bottom:10px;
                            "
                        >

                            <strong>
                                Passenger ${index + 1}
                            </strong>

                            <br>

                            Ticket #${escapeHTML(
                                ticket.ticketID ||
                                "--"
                            )}

                        </div>
                    `;

                }
            )
            .join("")

    );


    setHTML(
        "seat-number",

        tickets
            .map(
                function (
                    ticket,
                    index
                ) {

                    return `
                        <div
                            style="
                                margin-bottom:10px;
                            "
                        >

                            <strong>
                                Passenger ${index + 1}
                            </strong>

                            <br>

                            ${escapeHTML(
                                ticket.seatNumber ||
                                "--"
                            )}

                        </div>
                    `;

                }
            )
            .join("")

    );


    setHTML(
        "ticket-class",

        tickets
            .map(
                function (
                    ticket,
                    index
                ) {

                    return `
                        <div
                            style="
                                margin-bottom:10px;
                            "
                        >

                            <strong>
                                Passenger ${index + 1}
                            </strong>

                            <br>

                            ${escapeHTML(
                                ticket.ticketClass ||
                                "Economy"
                            )}

                        </div>
                    `;

                }
            )
            .join("")

    );


    setText(
        "payment-status",
        "Success"
    );

}


/* =====================================================
   LOAD FLIGHT DETAILS
===================================================== */

async function loadFlightDetails(
    flightNumber
) {

    if (!flightNumber) {

        return;

    }


    try {

        const response =
            await fetch(
                `http://localhost:3000/api/flights`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load flights."
            );

        }


        const flights =
            await response.json();


        const flight =
            flights.find(
                function (
                    item
                ) {

                    return (
                        String(
                            item.FlightNumber
                        ) ===
                        String(
                            flightNumber
                        )
                    );

                }
            );


        if (!flight) {

            console.warn(
                "⚠️ Flight not found:",
                flightNumber
            );

            return;

        }


        /* =================================================
           AIRLINE
        ================================================= */

        setText(
            "airline",
            flight.AirlineName ||
                "--"
        );


        /* =================================================
           FLIGHT NUMBER
        ================================================= */

        setText(
            "flight-number",
            flight.FlightNumber ||
                "--"
        );


        /* =================================================
           DEPARTURE
        ================================================= */

        setText(
            "departure-time",
            formatTime(
                flight.DepartureTime
            )
        );


        /* =================================================
           SOURCE
        ================================================= */

        setText(
            "source",
            flight.Source ||
                "--"
        );


        /* =================================================
           ARRIVAL
        ================================================= */

        setText(
            "arrival-time",
            formatTime(
                flight.ArrivalTime
            )
        );


        /* =================================================
           DESTINATION
        ================================================= */

        setText(
            "destination",
            flight.Destination ||
                "--"
        );


        /* =================================================
           DURATION
        ================================================= */

        setText(
            "duration",
            flight.Duration ||
                "--"
        );

    }


    catch (error) {

        console.error(
            "❌ Flight details error:",
            error
        );

    }

}


/* =====================================================
   FORMAT TIME
===================================================== */

function formatTime(
    time
) {

    if (!time) {

        return "--";

    }


    return String(
        time
    ).substring(
        0,
        5
    );

}


/* =====================================================
   SET TEXT
===================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.textContent =
        value ??
        "--";

}


/* =====================================================
   SET HTML
===================================================== */

function setHTML(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.innerHTML =
        value ??
        "--";

}


/* =====================================================
   VIEW BOOKING
===================================================== */

function viewBooking() {

    window.location.href =
        "my-bookings.html";

}


/* =====================================================
   GO HOME
===================================================== */

function goHome() {

    window.location.href =
        "index.html";

}


/* =====================================================
   ERROR
===================================================== */

function showBookingError() {

    setText(
        "booking-id",
        "--"
    );


    setText(
        "passenger-name",
        "Booking information unavailable"
    );


    setText(
        "passenger-email",
        "--"
    );


    setText(
        "passenger-phone",
        "--"
    );


    setText(
        "airline",
        "--"
    );


    setText(
        "flight-number",
        "--"
    );


    setText(
        "departure-time",
        "--"
    );


    setText(
        "source",
        "--"
    );


    setText(
        "arrival-time",
        "--"
    );


    setText(
        "destination",
        "--"
    );


    setText(
        "duration",
        "--"
    );


    setText(
        "ticket-id",
        "--"
    );


    setText(
        "seat-number",
        "--"
    );


    setText(
        "ticket-class",
        "--"
    );


    setText(
        "payment-status",
        "--"
    );


    setText(
        "total-fare",
        "₹0.00"
    );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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