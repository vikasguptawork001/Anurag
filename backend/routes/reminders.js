import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

/** Calendar due window OR km-derived “days left” track (when avg / odometer diverge from calendar). */
function dualDueFilterSql(aliasPrefix = "") {
  const sr = `${aliasPrefix}sr`;
  const v = `${aliasPrefix}v`;
  return `(
    ${sr}.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    OR ${sr}.next_due_date < CURDATE()
    OR (
      GREATEST(
        0,
        CEIL((${sr}.next_due_km - ${sr}.odometer_km) / GREATEST(${v}.avg_daily_km, 0.01))
        - DATEDIFF(CURDATE(), ${sr}.service_date)
      ) <= 7
    )
  )`;
}

router.get("/", async (req, res) => {
  try {
    const filter = (req.query.filter || "all").toLowerCase();
    let extra = "";
    if (filter === "week") {
      extra = `AND sr.next_due_date >= CURDATE() AND sr.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)`;
    } else if (filter === "overdue") {
      extra = `AND sr.next_due_date < CURDATE()`;
    } else {
      extra = `AND ${dualDueFilterSql()}`;
    }

    const [rows] = await pool.execute(
      `SELECT r.id AS reminder_id, r.status, r.reminder_date,
              sr.id AS service_record_id, sr.next_due_date, sr.next_due_km,
              sr.odometer_km AS last_odometer_km, sr.service_date AS last_service_date,
              sr.job_card_no,
              v.id AS vehicle_id, v.vehicle_number, v.owner_name, v.owner_phone, v.avg_daily_km,
              DATEDIFF(sr.next_due_date, CURDATE()) AS days_left_calendar,
              GREATEST(
                0,
                CEIL((sr.next_due_km - sr.odometer_km) / GREATEST(v.avg_daily_km, 0.01))
                - DATEDIFF(CURDATE(), sr.service_date)
              ) AS days_left_km_track,
              (sr.next_due_km - sr.odometer_km) AS km_remaining,
              LEAST(
                DATEDIFF(sr.next_due_date, CURDATE()),
                GREATEST(
                  0,
                  CEIL((sr.next_due_km - sr.odometer_km) / GREATEST(v.avg_daily_km, 0.01))
                  - DATEDIFF(CURDATE(), sr.service_date)
                )
              ) AS days_left
       FROM reminders r
       INNER JOIN service_records sr ON sr.id = r.service_record_id
       INNER JOIN vehicles v ON v.id = r.vehicle_id
       WHERE r.status = 'PENDING'
       ${extra}
       ORDER BY sr.next_due_date ASC, r.reminder_date ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load reminders" });
  }
});

router.put("/:id/dismiss", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid reminder id" });
    }
    const [result] = await pool.execute(
      "UPDATE reminders SET status = 'DISMISSED' WHERE id = ? AND status = 'PENDING'",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reminder not found or already dismissed" });
    }
    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not dismiss reminder" });
  }
});

export default router;
