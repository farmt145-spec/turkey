import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { audit } from "./audit";
import { requireBatchTenant, requireRecipeTenant, requireSiloTenant, requireTenantCompany } from "./tenant";

const num = (v: unknown) => Number(v ?? 0);

export const dailyRouter = createRouter({
  /* lista dzienników rzutu */
  logs: authedQuery
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireBatchTenant(ctx.user!, input.batchId);
      return getDb().select().from(s.dailyLogs)
        .where(eq(s.dailyLogs.batchId, input.batchId))
        .orderBy(asc(s.dailyLogs.day));
    }),

  /* upsert dziennego wpisu — zmiana liczby ptaków przelicza stan (Calculation Engine) */
  upsert: authedQuery
    .input(z.object({
      batchId: z.number(),
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mortality: z.number().int().min(0).default(0),
      culls: z.number().int().min(0).default(0),
      waterLiters: z.number().min(0).optional(),
      feedKg: z.number().min(0).optional(),
      tempC: z.number().min(-30).max(60).optional(),
      humidityPct: z.number().min(0).max(100).optional(),
      ammoniaPpm: z.number().min(0).max(200).optional(),
      note: z.string().max(500).optional(),
      // Używane przez szybki obchód: dopisuje obserwację bez kasowania
      // wcześniejszych danych dziennych dla tego samego rzutu i dnia.
      preserveExisting: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireBatchTenant(ctx.user!, input.batchId);
      const db = getDb();
      const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, input.batchId));
      if (!batch) throw new Error("Rzut nie istnieje");
      if (batch.status !== "active") throw new Error("Rzut jest zamknięty — wpisy zablokowane");
      if (input.mortality + input.culls > batch.currentCount)
        throw new Error(`Upadki + brakowania (${input.mortality + input.culls}) przekraczają stan stada (${batch.currentCount})`);

      const [existing] = await db.select().from(s.dailyLogs)
        .where(and(eq(s.dailyLogs.batchId, input.batchId), eq(s.dailyLogs.day, input.day)));

      await db.transaction(async (tx) => {
        const preserve = input.preserveExisting && existing;
        const values = {
          batchId: input.batchId, day: input.day,
          mortality: preserve ? existing.mortality + input.mortality : input.mortality,
          culls: preserve ? existing.culls + input.culls : input.culls,
          waterLiters: preserve && input.waterLiters === undefined ? existing.waterLiters : input.waterLiters?.toFixed(1),
          feedKg: preserve && input.feedKg === undefined ? existing.feedKg : input.feedKg?.toFixed(1),
          tempC: preserve && input.tempC === undefined ? existing.tempC : input.tempC?.toFixed(1),
          humidityPct: preserve && input.humidityPct === undefined ? existing.humidityPct : input.humidityPct?.toFixed(1),
          ammoniaPpm: preserve && input.ammoniaPpm === undefined ? existing.ammoniaPpm : input.ammoniaPpm?.toFixed(1),
          note: preserve && existing.note && input.note ? `${existing.note}\n${input.note}`.slice(0, 500) : (input.note ?? existing?.note),
          updatedBy: "dziennik",
        };
        if (existing) {
          // korekta: różnica upadków wraca / schodzi ze stada
          const delta = (values.mortality + values.culls) - (existing.mortality + existing.culls);
          await tx.update(s.dailyLogs).set(values).where(eq(s.dailyLogs.id, existing.id));
          if (delta !== 0) {
            await tx.update(s.batches)
              .set({ currentCount: sql`${s.batches.currentCount} - ${delta}`, updatedBy: "dziennik" })
              .where(eq(s.batches.id, input.batchId));
          }
        } else {
          await tx.insert(s.dailyLogs).values(values);
          if (input.mortality + input.culls > 0) {
            await tx.update(s.batches)
              .set({ currentCount: sql`${s.batches.currentCount} - ${input.mortality + input.culls}`, updatedBy: "dziennik" })
              .where(eq(s.batches.id, input.batchId));
          }
        }
        // woda i pasza z dziennika trafiają do strumienia zużycia (feed_usages)
        if (input.feedKg && input.feedKg > 0 && !existing) {
          await tx.insert(s.feedUsages).values({ batchId: input.batchId, day: input.day, kg: input.feedKg.toFixed(1) });
        }
        if (input.mortality > 0 && !existing) {
          await tx.insert(s.mortalities).values({ batchId: input.batchId, day: input.day, count: input.mortality, cause: input.note ?? "dziennik" });
        }
      });
      await audit("daily_logs", existing?.id ?? input.batchId, existing ? "update" : "create", { newValues: input, author: "dziennik" });
      return { ok: true, updated: !!existing };
    }),

  /* statystyki rozbudowane — agregaty i wskaźniki z dziennika */
  stats: authedQuery
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireBatchTenant(ctx.user!, input.batchId);
      const db = getDb();
      const logs = await db.select().from(s.dailyLogs)
        .where(eq(s.dailyLogs.batchId, input.batchId)).orderBy(asc(s.dailyLogs.day));
      const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, input.batchId));
      if (!batch) return null;

      const totalMort = logs.reduce((a, l) => a + l.mortality, 0);
      const totalCulls = logs.reduce((a, l) => a + l.culls, 0);
      const totalWater = logs.reduce((a, l) => a + num(l.waterLiters), 0);
      const totalFeed = logs.reduce((a, l) => a + num(l.feedKg), 0);

      const lastW = await db.select().from(s.weighings)
        .where(eq(s.weighings.batchId, input.batchId)).orderBy(sql`${s.weighings.dayAge} desc`).limit(1);
      const avgG = lastW[0]?.avgWeightG ?? 0;
      const biomassKg = (batch.currentCount * avgG) / 1000;

      // serie do wykresów + wskaźniki
      let cumMort = 0;
      const series = logs.map((l) => {
        cumMort += l.mortality + l.culls;
        const birds = batch.initialCount - cumMort;
        const waterPerBirdMl = birds > 0 && l.waterLiters ? (num(l.waterLiters) * 1000) / birds : null;
        const feedPerBirdG = birds > 0 && l.feedKg ? (num(l.feedKg) * 1000) / birds : null;
        const expectedWaterMl = avgG > 0 ? avgG * 0.18 : null; // norma ~1.8x paszy
        return {
          day: l.day, mortality: l.mortality, culls: l.culls, cumLoss: cumMort,
          water: num(l.waterLiters), feed: num(l.feedKg),
          waterPerBirdMl, feedPerBirdG,
          waterDeviationPct: waterPerBirdMl && expectedWaterMl ? ((waterPerBirdMl - expectedWaterMl) / expectedWaterMl) * 100 : null,
          tempC: l.tempC ? num(l.tempC) : null, humidityPct: l.humidityPct ? num(l.humidityPct) : null,
          ammoniaPpm: l.ammoniaPpm ? num(l.ammoniaPpm) : null,
          note: l.note,
        };
      });

      const daysWithData = Math.max(logs.filter((l) => l.waterLiters).length, 1);
      return {
        batch, logs: series,
        totals: {
          mortality: totalMort, culls: totalCulls, lossPct: (totalMort + totalCulls) / batch.initialCount * 100,
          waterLiters: totalWater, feedKg: totalFeed,
          avgWaterLitersDay: totalWater / daysWithData,
          biomassKg,
          feedPerKgBiomass: biomassKg > 0 ? totalFeed / biomassKg : 0,
        },
        // ostatni dzień — wskaźniki alarmowe
        latest: series.length ? series[series.length - 1] : null,
      };
    }),
});

/* ================= ROZBUDOWANE ŻYWIENIE ================= */

export const feedProgramRouter = createRouter({
  programs: authedQuery.query(async ({ ctx }) => {
    const companyId = requireTenantCompany(ctx.user!);
    const db = getDb();
    const [programs, stages, recipes] = await Promise.all([
      db.select().from(s.feedPrograms).where(eq(s.feedPrograms.companyId, companyId)),
      db.select().from(s.feedProgramStages).orderBy(asc(s.feedProgramStages.dayFrom)),
      db.select().from(s.recipes).where(eq(s.recipes.companyId, companyId)),
    ]);
    return programs.map((p) => ({
      ...p,
      stages: stages.filter((x) => x.programId === p.id).map((x) => ({
        ...x, recipe: recipes.find((r) => r.id === x.recipeId) ?? null,
      })),
    }));
  }),

  createProgram: authedQuery
    .input(z.object({
      name: z.string().min(2),
      sex: z.enum(["toms", "hens", "mixed"]),
      stages: z.array(z.object({
        name: z.string(), dayFrom: z.number().int().min(0), dayTo: z.number().int().min(1),
        recipeId: z.number().optional(), proteinTargetPct: z.number().optional(),
        energyTargetKcal: z.number().int().optional(), feedPerBirdG: z.number().int().optional(),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const companyId = requireTenantCompany(ctx.user!);
      const db = getDb();
      for (const stage of input.stages) if (stage.recipeId) await requireRecipeTenant(ctx.user!, stage.recipeId);
      const [{ id }] = await db.insert(s.feedPrograms)
        .values({ companyId, name: input.name, sex: input.sex }).returning({ id: s.dailyLogs.id });
      for (const st of input.stages) {
        await db.insert(s.feedProgramStages).values({
          programId: id, name: st.name, dayFrom: st.dayFrom, dayTo: st.dayTo,
          recipeId: st.recipeId, proteinTargetPct: st.proteinTargetPct?.toFixed(2),
          energyTargetKcal: st.energyTargetKcal, feedPerBirdG: st.feedPerBirdG,
        });
      }
      await audit("feed_programs", id, "create", { newValues: input });
      return { id };
    }),

  /* wydanie paszy z silosu na rzut — odejmuje stan silosu, dodaje koszt */
  delivery: authedQuery
    .input(z.object({
      siloId: z.number(), batchId: z.number(), day: z.string(),
      kg: z.number().min(1), recipeId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { silo } = await requireSiloTenant(ctx.user!, input.siloId);
      await requireBatchTenant(ctx.user!, input.batchId);
      if (input.recipeId) await requireRecipeTenant(ctx.user!, input.recipeId);
      if (silo.recipeId) await requireRecipeTenant(ctx.user!, silo.recipeId);
      if (num(silo.currentTons) * 1000 < input.kg)
        throw new Error(`Za mało paszy w silosie: dostępne ${fmt(num(silo.currentTons) * 1000)} kg, żądane ${input.kg} kg`);
      await db.transaction(async (tx) => {
        await tx.update(s.silos)
          .set({ currentTons: ((num(silo.currentTons) * 1000 - input.kg) / 1000).toFixed(2) })
          .where(eq(s.silos.id, input.siloId));
        await tx.insert(s.feedDeliveries).values({
          siloId: input.siloId, batchId: input.batchId, day: input.day,
          kg: input.kg.toFixed(1), recipeId: input.recipeId ?? silo.recipeId,
        });
        await tx.insert(s.feedUsages).values({ batchId: input.batchId, day: input.day, kg: input.kg.toFixed(1), recipeId: input.recipeId ?? silo.recipeId });
      });
      await audit("feed_deliveries", input.siloId, "create", { newValues: input });
      return { ok: true };
    }),

  deliveries: authedQuery
    .input(z.object({ batchId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const companyId = requireTenantCompany(ctx.user!);
      if (input?.batchId) await requireBatchTenant(ctx.user!, input.batchId);
      const db = getDb();
      const [rows, silos, batches, houses, farms, recipes] = await Promise.all([
        db.select().from(s.feedDeliveries), db.select().from(s.silos), db.select().from(s.batches),
        db.select().from(s.houses), db.select().from(s.farms).where(eq(s.farms.companyId, companyId)),
        db.select().from(s.recipes).where(eq(s.recipes.companyId, companyId)),
      ]);
      const farmIds = new Set(farms.map((farm) => farm.id));
      const houseIds = new Set(houses.filter((house) => farmIds.has(house.farmId)).map((house) => house.id));
      const batchIds = new Set(batches.filter((batch) => houseIds.has(batch.houseId)).map((batch) => batch.id));
      const siloIds = new Set(silos.filter((silo) => farmIds.has(silo.farmId)).map((silo) => silo.id));
      return rows.filter((delivery) => batchIds.has(delivery.batchId) && siloIds.has(delivery.siloId) && (!input?.batchId || delivery.batchId === input.batchId)).map((d) => ({
        ...d,
        silo: silos.find((x) => x.id === d.siloId) ?? null,
        batchCode: batches.find((b) => b.id === d.batchId)?.code ?? "?",
        recipe: recipes.find((r) => r.id === d.recipeId) ?? null,
      })).sort((a, b) => b.day.localeCompare(a.day));
    }),

  /* uzupełnienie silosu */
  refillSilo: authedQuery
    .input(z.object({ siloId: z.number(), tons: z.number().min(0.1), recipeId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { silo } = await requireSiloTenant(ctx.user!, input.siloId);
      if (input.recipeId) await requireRecipeTenant(ctx.user!, input.recipeId);
      const newTons = num(silo.currentTons) + input.tons;
      if (newTons > num(silo.capacityTons)) throw new Error(`Przekroczenie pojemności silosu (${num(silo.capacityTons)} t)`);
      await db.update(s.silos).set({
        currentTons: newTons.toFixed(2),
        ...(input.recipeId ? { recipeId: input.recipeId } : {}),
      }).where(eq(s.silos.id, input.siloId));
      await audit("silos", input.siloId, "update", { newValues: { refillTons: input.tons } });
      return { ok: true, currentTons: newTons };
    }),
});

function fmt(n: number) { return n.toLocaleString("pl-PL", { maximumFractionDigits: 0 }); }
