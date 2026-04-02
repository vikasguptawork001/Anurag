import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

function addDaysFromDate(dateStr, daysInt) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + daysInt);
  return d.toISOString().slice(0, 10);
}

function addDaysFloat(dateStr, daysFloat) {
  const d = new Date(dateStr + "T12:00:00");
  d.setTime(d.getTime() + daysFloat * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

router.get("/", async (req, res) => {
  try {
    const vehicleId = req.query.vehicle_id ? Number(req.query.vehicle_id) : null;
    const from = req.query.from || null;
    const to = req.query.to || null;
    let sql = `
      SELECT c.*, v.vehicle_number, v.owner_name, u.username AS logged_by_username
      FROM call_records c
      INNER JOIN vehicles v ON v.id = c.vehicle_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE 1=1
    `;
    const params = [];
    if (vehicleId && !Number.isNaN(vehicleId)) {
      sql += " AND c.vehicle_id = ?";
      params.push(vehicleId);
    }
    if (from) {
      sql += " AND DATE(c.called_at) >= ?";
      params.push(from);
    }
    if (to) {
      sql += " AND DATE(c.called_at) <= ?";
      params.push(to);
    }
    sql += " ORDER BY c.called_at DESC LIMIT 500";
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load call history" });
  }
});

router.post("/", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      vehicle_id,
      service_record_id,
      reminder_id,
      outcome,
      notes,
      new_next_due_date,
      new_next_due_km,
    } = req.body;

    const vid = Number(vehicle_id);
    if (Number.isNaN(vid)) {
      return res.status(400).json({ error: "vehicle_id is required" });
    }
    const oc = (outcome || "CONTACTED").toUpperCase();
    const allowed = [
      "CONTACTED",
      "NO_ANSWER",
      "CALLBACK_REQUESTED",
      "RESCHEDULED",
      "ADJUSTED_DUE",
      "OTHER",
    ];
    if (!allowed.includes(oc)) {
      return res.status(400).json({ error: "Invalid outcome" });
    }

    let srId = service_record_id != null ? Number(service_record_id) : null;
    let remId = reminder_id != null ? Number(reminder_id) : null;

    await conn.beginTransaction();

    const [[veh]] = await conn.execute("SELECT id FROM vehicles WHERE id = ?", [vid]);
    if (!veh) {
      await conn.rollback();
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (!srId || Number.isNaN(srId)) {
      const [latest] = await conn.execute(
        `SELECT id FROM service_records WHERE vehicle_id = ? ORDER BY service_date DESC, id DESC LIMIT 1`,
        [vid]
      );
      if (!latest.length) {
        await conn.rollback();
        return res.status(400).json({ error: "No service record found for this vehicle" });
      }
      srId = latest[0].id;
    }

    const [srows] = await conn.execute(
      `SELECT id, vehicle_id, next_due_date, next_due_km FROM service_records WHERE id = ? FOR UPDATE`,
      [srId]
    );
    if (!srows.length || Number(srows[0].vehicle_id) !== vid) {
      await conn.rollback();
      return res.status(400).json({ error: "Invalid service record for vehicle" });
    }
    const sr = srows[0];
    const prevDate = sr.next_due_date;
    const prevKm = sr.next_due_km;

    let nextDate = prevDate;
    let nextKm = prevKm;
    let didAdjust = false;

    if (new_next_due_date) {
      nextDate = String(new_next_due_date).slice(0, 10);
      didAdjust = true;
    }
    if (new_next_due_km != null && new_next_due_km !== "") {
      const nk = Number(new_next_due_km);
      if (!Number.isNaN(nk)) {
        nextKm = nk;
        didAdjust = true;
      }
    }

    if (didAdjust && new_next_due_km != null && new_next_due_km !== "" && !new_next_due_date) {
      const [combo] = await conn.execute(
        `SELECT sr.service_date, sr.odometer_km, v.avg_daily_km
         FROM service_records sr JOIN vehicles v ON v.id = sr.vehicle_id WHERE sr.id = ?`,
        [srId]
      );
      if (combo.length) {
        const avgDaily = Number(combo[0].avg_daily_km) || 10;
        const odo = Number(combo[0].odometer_km);
        const remaining = nextKm - odo;
        if (remaining > 0 && avgDaily > 0) {
          nextDate = addDaysFloat(combo[0].service_date, remaining / avgDaily);
        } else if (remaining <= 0) {
          nextDate = combo[0].service_date;
        }
      }
    }

    if (didAdjust) {
      await conn.execute(
        `UPDATE service_records SET next_due_date = ?, next_due_km = ? WHERE id = ?`,
        [nextDate, nextKm, srId]
      );

      let reminderDate = null;
      if (nextDate) {
        reminderDate = addDaysFromDate(nextDate, -7);
      }
      const [remRows] = await conn.execute(
        `SELECT id FROM reminders WHERE service_record_id = ? AND status = 'PENDING' ORDER BY id DESC LIMIT 1`,
        [srId]
      );
      if (remRows.length && reminderDate) {
        remId = remRows[0].id;
        await conn.execute(
          `UPDATE reminders SET reminder_date = ?, status = 'PENDING' WHERE id = ?`,
          [reminderDate, remId]
        );
      }
    }

    const userId = req.user?.id ?? null;
    const [ins] = await conn.execute(
      `INSERT INTO call_records (
        vehicle_id, service_record_id, reminder_id, outcome, notes,
        previous_next_due_date, new_next_due_date, previous_next_due_km, new_next_due_km, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vid,
        srId,
        remId || null,
        oc,
        notes?.trim() || null,
        prevDate || null,
        didAdjust ? nextDate : null,
        prevKm,
        didAdjust ? nextKm : null,
        userId,
      ]
    );

    await conn.commit();

    const [[row]] = await pool.execute(
      `SELECT c.*, v.vehicle_number FROM call_records c
       JOIN vehicles v ON v.id = c.vehicle_id WHERE c.id = ?`,
      [ins.insertId]
    );
    res.status(201).json(row);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Could not log call" });
  } finally {
    conn.release();
  }
});

export default router;
