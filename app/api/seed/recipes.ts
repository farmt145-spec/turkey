import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../queries/connection";
import * as s from "@db/schema";

type Db = ReturnType<typeof getDb>;

const genders = ["toms", "hens", "mixed"] as const;
const phases = ["starter", "grower", "finisher"] as const;

function recipeMix(phase: (typeof phases)[number]) {
  if (phase === "starter") {
    return [
      ["Kukurydza", "42.00"],
      ["Pszenica", "18.00"],
      ["Soja", "26.00"],
      ["Mączka mięsno-kostna", "6.00"],
      ["Olej rybny", "3.00"],
      ["CaCO3", "1.50"],
      ["Fosforan monokalkowy", "1.20"],
      ["Premiks witaminowo-mineralny", "1.20"],
      ["L-lizyna", "1.10"],
    ] as const;
  }
  if (phase === "grower") {
    return [
      ["Kukurydza", "46.00"],
      ["Pszenica", "22.00"],
      ["Soja", "20.00"],
      ["Mączka mięsno-kostna", "5.50"],
      ["Olej rybny", "2.20"],
      ["CaCO3", "1.70"],
      ["Fosforan monokalkowy", "1.20"],
      ["Premiks witaminowo-mineralny", "0.90"],
      ["L-lizyna", "0.50"],
    ] as const;
  }
  return [
    ["Kukurydza", "50.00"],
    ["Pszenica", "26.00"],
    ["Soja", "14.00"],
    ["Mączka mięsno-kostna", "4.50"],
    ["Olej rybny", "2.20"],
    ["CaCO3", "1.60"],
    ["Fosforan monokalkowy", "0.90"],
    ["Premiks witaminowo-mineralny", "0.50"],
    ["L-lizyna", "0.30"],
  ] as const;
}

export async function seedRecipeTemplates(db: Db) {
  const existing = await db.select().from(s.recipes).where(isNull(s.recipes.companyId));
  if (existing.length > 0) return;

  const templateIngredients = await db.select().from(s.feedIngredients).where(isNull(s.feedIngredients.companyId));
  const byName = new Map(templateIngredients.map((ingredient) => [ingredient.name, ingredient]));

  for (const phase of phases) {
    for (const sex of genders) {
      const [{ id: recipeId }] = await db.insert(s.recipes).values({
        companyId: null,
        name: `Template ${phase} ${sex}`,
        ageGroup: phase,
        strategy: "balanced",
        costPerTon: phase === "starter" ? "408.00" : phase === "grower" ? "365.00" : "332.00",
        proteinPct: phase === "starter" ? "28.50" : phase === "grower" ? "23.00" : "19.00",
        energyKcal: phase === "starter" ? 2890 : phase === "grower" ? 3050 : 3200,
        lysinePct: phase === "starter" ? "1.150" : phase === "grower" ? "0.900" : "0.700",
        explanation: "Template recipe for automatic company bootstrap",
        author: "seed",
        status: "active",
        sex,
        season: "all",
        genetics: "Hybrid Converter",
      }).returning({ id: s.recipes.id });

      for (const [ingredientName, percent] of recipeMix(phase)) {
        const ingredient = byName.get(ingredientName);
        if (!ingredient) continue;
        await db.insert(s.recipeItems).values({
          recipeId,
          ingredientId: ingredient.id,
          percent,
        });
      }
    }
  }
}

export async function seedVaccinationTemplates(db: Db) {
  const existing = await db.select().from(s.vaccinationPrograms).where(isNull(s.vaccinationPrograms.companyId));
  if (existing.length > 0) return;

  const [{ id: programId }] = await db.insert(s.vaccinationPrograms).values({
    companyId: null,
    name: "Template turkey vaccination",
    geneticLine: "Hybrid Converter",
    description: "Default vaccination path for demo and new companies",
    isDefault: true,
    updatedBy: "seed",
  }).returning({ id: s.recipeItems.id });

  await db.insert(s.vaccinationProgramSteps).values([
    {
      programId,
      vaccineName: "ND (Newcastle)",
      ageDays: 14,
      route: "drinking_water",
      dosePerBird: "1 dose",
      notes: "Starter vaccination",
      updatedBy: "seed",
    },
    {
      programId,
      vaccineName: "TRT / aMPV",
      ageDays: 21,
      route: "spray",
      dosePerBird: "1 dose",
      notes: "Respiratory protection",
      updatedBy: "seed",
    },
    {
      programId,
      vaccineName: "HE",
      ageDays: 35,
      route: "drinking_water",
      dosePerBird: "1 dose",
      notes: "Finisher support",
      updatedBy: "seed",
    },
  ]);
}

export async function countCompanyRecipes(db: Db, companyId: number) {
  const rows = await db.select().from(s.recipes).where(and(eq(s.recipes.companyId, companyId), eq(s.recipes.status, "active")));
  return rows.length;
}
