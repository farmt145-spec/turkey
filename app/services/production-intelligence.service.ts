/**
 * Serwisy domenowe PRODUCTION ENGINE.
 * Port logiki z FOUNDATION production-engine (NestJS/Prisma → czyste funkcje/Drizzle).
 * Źródła: ai-engine.service.ts (1:1 progi/wagi/standardy BUT Big 6),
 *         batch.service.ts (split/merge/timeline/traceability), transfer.service.ts.
 * Mapowanie: Batch→batches, DailyLog→daily_logs(+weighings, climate_logs),
 *            AIAnalysis→production_analyses, AIForecast→production_forecasts,
 *            Alert→production_alerts, ProductionEvent→production_events.
 * ADAPTACJE:
 *  - daily_logs KIMI nie ma co2/avgWeightGrams → CO2 z climate_logs kurnika (ten dzień)
 *    lub z inputu; masa z ostatniego ważenia (weighings) ≤ danego dnia.
 *  - masa początkowa pisklęcia: najwcześniejsze ważenie, fallback 60 g (norma BUT Big 6, dzień 1).
 *  - batches.status KIMI (active/closed/planned/archived): pełny transfer → "closed".
 */
import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import * as s from "../db/schema";
import type {
  AnalyzeDayInput,
  BatchEndForecast,
  BatchEndForecastInput,
  DayAnalysisResult,
  DetectedIssue,
  MergeBatchesInput,
  ProductionEventCreate,
  SplitBatchInput,
} from "../contracts/production";

const num = (v: unknown): number => Number(v ?? 0);

/* --- Standardy rasowe BUT Big 6 — 1:1 z FOUNDATION ai-engine.service.ts --- */
const breedStandards = {
  targetWeights: {
    1: 60, 7: 180, 14: 450, 21: 900, 28: 1600, 35: 2500,
    42: 3500, 49: 4600, 56: 5700, 63: 6800, 70: 7800,
    77: 8700, 84: 9500, 91: 10200, 98: 10800, 105: 11300,
    112: 11700, 119: 12000, 126: 12250, 133: 12400, 140: 12500,
  } as Record<number, number>,
  targetFCR: {
    1: 0.0, 7: 0.85, 14: 1.05, 21: 1.25, 28: 1.45, 35: 1.65,
    42: 1.85, 49: 2.05, 56: 2.25, 63: 2.45, 70: 2.65,
    77: 2.85, 84: 3.05, 91: 3.25, 98: 3.45, 105: 3.65,
    112: 3.85, 119: 4.05, 126: 4.25, 133: 4.45, 140: 4.65,
  } as Record<number, number>,
  optimalTemp: {
    1: 35, 7: 33, 14: 30, 21: 27, 28: 24, 35: 22,
    42: 21, 49: 20, 56: 19, 63: 18, 70: 18, 77: 18,
    84: 18, 91: 18, 98: 18, 105: 18, 112: 18, 119: 18,
    126: 18, 133: 18, 140: 18,
  } as Record<number, number>,
  optimalHumidity: { min: 50, max: 70 },
  co2Limit: 3000,
  nh3Limit: 25,
  maxMortalityRate: 0.05, // 5% skumulowane
};

const SLaughterDays = 140; // docelowy wiek uboju (FOUNDATION: 140)
const r3 = (n: number) => parseFloat(n.toFixed(3));
const r2 = (n: number) => parseFloat(n.toFixed(2));

const ageDays = (startDate: string, day: string): number =>
  Math.max(1, Math.round((new Date(day).getTime() - new Date(startDate).getTime()) / 86400000));

/* ================== ANALIZA AI DNIA (1:1) ================== */

export async function analyzeDay(input: AnalyzeDayInput): Promise<DayAnalysisResult> {
  const db = getDb();
  const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, input.batchId));
  if (!batch) throw new Error("Rzut nie istnieje");

  const logs = await db.select().from(s.dailyLogs)
    .where(eq(s.dailyLogs.batchId, input.batchId)).orderBy(asc(s.dailyLogs.day));
  const currentLog = logs.find((l) => l.day === input.day);
  if (!currentLog) throw new Error(`Brak wpisu z dziennika na dzień ${input.day}`);
  const previousLogs = logs.filter((l) => l.day < input.day);

  const day = ageDays(batch.startDate, input.day);

  // masa: ostatnie ważenie ≤ bieżącego dnia (adaptacja — daily_logs KIMI nie trzyma masy)
  const weighRows = await db.select().from(s.weighings)
    .where(and(eq(s.weighings.batchId, input.batchId), lte(s.weighings.dayAge, day)))
    .orderBy(desc(s.weighings.dayAge));
  const avgWeightGrams = weighRows[0]?.avgWeightG ?? 0;
  const initialWeightG = weighRows[weighRows.length - 1]?.avgWeightG ?? breedStandards.targetWeights[1];
  const prevWeightG = weighRows[1]?.avgWeightG ?? initialWeightG;

  // CO2: input override → climate_logs kurnika z tego dnia (adaptacja)
  let co2Ppm = input.co2Ppm ?? 0;
  if (input.co2Ppm === undefined) {
    const clim = await db.select().from(s.climateLogs)
      .where(eq(s.climateLogs.houseId, batch.houseId)).orderBy(desc(s.climateLogs.ts)).limit(20);
    const sameDay = clim.find((c) => c.ts?.toISOString().slice(0, 10) === input.day);
    co2Ppm = sameDay?.co2Ppm ?? clim[0]?.co2Ppm ?? 0;
  }

  const metrics = {
    dayNumber: day,
    mortalityCount: currentLog.mortality + currentLog.culls,
    avgWeightGrams,
    feedConsumedKg: num(currentLog.feedKg),
    waterConsumedL: num(currentLog.waterLiters),
    temperatureAvg: num(currentLog.tempC),
    humidityPercent: num(currentLog.humidityPct),
    co2Ppm,
    nh3Ppm: num(currentLog.ammoniaPpm),
    initialCount: batch.initialCount,
    currentCount: batch.currentCount,
  };

  // --- FCR / ADG / EPEF (1:1) ---
  const totalFeed = previousLogs.reduce((sum, l) => sum + num(l.feedKg), 0) + metrics.feedConsumedKg;
  const totalWeightGain = (metrics.avgWeightGrams - initialWeightG) * (batch.currentCount / 1000);
  const fcr = totalWeightGain > 0 ? r3(totalFeed / totalWeightGain) : 0;
  const adg = previousLogs.length > 0 && metrics.avgWeightGrams > 0
    ? r2((metrics.avgWeightGrams - prevWeightG) / Math.max(1, day - (weighRows[1]?.dayAge ?? 1)))
    : 0;
  const viability = (batch.currentCount / batch.initialCount) * 100;
  const avgWeightKg = metrics.avgWeightGrams / 1000;
  const epef = fcr > 0 && day > 0 ? r2((viability * avgWeightKg) / (day * fcr)) : 0;
  const mortalityRate = (batch.initialCount - batch.currentCount) / batch.initialCount;

  // --- scoring środowiska (1:1) ---
  const tempScore = scoreTemperature(metrics.temperatureAvg, day);
  const humidityScore = scoreHumidity(metrics.humidityPercent);
  const co2Score = scoreCO2(metrics.co2Ppm);
  const nh3Score = scoreNH3(metrics.nh3Ppm);
  const waterScore = scoreWater(metrics.waterConsumedL, metrics.feedConsumedKg, day);
  const feedScore = scoreFeed(metrics.feedConsumedKg, metrics.currentCount, day);

  // --- detekcja problemów (1:1) ---
  const recentFeed = previousLogs.slice(-3).map((l) => num(l.feedKg));
  const issues = detectIssues(metrics, fcr, mortalityRate, day, recentFeed);
  const causes = inferCauses(issues);
  const recommendations = generateRecommendations(issues, day);

  const dayScore = calculateDayScore(tempScore, humidityScore, co2Score, nh3Score, waterScore, feedScore, fcr, mortalityRate, day);
  const riskLevel = determineRiskLevel(dayScore, issues);
  const forecast7Days = forecast7(batch, metrics, fcr, adg, day);

  // --- persystencja ---
  await db.insert(s.productionAnalyses).values({
    batchId: input.batchId, dayNumber: day,
    fcr: fcr.toFixed(3), adgGrams: adg.toFixed(2), epef: epef.toFixed(2),
    mortalityRate: mortalityRate.toFixed(4),
    tempScore: tempScore.toFixed(1), waterScore: waterScore.toFixed(1),
    feedScore: feedScore.toFixed(1), humidityScore: humidityScore.toFixed(1),
    co2Score: co2Score.toFixed(1), nh3Score: nh3Score.toFixed(1),
    dayScore: dayScore.toFixed(1), riskLevel,
    detectedIssues: issues, possibleCauses: causes,
    recommendations, forecast7Days,
  });

  // --- alerty dla HIGH/CRITICAL (1:1 generateAlerts) ---
  const alertTypeMap: Record<string, s.ProductionAlert["type"]> = {
    FCR_DETERIORATION: "fcr_deterioration",
    FEED_DROP: "feed_drop",
    WATER_SPIKE: "water_spike",
    MORTALITY_RISE: "mortality_rise",
    CUMULATIVE_MORTALITY_HIGH: "mortality_rise",
    TEMPERATURE_ANOMALY: "temperature_anomaly",
    HUMIDITY_ANOMALY: "humidity_anomaly",
    CO2_HIGH: "co2_high",
    NH3_HIGH: "nh3_high",
  };
  for (const issue of issues) {
    if (issue.severity === "HIGH" || issue.severity === "CRITICAL") {
      await db.insert(s.productionAlerts).values({
        batchId: input.batchId,
        type: alertTypeMap[issue.type] ?? "health",
        severity: issue.severity === "CRITICAL" ? "critical" : "high",
        title: issue.type.replace(/_/g, " "),
        description: issue.description,
        justification: `Wykryte na dniu ${day}. AI zanalizowało parametry produkcyjne i stwierdziło odchylenie od normy dla rasy BUT Big 6.`,
      });
    }
  }

  return {
    fcr, adgGrams: adg, epef, mortalityRate, dayScore, riskLevel,
    tempScore, waterScore, feedScore, humidityScore, co2Score, nh3Score,
    detectedIssues: issues, possibleCauses: causes, recommendations, forecast7Days,
  };
}

/* --- funkcje scoringowe 1:1 --- */
function scoreTemperature(actual: number, day: number): number {
  const target = breedStandards.optimalTemp[day] ?? 18;
  const diff = Math.abs(actual - target);
  if (diff <= 1) return 100;
  if (diff <= 2) return 90;
  if (diff <= 3) return 75;
  if (diff <= 4) return 60;
  if (diff <= 5) return 40;
  return 20;
}
function scoreHumidity(actual: number): number {
  const { min, max } = breedStandards.optimalHumidity;
  if (actual >= min && actual <= max) return 100;
  const dist = Math.min(Math.abs(actual - min), Math.abs(actual - max));
  return Math.max(0, 100 - dist * 5);
}
function scoreCO2(actual: number): number {
  return actual <= breedStandards.co2Limit
    ? Math.max(0, 100 - (actual / breedStandards.co2Limit) * 20)
    : Math.max(0, 80 - ((actual - breedStandards.co2Limit) / 100) * 10);
}
function scoreNH3(actual: number): number {
  return actual <= breedStandards.nh3Limit
    ? Math.max(0, 100 - (actual / breedStandards.nh3Limit) * 20)
    : Math.max(0, 80 - (actual - breedStandards.nh3Limit) * 3);
}
function scoreWater(waterL: number, feedKg: number, day: number): number {
  if (feedKg <= 0) return 50;
  const ratio = waterL / feedKg;
  const targetRatio = day < 14 ? 2.0 : day < 42 ? 1.8 : 1.6;
  const diff = Math.abs(ratio - targetRatio);
  if (diff <= 0.1) return 100;
  if (diff <= 0.2) return 85;
  if (diff <= 0.3) return 70;
  if (diff <= 0.5) return 50;
  return 30;
}
function scoreFeed(feedKg: number, birdCount: number, day: number): number {
  if (birdCount <= 0) return 50;
  const feedPerBird = (feedKg / birdCount) * 1000; // g
  const targetFeed = day < 7 ? 25 : day < 14 ? 55 : day < 21 ? 100
    : day < 28 ? 150 : day < 35 ? 200 : day < 42 ? 250
    : day < 49 ? 300 : day < 56 ? 340 : day < 63 ? 375
    : day < 70 ? 400 : day < 77 ? 420 : day < 84 ? 435
    : day < 91 ? 445 : day < 98 ? 450 : 455;
  const pctDiff = Math.abs(feedPerBird - targetFeed) / targetFeed;
  if (pctDiff <= 0.05) return 100;
  if (pctDiff <= 0.1) return 85;
  if (pctDiff <= 0.15) return 70;
  if (pctDiff <= 0.2) return 55;
  return 35;
}

/* --- detekcja problemów 1:1 (recentFeed = pobranie z 3 poprzednich dni) --- */
function detectIssues(
  m: { dayNumber: number; mortalityCount: number; avgWeightGrams: number; feedConsumedKg: number; waterConsumedL: number; temperatureAvg: number; humidityPercent: number; co2Ppm: number; nh3Ppm: number; currentCount: number },
  fcr: number, mortalityRate: number, day: number, recentFeed: number[],
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const targetWeight = breedStandards.targetWeights[day] ?? 12500;
  const targetFCR = breedStandards.targetFCR[day] ?? 4.65;

  if (m.avgWeightGrams > 0 && m.avgWeightGrams < targetWeight * 0.9) {
    issues.push({
      type: "WEIGHT_UNDERPERFORMANCE",
      severity: m.avgWeightGrams < targetWeight * 0.8 ? "HIGH" : "MEDIUM",
      description: `Masa ptaków (${m.avgWeightGrams}g) poniżej normy o ${((1 - m.avgWeightGrams / targetWeight) * 100).toFixed(1)}%`,
    });
  }
  if (fcr > 0 && fcr > targetFCR * 1.1) {
    issues.push({
      type: "FCR_DETERIORATION",
      severity: fcr > targetFCR * 1.2 ? "HIGH" : "MEDIUM",
      description: `FCR (${fcr}) przekracza normę (${targetFCR})`,
    });
  }
  const dailyMortalityRate = m.currentCount > 0 ? m.mortalityCount / m.currentCount : 0;
  if (dailyMortalityRate > 0.001) {
    issues.push({
      type: "MORTALITY_RISE",
      severity: dailyMortalityRate > 0.003 ? "CRITICAL" : dailyMortalityRate > 0.002 ? "HIGH" : "MEDIUM",
      description: `Dzienna śmiertelność ${(dailyMortalityRate * 100).toFixed(2)}%`,
    });
  }
  if (mortalityRate > breedStandards.maxMortalityRate) {
    issues.push({
      type: "CUMULATIVE_MORTALITY_HIGH",
      severity: "CRITICAL",
      description: `Skumulowana śmiertelność ${(mortalityRate * 100).toFixed(2)}% przekracza limit 5%`,
    });
  }
  const tempTarget = breedStandards.optimalTemp[day] ?? 18;
  if (m.temperatureAvg > 0 && Math.abs(m.temperatureAvg - tempTarget) > 3) {
    issues.push({
      type: "TEMPERATURE_ANOMALY",
      severity: Math.abs(m.temperatureAvg - tempTarget) > 5 ? "HIGH" : "MEDIUM",
      description: `Temperatura ${m.temperatureAvg}°C, norma ${tempTarget}°C`,
    });
  }
  if (m.humidityPercent > 0 && (m.humidityPercent < 40 || m.humidityPercent > 80)) {
    issues.push({
      type: "HUMIDITY_ANOMALY",
      severity: m.humidityPercent < 30 || m.humidityPercent > 85 ? "HIGH" : "MEDIUM",
      description: `Wilgotność ${m.humidityPercent}%, norma 50-70%`,
    });
  }
  if (m.co2Ppm > breedStandards.co2Limit) {
    issues.push({
      type: "CO2_HIGH",
      severity: m.co2Ppm > 4000 ? "HIGH" : "MEDIUM",
      description: `CO₂ ${m.co2Ppm} ppm, limit ${breedStandards.co2Limit} ppm`,
    });
  }
  if (m.nh3Ppm > breedStandards.nh3Limit) {
    issues.push({
      type: "NH3_HIGH",
      severity: m.nh3Ppm > 35 ? "HIGH" : "MEDIUM",
      description: `NH₃ ${m.nh3Ppm} ppm, limit ${breedStandards.nh3Limit} ppm`,
    });
  }
  if (recentFeed.length >= 3) {
    const avgRecentFeed = recentFeed.reduce((a, b) => a + b, 0) / recentFeed.length;
    if (m.feedConsumedKg < avgRecentFeed * 0.85 && m.feedConsumedKg > 0) {
      issues.push({
        type: "FEED_DROP",
        severity: m.feedConsumedKg < avgRecentFeed * 0.7 ? "HIGH" : "MEDIUM",
        description: `Spadek poboru paszy o ${((1 - m.feedConsumedKg / avgRecentFeed) * 100).toFixed(1)}%`,
      });
    }
  }
  if (m.feedConsumedKg > 0) {
    const waterFeedRatio = m.waterConsumedL / m.feedConsumedKg;
    if (waterFeedRatio > 2.5) {
      issues.push({
        type: "WATER_SPIKE",
        severity: waterFeedRatio > 3.0 ? "HIGH" : "MEDIUM",
        description: `Wysoki pobór wody (stosunek ${waterFeedRatio.toFixed(2)}:1)`,
      });
    }
  }
  return issues;
}

/* --- przyczyny / rekomendacje 1:1 --- */
function inferCauses(issues: DetectedIssue[]): string[] {
  const causes = new Set<string>();
  for (const issue of issues) {
    switch (issue.type) {
      case "WEIGHT_UNDERPERFORMANCE":
        causes.add("Niewystarczająca dawka paszy lub niska jakość");
        causes.add("Możliwa infekcja podkliniczna");
        causes.add("Stres termiczny lub środowiskowy");
        break;
      case "FCR_DETERIORATION":
        causes.add("Przekarmianie lub nierównomierny dostęp do karmideł");
        causes.add("Infekcja jelitowa (coccidiosis, clostridia)");
        causes.add("Niska jakość surowców paszowych");
        break;
      case "MORTALITY_RISE":
      case "CUMULATIVE_MORTALITY_HIGH":
        causes.add("Infekcja bakteryjna lub wirusowa");
        causes.add("Zatrucie (mycotoksyny, amoniak)");
        causes.add("Błędy w szczepieniach lub biosekuritecie");
        break;
      case "TEMPERATURE_ANOMALY":
        causes.add("Awaria systemu HVAC");
        causes.add("Niewystarczająca izolacja kurnika");
        causes.add("Przeludnienie lub niedostateczna wentylacja");
        break;
      case "CO2_HIGH":
      case "NH3_HIGH":
        causes.add("Niewystarczająca wentylacja");
        causes.add("Zbyt wysoka wilgotność ściółki");
        causes.add("Przeludnienie kurnika");
        break;
      case "FEED_DROP":
        causes.add("Problemy zdrowotne (choroba, ból)");
        causes.add("Wysoka temperatura w kurniku");
        causes.add("Awaria systemu karmienia");
        break;
      case "WATER_SPIKE":
        causes.add("Wysoka temperatura - ptaki piją więcej");
        causes.add("Infekcja jelitowa (biegunka)");
        causes.add("Zbyt wysokie stężenie soli w paszy");
        break;
    }
  }
  return Array.from(causes);
}

function generateRecommendations(issues: DetectedIssue[], day: number): string[] {
  const recs = new Set<string>();
  for (const issue of issues) {
    switch (issue.type) {
      case "WEIGHT_UNDERPERFORMANCE":
        recs.add("Sprawdź kaloryczność paszy i dostępność karmideł");
        recs.add("Rozważ zwiększenie dawki o 5-10% przez 3 dni");
        recs.add("Wykonaj badanie kału na obecność pasożytów");
        break;
      case "FCR_DETERIORATION":
        recs.add("Przeanalizuj skład paszy - sprawdź mykotoksyny");
        recs.add("Dodaj probiotyki lub kwasy organiczne do wody");
        recs.add("Sprawdź szczelność karmideł - eliminuj straty");
        break;
      case "MORTALITY_RISE":
        recs.add("NATYCHMIAST: Izoluj padłe ptaki, pobierz materiał do badań");
        recs.add("Skontaktuj się z weterynarzem - rozważ antybiotykoterapię");
        recs.add("Wzmocnij biosekuritet - dezynfekcja, ograniczenie ruchu");
        break;
      case "TEMPERATURE_ANOMALY":
        recs.add("Sprawdź termostaty i wentylatory");
        recs.add("Dostosuj program wentylacji do wieku stada");
        recs.add("Sprawdź izolację dachu i ścian");
        break;
      case "CO2_HIGH":
      case "NH3_HIGH":
        recs.add("Zwiększ wymianę powietrza - sprawdź wentylatory");
        recs.add("Sprawdź wilgotność ściółki - wymień jeśli > 30%");
        recs.add("Zmniejsz obsadę jeśli przekracza normę");
        break;
      case "FEED_DROP":
        recs.add("Sprawdź zdrowie ptaków - objawy kliniczne");
        recs.add("Zmierz temperaturę w różnych strefach kurnika");
        recs.add("Sprawdź mechanizm podawania paszy");
        break;
      case "WATER_SPIKE":
        recs.add("Sprawdź jakość wody (pH, bakteriologia)");
        recs.add("Monitoruj objawy biegunki w stadzie");
        recs.add("Sprawdź skład elektrolitów w wodzie");
        break;
      case "HUMIDITY_ANOMALY":
        recs.add(day < 14 ? "Zwiększ wentylację lub użyj nawilżaczy" : "Sprawdź system wentylacji i ogrzewania");
        recs.add("Monitoruj wilgotność ściółki");
        break;
    }
  }
  if (day < 7) recs.add("Krytyczny okres - monitoruj temperaturę co 2h");
  else if (day > 100) recs.add("Okres finalny - kontroluj FCR i masę przed ubojem");
  return Array.from(recs);
}

function calculateDayScore(
  temp: number, humidity: number, co2: number, nh3: number,
  water: number, feed: number, fcr: number, mortalityRate: number, day: number,
): number {
  const envScore = (temp + humidity + co2 + nh3) / 4;
  const consumptionScore = (water + feed) / 2;
  let performanceScore = 100;
  const targetFCR = breedStandards.targetFCR[day] ?? 4.65;
  if (fcr > 0) performanceScore = Math.max(0, 100 - ((fcr - targetFCR) / targetFCR) * 100);
  let mortalityScore = 100;
  if (mortalityRate > 0) mortalityScore = Math.max(0, 100 - (mortalityRate / breedStandards.maxMortalityRate) * 100);
  const weighted = envScore * 0.25 + consumptionScore * 0.25 + performanceScore * 0.3 + mortalityScore * 0.2;
  return Math.round(weighted);
}

function determineRiskLevel(score: number, issues: DetectedIssue[]): "low" | "medium" | "high" | "critical" {
  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const highCount = issues.filter((i) => i.severity === "HIGH").length;
  if (criticalCount > 0 || score < 30) return "critical";
  if (highCount >= 2 || score < 50) return "high";
  if (highCount === 1 || score < 70) return "medium";
  return "low";
}

function forecast7(
  _batch: s.Batch,
  m: { avgWeightGrams: number; currentCount: number },
  fcr: number, adg: number, day: number,
) {
  const forecast = [];
  let projectedWeight = m.avgWeightGrams > 0 ? m.avgWeightGrams : breedStandards.targetWeights[day] ?? 60;
  let projectedCount = m.currentCount;
  for (let i = 1; i <= 7; i++) {
    const forecastDay = day + i;
    const targetWeight = breedStandards.targetWeights[forecastDay] ?? projectedWeight + (adg > 0 ? adg : 30);
    const weightGain = adg > 0 ? adg : (targetWeight - projectedWeight) / 7;
    projectedWeight += weightGain * 0.95;
    const dailyMortality = Math.max(1, Math.round(projectedCount * 0.0003));
    projectedCount -= dailyMortality;
    const targetFCR = breedStandards.targetFCR[forecastDay] ?? fcr * 1.02;
    forecast.push({
      day: forecastDay,
      predictedWeight: Math.round(projectedWeight),
      predictedMortality: dailyMortality,
      predictedFCR: r3(targetFCR),
    });
  }
  return forecast;
}

/* ================== PROGNOZA KOŃCA RZUTU (1:1) ================== */

export async function forecastBatchEnd(input: BatchEndForecastInput): Promise<BatchEndForecast> {
  const db = getDb();
  const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, input.batchId));
  if (!batch) throw new Error("Rzut nie istnieje");

  const logs = await db.select().from(s.dailyLogs)
    .where(eq(s.dailyLogs.batchId, input.batchId)).orderBy(asc(s.dailyLogs.day));

  if (logs.length === 0) {
    const def = defaultForecast(batch);
    await persistForecast(db, input.batchId, def);
    return def;
  }

  const latestLog = logs[logs.length - 1];
  const latestDay = ageDays(batch.startDate, latestLog.day);
  const daysRemaining = Math.max(0, SLaughterDays - latestDay);

  // masa: ostatnie ważenie; trend z ostatnich ważeń (max 14)
  const weighRows = await db.select().from(s.weighings)
    .where(eq(s.weighings.batchId, input.batchId)).orderBy(asc(s.weighings.dayAge));
  const currentWeight = weighRows[weighRows.length - 1]?.avgWeightG ?? 0;
  const recentW = weighRows.slice(-14);
  const weightTrend = recentW.length > 1
    ? (recentW[recentW.length - 1].avgWeightG - recentW[0].avgWeightG) / recentW.length
    : 50;
  const projectedFinalWeight = Math.min(12500, currentWeight + weightTrend * daysRemaining * 0.9);

  // FCR: ostatnia analiza AI lub estymacja z dziennika
  const [lastAnalysis] = await db.select().from(s.productionAnalyses)
    .where(eq(s.productionAnalyses.batchId, input.batchId))
    .orderBy(desc(s.productionAnalyses.dayNumber)).limit(1);
  const currentFCR = lastAnalysis ? num(lastAnalysis.fcr) : 2.5;
  const projectedFCR = Math.min(5.0, currentFCR + daysRemaining * 0.015);

  const viability = (batch.currentCount / batch.initialCount) * 100;
  const epef = (viability * (projectedFinalWeight / 1000)) / (SLaughterDays * projectedFCR);

  const totalFeed = logs.reduce((sum, l) => sum + num(l.feedKg), 0);
  const recentLogs = logs.slice(-14);
  const projectedDailyFeed = recentLogs.length > 0
    ? recentLogs.reduce((sum, l) => sum + num(l.feedKg), 0) / recentLogs.length
    : 200;
  const totalFeedProjected = totalFeed + projectedDailyFeed * daysRemaining;

  const feedCost = totalFeedProjected * input.feedPricePerKg;
  const chickCost = batch.initialCount * num(batch.chickPrice);
  const otherCosts = batch.currentCount * daysRemaining * 0.15;
  const totalCost = feedCost + chickCost + otherCosts;

  const revenue = batch.currentCount * (projectedFinalWeight / 1000) * input.livePricePerKg;
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const dataCompleteness = logs.length / Math.max(1, latestDay);
  const accuracy = Math.round(60 + dataCompleteness * 30);

  const result: BatchEndForecast = {
    predictedFinalWeight: Math.round(projectedFinalWeight),
    predictedFCR: r3(projectedFCR),
    predictedEPEF: r2(epef),
    totalFeedConsumptionKg: Math.round(totalFeedProjected),
    totalCost: Math.round(totalCost),
    predictedRevenue: Math.round(revenue),
    predictedProfit: Math.round(profit),
    predictedMargin: r2(margin),
    accuracyPercent: Math.min(95, accuracy),
  };
  await persistForecast(db, input.batchId, result);
  return result;
}

function defaultForecast(batch: s.Batch): BatchEndForecast {
  const chickCost = batch.initialCount * num(batch.chickPrice);
  const feedCost = batch.initialCount * 4.5 * 12 * 1.8;
  return {
    predictedFinalWeight: 12000,
    predictedFCR: 4.5,
    predictedEPEF: 280,
    totalFeedConsumptionKg: batch.initialCount * 4.5 * 12,
    totalCost: Math.round(chickCost + feedCost),
    predictedRevenue: Math.round(batch.initialCount * 12 * 6.5),
    predictedProfit: 0,
    predictedMargin: 0,
    accuracyPercent: 40,
  };
}

async function persistForecast(
  db: ReturnType<typeof getDb>, batchId: number, f: BatchEndForecast,
): Promise<void> {
  await db.insert(s.productionForecasts).values({
    batchId,
    predictedFinalWeight: f.predictedFinalWeight.toFixed(1),
    predictedFcr: f.predictedFCR.toFixed(3),
    predictedEpef: f.predictedEPEF.toFixed(2),
    totalFeedConsumptionKg: f.totalFeedConsumptionKg.toFixed(1),
    totalCost: f.totalCost.toFixed(2),
    predictedRevenue: f.predictedRevenue.toFixed(2),
    predictedProfit: f.predictedProfit.toFixed(2),
    predictedMargin: f.predictedMargin.toFixed(2),
    accuracyPercent: f.accuracyPercent.toFixed(1),
  });
}

/* ================== ODCZYTY ================== */

export async function listAnalyses(batchId: number) {
  return getDb().select().from(s.productionAnalyses)
    .where(eq(s.productionAnalyses.batchId, batchId))
    .orderBy(desc(s.productionAnalyses.dayNumber));
}

export async function latestForecast(batchId: number) {
  const [row] = await getDb().select().from(s.productionForecasts)
    .where(eq(s.productionForecasts.batchId, batchId))
    .orderBy(desc(s.productionForecasts.generatedAt)).limit(1);
  return row ?? null;
}

export async function listAlerts(opts: { batchId?: number; onlyActive: boolean }) {
  const db = getDb();
  const conds = [];
  if (opts.batchId) conds.push(eq(s.productionAlerts.batchId, opts.batchId));
  if (opts.onlyActive) conds.push(eq(s.productionAlerts.isResolved, false));
  return db.select().from(s.productionAlerts)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(s.productionAlerts.createdAt));
}

export async function resolveAlert(id: number, resolvedBy?: string) {
  const db = getDb();
  await db.update(s.productionAlerts)
    .set({ isResolved: true, resolvedAt: new Date(), resolvedBy: resolvedBy ?? "system" })
    .where(eq(s.productionAlerts.id, id));
  return { ok: true };
}

/* ================== ZDARZENIA / TIMELINE / TRACEABILITY ================== */

export async function logEvent(input: ProductionEventCreate) {
  const db = getDb();
  const [{ id }] = await db.insert(s.productionEvents).values({
    batchId: input.batchId, eventType: input.eventType,
    dayNumber: input.dayNumber, description: input.description,
    metadata: input.metadata ?? null,
  }).returning({ id: s.productionAnalyses.id });
  return { id };
}

/** Oś czasu rzutu — port getTimeline: zdarzenia + dziennik + ważenia + szczepienia + zabiegi + transfery + alerty */
export async function batchTimeline(batchId: number) {
  const db = getDb();
  const [events, logs, weighRows, vax, trt, trf, alerts] = await Promise.all([
    db.select().from(s.productionEvents).where(eq(s.productionEvents.batchId, batchId)),
    db.select().from(s.dailyLogs).where(eq(s.dailyLogs.batchId, batchId)).orderBy(asc(s.dailyLogs.day)),
    db.select().from(s.weighings).where(eq(s.weighings.batchId, batchId)).orderBy(asc(s.weighings.dayAge)),
    db.select().from(s.vaccinations).where(eq(s.vaccinations.batchId, batchId)),
    db.select().from(s.treatments).where(eq(s.treatments.batchId, batchId)),
    db.select().from(s.transfers).where(eq(s.transfers.sourceBatchId, batchId)),
    db.select().from(s.productionAlerts).where(eq(s.productionAlerts.batchId, batchId)),
  ]);

  type Item = { category: string; date: string; description: string; payload: unknown };
  const items: Item[] = [
    ...events.map((e) => ({ category: "EVENT", date: e.createdAt.toISOString(), description: `[${e.eventType}] ${e.description}`, payload: e })),
    ...logs.map((l) => ({ category: "DAILY_LOG", date: l.day, description: `Dzień ${l.day}: ${l.mortality + l.culls} strat, pasza ${num(l.feedKg)}kg, woda ${num(l.waterLiters)}l`, payload: l })),
    ...weighRows.map((w) => ({ category: "WEIGHING", date: w.weighedAt.toISOString(), description: `Ważenie: ${w.avgWeightG}g (próba ${w.sampleSize})`, payload: w })),
    ...vax.map((v) => ({ category: "VACCINATION", date: v.day, description: `Szczepienie: ${v.vaccine}`, payload: v })),
    ...trt.map((t) => ({ category: "TREATMENT", date: t.startedAt, description: `Zabieg: ${t.product} (${t.reason ?? "—"})`, payload: t })),
    ...trf.map((t) => ({ category: "TRANSFER", date: t.transferDate.toISOString(), description: `Transfer ${t.birdCount} szt. (dok. ${t.documentNo})`, payload: t })),
    ...alerts.map((a) => ({ category: "ALERT", date: a.createdAt.toISOString(), description: `[${a.severity.toUpperCase()}] ${a.title}: ${a.description}`, payload: a })),
  ];
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/** Identyfikowalność (farm-to-fork) — port getTraceability */
export async function traceability(batchId: number) {
  const db = getDb();
  const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, batchId));
  if (!batch) throw new Error("Rzut nie istnieje");
  const [house] = await db.select().from(s.houses).where(eq(s.houses.id, batch.houseId));
  const [farm] = house ? await db.select().from(s.farms).where(eq(s.farms.id, house.farmId)) : [null];
  const [vax, trt, trf, weighRows, logs] = await Promise.all([
    db.select().from(s.vaccinations).where(eq(s.vaccinations.batchId, batchId)),
    db.select().from(s.treatments).where(eq(s.treatments.batchId, batchId)),
    db.select().from(s.transfers).where(eq(s.transfers.sourceBatchId, batchId)),
    db.select().from(s.weighings).where(eq(s.weighings.batchId, batchId)).orderBy(asc(s.weighings.dayAge)),
    db.select().from(s.dailyLogs).where(eq(s.dailyLogs.batchId, batchId)).orderBy(asc(s.dailyLogs.day)),
  ]);

  return {
    batchId: batch.id,
    batchCode: batch.code,
    trace: [
      { stage: "RECEIPT", date: batch.startDate, details: `Przyjęto ${batch.initialCount} szt. | Dostawca: ${batch.chickSupplier ?? "—"} | Linia: ${batch.geneticLine}` },
      { stage: "HOUSE", date: batch.startDate, details: `${house?.name ?? "?"} | Ferma: ${farm?.name ?? "?"}` },
      ...trf.map((t) => ({ stage: "TRANSFER", date: t.transferDate.toISOString().slice(0, 10), details: `Transfer ${t.birdCount} szt. | Dok: ${t.documentNo}` })),
      ...vax.map((v) => ({ stage: "VACCINATION", date: v.day, details: `${v.vaccine} | Status: ${v.done ? "wykonane" : "planowane"}` })),
      ...trt.map((t) => ({ stage: "TREATMENT", date: t.startedAt, details: `${t.product} | ${t.activeSubstance ?? "—"} | ${t.reason ?? "—"}` })),
      ...weighRows.map((w) => ({ stage: "WEIGHING", date: w.weighedAt.toISOString().slice(0, 10), details: `Masa: ${w.avgWeightG}g | Dzień ${w.dayAge} | CV: ${w.cv ?? "—"}%` })),
      ...logs.map((l) => ({ stage: "DAILY", date: l.day, details: `Dzień ${l.day} | Straty: ${l.mortality + l.culls} | Pasza: ${num(l.feedKg)}kg` })),
    ],
  };
}

/* ================== PODZIAŁ / ŁĄCZENIE RZUTÓW (port splitBatch/mergeBatches) ================== */

export async function splitBatch(input: SplitBatchInput, author: string) {
  const db = getDb();
  const [original] = await db.select().from(s.batches).where(eq(s.batches.id, input.batchId));
  if (!original) throw new Error("Rzut nie istnieje");
  const totalSplitCount = input.splits.reduce((sum, x) => sum + x.count, 0);
  if (totalSplitCount > original.currentCount)
    throw new Error(`Podział (${totalSplitCount}) przekracza stan rzutu (${original.currentCount})`);

  const created: number[] = [];
  await db.transaction(async (tx) => {
    for (let i = 0; i < input.splits.length; i++) {
      const sp = input.splits[i];
      const [{ id }] = await tx.insert(s.batches).values({
        houseId: sp.houseId,
        sectorId: sp.sectorId ?? null,
        geneticLineId: original.geneticLineId,
        code: `${original.code}-S${i + 1}`,
        geneticLine: original.geneticLine,
        sex: original.sex,
        chickSupplier: original.chickSupplier,
        chickPrice: original.chickPrice,
        startDate: original.startDate,
        plannedEndDate: original.plannedEndDate,
        initialCount: sp.count,
        currentCount: sp.count,
        status: "active",
        updatedBy: author,
      }).returning({ id: s.batches.id });
      created.push(id);
      await tx.insert(s.productionEvents).values({
        batchId: id, eventType: "transfer",
        dayNumber: ageDays(original.startDate, new Date().toISOString().slice(0, 10)),
        description: `Podział z rzutu ${original.code}: ${sp.count} szt.`,
        metadata: { sourceBatchId: original.id, avgWeightG: sp.avgWeightG ?? null },
      });
    }
    const remaining = original.currentCount - totalSplitCount;
    await tx.update(s.batches).set({
      currentCount: remaining,
      status: remaining === 0 ? "closed" : "active", // ADAPT: pełny podział zamyka rzut (FOUNDATION: TRANSFERRED)
      updatedBy: author,
    }).where(eq(s.batches.id, original.id));
    await tx.insert(s.productionEvents).values({
      batchId: original.id, eventType: "transfer",
      dayNumber: ageDays(original.startDate, new Date().toISOString().slice(0, 10)),
      description: `Wydzielono ${totalSplitCount} szt. do ${input.splits.length} nowych rzutów`,
      metadata: { newBatchIds: created },
    });
  });
  return { created, remaining: original.currentCount - totalSplitCount };
}

export async function mergeBatches(input: MergeBatchesInput, author: string) {
  const db = getDb();
  const sources = await db.select().from(s.batches)
    .where(inArray(s.batches.id, input.sourceBatchIds));
  if (sources.length !== input.sourceBatchIds.length)
    throw new Error("Nie znaleziono części rzutów źródłowych");
  if (sources.some((b) => b.status !== "active"))
    throw new Error("Łączyć można wyłącznie aktywne rzuty");

  const totalCount = sources.reduce((sum, b) => sum + b.currentCount, 0);
  const oldestStart = sources.reduce((min, b) => (b.startDate < min ? b.startDate : min), sources[0].startDate);
  const avgPrice = sources.reduce((sum, b) => sum + num(b.chickPrice), 0) / sources.length;

  let mergedId = 0;
  await db.transaction(async (tx) => {
    const [{ id }] = await tx.insert(s.batches).values({
      houseId: input.targetHouseId,
      sectorId: input.targetSectorId ?? null,
      geneticLineId: sources[0].geneticLineId,
      code: `MERGED-${Date.now()}`,
      geneticLine: sources[0].geneticLine,
      sex: sources[0].sex,
      chickSupplier: sources.map((x) => x.chickSupplier).filter(Boolean).join(", ") || null,
      chickPrice: avgPrice.toFixed(3),
      startDate: oldestStart,
      initialCount: totalCount,
      currentCount: totalCount,
      status: "active",
      updatedBy: author,
    }).returning({ id: s.productionEvents.id });
    mergedId = id;
    await tx.update(s.batches)
      .set({ status: "closed", updatedBy: author }) // ADAPT: FOUNDATION TRANSFERRED → KIMI closed
      .where(inArray(s.batches.id, input.sourceBatchIds));
    for (const src of sources) {
      await tx.insert(s.productionEvents).values({
        batchId: id, eventType: "transfer",
        dayNumber: ageDays(oldestStart, new Date().toISOString().slice(0, 10)),
        description: `Połączenie z rzutu ${src.code}: ${src.currentCount} szt.`,
        metadata: { sourceBatchId: src.id },
      });
    }
  });
  return { mergedId, totalCount };
}
