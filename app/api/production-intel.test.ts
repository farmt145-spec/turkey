import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  analyzeDayInputSchema,
  batchEndForecastInputSchema,
  mergeBatchesInputSchema,
  productionEventCreateSchema,
  splitBatchInputSchema,
} from "../contracts/production";
import { appRouter } from "./router";
import type { TrpcContext } from "./context";

/* ---------- contracts: walidacja Zod ---------- */
describe("contracts/production — walidacja", () => {
  it("analyzeDayInputSchema: wymaga daty YYYY-MM-DD", () => {
    expect(() => analyzeDayInputSchema.parse({ batchId: 1, day: "01-01-2026" })).toThrow();
    const ok = analyzeDayInputSchema.parse({ batchId: 1, day: "2026-08-01", co2Ppm: 1800 });
    expect(ok.batchId).toBe(1);
  });

  it("batchEndForecastInputSchema: domyślne ceny 1.8 / 6.5", () => {
    const ok = batchEndForecastInputSchema.parse({ batchId: 5 });
    expect(ok.feedPricePerKg).toBe(1.8);
    expect(ok.livePricePerKg).toBe(6.5);
  });

  it("productionEventCreateSchema: waliduje typ zdarzenia i opis", () => {
    expect(() =>
      productionEventCreateSchema.parse({ batchId: 1, eventType: "magic", description: "test zdarzenia" }),
    ).toThrow();
    expect(() =>
      productionEventCreateSchema.parse({ batchId: 1, eventType: "weighing", description: "ab" }),
    ).toThrow(); // opis min 3 znaki
    const ok = productionEventCreateSchema.parse({
      batchId: 1, eventType: "breakdown", description: "Awaria linii pojenia",
    });
    expect(ok.dayNumber).toBe(0);
  });

  it("splitBatchInputSchema: wymaga ≥1 celu i dodatnich liczb", () => {
    expect(() => splitBatchInputSchema.parse({ batchId: 1, splits: [] })).toThrow();
    expect(() =>
      splitBatchInputSchema.parse({ batchId: 1, splits: [{ houseId: 2, count: 0 }] }),
    ).toThrow();
    const ok = splitBatchInputSchema.parse({
      batchId: 1, splits: [{ houseId: 2, count: 1500, avgWeightG: 4200 }],
    });
    expect(ok.splits).toHaveLength(1);
  });

  it("mergeBatchesInputSchema: wymaga ≥2 źródeł", () => {
    expect(() =>
      mergeBatchesInputSchema.parse({ sourceBatchIds: [1], targetHouseId: 3 }),
    ).toThrow();
    const ok = mergeBatchesInputSchema.parse({ sourceBatchIds: [1, 2], targetHouseId: 3 });
    expect(ok.sourceBatchIds).toHaveLength(2);
  });
});

/* ---------- API: RBAC productionIntel (bez bazy — auth przed DB) ---------- */
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

describe("productionIntel router — RBAC", () => {
  it("productionIntel.analyses wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.productionIntel.analyses({ batchId: 1 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("productionIntel.analyzeDay wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.productionIntel.analyzeDay({ batchId: 1, day: "2026-08-01" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("productionIntel.timeline wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    try {
      await caller.productionIntel.timeline({ batchId: 1 });
      throw new Error("SHOULD_FAIL");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("productionIntel.split wymaga roli admin (FORBIDDEN dla user)", async () => {
    const caller = appRouter.createCaller(userCtx("user"));
    await expect(
      caller.productionIntel.split({ batchId: 1, splits: [{ houseId: 2, count: 100 }] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("productionIntel.merge wymaga roli admin (UNAUTHORIZED bez sesji)", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(
      caller.productionIntel.merge({ sourceBatchIds: [1, 2], targetHouseId: 3 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

/* ---------- regresja: productionIntel podpięty do appRouter ---------- */
describe("appRouter — rejestracja productionIntel", () => {
  it("productionIntel jest podpięty obok feedIntel/healthIntel", () => {
    const caller = appRouter.createCaller(baseCtx());
    expect(typeof caller.productionIntel.analyzeDay).toBe("function");
    expect(typeof caller.productionIntel.timeline).toBe("function");
    expect(typeof caller.feedIntel.optimize).toBe("function");
    expect(typeof caller.healthIntel.vaccinationPrograms).toBe("function");
  });
});
