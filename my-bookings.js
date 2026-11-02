/* =====================================================
   SKYBOOK — MY BOOKINGS
   • Logged-in users see all their trips.
   • Anyone can find a booking with its ID + a passenger's email.
   • Confirmed, upcoming bookings can be cancelled.
===================================================== */

(function () {
    "use strict";

    const {
        api, session, escapeHTML, formatMoney, formatTime, formatDate,
        today, plural, setBusy, toast, EMAIL_RE
    } = SkyBook;
    const { renderTicket, badge } = SkyBookTicket;

    const $ = id => document.getElementById(id);

    let myBookings = [];
    let filter = "upcoming";
    let current = null;        // { booking, email } shown in the detail panel


    /* =================================================
       LOGGED-IN TRIPS
    ================================================= */

    async function loadMyTrips() {
        const user = session.user;
        if (!user || user.role !== "user") return;

        $("my-trips").hidden = false;
        $("intro-text").textContent = `Signed in as ${user.email}. Booked as a guest? Look it up below.`;
        $("lookup-title").textContent = "Find another booking";
        $("trip-list").innerHTML = `<div class="sb-loading">Loading your trips…</div>`;

        try {
            const { bookings } = await api("/api/my-bookings");
            myBookings = bookings;
            renderTrips();
        } catch (error) {
            $("trip-list").innerHTML =
                `<div class="sb-card sb-empty"><h3>Couldn't load your trips</h3><p>${escapeHTML(error.message)}</p></div>`;
        }
    }

    function isUpcoming(booking) {
        return booking.bookingStatus === "Confirmed" && booking.travelDate >= today();
    }

    function renderTrips() {
        const list = myBookings
            .filter(b => (filter === "upcoming") === isUpcoming(b))
            .sort((a, b) => filter === "upcoming"
                ? a.travelDate.localeCompare(b.travelDate)
                : b.travelDate.localeCompare(a.travelDate));

        if (list.length === 0) {
            $("trip-list").innerHTML = `
                <div class="sb-card sb-empty">
                    <div class="sb-empty-icon">${filter === "upcoming" ? "🧳" : "🗂️"}</div>
                    <h3>${filter === "upcoming" ? "No upcoming trips" : "Nothing here yet"}</h3>
                    ${filter === "upcoming" ? `<p><a href="index.html">Search for a flight</a> to plan your next journey.</p>` : ""}
                </div>`;
            return;
        }

        $("trip-list").innerHTML = list.map(b => `
            <button type="button" class="trip-card sb-card" data-booking="${b.bookingID}">
                <div class="trip-date">
                    <strong>${formatDate(b.travelDate, { day: "numeric" })}</strong>
                    <span>${formatDate(b.travelDate, { month: "short", year: "numeric" })}</span>
                </div>
                <div class="trip-main">
                    <strong>${escapeHTML(b.flight.source)} → ${escapeHTML(b.flight.destination)}</strong>
                    <span>${escapeHTML(b.flight.flightNumber)} · ${formatTime(b.flight.departureTime)} · ${plural(b.passengerCount, "passenger")} · Seats ${escapeHTML(b.passengers.map(p => p.seatNumber).join(", "))}</span>
                </div>
                <div class="trip-side">
                    ${badge(b.bookingStatus)}
                    <strong>${formatMoney(b.totalFare)}</strong>
                </div>
            </button>`).join("");
    }

    function onTabClick(event) {
        const tab = event.target.closest("[data-filter]");
        if (!tab) return;

        filter = tab.dataset.filter;
        document.querySelectorAll(".trip-tab").forEach(t => {
            const active = t === tab;
            t.classList.toggle("active", active);
            t.setAttribute("aria-selected", String(active));
        });
        renderTrips();
    }

    function onTripClick(event) {
        const card = event.target.closest("[data-booking]");
        if (!card) return;

        const booking = myBookings.find(b => String(b.bookingID) === card.dataset.booking);
        if (booking) showBooking(booking, null);
    }


    /* =================================================
       LOOK UP BY ID + EMAIL
    ================================================= */

    async function onLookup(event) {
        event?.preventDefault();

        const id = $("booking-id").value.trim();
        const email = $("lookup-email").value.trim();
        const signedIn = !!session.user;

        if (!/^\d+$/.test(id)) {
            return SkyBook.alert("Booking ID needed", "Please enter the number from your confirmation (e.g. 12).", "🎫");
        }
        if (!signedIn && !EMAIL_RE.test(email)) {
            return SkyBook.alert("Email needed", "Please enter the email address of a passenger on this booking.", "📧");
        }

        const button = $("lookup-button");
        setBusy(button, true, "Searching…");

        try {
            const { booking } = await api(`/api/bookings/${id}`, { query: { email } });
            showBooking(booking, email);
        } catch (error) {
            $("booking-detail").hidden = true;
            SkyBook.alert(
                "Booking not found",
                error.status === 404
                    ? "We couldn't find a booking with that ID and email. Please check both and try again."
                    : error.message,
                "🔎"
            );
        } finally {
            setBusy(button, false);
        }
    }


    /* =================================================
       DETAIL + CANCEL
    ================================================= */

    function showBooking(booking, email) {
        current = { booking, email };

        const footer = `
            <button type="button" class="sb-btn sb-btn-secondary" data-action="print">🖨️ Print</button>
            ${booking.canCancel
                ? `<button type="button" class="sb-btn sb-btn-ghost-danger" data-action="cancel">Cancel booking</button>`
                : ""}
            <button type="button" class="sb-btn sb-btn-secondary" data-action="close">Close</button>`;

        const detail = $("booking-detail");
        detail.innerHTML = renderTicket(booking, { footer });
        detail.hidden = false;
        detail.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function onDetailClick(event) {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (!action || !current) return;

        if (action === "print") {
            window.print();
        } else if (action === "close") {
            $("booking-detail").hidden = true;
            current = null;
        } else if (action === "cancel") {
            await cancelBooking(event.target.closest("button"));
        }
    }

    async function cancelBooking(button) {
        const { booking, email } = current;

        const ok = await SkyBook.confirm(
            `Cancel booking #${booking.bookingID}?`,
            `${plural(booking.passengerCount, "seat")} on ${booking.flight.flightNumber} (${formatDate(booking.travelDate)}) will be released and ${formatMoney(booking.totalFare)} marked for refund. This can't be undone.`,
            { confirmLabel: "Yes, cancel it", cancelLabel: "Keep booking", icon: "⚠️", danger: true }
        );
        if (!ok) return;

        setBusy(button, true, "Cancelling…");

        try {
            const result = await api(`/api/bookings/${booking.bookingID}/cancel`, {
                method: "POST",
                body: { email: email || "" }
            });

            toast(result.message, "success");
            showBooking(result.booking, email);

            const index = myBookings.findIndex(b => b.bookingID === booking.bookingID);
            if (index !== -1) {
                myBookings[index] = result.booking;
                renderTrips();
            }
        } catch (error) {
            setBusy(button, false);
            SkyBook.alert("Couldn't cancel", error.message, "❌");
        }
    }


    /* =================================================
       START
    ================================================= */

    function init() {
        $("lookup-form").addEventListener("submit", onLookup);
        $("booking-id").addEventListener("input", e => {
            e.target.value = e.target.value.replace(/\D/g, "");
        });
        document.querySelector(".trip-tabs").addEventListener("click", onTabClick);
        $("trip-list").addEventListener("click", onTripClick);
        $("booking-detail").addEventListener("click", onDetailClick);

        loadMyTrips();

        // Links from the confirmation page: my-bookings.html?id=12&email=...
        const params = new URLSearchParams(location.search);
        if (params.get("id")) {
            $("booking-id").value = params.get("id");
            $("lookup-email").value = params.get("email") || "";
            onLookup();
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
