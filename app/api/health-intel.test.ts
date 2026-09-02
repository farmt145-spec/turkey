import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  aiAdvisorRequestSchema,
  diseaseReferenceCreateSchema,
  healthRecordCreateSchema,
  vaccinationProgramCreateSchema,
} from "../contracts/health";
import { appRouter } from "./router";
import type { TrpcContext } from "./context";

/* ---------- contracts: walidacja Zod ---------- */
describe("contracts/health — walidacja", () => {
  it("vaccinationProgramCreateSchema: wymaga ≥1 kroku", () => {
    expect(() =>
      vaccinationProgramCreateSchema.parse({ name: "Program standard", steps: [] }),
    ).toThrow();
    const ok = vaccinationProgramCreateSchema.parse({
      name: "Program brojler — podstawowy",
      steps: [{ vaccineName: "ND+IB", ageDays: 1, route: "spray" }],
    });
    expect(ok.isDefault).toBe(false);
  });

  it("healthRecordCreateSchema: waliduje format daty i typ", () => {
    expect(() =>
      healthRecordCreateSchema.parse({
        batchId: 1, type: "magic", day: "2026-01-01", description: "opis", performedBy: "vet",
      }),
    ).toThrow();
    expect(() =>
      healthRecordCreateSchema.parse({
        batchId: 1, type: "treatment", day: "01-01-2026", description: "opis", performedBy: "vet",
      }),
    ).toThrow();
  });

  it("aiAdvisorRequestSchema: wymaga ≥1 objawu", () => {
    expect(() => aiAdvisorRequestSchema.parse({ batchId: 1, symptoms: [] })).toThrow();
    const ok = aiAdvisorRequestSchema.parse({ batchId: 1, symptoms: ["apathy", "diarrhea"] });
    expect(ok.symptoms).toHaveLength(2);
  });

  it("diseaseReferenceCreateSchema: rok w zakresie 1900–2100", () => {
    expect(() =>
      diseaseReferenceCreateSchema.parse({ diseaseId: 1, title: "Ref", year: 1700 }),
    ).toThrow();
  });
});

/* ---------- API: RBAC healthIntel (bez bazy — auth przed DB) ---------- */
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

describe("healthIntel router — RBAC", () => {
  it("healthIntel.vaccinationPrograms wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.healthIntel.vaccinationPrograms()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("healthIntel.riskScore wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    await expect(caller.healthIntel.riskScore({ batchId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("healthIntel.analyze wymaga roli admin (FORBIDDEN dla user)", async () => {
    const caller = appRouter.createCaller(userCtx("user"));
    await expect(
      caller.healthIntel.analyze({ batchId: 1, symptoms: ["apathy"] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("healthIntel.records wymaga logowania", async () => {
    const caller = appRouter.createCaller(baseCtx());
    try {
      await caller.healthIntel.records({ batchId: 1 });
      throw new Error("SHOULD_FAIL");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});

/* ---------- regresja: feedIntel podpięty (naprawa wpisu appRouter) ---------- */
describe("appRouter — rejestracja routerów domenowych", () => {
  it("feedIntel i healthIntel są podpięte", () => {
    const caller = appRouter.createCaller(baseCtx());
    expect(typeof caller.feedIntel.optimize).toBe("function");
    expect(typeof caller.healthIntel.vaccinationPrograms).toBe("function");
  });
});
