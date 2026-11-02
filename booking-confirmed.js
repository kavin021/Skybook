/* =====================================================
   SKYBOOK — BOOKING CONFIRMED PAGE
   Shows the booking saved by script.js right after
   checkout, then refreshes it from the server.
===================================================== */

(function () {
    "use strict";

    const { api, escapeHTML, plural, formatDate } = SkyBook;
    const { renderTicket } = SkyBookTicket;

    const container = document.getElementById("confirmation");

    function readSaved() {
        try {
            const saved = JSON.parse(localStorage.getItem("lastBooking"));
            return saved && saved.booking ? saved : null;
        } catch {
            return null;
        }
    }

    function render(booking, email) {
        const lookupLink = `my-bookings.html?id=${encodeURIComponent(booking.bookingID)}` +
            (email ? `&email=${encodeURIComponent(email)}` : "");

        const footer = `
            <button type="button" class="sb-btn sb-btn-secondary" id="print-ticket">🖨️ Print / Save PDF</button>
            <a class="sb-btn sb-btn-secondary" href="${lookupLink}">Manage booking</a>
            <a class="sb-btn sb-btn-primary" href="index.html">Book another flight</a>`;

        const cancelled = booking.bookingStatus === "Cancelled";

        container.innerHTML = `
            <div class="confirm-hero no-print">
                <div class="success-icon ${cancelled ? "is-cancelled" : ""}" aria-hidden="true">${cancelled ? "✕" : "✓"}</div>
                <h1>${cancelled ? "Booking cancelled" : "You're all set!"}</h1>
                <p>
                    ${cancelled
                        ? "This booking has been cancelled."
                        : `${plural(booking.passengerCount, "seat")} booked on ${escapeHTML(booking.flight.flightNumber)} for ${formatDate(booking.travelDate)}.`}
                    Keep your booking ID <strong>#${escapeHTML(booking.bookingID)}</strong> handy.
                </p>
            </div>
            ${renderTicket(booking, { footer })}`;

        document.getElementById("print-ticket").addEventListener("click", () => window.print());
    }

    function renderMissing() {
        container.innerHTML = `
            <div class="sb-card sb-empty">
                <div class="sb-empty-icon">🎫</div>
                <h3>No recent booking found</h3>
                <p>If you already booked, you can find it under My Bookings.</p>
                <p style="margin-top:18px">
                    <a class="sb-btn sb-btn-primary" href="my-bookings.html">Go to My Bookings</a>
                </p>
            </div>`;
    }

    async function init() {
        const saved = readSaved();

        if (!saved) {
            renderMissing();
            return;
        }

        render(saved.booking, saved.email);

        // Refresh from the server so the page is always current
        // (e.g. if the booking was cancelled in another tab).
        try {
            const { booking } = await api(`/api/bookings/${saved.booking.bookingID}`, {
                query: { email: saved.email }
            });
            localStorage.setItem("lastBooking", JSON.stringify({ booking, email: saved.email }));
            render(booking, saved.email);
        } catch {
            /* keep showing the saved copy */
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
