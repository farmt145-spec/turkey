import { describe, expect, it } from "vitest";
import { buildBalanceReport, statusFromDelta } from "./nutrition-router";

describe("nutrition balance status", () => {
  it("statusFromDelta classifies deficit, pass and excess thresholds correctly", () => {
    expect(statusFromDelta(-0.5, 1)).toBe("DEFICIT");
    expect(statusFromDelta(-0.02, 1)).toBe("PASS");
    expect(statusFromDelta(0.05, 1)).toBe("WARNING");
    expect(statusFromDelta(0.2, 1)).toBe("EXCESS");
  });

  it("buildBalanceReport marks real nutrient gaps against the selected age stage", () => {
    const profile = {
      protein: 15.5,
      energy: 3000,
      lysine: 0.7,
      methionine: 0.4,
      fiber: 5.2,
      fat: 7.8,
      calcium: 0.9,
      phosphorus: 0.52,
      sodium: 0.14,
      costPerTon: 440,
      moisture: 12,
      starch: 43,
      cystine: 0.4,
      threonine: 0.72,
      tryptophan: 0.2,
      arginine: 1.1,
    };

    const report = buildBalanceReport(profile as any, "finisher1");
    const byKey = Object.fromEntries(report.rows.map((row) => [row.key, row]));

    expect(byKey.protein.status).toBe("WARNING");
    expect(byKey.lysine.status).toBe("DEFICIT");
    expect(byKey.methionine.status).toBe("WARNING");
    expect(byKey.energy.status).toBe("WARNING");
    expect(byKey.fiber.status).toBe("WARNING");
  });
});
