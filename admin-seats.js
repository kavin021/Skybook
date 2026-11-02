/* =====================================================
   SKYBOOK — ADMIN SEAT MANAGEMENT
   Blocks are per flight (all dates). Bookings are shown
   for the chosen date.
===================================================== */

(function () {
    "use strict";

    const { api, escapeHTML, today, addDays, toast } = SkyBook;

    const $ = id => document.getElementById(id);
    const SEAT_LETTERS = ["A", "B", "C", "D", "E", "F"];

    let flights = [];
    let seats = [];
    let busy = false;

    function currentFlight() {
        return flights.find(f => String(f.FlightID) === $("flight-select").value) || null;
    }

    function handleError(error) {
        if (error.status === 401 || error.status === 403) {
            SkyBook.requireAdmin();
            return;
        }
        toast(error.message, "error");
    }


    /* =================================================
       FLIGHTS
    ================================================= */

    async function loadFlights() {
        try {
            ({ flights } = await api("/api/admin/flights"));

            $("flight-select").innerHTML =
                `<option value="">Select a flight…</option>` +
                flights.map(f => `
                    <option value="${f.FlightID}">
                        ${escapeHTML(f.FlightNumber)} · ${escapeHTML(f.Source)} → ${escapeHTML(f.Destination)} · ${f.DepartureTime}${f.Status !== "Available" ? ` (${escapeHTML(f.Status)})` : ""}
                    </option>`).join("");

            // admin-seats.html?flight=3 (from the dashboard "Seats" button)
            const wanted = new URLSearchParams(location.search).get("flight");
            if (wanted && flights.some(f => String(f.FlightID) === wanted)) {
                $("flight-select").value = wanted;
                await loadSeats();
            }
        } catch (error) {
            $("flight-select").innerHTML = `<option value="">Couldn't load flights</option>`;
            handleError(error);
        }
    }


    /* =================================================
       SEATS
    ================================================= */

    async function loadSeats() {
        const flight = currentFlight();

        $("flight-info").hidden = !flight;
        $("seat-section").hidden = !flight;
        $("seat-placeholder").hidden = !!flight;

        if (!flight) return;

        // Keep the URL in sync so a refresh stays on this flight.
        history.replaceState(null, "", `?flight=${flight.FlightID}`);

        $("info-flight").textContent = flight.FlightNumber;
        $("info-route").textContent = `${flight.Source} → ${flight.Destination}`;
        $("info-aircraft").textContent = `${flight.AircraftName} ${flight.AircraftModel}`;
        $("seat-map").innerHTML = `<div class="sb-loading">Loading seats…</div>`;

        try {
            ({ seats } = await api(`/api/admin/flights/${flight.FlightID}/seats`, {
                query: { date: $("seat-date").value }
            }));
            renderSeats();
        } catch (error) {
            $("seat-map").innerHTML = `<div class="sb-empty"><h3>Couldn't load seats</h3><p>${escapeHTML(error.message)}</p></div>`;
            handleError(error);
        }
    }

    function renderSeats() {
        const count = status => seats.filter(s => s.CurrentStatus === status).length;
        $("info-available").textContent = count("Available");
        $("info-booked").textContent = count("Booked");
        $("info-blocked").textContent = count("Blocked");

        const rows = new Map();
        for (const seat of seats) {
            const match = /^(\d+)([A-F])$/.exec(seat.SeatNumber);
            if (!match) continue;
            const row = Number(match[1]);
            if (!rows.has(row)) rows.set(row, {});
            rows.get(row)[match[2]] = seat;
        }

        $("seat-map").innerHTML = [...rows.keys()].sort((a, b) => a - b).map(rowNumber => {
            const row = rows.get(rowNumber);

            const cells = SEAT_LETTERS.map(letter => {
                const seat = row[letter];
                let cell;

                if (!seat) {
                    cell = `<span class="seat-empty"></span>`;
                } else {
                    const maintenance = seat.BlockScope === "aircraft";
                    const css = maintenance ? "maintenance" : seat.CurrentStatus.toLowerCase();
                    const locked = seat.CurrentStatus === "Booked" || maintenance;
                    const title = maintenance
                        ? "Out of service for the whole aircraft"
                        : seat.CurrentStatus === "Booked"
                            ? "Booked on the selected date"
                            : seat.CurrentStatus === "Blocked" ? "Blocked — click to release" : "Available — click to block";

                    cell = `
                        <button type="button" class="seat ${css}" data-seat-id="${seat.SeatID}"
                                title="${seat.SeatNumber}: ${title}" aria-label="Seat ${seat.SeatNumber}, ${title}"
                                ${locked ? "disabled" : ""}>${letter}</button>`;
                }

                return letter === "C" ? cell + `<span class="aisle">${rowNumber}</span>` : cell;
            }).join("");

            return `<div class="seat-row">${cells}</div>`;
        }).join("");
    }

    async function onSeatClick(event) {
        const button = event.target.closest("[data-seat-id]");
        if (!button || button.disabled || busy) return;

        const flight = currentFlight();
        const seat = seats.find(s => String(s.SeatID) === button.dataset.seatId);
        if (!flight || !seat) return;

        const block = seat.CurrentStatus === "Available";

        busy = true;
        button.disabled = true;

        try {
            const result = await api(`/api/admin/flights/${flight.FlightID}/seats/${seat.SeatID}`, {
                method: "PUT",
                body: { blocked: block }
            });
            toast(result.message, "success");

            // Update locally instead of reloading the whole map.
            seat.CurrentStatus = block ? "Blocked" : "Available";
            seat.BlockScope = block ? "flight" : null;
            renderSeats();
        } catch (error) {
            button.disabled = false;
            handleError(error);
        } finally {
            busy = false;
        }
    }


    /* =================================================
       START
    ================================================= */

    function init() {
        if (!SkyBook.session.isAdmin()) return;

        const date = $("seat-date");
        date.value = today();
        date.min = addDays(today(), -365);
        date.max = addDays(today(), 365);

        $("flight-select").addEventListener("change", loadSeats);
        date.addEventListener("change", loadSeats);
        $("seat-map").addEventListener("click", onSeatClick);

        loadFlights();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
