import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_DB_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "sqlite",
  ...(url
    ? {
        dbCredentials: {
          url,
          authToken: process.env.TURSO_AUTH_TOKEN,
        },
      }
    : {}),
});
