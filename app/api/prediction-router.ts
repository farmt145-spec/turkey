import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { adminQuery, authedQuery, createRouter } from "./middleware";
import { requireBatchTenant } from "./tenant";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { PredictionInputError, runPrediction } from "../services/prediction-engine.service";
import { TRPCError } from "@trpc/server";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function predictionError(error: unknown): never {
  if (error instanceof PredictionInputError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  throw error;
}

export const predictionRouter = createRouter({
  run: authedQuery.input(z.object({ batchId: z.number().int().positive(), day }))
    .mutation(async ({ input, ctx }) => {
      await requireBatchTenant(ctx.user!, input.batchId);
      try {
        return await runPrediction(ctx.user!.companyId!, input.batchId, input.day);
      } catch (error) {
        predictionError(error);
      }
    }),
  runs: authedQuery.input(z.object({ batchId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireBatchTenant(ctx.user!, input.batchId);
      return getDb().select().from(s.predictionRuns)
        .where(and(eq(s.predictionRuns.companyId, ctx.user!.companyId!), eq(s.predictionRuns.batchId, input.batchId)))
        .orderBy(desc(s.predictionRuns.createdAt));
    }),
  createRule: adminQuery.input(z.object({
    code: z.string().min(3).max(64), version: z.string().min(1).max(32), source: z.string().min(2).max(255),
    effectiveFrom: day, inputContract: z.record(z.string(), z.unknown()), thresholds: z.record(z.string(), z.unknown()),
  })).mutation(async ({ input, ctx }) => {
    const [{ id }] = await getDb().insert(s.predictionRules).values({
      ...input, companyId: ctx.user!.companyId!, author: ctx.user!.id.toString(), status: "draft",
    }).returning({ id: s.predictionRules.id });
    return { id };
  }),
  createReferenceCurve: adminQuery.input(z.object({
    geneticLine: z.string().max(128).optional(), sex: z.enum(["toms", "hens", "mixed"]), ageDays: z.number().int().nonnegative(),
    targetWeightG: z.number().int().positive().optional(), targetAdgG: z.number().nonnegative().optional(),
    targetFcr: z.number().positive().optional(), targetFeedKg: z.number().nonnegative().optional(),
    targetMortalityPct: z.number().nonnegative().optional(), source: z.string().min(2).max(255),
    version: z.string().min(1).max(32), effectiveFrom: day,
  })).mutation(async ({ input, ctx }) => {
    const [{ id }] = await getDb().insert(s.referenceCurves).values({
      ...input, companyId: ctx.user!.companyId!, author: ctx.user!.id.toString(), status: "draft",
      targetAdgG: input.targetAdgG?.toFixed(3), targetFcr: input.targetFcr?.toFixed(4),
      targetFeedKg: input.targetFeedKg?.toFixed(3), targetMortalityPct: input.targetMortalityPct?.toFixed(4),
    }).returning({ id: s.referenceCurves.id });
    return { id };
  }),
});
