import { eq, isNull } from "drizzle-orm";
import { getDb } from "./connection";
import * as s from "@db/schema";

type Db = ReturnType<typeof getDb>;

type CompanyDataCopyOptions = {
  db?: Db;
  companyId: number;
};

export async function copyCompanyTemplates({ db = getDb(), companyId }: CompanyDataCopyOptions) {
  await copyNutritionalStandards(db, companyId);
  const ingredientMapping = await copyFeedIngredients(db, companyId);
  await copyVaccinationPrograms(db, companyId);
  await copyRecipes(db, companyId, ingredientMapping);
}

async function copyNutritionalStandards(db: Db, companyId: number) {
  const templates = await db.select().from(s.nutritionalStandards).where(isNull(s.nutritionalStandards.companyId));
  if (!templates.length) return;

  for (const template of templates) {
    await db.insert(s.nutritionalStandards).values({
      companyId,
      name: template.name,
      code: `${template.code}-${companyId}`,
      gender: template.gender,
      productionType: template.productionType,
      phase: template.phase,
      ageFromDays: template.ageFromDays,
      ageToDays: template.ageToDays,
      targetWeightFromKg: template.targetWeightFromKg,
      targetWeightToKg: template.targetWeightToKg,
      meMinKcal: template.meMinKcal,
      meMaxKcal: template.meMaxKcal,
      proteinMinPct: template.proteinMinPct,
      proteinMaxPct: template.proteinMaxPct,
      fatMinPct: template.fatMinPct,
      fatMaxPct: template.fatMaxPct,
      fiberMaxPct: template.fiberMaxPct,
      lysineMinPct: template.lysineMinPct,
      methionineMinPct: template.methionineMinPct,
      calciumMinPct: template.calciumMinPct,
      calciumMaxPct: template.calciumMaxPct,
      phosphorusMinPct: template.phosphorusMinPct,
      sodiumMinPct: template.sodiumMinPct,
      sodiumMaxPct: template.sodiumMaxPct,
      extraParams: template.extraParams,
      status: "active",
      updatedBy: "seed-copy",
    });
  }
}

async function copyFeedIngredients(db: Db, companyId: number) {
  const templates = await db.select().from(s.feedIngredients).where(isNull(s.feedIngredients.companyId));
  const map = new Map<number, number>();
  if (!templates.length) return map;

  for (const template of templates) {
    const [{ id: newId }] = await db.insert(s.feedIngredients).values({
      companyId,
      name: template.name,
      countryCode: template.countryCode,
      pricePerTon: template.pricePerTon,
      currency: template.currency,
      proteinPct: template.proteinPct,
      energyKcal: template.energyKcal,
      lysinePct: template.lysinePct,
      methioninePct: template.methioninePct,
      fiberPct: template.fiberPct,
      fatPct: template.fatPct,
      calciumPct: template.calciumPct,
      phosphorusPct: template.phosphorusPct,
      stockTons: template.stockTons,
      moisturePct: template.moisturePct,
      ashPct: template.ashPct,
      starchPct: template.starchPct,
      cystinePct: template.cystinePct,
      threoninePct: template.threoninePct,
      tryptophanPct: template.tryptophanPct,
      argininePct: template.argininePct,
      sodiumPct: template.sodiumPct,
      producer: template.producer,
      code: template.code,
      extraParams: template.extraParams,
      status: "active",
      updatedBy: "seed-copy",
    }).returning({ id: s.nutritionalStandards.id });
    map.set(template.id, newId);
  }

  return map;
}

async function copyVaccinationPrograms(db: Db, companyId: number) {
  const programs = await db.select().from(s.vaccinationPrograms).where(isNull(s.vaccinationPrograms.companyId));

  for (const program of programs) {
    const [{ id: newProgramId }] = await db.insert(s.vaccinationPrograms).values({
      companyId,
      name: program.name,
      geneticLine: program.geneticLine,
      description: program.description,
      isDefault: program.isDefault,
      status: "active",
      updatedBy: "seed-copy",
    }).returning({ id: s.vaccinationPrograms.id });

    const steps = await db.select().from(s.vaccinationProgramSteps).where(eq(s.vaccinationProgramSteps.programId, program.id));
    for (const step of steps) {
      await db.insert(s.vaccinationProgramSteps).values({
        programId: newProgramId,
        vaccineName: step.vaccineName,
        ageDays: step.ageDays,
        route: step.route,
        dosePerBird: step.dosePerBird,
        notes: step.notes,
        status: "active",
        updatedBy: "seed-copy",
      });
    }
  }
}

async function copyRecipes(db: Db, companyId: number, ingredientMap: Map<number, number>) {
  const templates = await db.select().from(s.recipes).where(isNull(s.recipes.companyId));

  for (const template of templates) {
    const [{ id: newRecipeId }] = await db.insert(s.recipes).values({
      companyId,
      name: template.name,
      ageGroup: template.ageGroup,
      strategy: template.strategy,
      costPerTon: template.costPerTon,
      proteinPct: template.proteinPct,
      energyKcal: template.energyKcal,
      lysinePct: template.lysinePct,
      explanation: template.explanation,
      version: 1,
      author: "seed-copy",
      status: "active",
      sex: template.sex,
      season: template.season,
      genetics: template.genetics,
      createdAt: new Date(),
    }).returning({ id: s.vaccinationProgramSteps.id });

    const items = await db.select().from(s.recipeItems).where(eq(s.recipeItems.recipeId, template.id));
    for (const item of items) {
      await db.insert(s.recipeItems).values({
        recipeId: newRecipeId,
        ingredientId: ingredientMap.get(item.ingredientId) ?? item.ingredientId,
        percent: item.percent,
      });
    }
  }
}
