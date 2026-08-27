/* =====================================================
   SKYBOOK - ADMIN SEAT MANAGEMENT
===================================================== */


/* =====================================================
   ELEMENTS
===================================================== */

const flightSelect =
    document.getElementById("flightSelect");

const flightInfo =
    document.getElementById("flightInfo");

const seatSection =
    document.getElementById("seatSection");

const seatMap =
    document.getElementById("seatMap");

const loading =
    document.getElementById("loading");

const dashboardBtn =
    document.getElementById("dashboardBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const alertBox =
    document.getElementById("alertBox");

const alertMessage =
    document.getElementById("alertMessage");

const alertClose =
    document.getElementById("alertClose");


/* =====================================================
   CUSTOM ALERT
===================================================== */

function showAlert(message) {

    alertMessage.textContent = message;

    alertBox.classList.remove("hidden");

    setTimeout(() => {

        alertBox.classList.add("hidden");

    }, 3000);
}


/* CLOSE ALERT */

if (alertClose) {

    alertClose.addEventListener(
        "click",
        () => {

            alertBox.classList.add("hidden");

        }
    );

}


/* =====================================================
   DASHBOARD BUTTON
===================================================== */

if (dashboardBtn) {

    dashboardBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "admin-dashboard.html";

        }
    );

}


/* =====================================================
   LOGOUT
===================================================== */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "skybookUser"
            );

            window.location.href =
                "login.html";

        }
    );

}


/* =====================================================
   LOAD FLIGHTS
===================================================== */

async function loadFlights() {

    try {

        const response =
            await fetch(
                "/api/admin/flights"
            );

        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load flights."
            );

        }


        /* Clear existing options */

        flightSelect.innerHTML = `
            <option value="">
                -- Select a Flight --
            </option>
        `;


        /* Add flights */

        data.forEach(flight => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                flight.FlightID;

            option.textContent =
                `${flight.FlightNumber} - ${flight.Source} → ${flight.Destination}`;

            option.dataset.flight =
                JSON.stringify(flight);

            flightSelect.appendChild(
                option
            );

        });

    }

    catch (error) {

        console.error(
            "Flight loading error:",
            error
        );

        showAlert(
            error.message ||
            "Unable to load flights."
        );

    }

}


/* =====================================================
   FLIGHT SELECTION
===================================================== */

flightSelect.addEventListener(
    "change",
    async () => {

        const flightID =
            flightSelect.value;


        /* No flight selected */

        if (!flightID) {

            flightInfo.classList.add(
                "hidden"
            );

            seatSection.classList.add(
                "hidden"
            );

            seatMap.innerHTML = "";

            return;

        }


        /* Get selected flight */

        const selectedOption =
            flightSelect.options[
                flightSelect.selectedIndex
            ];


        const flight =
            JSON.parse(
                selectedOption.dataset.flight
            );


        /* Flight number */

        document.getElementById(
            "flightNumber"
        ).textContent =
            flight.FlightNumber;


        /* Route */

        document.getElementById(
            "flightRoute"
        ).textContent =
            `${flight.Source} → ${flight.Destination}`;


        /* Aircraft */

        document.getElementById(
            "aircraftInfo"
        ).textContent =
            `Aircraft ${flight.AircraftID}`;


        /* Show flight information */

        flightInfo.classList.remove(
            "hidden"
        );


        /* Load seats */

        await loadSeats(
            flightID
        );

    }
);


/* =====================================================
   LOAD SEATS
===================================================== */

async function loadSeats(flightID) {

    loading.classList.remove(
        "hidden"
    );

    seatSection.classList.add(
        "hidden"
    );

    seatMap.innerHTML = "";


    try {

        const response =
            await fetch(
                `/api/admin/seats/${flightID}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load seats."
            );

        }


        if (
            !data.seats ||
            data.seats.length === 0
        ) {

            showAlert(
                "No seats found for this flight."
            );

            return;

        }


        /* Display capacity */

        document.getElementById(
            "capacityInfo"
        ).textContent =
            data.seats.length;


        /* Create seat map */

        renderSeats(
            data.seats
        );


        seatSection.classList.remove(
            "hidden"
        );

    }

    catch (error) {

        console.error(
            "Seat loading error:",
            error
        );

        showAlert(
            error.message ||
            "Unable to load seats."
        );

    }

    finally {

        loading.classList.add(
            "hidden"
        );

    }

}


/* =====================================================
   RENDER SEATS
===================================================== */

function renderSeats(seats) {

    seatMap.innerHTML = "";


    /* Group seats according to row */

    const rows = {};


    seats.forEach(seat => {

        const match =
            seat.SeatNumber.match(
                /^(\d+)([A-F])$/
            );


        if (!match) {
            return;
        }


        const rowNumber =
            Number(match[1]);


        if (!rows[rowNumber]) {

            rows[rowNumber] = [];

        }


        rows[rowNumber].push(
            seat
        );

    });


    /* Sort rows */

    const rowNumbers =
        Object.keys(rows).sort(
            (a, b) =>
                Number(a) - Number(b)
        );


    /* Create every row */

    rowNumbers.forEach(
        rowNumber => {

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
                letter => {

                    const seat =
                        rowSeats.find(
                            item =>
                                item.SeatNumber ===
                                `${rowNumber}${letter}`
                        );


                    /* Empty seat space */

                    if (!seat) {

                        const empty =
                            document.createElement(
                                "div"
                            );

                        row.appendChild(
                            empty
                        );

                        return;

                    }


                    /* Create seat button */

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.className =
                        "seat";


                    const status =
                        seat.CurrentStatus;


                    /* -----------------------------
                       AVAILABLE
                    ----------------------------- */

                    if (
                        status ===
                        "Available"
                    ) {

                        button.classList.add(
                            "available"
                        );

                    }


                    /* -----------------------------
                       BLOCKED
                    ----------------------------- */

                    else if (
                        status ===
                        "Blocked"
                    ) {

                        button.classList.add(
                            "blocked"
                        );

                    }


                    /* -----------------------------
                       BOOKED
                    ----------------------------- */

                    else if (
                        status ===
                        "Booked"
                    ) {

                        button.classList.add(
                            "booked"
                        );

                    }


                    button.textContent =
                        seat.SeatNumber;


                    button.title =
                        `${seat.SeatNumber} - ${status}`;


                    /*
                       Booked seats cannot
                       be changed.
                    */

                    if (
                        status !==
                        "Booked"
                    ) {

                        button.addEventListener(
                            "click",
                            () => {

                                toggleSeat(
                                    seat
                                );

                            }
                        );

                    }


                    row.appendChild(
                        button
                    );


                    /* Add aisle after C */

                    if (
                        letter === "C"
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

}


/* =====================================================
   BLOCK / UNBLOCK SEAT
===================================================== */

async function toggleSeat(seat) {

    let newStatus;


    /* Available → Blocked */

    if (
        seat.CurrentStatus ===
        "Available"
    ) {

        newStatus =
            "Blocked";

    }


    /* Blocked → Available */

    else if (
        seat.CurrentStatus ===
        "Blocked"
    ) {

        newStatus =
            "Available";

    }


    /* Booked → Cannot change */

    else {

        showAlert(
            "Booked seats cannot be changed."
        );

        return;

    }


    try {

        const response =
            await fetch(
                `/api/admin/seats/${seat.SeatID}`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        SeatStatus:
                            newStatus

                    })

                }
            );


        const data =
            await response.json();


        /* API error */

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to update seat."
            );

        }


        /* Custom SkyBook notification */

        showAlert(
            data.message
        );


        /* Reload seat map */

        await loadSeats(
            flightSelect.value
        );

    }

    catch (error) {

        console.error(
            "Seat update error:",
            error
        );

        showAlert(
            error.message ||
            "Unable to update seat."
        );

    }

}


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadFlights();

    }
);