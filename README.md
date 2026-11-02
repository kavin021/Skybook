# ✈️ SkyBook — Airline Reservation System

Node.js + Express 5 + MySQL 8. Plain HTML/CSS/JS front end.

## Run it

1. Import the database (first time only):
   ```
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS skybook"
   mysql -u root -p skybook < skybook_backup.sql
   ```
2. Copy `.env.example` to `.env` and fill in your MySQL details and a `TOKEN_SECRET`.
3. Install and start:
   ```
   npm install
   npm start
   ```
4. Open **http://localhost:3000**

On start the server upgrades the database automatically (safe to run any number of times):
travel dates on bookings/tickets, a seat-per-flight-per-date unique key, a
`flight_seat_block` table, a `Refunded` payment status, and recalculated flight durations.

> Live Server (port 5500) also works — pages call the API on `localhost:3000`.

## Pages

| Page | What it does |
|---|---|
| `index.html` | Search by route + date → passengers → seat map → confirm |
| `booking-confirmed.html` | E-ticket, print/save as PDF |
| `my-bookings.html` | Logged-in users see their trips; anyone can look up by booking ID + passenger email; cancel upcoming bookings |
| `login.html` / `register.html` | Accounts (admins and users share one login form) |
| `admin-dashboard.html` | Stats, add/edit/cancel flights, recent bookings |
| `admin-seats.html` | Block/unblock seats per flight, see bookings for any date |

## API

Public: `POST /api/register`, `POST /api/login`, `GET /api/flights?from&to&date`,
`GET /api/cities`, `GET /api/flights/:number/seats?date`, `POST /api/bookings`,
`GET /api/bookings/:id?email`, `POST /api/bookings/:id/cancel`.

Logged in: `GET /api/my-bookings`, `GET /api/me`.

Admin only (`Authorization: Bearer <token>`): `/api/admin/stats`, `/api/admin/bookings`,
`/api/admin/aircraft`, `/api/admin/flights` (GET/POST), `/api/admin/flights/:id` (GET/PUT/DELETE),
`/api/admin/flights/:id/seats` (GET), `/api/admin/flights/:id/seats/:seatID` (PUT `{ blocked }`).

## File map

- `server.js` — API, auth tokens, database upgrades
- `common.js` / `common.css` — shared helpers, nav, dialogs, buttons, colours
- `ticket.js` / `ticket.css` — e-ticket used by the confirmation and My Bookings pages
- `script.js` + `style.css` — booking flow
- `admin.css` — both admin pages
