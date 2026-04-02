import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import vehiclesRoutes from "./routes/vehicles.js";
import servicesRoutes from "./routes/services.js";
import remindersRoutes from "./routes/reminders.js";
import pool from "./db.js";
import { authMiddleware } from "./middleware/auth.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET is not set. Set it in .env for production.");
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/api/dashboard/stats", authMiddleware, async (_req, res) => {
  try {
    const [[v]] = await pool.query("SELECT COUNT(*) AS c FROM vehicles");
    const [[month]] = await pool.query(
      `SELECT COUNT(*) AS c FROM service_records
       WHERE YEAR(service_date) = YEAR(CURDATE()) AND MONTH(service_date) = MONTH(CURDATE())`
    );
    const [[pend]] = await pool.query(
      `SELECT COUNT(*) AS c FROM reminders r
       INNER JOIN service_records sr ON sr.id = r.service_record_id
       WHERE r.status = 'PENDING'
       AND sr.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)`
    );
    const [[fu]] = await pool.query(
      `SELECT COUNT(*) AS c FROM service_records WHERE followup_call_done = 0`
    );
    const [recent] = await pool.query(
      `SELECT sr.*, v.vehicle_number, v.owner_name
       FROM service_records sr
       JOIN vehicles v ON v.id = sr.vehicle_id
       ORDER BY sr.created_at DESC
       LIMIT 10`
    );
    const [upcoming] = await pool.query(
      `SELECT r.id AS reminder_id, r.status, r.reminder_date,
              sr.next_due_date, v.vehicle_number, v.owner_name, v.owner_phone,
              DATEDIFF(sr.next_due_date, CURDATE()) AS days_left
       FROM reminders r
       INNER JOIN service_records sr ON sr.id = r.service_record_id
       INNER JOIN vehicles v ON v.id = r.vehicle_id
       WHERE r.status = 'PENDING'
       AND sr.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY sr.next_due_date ASC
       LIMIT 20`
    );
    res.json({
      totalVehicles: v.c,
      servicesThisMonth: month.c,
      pendingReminders: pend.c,
      followupDue: fu.c,
      recentServices: recent,
      upcomingReminders: upcoming,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load dashboard stats" });
  }
});

app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/reminders", remindersRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Bajaj Service API listening on port ${PORT}`);
});
