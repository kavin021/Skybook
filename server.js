/* =========================================================
   SKYBOOK AIRLINE RESERVATION SYSTEM
   FRESH SERVER.JS
   ========================================================= */
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();

const PORT = 3000;


/* =========================================================
   MIDDLEWARE
   ========================================================= */

app.use(cors());

app.use(express.json());

app.use(express.static(__dirname));


/* =========================================================
   MYSQL DATABASE
   ========================================================= */

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


/* =========================================================
   DATABASE CONNECTION TEST
   ========================================================= */

async function testDatabase() {

    try {

        const [rows] = await pool.query(`
            SELECT
                DATABASE() AS databaseName,
                @@hostname AS host,
                @@port AS port
        `);

        console.log("");
        console.log("========================================");
        console.log("✅ CONNECTED TO SKYBOOK MYSQL");
        console.log("========================================");
        console.log("Database :", rows[0].databaseName);
        console.log("Host     :", rows[0].host);
        console.log("Port     :", rows[0].port);
        console.log("========================================");
        console.log("");

    }
    catch (error) {

        console.error("");
        console.error("❌ MYSQL CONNECTION FAILED");
        console.error(error.message);
        console.error("");

    }

}

testDatabase();


/* =========================================================
   HOME
   ========================================================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});


/* =========================================================
   USER REGISTRATION
   ========================================================= */

app.post(
    "/api/register",
    async (req, res) => {

        const {
            name,
            email,
            phone,
            password
        } = req.body;


        if (
            !name ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Name, email and password are required."

            });

        }


        try {

            const [existing] =
                await pool.query(
                    `
                    SELECT UserID
                    FROM \`user\`
                    WHERE Email = ?
                    LIMIT 1
                    `,
                    [
                        email.trim()
                    ]
                );


            if (
                existing.length > 0
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            const [result] =
                await pool.query(
                    `
                    INSERT INTO \`user\`
                    (
                        Name,
                        Email,
                        Phone,
                        Password
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [

                        name.trim(),

                        email.trim(),

                        phone
                            ? phone.trim()
                            : null,

                        hashedPassword

                    ]
                );


            console.log(
                `👤 USER CREATED: ${result.insertId}`
            );


            return res.status(201).json({

                success: true,

                message:
                    "Account created successfully.",

                userID:
                    result.insertId

            });

        }
        catch (error) {

            console.error(
                "❌ Registration error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Registration failed."

            });

        }

    }
);


/* =========================================================
   PASSWORD CHECK HELPER

   Supports:
   1. bcrypt passwords
   2. old plain-text passwords

   If an old plain password is successfully used,
   it gets converted to bcrypt.
   ========================================================= */

async function verifyPassword(
    enteredPassword,
    storedPassword
) {

    if (!storedPassword) {

        return false;

    }


    try {

        const bcryptMatch =
            await bcrypt.compare(
                enteredPassword,
                storedPassword
            );


        if (bcryptMatch) {

            return true;

        }

    }
    catch (error) {

        // Stored password may be plain text.

    }


    return (
        enteredPassword ===
        storedPassword
    );

}


/* =========================================================
   LOGIN
   ADMIN + USER
   ========================================================= */

app.post(
    "/api/login",
    async (req, res) => {

        const {
            email,
            password
        } = req.body;


        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }


        try {

            /* =================================================
               CHECK ADMIN
            ================================================= */

            const [admins] =
                await pool.query(
                    `
                    SELECT
                        AdminID,
                        Name,
                        Email,
                        Phone,
                        Password
                    FROM administrator
                    WHERE Email = ?
                    LIMIT 1
                    `,
                    [
                        email.trim()
                    ]
                );


            if (
                admins.length > 0
            ) {

                const admin =
                    admins[0];


                const valid =
                    await verifyPassword(
                        password,
                        admin.Password
                    );


                if (!valid) {

                    return res.status(401).json({

                        success: false,

                        message:
                            "Incorrect email or password."

                    });

                }


                /*
                   Convert old plain password
                   to bcrypt.
                */

                try {

                    const alreadyBcrypt =
                        admin.Password.startsWith(
                            "$2"
                        );


                    if (
                        !alreadyBcrypt
                    ) {

                        const newHash =
                            await bcrypt.hash(
                                password,
                                10
                            );


                        await pool.query(
                            `
                            UPDATE administrator
                            SET Password = ?
                            WHERE AdminID = ?
                            `,
                            [
                                newHash,
                                admin.AdminID
                            ]
                        );

                    }

                }
                catch (hashError) {

                    console.warn(
                        "⚠️ Could not upgrade admin password."
                    );

                }


                console.log(
                    `🔐 ADMIN LOGIN: ${admin.Email}`
                );


                return res.json({

                    success: true,

                    message:
                        "Administrator login successful.",

                    user: {

                        AdminID:
                            admin.AdminID,

                        Name:
                            admin.Name,

                        Email:
                            admin.Email,

                        Phone:
                            admin.Phone,

                        role:
                            "admin"

                    }

                });

            }


            /* =================================================
               CHECK NORMAL USER
            ================================================= */

            const [users] =
                await pool.query(
                    `
                    SELECT
                        UserID,
                        Name,
                        Email,
                        Phone,
                        Password
                    FROM \`user\`
                    WHERE Email = ?
                    LIMIT 1
                    `,
                    [
                        email.trim()
                    ]
                );


            if (
                users.length === 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Incorrect email or password."

                });

            }


            const user =
                users[0];


            const valid =
                await verifyPassword(
                    password,
                    user.Password
                );


            if (!valid) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Incorrect email or password."

                });

            }


            /*
               Convert old plain password
               to bcrypt.
            */

            try {

                const alreadyBcrypt =
                    user.Password.startsWith(
                        "$2"
                    );


                if (
                    !alreadyBcrypt
                ) {

                    const newHash =
                        await bcrypt.hash(
                            password,
                            10
                        );


                    await pool.query(
                        `
                        UPDATE \`user\`
                        SET Password = ?
                        WHERE UserID = ?
                        `,
                        [
                            newHash,
                            user.UserID
                        ]
                    );

                }

            }
            catch (hashError) {

                console.warn(
                    "⚠️ Could not upgrade user password."
                );

            }


            console.log(
                `🔐 USER LOGIN: ${user.Email}`
            );


            return res.json({

                success: true,

                message:
                    "Login successful.",

                user: {

                    UserID:
                        user.UserID,

                    Name:
                        user.Name,

                    Email:
                        user.Email,

                    Phone:
                        user.Phone,

                    role:
                        "user"

                }

            });

        }
        catch (error) {

            console.error(
                "❌ Login error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Login failed."

            });

        }

    }
);


/* =========================================================
   GET AVAILABLE FLIGHTS
   ========================================================= */

app.get(
    "/api/flights",
    async (req, res) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT
                        FlightID,
                        FlightNumber,
                        AirlineName,
                        Source,
                        Destination,
                        DepartureTime,
                        ArrivalTime,
                        Duration,
                        Fare,
                        Status,
                        AircraftID
                    FROM Flight
                    WHERE Status = 'Available'
                    ORDER BY DepartureTime
                    `
                );


            return res.json(rows);

        }
        catch (error) {

            console.error(
                "❌ Flight loading error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to fetch flights."

            });

        }

    }
);


/* =========================================================
   SEARCH FLIGHTS
   ========================================================= */

app.get(
    "/api/flights/search",
    async (req, res) => {

        const from =
            req.query.from;

        const to =
            req.query.to;


        if (
            !from ||
            !to
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide both From and To locations."

            });

        }


        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT
                        FlightID,
                        FlightNumber,
                        AirlineName,
                        Source,
                        Destination,
                        DepartureTime,
                        ArrivalTime,
                        Duration,
                        Fare,
                        Status,
                        AircraftID
                    FROM Flight
                    WHERE
                        LOWER(Source) = LOWER(?)
                        AND LOWER(Destination) = LOWER(?)
                        AND Status = 'Available'
                    ORDER BY DepartureTime
                    `,
                    [
                        from.trim(),
                        to.trim()
                    ]
                );


            return res.json(rows);

        }
        catch (error) {

            console.error(
                "❌ Flight search error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to search flights."

            });

        }

    }
);


/* =========================================================
   ADMIN - GET ALL FLIGHTS
   ========================================================= */

app.get(
    "/api/admin/flights",
    async (req, res) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT
                        FlightID,
                        FlightNumber,
                        AirlineName,
                        Source,
                        Destination,
                        DepartureTime,
                        ArrivalTime,
                        Duration,
                        Fare,
                        Status,
                        AircraftID,
                        CreatedBy
                    FROM Flight
                    ORDER BY FlightID DESC
                    `
                );


            return res.json(rows);

        }
        catch (error) {

            console.error(
                "❌ Admin flight error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load flights."

            });

        }

    }
);


/* =========================================================
   ADMIN - GET ONE FLIGHT
   ========================================================= */

app.get(
    "/api/admin/flights/:id",
    async (req, res) => {

        const flightID =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(
                flightID
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid flight ID."

            });

        }


        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT
                        FlightID,
                        FlightNumber,
                        AirlineName,
                        Source,
                        Destination,
                        DepartureTime,
                        ArrivalTime,
                        Duration,
                        Fare,
                        Status,
                        AircraftID,
                        CreatedBy
                    FROM Flight
                    WHERE FlightID = ?
                    LIMIT 1
                    `,
                    [
                        flightID
                    ]
                );


            if (
                rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Flight not found."

                });

            }


            return res.json(
                rows[0]
            );

        }
        catch (error) {

            console.error(
                "❌ Flight lookup error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load flight."

            });

        }

    }
);


/* =========================================================
   ADMIN - GET AIRCRAFT
   ========================================================= */

app.get(
    "/api/admin/aircraft",
    async (req, res) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT
                        AircraftID,
                        AircraftName,
                        AircraftModel,
                        Capacity,
                        Status
                    FROM Aircraft
                    WHERE Status = 'Active'
                    ORDER BY AircraftID
                    `
                );


            return res.json(rows);

        }
        catch (error) {

            console.error(
                "❌ Aircraft error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load aircraft."

            });

        }

    }
);


/* =========================================================
   ADMIN - ADD FLIGHT
   ========================================================= */

app.post(
    "/api/admin/flights",
    async (req, res) => {

        const {

            FlightNumber,
            AirlineName,
            Source,
            Destination,
            DepartureTime,
            ArrivalTime,
            Duration,
            Fare,
            AircraftID,
            Status,
            CreatedBy

        } = req.body;


        if (
            !FlightNumber ||
            !AirlineName ||
            !Source ||
            !Destination ||
            !DepartureTime ||
            !ArrivalTime ||
            !Duration ||
            Fare === undefined ||
            !AircraftID
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill in all required flight details."

            });

        }


        if (
            Source.trim().toLowerCase() ===
            Destination.trim().toLowerCase()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Source and destination cannot be the same."

            });

        }


        if (
            Number(Fare) < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Fare cannot be negative."

            });

        }


        try {

            const [aircraft] =
                await pool.query(
                    `
                    SELECT AircraftID
                    FROM Aircraft
                    WHERE AircraftID = ?
                    AND Status = 'Active'
                    LIMIT 1
                    `,
                    [
                        Number(AircraftID)
                    ]
                );


            if (
                aircraft.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Selected aircraft does not exist."

                });

            }


            const [result] =
                await pool.query(
                    `
                    INSERT INTO Flight
                    (
                        FlightNumber,
                        AirlineName,
                        Source,
                        Destination,
                        DepartureTime,
                        ArrivalTime,
                        Duration,
                        Fare,
                        Status,
                        AircraftID,
                        CreatedBy
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [

                        FlightNumber.trim(),

                        AirlineName.trim(),

                        Source.trim(),

                        Destination.trim(),

                        DepartureTime,

                        ArrivalTime,

                        Duration.trim(),

                        Number(Fare),

                        Status ||
                            "Available",

                        Number(AircraftID),

                        CreatedBy ||
                            1

                    ]
                );


            console.log(
                `✈️ FLIGHT CREATED: ${FlightNumber} | ID ${result.insertId}`
            );


            return res.status(201).json({

                success: true,

                message:
                    "Flight added successfully.",

                flightID:
                    result.insertId

            });

        }
        catch (error) {

            console.error(
                "❌ Add flight error:",
                error.message
            );


            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This flight number already exists."

                });

            }


            return res.status(500).json({

                success: false,

                message:
                    "Could not add flight."

            });

        }

    }
);


/* =========================================================
   ADMIN - EDIT FLIGHT
   ========================================================= */

app.put(
    "/api/admin/flights/:id",
    async (req, res) => {

        const flightID =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(
                flightID
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid flight ID."

            });

        }


        const {

            FlightNumber,
            AirlineName,
            Source,
            Destination,
            DepartureTime,
            ArrivalTime,
            Duration,
            Fare,
            AircraftID,
            Status

        } = req.body;


        if (
            !FlightNumber ||
            !AirlineName ||
            !Source ||
            !Destination ||
            !DepartureTime ||
            !ArrivalTime ||
            !Duration ||
            Fare === undefined ||
            !AircraftID
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill in all required flight details."

            });

        }


        if (
            Source.trim().toLowerCase() ===
            Destination.trim().toLowerCase()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Source and destination cannot be the same."

            });

        }


        try {

            const [aircraft] =
                await pool.query(
                    `
                    SELECT AircraftID
                    FROM Aircraft
                    WHERE AircraftID = ?
                    AND Status = 'Active'
                    LIMIT 1
                    `,
                    [
                        Number(AircraftID)
                    ]
                );


            if (
                aircraft.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Selected aircraft does not exist."

                });

            }


            const [result] =
                await pool.query(
                    `
                    UPDATE Flight
                    SET
                        FlightNumber = ?,
                        AirlineName = ?,
                        Source = ?,
                        Destination = ?,
                        DepartureTime = ?,
                        ArrivalTime = ?,
                        Duration = ?,
                        Fare = ?,
                        Status = ?,
                        AircraftID = ?
                    WHERE FlightID = ?
                    `,
                    [

                        FlightNumber.trim(),

                        AirlineName.trim(),

                        Source.trim(),

                        Destination.trim(),

                        DepartureTime,

                        ArrivalTime,

                        Duration.trim(),

                        Number(Fare),

                        Status ||
                            "Available",

                        Number(AircraftID),

                        flightID

                    ]
                );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Flight not found."

                });

            }


            console.log(
                `✏️ FLIGHT UPDATED: ${flightID}`
            );


            return res.json({

                success: true,

                message:
                    "Flight updated successfully."

            });

        }
        catch (error) {

            console.error(
                "❌ Update flight error:",
                error.message
            );


            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This flight number already exists."

                });

            }


            return res.status(500).json({

                success: false,

                message:
                    "Could not update flight."

            });

        }

    }
);


/* =========================================================
   ADMIN - CANCEL FLIGHT
   ========================================================= */

app.delete(
    "/api/admin/flights/:id",
    async (req, res) => {

        const flightID =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(
                flightID
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid flight ID."

            });

        }


        try {

            const [result] =
                await pool.query(
                    `
                    UPDATE Flight
                    SET Status = 'Cancelled'
                    WHERE FlightID = ?
                    `,
                    [
                        flightID
                    ]
                );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Flight not found."

                });

            }


            console.log(
                `🚫 FLIGHT CANCELLED: ${flightID}`
            );


            return res.json({

                success: true,

                message:
                    "Flight cancelled successfully."

            });

        }
        catch (error) {

            console.error(
                "❌ Cancel flight error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to cancel flight."

            });

        }

    }
);


/* =========================================================
   ADMIN - GET SEATS FOR FLIGHT
   ========================================================= */

app.get(
    "/api/admin/seats/:flightID",
    async (req, res) => {

        const flightID =
            Number(
                req.params.flightID
            );


        if (
            !Number.isInteger(
                flightID
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid flight ID."

            });

        }


        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT

                        s.SeatID,

                        s.AircraftID,

                        s.SeatNumber,

                        s.SeatStatus,

                        CASE

                            WHEN EXISTS (

                                SELECT 1

                                FROM Ticket t

                                WHERE
                                    t.FlightID =
                                        f.FlightID

                                AND
                                    t.SeatNumber =
                                        s.SeatNumber

                                AND
                                    t.TicketStatus =
                                        'Confirmed'

                            )

                            THEN 'Booked'

                            ELSE s.SeatStatus

                        END AS CurrentStatus

                    FROM Flight f

                    JOIN Seat s
                        ON s.AircraftID =
                           f.AircraftID

                    WHERE
                        f.FlightID = ?

                    ORDER BY

                        CAST(
                            SUBSTRING(
                                s.SeatNumber,
                                1,
                                LENGTH(
                                    s.SeatNumber
                                ) - 1
                            )
                            AS UNSIGNED
                        ),

                        RIGHT(
                            s.SeatNumber,
                            1
                        )

                    `,
                    [
                        flightID
                    ]
                );


            return res.json({

                success: true,

                seats:
                    rows

            });

        }
        catch (error) {

            console.error(
                "❌ Admin seat loading error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load seats."

            });

        }

    }
);


/* =========================================================
   ADMIN - BLOCK / UNBLOCK SEAT
   ========================================================= */

app.put(
    "/api/admin/seats/:seatID",
    async (req, res) => {

        const seatID =
            Number(
                req.params.seatID
            );

        const {
            SeatStatus
        } = req.body;


        if (
            !Number.isInteger(
                seatID
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid seat ID."

            });

        }


        if (
            SeatStatus !== "Available" &&
            SeatStatus !== "Blocked"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid seat status."

            });

        }


        try {

            const [seatRows] =
                await pool.query(
                    `
                    SELECT
                        SeatID,
                        AircraftID,
                        SeatNumber
                    FROM Seat
                    WHERE SeatID = ?
                    LIMIT 1
                    `,
                    [
                        seatID
                    ]
                );


            if (
                seatRows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Seat not found."

                });

            }


            const seat =
                seatRows[0];


            /*
               Check whether this physical seat
               is already booked on any flight
               using this aircraft.
            */

            const [bookedRows] =
                await pool.query(
                    `
                    SELECT
                        t.TicketID

                    FROM Ticket t

                    JOIN Flight f
                        ON t.FlightID =
                           f.FlightID

                    WHERE
                        f.AircraftID = ?

                    AND
                        t.SeatNumber = ?

                    AND
                        t.TicketStatus =
                            'Confirmed'

                    LIMIT 1
                    `,
                    [

                        seat.AircraftID,

                        seat.SeatNumber

                    ]
                );


            if (
                bookedRows.length > 0
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This seat is already booked and cannot be changed."

                });

            }


            const [result] =
                await pool.query(
                    `
                    UPDATE Seat
                    SET SeatStatus = ?
                    WHERE SeatID = ?
                    `,
                    [

                        SeatStatus,

                        seatID

                    ]
                );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Seat not found."

                });

            }


            console.log(
                `💺 SEAT ${seat.SeatNumber} → ${SeatStatus}`
            );


            return res.json({

                success: true,

                message:
                    `Seat ${seat.SeatNumber} is now ${SeatStatus}.`,

                seat: {

                    SeatID:
                        seat.SeatID,

                    SeatNumber:
                        seat.SeatNumber,

                    SeatStatus:
                        SeatStatus

                }

            });

        }
        catch (error) {

            console.error(
                "❌ Seat update error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to update seat."

            });

        }

    }
);


/* =========================================================
   USER - GET SEATS FOR FLIGHT
   ========================================================= */

app.get(
    "/api/flights/:flightNumber/seats",
    async (req, res) => {

        const flightNumber =
            req.params.flightNumber;


        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT

                        s.SeatID,

                        s.AircraftID,

                        s.SeatNumber,

                        s.SeatStatus,

                        CASE

                            WHEN EXISTS (

                                SELECT 1

                                FROM Ticket t

                                WHERE

                                    t.FlightID =
                                        f.FlightID

                                AND

                                    t.SeatNumber =
                                        s.SeatNumber

                                AND

                                    t.TicketStatus =
                                        'Confirmed'

                            )

                            THEN 'Booked'

                            ELSE s.SeatStatus

                        END AS CurrentStatus

                    FROM Flight f

                    JOIN Seat s
                        ON s.AircraftID =
                           f.AircraftID

                    WHERE
                        f.FlightNumber = ?

                    ORDER BY

                        CAST(
                            SUBSTRING(
                                s.SeatNumber,
                                1,
                                LENGTH(
                                    s.SeatNumber
                                ) - 1
                            )
                            AS UNSIGNED
                        ),

                        RIGHT(
                            s.SeatNumber,
                            1
                        )

                    `,
                    [
                        flightNumber
                    ]
                );


            if (
                rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Flight or seats not found."

                });

            }


            return res.json({

                success: true,

                seats:
                    rows

            });

        }
        catch (error) {

            console.error(
                "❌ User seat loading error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load seats."

            });

        }

    }
);


/* =========================================================
   CREATE BOOKING

   Supports BOTH:

   NEW FORMAT
   {
       passengers: [...],
       seats: [...],
       flightNumber: "...",
       ticketClass: "Economy",
       userID: 1
   }

   OLD FORMAT
   {
       passengerName: "...",
       email: "...",
       phone: "...",
       flightNumber: "...",
       seatNumber: "...",
       ticketClass: "Economy",
       userID: 1
   }

   The old format is automatically converted
   into the new format.
   ========================================================= */

app.post(
    "/api/bookings",
    async (req, res) => {

        let {

            passengers,

            seats,

            flightNumber,

            ticketClass,

            userID,

            passengerName,

            email,

            phone,

            seatNumber

        } = req.body;


        /* =================================================
           CONVERT OLD SINGLE-PASSENGER FORMAT
        ================================================= */

        if (
            !Array.isArray(
                passengers
            )
        ) {

            if (
                passengerName &&
                email &&
                phone &&
                seatNumber
            ) {

                passengers = [

                    {

                        name:
                            passengerName,

                        email:
                            email,

                        phone:
                            phone

                    }

                ];


                seats = [

                    seatNumber

                ];

            }

        }


        /* =================================================
           BASIC VALIDATION
        ================================================= */

        if (
            !Array.isArray(
                passengers
            ) ||
            passengers.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "At least one passenger is required."

            });

        }


        if (
            !Array.isArray(
                seats
            ) ||
            seats.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "At least one seat is required."

            });

        }


        if (
            passengers.length !==
            seats.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Number of passengers must equal number of seats."

            });

        }


        if (!flightNumber) {

            return res.status(400).json({

                success: false,

                message:
                    "Flight number is required."

            });

        }


        /* =================================================
           NORMALIZE SEATS
        ================================================= */

        const normalizedSeats =
            seats.map(
                seat =>
                    String(seat)
                        .trim()
                        .toUpperCase()
            );


        const uniqueSeats =
            new Set(
                normalizedSeats
            );


        if (
            uniqueSeats.size !==
            normalizedSeats.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "The same seat cannot be selected more than once."

            });

        }


        /* =================================================
           VALIDATE PASSENGERS
        ================================================= */

        for (
            let i = 0;
            i < passengers.length;
            i++
        ) {

            const passenger =
                passengers[i];


            if (
                !passenger ||
                !passenger.name ||
                !passenger.email ||
                !passenger.phone
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Passenger ${i + 1} details are incomplete.`

                });

            }

        }


        let connection;


        try {

            /* =================================================
               FIND FLIGHT
            ================================================= */

            const [flightRows] =
                await pool.query(
                    `
                    SELECT

                        FlightID,

                        FlightNumber,

                        Fare,

                        Status,

                        AircraftID

                    FROM Flight

                    WHERE
                        FlightNumber = ?

                    LIMIT 1
                    `,
                    [
                        flightNumber
                    ]
                );


            if (
                flightRows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Flight not found."

                });

            }


            const flight =
                flightRows[0];


            /* =================================================
               CHECK FLIGHT STATUS
            ================================================= */

            if (
                flight.Status !==
                "Available"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This flight is not available."

                });

            }


            /* =================================================
               CHECK EVERY SEAT
            ================================================= */

            for (
                const selectedSeat
                of normalizedSeats
            ) {

                /* =============================================
                   CHECK SEAT EXISTS
                ============================================= */

                const [seatRows] =
                    await pool.query(
                        `
                        SELECT

                            SeatID,

                            SeatNumber,

                            SeatStatus

                        FROM Seat

                        WHERE
                            AircraftID = ?

                        AND
                            SeatNumber = ?

                        LIMIT 1
                        `,
                        [

                            flight.AircraftID,

                            selectedSeat

                        ]
                    );


                if (
                    seatRows.length === 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            `Seat ${selectedSeat} does not exist for this aircraft.`

                    });

                }


                const seat =
                    seatRows[0];


                /* =============================================
                   CHECK BLOCKED
                ============================================= */

                if (
                    seat.SeatStatus ===
                    "Blocked"
                ) {

                    return res.status(409).json({

                        success: false,

                        message:
                            `Seat ${selectedSeat} is currently blocked.`

                    });

                }


                /* =============================================
                   CHECK BOOKED
                ============================================= */

                const [bookedRows] =
                    await pool.query(
                        `
                        SELECT
                            TicketID

                        FROM Ticket

                        WHERE
                            FlightID = ?

                        AND
                            SeatNumber = ?

                        AND
                            TicketStatus =
                                'Confirmed'

                        LIMIT 1
                        `,
                        [

                            flight.FlightID,

                            selectedSeat

                        ]
                    );


                if (
                    bookedRows.length > 0
                ) {

                    return res.status(409).json({

                        success: false,

                        message:
                            `Seat ${selectedSeat} is already booked.`

                    });

                }

            }


            /* =================================================
               TOTAL FARE
            ================================================= */

            const totalFare =
                Number(flight.Fare) *
                passengers.length;


            /* =================================================
               GET DATABASE CONNECTION
            ================================================= */

            connection =
                await pool.getConnection();


            /* =================================================
               START TRANSACTION
            ================================================= */

            await connection.beginTransaction();


            /* =================================================
               CREATE BOOKING

               IMPORTANT:
               DO NOT INSERT PassengerID HERE.

               Passenger is connected to Booking
               through BookingPassenger.
            ================================================= */

            const [bookingResult] =
                await connection.query(
                    `
                    INSERT INTO Booking
                    (
                        UserID,
                        FlightID,
                        BookingDate,
                        BookingStatus,
                        TotalFare
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        NOW(),
                        'Confirmed',
                        ?
                    )
                    `,
                    [

                        userID || null,

                        flight.FlightID,

                        totalFare

                    ]
                );


            const bookingID =
                bookingResult.insertId;


            const createdPassengers =
                [];


            const createdTickets =
                [];


            /* =================================================
               CREATE EACH PASSENGER
            ================================================= */

            for (
                let i = 0;
                i < passengers.length;
                i++
            ) {

                const passenger =
                    passengers[i];


                /* =============================================
                   SPLIT NAME
                ============================================= */

                const nameParts =
                    String(
                        passenger.name
                    )
                        .trim()
                        .split(/\s+/);


                const firstName =
                    nameParts.shift() ||
                    "";


                const lastName =
                    nameParts.join(" ") ||
                    "";


                /* =============================================
                   INSERT PASSENGER
                ============================================= */

                const [passengerResult] =
                    await connection.query(
                        `
                        INSERT INTO Passenger
                        (
                            UserID,
                            FirstName,
                            LastName,
                            Email,
                            Phone
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        `,
                        [

                            userID || null,

                            firstName,

                            lastName,

                            String(
                                passenger.email
                            ).trim(),

                            String(
                                passenger.phone
                            ).trim()

                        ]
                    );


                const passengerID =
                    passengerResult.insertId;


                /* =============================================
                   LINK PASSENGER TO BOOKING
                ============================================= */

                await connection.query(
                    `
                    INSERT INTO BookingPassenger
                    (
                        BookingID,
                        PassengerID,
                        PassengerNumber
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?
                    )
                    `,
                    [

                        bookingID,

                        passengerID,

                        i + 1

                    ]
                );


                /* =============================================
                   CREATE TICKET
                ============================================= */

                const selectedSeat =
                    normalizedSeats[i];


                const [ticketResult] =
                    await connection.query(
                        `
                        INSERT INTO Ticket
                        (
                            BookingID,
                            PassengerID,
                            FlightID,
                            SeatNumber,
                            TicketClass,
                            TicketStatus
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            'Confirmed'
                        )
                        `,
                        [

                            bookingID,

                            passengerID,

                            flight.FlightID,

                            selectedSeat,

                            ticketClass ||
                                "Economy"

                        ]
                    );


                createdPassengers.push({

                    passengerID:
                        passengerID,

                    passengerNumber:
                        i + 1,

                    name:
                        passenger.name,

                    email:
                        passenger.email,

                    phone:
                        passenger.phone

                });


                createdTickets.push({

                    ticketID:
                        ticketResult.insertId,

                    passengerID:
                        passengerID,

                    passengerNumber:
                        i + 1,

                    seatNumber:
                        selectedSeat,

                    ticketClass:
                        ticketClass ||
                        "Economy"

                });

            }


            /* =================================================
               CREATE PAYMENT
            ================================================= */

            const [paymentResult] =
                await connection.query(
                    `
                    INSERT INTO Payment
                    (
                        BookingID,
                        PaymentMode,
                        PaymentStatus,
                        Amount,
                        PaymentDate
                    )
                    VALUES
                    (
                        ?,
                        'Online',
                        'Success',
                        ?,
                        NOW()
                    )
                    `,
                    [

                        bookingID,

                        totalFare

                    ]
                );


            const paymentID =
                paymentResult.insertId;


            /* =================================================
               COMMIT
            ================================================= */

            await connection.commit();


            console.log("");
            console.log(
                "🎉 BOOKING CREATED"
            );
            console.log(
                "Booking ID:",
                bookingID
            );
            console.log(
                "Passengers:",
                passengers.length
            );
            console.log(
                "Seats:",
                normalizedSeats.join(", ")
            );
            console.log(
                "Payment ID:",
                paymentID
            );
            console.log("");


            return res.status(201).json({

                success: true,

                message:
                    "Booking confirmed!",

                bookingID:
                    bookingID,

                flightNumber:
                    flightNumber,

                passengerCount:
                    passengers.length,

                passengers:
                    createdPassengers,

                tickets:
                    createdTickets,

                /*
                   Keep these for compatibility
                   with older confirmation pages.
                */

                passengerID:
                    createdPassengers[0]
                        ?.passengerID,

                ticketID:
                    createdTickets[0]
                        ?.ticketID,

                seatNumber:
                    normalizedSeats[0],

                paymentID:
                    paymentID,

                seats:
                    normalizedSeats,

                amount:
                    totalFare

            });

        }
        catch (error) {

            if (
                connection
            ) {

                try {

                    await connection.rollback();

                }
                catch (rollbackError) {

                    console.error(
                        "❌ Rollback error:",
                        rollbackError.message
                    );

                }

            }


            console.error(
                "❌ BOOKING ERROR:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Booking failed: " +
                    error.message

            });

        }
        finally {

            if (
                connection
            ) {

                connection.release();

            }

        }

    }
);


/* =========================================================
   USER - GET MY BOOKINGS

   IMPORTANT:
   Uses Ticket.PassengerID.

   DOES NOT use:
       b.PassengerID
   ========================================================= */

app.get(
    "/api/my-bookings/:userID",
    async (req, res) => {

        const userID =
            Number(
                req.params.userID
            );


        if (
            !Number.isInteger(
                userID
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid user ID."

            });

        }


        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT

                        b.BookingID,

                        b.UserID,

                        b.BookingDate,

                        b.BookingStatus,

                        b.TotalFare,


                        f.FlightID,

                        f.FlightNumber,

                        f.AirlineName,

                        f.Source,

                        f.Destination,

                        f.DepartureTime,

                        f.ArrivalTime,

                        f.Duration,


                        p.PassengerID,

                        p.FirstName,

                        p.LastName,

                        p.Email,

                        p.Phone,


                        t.TicketID,

                        t.SeatNumber,

                        t.TicketClass,

                        t.TicketStatus,


                        pay.PaymentID,

                        pay.PaymentMode,

                        pay.PaymentStatus,

                        pay.PaymentDate

                    FROM Booking b

                    JOIN Flight f
                        ON b.FlightID =
                           f.FlightID

                    JOIN Ticket t
                        ON b.BookingID =
                           t.BookingID

                    JOIN Passenger p
                        ON t.PassengerID =
                           p.PassengerID

                    LEFT JOIN Payment pay
                        ON b.BookingID =
                           pay.BookingID

                    WHERE
                        b.UserID = ?

                    ORDER BY

                        b.BookingDate DESC,

                        t.TicketID ASC

                    `,
                    [
                        userID
                    ]
                );


            return res.json({

                success: true,

                bookings:
                    rows

            });

        }
        catch (error) {

            console.error(
                "❌ My Bookings error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load your bookings."

            });

        }

    }
);


/* =========================================================
   GET BOOKING BY ID

   FIXED VERSION

   IMPORTANT:
   OLD CODE:
       JOIN Passenger p
       ON b.PassengerID = p.PassengerID

   NEW CODE:
       JOIN Ticket t
       ON b.BookingID = t.BookingID

       JOIN Passenger p
       ON t.PassengerID = p.PassengerID
   ========================================================= */

app.get(
    "/api/bookings/:bookingID",
    async (req, res) => {

        const bookingID =
            Number(
                req.params.bookingID
            );


        if (
            !Number.isInteger(
                bookingID
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid booking ID."

            });

        }


        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT

                        b.BookingID,

                        b.UserID,

                        b.BookingDate,

                        b.BookingStatus,

                        b.TotalFare,


                        f.FlightID,

                        f.FlightNumber,

                        f.AirlineName,

                        f.Source,

                        f.Destination,

                        f.DepartureTime,

                        f.ArrivalTime,

                        f.Duration,


                        p.PassengerID,

                        p.FirstName,

                        p.LastName,

                        p.Email,

                        p.Phone,


                        t.TicketID,

                        t.SeatNumber,

                        t.TicketClass,

                        t.TicketStatus,


                        pay.PaymentID,

                        pay.PaymentMode,

                        pay.PaymentStatus,

                        pay.PaymentDate

                    FROM Booking b

                    JOIN Flight f
                        ON b.FlightID =
                           f.FlightID

                    JOIN Ticket t
                        ON b.BookingID =
                           t.BookingID

                    JOIN Passenger p
                        ON t.PassengerID =
                           p.PassengerID

                    LEFT JOIN Payment pay
                        ON b.BookingID =
                           pay.BookingID

                    WHERE
                        b.BookingID = ?

                    ORDER BY
                        t.TicketID ASC

                    `,
                    [
                        bookingID
                    ]
                );


            if (
                rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }


            const first =
                rows[0];


            /* =================================================
               PASSENGER ARRAY
            ================================================= */

            const passengers =
                rows.map(
                    row => ({

                        passengerID:
                            row.PassengerID,

                        firstName:
                            row.FirstName,

                        lastName:
                            row.LastName,

                        name:
                            `${row.FirstName} ${row.LastName}`.trim(),

                        email:
                            row.Email,

                        phone:
                            row.Phone

                    })
                );


            /* =================================================
               TICKET ARRAY
            ================================================= */

            const tickets =
                rows.map(
                    row => ({

                        ticketID:
                            row.TicketID,

                        passengerID:
                            row.PassengerID,

                        seatNumber:
                            row.SeatNumber,

                        ticketClass:
                            row.TicketClass,

                        ticketStatus:
                            row.TicketStatus

                    })
                );


            /* =================================================
               RETURN BOOKING

               We keep the first passenger/ticket fields
               at the top level so older frontend pages
               continue to work.
            ================================================= */

            return res.json({

                success: true,

                booking: {

                    bookingID:
                        first.BookingID,

                    userID:
                        first.UserID,

                    bookingDate:
                        first.BookingDate,

                    bookingStatus:
                        first.BookingStatus,

                    totalFare:
                        first.TotalFare,


                    flightID:
                        first.FlightID,

                    flightNumber:
                        first.FlightNumber,

                    airlineName:
                        first.AirlineName,

                    source:
                        first.Source,

                    destination:
                        first.Destination,

                    departureTime:
                        first.DepartureTime,

                    arrivalTime:
                        first.ArrivalTime,

                    duration:
                        first.Duration,


                    /* First passenger */

                    passengerID:
                        first.PassengerID,

                    firstName:
                        first.FirstName,

                    lastName:
                        first.LastName,

                    email:
                        first.Email,

                    phone:
                        first.Phone,


                    /* First ticket */

                    ticketID:
                        first.TicketID,

                    seatNumber:
                        first.SeatNumber,

                    ticketClass:
                        first.TicketClass,

                    ticketStatus:
                        first.TicketStatus,


                    /* Payment */

                    paymentID:
                        first.PaymentID,

                    paymentMode:
                        first.PaymentMode,

                    paymentStatus:
                        first.PaymentStatus,

                    paymentDate:
                        first.PaymentDate,


                    /* Multi-passenger */

                    passengerCount:
                        passengers.length,

                    passengers:
                        passengers,

                    tickets:
                        tickets

                }

            });

        }
        catch (error) {

            console.error(
                "❌ Booking lookup error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to retrieve booking."

            });

        }

    }
);


/* =========================================================
   DATABASE TEST
   ========================================================= */

app.get(
    "/api/test-db",
    async (req, res) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT

                        DATABASE()
                            AS databaseName,

                        @@hostname
                            AS host,

                        @@port
                            AS port
                    `
                );


            return res.json({

                connected: true,

                database:
                    rows[0].databaseName,

                host:
                    rows[0].host,

                port:
                    rows[0].port

            });

        }
        catch (error) {

            return res.status(500).json({

                connected: false,

                error:
                    error.message

            });

        }

    }
);


/* =========================================================
   404 API HANDLER
   ========================================================= */

app.use(
    "/api",
    (req, res) => {

        return res.status(404).json({

            success: false,

            message:
                "API endpoint not found."

        });

    }
);


/* =========================================================
   START SERVER
   ========================================================= */

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "✈️ ========================================"
        );
        console.log(
            "   SKYBOOK SERVER RUNNING"
        );
        console.log(
            "✈️ ========================================"
        );
        console.log(
            `   http://localhost:${PORT}`
        );
        console.log(
            "✈️ ========================================"
        );
        console.log("");

    }
);