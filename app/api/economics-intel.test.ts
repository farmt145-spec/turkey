import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  createScenarioInputSchema,
  generateSummaryInputSchema,
  predictProfitInputSchema,
  advisorActionInputSchema,
} from "../contracts/economics";
import { appRouter } from "./router";
import type { TrpcContext } from "./context";

/* ---------- contracts: walidacja Zod ---------- */
describe("contracts/economics — walidacja", () => {
  it("predictProfitInputSchema: minimalne wejście = batchId", () => {
    const ok = predictProfitInputSchema.parse({ batchId: 7 });
    expect(ok.expectedPricePerKg).toBeUndefined();
    expect(() => predictProfitInputSchema.parse({ batchId: 0 })).toThrow();
    expect(() =>
      predictProfitInputSchema.parse({ batchId: 1, expectedMortalityRate: 1.5 }),
    ).toThrow(); // 0–1
  });

  it("createScenarioInputSchema: wymaga ≥1 parametru zmiany", () => {
    expect(() =>
      createScenarioInputSchema.parse({ batchId: 1, name: "Bazowy scenariusz" }),
    ).toThrow();
    const ok = createScenarioInputSchema.parse({
      batchId: 1, name: "Pasza +10%", paramFeedPriceChange: 10,
    });
    expect(ok.paramFeedPriceChange).toBe(10);
  });

  it("createScenarioInputSchema: limity parametrów", () => {
    expect(() =>
      createScenarioInputSchema.parse({ batchId: 1, name: "Test scenariusz", paramFcrChange: 5 }),
    ).toThrow(); // ±2
    expect(() =>
      createScenarioInputSchema.parse({ batchId: 1, name: "Test scenariusz", paramSaleDelayDays: 90 }),
    ).toThrow(); // ±60
  });

  it("generateSummaryInputSchema: domyślny period = batch", () => {
    const ok = generateSummaryInputSchema.parse({ batchId: 3 });
    expect(ok.period).toBe("batch");
  });

  it("advisorActionInputSchema: wymaga id", () => {
    expect(() => advisorActionInputSchema.parse({})).toThrow();
  });
});

/* ---------- API: RBAC economicsIntel (bez bazy — auth przed DB) ---------- */
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

describe("economicsIntel router — RBAC", () => {
  it("economicsIntel.dashboard wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.economicsIntel.dashboard())
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("economicsIntel.predictProfit wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.economicsIntel.predictProfit({ batchId: 1 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("economicsIntel.scenarios wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    try {
      await caller.economicsIntel.scenarios({ batchId: 1 });
      throw new Error("SHOULD_FAIL");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("economicsIntel.benchmarkRecalc wymaga roli admin (FORBIDDEN dla user)", async () => {
    const caller = appRouter.createCaller(userCtx("user"));
    await expect(caller.economicsIntel.benchmarkRecalc({}))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("economicsIntel.benchmarkRecalc wymaga logowania (UNAUTHORIZED bez sesji)", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.economicsIntel.benchmarkRecalc({}))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

/* ---------- regresja: economicsIntel podpięty do appRouter ---------- */
describe("appRouter — rejestracja economicsIntel", () => {
  it("economicsIntel jest podpięty obok pozostałych routerów domenowych", () => {
    const caller = appRouter.createCaller(baseCtx());
    expect(typeof caller.economicsIntel.predictProfit).toBe("function");
    expect(typeof caller.economicsIntel.dashboard).toBe("function");
    expect(typeof caller.warehouseIntel.products).toBe("function");
    expect(typeof caller.productionIntel.timeline).toBe("function");
    expect(typeof caller.feedIntel.optimize).toBe("function");
    expect(typeof caller.healthIntel.vaccinationPrograms).toBe("function");
  });
});
