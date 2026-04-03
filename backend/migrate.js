import pool from "./db.js";

const alters = [
  "ALTER TABLE service_records ADD COLUMN archived_at DATETIME NULL DEFAULT NULL",
  "ALTER TABLE vehicles ADD COLUMN archived_at DATETIME NULL DEFAULT NULL",
  "ALTER TABLE call_records ADD COLUMN archived_at DATETIME NULL DEFAULT NULL",
];

/** Idempotent column adds for existing databases. */
export async function runMigrations() {
  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        continue;
      }
      throw err;
    }
  }
}
