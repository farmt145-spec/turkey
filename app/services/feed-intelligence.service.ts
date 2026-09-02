/**
 * Serwisy domenowe FEED INTELLIGENCE.
 * Port logiki z FOUNDATION modules/feed-module (NestJS/Prisma → czyste funkcje/Drizzle).
 * Zasada REUSE>ADAPT: algorytmy 1:1 z feed-module, typy danych zmapowane na tabele KIMI.
 * Źródła: optimization.service.ts, knowledge.service.ts, alert.service.ts,
 *         experiment.service.ts, forecast.service.ts (BTF/modules/feed-module/src/feed/services)
 */
import { and, desc, eq, like, or } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import * as s from "../db/schema";
import type {
  ExperimentChange,
  FeedAlertCreate,
  KnowledgeEntryCreate,
  KnowledgeSearchInput,
  OptimizationConstraints,
  OptimizedIngredient,
} from "../contracts/feed";

const num = (v: unknown): number => Number(v ?? 0);

/* ============================================================
   1. OPTYMALIZACJA RECEPTUR
   Port: OptimizationService (greedy heuristics cost/fcr/adg/health/balanced)
   Mapowanie pól FOUNDATION→KIMI:
     costPerTon→pricePerTon, meTurkey→energyKcal, crudeProtein→proteinPct,
     lysine→lysinePct, crudeFiber→fiberPct,
     minInclusion/maxInclusion→constraints (brak kolumn w KIMI)
     mykotoksyny/witaminy→feed_ingredients.extraParams (json)
   ============================================================ */

type IngredientRow = typeof s.feedIngredients.$inferSelect;

function buildFromPriority(
  sorted: IngredientRow[],
  constraints: OptimizationConstraints,
): OptimizedIngredient[] {
  const out: OptimizedIngredient[] = [];
  let remaining = 100;
  for (const m of sorted) {
    if (remaining <= 0) break;
    const add = Math.min(constraints.maxIngredientPct, remaining);
    if (add > 0) {
      out.push({ ingredientId: m.id, percentage: add });
      remaining -= add;
    }
  }
  const total = out.reduce((sum, i) => sum + i.percentage, 0);
  if (total > 0) {
    for (const i of out) i.percentage = Number(((i.percentage / total) * 100).toFixed(3));
  }
  return out;
}

export async function optimizeRecipe(
  constraints: OptimizationConstraints,
): Promise<{ ingredients: OptimizedIngredient[]; estimatedCostPerTon: number }> {
  const db = getDb();
  const materials = await db.select().from(s.feedIngredients).where(eq(s.feedIngredients.status, "active"));

  let available = materials.filter(
    (m) => !constraints.excludedIngredients?.includes(m.id),
  );
  if (constraints.availableIngredients?.length) {
    available = available.filter((m) => constraints.availableIngredients!.includes(m.id));
  }
  if (constraints.maxCostPerTon) {
    available = available.filter((m) => num(m.pricePerTon) <= constraints.maxCostPerTon!);
  }

  let sorted: IngredientRow[];
  switch (constraints.priority) {
    case "cost":
      sorted = [...available].sort((a, b) => num(a.pricePerTon) - num(b.pricePerTon));
      break;
    case "fcr":
      sorted = [...available].sort((a, b) => {
        const meDiff = num(b.energyKcal) - num(a.energyKcal);
        if (Math.abs(meDiff) > 50) return meDiff;
        return num(a.fiberPct) - num(b.fiberPct);
      });
      break;
    case "adg":
      sorted = [...available].sort((a, b) => {
        const proteinDiff = num(b.proteinPct) - num(a.proteinPct);
        if (Math.abs(proteinDiff) > 2) return proteinDiff;
        return num(b.lysinePct) - num(a.lysinePct);
      });
      break;
    case "health": {
      const scored = available.map((m) => {
        const extra = (m.extraParams ?? {}) as Record<string, number>;
        let score = 100;
        score -= num(extra.aflatoxinB1) * 0.1;
        score -= num(extra.deoxynivalenol) * 0.01;
        score += num(extra.vitaminE) * 0.5;
        score += num(extra.zinc) * 0.1;
        return { m, score };
      });
      sorted = scored.sort((a, b) => b.score - a.score).map((x) => x.m);
      break;
    }
    case "balanced":
    default:
      sorted = [...available].sort((a, b) => {
        const scoreA = (num(a.proteinPct) * 10 + num(a.energyKcal) / 100) / Math.max(num(a.pricePerTon), 1);
        const scoreB = (num(b.proteinPct) * 10 + num(b.energyKcal) / 100) / Math.max(num(b.pricePerTon), 1);
        return scoreB - scoreA;
      });
  }

  const ingredients = buildFromPriority(sorted, constraints);
  const estimatedCostPerTon = ingredients.reduce((sum, i) => {
    const m = available.find((x) => x.id === i.ingredientId);
    return sum + (m ? (num(m.pricePerTon) * i.percentage) / 100 : 0);
  }, 0);

  return { ingredients, estimatedCostPerTon: Number(estimatedCostPerTon.toFixed(2)) };
}

/* ============================================================
   2. WIEDZA O SUROWCACH
   Port: KnowledgeService.searchKnowledge + commonMistakes
   ============================================================ */

export async function searchKnowledge(input: KnowledgeSearchInput) {
  const db = getDb();
  const conditions = [eq(s.knowledgeEntries.status, "active")];
  if (input.ingredientId) conditions.push(eq(s.knowledgeEntries.ingredientId, input.ingredientId));
  if (input.type) conditions.push(eq(s.knowledgeEntries.type, input.type));
  if (input.query) {
    const q = `%${input.query}%`;
    conditions.push(or(like(s.knowledgeEntries.title, q), like(s.knowledgeEntries.summary, q))!);
  }
  const entries = await db
    .select()
    .from(s.knowledgeEntries)
    .where(and(...conditions))
    .orderBy(desc(s.knowledgeEntries.credibility), desc(s.knowledgeEntries.id))
    .limit(50);

  /* applicablePhases przechowywane jako json — filtr fazy w pamięci (jak Prisma `has`) */
  const filtered = input.phase
    ? entries.filter((e) => {
        const phases = (e.applicablePhases as string[] | null) ?? [];
        return phases.length === 0 || phases.includes(input.phase!);
      })
    : entries;

  const mistakes = filtered
    .filter((e) => e.type === "common_mistake" && e.commonMistake)
    .map((e) => ({
      mistake: e.commonMistake!,
      consequence: e.mistakeConsequence ?? "",
      solution: e.mistakeSolution ?? "",
    }));

  return {
    entries: filtered.map((e) => ({
      id: e.id,
      ingredientId: e.ingredientId,
      type: e.type,
      title: e.title,
      source: e.source,
      year: e.year ?? undefined,
      summary: e.summary,
      keyFindings: (e.keyFindings as string[] | null) ?? [],
      recommendations: (e.recommendations as string[] | null) ?? [],
      credibility: num(e.credibility),
      isPeerReviewed: e.isPeerReviewed,
      tags: (e.tags as string[] | null) ?? [],
    })),
    commonMistakes: mistakes,
  };
}

export async function addKnowledgeEntry(data: KnowledgeEntryCreate) {
  const db = getDb();
  const [{ id }] = await db.insert(s.knowledgeEntries).values(data as never).returning({ id: s.knowledgeEntries.id });
  return { id };
}

/* ============================================================
   3. EKSPERYMENTY RECEPTUROWE
   Port: ExperimentService — scenariusz zmian na bazie receptury
   ============================================================ */

export async function runExperiment(input: { name: string; description?: string; baseRecipeId: number; changes: ExperimentChange[] }) {
  const db = getDb();
  const baseItems = await db.select().from(s.recipeItems).where(eq(s.recipeItems.recipeId, input.baseRecipeId));

  /* zastosuj zmiany do kompozycji bazowej (logika z experiment.service) */
  const composition = new Map<number, number>();
  for (const it of baseItems) composition.set(it.ingredientId, num(it.percent));
  for (const ch of input.changes) {
    if (ch.action === "remove") composition.delete(ch.ingredientId);
    else if (ch.action === "add" || ch.action === "adjust") composition.set(ch.ingredientId, ch.value ?? 0);
  }

  /* wylicz profil wynikowy (ważone średnie) — jak simulate w nutrition-router */
  const ingIds = [...composition.keys()];
  const ings = ingIds.length
    ? await db.select().from(s.feedIngredients).where(or(...ingIds.map((id) => eq(s.feedIngredients.id, id)))!)
    : [];
  const totalPct = [...composition.values()].reduce((a, b) => a + b, 0) || 1;
  const profile = { costPerTon: 0, proteinPct: 0, energyKcal: 0, lysinePct: 0 };
  for (const [ingId, pct] of composition) {
    const m = ings.find((x) => x.id === ingId);
    if (!m) continue;
    const w = pct / totalPct;
    profile.costPerTon += num(m.pricePerTon) * w;
    profile.proteinPct += num(m.proteinPct) * w;
    profile.energyKcal += num(m.energyKcal) * w;
    profile.lysinePct += num(m.lysinePct) * w;
  }

  const results = {
    composition: [...composition.entries()].map(([ingredientId, percentage]) => ({ ingredientId, percentage })),
    profile: {
      costPerTon: Number(profile.costPerTon.toFixed(2)),
      proteinPct: Number(profile.proteinPct.toFixed(2)),
      energyKcal: Math.round(profile.energyKcal),
      lysinePct: Number(profile.lysinePct.toFixed(3)),
    },
  };

  const [{ id }] = await db
    .insert(s.experimentScenarios)
    .values({
      name: input.name,
      description: input.description ?? null,
      baseRecipeId: input.baseRecipeId,
      changes: input.changes as never,
      experimentStatus: "completed",
      results: results as never,
      completedAt: new Date(),
    } as never)
    .returning({ id: s.experimentScenarios.id });

  return { id, ...results };
}

export async function getExperiment(id: number) {
  const db = getDb();
  const [row] = await db.select().from(s.experimentScenarios).where(eq(s.experimentScenarios.id, id));
  return row ?? null;
}

/* ============================================================
   4. PROGNOZY STADA
   Port: ForecastService — tygodniowa krzywa zużycia/wyników (model heurystyczny)
   ============================================================ */

export async function forecastBatch(batchId: number) {
  const db = getDb();
  const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, batchId));
  if (!batch) throw new Error(`Stado ${batchId} nie istnieje`);

  const startCount = num(batch.initialCount) || num(batch.currentCount) || 10000;
  /* model wzrostu indyka brojlera — uproszczona krzywa Gompertza (jak forecast.service) */
  const weekly: { week: number; ageDays: number; predictedWeight: number; predictedFeedConsumption: number; predictedFcr: number; predictedMortality: number }[] = [];
  let weight = 0.06; // kg — pisklę
  let cumFeed = 0;
  let alive = startCount;
  const matureWeight = 21; // kg — indyk toms
  for (let week = 1; week <= 20; week++) {
    const growth = matureWeight * 0.09 * Math.exp(-0.045 * week);
    weight = Math.min(weight + growth, matureWeight);
    const dailyFeedKg = 0.045 * Math.pow(weight, 0.75);
    const weekFeed = dailyFeedKg * 7 * alive;
    cumFeed += weekFeed;
    const mortality = 0.0015 * alive;
    alive -= mortality;
    weekly.push({
      week,
      ageDays: week * 7,
      predictedWeight: Number(weight.toFixed(3)),
      predictedFeedConsumption: Math.round(weekFeed),
      predictedFcr: Number((cumFeed / Math.max(weight * startCount, 1)).toFixed(3)),
      predictedMortality: Number(((1 - alive / startCount) * 100).toFixed(2)),
    });
  }

  const last = weekly[weekly.length - 1];
  const summary = {
    predictedFcr: last.predictedFcr,
    predictedAdg: Number(((last.predictedWeight - 0.06) / (last.ageDays) * 1000).toFixed(1)), // g/d
    predictedEpef: Number((((alive / startCount) * last.predictedWeight * 100) / Math.max(last.ageDays * last.predictedFcr, 0.01)).toFixed(0)),
    predictedMortalityPct: last.predictedMortality,
    predictedFeedTons: Number((cumFeed / 1000).toFixed(2)),
    assumptions: [
      "Krzywa wzrostu Gompertza, waga docelowa 21 kg (toms)",
      "Zużycie: 0.045 × waga^0.75 kg/dzień/szt.",
      "Śmiertelność bazowa 0.15%/tydzień",
    ],
    confidenceIntervals: { predictedFcr: { low: last.predictedFcr * 0.95, high: last.predictedFcr * 1.08 } },
  };

  const [{ id }] = await db
    .insert(s.batchForecasts)
    .values({
      batchId,
      weeklyForecasts: weekly as never,
      predictedFcr: String(summary.predictedFcr),
      predictedAdg: String(summary.predictedAdg),
      predictedEpef: String(summary.predictedEpef),
      predictedMortalityPct: String(summary.predictedMortalityPct),
      predictedFeedTons: String(summary.predictedFeedTons),
      assumptions: summary.assumptions as never,
      confidenceIntervals: summary.confidenceIntervals as never,
    } as never)
    .returning({ id: s.batchForecasts.id });

  return { forecastId: id, batchId, weeklyForecasts: weekly, summary };
}

/* ============================================================
   5. ALERTY PASZOWE
   Port: AlertService — create/findAll/acknowledge + skan stanów magazynowych
   ============================================================ */

export async function createFeedAlert(data: FeedAlertCreate) {
  const db = getDb();
  const [{ id }] = await db
    .insert(s.feedAlerts)
    .values({
      ...data,
      actualValue: data.actualValue != null ? String(data.actualValue) : null,
      thresholdValue: data.thresholdValue != null ? String(data.thresholdValue) : null,
    } as never)
    .returning({ id: s.feedAlerts.id });
  return { id };
}

export async function listFeedAlerts(status?: "active" | "acknowledged" | "resolved") {
  const db = getDb();
  const conditions = [eq(s.feedAlerts.status, "active")];
  if (status) conditions.push(eq(s.feedAlerts.alertStatus, status));
  return db.select().from(s.feedAlerts).where(and(...conditions)).orderBy(desc(s.feedAlerts.id)).limit(100);
}

export async function acknowledgeFeedAlert(id: number, user: string) {
  const db = getDb();
  await db
    .update(s.feedAlerts)
    .set({ alertStatus: "acknowledged", acknowledgedBy: user, acknowledgedAt: new Date() })
    .where(eq(s.feedAlerts.id, id));
  return { ok: true };
}

/** Skan stanów: niski stan / brak surowca → alerty stock_low/stock_out (port AlertService.scan) */
export async function scanStockAlerts(lowThresholdTons = 5) {
  const db = getDb();
  const ingredients = await db.select().from(s.feedIngredients).where(eq(s.feedIngredients.status, "active"));
  const created: number[] = [];
  for (const m of ingredients) {
    const stock = num(m.stockTons);
    if (stock > lowThresholdTons) continue;
    /* deduplikacja: nie twórz drugiego aktywnego alertu dla tego surowca */
    const existing = await db
      .select({ id: s.feedAlerts.id })
      .from(s.feedAlerts)
      .where(and(eq(s.feedAlerts.sourceType, "ingredient"), eq(s.feedAlerts.sourceId, m.id), eq(s.feedAlerts.alertStatus, "active")))
      .limit(1);
    if (existing.length) continue;
    const { id } = await createFeedAlert({
      type: stock === 0 ? "stock_out" : "stock_low",
      severity: stock === 0 ? "critical" : "warning",
      sourceType: "ingredient",
      sourceId: m.id,
      title: stock === 0 ? `Brak surowca: ${m.name}` : `Niski stan: ${m.name}`,
      message: `Stan magazynowy ${stock} t (próg ${lowThresholdTons} t).`,
      parameter: "stockTons",
      actualValue: stock,
      thresholdValue: lowThresholdTons,
      unit: "t",
      consequences: stock === 0 ? ["Wstrzymanie produkcji paszy z tym surowcem"] : [],
      recommendations: ["Zaplanuj dostawę", "Rozważ substytucję zgodną z material_substitutions"],
    });
    created.push(id);
  }
  return { created, scanned: ingredients.length };
}
