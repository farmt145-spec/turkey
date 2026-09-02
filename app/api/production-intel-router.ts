/**
 * Router tRPC PRODUCTION INTELLIGENCE (BTE HYBRID).
 * Port FOUNDATION production-engine → KIMI tRPC.
 * RBAC: wszystkie odczyty/authed; split/merge (destrukcyjne) = adminOnly.
 */
import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import {
  analyzeDayInputSchema,
  batchEndForecastInputSchema,
  productionAlertListInputSchema,
  productionAlertResolveInputSchema,
  productionEventCreateSchema,
  batchTimelineInputSchema,
  splitBatchInputSchema,
  mergeBatchesInputSchema,
} from "../contracts/production";
import * as svc from "../services/production-intelligence.service";

export const productionIntelRouter = createRouter({
  /* analiza AI dnia (score, ryzyko, problemy, rekomendacje, prognoza 7-dni) */
  analyzeDay: authedQuery
    .input(analyzeDayInputSchema)
    .mutation(async ({ input }) => svc.analyzeDay(input)),

  /* historia analiz rzutu */
  analyses: authedQuery
    .input(z.object({ batchId: z.number().int().positive() }))
    .query(async ({ input }) => svc.listAnalyses(input.batchId)),

  /* prognoza końca rzutu (ekonomia + wydajność) */
  forecastEnd: authedQuery
    .input(batchEndForecastInputSchema)
    .mutation(async ({ input }) => svc.forecastBatchEnd(input)),

  /* ostatnia prognoza końca rzutu */
  latestForecast: authedQuery
    .input(z.object({ batchId: z.number().int().positive() }))
    .query(async ({ input }) => svc.latestForecast(input.batchId)),

  /* alerty produkcyjne AI */
  alerts: authedQuery
    .input(productionAlertListInputSchema)
    .query(async ({ input }) => svc.listAlerts(input)),

  alertResolve: authedQuery
    .input(productionAlertResolveInputSchema)
    .mutation(async ({ input }) => svc.resolveAlert(input.id, input.resolvedBy)),

  /* rejestr zdarzenia produkcyjnego */
  eventCreate: authedQuery
    .input(productionEventCreateSchema)
    .mutation(async ({ input }) => svc.logEvent(input)),

  /* oś czasu rzutu (zdarzenia + dziennik + ważenia + szczepienia + zabiegi + transfery + alerty) */
  timeline: authedQuery
    .input(batchTimelineInputSchema)
    .query(async ({ input }) => svc.batchTimeline(input.batchId)),

  /* identyfikowalność farm-to-fork */
  traceability: authedQuery
    .input(z.object({ batchId: z.number().int().positive() }))
    .query(async ({ input }) => svc.traceability(input.batchId)),

  /* podział rzutu (admin — operacja destrukcyjna) */
  split: adminQuery
    .input(splitBatchInputSchema)
    .mutation(async ({ input, ctx }) => svc.splitBatch(input, ctx.user?.name ?? ctx.user?.unionId ?? "admin")),

  /* połączenie rzutów (admin — operacja destrukcyjna) */
  merge: adminQuery
    .input(mergeBatchesInputSchema)
    .mutation(async ({ input, ctx }) => svc.mergeBatches(input, ctx.user?.name ?? ctx.user?.unionId ?? "admin")),
});
