/**
 * Kontrakty domenowe FEED INTELLIGENCE (port z FOUNDATION feed-module).
 * Zod = single source of truth dla API tRPC (patrz BTE_TARGET_ARCHITECTURE §2 CONTRACTS).
 * Zakres: typy wejścia/wyjścia logiki domenowej — bez tabel (tabele: db/schema.ts).
 */
import { z } from "zod";

/* ---------- Optymalizacja receptur (FOUNDATION: OptimizationService) ---------- */

export const optimizationPrioritySchema = z.enum(["cost", "fcr", "adg", "health", "balanced"]);
export type OptimizationPriority = z.infer<typeof optimizationPrioritySchema>;

export const optimizationConstraintsSchema = z.object({
  priority: optimizationPrioritySchema.default("balanced"),
  excludedIngredients: z.array(z.number()).optional(),
  availableIngredients: z.array(z.number()).optional(),
  maxCostPerTon: z.number().positive().optional(),
  minIngredientPct: z.number().min(0).max(100).default(0),
  maxIngredientPct: z.number().min(0).max(100).default(100),
});
export type OptimizationConstraints = z.infer<typeof optimizationConstraintsSchema>;

export const optimizedIngredientSchema = z.object({
  ingredientId: z.number(),
  percentage: z.number().min(0).max(100),
});
export type OptimizedIngredient = z.infer<typeof optimizedIngredientSchema>;

/* ---------- Wiedza o surowcach (FOUNDATION: KnowledgeService) ---------- */

export const knowledgeTypeSchema = z.enum([
  "publication",
  "manufacturer_guide",
  "standard",
  "common_mistake",
  "research_paper",
]);
export type KnowledgeType = z.infer<typeof knowledgeTypeSchema>;

export const knowledgeSearchInputSchema = z.object({
  query: z.string().max(255).optional(),
  ingredientId: z.number().optional(),
  type: knowledgeTypeSchema.optional(),
  phase: z.enum(["starter", "grower", "finisher", "breeder_maintenance"]).optional(),
});
export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchInputSchema>;

export const knowledgeEntryCreateSchema = z.object({
  ingredientId: z.number().optional(),
  type: knowledgeTypeSchema,
  title: z.string().min(3).max(500),
  source: z.string().min(1).max(255),
  year: z.number().int().min(1900).max(2100).optional(),
  authors: z.string().max(500).optional(),
  url: z.string().url().max(1000).optional(),
  doi: z.string().max(255).optional(),
  summary: z.string().min(10),
  keyFindings: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  commonMistake: z.string().optional(),
  mistakeConsequence: z.string().optional(),
  mistakeSolution: z.string().optional(),
  credibility: z.number().min(0).max(1).default(0.5),
  isPeerReviewed: z.boolean().default(false),
  applicablePhases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});
export type KnowledgeEntryCreate = z.infer<typeof knowledgeEntryCreateSchema>;

/* ---------- Eksperymenty recepturowe (FOUNDATION: ExperimentService) ---------- */

export const experimentChangeSchema = z.object({
  ingredientId: z.number(),
  action: z.enum(["remove", "add", "adjust"]),
  value: z.number().min(0).max(100).optional(), // docelowy % dla add/adjust
});
export type ExperimentChange = z.infer<typeof experimentChangeSchema>;

export const experimentCreateSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  baseRecipeId: z.number(),
  changes: z.array(experimentChangeSchema).min(1),
});
export type ExperimentCreate = z.infer<typeof experimentCreateSchema>;

/* ---------- Prognozy (FOUNDATION: ForecastService) ---------- */

export const weeklyForecastSchema = z.object({
  week: z.number().int().min(1),
  ageDays: z.number().int().min(0),
  predictedWeight: z.number(),
  predictedFeedConsumption: z.number(),
  predictedFcr: z.number(),
  predictedMortality: z.number(),
});
export type WeeklyForecast = z.infer<typeof weeklyForecastSchema>;

export const batchForecastSummarySchema = z.object({
  predictedFcr: z.number(),
  predictedAdg: z.number(),
  predictedEpef: z.number().optional(),
  predictedMortalityPct: z.number().optional(),
  predictedFeedTons: z.number().optional(),
  predictedFeedCost: z.number().optional(),
  predictedMargin: z.number().optional(),
  currency: z.string().length(3).default("EUR"),
  assumptions: z.array(z.string()).default([]),
  confidenceIntervals: z.record(z.string(), z.object({ low: z.number(), high: z.number() })).default({}),
});
export type BatchForecastSummary = z.infer<typeof batchForecastSummarySchema>;

/* ---------- Alerty paszowe (FOUNDATION: AlertService) ---------- */

export const feedAlertTypeSchema = z.enum([
  "price_spike",
  "stock_low",
  "stock_out",
  "quality_deviation",
  "standard_violation",
  "forecast_deviation",
  "interaction_warning",
]);
export type FeedAlertType = z.infer<typeof feedAlertTypeSchema>;

export const feedAlertSeveritySchema = z.enum(["info", "warning", "critical"]);
export type FeedAlertSeverity = z.infer<typeof feedAlertSeveritySchema>;

export const feedAlertCreateSchema = z.object({
  type: feedAlertTypeSchema,
  severity: feedAlertSeveritySchema.default("warning"),
  sourceType: z.enum(["recipe", "ingredient", "batch", "standard"]),
  sourceId: z.number(),
  title: z.string().min(3).max(255),
  message: z.string().min(3),
  parameter: z.string().max(64).optional(),
  actualValue: z.number().optional(),
  thresholdValue: z.number().optional(),
  unit: z.string().max(32).optional(),
  consequences: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});
export type FeedAlertCreate = z.infer<typeof feedAlertCreateSchema>;
