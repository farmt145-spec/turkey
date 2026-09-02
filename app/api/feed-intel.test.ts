import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  experimentChangeSchema,
  experimentCreateSchema,
  feedAlertCreateSchema,
  knowledgeEntryCreateSchema,
  knowledgeSearchInputSchema,
  optimizationConstraintsSchema,
} from "../contracts/feed";
import { appRouter } from "./router";
import type { TrpcContext } from "./context";

/* ---------- contracts: walidacja Zod ---------- */
describe("contracts/feed — walidacja", () => {
  it("optimizationConstraintsSchema: domyślne priority=balanced", () => {
    const c = optimizationConstraintsSchema.parse({});
    expect(c.priority).toBe("balanced");
    expect(c.minIngredientPct).toBe(0);
  });

  it("optimizationConstraintsSchema: odrzuca błędny priorytet", () => {
    expect(() => optimizationConstraintsSchema.parse({ priority: "magic" })).toThrow();
  });

  it("knowledgeSearchInputSchema: akceptuje filtry opcjonalne", () => {
    expect(knowledgeSearchInputSchema.parse({})).toEqual({});
    expect(knowledgeSearchInputSchema.parse({ type: "common_mistake", phase: "starter" }).type).toBe("common_mistake");
  });

  it("knowledgeEntryCreateSchema: wymaga tytułu ≥3 znaków i summary ≥10", () => {
    expect(() =>
      knowledgeEntryCreateSchema.parse({ type: "standard", title: "ab", source: "NRC", summary: "krótkie" }),
    ).toThrow();
    const ok = knowledgeEntryCreateSchema.parse({
      type: "standard",
      title: "Norma NRC dla indyków",
      source: "NRC",
      summary: "Wartości referencyjne lizyny.",
    });
    expect(ok.credibility).toBe(0.5);
  });

  it("experimentChangeSchema: akcje remove/add/adjust", () => {
    expect(experimentChangeSchema.parse({ ingredientId: 1, action: "remove" }).action).toBe("remove");
    expect(() => experimentChangeSchema.parse({ ingredientId: 1, action: "clone" })).toThrow();
  });

  it("experimentCreateSchema: wymaga ≥1 zmiany", () => {
    expect(() => experimentCreateSchema.parse({ name: "Test X", baseRecipeId: 1, changes: [] })).toThrow();
  });

  it("feedAlertCreateSchema: severity domyślnie warning", () => {
    const a = feedAlertCreateSchema.parse({
      type: "stock_low",
      sourceType: "ingredient",
      sourceId: 7,
      title: "Niski stan soi",
      message: "Poniżej progu.",
    });
    expect(a.severity).toBe("warning");
  });
});

/* ---------- API: ochrona endpointów feedIntel (bez bazy — auth przed DB) ---------- */
const baseCtx = (): TrpcContext => ({
  req: new Request("http://localhost/api/trpc"),
  resHeaders: new Headers(),
});

const userCtx = (role: "user" | "admin"): TrpcContext => ({
  ...baseCtx(),
  user: {
    id: 1, unionId: "t", name: "T", email: null, avatar: null, role,
    companyId: null, createdAt: new Date(), updatedAt: new Date(), lastSignInAt: new Date(),
  },
});

describe("feedIntel router — RBAC", () => {
  it("feedIntel.optimize wymaga logowania (UNAUTHORIZED)", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.feedIntel.optimize({} as never)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("feedIntel.knowledgeSearch wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.feedIntel.knowledgeSearch({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("feedIntel.alertsScan wymaga roli admin (FORBIDDEN dla user)", async () => {
    const caller = appRouter.createCaller(userCtx("user"));
    await expect(caller.feedIntel.alertsScan({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("feedIntel.alerts wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    try {
      await caller.feedIntel.alerts();
      throw new Error("SHOULD_FAIL");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});
