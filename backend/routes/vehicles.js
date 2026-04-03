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

router.patch("/by-id/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid vehicle id" });
    }
    const { owner_name, owner_phone, owner_address, vehicle_model, avg_daily_km } = req.body;
    const [curRows] = await pool.execute("SELECT * FROM vehicles WHERE id = ?", [id]);
    if (!curRows.length) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    const cur = curRows[0];
    const name = owner_name !== undefined ? String(owner_name).trim() : cur.owner_name;
    if (!name) {
      return res.status(400).json({ error: "Owner name is required" });
    }
    const km = avg_daily_km !== undefined ? Number(avg_daily_km) : Number(cur.avg_daily_km);
    if (Number.isNaN(km) || km <= 0) {
      return res.status(400).json({ error: "Average daily KM must be a positive number" });
    }
    const [result] = await pool.execute(
      `UPDATE vehicles SET
        owner_name = ?,
        owner_phone = ?,
        owner_address = ?,
        vehicle_model = ?,
        avg_daily_km = ?
       WHERE id = ? AND archived_at IS NULL`,
      [
        name,
        owner_phone !== undefined ? owner_phone?.trim() || null : cur.owner_phone,
        owner_address !== undefined ? owner_address?.trim() || null : cur.owner_address,
        vehicle_model !== undefined ? vehicle_model?.trim() || null : cur.vehicle_model,
        km,
        id,
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vehicle not found or archived" });
    }
    const [rows] = await pool.execute("SELECT * FROM vehicles WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update vehicle" });
  }
});

router.put("/by-id/:id/archive", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid vehicle id" });
    }
    const [result] = await pool.execute(
      `UPDATE vehicles SET archived_at = CURRENT_TIMESTAMP WHERE id = ? AND archived_at IS NULL`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vehicle not found or already archived" });
    }
    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not archive vehicle" });
  }
});

router.put("/by-id/:id/restore", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid vehicle id" });
    }
    const [result] = await pool.execute(`UPDATE vehicles SET archived_at = NULL WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    const [rows] = await pool.execute("SELECT * FROM vehicles WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not restore vehicle" });
  }
});

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const includeArchived = req.query.include_archived === "1" || req.query.include_archived === "true";
    const archSql = includeArchived ? "TRUE" : "archived_at IS NULL";
    let rows;
    if (q) {
      const like = `%${q}%`;
      [rows] = await pool.execute(
        `SELECT * FROM vehicles
         WHERE (vehicle_number LIKE ? OR owner_name LIKE ?)
         AND (${archSql})
         ORDER BY created_at DESC`,
        [like, like]
      );
    } else {
      [rows] = await pool.execute(`SELECT * FROM vehicles WHERE ${archSql} ORDER BY created_at DESC`);
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
