/**
 * Router tRPC ECONOMICS INTELLIGENCE (BTE HYBRID).
 * Port FOUNDATION economics module → KIMI tRPC.
 * RBAC: wszystko authed; benchmarkRecalc (operacja masowa) = adminOnly.
 */
import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import {
  advisorActionInputSchema,
  analyzeSaleInputSchema,
  benchmarkListInputSchema,
  benchmarkRecalcInputSchema,
  createScenarioInputSchema,
  generateAdvisorsInputSchema,
  generateSummaryInputSchema,
  predictProfitInputSchema,
} from "../contracts/economics";
import * as svc from "../services/economics-intelligence.service";

export const economicsIntelRouter = createRouter({
  /* predykcja zysku + wpływ decyzji */
  predictProfit: authedQuery
    .input(predictProfitInputSchema)
    .mutation(async ({ input }) => svc.predictProfit(input)),

  /* scenariusze "co jeśli" */
  scenarioCreate: authedQuery
    .input(createScenarioInputSchema)
    .mutation(async ({ input, ctx }) =>
      svc.createScenario(input, ctx.user?.name ?? ctx.user?.unionId ?? "system")),

  scenarios: authedQuery
    .input(z.object({ batchId: z.number().int().positive() }))
    .query(async ({ input }) => svc.listScenarios(input.batchId)),

  /* doradca kosztów AI */
  advisorsGenerate: authedQuery
    .input(generateAdvisorsInputSchema)
    .mutation(async ({ input }) => svc.generateAIRecommendations(input.batchId)),

  advisors: authedQuery
    .input(z.object({ batchId: z.number().int().positive() }))
    .query(async ({ input }) => svc.listAdvisors(input.batchId)),

  advisorAction: authedQuery
    .input(advisorActionInputSchema)
    .mutation(async ({ input }) => svc.markAdvisorAction(input.id, input.actionResult)),

  /* analiza sprzedaży (optymalny termin) */
  saleAnalysis: authedQuery
    .input(analyzeSaleInputSchema)
    .query(async ({ input }) => svc.analyzeSale(input.batchId)),

  /* dashboard finansowy */
  dashboard: authedQuery
    .input(z.object({ farmId: z.number().int().positive().optional() }).optional())
    .query(async ({ input }) => svc.getFinancialDashboard(input?.farmId)),

  /* podsumowanie zarządcze */
  summaryGenerate: authedQuery
    .input(generateSummaryInputSchema)
    .mutation(async ({ input }) => svc.generateExecutiveSummary(input.batchId, input.period)),

  latestSummary: authedQuery
    .input(z.object({ batchId: z.number().int().positive() }))
    .query(async ({ input }) => svc.latestSummary(input.batchId)),

  /* benchmarki */
  benchmarks: authedQuery
    .input(benchmarkListInputSchema)
    .query(async ({ input }) => svc.listBenchmarks(input)),

  benchmarkRecalc: adminQuery
    .input(benchmarkRecalcInputSchema)
    .mutation(async ({ input }) => svc.recalculateBenchmarks(input.farmId)),
});
