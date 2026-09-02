import { eq } from "drizzle-orm";
import * as cookie from "cookie";
import { setCookie } from "hono/cookie";
import type { Context } from "hono";
import { Session } from "@contracts/constants";
import * as schema from "@db/schema";
import type { User } from "@db/schema";
import { getSessionCookieOptions } from "../lib/cookies";
import { getDb } from "../queries/connection";
import { hashPassword, verifyPassword } from "./passwords";
import { signSessionToken, verifySessionToken } from "./session";

export type AuthErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "DUPLICATE"
  | "NOT_FOUND";

export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly status: number;

  constructor(code: AuthErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const localIdentity = (email: string) => `local:${normalizeEmail(email)}`;

export async function findLocalUser(email: string): Promise<User | undefined> {
  const rows = await getDb().select().from(schema.users)
    .where(eq(schema.users.unionId, localIdentity(email))).limit(1);
  return rows.at(0);
}

export async function registerLocalUser(input: {
  email: string;
  password: string;
  name: string;
  companyName: string;
  countryCode: string;
}): Promise<User> {
  const email = normalizeEmail(input.email);
  if (!email || input.password.length < 12 || !input.name.trim() || !input.companyName.trim()) {
    throw new AuthError("VALIDATION_ERROR", "Invalid registration data.", 400);
  }
  if (await findLocalUser(email)) {
    throw new AuthError("DUPLICATE", "An account with this email already exists.", 409);
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const companyId = (await tx.insert(schema.companies).values({
      name: input.companyName.trim(),
      countryCode: input.countryCode.trim().toUpperCase(),
    }).returning({ id: schema.companies.id }))[0].id;
    const [{ id: userId }] = await tx.insert(schema.users).values({
      unionId: localIdentity(email),
      email,
      name: input.name.trim(),
      passwordHash: await hashPassword(input.password),
      role: "admin",
      companyId,
    }).returning({ id: schema.users.id });
    const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!user) throw new Error("Created user could not be loaded.");
    return user;
  });
}

export async function loginLocalUser(email: string, password: string): Promise<User> {
  const user = await findLocalUser(email);
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthError("AUTH_REQUIRED", "Invalid email or password.", 401);
  }
  await getDb().update(schema.users).set({ lastSignInAt: new Date() }).where(eq(schema.users.id, user.id));
  return { ...user, lastSignInAt: new Date() };
}

export async function authenticateRequest(headers: Headers): Promise<User> {
  const token = cookie.parse(headers.get("cookie") ?? "")[Session.cookieName];
  if (!token) throw new AuthError("AUTH_REQUIRED", "Authentication required.", 401);
  const claim = await verifySessionToken(token);
  if (!claim) throw new AuthError("AUTH_REQUIRED", "Invalid or expired session.", 401);
  const [user] = await getDb().select().from(schema.users).where(eq(schema.users.id, claim.userId));
  if (!user || user.sessionVersion !== claim.sessionVersion) {
    throw new AuthError("AUTH_REQUIRED", "Session has been revoked.", 401);
  }
  return user;
}

export async function establishSession(c: Context, user: User) {
  const token = await signSessionToken({ userId: user.id, sessionVersion: user.sessionVersion });
  setCookie(c, Session.cookieName, token, {
    ...getSessionCookieOptions(c.req.raw.headers),
    maxAge: Math.floor(Session.maxAgeMs / 1000),
  });
}

export async function revokeSession(c: Context, user: User) {
  await getDb().update(schema.users)
    .set({ sessionVersion: user.sessionVersion + 1 })
    .where(eq(schema.users.id, user.id));
  setCookie(c, Session.cookieName, "", {
    ...getSessionCookieOptions(c.req.raw.headers),
    maxAge: 0,
  });
}
