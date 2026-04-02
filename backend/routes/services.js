import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

function addDays(dateStr, daysFloat) {
  const d = new Date(dateStr + "T12:00:00");
  const ms = daysFloat * 24 * 60 * 60 * 1000;
  d.setTime(d.getTime() + ms);
  return d.toISOString().slice(0, 10);
}

router.post("/", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      job_card_no,
      vehicle_id,
      service_date,
      odometer_km,
      service_type,
      work_done,
      parts_replaced,
      next_due_km,
      feedback,
      followup_call_done,
    } = req.body;

    if (!job_card_no?.trim()) {
      return res.status(400).json({ error: "Job card number is required" });
    }
    if (!vehicle_id) {
      return res.status(400).json({ error: "Vehicle is required" });
    }
    const vid = Number(vehicle_id);
    if (Number.isNaN(vid)) {
      return res.status(400).json({ error: "Invalid vehicle" });
    }
    if (!service_date) {
      return res.status(400).json({ error: "Service date is required" });
    }
    const odo = Number(odometer_km);
    if (Number.isNaN(odo) || odo < 0) {
      return res.status(400).json({ error: "Valid odometer reading is required" });
    }
    const nextKm = Number(next_due_km);
    if (Number.isNaN(nextKm)) {
      return res.status(400).json({ error: "Next due KM is required" });
    }
    const st = (service_type || "PAID").toUpperCase();
    if (st !== "FREE" && st !== "PAID") {
      return res.status(400).json({ error: "Service type must be FREE or PAID" });
    }

    await conn.beginTransaction();

    const [vrows] = await conn.execute(
      "SELECT id, avg_daily_km FROM vehicles WHERE id = ? FOR UPDATE",
      [vid]
    );
    if (!vrows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Vehicle not found" });
    }
    const avgDaily = Number(vrows[0].avg_daily_km) || 10;
    const remainingKm = nextKm - odo;
    let nextDueDate = null;
    if (remainingKm > 0 && avgDaily > 0) {
      const daysUntilDue = remainingKm / avgDaily;
      nextDueDate = addDays(service_date, daysUntilDue);
    } else if (remainingKm <= 0) {
      nextDueDate = service_date;
    }

    const followup =
      followup_call_done === true || followup_call_done === 1 || followup_call_done === "true";

    const [ins] = await conn.execute(
      `INSERT INTO service_records (
        job_card_no, vehicle_id, service_date, odometer_km, service_type,
        work_done, parts_replaced, next_due_km, next_due_date, feedback,
        followup_call_done
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job_card_no.trim(),
        vid,
        service_date,
        odo,
        st,
        work_done?.trim() || null,
        parts_replaced?.trim() || null,
        nextKm,
        nextDueDate,
        feedback?.trim() || null,
        followup ? 1 : 0,
      ]
    );
    const serviceRecordId = ins.insertId;

    if (nextDueDate) {
      const reminderDateObj = new Date(nextDueDate + "T12:00:00");
      reminderDateObj.setDate(reminderDateObj.getDate() - 7);
      const reminderDate = reminderDateObj.toISOString().slice(0, 10);
      await conn.execute(
        `INSERT INTO reminders (vehicle_id, service_record_id, reminder_date, status)
         VALUES (?, ?, ?, 'PENDING')`,
        [vid, serviceRecordId, reminderDate]
      );
    }

    await conn.commit();

    const [rec] = await pool.execute(
      `SELECT sr.*, v.vehicle_number, v.owner_name
       FROM service_records sr
       JOIN vehicles v ON v.id = sr.vehicle_id
       WHERE sr.id = ?`,
      [serviceRecordId]
    );
    res.status(201).json(rec[0]);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Could not create service record" });
  } finally {
    conn.release();
  }
});

router.get("/:vehicleId", async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    if (Number.isNaN(vehicleId)) {
      return res.status(400).json({ error: "Invalid vehicle id" });
    }
    const [rows] = await pool.execute(
      `SELECT * FROM service_records WHERE vehicle_id = ? ORDER BY service_date ASC, id ASC`,
      [vehicleId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load service history" });
  }
});

export default router;
