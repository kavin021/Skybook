/* =====================================================
   SKYBOOK ADMIN DASHBOARD
===================================================== */

const API_URL = "http://localhost:3000";


/* =====================================================
   ELEMENTS
===================================================== */

const flightTableBody =
    document.getElementById("flight-table-body");

const totalFlights =
    document.getElementById("total-flights");

const availableFlights =
    document.getElementById("available-flights");

const cancelledFlights =
    document.getElementById("cancelled-flights");

const flightModal =
    document.getElementById("flight-modal");

const flightForm =
    document.getElementById("flight-form");

const modalTitle =
    document.getElementById("modal-title");

const flightIdInput =
    document.getElementById("flight-id");

const aircraftSelect =
    document.getElementById("aircraft-id");

const addFlightButton =
    document.getElementById("add-flight-button");

const closeModalButton =
    document.getElementById("close-modal");

const cancelModalButton =
    document.getElementById("cancel-modal");

const refreshButton =
    document.getElementById("refresh-flights");

const logoutButton =
    document.getElementById("logout-button");


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
   LOAD FLIGHTS
===================================================== */

async function loadFlights() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/flights`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load flights"
            );

        }


        const flights =
            await response.json();


        displayFlights(flights);

        updateStatistics(flights);


    } catch (error) {

        console.error(
            "Flight loading error:",
            error
        );


        showAlert(
            "Unable to Load Flights",
            "Could not connect to the SkyBook server.",
            "⚠️"
        );

    }

}


/* =====================================================
   DISPLAY FLIGHTS
===================================================== */

function displayFlights(flights) {

    flightTableBody.innerHTML = "";


    if (flights.length === 0) {

        flightTableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center; padding:50px;">

                    <div class="empty-state">

                        <div class="empty-state-icon">
                            ✈️
                        </div>

                        <h3>
                            No flights found
                        </h3>

                        <p>
                            Add your first flight to SkyBook.
                        </p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    flights.forEach(function (flight) {

        const row =
            document.createElement("tr");


        let statusClass =
            "available";


        if (flight.Status === "Full") {

            statusClass = "full";

        }


        if (flight.Status === "Cancelled") {

            statusClass = "cancelled";

        }


        row.innerHTML = `

            <td>

                <div class="flight-number">
                    ${escapeHTML(flight.FlightNumber)}
                </div>

                <div class="airline-name">
                    ${escapeHTML(flight.AirlineName)}
                </div>

            </td>


            <td>

                <div class="route">

                    ${escapeHTML(flight.Source)}

                    →

                    ${escapeHTML(flight.Destination)}

                </div>

            </td>


            <td>
                ${formatTime(flight.DepartureTime)}
            </td>


            <td>
                ${formatTime(flight.ArrivalTime)}
            </td>


            <td>

                ₹${Number(flight.Fare)
                    .toLocaleString("en-IN")}

            </td>


            <td>

                <span
                    class="status ${statusClass}">

                    ${escapeHTML(flight.Status)}

                </span>

            </td>


            <td>

                <div class="action-buttons">

                    <button
                        class="action-button edit-button"
                        onclick="editFlight(${flight.FlightID})">

                        Edit

                    </button>


                    ${
                        flight.Status !== "Cancelled"

                        ? `

                            <button
                                class="action-button cancel-button"
                                onclick="cancelFlight(${flight.FlightID})">

                                Cancel

                            </button>

                          `

                        : ""

                    }

                </div>

            </td>

        `;


        flightTableBody.appendChild(row);

    });

}


/* =====================================================
   UPDATE STATISTICS
===================================================== */

function updateStatistics(flights) {

    const total =
        flights.length;


    const available =
        flights.filter(
            flight =>
                flight.Status === "Available"
        ).length;


    const cancelled =
        flights.filter(
            flight =>
                flight.Status === "Cancelled"
        ).length;


    totalFlights.textContent =
        total;

    availableFlights.textContent =
        available;

    cancelledFlights.textContent =
        cancelled;

}


/* =====================================================
   LOAD AIRCRAFT
===================================================== */

async function loadAircraft() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/aircraft`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load aircraft"
            );

        }


        const aircraft =
            await response.json();


        aircraftSelect.innerHTML = `

            <option value="">
                Select Aircraft
            </option>

        `;


        aircraft.forEach(function (item) {

            const option =
                document.createElement("option");


            option.value =
                item.AircraftID;


            option.textContent =
                `${item.AircraftName} - ${item.AircraftModel}
                (${item.Capacity} seats)`;


            aircraftSelect.appendChild(option);

        });


    } catch (error) {

        console.error(
            "Aircraft loading error:",
            error
        );

    }

}


/* =====================================================
   OPEN ADD FLIGHT MODAL
===================================================== */

function openAddFlightModal() {

    flightForm.reset();


    flightIdInput.value = "";


    modalTitle.textContent =
        "Add Flight";


    flightModal.classList.add("show");

}


/* =====================================================
   OPEN EDIT FLIGHT MODAL
===================================================== */

async function editFlight(flightID) {

    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/flights/${flightID}`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to get flight"
            );

        }


        const flight =
            await response.json();


        flightIdInput.value =
            flight.FlightID;


        document.getElementById(
            "flight-number"
        ).value =
            flight.FlightNumber;


        document.getElementById(
            "airline-name"
        ).value =
            flight.AirlineName;


        document.getElementById(
            "source"
        ).value =
            flight.Source;


        document.getElementById(
            "destination"
        ).value =
            flight.Destination;


        document.getElementById(
            "departure-time"
        ).value =
            formatTimeForInput(
                flight.DepartureTime
            );


        document.getElementById(
            "arrival-time"
        ).value =
            formatTimeForInput(
                flight.ArrivalTime
            );


        document.getElementById(
            "duration"
        ).value =
            flight.Duration;


        document.getElementById(
            "fare"
        ).value =
            flight.Fare;


        document.getElementById(
            "aircraft-id"
        ).value =
            flight.AircraftID || "";


        document.getElementById(
            "flight-status"
        ).value =
            flight.Status;


        modalTitle.textContent =
            "Edit Flight";


        flightModal.classList.add("show");


    } catch (error) {

        console.error(
            "Edit flight error:",
            error
        );


        showAlert(
            "Error",
            "Unable to load flight details.",
            "❌"
        );

    }

}


/* =====================================================
   SAVE FLIGHT
===================================================== */

flightForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const flightID =
            flightIdInput.value;


        const flightData = {

            FlightNumber:
                document.getElementById(
                    "flight-number"
                ).value.trim(),

            AirlineName:
                document.getElementById(
                    "airline-name"
                ).value.trim(),

            Source:
                document.getElementById(
                    "source"
                ).value.trim(),

            Destination:
                document.getElementById(
                    "destination"
                ).value.trim(),

            DepartureTime:
                document.getElementById(
                    "departure-time"
                ).value,

            ArrivalTime:
                document.getElementById(
                    "arrival-time"
                ).value,

            Duration:
                document.getElementById(
                    "duration"
                ).value.trim(),

            Fare:
                Number(
                    document.getElementById(
                        "fare"
                    ).value
                ),

            AircraftID:
                document.getElementById(
                    "aircraft-id"
                ).value,

            Status:
                document.getElementById(
                    "flight-status"
                ).value

        };


        /* =========================
           BASIC VALIDATION
        ========================== */

        if (
            flightData.Source.toLowerCase() ===
            flightData.Destination.toLowerCase()
        ) {

            showAlert(
                "Invalid Route",
                "From and To locations cannot be the same.",
                "⚠️"
            );

            return;

        }


        try {

            let response;


            /* =========================
               ADD
            ========================== */

            if (!flightID) {

                response =
                    await fetch(
                        `${API_URL}/api/admin/flights`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    flightData
                                )
                        }
                    );

            }


            /* =========================
               EDIT
            ========================== */

            else {

                response =
                    await fetch(
                        `${API_URL}/api/admin/flights/${flightID}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    flightData
                                )
                        }
                    );

            }


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to save flight"
                );

            }


            closeModal();


            await loadFlights();


            showAlert(
                "Success",
                flightID
                    ? "Flight updated successfully."
                    : "Flight added successfully.",
                "✅"
            );


        } catch (error) {

            console.error(
                "Save flight error:",
                error
            );


            showAlert(
                "Unable to Save",
                error.message,
                "❌"
            );

        }

    }
);


/* =====================================================
   CANCEL FLIGHT
===================================================== */

async function cancelFlight(flightID) {

    const confirmed =
        confirm(
            "Are you sure you want to cancel this flight?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/admin/flights/${flightID}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to cancel flight"
            );

        }


        await loadFlights();


        showAlert(
            "Flight Cancelled",
            "The flight has been cancelled and the database has been updated.",
            "✅"
        );


    } catch (error) {

        console.error(
            "Cancel flight error:",
            error
        );


        showAlert(
            "Unable to Cancel",
            error.message,
            "❌"
        );

    }

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeModal() {

    flightModal.classList.remove(
        "show"
    );

}


/* =====================================================
   EVENT LISTENERS
===================================================== */

addFlightButton.addEventListener(
    "click",
    openAddFlightModal
);


closeModalButton.addEventListener(
    "click",
    closeModal
);


cancelModalButton.addEventListener(
    "click",
    closeModal
);


refreshButton.addEventListener(
    "click",
    function () {

        loadFlights();

    }
);


/* =====================================================
   CLOSE MODAL WHEN CLICKING OUTSIDE
===================================================== */

flightModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            flightModal
        ) {

            closeModal();

        }

    }
);


/* =====================================================
   LOGOUT
===================================================== */

logoutButton.addEventListener(
    "click",
    function () {

        localStorage.removeItem(
            "skybookUser"
        );

        window.location.href =
            "login.html";

    }
);


/* =====================================================
   TIME HELPERS
===================================================== */

function formatTime(time) {

    if (!time) {

        return "";

    }


    return String(time)
        .substring(0, 5);

}


function formatTimeForInput(time) {

    if (!time) {

        return "";

    }


    return String(time)
        .substring(0, 5);

}


/* =====================================================
   HTML SAFETY
===================================================== */

function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   LOAD ADMIN INFORMATION
===================================================== */

function loadAdminInformation() {

    const savedUser =
        localStorage.getItem(
            "skybookUser"
        );


    if (!savedUser) {

        /*
         * For now we don't redirect.
         * We'll add proper role authentication
         * when we update server.js.
         */

        return;

    }


    try {

        const user =
            JSON.parse(savedUser);


        if (user.role === "admin") {

            document.getElementById(
                "admin-name"
            ).textContent =
                user.Name ||
                "Administrator";

        }

    } catch (error) {

        console.error(
            "User information error:",
            error
        );

    }

}


/* =====================================================
   INITIALIZE DASHBOARD
===================================================== */

async function initializeDashboard() {

    loadAdminInformation();

    await loadAircraft();

    await loadFlights();

}


initializeDashboard();
const manageSeatsButton =
    document.getElementById("manage-seats-button");

if (manageSeatsButton) {

    manageSeatsButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "admin-seats.html";

        }
    );

}