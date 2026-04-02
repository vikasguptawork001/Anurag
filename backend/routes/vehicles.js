import { Router } from "express";
import pool from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.post("/", async (req, res) => {
  try {
    const {
      vehicle_number,
      owner_name,
      owner_phone,
      owner_address,
      vehicle_model,
      avg_daily_km,
    } = req.body;
    if (!vehicle_number?.trim() || !owner_name?.trim()) {
      return res.status(400).json({ error: "Vehicle number and owner name are required" });
    }
    const km = avg_daily_km != null ? Number(avg_daily_km) : 10;
    if (Number.isNaN(km) || km <= 0) {
      return res.status(400).json({ error: "Average daily KM must be a positive number" });
    }
    const [result] = await pool.execute(
      `INSERT INTO vehicles (vehicle_number, owner_name, owner_phone, owner_address, vehicle_model, avg_daily_km)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        vehicle_number.trim().toUpperCase(),
        owner_name.trim(),
        owner_phone?.trim() || null,
        owner_address?.trim() || null,
        vehicle_model?.trim() || null,
        km,
      ]
    );
    const [rows] = await pool.execute("SELECT * FROM vehicles WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Vehicle number already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Could not create vehicle" });
  }
});

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    let rows;
    if (q) {
      const like = `%${q}%`;
      [rows] = await pool.execute(
        `SELECT * FROM vehicles
         WHERE vehicle_number LIKE ? OR owner_name LIKE ?
         ORDER BY created_at DESC`,
        [like, like]
      );
    } else {
      [rows] = await pool.execute(
        "SELECT * FROM vehicles ORDER BY created_at DESC"
      );
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list vehicles" });
  }
});

router.get("/:vehicleNumber", async (req, res) => {
  try {
    const vehicleNumber = decodeURIComponent(req.params.vehicleNumber).trim().toUpperCase();
    const [rows] = await pool.execute(
      "SELECT * FROM vehicles WHERE vehicle_number = ?",
      [vehicleNumber]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch vehicle" });
  }
});

router.put("/:id/avg-km", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { avg_daily_km } = req.body;
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid vehicle id" });
    }
    const km = Number(avg_daily_km);
    if (Number.isNaN(km) || km <= 0) {
      return res.status(400).json({ error: "Average daily KM must be a positive number" });
    }
    const [result] = await pool.execute(
      "UPDATE vehicles SET avg_daily_km = ? WHERE id = ?",
      [km, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    const [rows] = await pool.execute("SELECT * FROM vehicles WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update average KM" });
  }
});

export default router;
