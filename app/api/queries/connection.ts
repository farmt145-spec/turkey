import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const url = env.tursoDbUrl || env.databaseUrl || "file:local.db";
    instance = drizzle(createClient({
      url,
      authToken: env.tursoAuthToken || undefined,
    }), {
      schema: fullSchema,
    });
  }
  return instance;
}
