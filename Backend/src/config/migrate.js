import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createPool } from "./db.js";
import { getDatabaseConfig } from "./env.js";

export async function runMigrations(pool, migrationsDirectory = fileURLToPath(new URL("../../database/migrations/", import.meta.url))) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(191) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const [appliedRows] = await pool.execute("SELECT version FROM schema_migrations WHERE version = ?", [file]);
    if (appliedRows.length) {
      console.info(`Already applied: ${file}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDirectory, file), "utf8");
    const statements = sql.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
    const connection = await pool.getConnection();
    try {
      for (const statement of statements) await connection.query(statement);
      await connection.execute("INSERT INTO schema_migrations (version) VALUES (?)", [file]);
    } finally {
      connection.release();
    }
    console.info(`Applied: ${file}`);
  }
}

export function safeMigrationErrorMessage(error, secrets = []) {
  let message = typeof error?.message === "string" ? error.message : "Unknown migration error.";
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length > 0) {
      message = message.replaceAll(secret, "[REDACTED]");
    }
  }
  return message.replace(/(access denied for user\s+)'[^']+'@'[^']+'/i, "$1[REDACTED]");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let pool;
  let dbConfig;
  try {
    dbConfig = getDatabaseConfig();
    pool = createPool(dbConfig);
    await runMigrations(pool);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("Migration failed. Check the protected server logs for details.");
    } else {
      const code = typeof error?.code === "string" ? error.code : error?.name ?? "Error";
      const message = safeMigrationErrorMessage(error, [dbConfig?.password]);
      console.error(`Migration failed (${code}): ${message}`);
    }
    process.exitCode = 1;
  } finally {
    await pool?.end();
  }
}
