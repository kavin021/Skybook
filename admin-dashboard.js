/* =====================================================
   SKYBOOK — ADMIN DASHBOARD
===================================================== */

(function () {
    "use strict";

    const {
        api, escapeHTML, formatMoney, formatTime, formatDate,
        formatDateTime, arrivesNextDay, setBusy, toast
    } = SkyBook;

    const $ = id => document.getElementById(id);

    let flights = [];
    let aircraftList = [];

    const STATUS_BADGE = {
        Available: "sb-badge-success",
        Full: "sb-badge-warn",
        Cancelled: "sb-badge-danger",
        Confirmed: "sb-badge-success"
    };

    function badge(status) {
        return `<span class="sb-badge ${STATUS_BADGE[status] || "sb-badge-muted"}">${escapeHTML(status)}</span>`;
    }

    /** Admin API errors: an expired login sends you back to the login page. */
    function handleError(title, error) {
        if (error.status === 401 || error.status === 403) {
            SkyBook.requireAdmin();
            return;
        }
        SkyBook.alert(title, error.message, "❌");
    }


    /* =================================================
       STATS
    ================================================= */

    async function loadStats() {
        try {
            const { stats } = await api("/api/admin/stats");
            $("stat-total").textContent = stats.totalFlights;
            $("stat-available").textContent = stats.availableFlights;
            $("stat-cancelled").textContent = stats.cancelledFlights;
            $("stat-bookings").textContent = stats.confirmedBookings;
            $("stat-revenue").textContent = formatMoney(stats.revenue);
        } catch (error) {
            handleError("Couldn't load statistics", error);
        }
    }


    /* =================================================
       FLIGHTS TABLE
    ================================================= */

    async function loadFlights() {
        try {
            ({ flights } = await api("/api/admin/flights"));
            renderFlights();

            const cities = [...new Set(flights.flatMap(f => [f.Source, f.Destination]))].sort();
            $("admin-cities").innerHTML = cities.map(c => `<option value="${escapeHTML(c)}">`).join("");
        } catch (error) {
            $("flight-table-body").innerHTML =
                `<tr><td colspan="9"><div class="sb-empty"><h3>Couldn't load flights</h3><p>${escapeHTML(error.message)}</p></div></td></tr>`;
            handleError("Couldn't load flights", error);
        }
    }

    function renderFlights() {
        const term = $("flight-filter").value.trim().toLowerCase();

        const visible = flights.filter(f =>
            !term ||
            [f.FlightNumber, f.AirlineName, f.Source, f.Destination]
                .some(v => String(v).toLowerCase().includes(term))
        );

        if (visible.length === 0) {
            $("flight-table-body").innerHTML = `
                <tr><td colspan="9">
                    <div class="sb-empty">
                        <div class="sb-empty-icon">✈️</div>
                        <h3>${flights.length ? "No flights match your search" : "No flights yet"}</h3>
                        <p>${flights.length ? "Try a different search." : "Add your first flight to get started."}</p>
                    </div>
                </td></tr>`;
            return;
        }

        $("flight-table-body").innerHTML = visible.map(f => {
            const nextDay = arrivesNextDay(f.DepartureTime, f.ArrivalTime);
            const cancelled = f.Status === "Cancelled";

            return `
                <tr class="${cancelled ? "row-muted" : ""}">
                    <td>
                        <div class="cell-strong">${escapeHTML(f.FlightNumber)}</div>
                        <div class="cell-sub">${escapeHTML(f.AirlineName)}</div>
                    </td>
                    <td class="cell-strong">${escapeHTML(f.Source)} → ${escapeHTML(f.Destination)}</td>
                    <td>${formatTime(f.DepartureTime)}</td>
                    <td>${formatTime(f.ArrivalTime)}${nextDay ? ' <span class="next-day">+1</span>' : ""}<div class="cell-sub">${escapeHTML(f.Duration)}</div></td>
                    <td>
                        <div>${escapeHTML(f.AircraftModel)}</div>
                        <div class="cell-sub">${f.Capacity} seats</div>
                    </td>
                    <td>${formatMoney(f.Fare)}</td>
                    <td>${cancelled ? "—" : `${f.SeatsAvailable} / ${f.Capacity}`}</td>
                    <td>${badge(f.Status)}</td>
                    <td>
                        <div class="action-buttons">
                            <button type="button" class="sb-btn sb-btn-secondary sb-btn-sm" data-action="edit" data-id="${f.FlightID}">Edit</button>
                            <a class="sb-btn sb-btn-secondary sb-btn-sm" href="admin-seats.html?flight=${f.FlightID}">Seats</a>
                            ${cancelled ? "" : `<button type="button" class="sb-btn sb-btn-ghost-danger sb-btn-sm" data-action="cancel" data-id="${f.FlightID}">Cancel</button>`}
                        </div>
                    </td>
                </tr>`;
        }).join("");
    }

    function onFlightTableClick(event) {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const flight = flights.find(f => String(f.FlightID) === button.dataset.id);
        if (!flight) return;

        if (button.dataset.action === "edit") openModal(flight);
        if (button.dataset.action === "cancel") cancelFlight(flight, button);
    }


    /* =================================================
       RECENT BOOKINGS
    ================================================= */

    async function loadBookings() {
        try {
            const { bookings } = await api("/api/admin/bookings", { query: { limit: 25 } });

            if (bookings.length === 0) {
                $("booking-table-body").innerHTML =
                    `<tr><td colspan="8"><div class="sb-empty"><h3>No bookings yet</h3></div></td></tr>`;
                return;
            }

            $("booking-table-body").innerHTML = bookings.map(b => `
                <tr class="clickable ${b.bookingStatus === "Cancelled" ? "row-muted" : ""}" data-booking="${b.bookingID}" tabindex="0">
                    <td class="cell-strong">#${b.bookingID}</td>
                    <td>${formatDate(b.travelDate)}</td>
                    <td>
                        <div class="cell-strong">${escapeHTML(b.flight.flightNumber)}</div>
                        <div class="cell-sub">${escapeHTML(b.flight.source)} → ${escapeHTML(b.flight.destination)}</div>
                    </td>
                    <td>
                        <div>${escapeHTML(b.passengers[0]?.name || "—")}</div>
                        <div class="cell-sub">${escapeHTML(b.passengers[0]?.email || "")}</div>
                    </td>
                    <td>${escapeHTML(b.passengers.map(p => p.seatNumber).join(", "))}</td>
                    <td>${formatMoney(b.totalFare)}</td>
                    <td>${badge(b.bookingStatus)}</td>
                    <td class="cell-sub">${formatDateTime(b.bookingDate)}</td>
                </tr>`).join("");
        } catch (error) {
            $("booking-table-body").innerHTML =
                `<tr><td colspan="8"><div class="sb-empty"><h3>Couldn't load bookings</h3><p>${escapeHTML(error.message)}</p></div></td></tr>`;
        }
    }

    function openBooking(event) {
        if (event.type === "keydown" && event.key !== "Enter") return;
        const row = event.target.closest("[data-booking]");
        if (row) location.href = `my-bookings.html?id=${row.dataset.booking}`;
    }


    /* =================================================
       AIRCRAFT
    ================================================= */

    async function loadAircraft() {
        try {
            ({ aircraft: aircraftList } = await api("/api/admin/aircraft"));

            $("aircraft-id").innerHTML =
                `<option value="">Select aircraft</option>` +
                aircraftList.map(a => `
                    <option value="${a.AircraftID}">
                        ${escapeHTML(a.AircraftName)} ${escapeHTML(a.AircraftModel)} · ${a.SeatCount} seats
                    </option>`).join("");
        } catch (error) {
            handleError("Couldn't load aircraft", error);
        }
    }


    /* =================================================
       ADD / EDIT MODAL
    ================================================= */

    function updateDuration() {
        const dep = $("departure-time").value;
        const arr = $("arrival-time").value;

        if (!dep || !arr) {
            $("duration").value = "";
            $("duration-hint").textContent = "";
            return;
        }

        const toMin = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
        let minutes = toMin(arr) - toMin(dep);
        const overnight = minutes <= 0;
        if (overnight) minutes += 24 * 60;

        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        $("duration").value = m ? `${h}h ${m}m` : `${h}h`;
        $("duration-hint").textContent = overnight ? "Arrives the next day." : "";
    }

    function openModal(flight = null) {
        const form = $("flight-form");
        form.reset();

        $("flight-id").value = flight ? flight.FlightID : "";
        $("modal-title").textContent = flight ? `Edit ${flight.FlightNumber}` : "Add flight";

        if (flight) {
            $("flight-number").value = flight.FlightNumber;
            $("airline-name").value = flight.AirlineName;
            $("source").value = flight.Source;
            $("destination").value = flight.Destination;
            $("departure-time").value = formatTime(flight.DepartureTime);
            $("arrival-time").value = formatTime(flight.ArrivalTime);
            $("fare").value = flight.Fare;
            $("aircraft-id").value = flight.AircraftID;
            $("flight-status").value = flight.Status;
        } else {
            $("airline-name").value = "SkyBook Airlines";
        }

        updateDuration();
        $("flight-modal").classList.add("show");
        $("flight-number").focus();
    }

    function closeModal() {
        $("flight-modal").classList.remove("show");
    }

    async function saveFlight(event) {
        event.preventDefault();

        const id = $("flight-id").value;
        const data = {
            FlightNumber: $("flight-number").value.trim().toUpperCase(),
            AirlineName: $("airline-name").value.trim(),
            Source: $("source").value.trim(),
            Destination: $("destination").value.trim(),
            DepartureTime: $("departure-time").value,
            ArrivalTime: $("arrival-time").value,
            Fare: Number($("fare").value),
            AircraftID: Number($("aircraft-id").value),
            Status: $("flight-status").value
        };

        const missing = !data.FlightNumber || !data.AirlineName || !data.Source ||
            !data.Destination || !data.DepartureTime || !data.ArrivalTime || !data.AircraftID;

        if (missing) {
            return SkyBook.alert("Missing details", "Please fill in every field.");
        }
        if (data.Source.toLowerCase() === data.Destination.toLowerCase()) {
            return SkyBook.alert("Check the route", "From and To can't be the same city.");
        }
        if (!(data.Fare > 0)) {
            return SkyBook.alert("Check the fare", "The fare must be more than zero.");
        }

        const button = $("save-flight");
        setBusy(button, true, "Saving…");

        try {
            const result = await api(id ? `/api/admin/flights/${id}` : "/api/admin/flights", {
                method: id ? "PUT" : "POST",
                body: data
            });

            closeModal();
            toast(result.message, "success");
            await Promise.all([loadFlights(), loadStats()]);
        } catch (error) {
            handleError("Couldn't save flight", error);
        } finally {
            setBusy(button, false);
        }
    }


    /* =================================================
       CANCEL FLIGHT
    ================================================= */

    async function cancelFlight(flight, button) {
        const ok = await SkyBook.confirm(
            `Cancel ${flight.FlightNumber}?`,
            `${flight.Source} → ${flight.Destination} will stop taking bookings, and every existing booking on this flight will be cancelled and marked for refund.\n\nThis can't be undone.`,
            { confirmLabel: "Cancel flight", cancelLabel: "Keep flight", icon: "🚫", danger: true }
        );
        if (!ok) return;

        setBusy(button, true, "…");

        try {
            const result = await api(`/api/admin/flights/${flight.FlightID}`, { method: "DELETE" });
            SkyBook.alert("Flight cancelled", result.message, "✅");
            await Promise.all([loadFlights(), loadStats(), loadBookings()]);
        } catch (error) {
            setBusy(button, false);
            handleError("Couldn't cancel flight", error);
        }
    }


    /* =================================================
       START
    ================================================= */

    function init() {
        if (!SkyBook.session.isAdmin()) return;

        $("add-flight-button").addEventListener("click", () => openModal());
        $("refresh-button").addEventListener("click", () => {
            loadFlights();
            loadStats();
            loadBookings();
        });
        $("flight-filter").addEventListener("input", renderFlights);
        $("flight-table-body").addEventListener("click", onFlightTableClick);
        $("booking-table-body").addEventListener("click", openBooking);
        $("booking-table-body").addEventListener("keydown", openBooking);

        $("close-modal").addEventListener("click", closeModal);
        $("cancel-modal").addEventListener("click", closeModal);
        $("flight-modal").addEventListener("click", e => {
            if (e.target === $("flight-modal")) closeModal();
        });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && $("flight-modal").classList.contains("show")) closeModal();
        });

        $("departure-time").addEventListener("input", updateDuration);
        $("arrival-time").addEventListener("input", updateDuration);
        $("flight-form").addEventListener("submit", saveFlight);

        loadStats();
        loadAircraft();
        loadFlights();
        loadBookings();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
