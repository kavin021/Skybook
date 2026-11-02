/* =====================================================
   SKYBOOK — SEARCH & BOOKING FLOW (index.html)

   1. Search flights for a route + date
   2. Enter passenger details
   3. Pick one seat per passenger
   4. Confirm → booking-confirmed.html
===================================================== */

(function () {
    "use strict";

    const {
        api, session, escapeHTML, formatMoney, formatTime, formatDate,
        arrivesNextDay, today, addDays, plural, setBusy, toast,
        EMAIL_RE, PHONE_RE
    } = SkyBook;

    const MAX_PASSENGERS = 9;
    const SEAT_LETTERS = ["A", "B", "C", "D", "E", "F"];

    const $ = id => document.getElementById(id);

    const state = {
        search: null,        // { from, to, date, count }
        flights: [],
        flight: null,        // selected flight
        passengers: [],      // [{ name, email, phone }]
        seats: [],           // ["3A", "3B"] in passenger order
        seatMap: []
    };


    /* =================================================
       SET UP
    ================================================= */

    function init() {
        const passengerSelect = $("passengers");
        for (let i = 1; i <= MAX_PASSENGERS; i++) {
            passengerSelect.add(new Option(plural(i, "Adult"), i));
        }

        const departure = $("departure");
        departure.min = today();
        departure.max = addDays(today(), 365);
        departure.value = today();

        $("search-form").addEventListener("submit", onSearch);
        $("swap-cities").addEventListener("click", swapCities);
        $("flight-list").addEventListener("click", onFlightListClick);
        $("passenger-form").addEventListener("submit", onPassengersSubmit);
        $("passenger-list").addEventListener("input", onPassengerInput);
        $("seat-map").addEventListener("click", onSeatClick);
        $("confirm-booking").addEventListener("click", confirmBooking);
        $("back-to-passengers").addEventListener("click", () => {
            showStep(2);
            $("passenger-section").scrollIntoView({ behavior: "smooth", block: "start" });
        });

        loadCities();
    }

    async function loadCities() {
        try {
            const { cities } = await api("/api/cities");
            $("city-list").innerHTML = cities
                .map(c => `<option value="${escapeHTML(c)}"></option>`)
                .join("");
        } catch {
            /* suggestions are optional */
        }
    }

    function swapCities() {
        const from = $("from");
        const to = $("to");
        [from.value, to.value] = [to.value, from.value];
    }


    /* =================================================
       STEP INDICATOR
    ================================================= */

    function showStep(step) {
        $("steps").hidden = false;

        document.querySelectorAll("#steps li").forEach(li => {
            const n = Number(li.dataset.step);
            li.classList.toggle("done", n < step);
            li.classList.toggle("active", n === step);
        });

        $("flight-results").hidden = false;
        $("passenger-section").hidden = step < 2;
        $("seat-section").hidden = step < 3;
    }


    /* =================================================
       1. SEARCH
    ================================================= */

    async function onSearch(event) {
        event.preventDefault();

        const from = $("from").value.trim();
        const to = $("to").value.trim();
        const date = $("departure").value;
        const count = Number($("passengers").value) || 1;

        if (!from || !to || !date) {
            return SkyBook.alert("Missing information", "Please enter where you're flying from, where to, and the date.");
        }
        if (from.toLowerCase() === to.toLowerCase()) {
            return SkyBook.alert("Check your route", "From and To can't be the same city.");
        }
        if (date < today()) {
            return SkyBook.alert("Date in the past", "Please choose today or a later date.", "📅");
        }

        const button = $("search-button");
        setBusy(button, true, "Searching…");

        state.search = { from, to, date, count };
        state.flight = null;
        state.seats = [];

        try {
            const { flights } = await api("/api/flights", { query: { from, to, date } });
            state.flights = flights;
            renderFlights();
            showStep(1);
            $("flight-results").scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
            SkyBook.alert("Search failed", error.message);
        } finally {
            setBusy(button, false);
        }
    }

    function renderFlights() {
        const { from, to, date, count } = state.search;
        const list = $("flight-list");

        $("results-summary").textContent =
            `${from} → ${to} · ${formatDate(date)} · ${plural(count, "passenger")}`;

        if (state.flights.length === 0) {
            list.innerHTML = `
                <div class="sb-card sb-empty">
                    <div class="sb-empty-icon">🛫</div>
                    <h3>No flights found</h3>
                    <p>There are no flights from ${escapeHTML(from)} to ${escapeHTML(to)}. Try another route.</p>
                </div>`;
            return;
        }

        list.innerHTML = state.flights.map(flight => {
            const enough = flight.SeatsAvailable >= count;
            const low = flight.SeatsAvailable <= 10;
            const nextDay = arrivesNextDay(flight.DepartureTime, flight.ArrivalTime);

            return `
                <article class="flight-card sb-card" data-flight-card="${escapeHTML(flight.FlightNumber)}">
                    <div class="airline-info">
                        <div class="airline-name">${escapeHTML(flight.AirlineName)}</div>
                        <div class="flight-meta">${escapeHTML(flight.FlightNumber)} · ${escapeHTML(flight.AircraftModel)}</div>
                    </div>

                    <div class="flight-route">
                        <div class="time-location">
                            <strong>${formatTime(flight.DepartureTime)}</strong>
                            <span>${escapeHTML(flight.Source)}</span>
                        </div>
                        <div class="flight-duration">
                            <span>${escapeHTML(flight.Duration)}</span>
                            <div class="flight-line" aria-hidden="true"></div>
                            <span>Direct</span>
                        </div>
                        <div class="time-location">
                            <strong>${formatTime(flight.ArrivalTime)}${nextDay ? '<sup title="Arrives the next day">+1</sup>' : ""}</strong>
                            <span>${escapeHTML(flight.Destination)}</span>
                        </div>
                    </div>

                    <div class="flight-price">
                        <strong>${formatMoney(flight.Fare)}</strong>
                        <span class="per-person">per passenger</span>
                        <span class="seats-left ${low ? "low" : ""}">
                            ${flight.SeatsAvailable === 0 ? "Sold out" : plural(flight.SeatsAvailable, "seat") + " left"}
                        </span>
                        <button type="button" class="sb-btn sb-btn-primary sb-btn-sm select-flight"
                                data-flight="${escapeHTML(flight.FlightNumber)}" ${enough ? "" : "disabled"}>
                            ${enough ? "Select" : "Not enough seats"}
                        </button>
                    </div>
                </article>`;
        }).join("");
    }

    function onFlightListClick(event) {
        const button = event.target.closest("[data-flight]");
        if (!button || button.disabled) return;
        selectFlight(button.dataset.flight);
    }


    /* =================================================
       2. PASSENGERS
    ================================================= */

    function selectFlight(flightNumber) {
        const flight = state.flights.find(f => f.FlightNumber === flightNumber);
        if (!flight) return;

        const changedFlight = state.flight?.FlightNumber !== flight.FlightNumber;
        state.flight = flight;
        if (changedFlight) state.seats = [];

        document.querySelectorAll("[data-flight-card]").forEach(card => {
            card.classList.toggle("selected", card.dataset.flightCard === flightNumber);
        });

        $("passenger-summary").textContent =
            `${flight.FlightNumber} · ${formatTime(flight.DepartureTime)} ${flight.Source} → ${flight.Destination}`;

        buildPassengerForms();
        showStep(2);
        $("passenger-section").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function buildPassengerForms() {
        const count = state.search.count;
        const user = session.user;

        // Keep anything already typed; pre-fill passenger 1 from the account.
        const existing = state.passengers.slice(0, count);
        if (!existing[0] && user && user.role === "user") {
            existing[0] = { name: user.name, email: user.email, phone: user.phone || "" };
        }

        $("passenger-list").innerHTML = Array.from({ length: count }, (_, i) => {
            const p = existing[i] || { name: "", email: "", phone: "" };
            const n = i + 1;

            return `
                <fieldset class="passenger-card-item">
                    <legend><span class="badge-num">${n}</span> Passenger ${n}${n === 1 ? " <small>(lead)</small>" : ""}</legend>

                    <div class="sb-field">
                        <label for="p-name-${n}">Full name</label>
                        <input id="p-name-${n}" data-field="name" data-index="${i}" autocomplete="${n === 1 ? "name" : "off"}"
                               placeholder="As on ID proof" value="${escapeHTML(p.name)}" maxlength="100">
                        <span class="sb-field-error" id="p-name-${n}-error"></span>
                    </div>

                    <div class="sb-field">
                        <label for="p-email-${n}">Email</label>
                        <input id="p-email-${n}" type="email" data-field="email" data-index="${i}" autocomplete="${n === 1 ? "email" : "off"}"
                               placeholder="name@example.com" value="${escapeHTML(p.email)}" maxlength="100">
                        <span class="sb-field-error" id="p-email-${n}-error"></span>
                    </div>

                    <div class="sb-field">
                        <label for="p-phone-${n}">Phone</label>
                        <input id="p-phone-${n}" type="tel" inputmode="numeric" data-field="phone" data-index="${i}" autocomplete="${n === 1 ? "tel-national" : "off"}"
                               placeholder="10-digit mobile number" value="${escapeHTML(p.phone)}" maxlength="10">
                        <span class="sb-field-error" id="p-phone-${n}-error"></span>
                    </div>
                </fieldset>`;
        }).join("");
    }

    function onPassengerInput(event) {
        const input = event.target;
        if (input.dataset.field === "phone") {
            input.value = input.value.replace(/\D/g, "").slice(0, 10);
        }
        // Clear the error as soon as the user edits the field.
        setFieldError(input, "");
    }

    function setFieldError(input, message) {
        const field = input.closest(".sb-field");
        field.classList.toggle("invalid", !!message);
        const error = document.getElementById(input.id + "-error");
        if (error) error.textContent = message;
        input.setAttribute("aria-invalid", message ? "true" : "false");
    }

    /** Reads and validates every passenger form. Returns null if anything is wrong. */
    function collectPassengers() {
        const passengers = [];
        let firstInvalid = null;

        for (let n = 1; n <= state.search.count; n++) {
            const nameInput = $(`p-name-${n}`);
            const emailInput = $(`p-email-${n}`);
            const phoneInput = $(`p-phone-${n}`);

            const name = nameInput.value.trim().replace(/\s+/g, " ");
            const email = emailInput.value.trim();
            const phone = phoneInput.value.trim();

            const checks = [
                [nameInput, name.length >= 2 ? "" : "Please enter the full name."],
                [emailInput, EMAIL_RE.test(email) ? "" : "Please enter a valid email."],
                [phoneInput, PHONE_RE.test(phone) ? "" : "Please enter a 10-digit phone number."]
            ];

            for (const [input, message] of checks) {
                setFieldError(input, message);
                if (message && !firstInvalid) firstInvalid = input;
            }

            passengers.push({ name, email, phone });
        }

        if (firstInvalid) {
            firstInvalid.focus();
            return null;
        }
        return passengers;
    }

    async function onPassengersSubmit(event) {
        event.preventDefault();

        const passengers = collectPassengers();
        if (!passengers) return;

        state.passengers = passengers;
        state.seats = state.seats.slice(0, passengers.length);

        renderFlightInfo();
        showStep(3);
        $("seat-section").scrollIntoView({ behavior: "smooth", block: "start" });

        await loadSeats();
    }


    /* =================================================
       3. SEATS
    ================================================= */

    function renderFlightInfo() {
        const f = state.flight;
        const { date, count } = state.search;
        const nextDay = arrivesNextDay(f.DepartureTime, f.ArrivalTime);

        $("selected-flight-info").innerHTML = `
            <div><span>Flight</span><strong>${escapeHTML(f.FlightNumber)}</strong></div>
            <div><span>Route</span><strong>${escapeHTML(f.Source)} → ${escapeHTML(f.Destination)}</strong></div>
            <div><span>Date</span><strong>${formatDate(date)}</strong></div>
            <div><span>Time</span><strong>${formatTime(f.DepartureTime)} – ${formatTime(f.ArrivalTime)}${nextDay ? " (+1)" : ""}</strong></div>
            <div><span>Passengers</span><strong>${count}</strong></div>`;
    }

    async function loadSeats() {
        const map = $("seat-map");
        map.innerHTML = `<div class="sb-loading">Loading seats…</div>`;

        try {
            const { seats } = await api(
                `/api/flights/${encodeURIComponent(state.flight.FlightNumber)}/seats`,
                { query: { date: state.search.date } }
            );

            state.seatMap = seats;

            // Drop any previously chosen seat that's no longer free.
            const free = new Set(seats.filter(s => s.CurrentStatus === "Available").map(s => s.SeatNumber));
            const lost = state.seats.filter(s => !free.has(s));
            state.seats = state.seats.filter(s => free.has(s));
            if (lost.length) {
                toast(`Seat ${lost.join(", ")} was taken — please pick again.`, "error");
            }

            renderSeats();
        } catch (error) {
            map.innerHTML = `<div class="sb-empty"><h3>Couldn't load seats</h3><p>${escapeHTML(error.message)}</p></div>`;
        }
    }

    function renderSeats() {
        const rows = new Map();

        for (const seat of state.seatMap) {
            const match = /^(\d+)([A-F])$/.exec(seat.SeatNumber);
            if (!match) continue;
            const row = Number(match[1]);
            if (!rows.has(row)) rows.set(row, {});
            rows.get(row)[match[2]] = seat;
        }

        const html = [...rows.keys()].sort((a, b) => a - b).map(rowNumber => {
            const row = rows.get(rowNumber);

            const cells = SEAT_LETTERS.map(letter => {
                const seat = row[letter];
                let cell;

                if (!seat) {
                    cell = `<span class="seat-empty"></span>`;
                } else {
                    const selectedIndex = state.seats.indexOf(seat.SeatNumber);
                    const status = selectedIndex !== -1 ? "selected" : seat.CurrentStatus.toLowerCase();
                    const unavailable = seat.CurrentStatus !== "Available";
                    const label = selectedIndex !== -1
                        ? `Seat ${seat.SeatNumber}, selected for passenger ${selectedIndex + 1}`
                        : `Seat ${seat.SeatNumber}, ${unavailable ? (seat.CurrentStatus === "Booked" ? "booked" : "unavailable") : "available"}`;

                    cell = `
                        <button type="button" class="seat ${status}" data-seat="${seat.SeatNumber}"
                                aria-label="${label}" aria-pressed="${selectedIndex !== -1}"
                                ${unavailable ? "disabled" : ""}>
                            ${selectedIndex !== -1 ? `<span class="seat-pax">P${selectedIndex + 1}</span>` : letter}
                        </button>`;
                }

                return letter === "C"
                    ? cell + `<span class="aisle">${rowNumber}</span>`
                    : cell;
            }).join("");

            return `<div class="seat-row">${cells}</div>`;
        }).join("");

        $("seat-map").innerHTML = html || `<div class="sb-empty"><h3>No seats configured</h3></div>`;
        updateSeatSummary();
    }

    function onSeatClick(event) {
        const button = event.target.closest("[data-seat]");
        if (!button || button.disabled) return;

        const seatNumber = button.dataset.seat;
        const count = state.search.count;
        const index = state.seats.indexOf(seatNumber);

        if (index !== -1) {
            state.seats.splice(index, 1);
        } else if (state.seats.length < count) {
            state.seats.push(seatNumber);
        } else if (count === 1) {
            state.seats = [seatNumber]; // single passenger: just move the seat
        } else {
            toast(`All ${count} seats are chosen. Tap a selected seat to free it first.`);
            return;
        }

        renderSeats();
    }

    function updateSeatSummary() {
        const count = state.search.count;
        const chosen = state.seats.length;

        $("selected-seats").textContent = chosen ? state.seats.join(", ") : "None selected";
        $("seat-count").textContent = `(${chosen} of ${count})`;
        $("total-fare").textContent = formatMoney(state.flight.Fare * count);

        $("seat-assignments").innerHTML = state.passengers.map((p, i) => `
            <li>
                <span class="badge-num">${i + 1}</span>
                <span class="assignment-name">${escapeHTML(p.name)}</span>
                <strong class="${state.seats[i] ? "" : "pending"}">${state.seats[i] || "No seat yet"}</strong>
            </li>`).join("");

        const button = $("confirm-booking");
        button.disabled = chosen !== count;
        button.innerHTML = chosen === count
            ? `Confirm &amp; Pay ${formatMoney(state.flight.Fare * count)} ✓`
            : `Select ${plural(count - chosen, "more seat")}`;
    }


    /* =================================================
       4. CONFIRM
    ================================================= */

    async function confirmBooking() {
        const button = $("confirm-booking");
        if (button.disabled) return;

        const { date, count } = state.search;

        if (state.seats.length !== count) {
            return SkyBook.alert("Seats missing", `Please choose ${plural(count, "seat")}.`);
        }

        setBusy(button, true, "Confirming your booking…");

        try {
            const { booking } = await api("/api/bookings", {
                method: "POST",
                body: {
                    flightNumber: state.flight.FlightNumber,
                    travelDate: date,
                    passengers: state.passengers,
                    seats: state.seats
                }
            });

            // The confirmation page reads this, and it lets a guest
            // look the booking up again later.
            localStorage.setItem("lastBooking", JSON.stringify({
                booking,
                email: state.passengers[0].email
            }));

            location.href = "booking-confirmed.html";
        } catch (error) {
            setBusy(button, false);

            if (error.status === 409) {
                await SkyBook.alert("Seat no longer available", error.message, "💺");
                await loadSeats();
            } else {
                SkyBook.alert("Booking failed", error.message, "❌");
            }
        }
    }


    document.addEventListener("DOMContentLoaded", init);
})();
