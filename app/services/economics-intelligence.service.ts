/**
 * Serwisy domenowe ECONOMICS.
 * Port logiki z FOUNDATION economics module (NestJS/Prisma → czyste funkcje/Drizzle).
 * Źródło: economics.service.ts (1:1 progi: pasza>65%, energia>12%, śmiertelność>4%,
 *         FCR>2.6, robocizna>8%, timing<14 dni; współczynniki scenariuszy).
 * Mapowanie: ScenarioResult→scenario_results, AIAdvisor→economics_ai_advisors,
 *            ExecutiveSummary→executive_summaries, BenchmarkEntry→benchmark_entries.
 * ADAPTACJE danych (KIMI):
 *  - totalCost = Σ costs.amount (kategoria "feed" = koszt paszy; "energy" = energia+gaz;
 *    "vet" = medykamenty; "labor" = robocizna) — zamiast DailyCost per-dzień.
 *  - daysInProduction = liczba unikalnych dni z costs (fallback: wiek rzutu).
 *  - avgWeight = ostatnie ważenie (weighings) w kg; przychód = Σ sales.
 *  - waluta: KIMI costs/sales domyślnie EUR; progi procentowe FOUNDATION są
 *    bezwymiarowe — zachowane 1:1 (PLN w etykietach zamieniono na neutralne).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import * as s from "../db/schema";
import type {
  CreateScenarioInput,
  PredictProfitInput,
  ProfitPrediction,
  SummaryPeriod,
} from "../contracts/economics";

const num = (v: unknown): number => Number(v ?? 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
const DEFAULT_PRICE_PER_KG = 12.5; // 1:1 FOUNDATION (cena referencyjna)
const PRODUCTION_DAYS = 120; // 1:1 FOUNDATION (predictProfit/analyzeSale)

/* --- agregaty kosztów rzutu z tabeli costs KIMI --- */
async function batchCostAggregates(batchId: number) {
  const db = getDb();
  const rows = await db.select().from(s.costs).where(eq(s.costs.batchId, batchId));
  const byCat = (cat: string) => rows.filter((r) => r.category === cat).reduce((a, r) => a + num(r.amount), 0);
  const total = rows.reduce((a, r) => a + num(r.amount), 0);
  const days = new Set(rows.map((r) => r.day)).size;
  return {
    total,
    feed: byCat("feed"),
    energy: byCat("energy"),
    vet: byCat("vet"),
    labor: byCat("labor"),
    daysInProduction: days,
  };
}

async function batchContext(batchId: number) {
  const db = getDb();
  const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, batchId));
  if (!batch) throw new Error("Rzut nie istnieje");
  const costs = await batchCostAggregates(batchId);
  const [lastW] = await db.select().from(s.weighings)
    .where(eq(s.weighings.batchId, batchId))
    .orderBy(sql`${s.weighings.dayAge} desc`).limit(1);
  const salesRows = await db.select().from(s.sales).where(eq(s.sales.batchId, batchId));
  const revenue = salesRows.reduce((a, x) => a + num(x.totalWeightKg) * num(x.pricePerKg), 0);
  const soldWeight = salesRows.reduce((a, x) => a + num(x.totalWeightKg), 0);
  const mortality = batch.initialCount > 0 ? (batch.initialCount - batch.currentCount) / batch.initialCount : 0;
  const daysInProduction = costs.daysInProduction > 0
    ? costs.daysInProduction
    : Math.max(1, Math.round((Date.now() - new Date(batch.startDate).getTime()) / 86400000));
  return {
    batch, costs, revenue, soldWeight, mortality, daysInProduction,
    avgWeightKg: (lastW?.avgWeightG ?? 0) / 1000,
  };
}

/* ================== 1. PREDYKCJA ZYSKU (port 1:1 predictProfit) ================== */

export async function predictProfit(input: PredictProfitInput): Promise<ProfitPrediction> {
  const ctx = await batchContext(input.batchId);
  const { batch, costs, mortality, daysInProduction } = ctx;

  const currentWeight = ctx.avgWeightKg;
  const expectedFinalWeight = input.expectedFinalWeight ?? currentWeight * 1.15;
  const expectedMortalityRate = input.expectedMortalityRate ?? mortality;
  const expectedPricePerKg = input.expectedPricePerKg ?? DEFAULT_PRICE_PER_KG;

  const remainingDays = Math.max(0, PRODUCTION_DAYS - daysInProduction);
  const dailyCost = daysInProduction > 0 ? costs.total / daysInProduction : 50;
  const projectedAdditionalCost = dailyCost * remainingDays;

  const finalBirds = Math.round(batch.currentCount * (1 - expectedMortalityRate));
  const totalFinalWeight = finalBirds * expectedFinalWeight;
  const predictedFinalCost = costs.total + projectedAdditionalCost;
  const predictedCostPerKg = totalFinalWeight > 0 ? predictedFinalCost / totalFinalWeight : 0;

  const totalRevenue = totalFinalWeight * expectedPricePerKg;
  const predictedProfit = totalRevenue - predictedFinalCost;
  const predictedMargin = totalRevenue > 0 ? (predictedProfit / totalRevenue) * 100 : 0;
  const breakEvenPrice = predictedCostPerKg;

  // wpływ decyzji — 1:1 FOUNDATION
  const decisionImpacts = [
    {
      decision: "Zmniejszenie FCR o 0.1",
      impactOnProfit: Math.round(predictedFinalCost * 0.03),
      impactOnMargin: 1.5,
      recommendation: "Optymalizacja receptury paszowej może obniżyć FCR i zwiększyć zysk o ~3%",
    },
    {
      decision: "Opóźnienie sprzedaży o 7 dni",
      impactOnProfit: Math.round(-dailyCost * 7 + totalFinalWeight * 0.05 * expectedPricePerKg),
      impactOnMargin: -0.8,
      recommendation: "Opóźnienie zwiększa koszty utrzymania, ale może podnieść wagę końcową",
    },
    {
      decision: "Zmiana na tańszą recepturę",
      impactOnProfit: Math.round(predictedFinalCost * 0.02),
      impactOnMargin: 1.2,
      recommendation: "Analiza receptur wskazuje możliwość oszczędności bez utraty wydajności",
    },
    {
      decision: "Wcześniejsza sprzedaż (o 5 dni)",
      impactOnProfit: Math.round(dailyCost * 5 - totalFinalWeight * 0.03 * expectedPricePerKg),
      impactOnMargin: 0.5,
      recommendation: "Przy wysokich kosztach utrzymania wcześniejsza sprzedaż może być korzystna",
    },
  ];

  return {
    batchId: input.batchId,
    predictedMargin: r2(predictedMargin),
    predictedProfit: r2(predictedProfit),
    breakEvenPrice: r2(breakEvenPrice),
    predictedFinalCost: r2(predictedFinalCost),
    predictedCostPerKg: r2(predictedCostPerKg),
    daysToBreakEven: Math.max(0, Math.round(dailyCost > 0 ? predictedProfit / dailyCost : 0)),
    confidenceScore: 0.85,
    decisionImpacts,
  };
}

/* ================== 2. SCENARIUSZE "CO JEŚLI" (port 1:1 createScenario) ================== */

export async function createScenario(input: CreateScenarioInput, user: string) {
  const db = getDb();
  const ctx = await batchContext(input.batchId);
  const { batch, costs } = ctx;

  const baseCost = costs.total;
  const totalWeight = batch.currentCount * ctx.avgWeightKg;

  // bazowy zysk: rzeczywisty + prognoza reszty (jak predictProfit)
  const basePrediction = await predictProfit({ batchId: input.batchId });

  let predictedCost = baseCost;
  let predictedProfit = basePrediction.predictedProfit;

  if (input.paramFeedPriceChange) {
    predictedCost += costs.feed * (input.paramFeedPriceChange / 100);
  }
  if (input.paramSoyPriceChange) {
    predictedCost += baseCost * 0.25 * (input.paramSoyPriceChange / 100); // 1:1
  }
  if (input.paramFcrChange) {
    predictedCost += costs.feed * (input.paramFcrChange / 2.5); // 1:1
  }
  if (input.paramMortalityChange) {
    const birdsLost = Math.round(batch.currentCount * (input.paramMortalityChange / 100));
    const revenueLoss = birdsLost * ctx.avgWeightKg * DEFAULT_PRICE_PER_KG;
    predictedProfit -= revenueLoss;
  }
  if (input.paramSaleDelayDays) {
    const dailyCost = baseCost / Math.max(1, ctx.daysInProduction);
    predictedCost += dailyCost * input.paramSaleDelayDays;
    const weightGain = batch.currentCount * input.paramSaleDelayDays * 0.05; // 1:1 (50 g/dzień)
    predictedProfit += weightGain * DEFAULT_PRICE_PER_KG;
  }
  if (input.paramGasPriceChange) {
    predictedCost += costs.energy * (input.paramGasPriceChange / 100);
  }
  if (input.paramRecipeId) {
    const [recipe] = await db.select().from(s.recipes).where(eq(s.recipes.id, input.paramRecipeId));
    if (recipe) {
      const feedRows = await db.select().from(s.feedUsages)
        .where(eq(s.feedUsages.batchId, input.batchId));
      const feedKg = feedRows.reduce((a, r) => a + num(r.kg), 0);
      const newFeedCost = feedKg * (num(recipe.costPerTon) / 1000); // ADAPT: costPerTon→kg
      predictedCost += newFeedCost - costs.feed;
    }
  }

  const predictedCostPerKg = totalWeight > 0 ? predictedCost / totalWeight : 0;
  const impactOnProfit = predictedProfit - basePrediction.predictedProfit;
  const revenueBase = basePrediction.predictedProfit + predictedCost;
  const predictedMargin = revenueBase > 0 ? (predictedProfit / revenueBase) * 100 : 0;

  const [{ id }] = await db.insert(s.scenarioResults).values({
    batchId: input.batchId, name: input.name, description: input.description ?? "",
    paramFeedPriceChange: input.paramFeedPriceChange?.toFixed(2),
    paramSoyPriceChange: input.paramSoyPriceChange?.toFixed(2),
    paramFcrChange: input.paramFcrChange?.toFixed(2),
    paramMortalityChange: input.paramMortalityChange?.toFixed(2),
    paramSaleDelayDays: input.paramSaleDelayDays,
    paramGasPriceChange: input.paramGasPriceChange?.toFixed(2),
    paramRecipeId: input.paramRecipeId ?? null,
    predictedCost: predictedCost.toFixed(2),
    predictedMargin: predictedMargin.toFixed(2),
    predictedProfit: predictedProfit.toFixed(2),
    predictedCostPerKg: predictedCostPerKg.toFixed(4),
    impactOnProfit: impactOnProfit.toFixed(2),
    createdBy: user,
  }).returning({ id: s.scenarioResults.id });

  return {
    id, batchId: input.batchId, name: input.name,
    predictedCost: r2(predictedCost), predictedMargin: r2(predictedMargin),
    predictedProfit: r2(predictedProfit), predictedCostPerKg: r2(predictedCostPerKg),
    impactOnProfit: r2(impactOnProfit),
  };
}

export async function listScenarios(batchId: number) {
  return getDb().select().from(s.scenarioResults)
    .where(eq(s.scenarioResults.batchId, batchId))
    .orderBy(desc(s.scenarioResults.createdAt));
}

/* ================== 3. DORADCA KOSZTÓW AI (port 1:1 progi) ================== */

export async function generateAIRecommendations(batchId: number) {
  const db = getDb();
  const ctx = await batchContext(batchId);
  const { batch, costs, mortality, daysInProduction, avgWeightKg } = ctx;
  const totalCost = costs.total;

  const recs: {
    category: s.EconomicsAiAdvisor["category"];
    priority: s.EconomicsAiAdvisor["priority"];
    title: string; description: string; justification: string;
    estimatedSavings: number | null; estimatedGain: number | null;
  }[] = [];

  // pasza > 65% (1:1)
  const feedPercent = totalCost > 0 ? (costs.feed / totalCost) * 100 : 0;
  if (feedPercent > 65) {
    recs.push({
      category: "feed", priority: "high",
      title: "Koszty paszy przekraczają 65% całkowitych kosztów",
      description: `Pasza stanowi ${feedPercent.toFixed(1)}% kosztów. To powyżej optymalnego poziomu 60%.`,
      justification: "Analiza receptur wykazuje, że obecna mieszanka jest droższa o 8% od alternatywnej. Zmiana receptury na mieszankę z większą zawartością kukurydzy może obniżyć koszt bez wpływu na FCR.",
      estimatedSavings: Math.round(costs.feed * 0.08), estimatedGain: null,
    });
  }

  // energia > 12% (1:1)
  const energyPercent = totalCost > 0 ? (costs.energy / totalCost) * 100 : 0;
  if (energyPercent > 12) {
    recs.push({
      category: "energy", priority: "medium",
      title: "Wysokie zużycie energii i gazu",
      description: `Energia i ogrzewanie stanowią ${energyPercent.toFixed(1)}% kosztów produkcji.`,
      justification: "Obniżenie temperatury o 1°C może zredukować zużycie gazu o 6-8% w pozostałym okresie produkcji.",
      estimatedSavings: Math.round(costs.energy * 0.07), estimatedGain: null,
    });
  }

  // śmiertelność > 4% (1:1)
  if (mortality * 100 > 4) {
    const lostRevenue = (batch.initialCount - batch.currentCount) * avgWeightKg * DEFAULT_PRICE_PER_KG;
    recs.push({
      category: "health", priority: "critical",
      title: "Śmiertelność przekracza 4% - pilna interwencja wymagana",
      description: `Aktualna śmiertelność: ${(mortality * 100).toFixed(2)}%. Strata finansowa: ${Math.round(lostRevenue)} EUR.`,
      justification: "Zalecana natychmiastowa konsultacja weterynaryjna i profilaktyka. Każdy dzień zwłoki zwiększa stratę.",
      estimatedSavings: Math.round(lostRevenue * 0.6), estimatedGain: null,
    });
  }

  // FCR > 2.6 (1:1; FCR z ostatniej analizy AI produkcji)
  const [lastAnalysis] = await db.select().from(s.productionAnalyses)
    .where(eq(s.productionAnalyses.batchId, batchId))
    .orderBy(desc(s.productionAnalyses.dayNumber)).limit(1);
  const fcr = num(lastAnalysis?.fcr);
  if (fcr > 2.6) {
    recs.push({
      category: "feed", priority: "high",
      title: "FCR powyżej 2.6 - niska efektywność żywienia",
      description: `Aktualny FCR: ${fcr}. Benchmark optymalny: 2.3-2.5.`,
      justification: "Zalecana weryfikacja jakości paszy i parametrów środowiskowych. Optymalizacja może obniżyć koszt paszy o 5-7%.",
      estimatedSavings: Math.round(costs.feed * 0.06), estimatedGain: null,
    });
  }

  // robocizna > 8% (1:1)
  if (totalCost > 0 && costs.labor > totalCost * 0.08) {
    recs.push({
      category: "labor", priority: "low",
      title: "Koszty robocizny powyżej 8%",
      description: `Robocizna stanowi ${((costs.labor / totalCost) * 100).toFixed(1)}% kosztów.`,
      justification: "Automatyczne systemy karmienia i wodopoju mogą zredukować czas pracy o 15%.",
      estimatedSavings: Math.round(costs.labor * 0.1), estimatedGain: null,
    });
  }

  // timing sprzedaży (1:1: <14 dni do końca i masa >10 kg)
  const remainingDays = Math.max(0, PRODUCTION_DAYS - daysInProduction);
  if (remainingDays < 14 && avgWeightKg > 10) {
    recs.push({
      category: "timing", priority: "medium",
      title: "Optymalny moment sprzedaży zbliża się",
      description: `Indyki osiągnęły ${avgWeightKg.toFixed(2)} kg. Przewidywana cena rynkowa w ciągu 7 dni: wzrost.`,
      justification: "Opóźnienie sprzedaży o 5-7 dni przy obecnej trajektorii cen może zwiększyć przychód netto o ~1.3% zysku.",
      estimatedSavings: null, estimatedGain: Math.round(totalCost * 0.013),
    });
  }

  for (const rec of recs) {
    await db.insert(s.economicsAiAdvisors).values({
      batchId, category: rec.category, priority: rec.priority,
      title: rec.title, description: rec.description, justification: rec.justification,
      estimatedSavings: rec.estimatedSavings?.toFixed(2) ?? null,
      estimatedGain: rec.estimatedGain?.toFixed(2) ?? null,
    });
  }
  return { generated: recs.length, recommendations: recs };
}

export async function listAdvisors(batchId: number) {
  return getDb().select().from(s.economicsAiAdvisors)
    .where(eq(s.economicsAiAdvisors.batchId, batchId))
    .orderBy(desc(s.economicsAiAdvisors.createdAt));
}

export async function markAdvisorAction(id: number, actionResult?: string) {
  await getDb().update(s.economicsAiAdvisors)
    .set({ actionTaken: true, actionResult: actionResult ?? null })
    .where(eq(s.economicsAiAdvisors.id, id));
  return { ok: true };
}

/* ================== 4. ANALIZA SPRZEDAŻY (port 1:1 analyzeSale) ================== */

export async function analyzeSale(batchId: number) {
  const ctx = await batchContext(batchId);
  const { batch, costs, daysInProduction, avgWeightKg } = ctx;

  const dailyCost = daysInProduction > 0 ? costs.total / daysInProduction : 50;
  const priceTrend = daysInProduction > 100 ? "falling" : daysInProduction > 80 ? "stable" : "rising"; // 1:1

  const optimalDays = Math.round(105 + (avgWeightKg - 10) * 2); // 1:1
  const optimalSaleDate = new Date(new Date(batch.startDate).getTime() + optimalDays * 86400000);

  const delayImpactPerDay = Math.round(dailyCost - avgWeightKg * 0.02 * DEFAULT_PRICE_PER_KG); // 1:1
  const predictedRevenue = batch.currentCount * (avgWeightKg * 1.1) * 12.8; // 1:1

  return {
    batchId,
    optimalSaleDate: optimalSaleDate.toISOString().slice(0, 10),
    delayImpactPerDay,
    predictedRevenue: Math.round(predictedRevenue),
    priceTrend,
    recommendedAction: priceTrend === "rising"
      ? "Zalecane opóźnienie sprzedaży o 5-7 dni - trendy cenowe wskazują na wzrost."
      : priceTrend === "falling"
        ? "Zalecana natychmiastowa sprzedaż - ceny spadają."
        : "Sprzedaż w ciągu 3 dni - ceny stabilne.",
  };
}

/* ================== 5. DASHBOARD FINANSOWY (port getDashboard, bez cache) ================== */

export async function getFinancialDashboard(farmId?: number) {
  const db = getDb();
  // filtr przez houses ferme (batches.houseId → houses.farmId)
  let scoped = await db.select().from(s.batches);
  if (farmId) {
    const houses = await db.select().from(s.houses).where(eq(s.houses.farmId, farmId));
    const houseIds = houses.map((h) => h.id);
    scoped = scoped.filter((b) => houseIds.includes(b.houseId));
  }

  let totalCosts = 0, feed = 0, energy = 0, vet = 0, labor = 0;
  let totalRevenue = 0, birdsSold = 0, weightSold = 0;
  for (const b of scoped) {
    const agg = await batchCostAggregates(b.id);
    totalCosts += agg.total; feed += agg.feed; energy += agg.energy; vet += agg.vet; labor += agg.labor;
    const salesRows = await db.select().from(s.sales).where(eq(s.sales.batchId, b.id));
    for (const x of salesRows) {
      totalRevenue += num(x.totalWeightKg) * num(x.pricePerKg);
      birdsSold += x.birdCount;
      weightSold += num(x.totalWeightKg);
    }
  }

  const totalMargin = totalRevenue - totalCosts;
  const avgPricePerKg = weightSold > 0 ? totalRevenue / weightSold : 0;
  const pct = (v: number) => (totalCosts > 0 ? r2((v / totalCosts) * 100) : 0);

  return {
    totalBatches: scoped.length,
    activeBatches: scoped.filter((b) => b.status === "active").length,
    totalCosts: r2(totalCosts),
    totalRevenue: r2(totalRevenue),
    totalMargin: r2(totalMargin),
    ebitda: r2(totalMargin),
    avgPricePerKg: r2(avgPricePerKg),
    birdsSold, totalWeightSoldKg: r2(weightSold),
    costBreakdown: [
      { category: "Pasza", amount: r2(feed), percentage: pct(feed) },
      { category: "Energia", amount: r2(energy), percentage: pct(energy) },
      { category: "Zdrowie", amount: r2(vet), percentage: pct(vet) },
      { category: "Robocizna", amount: r2(labor), percentage: pct(labor) },
      {
        category: "Pozostałe",
        amount: r2(totalCosts - feed - energy - vet - labor),
        percentage: pct(totalCosts - feed - energy - vet - labor),
      },
    ],
  };
}

/* ================== 6. PODSUMOWANIE ZARZĄDCZE (port generateExecutiveSummary) ================== */

export async function generateExecutiveSummary(batchId: number, period: SummaryPeriod) {
  const db = getDb();
  const ctx = await batchContext(batchId);
  const { costs, revenue, mortality, avgWeightKg } = ctx;
  const prediction = await predictProfit({ batchId });

  const strengths: string[] = [];
  const threats: string[] = [];
  const opportunities: string[] = [];

  const feedPct = costs.total > 0 ? (costs.feed / costs.total) * 100 : 0;
  if (feedPct > 0 && feedPct <= 60) strengths.push(`Udział kosztów paszy pod kontrolą (${feedPct.toFixed(1)}%)`);
  if (feedPct > 65) threats.push(`Koszty paszy przekraczają 65% (${feedPct.toFixed(1)}%)`);
  if (mortality <= 0.04) strengths.push(`Śmiertelność w normie (${(mortality * 100).toFixed(2)}%)`);
  else threats.push(`Śmiertelność powyżej 4% (${(mortality * 100).toFixed(2)}%)`);
  if (prediction.predictedMargin > 10) strengths.push(`Prognozowana marża ${prediction.predictedMargin}%`);
  if (prediction.predictedMargin < 5) threats.push(`Niska prognozowana marża (${prediction.predictedMargin}%)`);
  if (avgWeightKg > 0) strengths.push(`Bieżąca masa ${avgWeightKg.toFixed(2)} kg`);
  for (const d of prediction.decisionImpacts) {
    if (d.impactOnProfit > 0) opportunities.push(`${d.decision}: +${d.impactOnProfit} EUR`);
  }

  const topCosts = [
    { category: "Pasza", amount: r2(costs.feed), percent: r2(feedPct) },
    { category: "Energia", amount: r2(costs.energy), percent: costs.total > 0 ? r2((costs.energy / costs.total) * 100) : 0 },
    { category: "Zdrowie", amount: r2(costs.vet), percent: costs.total > 0 ? r2((costs.vet / costs.total) * 100) : 0 },
    { category: "Robocizna", amount: r2(costs.labor), percent: costs.total > 0 ? r2((costs.labor / costs.total) * 100) : 0 },
  ].sort((a, b) => b.amount - a.amount);

  const recommendations = prediction.decisionImpacts
    .filter((d) => d.impactOnProfit > 0)
    .map((d) => ({
      action: d.decision,
      impact: `+${d.impactOnProfit} EUR`,
      priority: d.impactOnProfit > prediction.predictedFinalCost * 0.02 ? "high" : "medium",
    }));

  const result = {
    batchId, period,
    strengths, threats, topCosts,
    profitOpportunities: opportunities,
    endForecast: {
      predictedWeight: prediction.predictedFinalCost > 0 ? avgWeightKg * 1.15 : 0,
      predictedMargin: prediction.predictedMargin,
      predictedProfit: prediction.predictedProfit,
    },
    recommendations,
    metricsSnapshot: {
      totalCost: r2(costs.total), revenue: r2(revenue),
      mortality: r2(mortality * 100), avgWeightKg: r2(avgWeightKg),
    },
  };

  const [{ id }] = await db.insert(s.executiveSummaries).values({
    batchId, period,
    strengths, threats, topCosts,
    profitOpportunities: opportunities,
    endForecast: result.endForecast,
    recommendations,
    metricsSnapshot: result.metricsSnapshot,
  }).returning({ id: s.economicsAiAdvisors.id });
  return { id, ...result };
}

export async function latestSummary(batchId: number) {
  const [row] = await getDb().select().from(s.executiveSummaries)
    .where(eq(s.executiveSummaries.batchId, batchId))
    .orderBy(desc(s.executiveSummaries.generatedAt)).limit(1);
  return row ?? null;
}

/* ================== 7. BENCHMARKI (port recalculateBenchmarks) ================== */

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function recalculateBenchmarks(farmId?: number) {
  const db = getDb();
  let batchRows = await db.select().from(s.batches);
  if (farmId) {
    const houses = await db.select().from(s.houses).where(eq(s.houses.farmId, farmId));
    const houseIds = houses.map((h) => h.id);
    batchRows = batchRows.filter((b) => houseIds.includes(b.houseId));
  }
  const farms = await db.select().from(s.farms);
  const houses = await db.select().from(s.houses);

  let created = 0;
  for (const b of batchRows) {
    const house = houses.find((h) => h.id === b.houseId);
    const farm = farms.find((f) => f.id === house?.farmId);
    const agg = await batchCostAggregates(b.id);
    const salesRows = await db.select().from(s.sales).where(eq(s.sales.batchId, b.id));
    const revenue = salesRows.reduce((a, x) => a + num(x.totalWeightKg) * num(x.pricePerKg), 0);

    const [lastAnalysis] = await db.select().from(s.productionAnalyses)
      .where(eq(s.productionAnalyses.batchId, b.id))
      .orderBy(desc(s.productionAnalyses.dayNumber)).limit(1);
    const [lastW] = await db.select().from(s.weighings)
      .where(eq(s.weighings.batchId, b.id))
      .orderBy(sql`${s.weighings.dayAge} desc`).limit(1);

    const biomassKg = (b.currentCount * (lastW?.avgWeightG ?? 0)) / 1000;
    const soldKg = salesRows.reduce((a, x) => a + num(x.totalWeightKg), 0);
    const totalKg = biomassKg + soldKg;
    const mortality = b.initialCount > 0 ? (b.initialCount - b.currentCount) / b.initialCount : 0;
    const profit = revenue - agg.total;

    await db.insert(s.benchmarkEntries).values({
      farmId: farm?.id ?? 0, batchId: b.id, houseId: b.houseId,
      period: isoWeek(new Date()),
      fcr: num(lastAnalysis?.fcr).toFixed(3),
      adg: num(lastAnalysis?.adgGrams).toFixed(2),
      epef: num(lastAnalysis?.epef).toFixed(2),
      costPerKg: totalKg > 0 ? (agg.total / totalKg).toFixed(4) : null,
      feedCostPerKg: totalKg > 0 ? (agg.feed / totalKg).toFixed(4) : null,
      mortalityRate: mortality.toFixed(4),
      margin: profit.toFixed(2), profit: profit.toFixed(2),
    });
    created++;
  }

  // ranking po marży (farmRank w obrębie okresu)
  const period = isoWeek(new Date());
  const entries = await db.select().from(s.benchmarkEntries)
    .where(eq(s.benchmarkEntries.period, period))
    .orderBy(desc(s.benchmarkEntries.margin));
  for (let i = 0; i < entries.length; i++) {
    await db.update(s.benchmarkEntries).set({ farmRank: i + 1 })
      .where(eq(s.benchmarkEntries.id, entries[i].id));
  }
  return { created, period };
}

export async function listBenchmarks(filter: { farmId?: number; batchId?: number; period?: string }) {
  const db = getDb();
  const conds = [];
  if (filter.farmId) conds.push(eq(s.benchmarkEntries.farmId, filter.farmId));
  if (filter.batchId) conds.push(eq(s.benchmarkEntries.batchId, filter.batchId));
  if (filter.period) conds.push(eq(s.benchmarkEntries.period, filter.period));
  return db.select().from(s.benchmarkEntries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(s.benchmarkEntries.createdAt))
    .limit(200);
}
