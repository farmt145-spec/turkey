import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  deviceCreateSchema,
  deviceUpdateSchema,
  feedShortageScanSchema,
  telemetryIngestSchema,
  telemetryQuerySchema,
} from "../contracts/iot";
import { appRouter } from "./router";
import type { TrpcContext } from "./context";

/* ---------- contracts: walidacja Zod ---------- */
describe("contracts/iot — walidacja", () => {
  it("deviceCreateSchema: modbusAddress 0–247, wymaga farmId/code/name/deviceTypeId", () => {
    const ok = deviceCreateSchema.parse({ farmId: 1, deviceTypeId: 2, code: "TEMP-01", name: "Czujnik T" });
    expect(ok.code).toBe("TEMP-01");
    expect(() =>
      deviceCreateSchema.parse({ farmId: 1, deviceTypeId: 2, code: "X", name: "X", modbusAddress: 300 }),
    ).toThrow();
    expect(() => deviceCreateSchema.parse({ deviceTypeId: 2, code: "X", name: "X" })).toThrow();
  });

  it("deviceCreateSchema: akceptuje konfigurację połączenia zewnętrznego i zapisuje ją w config", () => {
    const ok = deviceCreateSchema.parse({
      farmId: 1,
      deviceTypeId: 2,
      code: "CTRL-01",
      name: "Kontroler klimatu",
      ipAddress: "10.0.0.18",
      mqttTopic: "bte/farm-1/house-2",
      connection: {
        mode: "mqtt",
        host: "10.0.0.18",
        port: 1883,
        topic: "bte/farm-1/house-2",
        apiKey: "demo-key",
        notes: "Połączenie z komputerem kurnika",
      },
      config: { source: "manual-setup", enabled: true },
    });
    expect(ok.connection?.mode).toBe("mqtt");
    expect(ok.config?.source).toBe("manual-setup");
    expect(ok.ipAddress).toBe("10.0.0.18");
  });

  it("deviceUpdateSchema: wymaga id, reszta partial", () => {
    expect(() => deviceUpdateSchema.parse({ name: "Bez id" })).toThrow();
    const ok = deviceUpdateSchema.parse({ id: 5, status: "maintenance" });
    expect(ok.status).toBe("maintenance");
    expect(() => deviceUpdateSchema.parse({ id: 5, status: "broken" })).toThrow();
  });

  it("telemetryIngestSchema: points 1–1000, quality z enum", () => {
    expect(() => telemetryIngestSchema.parse({ points: [] })).toThrow();
    const ok = telemetryIngestSchema.parse({
      points: [{ deviceId: 1, ts: "2026-08-09T10:00:00Z", metric: "temperature", processedValue: 21.5 }],
    });
    expect(ok.points[0].quality).toBe("good"); // domyślna jakość
    expect(() =>
      telemetryIngestSchema.parse({
        points: [{ deviceId: 1, ts: "2026-08-09T10:00:00Z", metric: "t", quality: "perfect" }],
      }),
    ).toThrow();
  });

  it("telemetryQuerySchema: limit domyślny 500, max 5000", () => {
    const ok = telemetryQuerySchema.parse({ deviceId: 3 });
    expect(ok.limit).toBe(500);
    expect(() => telemetryQuerySchema.parse({ limit: 9999 })).toThrow();
  });

  it("feedShortageScanSchema: wymaga farmId", () => {
    expect(() => feedShortageScanSchema.parse({})).toThrow();
    expect(feedShortageScanSchema.parse({ farmId: 1 }).farmId).toBe(1);
  });
});

/* ---------- API: RBAC iotIntel (bez bazy — auth przed DB) ---------- */
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

describe("iotIntel router — RBAC", () => {
  it("iotIntel.devices wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.iotIntel.devices({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("iotIntel.telemetryIngest wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(
      caller.iotIntel.telemetryIngest({
        points: [{ deviceId: 1, ts: "2026-08-09T10:00:00Z", metric: "temperature" }],
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("iotIntel.dashboard wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    try {
      await caller.iotIntel.dashboard({ farmId: 1 });
      throw new Error("SHOULD_FAIL");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("iotIntel.feedShortageScan wymaga roli admin (FORBIDDEN dla user)", async () => {
    const caller = appRouter.createCaller(userCtx("user"));
    await expect(caller.iotIntel.feedShortageScan({ farmId: 1 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("iotIntel.feedShortageScan wymaga logowania (UNAUTHORIZED bez sesji)", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.iotIntel.feedShortageScan({ farmId: 1 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

/* ---------- regresja: iotIntel podpięty do appRouter ---------- */
describe("appRouter — rejestracja iotIntel", () => {
  it("iotIntel jest podpięty obok pozostałych routerów domenowych", () => {
    const caller = appRouter.createCaller(baseCtx());
    expect(typeof caller.iotIntel.devices).toBe("function");
    expect(typeof caller.iotIntel.dashboard).toBe("function");
    expect(typeof caller.iotIntel.feedShortageScan).toBe("function");
    expect(typeof caller.economicsIntel.dashboard).toBe("function");
    expect(typeof caller.warehouseIntel.products).toBe("function");
    expect(typeof caller.productionIntel.timeline).toBe("function");
    expect(typeof caller.feedIntel.optimize).toBe("function");
    expect(typeof caller.healthIntel.vaccinationPrograms).toBe("function");
  });
});
