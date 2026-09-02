import { describe, expect, it } from "vitest";
import { buildStandardTemplates } from "./nutritional-standards";

describe("buildStandardTemplates", () => {
  it("builds 9 phase/gender templates", () => {
    const templates = buildStandardTemplates();
    expect(templates).toHaveLength(9);

    const codes = new Set(templates.map((row) => row.code));
    expect(codes.size).toBe(9);
  });

  it("keeps expected starter range", () => {
    const starterMixed = buildStandardTemplates().find(
      (row) => row.phase === "starter" && row.gender === "mixed",
    );

    expect(starterMixed?.meMinKcal).toBe(2800);
    expect(starterMixed?.meMaxKcal).toBe(2950);
    expect(starterMixed?.proteinMinPct).toBe("28.00");
    expect(starterMixed?.proteinMaxPct).toBe("30.00");
    expect(starterMixed?.extraParams).toEqual({ lysineMaxPct: "1.200" });
  });
});
