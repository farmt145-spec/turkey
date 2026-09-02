import type { Handler } from "@netlify/functions";
import { eq } from "drizzle-orm";
import * as cookie from "cookie";
import { getDb } from "../../api/queries/connection";
import { signSessionToken } from "../../api/auth/session";
import { getSessionCookieOptions } from "../../api/lib/cookies";
import { ensureSeeded } from "../../api/seed";
import * as s from "../../db/schema";
import { eventToRequest } from "./_http";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  await ensureSeeded();

  const req = eventToRequest(event);
  const url = new URL(req.url);
  const companyId = Number.parseInt(url.searchParams.get("companyId") ?? "1", 10) || 1;

  const db = getDb();
  const [company] = await db.select().from(s.companies).where(eq(s.companies.id, companyId)).limit(1);
  if (!company) {
    return {
      statusCode: 404,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Company not found" }),
    };
  }

  let [user] = await db.select().from(s.users).where(eq(s.users.unionId, "demo-user")).limit(1);
  if (!user) {
    const [{ id: userId }] = await db.insert(s.users).values({
      unionId: "demo-user",
      name: "Demo User",
      companyId: company.id,
      role: "user",
      sessionVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignInAt: new Date(),
    }).returning({ id: s.users.id });
    [user] = await db.select().from(s.users).where(eq(s.users.id, userId)).limit(1);
  } else {
    await db.update(s.users)
      .set({ companyId: company.id, lastSignInAt: new Date() })
      .where(eq(s.users.id, user.id));
    [user] = await db.select().from(s.users).where(eq(s.users.id, user.id)).limit(1);
  }

  if (!user) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Unable to create demo user" }),
    };
  }

  const token = await signSessionToken({ userId: user.id, sessionVersion: user.sessionVersion });
  const cookieOptions = getSessionCookieOptions(req.headers);
  const sessionCookie = cookie.serialize("session", token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    statusCode: 302,
    headers: {
      Location: "/",
      "Set-Cookie": sessionCookie,
    },
    body: "",
  };
};
