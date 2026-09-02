/**
 * Zastosuj WSZYSTKIE migracje SQL z db/migrations w kolejności alfabetycznej.
 * Błędy "table already exists" / "Duplicate" są pomijane — skrypt jest idempotentny
 * i bezpieczny do wielokrotnego uruchamiania (np. przy każdym starcie kontenera).
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const MYSQL_URL_RE = /^(mysql|mariadb):\/\//i;
let migrationPromise: Promise<void> | null = null;

function usesMySql() {
  const explicitType = (process.env.DATABASE_TYPE ?? "").trim().toLowerCase();
  if (explicitType === "mysql") return true;
  if (explicitType === "turso" || explicitType === "libsql" || explicitType === "sqlite") return false;
  return MYSQL_URL_RE.test(process.env.DATABASE_URL ?? "");
}

async function runAllMigrations(url: string) {
  const dir = "db/migrations";
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const conn = await mysql.createConnection(url);
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const stmts = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    for (const st of stmts) {
      try {
        await conn.query(st);
      } catch (e: any) {
        if (/already exists|Duplicate/i.test(e.message)) continue;
        console.error(`Błąd w ${file}:`, e.message.slice(0, 200));
        throw e;
      }
    }
    console.log(`✓ ${file}`);
  }
  console.log("Wszystkie migracje zastosowane.");
  await conn.end();
}

export async function ensureMySqlSchema() {
  const url = process.env.DATABASE_URL;
  if (!url || !usesMySql()) return;
  if (!migrationPromise) {
    migrationPromise = runAllMigrations(url).catch((error) => {
      migrationPromise = null;
      throw error;
    });
  }
  await migrationPromise;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !usesMySql()) throw new Error("Brak poprawnego MySQL DATABASE_URL");
  await ensureMySqlSchema();
}

if (process.argv[1] && process.argv[1].endsWith("/db/migrate-all.ts")) {
  main().catch((e) => {
    console.error("Migracja nieudana:", e.message);
    process.exit(1);
  });
}
