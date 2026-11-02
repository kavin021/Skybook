/* =====================================================
   SKYBOOK — E-TICKET RENDERER
   Used by booking-confirmed.html and my-bookings.html so
   a booking always looks the same everywhere.
===================================================== */

(function () {
    "use strict";

    const {
        escapeHTML, formatMoney, formatTime, formatDate,
        formatDateTime, arrivesNextDay, plural
    } = SkyBook;

    const STATUS_BADGE = {
        Confirmed: "sb-badge-success",
        Cancelled: "sb-badge-danger",
        Pending: "sb-badge-warn",
        Success: "sb-badge-success",
        Refunded: "sb-badge-info",
        Failed: "sb-badge-danger"
    };

    function badge(status) {
        const cls = STATUS_BADGE[status] || "sb-badge-muted";
        return `<span class="sb-badge ${cls}">${escapeHTML(status || "Unknown")}</span>`;
    }

    function paymentLabel(payment) {
        if (!payment) return "Not recorded";
        if (payment.status === "Success") return "Paid";
        if (payment.status === "Refunded") return "Refund issued";
        return payment.status;
    }

    /**
     * Returns the HTML for one booking.
     * options.footer — extra HTML for the bottom bar (buttons etc.)
     */
    function renderTicket(booking, { footer = "" } = {}) {
        const f = booking.flight;
        const nextDay = arrivesNextDay(f.departureTime, f.arrivalTime);
        const cancelled = booking.bookingStatus === "Cancelled";

        const passengerRows = booking.passengers.map(p => `
            <tr class="${p.ticketStatus === "Cancelled" ? "is-cancelled" : ""}">
                <td data-label="#"><span class="badge-num">${p.passengerNumber}</span></td>
                <td data-label="Passenger">
                    <strong>${escapeHTML(p.name)}</strong>
                    <small>${escapeHTML(p.email)} · ${escapeHTML(p.phone)}</small>
                </td>
                <td data-label="Seat"><span class="ticket-seat">${escapeHTML(p.seatNumber)}</span></td>
                <td data-label="Class">${escapeHTML(p.ticketClass)}</td>
                <td data-label="Ticket">#${escapeHTML(p.ticketID)}</td>
                <td data-label="Status">${badge(p.ticketStatus)}</td>
            </tr>`).join("");

        return `
            <article class="ticket ${cancelled ? "ticket-cancelled" : ""}">

                <header class="ticket-header">
                    <div>
                        <span class="ticket-brand">✈️ SkyBook · E-Ticket</span>
                        <h2>Booking #${escapeHTML(booking.bookingID)}</h2>
                    </div>
                    ${badge(booking.bookingStatus)}
                </header>

                <section class="ticket-route">
                    <div class="ticket-flight">
                        <strong>${escapeHTML(f.airlineName)}</strong>
                        <span>${escapeHTML(f.flightNumber)} · ${formatDate(booking.travelDate)}</span>
                    </div>

                    <div class="ticket-journey">
                        <div class="ticket-point">
                            <strong>${formatTime(f.departureTime)}</strong>
                            <span>${escapeHTML(f.source)}</span>
                        </div>
                        <div class="ticket-middle">
                            <span>${escapeHTML(f.duration)}</span>
                            <div class="ticket-line" aria-hidden="true"></div>
                            <span>Direct</span>
                        </div>
                        <div class="ticket-point">
                            <strong>${formatTime(f.arrivalTime)}${nextDay ? "<sup>+1</sup>" : ""}</strong>
                            <span>${escapeHTML(f.destination)}</span>
                        </div>
                    </div>
                </section>

                <section class="ticket-section">
                    <h3>${plural(booking.passengerCount, "Passenger")}</h3>
                    <div class="ticket-table-wrap">
                        <table class="ticket-table">
                            <thead>
                                <tr>
                                    <th>#</th><th>Passenger</th><th>Seat</th>
                                    <th>Class</th><th>Ticket</th><th>Status</th>
                                </tr>
                            </thead>
                            <tbody>${passengerRows}</tbody>
                        </table>
                    </div>
                </section>

                <section class="ticket-payment">
                    <div class="ticket-payment-details">
                        <div><span>Payment</span><strong>${escapeHTML(paymentLabel(booking.payment))}</strong></div>
                        <div><span>Method</span><strong>${escapeHTML(booking.payment?.mode || "--")}</strong></div>
                        <div><span>Payment ID</span><strong>${escapeHTML(booking.payment?.paymentID ?? "--")}</strong></div>
                        <div><span>Booked on</span><strong>${formatDateTime(booking.bookingDate)}</strong></div>
                    </div>
                    <div class="ticket-total">
                        <span>Total fare</span>
                        <strong>${formatMoney(booking.totalFare)}</strong>
                    </div>
                </section>

                ${footer ? `<footer class="ticket-footer no-print">${footer}</footer>` : ""}
            </article>`;
    }

    window.SkyBookTicket = { renderTicket, badge };
})();
