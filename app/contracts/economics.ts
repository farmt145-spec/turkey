import { z } from "zod";

/* ============================================================
   BTE HYBRID — ECONOMICS contracts (FOUNDATION → KIMI)
   ============================================================ */

export const advisorCategorySchema = z.enum([
  "feed", "energy", "health", "labor", "transport", "timing", "recipe", "general",
]);
export type AdvisorCategory = z.infer<typeof advisorCategorySchema>;

export const advisorPrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export type AdvisorPriority = z.infer<typeof advisorPrioritySchema>;

export const summaryPeriodSchema = z.enum(["daily", "weekly", "monthly", "batch"]);
export type SummaryPeriod = z.infer<typeof summaryPeriodSchema>;

const batchId = z.number().int().positive();

/* --- Predykcja zysku (FOUNDATION: ProfitPredictorDto) --- */
export const predictProfitInputSchema = z.object({
  batchId,
  expectedFinalWeight: z.number().positive().optional(), // kg/szt
  expectedMortalityRate: z.number().min(0).max(1).optional(), // 0–1
  expectedPricePerKg: z.number().positive().optional(), // domyślnie 12.5 PLN
});
export type PredictProfitInput = z.infer<typeof predictProfitInputSchema>;

export const decisionImpactSchema = z.object({
  decision: z.string(),
  impactOnProfit: z.number(),
  impactOnMargin: z.number(),
  recommendation: z.string(),
});
export type DecisionImpact = z.infer<typeof decisionImpactSchema>;

export const profitPredictionSchema = z.object({
  batchId: z.number(),
  predictedMargin: z.number(),
  predictedProfit: z.number(),
  breakEvenPrice: z.number(),
  predictedFinalCost: z.number(),
  predictedCostPerKg: z.number(),
  daysToBreakEven: z.number(),
  confidenceScore: z.number(),
  decisionImpacts: z.array(decisionImpactSchema),
});
export type ProfitPrediction = z.infer<typeof profitPredictionSchema>;

/* --- Scenariusz "co jeśli" (FOUNDATION: CreateScenarioDto) --- */
export const createScenarioInputSchema = z.object({
  batchId,
  name: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  paramFeedPriceChange: z.number().min(-100).max(500).optional(), // %
  paramSoyPriceChange: z.number().min(-100).max(500).optional(), // %
  paramFcrChange: z.number().min(-2).max(2).optional(), // ±pkt
  paramMortalityChange: z.number().min(-100).max(100).optional(), // %
  paramSaleDelayDays: z.number().int().min(-30).max(60).optional(),
  paramGasPriceChange: z.number().min(-100).max(500).optional(), // %
  paramRecipeId: z.number().int().positive().optional(),
}).refine(
  (v) => Object.keys(v).some((k) => k.startsWith("param") && v[k as keyof typeof v] !== undefined),
  { message: "Scenariusz wymaga co najmniej jednego parametru zmiany" },
);
export type CreateScenarioInput = z.infer<typeof createScenarioInputSchema>;

/* --- Doradca AI --- */
export const generateAdvisorsInputSchema = z.object({ batchId });
export const advisorActionInputSchema = z.object({
  id: z.number().int().positive(),
  actionResult: z.string().max(500).optional(),
});

/* --- Analiza sprzedaży --- */
export const analyzeSaleInputSchema = z.object({ batchId });

/* --- Podsumowanie zarządcze --- */
export const generateSummaryInputSchema = z.object({
  batchId,
  period: summaryPeriodSchema.default("batch"),
});

/* --- Benchmarki --- */
export const benchmarkListInputSchema = z.object({
  farmId: z.number().int().positive().optional(),
  batchId: z.number().int().positive().optional(),
  period: z.string().max(32).optional(),
});
export const benchmarkRecalcInputSchema = z.object({
  farmId: z.number().int().positive().optional(),
});
