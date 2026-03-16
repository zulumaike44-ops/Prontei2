/**
 * Auto-migration script that runs before the server starts.
 * Ensures the database schema is up-to-date without requiring drizzle-kit in production.
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

const MIGRATIONS = [
  {
    name: "add_passwordHash_to_users",
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash varchar(255) DEFAULT NULL`,
    // MySQL < 8.0.19 doesn't support IF NOT EXISTS for ADD COLUMN, so we handle the error
    ignoreDuplicate: true,
  },
  {
    name: "add_loginMethod_default",
    sql: `ALTER TABLE users MODIFY COLUMN loginMethod varchar(50) DEFAULT 'email'`,
    ignoreDuplicate: true,
  },
];

async function runMigrations() {
  if (!DATABASE_URL) {
    console.log("[Migrate] No DATABASE_URL, skipping migrations");
    return;
  }

  let connection: mysql.Connection | null = null;

  try {
    console.log("[Migrate] Connecting to database...");
    connection = await mysql.createConnection(DATABASE_URL);
    console.log("[Migrate] Connected. Running migrations...");

    for (const migration of MIGRATIONS) {
      try {
        await connection.execute(migration.sql);
        console.log(`[Migrate] ✅ ${migration.name}`);
      } catch (error: any) {
        if (
          migration.ignoreDuplicate &&
          (error.code === "ER_DUP_FIELDNAME" || error.errno === 1060)
        ) {
          console.log(`[Migrate] ⏭️  ${migration.name} (already exists)`);
        } else {
          console.error(`[Migrate] ❌ ${migration.name}:`, error.message);
        }
      }
    }

    console.log("[Migrate] Migrations complete.");
  } catch (error: any) {
    console.error("[Migrate] Connection failed:", error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations();
