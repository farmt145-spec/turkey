import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import * as s from "../db/schema";

const number = (value: unknown) => Number(value ?? 0);
const dayMs = 86_400_000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const ageAt = (startDate: string, day: string) =>
  Math.max(0, Math.floor((new Date(`${day}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / dayMs));

export class PredictionInputError extends Error {}

export async function materializeBatchDayFact(companyId: number, batchId: number, day: string) {
  const db = getDb();
  const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, batchId));
  if (!batch) throw new PredictionInputError("NOT_FOUND: batch does not exist.");
  const [house] = await db.select().from(s.houses).where(eq(s.houses.id, batch.houseId));
  if (!house) throw new PredictionInputError("PREDICTION_INPUT_INVALID: batch house does not exist.");
  const [farm] = await db.select().from(s.farms).where(eq(s.farms.id, house.farmId));
  if (!farm || farm.companyId !== companyId) throw new PredictionInputError("TENANT_MISMATCH: batch does not belong to company.");

  const [daily] = await db.select().from(s.dailyLogs)
    .where(and(eq(s.dailyLogs.batchId, batchId), eq(s.dailyLogs.day, day))).limit(1);
  const logs = await db.select().from(s.dailyLogs)
    .where(and(eq(s.dailyLogs.batchId, batchId), lte(s.dailyLogs.day, day))).orderBy(asc(s.dailyLogs.day));
  const feed = await db.select().from(s.feedUsages)
    .where(and(eq(s.feedUsages.batchId, batchId), lte(s.feedUsages.day, day))).orderBy(asc(s.feedUsages.day));
  const mortality = await db.select().from(s.mortalities)
    .where(and(eq(s.mortalities.batchId, batchId), lte(s.mortalities.day, day)));
  const ageDays = ageAt(batch.startDate, day);
  const weighings = await db.select().from(s.weighings)
    .where(and(eq(s.weighings.batchId, batchId), lte(s.weighings.dayAge, ageDays)))
    .orderBy(desc(s.weighings.dayAge)).limit(2);
  const lastWeight = weighings[0];
  const previousWeight = weighings[1];
  const cumulativeMortality = logs.reduce((sum, row) => sum + row.mortality + row.culls, 0);
  const cumulativeFeedKg = feed.reduce((sum, row) => sum + number(row.kg), 0);
  const birdCount = Math.max(0, batch.initialCount - cumulativeMortality);
  const biomassKg = lastWeight ? (birdCount * lastWeight.avgWeightG) / 1000 : 0;
  const initialWeightG = previousWeight?.avgWeightG ?? lastWeight?.avgWeightG ?? 0;
  const gainKg = lastWeight ? Math.max(0, (lastWeight.avgWeightG - initialWeightG) * birdCount / 1000) : 0;
  const fcr = gainKg > 0 ? cumulativeFeedKg / gainKg : null;
  const adgG = lastWeight && previousWeight
    ? (lastWeight.avgWeightG - previousWeight.avgWeightG) / Math.max(1, lastWeight.dayAge - previousWeight.dayAge)
    : null;
  const climate = await db.select().from(s.climateLogs)
    .where(and(eq(s.climateLogs.houseId, house.id), gte(s.climateLogs.ts, new Date(`${day}T00:00:00Z`)), lte(s.climateLogs.ts, new Date(`${day}T23:59:59.999Z`))))
    .orderBy(desc(s.climateLogs.ts)).limit(1);
  const snapshot = { daily, lastWeight, previousWeight, feedRows: feed.length, mortalityRows: mortality.length, climate: climate[0] ?? null };
  const values = {
    companyId, farmId: farm.id, houseId: house.id, batchId, day, ageDays, birdCount,
    avgWeightG: lastWeight?.avgWeightG ?? null, adgG: adgG?.toFixed(3) ?? null,
    feedKg: number(daily?.feedKg).toFixed(3), cumulativeFeedKg: cumulativeFeedKg.toFixed(3),
    mortality: (daily?.mortality ?? 0) + (daily?.culls ?? 0), cumulativeMortality,
    fcr: fcr?.toFixed(4) ?? null, biomassKg: biomassKg.toFixed(3),
    waterLiters: daily?.waterLiters ?? null, tempC: daily?.tempC ?? climate[0]?.tempC ?? null,
    humidityPct: daily?.humidityPct ?? climate[0]?.humidityPct ?? null,
    co2Ppm: climate[0]?.co2Ppm ?? null, ammoniaPpm: daily?.ammoniaPpm ?? climate[0]?.ammoniaPpm ?? null,
    inputSnapshot: snapshot, sourceWatermark: new Date(),
  };
  await db.insert(s.batchDayFacts).values(values).onConflictDoUpdate({
    target: [s.batchDayFacts.batchId, s.batchDayFacts.day],
    set: values,
  });
  const [fact] = await db.select().from(s.batchDayFacts)
    .where(and(eq(s.batchDayFacts.batchId, batchId), eq(s.batchDayFacts.day, day))).limit(1);
  if (!fact) throw new Error("Failed to materialize batch-day fact.");
  return { fact, batch };
}

export async function runPrediction(companyId: number, batchId: number, day: string) {
  const db = getDb();
  const { fact, batch } = await materializeBatchDayFact(companyId, batchId, day);
  if (!fact.avgWeightG || !fact.adgG) {
    throw new PredictionInputError("PREDICTION_INPUT_INVALID: at least two weighings are required.");
  }
  const [rule] = await db.select().from(s.predictionRules)
    .where(and(eq(s.predictionRules.status, "active"), eq(s.predictionRules.companyId, companyId))).orderBy(desc(s.predictionRules.effectiveFrom)).limit(1);
  if (!rule) throw new PredictionInputError("PREDICTION_INPUT_INVALID: no active prediction rule for company.");
  const curves = await db.select().from(s.referenceCurves)
    .where(and(eq(s.referenceCurves.status, "active"), eq(s.referenceCurves.sex, batch.sex), lte(s.referenceCurves.effectiveFrom, day)))
    .orderBy(asc(s.referenceCurves.ageDays));
  const applicable = curves.filter((curve) =>
    (curve.companyId === null || curve.companyId === companyId) &&
    (!curve.geneticLine || curve.geneticLine === batch.geneticLine) &&
    (!curve.effectiveTo || curve.effectiveTo >= day),
  );
  const atAge = (age: number) => applicable.find((curve) => curve.ageDays >= age);
  const curve7 = atAge(fact.ageDays + 7);
  const curve14 = atAge(fact.ageDays + 14);
  const finalCurve = [...applicable].reverse().find((curve) => curve.targetWeightG);
  const currentCurve = atAge(fact.ageDays);
  if (!curve7?.targetWeightG || !curve14?.targetWeightG || !finalCurve?.targetWeightG || !currentCurve) {
    throw new PredictionInputError("PREDICTION_INPUT_INVALID: active reference curves do not cover this batch age.");
  }
  const adg = number(fact.adgG);
  const predictedWeight7G = Math.round(fact.avgWeightG + adg * 7);
  const predictedWeight14G = Math.round(fact.avgWeightG + adg * 14);
  const predictedFinalWeightG = Math.round(fact.avgWeightG + adg * Math.max(0, finalCurve.ageDays - fact.ageDays));
  const fcr = number(fact.fcr);
  const predictedFcr = currentCurve.targetFcr ? Math.max(fcr, number(currentCurve.targetFcr)) : fcr;
  const feedToFinishKg = currentCurve.targetFeedKg ? Math.max(0, number(currentCurve.targetFeedKg) - number(fact.cumulativeFeedKg)) : null;
  const currentCost = await db.select().from(s.costs).where(eq(s.costs.batchId, batchId));
  const cost = currentCost.reduce((sum, row) => sum + number(row.amount), 0);
  const targetWeightG = currentCurve.targetWeightG ?? fact.avgWeightG;
  const deviationPct = ((fact.avgWeightG - targetWeightG) / targetWeightG) * 100;
  const daysToTarget = adg > 0 ? Math.max(0, Math.ceil((targetWeightG - fact.avgWeightG) / adg)) : null;
  const riskScore = Math.min(100, Math.max(0, Math.abs(deviationPct) * 4 + Math.max(0, predictedFcr - number(currentCurve.targetFcr)) * 20));
  const output = {
    predictedWeight7G, predictedWeight14G, predictedFinalWeightG, adgG: adg, predictedFcr,
    predictedFeedToFinishKg: feedToFinishKg, productionCost: cost,
    costPerKgGain: fact.biomassKg ? cost / number(fact.biomassKg) : null,
    targetDate: daysToTarget === null ? null : isoDay(new Date(new Date(`${day}T00:00:00Z`).getTime() + daysToTarget * dayMs)),
    deviationPct, riskScore,
  };
  const confidence = Math.min(1, 0.5 + (fact.fcr ? 0.15 : 0) + (fact.tempC ? 0.1 : 0) + (fact.waterLiters ? 0.1 : 0) + (applicable.length >= 3 ? 0.15 : 0));
  const [{ id: runId }] = await db.insert(s.predictionRuns).values({
    companyId, batchId, houseId: fact.houseId, ruleId: rule.id, ruleVersion: rule.version,
    curveId: currentCurve.id, curveVersion: currentCurve.version, asOf: new Date(`${day}T23:59:59.999Z`),
    inputSnapshot: fact.inputSnapshot, output, confidence: confidence.toFixed(4), sourceWatermark: fact.sourceWatermark,
  }).returning({ id: s.batchDayFacts.id });
  if (riskScore >= 40) {
    await db.insert(s.predictionFindings).values({
      predictionRunId: runId, companyId, batchId, type: "target_deviation",
      severity: riskScore >= 75 ? "critical" : riskScore >= 60 ? "high" : "medium",
      title: "Production target deviation",
      description: `Weight deviation is ${deviationPct.toFixed(2)}% and risk score is ${riskScore.toFixed(0)}.`,
      recommendation: "Validate measurements, feed intake, mortality, and environmental conditions.",
    });
  }
  return { runId, output, confidence };
}
