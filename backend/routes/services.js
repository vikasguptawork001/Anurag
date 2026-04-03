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

function kmDerivedNextDueDate(service_date, odo, nextKm, avgDaily) {
  const remainingKm = nextKm - odo;
  if (remainingKm > 0 && avgDaily > 0) {
    return addDays(service_date, remainingKm / avgDaily);
  }
  if (remainingKm <= 0) {
    return service_date;
  }
  return null;
}

function earlierIsoDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function reminderDateFromAnchor(anchorDate) {
  if (!anchorDate) return null;
  const reminderDateObj = new Date(anchorDate + "T12:00:00");
  reminderDateObj.setDate(reminderDateObj.getDate() - 7);
  return reminderDateObj.toISOString().slice(0, 10);
}

async function syncPendingReminderForService(conn, serviceRecordId, vehicleId, anchorDate) {
  const reminderDate = reminderDateFromAnchor(anchorDate);
  if (!reminderDate) return;
  const [remRows] = await conn.execute(
    `SELECT id FROM reminders WHERE service_record_id = ? AND status = 'PENDING' ORDER BY id DESC LIMIT 1`,
    [serviceRecordId]
  );
  if (remRows.length) {
    await conn.execute(`UPDATE reminders SET reminder_date = ? WHERE id = ?`, [reminderDate, remRows[0].id]);
  } else {
    await conn.execute(
      `INSERT INTO reminders (vehicle_id, service_record_id, reminder_date, status)
       VALUES (?, ?, ?, 'PENDING')`,
      [vehicleId, serviceRecordId, reminderDate]
    );
  }
}

router.patch("/record/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid service record id" });
    }
    const {
      job_card_no,
      service_date,
      odometer_km,
      service_type,
      work_done,
      parts_replaced,
      next_due_km,
      next_due_date,
      feedback,
      followup_call_done,
    } = req.body;

    await conn.beginTransaction();

    const [existing] = await conn.execute(
      `SELECT * FROM service_records WHERE id = ? AND archived_at IS NULL FOR UPDATE`,
      [id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Service record not found" });
    }
    const cur = existing[0];
    const vid = cur.vehicle_id;

    const [vrows] = await conn.execute("SELECT avg_daily_km FROM vehicles WHERE id = ? AND archived_at IS NULL", [vid]);
    if (!vrows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Vehicle not found" });
    }
    const avgDaily = Number(vrows[0].avg_daily_km) || 10;

    const job =
      job_card_no !== undefined ? String(job_card_no).trim() : cur.job_card_no;
    if (!job) {
      await conn.rollback();
      return res.status(400).json({ error: "Job card number is required" });
    }
    const sd = service_date !== undefined ? service_date : cur.service_date;
    if (!sd) {
      await conn.rollback();
      return res.status(400).json({ error: "Service date is required" });
    }
    const odo = odometer_km !== undefined ? Number(odometer_km) : Number(cur.odometer_km);
    if (Number.isNaN(odo) || odo < 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Valid odometer reading is required" });
    }
    const nextKm = next_due_km !== undefined ? Number(next_due_km) : Number(cur.next_due_km);
    if (Number.isNaN(nextKm)) {
      await conn.rollback();
      return res.status(400).json({ error: "Next due KM is required" });
    }
    let st = cur.service_type;
    if (service_type !== undefined) {
      st = String(service_type).toUpperCase();
      if (st !== "FREE" && st !== "PAID") {
        await conn.rollback();
        return res.status(400).json({ error: "Service type must be FREE or PAID" });
      }
    }
    const kmDate = kmDerivedNextDueDate(sd, odo, nextKm, avgDaily);
    let userDate;
    if (next_due_date !== undefined) {
      userDate =
        next_due_date === null || String(next_due_date).trim() === ""
          ? null
          : String(next_due_date).slice(0, 10);
    } else {
      userDate = cur.next_due_date;
    }
    const storedCalendar = userDate || kmDate;
    const anchor = earlierIsoDate(kmDate, userDate || kmDate);

    const fu =
      followup_call_done !== undefined
        ? followup_call_done === true || followup_call_done === 1 || followup_call_done === "true"
          ? 1
          : 0
        : cur.followup_call_done;

    await conn.execute(
      `UPDATE service_records SET
        job_card_no = ?, service_date = ?, odometer_km = ?, service_type = ?,
        work_done = ?, parts_replaced = ?, next_due_km = ?, next_due_date = ?,
        feedback = ?, followup_call_done = ?
       WHERE id = ? AND archived_at IS NULL`,
      [
        job,
        sd,
        odo,
        st,
        work_done !== undefined ? work_done?.trim() || null : cur.work_done,
        parts_replaced !== undefined ? parts_replaced?.trim() || null : cur.parts_replaced,
        nextKm,
        storedCalendar,
        feedback !== undefined ? feedback?.trim() || null : cur.feedback,
        fu,
        id,
      ]
    );

    if (anchor) {
      await syncPendingReminderForService(conn, id, vid, anchor);
    }

    await conn.commit();

    const [rec] = await pool.execute(
      `SELECT sr.*, v.vehicle_number, v.owner_name
       FROM service_records sr JOIN vehicles v ON v.id = sr.vehicle_id WHERE sr.id = ?`,
      [id]
    );
    res.json(rec[0]);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Could not update service record" });
  } finally {
    conn.release();
  }
});

router.put("/record/:id/archive", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid service record id" });
    }
    const [result] = await pool.execute(
      `UPDATE service_records SET archived_at = CURRENT_TIMESTAMP WHERE id = ? AND archived_at IS NULL`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Service record not found or already archived" });
    }
    await pool.execute(`UPDATE reminders SET status = 'DISMISSED' WHERE service_record_id = ? AND status = 'PENDING'`, [
      id,
    ]);
    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not archive service record" });
  }
});

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
      next_due_date,
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
      "SELECT id, avg_daily_km FROM vehicles WHERE id = ? AND archived_at IS NULL FOR UPDATE",
      [vid]
    );
    if (!vrows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Vehicle not found or archived" });
    }
    const avgDaily = Number(vrows[0].avg_daily_km) || 10;

    const kmDate = kmDerivedNextDueDate(service_date, odo, nextKm, avgDaily);
    let userDate =
      next_due_date != null && String(next_due_date).trim() !== ""
        ? String(next_due_date).slice(0, 10)
        : null;
    const storedCalendar = userDate || kmDate;
    const anchor = earlierIsoDate(kmDate, userDate || kmDate);

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
        storedCalendar,
        feedback?.trim() || null,
        followup ? 1 : 0,
      ]
    );
    const serviceRecordId = ins.insertId;

    if (anchor) {
      const reminderDate = reminderDateFromAnchor(anchor);
      if (reminderDate) {
        await conn.execute(
          `INSERT INTO reminders (vehicle_id, service_record_id, reminder_date, status)
           VALUES (?, ?, ?, 'PENDING')`,
          [vid, serviceRecordId, reminderDate]
        );
      }
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
      `SELECT * FROM service_records
       WHERE vehicle_id = ? AND archived_at IS NULL
       ORDER BY service_date ASC, id ASC`,
      [vehicleId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load service history" });
  }
});

export default router;
