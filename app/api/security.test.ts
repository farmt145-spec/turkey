import { describe, expect, it } from "vitest";
import { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { authedQuery, adminQuery } from "./middleware";
import { appRouter } from "./router";
import { resolveDefaultCompanyId } from "./erp-router";
import { requireRequestedCompany, requireTenantCompany } from "./tenant";

/* ---------- helpers ---------- */
const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

const baseCtx = (): TrpcContext => ({
  req: new Request("http://localhost/api/trpc"),
  resHeaders: new Headers(),
});

const userCtx = (role: "user" | "admin"): TrpcContext => ({
  ...baseCtx(),
  user: {
    id: 1,
    unionId: "test-union",
    name: "Test",
    email: "t@example.com",
    avatar: null,
    role,
    companyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignInAt: new Date(),
  },
});

/* ---------- middleware unit tests ---------- */
describe("RBAC middleware (unit)", () => {
  const probeAuthed = t.router({ x: authedQuery.query(() => "ok") });
  const probeAdmin = t.router({ x: adminQuery.query(() => "ok") });

  it("authedQuery odrzuca brak użytkownika (UNAUTHORIZED)", async () => {
    const caller = probeAuthed.createCaller(baseCtx());
    await expect(caller.x()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("authedQuery przepuszcza zalogowanego użytkownika", async () => {
    const caller = probeAuthed.createCaller(userCtx("user"));
    await expect(caller.x()).resolves.toBe("ok");
  });

  it("adminQuery odrzuca rolę user (FORBIDDEN)", async () => {
    const caller = probeAdmin.createCaller(userCtx("user"));
    await expect(caller.x()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("adminQuery przepuszcza rolę admin", async () => {
    const caller = probeAdmin.createCaller(userCtx("admin"));
    await expect(caller.x()).resolves.toBe("ok");
  });
});

describe("tenant guards (unit)", () => {
  it("uses only the company assigned to the authenticated user", () => {
    const user = userCtx("user").user!;
    user.companyId = 42;
    expect(requireTenantCompany(user)).toBe(42);
    expect(() => requireRequestedCompany(user, 43)).toThrow(/TENANT_MISMATCH/);
  });

  it("rejects a session without a company before accessing tenant data", () => {
    expect(() => requireTenantCompany(userCtx("user").user!)).toThrow(/TENANT_MISMATCH/);
  });
});

/* ---------- API security tests (bez bazy — auth odpala przed DB) ---------- */
describe("appRouter — ochrona endpointów (API)", () => {
  it("resolveDefaultCompanyId zwraca companyId użytkownika, gdy istnieje", async () => {
    await expect(resolveDefaultCompanyId(42)).resolves.toBe(42);
  });

  it("ping pozostaje publiczny", async () => {
    const caller = appRouter.createCaller(baseCtx());
    const res = await caller.ping();
    expect(res.ok).toBe(true);
  });

  it.each([
    ["farm.production.batches", (c: ReturnType<typeof appRouter.createCaller>) => c.farm.production.batches()],
    ["farm.dashboard.kpis", (c: ReturnType<typeof appRouter.createCaller>) => c.farm.dashboard.kpis()],
    ["org.companies", (c: ReturnType<typeof appRouter.createCaller>) => c.org.companies()],
    ["analytics.compareBatches", (c: ReturnType<typeof appRouter.createCaller>) => c.analytics.compareBatches()],
    ["nutrition.ingredients", (c: ReturnType<typeof appRouter.createCaller>) => c.nutrition.ingredients()],
    ["command.dailyReport", (c: ReturnType<typeof appRouter.createCaller>) => c.command.dailyReport()],
    ["notifications.list", (c: ReturnType<typeof appRouter.createCaller>) => c.notifications.list()],
    ["transfer.exportAll", (c: ReturnType<typeof appRouter.createCaller>) => c.transfer.exportAll()],
  ])("%s wymaga logowania (UNAUTHORIZED bez sesji)", async (_name, call) => {
    const caller = appRouter.createCaller(baseCtx());
    try {
      await call(caller);
      throw new Error("EXPECTED_UNAUTHORIZED_BUT_PASSED");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("transfer.exportAll wymaga roli admin (FORBIDDEN dla user)", async () => {
    const caller = appRouter.createCaller(userCtx("user"));
    await expect(caller.transfer.exportAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("nutrition.deleteRecipe wymaga roli admin (FORBIDDEN dla user)", async () => {
    const caller = appRouter.createCaller(userCtx("user"));
    await expect(
      caller.nutrition.deleteRecipe({ recipeId: 1 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
