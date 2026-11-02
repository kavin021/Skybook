/* =========================================================
   SKYBOOK AIRLINE RESERVATION SYSTEM — SERVER
   Express 5 + MySQL 8

   What this file does
   -------------------
   • Serves the website (HTML/CSS/JS) — but never server.js,
     .env, the SQL backup or node_modules.
   • JSON API under /api for flights, seats, bookings and admin.
   • Signed login tokens (no extra packages) so admin routes and
     "my bookings" are actually protected.
   • Runs small, safe database upgrades on start-up (see
     runMigrations) so the existing skybook database keeps working.
   ========================================================= */

require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const MAX_PASSENGERS = 9;
const MAX_DAYS_AHEAD = 365;
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const TOKEN_SECRET =
    process.env.TOKEN_SECRET || "skybook-local-secret-7f3a9c2e81d64b5f";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{10}$/;
const SEAT_RE = /^\d{1,2}[A-F]$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;


/* =========================================================
   DATABASE
   ========================================================= */

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Rslj@4444",
    database: process.env.DB_NAME || "skybook",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    // Return DATE / DATETIME as plain strings ("2026-10-21") so the
    // browser never shifts them by a time zone.
    dateStrings: true
});


/* =========================================================
   SMALL HELPERS
   ========================================================= */

class ApiError extends Error {
    constructor(status, message, extra = {}) {
        super(message);
        this.status = status;
        this.extra = extra;
    }
}

function cleanString(value, maxLength = 100) {
    return String(value ?? "").trim().slice(0, maxLength);
}

function toPositiveInt(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

/** Today's date (server local time) as YYYY-MM-DD. */
function todayString() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().slice(0, 10);
}

function addDays(dateString, days) {
    const d = new Date(dateString + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function isValidDate(value) {
    if (!DATE_RE.test(value)) return false;
    const d = new Date(value + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** "06:30" → minutes since midnight */
function timeToMinutes(time) {
    const [h, m] = String(time).split(":").map(Number);
    return h * 60 + m;
}

/** Works out the duration from the two times (handles overnight flights). */
function computeDuration(departure, arrival) {
    let minutes = timeToMinutes(arrival) - timeToMinutes(departure);
    if (minutes <= 0) minutes += 24 * 60;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function seatSortKey(seatNumber) {
    const match = /^(\d+)([A-Z])$/.exec(seatNumber);
    return match ? Number(match[1]) * 10 + (match[2].charCodeAt(0) - 64) : 0;
}

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}


/* =========================================================
   LOGIN TOKENS (HMAC-signed, no extra dependency)
   ========================================================= */

function signToken(payload) {
    const body = Buffer.from(
        JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS })
    ).toString("base64url");

    const signature = crypto
        .createHmac("sha256", TOKEN_SECRET)
        .update(body)
        .digest("base64url");

    return `${body}.${signature}`;
}

function verifyToken(token) {
    if (!token || typeof token !== "string") return null;

    const [body, signature] = token.split(".");
    if (!body || !signature) return null;

    const expected = crypto
        .createHmac("sha256", TOKEN_SECRET)
        .update(body)
        .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    try {
        const payload = JSON.parse(Buffer.from(body, "base64url").toString());
        if (!payload.exp || payload.exp < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

function requireUser(req, res, next) {
    if (!req.auth) {
        return next(new ApiError(401, "Please log in to continue."));
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.auth) {
        return next(new ApiError(401, "Please log in as an administrator."));
    }
    if (req.auth.role !== "admin") {
        return next(new ApiError(403, "Administrator access required."));
    }
    next();
}


/* =========================================================
   PASSWORDS
   ========================================================= */

/**
 * bcrypt hashes start with "$2". Anything else is an old plain-text
 * password from before hashing was added; those are compared in
 * constant time and upgraded to bcrypt after a successful login.
 * (The old version also accepted the *hash itself* as a password.)
 */
async function verifyPassword(entered, stored) {
    if (!stored || typeof entered !== "string") return false;

    if (stored.startsWith("$2")) {
        return bcrypt.compare(entered, stored);
    }

    const a = Buffer.from(entered);
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}


/* =========================================================
   SIMPLE LOGIN RATE LIMIT (in memory)
   10 failed attempts per email+IP in 15 minutes.
   ========================================================= */

const failedLogins = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 10;

function loginKey(req, email) {
    return `${req.ip}|${email}`;
}

function isLoginLocked(key) {
    const entry = failedLogins.get(key);
    if (!entry) return false;
    if (Date.now() - entry.first > LOGIN_WINDOW_MS) {
        failedLogins.delete(key);
        return false;
    }
    return entry.count >= LOGIN_MAX_FAILS;
}

function recordFailedLogin(key) {
    const entry = failedLogins.get(key);
    if (!entry || Date.now() - entry.first > LOGIN_WINDOW_MS) {
        failedLogins.set(key, { count: 1, first: Date.now() });
    } else {
        entry.count += 1;
    }
}


/* =========================================================
   MIDDLEWARE
   ========================================================= */

// Allow the site to be opened from Live Server / any localhost port.
app.use(cors({
    origin(origin, callback) {
        const allowed =
            !origin ||
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        callback(null, allowed);
    }
}));

app.use(express.json({ limit: "100kb" }));

// Basic security headers.
app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("Referrer-Policy", "same-origin");
    next();
});

// Read the login token (if any) on every request.
app.use((req, res, next) => {
    const header = req.get("authorization") || "";
    req.auth = header.startsWith("Bearer ")
        ? verifyToken(header.slice(7))
        : null;
    next();
});

// Never serve private project files.
const PRIVATE_FILES =
    /^\/(?:server\.js|package(?:-lock)?\.json|node_modules(?:\/|$)|README\.md$|.*\.(?:sql|env|log)$)/i;

app.use((req, res, next) => {
    if (PRIVATE_FILES.test(req.path)) {
        return res.status(404).send("Not found");
    }
    next();
});

app.use(express.static(__dirname, { dotfiles: "deny", index: "index.html" }));


/* =========================================================
   SHARED QUERIES
   ========================================================= */

/**
 * Flight list with live seat availability for one travel date.
 * SeatsAvailable = seats on the aircraft
 *                 − blocked for the whole aircraft
 *                 − blocked for this flight
 *                 − already booked on that date.
 */
async function listFlights({ where = "1=1", params = [], date }) {
    const travelDate = date || todayString();

    const [rows] = await pool.query(
        `
        SELECT
            f.FlightID, f.FlightNumber, f.AirlineName,
            f.Source, f.Destination,
            f.DepartureTime, f.ArrivalTime, f.Duration,
            f.Fare, f.Status, f.AircraftID, f.CreatedBy,
            a.AircraftName, a.AircraftModel, a.Capacity,
            (
                SELECT COUNT(*)
                FROM seat s
                WHERE s.AircraftID = f.AircraftID
                  AND s.SeatStatus = 'Available'
                  AND NOT EXISTS (
                      SELECT 1 FROM flight_seat_block fb
                      WHERE fb.FlightID = f.FlightID AND fb.SeatID = s.SeatID
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM ticket t
                      WHERE t.FlightID = f.FlightID
                        AND t.TravelDate = ?
                        AND t.SeatNumber = s.SeatNumber
                        AND t.TicketStatus = 'Confirmed'
                  )
            ) AS SeatsAvailable
        FROM flight f
        JOIN aircraft a ON a.AircraftID = f.AircraftID
        WHERE ${where}
        ORDER BY f.DepartureTime, f.FlightNumber
        `,
        [travelDate, ...params]
    );

    return rows.map(row => ({
        ...row,
        Fare: Number(row.Fare),
        Capacity: Number(row.Capacity),
        SeatsAvailable: Number(row.SeatsAvailable),
        DepartureTime: String(row.DepartureTime).slice(0, 5),
        ArrivalTime: String(row.ArrivalTime).slice(0, 5)
    }));
}

/**
 * Seat map for one flight on one date.
 * CurrentStatus: Available | Blocked | Booked
 * BlockScope:    aircraft (whole plane) | flight (this flight only) | null
 */
async function getSeatMap(db, flightID, travelDate) {
    const [rows] = await db.query(
        `
        SELECT
            s.SeatID, s.SeatNumber, s.SeatStatus,
            EXISTS (
                SELECT 1 FROM flight_seat_block fb
                WHERE fb.FlightID = f.FlightID AND fb.SeatID = s.SeatID
            ) AS FlightBlocked,
            EXISTS (
                SELECT 1 FROM ticket t
                WHERE t.FlightID = f.FlightID
                  AND t.TravelDate = ?
                  AND t.SeatNumber = s.SeatNumber
                  AND t.TicketStatus = 'Confirmed'
            ) AS Booked
        FROM flight f
        JOIN seat s ON s.AircraftID = f.AircraftID
        WHERE f.FlightID = ?
        `,
        [travelDate, flightID]
    );

    return rows
        .map(r => ({
            SeatID: r.SeatID,
            SeatNumber: r.SeatNumber,
            CurrentStatus: Number(r.Booked)
                ? "Booked"
                : r.SeatStatus === "Blocked" || Number(r.FlightBlocked)
                    ? "Blocked"
                    : "Available",
            BlockScope: r.SeatStatus === "Blocked"
                ? "aircraft"
                : Number(r.FlightBlocked) ? "flight" : null
        }))
        .sort((a, b) => seatSortKey(a.SeatNumber) - seatSortKey(b.SeatNumber));
}

/**
 * Loads full bookings (flight, payment, passengers + tickets) and
 * groups the joined rows into one object per booking.
 */
async function loadBookings(where, params = []) {
    const [rows] = await pool.query(
        `
        SELECT
            b.BookingID, b.UserID, b.BookingDate, b.BookingStatus,
            b.TotalFare, b.TravelDate,

            f.FlightID, f.FlightNumber, f.AirlineName, f.Source,
            f.Destination, f.DepartureTime, f.ArrivalTime, f.Duration,
            f.Fare, f.Status AS FlightStatus,

            p.PassengerID, p.FirstName, p.LastName, p.Email, p.Phone,
            bp.PassengerNumber,

            t.TicketID, t.SeatNumber, t.TicketClass, t.TicketStatus,

            pay.PaymentID, pay.PaymentMode, pay.PaymentStatus,
            pay.Amount, pay.PaymentDate
        FROM booking b
        JOIN flight f ON f.FlightID = b.FlightID
        LEFT JOIN ticket t ON t.BookingID = b.BookingID
        LEFT JOIN passenger p ON p.PassengerID = t.PassengerID
        LEFT JOIN bookingpassenger bp
               ON bp.BookingID = b.BookingID AND bp.PassengerID = p.PassengerID
        LEFT JOIN payment pay ON pay.BookingID = b.BookingID
        WHERE ${where}
        ORDER BY b.BookingDate DESC, b.BookingID DESC,
                 bp.PassengerNumber, t.TicketID
        `,
        params
    );

    const bookings = new Map();

    for (const row of rows) {
        if (!bookings.has(row.BookingID)) {
            bookings.set(row.BookingID, {
                bookingID: row.BookingID,
                userID: row.UserID,
                bookingDate: row.BookingDate,
                bookingStatus: row.BookingStatus,
                travelDate: row.TravelDate,
                totalFare: Number(row.TotalFare),
                flight: {
                    flightID: row.FlightID,
                    flightNumber: row.FlightNumber,
                    airlineName: row.AirlineName,
                    source: row.Source,
                    destination: row.Destination,
                    departureTime: String(row.DepartureTime).slice(0, 5),
                    arrivalTime: String(row.ArrivalTime).slice(0, 5),
                    duration: row.Duration,
                    fare: Number(row.Fare),
                    status: row.FlightStatus
                },
                payment: row.PaymentID
                    ? {
                        paymentID: row.PaymentID,
                        mode: row.PaymentMode,
                        status: row.PaymentStatus,
                        amount: Number(row.Amount),
                        date: row.PaymentDate
                    }
                    : null,
                passengers: []
            });
        }

        if (row.TicketID) {
            const booking = bookings.get(row.BookingID);
            booking.passengers.push({
                passengerNumber: row.PassengerNumber || booking.passengers.length + 1,
                passengerID: row.PassengerID,
                name: `${row.FirstName || ""} ${row.LastName || ""}`.trim(),
                email: row.Email,
                phone: row.Phone,
                ticketID: row.TicketID,
                seatNumber: row.SeatNumber,
                ticketClass: row.TicketClass,
                ticketStatus: row.TicketStatus
            });
        }
    }

    return [...bookings.values()].map(b => ({
        ...b,
        passengerCount: b.passengers.length,
        canCancel:
            b.bookingStatus === "Confirmed" &&
            !!b.travelDate &&
            b.travelDate >= todayString()
    }));
}

/**
 * Who may see / change a booking:
 *  • an admin
 *  • the logged-in user who made it
 *  • anyone who knows the booking ID *and* a passenger's email
 */
function canAccessBooking(req, booking, email) {
    if (req.auth?.role === "admin") return true;
    if (req.auth?.role === "user" && booking.userID === req.auth.id) return true;

    const wanted = cleanString(email).toLowerCase();
    return !!wanted &&
        booking.passengers.some(p => String(p.email).toLowerCase() === wanted);
}

/** Cancels bookings (and frees their seats) inside a transaction. */
async function cancelBookingsWhere(conn, where, params) {
    const [result] = await conn.query(
        `UPDATE booking b SET b.BookingStatus = 'Cancelled'
         WHERE b.BookingStatus <> 'Cancelled' AND ${where}`,
        params
    );

    await conn.query(
        `UPDATE ticket t JOIN booking b ON b.BookingID = t.BookingID
         SET t.TicketStatus = 'Cancelled'
         WHERE ${where}`,
        params
    );

    await conn.query(
        `UPDATE payment pay JOIN booking b ON b.BookingID = pay.BookingID
         SET pay.PaymentStatus = 'Refunded'
         WHERE pay.PaymentStatus = 'Success' AND ${where}`,
        params
    );

    return result.affectedRows;
}


/* =========================================================
   AUTH ROUTES
   ========================================================= */

app.post("/api/register", async (req, res) => {
    const name = cleanString(req.body?.name);
    const email = cleanString(req.body?.email).toLowerCase();
    const phone = cleanString(req.body?.phone, 15);
    const password = String(req.body?.password ?? "");

    if (!name || !email || !password) {
        throw new ApiError(400, "Name, email and password are required.");
    }
    if (!EMAIL_RE.test(email)) {
        throw new ApiError(400, "Please enter a valid email address.");
    }
    if (phone && !PHONE_RE.test(phone)) {
        throw new ApiError(400, "Please enter a valid 10-digit phone number.");
    }
    if (password.length < 6 || password.length > 72) {
        throw new ApiError(400, "Password must be 6–72 characters long.");
    }

    const [[admin]] = await pool.query(
        "SELECT AdminID FROM administrator WHERE LOWER(Email) = ? LIMIT 1",
        [email]
    );
    if (admin) {
        throw new ApiError(409, "An account with this email already exists.");
    }

    const hash = await bcrypt.hash(password, 10);

    try {
        const [result] = await pool.query(
            "INSERT INTO `user` (Name, Email, Phone, Password) VALUES (?, ?, ?, ?)",
            [name, email, phone || null, hash]
        );

        console.log(`👤 User created: #${result.insertId}`);

        res.status(201).json({
            success: true,
            message: "Account created successfully.",
            userID: result.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            throw new ApiError(409, "An account with this email already exists.");
        }
        throw error;
    }
});


app.post("/api/login", async (req, res) => {
    const email = cleanString(req.body?.email).toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required.");
    }

    const key = loginKey(req, email);
    if (isLoginLocked(key)) {
        throw new ApiError(429, "Too many failed attempts. Please wait 15 minutes and try again.");
    }

    // Admins first, then normal users.
    const [[admin]] = await pool.query(
        "SELECT AdminID AS id, Name, Email, Phone, Password FROM administrator WHERE LOWER(Email) = ? LIMIT 1",
        [email]
    );

    let account = admin ? { ...admin, role: "admin", table: "administrator", idColumn: "AdminID" } : null;

    if (!account) {
        const [[user]] = await pool.query(
            "SELECT UserID AS id, Name, Email, Phone, Password FROM `user` WHERE LOWER(Email) = ? LIMIT 1",
            [email]
        );
        account = user ? { ...user, role: "user", table: "`user`", idColumn: "UserID" } : null;
    }

    if (!account || !(await verifyPassword(password, account.Password))) {
        recordFailedLogin(key);
        throw new ApiError(401, "Incorrect email or password.");
    }

    failedLogins.delete(key);

    // Upgrade old plain-text passwords to bcrypt.
    if (!account.Password.startsWith("$2")) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            `UPDATE ${account.table} SET Password = ? WHERE ${account.idColumn} = ?`,
            [hash, account.id]
        );
        console.log(`🔒 Upgraded plain-text password for ${account.Email}`);
    }

    const user = {
        id: account.id,
        name: account.Name,
        email: account.Email,
        phone: account.Phone,
        role: account.role
    };

    console.log(`🔐 ${account.role.toUpperCase()} login: ${account.Email}`);

    res.json({
        success: true,
        message: "Login successful.",
        token: signToken({ id: user.id, role: user.role, name: user.name }),
        user
    });
});


app.get("/api/me", requireUser, (req, res) => {
    res.json({ success: true, user: req.auth });
});


/* =========================================================
   PUBLIC FLIGHT ROUTES
   ========================================================= */

/** GET /api/flights?from=Chennai&to=Delhi&date=2026-10-25 */
app.get("/api/flights", async (req, res) => {
    const from = cleanString(req.query.from);
    const to = cleanString(req.query.to);
    const date = cleanString(req.query.date, 10);

    if (date && !isValidDate(date)) {
        throw new ApiError(400, "Please choose a valid date.");
    }

    const conditions = ["f.Status = 'Available'"];
    const params = [];

    if (from) {
        conditions.push("LOWER(f.Source) = LOWER(?)");
        params.push(from);
    }
    if (to) {
        conditions.push("LOWER(f.Destination) = LOWER(?)");
        params.push(to);
    }

    const flights = await listFlights({
        where: conditions.join(" AND "),
        params,
        date: date || undefined
    });

    // Public users don't need to know which admin created a flight.
    res.json({
        success: true,
        flights: flights.map(({ CreatedBy, ...flight }) => flight)
    });
});


/** City list for the search box suggestions. */
app.get("/api/cities", async (req, res) => {
    const [rows] = await pool.query(`
        SELECT Source AS City FROM flight WHERE Status = 'Available'
        UNION
        SELECT Destination FROM flight WHERE Status = 'Available'
        ORDER BY City
    `);
    res.json({ success: true, cities: rows.map(r => r.City) });
});


/** GET /api/flights/SB204/seats?date=2026-10-25 */
app.get("/api/flights/:flightNumber/seats", async (req, res) => {
    const date = cleanString(req.query.date, 10) || todayString();

    if (!isValidDate(date)) {
        throw new ApiError(400, "Please choose a valid date.");
    }

    const [[flight]] = await pool.query(
        "SELECT FlightID, Status FROM flight WHERE FlightNumber = ? LIMIT 1",
        [cleanString(req.params.flightNumber, 20)]
    );

    if (!flight) {
        throw new ApiError(404, "Flight not found.");
    }

    const seats = await getSeatMap(pool, flight.FlightID, date);

    res.json({ success: true, date, seats });
});


/* =========================================================
   BOOKINGS
   ========================================================= */

/**
 * POST /api/bookings
 * {
 *   flightNumber: "SB204",
 *   travelDate:   "2026-10-25",
 *   passengers:   [{ name, email, phone }, ...],
 *   seats:        ["3A", "3B", ...]           // same order as passengers
 * }
 * The logged-in user (if any) is taken from the token, never the body.
 */
app.post("/api/bookings", async (req, res) => {
    const flightNumber = cleanString(req.body?.flightNumber, 20);
    const travelDate = cleanString(req.body?.travelDate, 10);
    const passengersIn = req.body?.passengers;
    const seatsIn = req.body?.seats;

    /* ---------- validate input ---------- */

    if (!flightNumber) {
        throw new ApiError(400, "Flight number is required.");
    }

    if (!isValidDate(travelDate)) {
        throw new ApiError(400, "Please choose a valid travel date.");
    }
    if (travelDate < todayString()) {
        throw new ApiError(400, "The travel date cannot be in the past.");
    }
    if (travelDate > addDays(todayString(), MAX_DAYS_AHEAD)) {
        throw new ApiError(400, `Bookings open up to ${MAX_DAYS_AHEAD} days in advance.`);
    }

    if (!Array.isArray(passengersIn) || passengersIn.length === 0) {
        throw new ApiError(400, "At least one passenger is required.");
    }
    if (passengersIn.length > MAX_PASSENGERS) {
        throw new ApiError(400, `A booking can have at most ${MAX_PASSENGERS} passengers.`);
    }
    if (!Array.isArray(seatsIn) || seatsIn.length !== passengersIn.length) {
        throw new ApiError(400, "Please choose exactly one seat for each passenger.");
    }

    const passengers = passengersIn.map((p, i) => {
        const name = cleanString(p?.name);
        const email = cleanString(p?.email).toLowerCase();
        const phone = cleanString(p?.phone, 15);

        if (name.length < 2) {
            throw new ApiError(400, `Please enter a full name for passenger ${i + 1}.`);
        }
        if (!EMAIL_RE.test(email)) {
            throw new ApiError(400, `Please enter a valid email for passenger ${i + 1}.`);
        }
        if (!PHONE_RE.test(phone)) {
            throw new ApiError(400, `Please enter a valid 10-digit phone number for passenger ${i + 1}.`);
        }

        const [firstName, ...rest] = name.split(/\s+/);
        return { name, firstName, lastName: rest.join(" "), email, phone };
    });

    const seats = seatsIn.map(s => cleanString(s, 4).toUpperCase());

    if (seats.some(s => !SEAT_RE.test(s))) {
        throw new ApiError(400, "One of the selected seats is not valid.");
    }
    if (new Set(seats).size !== seats.length) {
        throw new ApiError(400, "The same seat cannot be selected twice.");
    }

    const userID = req.auth?.role === "user" ? req.auth.id : null;

    /* ---------- create booking in one transaction ---------- */

    const conn = await pool.getConnection();
    let bookingID;

    try {
        await conn.beginTransaction();

        // Locking the flight row means two bookings for the same
        // flight are processed one after the other, never at once.
        const [[flight]] = await conn.query(
            `SELECT FlightID, Fare, Status
             FROM flight WHERE FlightNumber = ? FOR UPDATE`,
            [flightNumber]
        );

        if (!flight) {
            throw new ApiError(404, "Flight not found.");
        }
        if (flight.Status !== "Available") {
            throw new ApiError(409, "This flight is no longer open for booking.");
        }

        const seatMap = await getSeatMap(conn, flight.FlightID, travelDate);
        const bySeatNumber = new Map(seatMap.map(s => [s.SeatNumber, s]));
        const taken = [];

        for (const seatNumber of seats) {
            const seat = bySeatNumber.get(seatNumber);
            if (!seat) {
                throw new ApiError(400, `Seat ${seatNumber} does not exist on this aircraft.`);
            }
            if (seat.CurrentStatus !== "Available") {
                taken.push(seatNumber);
            }
        }

        if (taken.length) {
            throw new ApiError(
                409,
                `Sorry, seat${taken.length > 1 ? "s" : ""} ${taken.join(", ")} ` +
                `${taken.length > 1 ? "are" : "is"} no longer available. Please choose again.`,
                { unavailableSeats: taken }
            );
        }

        const totalFare = round2(Number(flight.Fare) * passengers.length);

        const [bookingResult] = await conn.query(
            `INSERT INTO booking (UserID, FlightID, TravelDate, BookingDate, BookingStatus, TotalFare)
             VALUES (?, ?, ?, NOW(), 'Confirmed', ?)`,
            [userID, flight.FlightID, travelDate, totalFare]
        );
        bookingID = bookingResult.insertId;

        for (let i = 0; i < passengers.length; i++) {
            const p = passengers[i];

            const [passengerResult] = await conn.query(
                `INSERT INTO passenger (UserID, FirstName, LastName, Email, Phone)
                 VALUES (?, ?, ?, ?, ?)`,
                [userID, p.firstName, p.lastName, p.email, p.phone]
            );

            await conn.query(
                `INSERT INTO bookingpassenger (BookingID, PassengerID, PassengerNumber)
                 VALUES (?, ?, ?)`,
                [bookingID, passengerResult.insertId, i + 1]
            );

            await conn.query(
                `INSERT INTO ticket
                    (BookingID, PassengerID, FlightID, TravelDate, SeatNumber, TicketClass, TicketStatus)
                 VALUES (?, ?, ?, ?, ?, 'Economy', 'Confirmed')`,
                [bookingID, passengerResult.insertId, flight.FlightID, travelDate, seats[i]]
            );
        }

        await conn.query(
            `INSERT INTO payment (BookingID, PaymentMode, PaymentStatus, Amount, PaymentDate)
             VALUES (?, 'Online', 'Success', ?, NOW())`,
            [bookingID, totalFare]
        );

        await conn.commit();
    } catch (error) {
        await conn.rollback().catch(() => {});

        // Database-level safety net: the unique key on
        // (FlightID, TravelDate, ActiveSeat) stops double booking.
        if (error.code === "ER_DUP_ENTRY") {
            throw new ApiError(409, "One of your seats was just booked by someone else. Please choose again.");
        }
        throw error;
    } finally {
        conn.release();
    }

    const [booking] = await loadBookings("b.BookingID = ?", [bookingID]);

    console.log(
        `🎉 Booking #${bookingID}: ${flightNumber} on ${travelDate}, ` +
        `${passengers.length} passenger(s), seats ${seats.join(", ")}`
    );

    res.status(201).json({ success: true, message: "Booking confirmed!", booking });
});


/** Bookings for the logged-in user. */
app.get("/api/my-bookings", requireUser, async (req, res) => {
    if (req.auth.role !== "user") {
        return res.json({ success: true, bookings: [] });
    }
    const bookings = await loadBookings("b.UserID = ?", [req.auth.id]);
    res.json({ success: true, bookings });
});


/** GET /api/bookings/12?email=someone@mail.com */
app.get("/api/bookings/:bookingID", async (req, res) => {
    const bookingID = toPositiveInt(req.params.bookingID);
    if (!bookingID) {
        throw new ApiError(400, "Please enter a valid booking ID.");
    }

    const [booking] = await loadBookings("b.BookingID = ?", [bookingID]);

    // Same message for "doesn't exist" and "not yours", so booking IDs
    // can't be probed.
    if (!booking || !canAccessBooking(req, booking, req.query.email)) {
        throw new ApiError(404, "No booking matches that booking ID and email.");
    }

    res.json({ success: true, booking });
});


/** POST /api/bookings/12/cancel  { email } */
app.post("/api/bookings/:bookingID/cancel", async (req, res) => {
    const bookingID = toPositiveInt(req.params.bookingID);
    if (!bookingID) {
        throw new ApiError(400, "Please enter a valid booking ID.");
    }

    const [booking] = await loadBookings("b.BookingID = ?", [bookingID]);

    if (!booking || !canAccessBooking(req, booking, req.body?.email)) {
        throw new ApiError(404, "No booking matches that booking ID and email.");
    }
    if (booking.bookingStatus === "Cancelled") {
        throw new ApiError(409, "This booking is already cancelled.");
    }
    if (!booking.canCancel) {
        throw new ApiError(409, "Bookings can't be cancelled after the travel date.");
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await cancelBookingsWhere(conn, "b.BookingID = ?", [bookingID]);
        await conn.commit();
    } catch (error) {
        await conn.rollback().catch(() => {});
        throw error;
    } finally {
        conn.release();
    }

    const [updated] = await loadBookings("b.BookingID = ?", [bookingID]);

    console.log(`↩️  Booking #${bookingID} cancelled`);

    res.json({
        success: true,
        message: "Your booking has been cancelled and the payment marked for refund.",
        booking: updated
    });
});


/* =========================================================
   ADMIN ROUTES  (all require an admin token)
   ========================================================= */

const admin = express.Router();
admin.use(requireAdmin);

admin.get("/stats", async (req, res) => {
    const [[stats]] = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM flight) AS totalFlights,
            (SELECT COUNT(*) FROM flight WHERE Status = 'Available') AS availableFlights,
            (SELECT COUNT(*) FROM flight WHERE Status = 'Cancelled') AS cancelledFlights,
            (SELECT COUNT(*) FROM booking WHERE BookingStatus = 'Confirmed') AS confirmedBookings,
            (SELECT COUNT(*) FROM ticket WHERE TicketStatus = 'Confirmed') AS ticketsSold,
            (SELECT COALESCE(SUM(Amount), 0) FROM payment WHERE PaymentStatus = 'Success') AS revenue
    `);

    res.json({
        success: true,
        stats: Object.fromEntries(
            Object.entries(stats).map(([k, v]) => [k, Number(v)])
        )
    });
});


admin.get("/bookings", async (req, res) => {
    const limit = Math.min(toPositiveInt(req.query.limit) || 25, 100);

    const bookings = await loadBookings(
        `b.BookingID IN (
            SELECT BookingID FROM (
                SELECT BookingID FROM booking
                ORDER BY BookingDate DESC, BookingID DESC
                LIMIT ${limit}
            ) recent
        )`
    );

    res.json({ success: true, bookings });
});


admin.get("/flights", async (req, res) => {
    const date = cleanString(req.query.date, 10);
    const flights = await listFlights({
        date: date && isValidDate(date) ? date : undefined
    });
    res.json({ success: true, flights });
});


admin.get("/flights/:id", async (req, res) => {
    const flightID = toPositiveInt(req.params.id);
    if (!flightID) throw new ApiError(400, "Invalid flight ID.");

    const [flight] = await listFlights({ where: "f.FlightID = ?", params: [flightID] });
    if (!flight) throw new ApiError(404, "Flight not found.");

    res.json({ success: true, flight });
});


admin.get("/aircraft", async (req, res) => {
    const [rows] = await pool.query(`
        SELECT a.AircraftID, a.AircraftName, a.AircraftModel, a.Capacity, a.Status,
               (SELECT COUNT(*) FROM seat s WHERE s.AircraftID = a.AircraftID) AS SeatCount
        FROM aircraft a
        WHERE a.Status = 'Active'
        ORDER BY a.AircraftID
    `);
    res.json({ success: true, aircraft: rows });
});


/** Validates the add / edit flight form. Duration is worked out from the times. */
function readFlightInput(body) {
    const flight = {
        FlightNumber: cleanString(body?.FlightNumber, 20).toUpperCase(),
        AirlineName: cleanString(body?.AirlineName),
        Source: cleanString(body?.Source),
        Destination: cleanString(body?.Destination),
        DepartureTime: cleanString(body?.DepartureTime, 8),
        ArrivalTime: cleanString(body?.ArrivalTime, 8),
        Fare: Number(body?.Fare),
        AircraftID: toPositiveInt(body?.AircraftID),
        Status: cleanString(body?.Status, 20) || "Available"
    };

    if (!flight.FlightNumber || !flight.AirlineName || !flight.Source ||
        !flight.Destination || !flight.AircraftID) {
        throw new ApiError(400, "Please fill in all required flight details.");
    }
    if (!/^[A-Z0-9]{2,10}$/.test(flight.FlightNumber)) {
        throw new ApiError(400, "Flight number may only contain letters and digits (e.g. SB204).");
    }
    if (flight.Source.toLowerCase() === flight.Destination.toLowerCase()) {
        throw new ApiError(400, "Source and destination cannot be the same.");
    }
    if (!TIME_RE.test(flight.DepartureTime) || !TIME_RE.test(flight.ArrivalTime)) {
        throw new ApiError(400, "Please enter valid departure and arrival times.");
    }
    if (!Number.isFinite(flight.Fare) || flight.Fare <= 0 || flight.Fare > 1000000) {
        throw new ApiError(400, "Please enter a fare greater than zero.");
    }
    if (!["Available", "Full", "Cancelled"].includes(flight.Status)) {
        throw new ApiError(400, "Invalid flight status.");
    }

    flight.Fare = round2(flight.Fare);
    flight.Duration = computeDuration(flight.DepartureTime, flight.ArrivalTime);
    return flight;
}

async function assertAircraftUsable(aircraftID) {
    const [[aircraft]] = await pool.query(
        `SELECT a.AircraftID,
                (SELECT COUNT(*) FROM seat s WHERE s.AircraftID = a.AircraftID) AS SeatCount
         FROM aircraft a WHERE a.AircraftID = ? AND a.Status = 'Active'`,
        [aircraftID]
    );
    if (!aircraft) {
        throw new ApiError(400, "The selected aircraft does not exist.");
    }
    if (Number(aircraft.SeatCount) === 0) {
        throw new ApiError(400, "The selected aircraft has no seats configured.");
    }
}


admin.post("/flights", async (req, res) => {
    const flight = readFlightInput(req.body);

    if (flight.Status === "Cancelled") {
        throw new ApiError(400, "A new flight can't start as cancelled.");
    }
    await assertAircraftUsable(flight.AircraftID);

    try {
        const [result] = await pool.query(
            `INSERT INTO flight
                (FlightNumber, AirlineName, Source, Destination, DepartureTime,
                 ArrivalTime, Duration, Fare, Status, AircraftID, CreatedBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                flight.FlightNumber, flight.AirlineName, flight.Source,
                flight.Destination, flight.DepartureTime, flight.ArrivalTime,
                flight.Duration, flight.Fare, flight.Status,
                flight.AircraftID, req.auth.id
            ]
        );

        console.log(`✈️  Flight created: ${flight.FlightNumber} (#${result.insertId})`);

        res.status(201).json({
            success: true,
            message: "Flight added successfully.",
            flightID: result.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            throw new ApiError(409, "This flight number already exists.");
        }
        throw error;
    }
});


admin.put("/flights/:id", async (req, res) => {
    const flightID = toPositiveInt(req.params.id);
    if (!flightID) throw new ApiError(400, "Invalid flight ID.");

    const flight = readFlightInput(req.body);

    const [[current]] = await pool.query(
        "SELECT AircraftID, Status FROM flight WHERE FlightID = ?",
        [flightID]
    );
    if (!current) throw new ApiError(404, "Flight not found.");

    await assertAircraftUsable(flight.AircraftID);

    const [[{ activeTickets }]] = await pool.query(
        `SELECT COUNT(*) AS activeTickets FROM ticket
         WHERE FlightID = ? AND TicketStatus = 'Confirmed'`,
        [flightID]
    );

    if (Number(activeTickets) > 0 && flight.AircraftID !== current.AircraftID) {
        throw new ApiError(
            409,
            "This flight has confirmed tickets, so its aircraft can't be changed " +
            "(seat numbers would no longer match)."
        );
    }

    if (flight.Status === "Cancelled" && current.Status !== "Cancelled") {
        throw new ApiError(400, "Use the Cancel button to cancel a flight, so passengers' bookings are cancelled too.");
    }

    try {
        await pool.query(
            `UPDATE flight SET
                FlightNumber = ?, AirlineName = ?, Source = ?, Destination = ?,
                DepartureTime = ?, ArrivalTime = ?, Duration = ?, Fare = ?,
                Status = ?, AircraftID = ?
             WHERE FlightID = ?`,
            [
                flight.FlightNumber, flight.AirlineName, flight.Source,
                flight.Destination, flight.DepartureTime, flight.ArrivalTime,
                flight.Duration, flight.Fare, flight.Status,
                flight.AircraftID, flightID
            ]
        );
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            throw new ApiError(409, "This flight number already exists.");
        }
        throw error;
    }

    console.log(`✏️  Flight updated: #${flightID}`);
    res.json({ success: true, message: "Flight updated successfully." });
});


/** Cancels the flight and every booking on it. */
admin.delete("/flights/:id", async (req, res) => {
    const flightID = toPositiveInt(req.params.id);
    if (!flightID) throw new ApiError(400, "Invalid flight ID.");

    const conn = await pool.getConnection();
    let cancelledBookings = 0;

    try {
        await conn.beginTransaction();

        const [result] = await conn.query(
            "UPDATE flight SET Status = 'Cancelled' WHERE FlightID = ?",
            [flightID]
        );
        if (result.affectedRows === 0) {
            throw new ApiError(404, "Flight not found.");
        }

        cancelledBookings = await cancelBookingsWhere(conn, "b.FlightID = ?", [flightID]);

        await conn.commit();
    } catch (error) {
        await conn.rollback().catch(() => {});
        throw error;
    } finally {
        conn.release();
    }

    console.log(`🚫 Flight #${flightID} cancelled (${cancelledBookings} booking(s) cancelled)`);

    res.json({
        success: true,
        message: cancelledBookings
            ? `Flight cancelled. ${cancelledBookings} booking(s) were cancelled and marked for refund.`
            : "Flight cancelled. It had no active bookings.",
        cancelledBookings
    });
});


/** GET /api/admin/flights/3/seats?date=2026-10-25 */
admin.get("/flights/:id/seats", async (req, res) => {
    const flightID = toPositiveInt(req.params.id);
    if (!flightID) throw new ApiError(400, "Invalid flight ID.");

    const date = cleanString(req.query.date, 10) || todayString();
    if (!isValidDate(date)) throw new ApiError(400, "Please choose a valid date.");

    const [[exists]] = await pool.query("SELECT FlightID FROM flight WHERE FlightID = ?", [flightID]);
    if (!exists) throw new ApiError(404, "Flight not found.");

    const seats = await getSeatMap(pool, flightID, date);
    res.json({ success: true, date, seats });
});


/**
 * PUT /api/admin/flights/3/seats/45   { blocked: true | false }
 * Blocks or unblocks a seat for this flight only (all dates).
 */
admin.put("/flights/:id/seats/:seatID", async (req, res) => {
    const flightID = toPositiveInt(req.params.id);
    const seatID = toPositiveInt(req.params.seatID);
    const blocked = req.body?.blocked;

    if (!flightID || !seatID) throw new ApiError(400, "Invalid flight or seat.");
    if (typeof blocked !== "boolean") throw new ApiError(400, "Missing 'blocked' value.");

    const [[seat]] = await pool.query(
        `SELECT s.SeatID, s.SeatNumber, s.SeatStatus
         FROM seat s JOIN flight f ON f.AircraftID = s.AircraftID
         WHERE f.FlightID = ? AND s.SeatID = ?`,
        [flightID, seatID]
    );
    if (!seat) throw new ApiError(404, "That seat doesn't belong to this flight's aircraft.");

    if (seat.SeatStatus === "Blocked") {
        throw new ApiError(409, `Seat ${seat.SeatNumber} is blocked for the whole aircraft (maintenance) and can't be changed here.`);
    }

    if (blocked) {
        const [[{ upcoming }]] = await pool.query(
            `SELECT COUNT(*) AS upcoming FROM ticket
             WHERE FlightID = ? AND SeatNumber = ? AND TicketStatus = 'Confirmed'
               AND TravelDate >= ?`,
            [flightID, seat.SeatNumber, todayString()]
        );
        if (Number(upcoming) > 0) {
            throw new ApiError(409, `Seat ${seat.SeatNumber} has upcoming bookings on this flight, so it can't be blocked.`);
        }

        await pool.query(
            "INSERT IGNORE INTO flight_seat_block (FlightID, SeatID) VALUES (?, ?)",
            [flightID, seatID]
        );
    } else {
        await pool.query(
            "DELETE FROM flight_seat_block WHERE FlightID = ? AND SeatID = ?",
            [flightID, seatID]
        );
    }

    console.log(`💺 Flight #${flightID} seat ${seat.SeatNumber} → ${blocked ? "Blocked" : "Available"}`);

    res.json({
        success: true,
        message: `Seat ${seat.SeatNumber} is now ${blocked ? "blocked" : "available"} on this flight.`
    });
});

app.use("/api/admin", admin);


/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get("/api/health", async (req, res) => {
    await pool.query("SELECT 1");
    res.json({ success: true, status: "ok" });
});


/* =========================================================
   404 + ERROR HANDLING
   ========================================================= */

app.use("/api", (req, res) => {
    res.status(404).json({ success: false, message: "API endpoint not found." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "Invalid request body." });
    }

    const status = err.status || 500;

    if (status >= 500) {
        console.error(`❌ ${req.method} ${req.originalUrl}:`, err);
    }

    res.status(status).json({
        success: false,
        message: status >= 500
            ? "Something went wrong on the server. Please try again."
            : err.message,
        ...(err.extra || {})
    });
});


/* =========================================================
   DATABASE UPGRADES (run once, safe to re-run)
   ========================================================= */

async function columnExists(table, column) {
    const [[row]] = await pool.query(
        `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    return Number(row.n) > 0;
}

async function indexExists(table, index) {
    const [[row]] = await pool.query(
        `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        [table, index]
    );
    return Number(row.n) > 0;
}

async function runMigrations() {
    const steps = [];

    // 1. Travel dates on bookings and tickets.
    //    Existing rows get the date the booking was made.
    for (const table of ["booking", "ticket"]) {
        if (!(await columnExists(table, "TravelDate"))) {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN TravelDate DATE NULL`);
            steps.push(`${table}.TravelDate added`);
        }
    }
    await pool.query(
        "UPDATE booking SET TravelDate = DATE(BookingDate) WHERE TravelDate IS NULL"
    );
    await pool.query(
        `UPDATE ticket t JOIN booking b ON b.BookingID = t.BookingID
         SET t.TravelDate = b.TravelDate WHERE t.TravelDate IS NULL`
    );

    // 2. Only *confirmed* tickets hold a seat, per flight, per date.
    //    (The old unique key also blocked seats on cancelled tickets
    //    forever, and ignored the date.)
    if (!(await columnExists("ticket", "ActiveSeat"))) {
        await pool.query(
            `ALTER TABLE ticket ADD COLUMN ActiveSeat VARCHAR(10)
             GENERATED ALWAYS AS (IF(TicketStatus = 'Confirmed', SeatNumber, NULL)) STORED`
        );
        steps.push("ticket.ActiveSeat added");
    }
    if (!(await indexExists("ticket", "idx_ticket_flight"))) {
        await pool.query("ALTER TABLE ticket ADD INDEX idx_ticket_flight (FlightID)");
    }
    if (!(await indexExists("ticket", "unique_flight_date_seat"))) {
        await pool.query(
            "ALTER TABLE ticket ADD UNIQUE KEY unique_flight_date_seat (FlightID, TravelDate, ActiveSeat)"
        );
        steps.push("ticket unique seat-per-date key added");
    }
    if (await indexExists("ticket", "unique_flight_seat")) {
        await pool.query("ALTER TABLE ticket DROP INDEX unique_flight_seat");
        steps.push("old ticket unique key removed");
    }

    // 3. Per-flight seat blocking (separate from aircraft-wide maintenance blocks).
    await pool.query(`
        CREATE TABLE IF NOT EXISTS flight_seat_block (
            FlightID  INT NOT NULL,
            SeatID    INT NOT NULL,
            BlockedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (FlightID, SeatID),
            CONSTRAINT fk_fsb_flight FOREIGN KEY (FlightID) REFERENCES flight (FlightID) ON DELETE CASCADE,
            CONSTRAINT fk_fsb_seat   FOREIGN KEY (SeatID)   REFERENCES seat (SeatID)     ON DELETE CASCADE
        )
    `);

    // 4. "Refunded" payment status for cancellations.
    const [[paymentCol]] = await pool.query(
        `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment' AND COLUMN_NAME = 'PaymentStatus'`
    );
    if (paymentCol && !String(paymentCol.COLUMN_TYPE).includes("Refunded")) {
        await pool.query(
            `ALTER TABLE payment MODIFY PaymentStatus
             ENUM('Success','Failed','Pending','Refunded') DEFAULT 'Pending'`
        );
        steps.push("payment status 'Refunded' added");
    }

    // 5. Keep every flight's duration consistent with its times.
    const [flights] = await pool.query(
        "SELECT FlightID, DepartureTime, ArrivalTime, Duration FROM flight"
    );
    for (const f of flights) {
        const duration = computeDuration(
            String(f.DepartureTime).slice(0, 5),
            String(f.ArrivalTime).slice(0, 5)
        );
        if (duration !== f.Duration) {
            await pool.query("UPDATE flight SET Duration = ? WHERE FlightID = ?", [duration, f.FlightID]);
            steps.push(`flight #${f.FlightID} duration ${f.Duration} → ${duration}`);
        }
    }

    if (steps.length) {
        console.log("🛠️  Database updated:");
        steps.forEach(s => console.log("    • " + s));
    }
}


/* =========================================================
   START
   ========================================================= */

async function start() {
    try {
        const [[info]] = await pool.query("SELECT DATABASE() AS db, VERSION() AS version");
        console.log(`✅ Connected to MySQL database "${info.db}" (${info.version})`);
        await runMigrations();
    } catch (error) {
        console.error("\n❌ Could not prepare the database:", error.message);
        console.error("   Check DB_HOST, DB_USER, DB_PASSWORD and DB_NAME in your .env file.\n");
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log("");
        console.log("✈️  SkyBook is running → http://localhost:" + PORT);
        console.log("");
    });
}

if (require.main === module) {
    start();
}

module.exports = { app, pool, computeDuration, verifyToken, signToken };