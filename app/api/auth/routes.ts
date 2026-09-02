import type { HttpBindings } from "@hono/node-server";
import type { Hono } from "hono";
import { z } from "zod";
import {
  AuthError,
  authenticateRequest,
  establishSession,
  loginLocalUser,
  registerLocalUser,
  revokeSession,
} from "./local";

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(256),
});

const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(256),
  name: z.string().trim().min(2).max(255),
  companyName: z.string().trim().min(2).max(255),
  countryCode: z.string().trim().length(2),
});

function errorResponse(error: unknown) {
  if (error instanceof AuthError) return { status: error.status as 400 | 401 | 409, body: { error: error.code, message: error.message } };
  if (error instanceof z.ZodError) return { status: 400 as const, body: { error: "VALIDATION_ERROR", message: "Invalid request body." } };
  throw error;
}

export function registerAuthRoutes(app: Hono<{ Bindings: HttpBindings }>) {
  app.post("/api/auth/register", async (c) => {
    try {
      const user = await registerLocalUser(registerSchema.parse(await c.req.json()));
      await establishSession(c, user);
      return c.json({ user: publicUser(user) }, 201);
    } catch (error) {
      const response = errorResponse(error);
      return c.json(response.body, response.status);
    }
  });

  app.post("/api/auth/login", async (c) => {
    try {
      const input = loginSchema.parse(await c.req.json());
      const user = await loginLocalUser(input.email, input.password);
      await establishSession(c, user);
      return c.json({ user: publicUser(user) });
    } catch (error) {
      const response = errorResponse(error);
      return c.json(response.body, response.status);
    }
  });

  app.get("/api/auth/me", async (c) => {
    try {
      return c.json({ user: publicUser(await authenticateRequest(c.req.raw.headers)) });
    } catch (error) {
      const response = errorResponse(error);
      return c.json(response.body, response.status);
    }
  });

  app.post("/api/auth/logout", async (c) => {
    try {
      const user = await authenticateRequest(c.req.raw.headers);
      await revokeSession(c, user);
      return c.json({ success: true });
    } catch (error) {
      const response = errorResponse(error);
      return c.json(response.body, response.status);
    }
  });
}

function publicUser(user: { id: number; name: string | null; email: string | null; role: "user" | "admin"; companyId: number | null }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId };
}
