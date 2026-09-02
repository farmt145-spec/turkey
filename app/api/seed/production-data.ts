import { getDb } from "../queries/connection";
import { copyCompanyTemplates } from "../queries/companies";
import * as s from "@db/schema";
import { demoCompany1 } from "./demo-company-1";
import { demoCompany2 } from "./demo-company-2";

type Db = ReturnType<typeof getDb>;

type DemoBatchInput = {
  code: string;
  houseIndex: number;
  dayAge: number;
  cycleDays: number;
  initialCount: number;
  currentCount: number;
  adgG: number;
  fcr: number;
  sex: "toms" | "hens" | "mixed";
};

const batchCauses = ["sudden death", "trampling", "starvation", "disease"] as const;

function dayString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function seededRate(seed: number) {
  return 0.1 + ((seed * 73) % 40) / 100;
}

async function seedCompanyStructure(
  db: Db,
  company: typeof demoCompany1,
  batches: DemoBatchInput[],
) {
  const [{ id: companyId }] = await db.insert(s.companies).values({
    name: company.name,
    countryCode: company.countryCode,
    baseCurrency: company.baseCurrency,
    updatedBy: "seed",
  }).returning({ id: s.companies.id });

  await copyCompanyTemplates({ db, companyId });

  const [{ id: lineId }] = await db.insert(s.geneticLines).values({
    companyId,
    name: "Hybrid Converter",
    supplier: "Demo Genetics",
    notes: "Demo line",
    updatedBy: "seed",
  }).returning({ id: s.geneticLines.id });

  const [{ id: farmId }] = await db.insert(s.farms).values({
    companyId,
    name: company.farm.name,
    countryCode: company.countryCode,
    city: company.farm.city,
    lat: company.farm.lat,
    lng: company.farm.lng,
    capacity: company.farm.capacity,
    updatedBy: "seed",
  }).returning({ id: s.farms.id });

  const houseIds: number[] = [];
  for (const [index, house] of company.houses.entries()) {
    const [{ id: houseId }] = await db.insert(s.houses).values({
      farmId,
      name: house.name,
      houseType: house.houseType,
      areaM2: index === 0 ? "1400.0" : "1800.0",
      maxDensityKgM2: house.houseType === "brooder" ? "25.0" : "42.0",
      lengthM: "90.0",
      widthM: "20.0",
      heightM: "4.2",
      feederCount: 120,
      drinkerCount: 140,
      lightingLux: 24,
      lightingHours: "16.0",
      ventilationM3h: 86000,
      updatedBy: "seed",
    }).returning({ id: s.houses.id });
    houseIds.push(houseId);
  }

  for (const batch of batches) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - batch.dayAge);

    const plannedEnd = new Date(startDate);
    plannedEnd.setDate(plannedEnd.getDate() + batch.cycleDays);

    const [{ id: batchId }] = await db.insert(s.batches).values({
      houseId: houseIds[batch.houseIndex],
      geneticLineId: lineId,
      code: batch.code,
      geneticLine: "Hybrid Converter",
      sex: batch.sex,
      chickSupplier: "Demo Hatchery",
      chickPrice: "1.800",
      startDate: dayString(startDate),
      plannedEndDate: dayString(plannedEnd),
      initialCount: batch.initialCount,
      currentCount: batch.currentCount,
      soldCount: 0,
      status: "active",
      updatedBy: "seed",
    }).returning({ id: s.batches.id });

    await seedBatchTimeline(db, batchId, batch, startDate, houseIds[batch.houseIndex]);
  }

  return companyId;
}

async function seedBatchTimeline(
  db: Db,
  batchId: number,
  batch: DemoBatchInput,
  startDate: Date,
  houseId: number,
) {
  const points = [0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70].filter((day) => day <= batch.dayAge);
  for (const day of points) {
    const weighedAt = new Date(startDate);
    weighedAt.setDate(weighedAt.getDate() + day);

    const avgWeightG = Math.round(100 + day * batch.adgG);
    const sampleSize = 200 + (day % 4) * 25;
    await db.insert(s.weighings).values({
      batchId,
      weighedAt,
      dayAge: day,
      sampleSize,
      avgWeightG,
      medianG: Math.round(avgWeightG * 0.98),
      stdDevG: Math.round(avgWeightG * 0.1),
      minG: Math.round(avgWeightG * 0.85),
      maxG: Math.round(avgWeightG * 1.15),
      cv: (8 + (day % 5)).toFixed(2),
      operator: "seed",
    });
  }

  for (let day = 0; day <= batch.dayAge; day++) {
    const at = new Date(startDate);
    at.setDate(at.getDate() + day);
    const mortalityPct = seededRate(batchId + day);
    const count = Math.max(1, Math.round(batch.initialCount * (mortalityPct / 100)));

    await db.insert(s.mortalities).values({
      batchId,
      day: dayString(at),
      count,
      cause: batchCauses[(batchId + day) % batchCauses.length],
    });

    await db.insert(s.feedUsages).values({
      batchId,
      day: dayString(at),
      kg: (batch.initialCount * (0.09 + day * 0.002)).toFixed(1),
      recipeId: null,
    });

    await db.insert(s.healthDailyMetrics).values({
      batchId,
      day: dayString(at),
      mortalityRate: mortalityPct.toFixed(3),
      fcr: (batch.fcr - 0.08 + day * 0.001).toFixed(3),
      adgGrams: batch.adgG.toFixed(1),
      waterPerFeedRatio: "1.85",
      notes: "Demo metric",
    });
  }

  const now = new Date();
  for (let back = 0; back < 30; back++) {
    const day = new Date(now);
    day.setDate(day.getDate() - back);

    for (const hour of [0, 6, 12, 18]) {
      const ts = new Date(day);
      ts.setHours(hour, 0, 0, 0);
      const ageFactor = Math.min(1, batch.dayAge / 70);

      await db.insert(s.climateLogs).values({
        houseId,
        ts,
        tempC: (26 - ageFactor * 6 + (hour === 12 ? 0.8 : hour === 0 ? -0.6 : 0)).toFixed(1),
        humidityPct: (55 + ((back + hour) % 20)).toFixed(1),
        co2Ppm: 500 + ((back + hour) % 1000),
        ammoniaPpm: (5 + ((back + hour) % 10)).toFixed(1),
        ventilationPct: 20 + ((back + hour) % 40),
        source: "seed",
      });
    }
  }

  const predictedAdg = (batch.adgG + 5).toFixed(3);
  const predictedFcr = (batch.fcr - 0.05).toFixed(3);
  const epef = ((Math.max(0.1, batch.adgG / 1000 * batch.dayAge) * 100) / (Number(predictedFcr) * batch.dayAge)).toFixed(3);
  const liveWeightKg = (batch.currentCount * (100 + batch.dayAge * batch.adgG)) / 1000;
  const revenue = liveWeightKg * 1.8;
  const cost = Number(predictedFcr) * liveWeightKg * 0.33;

  await db.insert(s.batchForecasts).values({
    batchId,
    weeklyForecasts: Array.from({ length: 4 }, (_, index) => ({
      week: index + 1,
      ageDays: batch.dayAge + index * 7,
      weight: Number((batch.adgG * (batch.dayAge + index * 7) / 1000).toFixed(2)),
      feedConsumption: Number((batch.fcr * (index + 1) * 2.4).toFixed(2)),
      fcr: Number((batch.fcr - 0.02 + index * 0.01).toFixed(3)),
      mortality: Number((0.2 + index * 0.05).toFixed(2)),
    })),
    predictedFcr,
    predictedAdg,
    predictedEpef: epef,
    predictedMortalityPct: "3.40",
    predictedFeedTons: (liveWeightKg * Number(predictedFcr) / 1000).toFixed(3),
    predictedFeedCost: cost.toFixed(2),
    predictedMargin: (revenue - cost).toFixed(2),
    currency: "EUR",
    assumptions: ["Feed prices stable", "Mortality within historic range"],
    confidenceIntervals: { fcr: { low: Number(predictedFcr) - 0.03, high: Number(predictedFcr) + 0.03 } },
    updatedBy: "seed",
  });

  await db.insert(s.aiAdvisorLogs).values({
    batchId,
    symptoms: ["slight adg dip", "midday temperature rise"],
    inputData: { batchCode: batch.code, dayAge: batch.dayAge, fcr: batch.fcr },
    recommendations: [
      { title: "Adjust ventilation", detail: "Increase ventilation by 8% during noon" },
      { title: "Protein check", detail: "Validate grower/finisher recipe lysine level" },
    ],
    confidence: "0.910",
    disclaimerShown: true,
    veterinarian: "Demo AI",
  });
}

export async function seedProductionData(db: Db) {
  await seedCompanyStructure(db, demoCompany1, [
    {
      code: "DEMO-001-FINISHER",
      houseIndex: 2,
      dayAge: 45,
      cycleDays: 70,
      initialCount: 10000,
      currentCount: 9850,
      adgG: 75,
      fcr: 2.45,
      sex: "toms",
    },
    {
      code: "DEMO-002-GROWER",
      houseIndex: 1,
      dayAge: 15,
      cycleDays: 70,
      initialCount: 12000,
      currentCount: 11940,
      adgG: 40,
      fcr: 1.85,
      sex: "mixed",
    },
  ]);

  await seedCompanyStructure(db, demoCompany2, [
    {
      code: "DEMO-101-FINISHER",
      houseIndex: 2,
      dayAge: 38,
      cycleDays: 70,
      initialCount: 9800,
      currentCount: 9640,
      adgG: 71,
      fcr: 2.36,
      sex: "toms",
    },
    {
      code: "DEMO-102-GROWER",
      houseIndex: 1,
      dayAge: 22,
      cycleDays: 70,
      initialCount: 11800,
      currentCount: 11690,
      adgG: 46,
      fcr: 1.92,
      sex: "mixed",
    },
  ]);
}
