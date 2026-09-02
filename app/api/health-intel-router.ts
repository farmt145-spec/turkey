/**
 * HEALTH INTELLIGENCE — router tRPC (healthIntel).
 * Cienka warstwa: walidacja Zod (contracts/health) → serwisy domenowe.
 * RBAC: odczyty/mutacje operacyjne authed; analiza AI wymaga roli weterynarza/admin
 * (w modelu user/admin Phase 1 → admin, zgodnie z macierzą uprawnień docelowych).
 */
import { z } from "zod";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  aiAdvisorRequestSchema,
  diseaseReferenceCreateSchema,
  healthRecordCreateSchema,
  vaccinationProgramCreateSchema,
} from "../contracts/health";
import {
  addDiseaseReference,
  analyzeHealth,
  calculateRiskScore,
  createHealthRecord,
  createVaccinationProgram,
  diseaseWithReferences,
  listHealthRecords,
  listVaccinationPrograms,
  vaccinationScheduleForBatch,
} from "../services/health-intelligence.service";

export const healthIntelRouter = createRouter({
  /* --- programy szczepień (FOUNDATION: vaccination module) --- */
  vaccinationPrograms: authedQuery.query(() => listVaccinationPrograms()),

  vaccinationProgramCreate: authedQuery
    .input(vaccinationProgramCreateSchema)
    .mutation(({ input }) => createVaccinationProgram(input)),

  vaccinationSchedule: authedQuery
    .input(z.object({ batchId: z.number() }))
    .query(({ input }) => vaccinationScheduleForBatch(input.batchId)),

  /* --- rekordy zdrowia (FOUNDATION: health module) --- */
  records: authedQuery
    .input(z.object({ batchId: z.number() }))
    .query(({ input }) => listHealthRecords(input.batchId)),

  recordCreate: authedQuery
    .input(healthRecordCreateSchema)
    .mutation(({ input }) => createHealthRecord(input)),

  /* --- risk score (port RiskScoreService) --- */
  riskScore: authedQuery
    .input(z.object({ batchId: z.number() }))
    .mutation(({ input }) => calculateRiskScore(input.batchId)),

  /* --- AI advisor (port AIAdvisorService) — decyzje kliniczne: admin/weterynarz --- */
  analyze: adminQuery
    .input(aiAdvisorRequestSchema)
    .mutation(({ input, ctx }) => analyzeHealth(input, ctx.user?.name ?? ctx.user?.unionId)),

  /* --- biblioteka chorób + referencje (FOUNDATION: disease-library) --- */
  diseaseDetail: authedQuery
    .input(z.object({ diseaseId: z.number() }))
    .query(({ input }) => diseaseWithReferences(input.diseaseId)),

  diseaseReferenceAdd: authedQuery
    .input(diseaseReferenceCreateSchema)
    .mutation(({ input }) => addDiseaseReference(input)),
});
