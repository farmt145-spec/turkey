import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { registerAuthRoutes } from "./auth/routes";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(
  "/api/*",
  cors({
    origin: env.frontendUrl || ((origin) => origin),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

/* =========================================================
   HEALTHCHECK
   ========================================================= */

app.get("/health", (c) => {
  return c.json({
    status: "ok",
  });
});

/* =========================================================
   BODY LIMIT
   ========================================================= */

app.use(
  bodyLimit({
    maxSize: 50 * 1024 * 1024,
  }),
);

registerAuthRoutes(app);

async function establishDemoSession(c: Context<{ Bindings: HttpBindings }>, companyId: number, identity: string, name: string) {
  const { establishSession } = await import("./auth/local");
  const { findUserByUnionId } = await import("./queries/users");
  const { getDb } = await import("./queries/connection");
  const { companies, users } = await import("@db/schema");
  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) return null;
  let user = await findUserByUnionId(identity);
  if (!user) {
    const [{ id }] = await db.insert(users).values({
      unionId: identity,
      name,
      role: "user",
      companyId,
    }).returning({ id: users.id });
    [user] = await db.select().from(users).where(eq(users.id, id));
  } else if (user.companyId !== companyId) {
    await db.update(users).set({ companyId, name }).where(eq(users.id, user.id));
    [user] = await db.select().from(users).where(eq(users.id, user.id));
  }
  await establishSession(c, user);
  return user;
}

if (env.demoMode) {
  app.get("/api/demo-login", async (c) => {
    if (!env.demoCompanyId) return c.json({ error: "DEMO_NOT_CONFIGURED" }, 503);
    const user = await establishDemoSession(c, env.demoCompanyId, "public-demo", "Public Demo");
    if (!user) return c.json({ error: "DEMO_COMPANY_NOT_FOUND" }, 503);
    return c.redirect(env.frontendUrl || "/", 302);
  });
}

/* =========================================================
  DEV LOGIN
  Tylko poza production.
  ========================================================= */

/* DEV-ONLY: lokalne logowanie dla istniejącego użytkownika. */
if (!env.isProduction) {
  app.get("/api/dev-login", async (c) => {
    const { getDb } = await import("./queries/connection");
    const { companies } = await import("@db/schema");
    const db = getDb();
    const [company] = env.demoCompanyId
      ? await db.select().from(companies).where(eq(companies.id, env.demoCompanyId)).limit(1)
      : await db.select().from(companies).limit(1);
    const companyId = company?.id ?? (await db.insert(companies).values({
        name: "Bloody Turkey Demo",
        countryCode: "PL",
    }).returning({ id: companies.id }))[0].id;
    await establishDemoSession(c, companyId, env.ownerUnionId || "dev-owner", "Local Demo");
    return c.redirect("/");
  });
}

/* Upload plików (multipart) — zapis do /mnt/agents/output/uploads */
app.post("/api/upload", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return c.json({ error: "Brak pliku" }, 400);
  const { mkdir, writeFile } = await import("fs/promises");
  const dir = env.uploadDir;
  await mkdir(dir, { recursive: true });
  const safe = file.name.replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]/g, "_").slice(-120);
  const name = `${Date.now()}_${safe}`;
  await writeFile(`${dir}/${name}`, Buffer.from(await file.arrayBuffer()));
  return c.json({ ok: true, url: `/uploads/${name}`, name: file.name, size: file.size });
});
app.get("/uploads/*", async (c) => {
  const { readFile } = await import("fs/promises");
  const path = `${env.uploadDir}/${c.req.path.replace(/^\/uploads\//, "")}`;
  try {
    const buf = await readFile(path);
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const mime = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
    return c.body(new Uint8Array(buf), 200, { "Content-Type": mime });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});
/* Ingest danych z komputerów/czujników/systemów zewnętrznych — autoryzacja kluczem API (nagłówek X-API-Key).
   Przykład: POST /api/v1/ingest  {"type":"climate","houseId":1,"tempC":21.5,"humidityPct":62,"ammoniaPpm":8} */
app.post("/api/v1/ingest", async (c) => {
  const { verifyApiKey } = await import("./transfer-router");
  const key = c.req.header("x-api-key") ?? "";
  const apiKey = key ? await verifyApiKey(key) : null;
  if (!apiKey) return c.json({ error: "Nieprawidłowy lub nieaktywny klucz API" }, 401);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.type !== "string") return c.json({ error: "Wymagane pole type" }, 400);

  const { getDb } = await import("./queries/connection");
  const s = await import("@db/schema");
  const db = getDb();

  switch (body.type) {
    case "climate": {
      if (!body.houseId) return c.json({ error: "Wymagane houseId" }, 400);
      const [{ id }] = await db.insert(s.climateLogs).values({
        houseId: Number(body.houseId),
        tempC: body.tempC != null ? String(body.tempC) : null,
        humidityPct: body.humidityPct != null ? String(body.humidityPct) : null,
        co2Ppm: body.co2Ppm != null ? Number(body.co2Ppm) : null,
        ammoniaPpm: body.ammoniaPpm != null ? String(body.ammoniaPpm) : null,
        ventilationPct: body.ventilationPct != null ? Number(body.ventilationPct) : null,
        source: `api:${apiKey.keyPrefix}`,
      }).returning({ id: s.climateLogs.id });
      return c.json({ ok: true, inserted: "climate", id });
    }
    case "feedUsage": {
      if (!body.batchId || !body.kg) return c.json({ error: "Wymagane batchId i kg" }, 400);
      const [{ id }] = await db.insert(s.feedUsages).values({
        batchId: Number(body.batchId),
        day: String(body.day ?? new Date().toISOString().slice(0, 10)),
        kg: String(body.kg),
      }).returning({ id: s.feedUsages.id });
      return c.json({ ok: true, inserted: "feedUsage", id });
    }
    case "mortality": {
      if (!body.batchId || !body.count) return c.json({ error: "Wymagane batchId i count" }, 400);
      const [{ id }] = await db.insert(s.mortalities).values({
        batchId: Number(body.batchId),
        day: String(body.day ?? new Date().toISOString().slice(0, 10)),
        count: Number(body.count),
        cause: String(body.cause ?? "zgłoszenie API"),
      }).returning({ id: s.mortalities.id });
      return c.json({ ok: true, inserted: "mortality", id });
    }
    case "weighing": {
      if (!body.batchId || !body.avgWeightG) return c.json({ error: "Wymagane batchId i avgWeightG" }, 400);
      const [{ id }] = await db.insert(s.weighings).values({
        batchId: Number(body.batchId),
        weighedAt: body.weighedAt ? new Date(body.weighedAt) : new Date(),
        dayAge: Number(body.dayAge ?? 0),
        sampleSize: Number(body.sampleSize ?? 1),
        avgWeightG: Number(body.avgWeightG),
        operator: `api:${apiKey.keyPrefix}`,
      }).returning({ id: s.weighings.id });
      return c.json({ ok: true, inserted: "weighing", id });
    }
    default:
      return c.json({ error: `Nieznany typ: ${body.type}. Dozwolone: climate, feedUsage, mortality, weighing` }, 400);
  }
});

app.use("/api/trpc/*", async (c) => {  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
