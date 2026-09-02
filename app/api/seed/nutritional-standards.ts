import { getDb } from "../queries/connection";
import * as s from "@db/schema";

type Db = ReturnType<typeof getDb>;

const phases = [
  { phase: "starter" as const, from: 0, to: 14, meMin: 2800, meMax: 2950, proteinMin: "28.00", proteinMax: "30.00", lysMin: "1.100", lysMax: "1.200" },
  { phase: "grower" as const, from: 15, to: 35, meMin: 3000, meMax: 3100, proteinMin: "22.00", proteinMax: "24.00", lysMin: "0.850", lysMax: "0.950" },
  { phase: "finisher" as const, from: 36, to: 70, meMin: 3150, meMax: 3250, proteinMin: "18.00", proteinMax: "20.00", lysMin: "0.650", lysMax: "0.750" },
];

const genders = ["toms", "hens", "mixed"] as const;

export function buildStandardTemplates() {
  return phases.flatMap((phase) =>
    genders.map((gender) => ({
      companyId: null,
      name: `Template ${phase.phase} ${gender}`,
      code: `TPL-${phase.phase.toUpperCase()}-${gender.toUpperCase()}`,
      gender,
      productionType: "broiler" as const,
      phase: phase.phase,
      ageFromDays: phase.from,
      ageToDays: phase.to,
      targetWeightFromKg: null,
      targetWeightToKg: null,
      meMinKcal: phase.meMin,
      meMaxKcal: phase.meMax,
      proteinMinPct: phase.proteinMin,
      proteinMaxPct: phase.proteinMax,
      fatMinPct: null,
      fatMaxPct: null,
      fiberMaxPct: "5.00",
      lysineMinPct: phase.lysMin,
      methionineMinPct: gender === "toms" ? "0.480" : "0.450",
      calciumMinPct: "0.85",
      calciumMaxPct: "1.20",
      phosphorusMinPct: "0.45",
      sodiumMinPct: "0.140",
      sodiumMaxPct: "0.190",
      extraParams: { lysineMaxPct: phase.lysMax },
      updatedBy: "seed",
    })),
  );
}

export async function seedNutritionalStandards(db: Db) {
  const existing = await db.select().from(s.nutritionalStandards);
  if (existing.length > 0) return;
  await db.insert(s.nutritionalStandards).values(buildStandardTemplates());
}
