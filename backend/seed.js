import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "bajaj_service_center";

  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await conn.query(schema);
  await conn.changeUser({ user, password, database });

  const hash = await bcrypt.hash("admin123", 10);
  await conn.execute(
    `INSERT INTO users (username, password_hash, role)
     VALUES ('admin', ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
    [hash]
  );

  console.log("Database seeded. Demo user: admin / admin123");
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
