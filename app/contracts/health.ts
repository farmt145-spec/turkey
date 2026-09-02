/**
 * Kontrakty domenowe HEALTH INTELLIGENCE (port z FOUNDATION health-intelligence-engine).
 * Zod = single source dla API tRPC. Źródła: risk-score.service.ts, ai-advisor.service.ts,
 * vaccination/disease-library modules (BTF/modules/health-intelligence-engine).
 */
import { z } from "zod";

/* ---------- Programy szczepień ---------- */

export const administrationRouteSchema = z.enum([
  "drinking_water",
  "spray",
  "injection_im",
  "injection_sc",
  "eye_drop",
  "wing_web",
]);
export type AdministrationRoute = z.infer<typeof administrationRouteSchema>;

export const vaccinationStepCreateSchema = z.object({
  vaccineName: z.string().min(2).max(255),
  ageDays: z.number().int().min(0).max(365),
  route: administrationRouteSchema,
  dosePerBird: z.string().max(64).optional(),
  notes: z.string().optional(),
});
export type VaccinationStepCreate = z.infer<typeof vaccinationStepCreateSchema>;

export const vaccinationProgramCreateSchema = z.object({
  name: z.string().min(3).max(255),
  geneticLine: z.string().max(128).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  steps: z.array(vaccinationStepCreateSchema).min(1),
});
export type VaccinationProgramCreate = z.infer<typeof vaccinationProgramCreateSchema>;

/* ---------- Health records ---------- */

export const healthRecordCreateSchema = z.object({
  batchId: z.number(),
  type: z.enum(["vaccination", "treatment", "supplement", "necropsy", "inspection"]),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(3),
  performedBy: z.string().min(1).max(255),
  cost: z.number().nonnegative().optional(),
  currency: z.string().length(3).default("EUR"),
});
export type HealthRecordCreate = z.infer<typeof healthRecordCreateSchema>;

/* ---------- Risk score (port RiskScoreService) ---------- */

export const riskScoreFactorsSchema = z.object({
  mortalityFactor: z.number(),
  fcrFactor: z.number(),
  environmentFactor: z.number(),
  treatmentFactor: z.number(),
  ageFactor: z.number(),
});
export type RiskScoreFactors = z.infer<typeof riskScoreFactorsSchema>;

export const riskScoreResultSchema = z.object({
  healthScore: z.number().min(0).max(100),
  productionScore: z.number().min(0).max(100),
  welfareScore: z.number().min(0).max(100),
  riskScore: z.number().min(0).max(100),
  factors: riskScoreFactorsSchema,
});
export type RiskScoreResult = z.infer<typeof riskScoreResultSchema>;

/* ---------- AI Advisor (port AIAdvisorService) ---------- */

export const aiAdvisorRequestSchema = z.object({
  batchId: z.number(),
  symptoms: z.array(z.string().min(2)).min(1),
  ageDays: z.number().int().min(0).optional(),
  mortalityRate: z.number().nonnegative().optional(),
  feedIntakeDropPct: z.number().min(0).max(100).optional(),
  waterIntakeDropPct: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});
export type AiAdvisorRequest = z.infer<typeof aiAdvisorRequestSchema>;

export const diseasePredictionSchema = z.object({
  diseaseId: z.number(),
  diseaseName: z.string(),
  probability: z.number().min(0).max(1),
  possibleCauses: z.array(z.string()),
  recommendedTests: z.array(z.string()),
  immediateActions: z.array(z.string()),
  productionImpact: z.string(),
  disclaimer: z.string(),
});
export type DiseasePrediction = z.infer<typeof diseasePredictionSchema>;

/* ---------- Disease references ---------- */

export const diseaseReferenceCreateSchema = z.object({
  diseaseId: z.number(),
  title: z.string().min(3).max(500),
  authors: z.string().max(500).optional(),
  journal: z.string().max(255).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  url: z.string().url().max(1000).optional(),
});
export type DiseaseReferenceCreate = z.infer<typeof diseaseReferenceCreateSchema>;
