/**
 * FEED INTELLIGENCE — router tRPC.
 * Cienka warstwa: walidacja Zod (contracts/feed) → serwisy domenowe.
 * RBAC (Phase 1): odczyty authed, mutacje operacyjne authed, alerty ACK authed.
 * Modułowa nazwa routera: feedIntel (nie koliduje z istniejącymi farm/nutrition).
 */
import { z } from "zod";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import {
  experimentCreateSchema,
  feedAlertCreateSchema,
  knowledgeEntryCreateSchema,
  knowledgeSearchInputSchema,
  optimizationConstraintsSchema,
} from "../contracts/feed";
import {
  acknowledgeFeedAlert,
  addKnowledgeEntry,
  createFeedAlert,
  forecastBatch,
  getExperiment,
  listFeedAlerts,
  optimizeRecipe,
  runExperiment,
  scanStockAlerts,
  searchKnowledge,
} from "../services/feed-intelligence.service";

export const feedIntelRouter = createRouter({
  /* --- optymalizacja receptur (port FOUNDATION OptimizationService) --- */
  optimize: authedQuery
    .input(optimizationConstraintsSchema)
    .query(({ input }) => optimizeRecipe(input)),

  /* --- baza wiedzy o surowcach (port KnowledgeService) --- */
  knowledgeSearch: authedQuery
    .input(knowledgeSearchInputSchema)
    .query(({ input }) => searchKnowledge(input)),

  knowledgeAdd: authedQuery
    .input(knowledgeEntryCreateSchema)
    .mutation(({ input }) => addKnowledgeEntry(input)),

  /* --- eksperymenty recepturowe (port ExperimentService) --- */
  experimentRun: authedQuery
    .input(experimentCreateSchema)
    .mutation(({ input }) => runExperiment(input)),

  experimentGet: authedQuery
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getExperiment(input.id)),

  /* --- prognozy stada (port ForecastService) --- */
  forecastBatch: authedQuery
    .input(z.object({ batchId: z.number() }))
    .mutation(({ input }) => forecastBatch(input.batchId)),

  /* --- alerty paszowe (port AlertService) --- */
  alerts: authedQuery
    .input(z.object({ status: z.enum(["active", "acknowledged", "resolved"]).optional() }).optional())
    .query(({ input }) => listFeedAlerts(input?.status)),

  alertCreate: authedQuery
    .input(feedAlertCreateSchema)
    .mutation(({ input }) => createFeedAlert(input)),

  alertAcknowledge: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => acknowledgeFeedAlert(input.id, ctx.user?.name ?? ctx.user?.unionId ?? "system")),

  /* skan stanów magazynowych — operacja administracyjna */
  alertsScan: adminQuery
    .input(z.object({ lowThresholdTons: z.number().positive().default(5) }).optional())
    .mutation(({ input }) => scanStockAlerts(input?.lowThresholdTons)),
});
