import { getDb } from "../queries/connection";
import * as s from "@db/schema";

type Db = ReturnType<typeof getDb>;

const ingredientTemplates = [
  ["Pszenica", "PL", 205, 12.5, 3150],
  ["Kukurydza", "PL", 210, 8.5, 3370],
  ["Soja", "PL", 420, 45.0, 2200],
  ["Mączka mięsno-kostna", "PL", 250, 50.0, 2500],
  ["Olej rybny", "PL", 800, 0, 8800],
  ["CaCO3", "PL", 100, 0, 0],
  ["Fosforan monokalkowy", "PL", 350, 0, 0],
  ["Sól", "PL", 50, 0, 0],
  ["Premiks witaminowo-mineralny", "PL", 3000, 0, 0],
  ["Dodatek probiotyczny", "PL", 2500, 0, 0],
  ["Kwas organiczny", "PL", 1500, 0, 0],
  ["L-lizyna", "PL", 5000, 99, 0],
] as const;

export async function seedFeedIngredients(db: Db) {
  const existing = await db.select().from(s.feedIngredients);
  if (existing.length > 0) return;

  await db.insert(s.feedIngredients).values(
    ingredientTemplates.map(([name, countryCode, pricePerTon, proteinPct, energyKcal], index) => ({
      companyId: null,
      name,
      countryCode,
      pricePerTon: pricePerTon.toFixed(2),
      currency: "EUR",
      proteinPct: proteinPct.toFixed(2),
      energyKcal,
      lysinePct: name === "L-lizyna" ? "78.000" : "0.200",
      methioninePct: "0.150",
      fiberPct: "2.00",
      fatPct: name === "Olej rybny" ? "99.00" : "1.50",
      calciumPct: name === "CaCO3" ? "38.00" : "0.10",
      phosphorusPct: name === "Fosforan monokalkowy" ? "22.00" : "0.30",
      stockTons: (80 - index * 2).toFixed(2),
      moisturePct: "12.00",
      ashPct: "1.00",
      starchPct: energyKcal > 3000 ? "60.00" : "0.00",
      cystinePct: "0.100",
      threoninePct: "0.200",
      tryptophanPct: "0.050",
      argininePct: "0.300",
      sodiumPct: name === "Sól" ? "39.000" : "0.020",
      producer: "Demo Seed",
      code: `ING-${String(index + 1).padStart(3, "0")}`,
      extraParams: null,
      updatedBy: "seed",
    })),
  );
}
