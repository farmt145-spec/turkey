/**
 * Router tRPC WAREHOUSE INTELLIGENCE (BTE HYBRID).
 * Port FOUNDATION warehouse module → KIMI tRPC.
 * RBAC: odczyty/mutacje authed; alertScan (operacja masowa) = adminOnly.
 */
import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import {
  findSubstitutesInputSchema,
  lotDetailsUpsertSchema,
  lotTraceabilityInputSchema,
  movementListInputSchema,
  quarantineSetSchema,
  reserveForRecipeInputSchema,
  warehouseAiAnalysisInputSchema,
  warehouseAlertCreateSchema,
  warehouseAlertListInputSchema,
  warehouseAlertResolveInputSchema,
  warehouseMovementCreateSchema,
  warehouseProductCreateSchema,
  productCategorySchema,
} from "../contracts/warehouse";
import * as svc from "../services/warehouse-intelligence.service";

export const warehouseIntelRouter = createRouter({
  /* katalog produktów (+agregat stanu) */
  products: authedQuery
    .input(z.object({ category: productCategorySchema.optional() }).optional())
    .query(async ({ input }) => svc.listProducts(input?.category)),

  productCreate: authedQuery
    .input(warehouseProductCreateSchema)
    .mutation(async ({ input }) => svc.createProduct(input)),

  /* inwentarz (snapshot stock_items) */
  inventory: authedQuery
    .input(z.object({ warehouseId: z.number().int().positive().optional() }).optional())
    .query(async ({ input }) => svc.getInventory(input?.warehouseId)),

  /* ruchy magazynowe */
  movements: authedQuery
    .input(movementListInputSchema)
    .query(async ({ input }) => svc.listMovements(input)),

  movementCreate: authedQuery
    .input(warehouseMovementCreateSchema)
    .mutation(async ({ input, ctx }) =>
      svc.createStockMovement(input, ctx.user?.name ?? ctx.user?.unionId ?? "system")),

  /* jakość partii + kwarantanna */
  lotDetailsUpsert: authedQuery
    .input(lotDetailsUpsertSchema)
    .mutation(async ({ input }) => svc.upsertLotDetails(input)),

  quarantineSet: authedQuery
    .input(quarantineSetSchema)
    .mutation(async ({ input, ctx }) =>
      svc.setQuarantine(input.lotId, input.isQuarantined, input.reason,
        ctx.user?.name ?? ctx.user?.unionId ?? "system")),

  /* analiza AI zapasów (prognoza braku, rekomendacja zamówienia) */
  aiAnalysis: authedQuery
    .input(warehouseAiAnalysisInputSchema)
    .mutation(async ({ input }) => svc.generateAIAnalysis(input)),

  latestAnalysis: authedQuery
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ input }) => svc.latestAnalysis(input.productId)),

  /* alerty magazynowe */
  alerts: authedQuery
    .input(warehouseAlertListInputSchema)
    .query(async ({ input }) => svc.listAlerts(input)),

  alertCreate: authedQuery
    .input(warehouseAlertCreateSchema)
    .mutation(async ({ input }) => svc.createAlert(input)),

  alertResolve: authedQuery
    .input(warehouseAlertResolveInputSchema)
    .mutation(async ({ input }) => svc.resolveAlert(input.id, input.resolvedBy)),

  /* skan alertów (niski stan / ważność / brak paszy) — admin */
  alertScan: adminQuery
    .mutation(async () => svc.runAlertScan()),

  /* dashboard magazynowy */
  dashboard: authedQuery
    .query(async () => svc.getDashboard()),

  /* rezerwacja FEFO pod recepturę */
  reserveRecipe: authedQuery
    .input(reserveForRecipeInputSchema)
    .mutation(async ({ input }) => svc.reserveForRecipe(input)),

  /* substytuty produktu */
  substitutes: authedQuery
    .input(findSubstitutesInputSchema)
    .query(async ({ input }) => svc.findSubstitutes(input)),

  /* identyfikowalność partii (rich: jakość + ruchy + rzuty + destynacja) */
  lotTraceability: authedQuery
    .input(lotTraceabilityInputSchema)
    .query(async ({ input }) => svc.lotTraceability(input.lotId)),
});
