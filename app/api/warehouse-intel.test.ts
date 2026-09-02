import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  quarantineSetSchema,
  reserveForRecipeInputSchema,
  warehouseMovementCreateSchema,
  warehouseProductCreateSchema,
  findSubstitutesInputSchema,
} from "../contracts/warehouse";
import { appRouter } from "./router";
import type { TrpcContext } from "./context";

/* ---------- contracts: walidacja Zod ---------- */
describe("contracts/warehouse — walidacja", () => {
  it("warehouseProductCreateSchema: domyślne wartości i unikalny SKU", () => {
    const ok = warehouseProductCreateSchema.parse({
      sku: "PSZ-001", name: "Pszenica", category: "feed_raw",
    });
    expect(ok.unit).toBe("kg");
    expect(ok.leadTimeDays).toBe(7);
    expect(() =>
      warehouseProductCreateSchema.parse({ sku: "X", name: "Pszenica", category: "feed_raw" }),
    ).toThrow(); // sku min 2
  });

  it("warehouseMovementCreateSchema: przyjęcie wymaga celu, wydanie źródła", () => {
    expect(() =>
      warehouseMovementCreateSchema.parse({
        productId: 1, type: "receipt", subtype: "pz", quantity: 100,
      }),
    ).toThrow();
    expect(() =>
      warehouseMovementCreateSchema.parse({
        productId: 1, type: "issue", subtype: "rw", quantity: 100,
      }),
    ).toThrow();
    const ok = warehouseMovementCreateSchema.parse({
      productId: 1, type: "receipt", subtype: "pz", quantity: 100, toWarehouseId: 2, unitCost: 1.25,
    });
    expect("totalValue" in ok).toBe(false); // liczone w serwisie
  });

  it("warehouseMovementCreateSchema: quantity musi być dodatnie", () => {
    expect(() =>
      warehouseMovementCreateSchema.parse({
        productId: 1, type: "adjustment", subtype: "adjust", quantity: 0,
      }),
    ).toThrow();
  });

  it("quarantineSetSchema: wymaga lotId", () => {
    expect(() => quarantineSetSchema.parse({ isQuarantined: true })).toThrow();
    const ok = quarantineSetSchema.parse({ lotId: 5, isQuarantined: true, reason: "Podejrzenie salmonelli" });
    expect(ok.isQuarantined).toBe(true);
  });

  it("reserveForRecipeInputSchema: quantityKg dodatnie", () => {
    expect(() =>
      reserveForRecipeInputSchema.parse({ recipeId: 1, batchId: 2, quantityKg: -5 }),
    ).toThrow();
  });

  it("findSubstitutesInputSchema: requiredQty dodatnie", () => {
    expect(() => findSubstitutesInputSchema.parse({ productId: 1, requiredQty: 0 })).toThrow();
  });
});

/* ---------- API: RBAC warehouseIntel (bez bazy — auth przed DB) ---------- */
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

describe("warehouseIntel router — RBAC", () => {
  it("warehouseIntel.products wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.warehouseIntel.products())
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("warehouseIntel.movementCreate wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(
      caller.warehouseIntel.movementCreate({
        productId: 1, type: "receipt", subtype: "pz", quantity: 10, toWarehouseId: 1,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("warehouseIntel.dashboard wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    try {
      await caller.warehouseIntel.dashboard();
      throw new Error("SHOULD_FAIL");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("warehouseIntel.alertScan wymaga roli admin (FORBIDDEN dla user)", async () => {
    const caller = appRouter.createCaller(userCtx("user"));
    await expect(caller.warehouseIntel.alertScan())
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("warehouseIntel.alertScan wymaga logowania (UNAUTHORIZED bez sesji)", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.warehouseIntel.alertScan())
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

/* ---------- regresja: warehouseIntel podpięty do appRouter ---------- */
describe("appRouter — rejestracja warehouseIntel", () => {
  it("warehouseIntel jest podpięty obok pozostałych routerów domenowych", () => {
    const caller = appRouter.createCaller(baseCtx());
    expect(typeof caller.warehouseIntel.products).toBe("function");
    expect(typeof caller.warehouseIntel.dashboard).toBe("function");
    expect(typeof caller.productionIntel.timeline).toBe("function");
    expect(typeof caller.feedIntel.optimize).toBe("function");
    expect(typeof caller.healthIntel.vaccinationPrograms).toBe("function");
  });
});
