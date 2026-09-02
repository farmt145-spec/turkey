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

export async function bootstrapCompanyData({
  db = getDb(),
  companyId,
  seedStarterData = true,
}: CompanyDataCopyOptions & { seedStarterData?: boolean }) {
  await copyCompanyTemplates({ db, companyId });
  if (seedStarterData) {
    await seedStarterCompanyData(db, companyId);
  }
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
    }).returning({ id: s.feedIngredients.id });
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
    }).returning({ id: s.recipes.id });

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

async function seedStarterCompanyData(db: Db, companyId: number) {
  const start = new Date();
  start.setDate(start.getDate() - 21);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 126);

  const [{ id: lineId }] = await db.insert(s.geneticLines).values({
    companyId,
    name: "Starter Line",
    supplier: "Starter Hatchery",
    updatedBy: "seed-copy",
  }).returning({ id: s.geneticLines.id });

  const [{ id: farmId }] = await db.insert(s.farms).values({
    companyId,
    name: "Moja Ferma 1",
    countryCode: "PL",
    city: "Start",
    lat: "52.00000",
    lng: "19.00000",
    capacity: 25000,
    updatedBy: "seed-copy",
  }).returning({ id: s.farms.id });

  const [{ id: houseId }] = await db.insert(s.houses).values({
    farmId,
    name: "Kurnik A",
    houseType: "finisher",
    areaM2: "1600.0",
    maxDensityKgM2: "42.0",
    lengthM: "80.0",
    widthM: "20.0",
    heightM: "4.0",
    feederCount: 120,
    drinkerCount: 120,
    lightingLux: 25,
    lightingHours: "16.0",
    ventilationM3h: 80000,
    updatedBy: "seed-copy",
  }).returning({ id: s.houses.id });

  const [{ id: batchId }] = await db.insert(s.batches).values({
    houseId,
    geneticLineId: lineId,
    code: `START-${companyId}-${Date.now()}`,
    geneticLine: "Starter Line",
    sex: "mixed",
    startDate,
    plannedEndDate: endDate.toISOString().slice(0, 10),
    initialCount: 12000,
    currentCount: 11880,
    chickSupplier: "Starter Hatchery",
    chickPrice: "1.650",
    updatedBy: "seed-copy",
  }).returning({ id: s.batches.id });

  await db.insert(s.weighings).values({
    batchId,
    weighedAt: new Date(),
    dayAge: 21,
    sampleSize: 80,
    avgWeightG: 930,
    medianG: 920,
    stdDevG: 110,
    minG: 650,
    maxG: 1190,
    cv: "11.83",
    operator: "system",
    updatedBy: "seed-copy",
  });

  await db.insert(s.feedUsages).values({
    batchId,
    day: new Date().toISOString().slice(0, 10),
    kg: "8420.0",
    updatedBy: "seed-copy",
  });

  await db.insert(s.mortalities).values({
    batchId,
    day: new Date().toISOString().slice(0, 10),
    count: 8,
    cause: "start baseline",
    updatedBy: "seed-copy",
  });

  const plan: Array<{ offset: number; type: s.ScheduleEvent["eventType"]; title: string }> = [
    { offset: -2, type: "washing", title: "Mycie kurnika" },
    { offset: -1, type: "disinfection", title: "Dezynfekcja kurnika" },
    { offset: -1, type: "housePrep", title: "Przygotowanie kurnika: nagrzanie, ściółka, sprawdzenie pojen" },
    { offset: 0, type: "placement", title: "Przyjęcie piskląt" },
    { offset: 7, type: "weighing", title: "Ważenie kontrolne (7. dzień)" },
    { offset: 14, type: "vaccination", title: "Szczepienie ND (Newcastle) — La Sota" },
    { offset: 14, type: "weighing", title: "Ważenie kontrolne (14. dzień)" },
    { offset: 21, type: "vaccination", title: "Szczepienie TRT / aMPV" },
    { offset: 21, type: "weighing", title: "Ważenie kontrolne (21. dzień)" },
    { offset: 28, type: "feedChange", title: "Zmiana paszy: Starter → Grower I" },
    { offset: 35, type: "vaccination", title: "Szczepienie HE (choroba krwotoczna)" },
    { offset: 42, type: "weighing", title: "Ważenie kontrolne (42. dzień)" },
    { offset: 49, type: "sampling", title: "Pobieranie prób (laboratorium)" },
    { offset: 56, type: "feedChange", title: "Zmiana paszy: Grower I → Grower II" },
    { offset: 56, type: "weighing", title: "Ważenie kontrolne (56. dzień)" },
    { offset: 63, type: "litter", title: "Ścielenie — dosypanie ściółki" },
    { offset: 70, type: "weighing", title: "Ważenie kontrolne (70. dzień)" },
    { offset: 77, type: "feedChange", title: "Zmiana paszy: Grower II → Finisher I" },
    { offset: 84, type: "weighing", title: "Ważenie kontrolne (84. dzień)" },
    { offset: 98, type: "weighing", title: "Ważenie kontrolne (98. dzień)" },
    { offset: 112, type: "feedChange", title: "Zmiana paszy: Finisher I → Finisher II" },
    { offset: 119, type: "weighing", title: "Ważenie przed ubojem" },
    { offset: 126, type: "sale", title: "Sprzedaż / ubój — raport końcowy" },
  ];

  for (const item of plan) {
    const day = new Date(start);
    day.setDate(day.getDate() + item.offset);
    await db.insert(s.scheduleEvents).values({
      batchId,
      day: day.toISOString().slice(0, 10),
      eventType: item.type,
      title: item.title,
      updatedBy: "seed-copy",
    });
  }
}
