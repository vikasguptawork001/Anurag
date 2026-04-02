import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/overview", async (_req, res) => {
  try {
    const [[veh]] = await pool.query("SELECT COUNT(*) AS c FROM vehicles");
    const [[srv]] = await pool.query("SELECT COUNT(*) AS c FROM service_records");
    const [[calls]] = await pool.query("SELECT COUNT(*) AS c FROM call_records");
    const [[pend]] = await pool.query(
      `SELECT COUNT(*) AS c FROM reminders WHERE status = 'PENDING'`
    );
    const [byMonth] = await pool.query(
      `SELECT DATE_FORMAT(service_date, '%Y-%m') AS ym, COUNT(*) AS cnt
       FROM service_records
       WHERE service_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY ym ORDER BY ym`
    );
    res.json({
      totalVehicles: veh.c,
      totalServices: srv.c,
      totalCalls: calls.c,
      pendingReminders: pend.c,
      servicesByMonth: byMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load report overview" });
  }
});

router.get("/services", async (req, res) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    let sql = `
      SELECT sr.*, v.vehicle_number, v.owner_name, v.owner_phone, v.vehicle_model
      FROM service_records sr
      JOIN vehicles v ON v.id = sr.vehicle_id
      WHERE 1=1
    `;
    const p = [];
    if (from) {
      sql += " AND sr.service_date >= ?";
      p.push(from);
    }
    if (to) {
      sql += " AND sr.service_date <= ?";
      p.push(to);
    }
    sql += " ORDER BY sr.service_date DESC, sr.id DESC LIMIT 2000";
    const [rows] = await pool.execute(sql, p);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load services report" });
  }
});

router.get("/calls", async (req, res) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    let sql = `
      SELECT c.*, v.vehicle_number, v.owner_name, u.username AS logged_by_username
      FROM call_records c
      JOIN vehicles v ON v.id = c.vehicle_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE 1=1
    `;
    const p = [];
    if (from) {
      sql += " AND DATE(c.called_at) >= ?";
      p.push(from);
    }
    if (to) {
      sql += " AND DATE(c.called_at) <= ?";
      p.push(to);
    }
    sql += " ORDER BY c.called_at DESC LIMIT 2000";
    const [rows] = await pool.execute(sql, p);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load calls report" });
  }
});

router.get("/reminders-open", async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id AS reminder_id, r.status, r.reminder_date,
              sr.id AS service_record_id, sr.next_due_date, sr.next_due_km, sr.odometer_km AS last_odometer_km,
              sr.service_date AS last_service_date, sr.job_card_no,
              v.id AS vehicle_id, v.vehicle_number, v.owner_name, v.owner_phone, v.avg_daily_km,
              DATEDIFF(sr.next_due_date, CURDATE()) AS days_left_calendar,
              GREATEST(0,
                CEIL((sr.next_due_km - sr.odometer_km) / GREATEST(v.avg_daily_km, 0.01))
                - DATEDIFF(CURDATE(), sr.service_date)
              ) AS days_left_km_track
       FROM reminders r
       JOIN service_records sr ON sr.id = r.service_record_id
       JOIN vehicles v ON v.id = r.vehicle_id
       WHERE r.status = 'PENDING'
       ORDER BY sr.next_due_date ASC
       LIMIT 500`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load reminders report" });
  }
});

export default router;
