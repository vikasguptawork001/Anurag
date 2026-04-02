import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const filter = (req.query.filter || "all").toLowerCase();
    let dateCondition = "";
    if (filter === "week") {
      dateCondition = `AND sr.next_due_date >= CURDATE() AND sr.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)`;
    } else if (filter === "overdue") {
      dateCondition = `AND sr.next_due_date < CURDATE()`;
    } else {
      dateCondition = `AND (
        (sr.next_due_date >= CURDATE() AND sr.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
        OR sr.next_due_date < CURDATE()
      )`;
    }

    const [rows] = await pool.execute(
      `SELECT r.id AS reminder_id, r.status, r.reminder_date,
              sr.id AS service_record_id, sr.next_due_date, sr.job_card_no,
              v.id AS vehicle_id, v.vehicle_number, v.owner_name, v.owner_phone,
              DATEDIFF(sr.next_due_date, CURDATE()) AS days_left
       FROM reminders r
       INNER JOIN service_records sr ON sr.id = r.service_record_id
       INNER JOIN vehicles v ON v.id = r.vehicle_id
       WHERE r.status = 'PENDING'
       ${dateCondition}
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
