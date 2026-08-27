/* =====================================================
   SKYBOOK - USER BOOKING SCRIPT
   N-PASSENGER / N-SEAT VERSION
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

const API_BASE_URL = "http://localhost:3000";

let selectedFlight = null;

let selectedSeats = [];

let passengerCount = 1;


/* =====================================================
   INITIAL SETUP
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupPassengerSelector();

        const passengerSection =
            document.getElementById(
                "passenger-section"
            );

        const seatSection =
            document.getElementById(
                "seat-section"
            );

        if (passengerSection) {

            passengerSection.style.display =
                "none";

        }

        if (seatSection) {

            seatSection.style.display =
                "none";

        }

    }
);


/* =====================================================
   PASSENGER SELECTOR
===================================================== */

function setupPassengerSelector() {

    const selector =
        document.getElementById(
            "passengers"
        );

    if (!selector) {

        console.error(
            "❌ Passenger selector not found."
        );

        return;

    }

    /*
       The original HTML has 1-5 passengers.

       Add options up to 50 automatically.
       This means we don't have to hard-code
       the booking logic to 2 or 5 passengers.
    */

    const existingValues =
        Array.from(
            selector.options
        ).map(
            option =>
                Number(option.value)
        );

    for (
        let i = 1;
        i <= 50;
        i++
    ) {

        if (
            !existingValues.includes(i)
        ) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                i;

            option.textContent =
                `${i} ${i === 1 ? "Adult" : "Adults"}`;

            selector.appendChild(
                option
            );

        }

    }

    selector.addEventListener(
        "change",
        function () {

            passengerCount =
                Number(
                    selector.value
                ) || 1;

            console.log(
                "👥 Passengers:",
                passengerCount
            );

        }
    );

    passengerCount =
        Number(
            selector.value
        ) || 1;

}


/* =====================================================
   SEARCH FLIGHTS
===================================================== */

async function searchFlights() {

    const fromElement =
        document.getElementById(
            "from"
        );

    const toElement =
        document.getElementById(
            "to"
        );

    const departureElement =
        document.getElementById(
            "departure"
        );

    const passengersElement =
        document.getElementById(
            "passengers"
        );

    if (
        !fromElement ||
        !toElement ||
        !departureElement ||
        !passengersElement
    ) {

        console.error(
            "❌ Search form elements missing."
        );

        return;

    }

    const from =
        fromElement.value.trim();

    const to =
        toElement.value.trim();

    const departure =
        departureElement.value;

    passengerCount =
        Number(
            passengersElement.value
        ) || 1;


    /* =================================================
       VALIDATION
    ================================================= */

    if (
        from === "" ||
        to === "" ||
        departure === ""
    ) {

        showCustomAlert(
            "Missing Information",
            "Please enter From, To and Departure date."
        );

        return;

    }


    /* =================================================
       SAME LOCATION
    ================================================= */

    if (
        from.toLowerCase() ===
        to.toLowerCase()
    ) {

        showCustomAlert(
            "Invalid Route",
            "From and To locations cannot be the same."
        );

        return;

    }


    /* =================================================
       RESET PREVIOUS BOOKING STATE
    ================================================= */

    selectedFlight =
        null;

    selectedSeats =
        [];


    /* =================================================
       GET FLIGHTS
    ================================================= */

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/flights`
            );

        if (!response.ok) {

            throw new Error(
                "Could not fetch flights."
            );

        }

        const flights =
            await response.json();


        /* =================================================
           FILTER FLIGHTS
        ================================================= */

        const matchingFlights =
            flights.filter(
                function (flight) {

                    return (

                        flight.Source
                            .toLowerCase() ===
                        from.toLowerCase()

                        &&

                        flight.Destination
                            .toLowerCase() ===
                        to.toLowerCase()

                    );

                }
            );


        const flightList =
            document.getElementById(
                "flight-list"
            );

        if (!flightList) {

            console.error(
                "❌ Flight list element not found."
            );

            return;

        }

        flightList.innerHTML =
            "";


        /* =================================================
           NO FLIGHTS
        ================================================= */

        if (
            matchingFlights.length ===
            0
        ) {

            flightList.innerHTML = `

                <div class="no-flights">

                    <h3>
                        ✈️ No flights found
                    </h3>

                    <p>
                        We couldn't find flights from
                        ${from.toUpperCase()}
                        to
                        ${to.toUpperCase()}.
                    </p>

                </div>

            `;

            const resultsSection =
                document.getElementById(
                    "flight-results"
                );

            if (resultsSection) {

                resultsSection.scrollIntoView({

                    behavior:
                        "smooth"

                });

            }

            return;

        }


        /* =================================================
           CREATE FLIGHT CARDS
        ================================================= */

        matchingFlights.forEach(
            function (flight) {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "flight-card";

                const departureTime =
                    formatTime(
                        flight.DepartureTime
                    );

                const arrivalTime =
                    formatTime(
                        flight.ArrivalTime
                    );

                card.innerHTML = `

                    <div class="airline-info">

                        <div class="airline-name">

                            ✈️
                            ${escapeHTML(
                                flight.AirlineName
                            )}

                        </div>

                        <div class="flight-number">

                            ${escapeHTML(
                                flight.FlightNumber
                            )}

                        </div>

                    </div>


                    <div class="flight-route">

                        <div class="time-location">

                            <strong>
                                ${departureTime}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    flight.Source
                                ).toUpperCase()}
                            </span>

                        </div>


                        <div class="flight-duration">

                            <span>
                                ${escapeHTML(
                                    flight.Duration
                                )}
                            </span>

                            <div class="flight-line">
                                ✈
                            </div>

                            <span>
                                Direct
                            </span>

                        </div>


                        <div class="time-location">

                            <strong>
                                ${arrivalTime}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    flight.Destination
                                ).toUpperCase()}
                            </span>

                        </div>

                    </div>


                    <div class="flight-price">

                        <strong>

                            ₹${Number(
                                flight.Fare
                            ).toLocaleString(
                                "en-IN"
                            )}

                        </strong>


                        <button
                            type="button"
                            onclick="selectFlight('${escapeJS(
                                flight.FlightNumber
                            )}')"
                        >

                            Select Flight

                        </button>

                    </div>

                `;

                flightList.appendChild(
                    card
                );

            }
        );


        /* =================================================
           SCROLL TO RESULTS
        ================================================= */

        const resultsSection =
            document.getElementById(
                "flight-results"
            );

        if (resultsSection) {

            resultsSection.scrollIntoView({

                behavior:
                    "smooth"

            });

        }

    }


    catch (error) {

        console.error(
            "❌ Flight search error:",
            error
        );

        showCustomAlert(
            "Server Error",
            "Unable to connect to the SkyBook server. Please make sure server.js is running."
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

        return "";

    }

    return String(
        time
    ).substring(
        0,
        5
    );

}


/* =====================================================
   SELECT FLIGHT
===================================================== */

function selectFlight(
    flightNumber
) {

    selectedFlight =
        flightNumber;

    selectedSeats =
        [];

    console.log(
        "✈️ Selected flight:",
        flightNumber
    );


    /* =================================================
       GET PASSENGER COUNT
    ================================================= */

    const passengersElement =
        document.getElementById(
            "passengers"
        );

    if (passengersElement) {

        passengerCount =
            Number(
                passengersElement.value
            ) || 1;

    }

    console.log(
        "👥 Passenger count:",
        passengerCount
    );


    /* =================================================
       GET PASSENGER SECTION
    ================================================= */

    const passengerSection =
        document.getElementById(
            "passenger-section"
        );

    if (!passengerSection) {

        console.error(
            "❌ Passenger section not found."
        );

        return;

    }


    /* =================================================
       SHOW PASSENGER SECTION
    ================================================= */

    passengerSection.style.display =
        "block";


    /* =================================================
       HIDE SEAT SECTION
    ================================================= */

    const seatSection =
        document.getElementById(
            "seat-section"
        );

    if (seatSection) {

        seatSection.style.display =
            "none";

    }


    /* =================================================
       CREATE N PASSENGER FORMS
    ================================================= */

    createPassengerForms();


    /* =================================================
       SCROLL
    ================================================= */

    passengerSection.scrollIntoView({

        behavior:
            "smooth",

        block:
            "start"

    });

}


/* =====================================================
   CREATE N PASSENGER FORMS
===================================================== */

function createPassengerForms() {

    const passengerSection =
        document.getElementById(
            "passenger-section"
        );

    if (!passengerSection) {

        return;

    }

    const passengerCard =
        passengerSection.querySelector(
            ".passenger-card"
        );

    if (!passengerCard) {

        console.error(
            "❌ .passenger-card not found."
        );

        return;

    }

    let html = `

        <div class="passenger-list">

            <p class="passenger-count-text">

                👥 Enter details for

                <strong>
                    ${passengerCount}
                </strong>

                ${
                    passengerCount === 1
                    ? "passenger"
                    : "passengers"
                }.

            </p>

    `;


    for (
        let i = 1;
        i <= passengerCount;
        i++
    ) {

        html += `

            <div
                class="passenger-card-item"
                data-passenger="${i}"
            >

                <h3>

                    Passenger ${i}

                </h3>


                <div class="input-group">

                    <label
                        for="passenger-name-${i}"
                    >

                        Full Name

                    </label>


                    <input
                        type="text"
                        id="passenger-name-${i}"
                        class="passenger-name-input"
                        placeholder="Enter passenger ${i} name"
                    >

                </div>


                <div class="input-group">

                    <label
                        for="passenger-email-${i}"
                    >

                        Email

                    </label>


                    <input
                        type="email"
                        id="passenger-email-${i}"
                        class="passenger-email-input"
                        placeholder="Enter passenger ${i} email"
                    >

                </div>


                <div class="input-group">

                    <label
                        for="passenger-phone-${i}"
                    >

                        Phone Number

                    </label>


                    <input
                        type="tel"
                        id="passenger-phone-${i}"
                        class="passenger-phone-input"
                        maxlength="10"
                        placeholder="Enter 10-digit phone number"
                    >

                </div>

            </div>

        `;

    }


    html += `

            <button
                type="button"
                onclick="continueToSeats()"
            >

                Continue to Seat Selection →

            </button>

        </div>

    `;


    passengerCard.innerHTML =
        html;

}


/* =====================================================
   GET PASSENGER DETAILS
===================================================== */

function getPassengerDetails() {

    const passengers =
        [];


    for (
        let i = 1;
        i <= passengerCount;
        i++
    ) {

        const nameElement =
            document.getElementById(
                `passenger-name-${i}`
            );

        const emailElement =
            document.getElementById(
                `passenger-email-${i}`
            );

        const phoneElement =
            document.getElementById(
                `passenger-phone-${i}`
            );


        if (
            !nameElement ||
            !emailElement ||
            !phoneElement
        ) {

            showCustomAlert(
                "Passenger Form Error",
                `Passenger ${i} form could not be found.`
            );

            return null;

        }


        const name =
            nameElement.value.trim();

        const email =
            emailElement.value.trim();

        const phone =
            phoneElement.value.trim();


        /* =============================================
           EMPTY CHECK
        ============================================= */

        if (
            name === "" ||
            email === "" ||
            phone === ""
        ) {

            showCustomAlert(
                "Missing Details",
                `Please fill in all details for Passenger ${i}.`
            );

            return null;

        }


        /* =============================================
           EMAIL
        ============================================= */

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailPattern.test(
                email
            )
        ) {

            showCustomAlert(
                "Invalid Email",
                `Please enter a valid email for Passenger ${i}.`
            );

            return null;

        }


        /* =============================================
           PHONE
        ============================================= */

        const phonePattern =
            /^[0-9]{10}$/;


        if (
            !phonePattern.test(
                phone
            )
        ) {

            showCustomAlert(
                "Invalid Phone Number",
                `Please enter a valid 10-digit phone number for Passenger ${i}.`
            );

            return null;

        }


        passengers.push({

            name:
                name,

            email:
                email,

            phone:
                phone

        });

    }


    return passengers;

}


/* =====================================================
   CONTINUE TO SEATS
===================================================== */

async function continueToSeats() {

    if (!selectedFlight) {

        showCustomAlert(
            "No Flight Selected",
            "Please select a flight first."
        );

        return;

    }


    const passengers =
        getPassengerDetails();


    if (!passengers) {

        return;

    }


    /* =================================================
       RESET SEATS
    ================================================= */

    selectedSeats =
        [];


    /* =================================================
       SHOW SEAT SECTION
    ================================================= */

    const seatSection =
        document.getElementById(
            "seat-section"
        );

    if (seatSection) {

        seatSection.style.display =
            "block";

    }


    /* =================================================
       LOAD REAL SEATS
    ================================================= */

    await loadUserSeats(
        selectedFlight
    );


    /* =================================================
       SCROLL
    ================================================= */

    if (seatSection) {

        seatSection.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }

}


/* =====================================================
   LOAD USER SEATS
===================================================== */

async function loadUserSeats(
    flightNumber
) {

    try {

        console.log(
            "💺 Loading seats for:",
            flightNumber
        );


        const response =
            await fetch(
                `${API_BASE_URL}/api/flights/${encodeURIComponent(
                    flightNumber
                )}/seats`
            );


        if (!response.ok) {

            throw new Error(
                `Seat API returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "💺 Seat API response:",
            data
        );


        const seats =
            data.seats ||
            data;


        if (
            !Array.isArray(
                seats
            )
        ) {

            throw new Error(
                "Invalid seat data received from server."
            );

        }


        if (
            seats.length === 0
        ) {

            throw new Error(
                "No seats were returned for this flight."
            );

        }


        renderUserSeats(
            seats
        );

    }


    catch (error) {

        console.error(
            "❌ User seat loading error:",
            error
        );


        showCustomAlert(
            "Seat Error",
            "Unable to load seats. Please try again."
        );

    }

}


/* =====================================================
   RENDER USER SEATS
===================================================== */

function renderUserSeats(
    seats
) {

    const seatMap =
        document.querySelector(
            ".seat-map"
        );


    if (!seatMap) {

        console.error(
            "❌ .seat-map was not found."
        );


        showCustomAlert(
            "Seat Map Error",
            "The seat map element was not found."
        );


        return;

    }


    /* =================================================
       CLEAR OLD SEATS
    ================================================= */

    seatMap.innerHTML =
        "";


    /* =================================================
       GROUP BY ROW
    ================================================= */

    const rows = {};


    seats.forEach(
        function (seat) {

            const seatNumber =
                String(
                    seat.SeatNumber
                );


            const match =
                seatNumber.match(
                    /^(\d+)([A-F])$/
                );


            if (!match) {

                return;

            }


            const rowNumber =
                Number(
                    match[1]
                );


            if (
                !rows[rowNumber]
            ) {

                rows[rowNumber] =
                    [];

            }


            rows[rowNumber].push(
                seat
            );

        }
    );


    const rowNumbers =
        Object.keys(
            rows
        ).sort(
            function (
                a,
                b
            ) {

                return (
                    Number(a) -
                    Number(b)
                );

            }
        );


    /* =================================================
       CREATE ROWS
    ================================================= */

    rowNumbers.forEach(
        function (
            rowNumber
        ) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "seat-row";


            const rowSeats =
                rows[rowNumber];


            const seatLetters =
                [
                    "A",
                    "B",
                    "C",
                    "D",
                    "E",
                    "F"
                ];


            seatLetters.forEach(
                function (
                    letter
                ) {

                    const seat =
                        rowSeats.find(
                            function (
                                item
                            ) {

                                return (

                                    String(
                                        item.SeatNumber
                                    ) ===
                                    `${rowNumber}${letter}`

                                );

                            }
                        );


                    /* =========================================
                       EMPTY POSITION
                    ========================================= */

                    if (!seat) {

                        const empty =
                            document.createElement(
                                "div"
                            );


                        empty.className =
                            "seat-empty";


                        row.appendChild(
                            empty
                        );


                        return;

                    }


                    /* =========================================
                       SEAT BUTTON
                    ========================================= */

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";


                    button.textContent =
                        seat.SeatNumber;


                    button.className =
                        "seat";


                    const status =
                        seat.CurrentStatus ||
                        seat.SeatStatus ||
                        "Available";


                    /* =========================================
                       AVAILABLE
                    ========================================= */

                    if (
                        status ===
                        "Available"
                    ) {

                        button.classList.add(
                            "available"
                        );


                        button.disabled =
                            false;


                        button.title =
                            `${seat.SeatNumber} - Available`;


                        button.addEventListener(
                            "click",
                            function () {

                                selectSeat(
                                    button,
                                    seat.SeatNumber
                                );

                            }
                        );

                    }


                    /* =========================================
                       BLOCKED
                    ========================================= */

                    else if (
                        status ===
                        "Blocked"
                    ) {

                        button.classList.add(
                            "blocked"
                        );


                        button.disabled =
                            true;


                        button.title =
                            `${seat.SeatNumber} - Blocked`;

                    }


                    /* =========================================
                       BOOKED
                    ========================================= */

                    else if (
                        status ===
                        "Booked"
                    ) {

                        button.classList.add(
                            "occupied"
                        );


                        button.disabled =
                            true;


                        button.title =
                            `${seat.SeatNumber} - Booked`;

                    }


                    /* =========================================
                       UNKNOWN
                    ========================================= */

                    else {

                        button.classList.add(
                            "occupied"
                        );


                        button.disabled =
                            true;

                    }


                    row.appendChild(
                        button
                    );


                    /* =========================================
                       AISLE
                    ========================================= */

                    if (
                        letter ===
                        "C"
                    ) {

                        const aisle =
                            document.createElement(
                                "div"
                            );


                        aisle.className =
                            "aisle";


                        row.appendChild(
                            aisle
                        );

                    }

                }
            );


            seatMap.appendChild(
                row
            );

        }
    );


    /* =================================================
       RESET DISPLAY
    ================================================= */

    selectedSeats =
        [];


    updateSelectedSeatDisplay();


    console.log(
        `💺 Rendered ${seats.length} seats.`
    );

}


/* =====================================================
   SELECT / DESELECT SEAT
===================================================== */

function selectSeat(
    button,
    seatNumber
) {

    /* =================================================
       SAFETY
    ================================================= */

    if (
        button.disabled
    ) {

        return;

    }


    if (
        button.classList.contains(
            "blocked"
        )
        ||
        button.classList.contains(
            "occupied"
        )
    ) {

        return;

    }


    const index =
        selectedSeats.indexOf(
            seatNumber
        );


    /* =================================================
       CLICK SELECTED SEAT AGAIN
       → DESELECT
    ================================================= */

    if (
        index !== -1
    ) {

        selectedSeats.splice(
            index,
            1
        );


        button.classList.remove(
            "selected"
        );


        button.classList.add(
            "available"
        );


        console.log(
            "💺 Seat removed:",
            seatNumber
        );


        updateSelectedSeatDisplay();


        return;

    }


    /* =================================================
       MAX SEATS CHECK
    ================================================= */

    if (
        selectedSeats.length >=
        passengerCount
    ) {

        showCustomAlert(
            "Seat Limit Reached",
            `You have ${passengerCount} passenger${passengerCount === 1 ? "" : "s"}. Please select exactly ${passengerCount} seat${passengerCount === 1 ? "" : "s"}.`
        );


        return;

    }


    /* =================================================
       SELECT SEAT
    ================================================= */

    selectedSeats.push(
        seatNumber
    );


    button.classList.remove(
        "available"
    );


    button.classList.add(
        "selected"
    );


    console.log(
        "💺 Selected seat:",
        seatNumber
    );


    updateSelectedSeatDisplay();

}


/* =====================================================
   UPDATE SELECTED SEAT DISPLAY
===================================================== */

function updateSelectedSeatDisplay() {

    const selectedSeatElement =
        document.getElementById(
            "selected-seat"
        );


    if (!selectedSeatElement) {

        return;

    }


    if (
        selectedSeats.length ===
        0
    ) {

        selectedSeatElement.textContent =
            "None";


        return;

    }


    selectedSeatElement.textContent =
        selectedSeats.join(
            ", "
        );


    /*
       Add count information after the
       existing seat display.
    */

    selectedSeatElement.title =
        `${selectedSeats.length} of ${passengerCount} seats selected`;

}


/* =====================================================
   CONFIRM BOOKING
===================================================== */

async function confirmBooking() {

    /* =================================================
       CHECK FLIGHT
    ================================================= */

    if (!selectedFlight) {

        showCustomAlert(
            "No Flight Selected",
            "Please select a flight first."
        );


        return;

    }


    /* =================================================
       CHECK PASSENGERS
    ================================================= */

    const passengers =
        getPassengerDetails();


    if (!passengers) {

        return;

    }


    /* =================================================
       CHECK NUMBER OF SEATS
    ================================================= */

    if (
        selectedSeats.length ===
        0
    ) {

        showCustomAlert(
            "No Seats Selected",
            `Please select ${passengerCount} seat${passengerCount === 1 ? "" : "s"} before confirming your booking.`
        );


        return;

    }


    if (
        selectedSeats.length !==
        passengerCount
    ) {

        showCustomAlert(
            "Seats Missing",
            `You selected ${selectedSeats.length} seat${selectedSeats.length === 1 ? "" : "s"}, but you have ${passengerCount} passenger${passengerCount === 1 ? "" : "s"}. Please select exactly ${passengerCount} seats.`
        );


        return;

    }


    /* =================================================
       GET LOGGED-IN USER
    ================================================= */

    let userID =
        null;


    try {

        const savedUser =
            localStorage.getItem(
                "skybookUser"
            );


        if (savedUser) {

            const user =
                JSON.parse(
                    savedUser
                );


            userID =
                user.UserID ||
                user.userID ||
                null;

        }

    }


    catch (error) {

        console.warn(
            "Unable to read logged-in user."
        );

    }


    /* =================================================
       CONFIRMATION MESSAGE
    ================================================= */

    console.log(
        "================================="
    );


    console.log(
        "✈️ SKYBOOK BOOKING"
    );


    console.log(
        "Flight:",
        selectedFlight
    );


    console.log(
        "Passengers:",
        passengers.length
    );


    console.log(
        "Seats:",
        selectedSeats
    );


    console.log(
        "================================="
    );


    /* =================================================
       DISABLE BUTTON DURING BOOKING
    ================================================= */

    const confirmButton =
        document.querySelector(
            ".continue-button"
        );


    if (confirmButton) {

        confirmButton.disabled =
            true;


        confirmButton.textContent =
            "Processing Booking...";

    }


    /* =================================================
       SEND TO SERVER
    ================================================= */

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/bookings`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            passengers:
                                passengers,

                            seats:
                                selectedSeats,

                            flightNumber:
                                selectedFlight,

                            ticketClass:
                                "Economy",

                            userID:
                                userID

                        })

                }
            );


        const result =
            await response.json();


        console.log(
            "📦 Booking response:",
            result
        );


        /* =================================================
           BOOKING FAILED
        ================================================= */

        if (
            !response.ok ||
            !result.success
        ) {

            showCustomAlert(
                "Booking Failed",
                result.message ||
                    "Something went wrong while creating your booking."
            );


            /*
               Reload seats because another user
               may have booked one of them.
            */

            await loadUserSeats(
                selectedFlight
            );


            if (confirmButton) {

                confirmButton.disabled =
                    false;


                confirmButton.textContent =
                    "Confirm Booking →";

            }


            return;

        }


        /* =================================================
           SAVE COMPLETE BOOKING
        ================================================= */

        localStorage.setItem(

            "lastBooking",

            JSON.stringify({

                bookingID:
                    result.bookingID,

                paymentID:
                    result.paymentID,

                flightNumber:
                    result.flightNumber,

                passengerCount:
                    result.passengerCount,

                passengers:
                    result.passengers,

                tickets:
                    result.tickets,

                seats:
                    result.seats,

                amount:
                    result.amount

            })

        );


        /* =================================================
           SUCCESS
        ================================================= */

        window.location.href =
            "booking-confirmed.html";

    }


    catch (error) {

        console.error(
            "❌ Booking error:",
            error
        );


        showCustomAlert(
            "Connection Error",
            "Unable to connect to the SkyBook booking server."
        );


        if (confirmButton) {

            confirmButton.disabled =
                false;


            confirmButton.textContent =
                "Confirm Booking →";

        }

    }

}


/* =====================================================
   CUSTOM ALERT
===================================================== */

function showCustomAlert(
    title,
    message
) {

    const alertBox =
        document.getElementById(
            "custom-alert"
        );


    const alertTitle =
        document.getElementById(
            "custom-alert-title"
        );


    const alertMessage =
        document.getElementById(
            "custom-alert-message"
        );


    if (
        !alertBox ||
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


    alertBox.classList.add(
        "show"
    );

}


/* =====================================================
   CLOSE CUSTOM ALERT
===================================================== */

function closeCustomAlert() {

    const alertBox =
        document.getElementById(
            "custom-alert"
        );


    if (!alertBox) {

        return;

    }


    alertBox.classList.remove(
        "show"
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


/* =====================================================
   ESCAPE JAVASCRIPT STRING
===================================================== */

function escapeJS(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            '\\"'
        )
        .replace(
            /\n/g,
            "\\n"
        )
        .replace(
            /\r/g,
            "\\r"
        );

}