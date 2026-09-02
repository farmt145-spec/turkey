import { createClient } from "@libsql/client";
import mysql from "mysql2/promise";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };
const MYSQL_URL_RE = /^(mysql|mariadb):\/\//i;

let instance: any;
let mysqlPool: mysql.Pool | undefined;

function useMySql() {
  if (env.databaseType === "mysql") return true;
  if (env.databaseType === "turso" || env.databaseType === "libsql" || env.databaseType === "sqlite") return false;
  return Boolean(env.databaseUrl && MYSQL_URL_RE.test(env.databaseUrl));
}

export function getDb(): any {
  if (!instance) {
    if (useMySql()) {
      const url = env.databaseUrl;
      if (!url) throw new Error("Missing DATABASE_URL for MySQL connection.");
      mysqlPool = mysql.createPool(url);
      instance = drizzleMysql(mysqlPool, {
        schema: fullSchema,
        mode: "default",
      });
    } else {
      const url = env.tursoDbUrl || env.databaseUrl || "file:local.db";
      instance = drizzleLibsql(createClient({
        url,
        authToken: env.tursoAuthToken || undefined,
      }), {
        schema: fullSchema,
      });
    }
  }
  return instance;
}
