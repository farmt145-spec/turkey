import { z } from "zod";

/* ============================================================
   BTE HYBRID — PRODUCTION ENGINE contracts (FOUNDATION → KIMI)
   ============================================================ */

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const productionAlertTypeSchema = z.enum([
  "fcr_deterioration", "feed_drop", "water_spike", "mortality_rise",
  "environmental", "nutritional", "health", "temperature_anomaly",
  "humidity_anomaly", "co2_high", "nh3_high",
]);
export type ProductionAlertType = z.infer<typeof productionAlertTypeSchema>;

export const productionEventTypeSchema = z.enum([
  "chick_receipt", "weighing", "feed_change", "vaccination", "treatment",
  "breakdown", "alert", "temp_change", "transfer", "sale", "cleaning",
  "inspection", "daily_log",
]);
export type ProductionEventType = z.infer<typeof productionEventTypeSchema>;

const dateDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "format YYYY-MM-DD");

/* --- Analiza AI dnia (FOUNDATION: AIEngineService.analyzeDay) --- */
export const analyzeDayInputSchema = z.object({
  batchId: z.number().int().positive(),
  day: dateDay, // dzień wpisu z daily_logs KIMI
  co2Ppm: z.number().min(0).max(10000).optional(), // override; fallback: climate_logs kurnika
});
export type AnalyzeDayInput = z.infer<typeof analyzeDayInputSchema>;

export const detectedIssueSchema = z.object({
  type: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string(),
});
export type DetectedIssue = z.infer<typeof detectedIssueSchema>;

export const forecast7DaySchema = z.object({
  day: z.number(),
  predictedWeight: z.number(),
  predictedMortality: z.number(),
  predictedFCR: z.number(),
});
export type Forecast7Day = z.infer<typeof forecast7DaySchema>;

export const dayAnalysisResultSchema = z.object({
  fcr: z.number(),
  adgGrams: z.number(),
  epef: z.number(),
  mortalityRate: z.number(),
  dayScore: z.number(),
  riskLevel: riskLevelSchema,
  tempScore: z.number(),
  waterScore: z.number(),
  feedScore: z.number(),
  humidityScore: z.number(),
  co2Score: z.number(),
  nh3Score: z.number(),
  detectedIssues: z.array(detectedIssueSchema),
  possibleCauses: z.array(z.string()),
  recommendations: z.array(z.string()),
  forecast7Days: z.array(forecast7DaySchema),
});
export type DayAnalysisResult = z.infer<typeof dayAnalysisResultSchema>;

/* --- Prognoza końca rzutu (FOUNDATION: forecastBatchEnd) --- */
export const batchEndForecastInputSchema = z.object({
  batchId: z.number().int().positive(),
  feedPricePerKg: z.number().min(0).default(1.8), // PLN/kg
  livePricePerKg: z.number().min(0).default(6.5), // PLN/kg masy żywej
});
export type BatchEndForecastInput = z.infer<typeof batchEndForecastInputSchema>;

export const batchEndForecastSchema = z.object({
  predictedFinalWeight: z.number(),
  predictedFCR: z.number(),
  predictedEPEF: z.number(),
  totalFeedConsumptionKg: z.number(),
  totalCost: z.number(),
  predictedRevenue: z.number(),
  predictedProfit: z.number(),
  predictedMargin: z.number(),
  accuracyPercent: z.number(),
});
export type BatchEndForecast = z.infer<typeof batchEndForecastSchema>;

/* --- Alerty produkcyjne --- */
export const productionAlertListInputSchema = z.object({
  batchId: z.number().int().positive().optional(),
  onlyActive: z.boolean().default(true),
});
export const productionAlertResolveInputSchema = z.object({
  id: z.number().int().positive(),
  resolvedBy: z.string().max(255).optional(),
});

/* --- Zdarzenia produkcyjne / timeline --- */
export const productionEventCreateSchema = z.object({
  batchId: z.number().int().positive(),
  eventType: productionEventTypeSchema,
  dayNumber: z.number().int().min(0).default(0),
  description: z.string().min(3).max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ProductionEventCreate = z.infer<typeof productionEventCreateSchema>;

export const batchTimelineInputSchema = z.object({
  batchId: z.number().int().positive(),
});

/* --- Podział / łączenie rzutów (FOUNDATION: splitBatch / mergeBatches) --- */
export const splitBatchInputSchema = z.object({
  batchId: z.number().int().positive(),
  splits: z.array(z.object({
    houseId: z.number().int().positive(),
    sectorId: z.number().int().positive().optional(),
    count: z.number().int().positive(),
    avgWeightG: z.number().int().positive().optional(),
  })).min(1),
});
export type SplitBatchInput = z.infer<typeof splitBatchInputSchema>;

export const mergeBatchesInputSchema = z.object({
  sourceBatchIds: z.array(z.number().int().positive()).min(2),
  targetHouseId: z.number().int().positive(),
  targetSectorId: z.number().int().positive().optional(),
});
export type MergeBatchesInput = z.infer<typeof mergeBatchesInputSchema>;
