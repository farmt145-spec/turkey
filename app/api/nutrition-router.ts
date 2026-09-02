/* ============================================================
   AI NUTRITION LAB — wirtualne laboratorium żywienia.
   Symulator "co będzie jeśli…" na suwakach udziałów surowców,
   ekspert tłumaczący receptury, inteligentne porównanie i
   symulator całego rzutu. Liczone deterministycznie na realnych
   danych surowców z bazy (ceny, białko, energia, aminokwasy).
   ============================================================ */
import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as s from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { requireTenantCompany } from "./tenant";

const num = (v: unknown) => Number(v ?? 0);

type Mix = { ingredientId: number; percent: number }[];

/* Profil wartości odżywczych mieszanki (średnia ważona) */
function profileOf(items: { ing: s.FeedIngredient; percent: number }[]) {
  const sum = items.reduce((a, i) => a + i.percent, 0) || 1;
  const w = (fn: (i: s.FeedIngredient) => number) =>
    items.reduce((a, i) => a + (fn(i.ing) * i.percent) / sum, 0);
  return {
    protein: w((i) => num(i.proteinPct)),
    energy: w((i) => num(i.energyKcal)),
    lysine: w((i) => num(i.lysinePct)),
    methionine: w((i) => num(i.methioninePct)),
    fiber: w((i) => num(i.fiberPct)),
    fat: w((i) => num(i.fatPct)),
    calcium: w((i) => num(i.calciumPct)),
    phosphorus: w((i) => num(i.phosphorusPct)),
    costPerTon: w((i) => num(i.pricePerTon)),
    /* Tom III — rozszerzony profil */
    moisture: w((i) => num((i as any).moisturePct)),
    starch: w((i) => num((i as any).starchPct)),
    cystine: w((i) => num((i as any).cystinePct)),
    threonine: w((i) => num((i as any).threoninePct)),
    tryptophan: w((i) => num((i as any).tryptophanPct)),
    arginine: w((i) => num((i as any).argininePct)),
    sodium: w((i) => num((i as any).sodiumPct)),
  };
}

/* Wyniki produkcyjne przewidywane z profilu — model kalibrowany dla indyków */
export const AGE_GROUPS = {
  chick0_3: { label: "Pisklę 0–3 d", protein: 23.5, energy: 2800, lysine: 1.45, baseAdg: 18, days: 3 },
  chick4_7: { label: "Pisklę 4–7 d", protein: 23.0, energy: 2850, lysine: 1.55, baseAdg: 26, days: 7 },
  chick8_14: { label: "Pisklę 8–14 d", protein: 24.5, energy: 2900, lysine: 1.6, baseAdg: 38, days: 14 },
  starter15_21: { label: "Starter 15–21 d", protein: 25.5, energy: 2950, lysine: 1.65, baseAdg: 52, days: 21 },
  starter22_28: { label: "Starter 22–28 d", protein: 26.0, energy: 3000, lysine: 1.7, baseAdg: 68, days: 28 },
  grower29_56: { label: "Grower 29–56 d", protein: 22.5, energy: 3100, lysine: 1.25, baseAdg: 110, days: 56 },
  finisher57_84: { label: "Finisher 57–84 d", protein: 19.5, energy: 3200, lysine: 1.1, baseAdg: 148, days: 84 },
  finisher85_110: { label: "Finisher 85–110 d (indyczki)", protein: 17.5, energy: 3225, lysine: 1.0, baseAdg: 142, days: 110 },
  finisher113_140: { label: "Finisher 113–140 d (indory)", protein: 16.5, energy: 3250, lysine: 0.9, baseAdg: 155, days: 140 },
  prestarter: { label: "Prestarter (0–14 d)", protein: 28, energy: 2850, lysine: 1.7, baseAdg: 45, days: 14 },
  starter: { label: "Starter (15–28 d)", protein: 26, energy: 2900, lysine: 1.6, baseAdg: 75, days: 28 },
  grower1: { label: "Grower I (29–56 d)", protein: 23, energy: 3000, lysine: 1.35, baseAdg: 105, days: 56 },
  grower2: { label: "Grower II (57–84 d)", protein: 20, energy: 3100, lysine: 1.1, baseAdg: 130, days: 84 },
  finisher1: { label: "Finisher I (85–112 d)", protein: 18, energy: 3200, lysine: 1.0, baseAdg: 150, days: 112 },
  finisher2: { label: "Finisher II (113+ d)", protein: 16.5, energy: 3250, lysine: 0.9, baseAdg: 155, days: 140 },
} as const;
export type AgeGroupKey = keyof typeof AGE_GROUPS;
// aliasy wstecznej zgodności
const ALIAS: Record<string, AgeGroupKey> = {
  grower: "grower29_56",
  finisher: "finisher57_84",
  prestarter: "prestarter",
  starter: "starter22_28",
  finisher1: "finisher85_110",
  finisher2: "finisher113_140",
};

function resolveAgeGroup(ageGroupIn: AgeGroupKey | string, sex: "toms" | "hens" | "mixed" = "mixed") {
  const base = (ALIAS[ageGroupIn] ?? ageGroupIn) as AgeGroupKey;
  if (sex === "hens" && (base === "finisher57_84" || base === "finisher1" || base === "finisher2")) return "finisher85_110";
  if (sex === "toms" && (base === "finisher57_84" || base === "finisher1" || base === "finisher2")) return "finisher113_140";
  return base;
}

function productionFromProfile(p: ReturnType<typeof profileOf>, ageGroupIn: AgeGroupKey | string, sex: "toms" | "hens" | "mixed" = "mixed") {
  const ageGroup = resolveAgeGroup(ageGroupIn, sex);
  const g = AGE_GROUPS[ageGroup] ?? AGE_GROUPS.finisher113_140;
  const target = { protein: g.protein, energy: g.energy, lysine: g.lysine };
  const proteinFit = Math.min(p.protein / target.protein, 1.08);
  const lysineFit = Math.min(p.lysine / target.lysine, 1.1);
  const energyFit = Math.min(p.energy / target.energy, 1.06);
  const fiberPenalty = Math.max(0, (p.fiber - 5) * 0.012);
  const growthIndex = Math.min(proteinFit, lysineFit) * energyFit - fiberPenalty; // ~1.0 idealnie

  const baseAdg = g.baseAdg;
  const adgG = Math.max(baseAdg * growthIndex, 30);
  const fcr = Math.max(2.35 - (growthIndex - 1) * 0.55 + Math.max(0, 6 - p.fat) * 0.008, 1.7);
  const totalDays = Math.max(g.days, 30);
  const epef = totalDays >= 60 ? ((0.96 * (baseAdg * growthIndex * totalDays) / 1000) * 10000) / (totalDays * fcr) : ((0.96 * (baseAdg * growthIndex * totalDays) / 1000) * 10000) / (60 * fcr);
  const waterMl = adgG * 14 + p.fiber * 6 + (p.energy - 3000) * 0.04;
  const metabolicRisk = Math.min(Math.max((p.fat - 7) * 6 + Math.max(0, p.protein - target.protein - 2) * 8 + fiberPenalty * 400, 0), 100);
  const safety = Math.min(100 - metabolicRisk * 0.6 - Math.max(0, p.fiber - 6) * 5, 100);
  return { adgG, fcr, epef, waterMl, metabolicRisk, safety, growthIndex };
}

const mixInput = z.object({
  items: z.array(z.object({ ingredientId: z.number(), percent: z.number().min(0).max(100) })).min(1),
  ageGroup: z.enum([
    "chick0_3", "chick4_7", "chick8_14",
    "starter15_21", "starter22_28",
    "grower29_56", "finisher57_84", "finisher85_110", "finisher113_140",
    "prestarter", "starter", "grower1", "grower2", "finisher1", "finisher2",
    "grower", "finisher",
  ]).default("finisher113_140"),
  sex: z.enum(["toms", "hens", "mixed"]).default("toms"),
  genetics: z.enum(["BUT Big 6", "BUT 6", "Nicholas", "Hybrid Converter", "Hybrid Grade Maker"]).default("BUT Big 6"),
});

const REQUIREMENTS: Record<string, Record<string, number>> = {
  chick0_3: { energy: 2800, protein: 23.5, lysine: 1.45, methionine: 0.6, threonine: 1.02, calcium: 1.15, phosphorus: 0.7, sodium: 0.18, fiber: 3.2, fat: 5.5 },
  chick4_7: { energy: 2850, protein: 23.0, lysine: 1.55, methionine: 0.6, threonine: 1.05, calcium: 1.15, phosphorus: 0.7, sodium: 0.18, fiber: 3.4, fat: 5.8 },
  chick8_14: { energy: 2900, protein: 24.5, lysine: 1.6, methionine: 0.62, threonine: 1.08, calcium: 1.12, phosphorus: 0.68, sodium: 0.17, fiber: 3.6, fat: 6.0 },
  starter15_21: { energy: 2950, protein: 25.5, lysine: 1.65, methionine: 0.62, threonine: 1.08, calcium: 1.1, phosphorus: 0.66, sodium: 0.17, fiber: 3.8, fat: 6.2 },
  starter22_28: { energy: 3000, protein: 26, lysine: 1.7, methionine: 0.62, threonine: 1.1, calcium: 1.1, phosphorus: 0.66, sodium: 0.17, fiber: 3.9, fat: 6.4 },
  grower29_56: { energy: 3100, protein: 22.5, lysine: 1.25, methionine: 0.5, threonine: 0.92, calcium: 1.0, phosphorus: 0.6, sodium: 0.16, fiber: 4.3, fat: 7.0 },
  finisher57_84: { energy: 3200, protein: 19.5, lysine: 1.1, methionine: 0.45, threonine: 0.8, calcium: 0.95, phosphorus: 0.58, sodium: 0.15, fiber: 4.8, fat: 7.6 },
  finisher85_110: { energy: 3225, protein: 17.5, lysine: 1.0, methionine: 0.42, threonine: 0.75, calcium: 0.9, phosphorus: 0.55, sodium: 0.15, fiber: 4.9, fat: 8.0 },
  finisher113_140: { energy: 3250, protein: 16.5, lysine: 0.9, methionine: 0.38, threonine: 0.68, calcium: 0.85, phosphorus: 0.5, sodium: 0.14, fiber: 5.1, fat: 8.5 },
  prestarter: { energy: 2850, protein: 28, lysine: 1.7, methionine: 0.6, threonine: 1.05, calcium: 1.2, phosphorus: 0.7, sodium: 0.18, fiber: 3.5, fat: 6.0 },
  starter: { energy: 2900, protein: 26, lysine: 1.6, methionine: 0.55, threonine: 1.0, calcium: 1.15, phosphorus: 0.68, sodium: 0.17, fiber: 3.8, fat: 6.5 },
  grower1: { energy: 3000, protein: 23, lysine: 1.35, methionine: 0.5, threonine: 0.92, calcium: 1.05, phosphorus: 0.62, sodium: 0.16, fiber: 4.2, fat: 7.0 },
  grower2: { energy: 3100, protein: 20, lysine: 1.1, methionine: 0.45, threonine: 0.82, calcium: 0.95, phosphorus: 0.58, sodium: 0.15, fiber: 4.5, fat: 7.5 },
  finisher1: { energy: 3200, protein: 18, lysine: 1.0, methionine: 0.42, threonine: 0.75, calcium: 0.9, phosphorus: 0.55, sodium: 0.15, fiber: 4.8, fat: 8.0 },
  finisher2: { energy: 3250, protein: 16.5, lysine: 0.9, methionine: 0.38, threonine: 0.68, calcium: 0.85, phosphorus: 0.5, sodium: 0.14, fiber: 5.0, fat: 8.5 },
};

const GENETIC_REQUIREMENTS: Record<string, Record<string, Record<string, number>>> = {
  "BUT Big 6": {
    toms: { energy: 2900, protein: 24.5, lysine: 1.55, methionine: 0.62, threonine: 1.08, calcium: 1.10, phosphorus: 0.65, sodium: 0.17, fiber: 3.8, fat: 6.4 },
    hens: { energy: 2860, protein: 23.8, lysine: 1.50, methionine: 0.60, threonine: 1.03, calcium: 1.08, phosphorus: 0.64, sodium: 0.17, fiber: 3.9, fat: 6.3 },
    mixed: { energy: 2880, protein: 24.1, lysine: 1.53, methionine: 0.61, threonine: 1.05, calcium: 1.09, phosphorus: 0.65, sodium: 0.17, fiber: 3.9, fat: 6.3 },
  },
  "BUT 6": {
    toms: { energy: 2925, protein: 24.8, lysine: 1.58, methionine: 0.63, threonine: 1.10, calcium: 1.12, phosphorus: 0.66, sodium: 0.17, fiber: 3.7, fat: 6.5 },
    hens: { energy: 2885, protein: 24.2, lysine: 1.52, methionine: 0.61, threonine: 1.06, calcium: 1.10, phosphorus: 0.65, sodium: 0.17, fiber: 3.8, fat: 6.3 },
    mixed: { energy: 2905, protein: 24.5, lysine: 1.55, methionine: 0.62, threonine: 1.08, calcium: 1.11, phosphorus: 0.65, sodium: 0.17, fiber: 3.8, fat: 6.4 },
  },
  Nicholas: {
    toms: { energy: 2970, protein: 25.2, lysine: 1.63, methionine: 0.64, threonine: 1.12, calcium: 1.13, phosphorus: 0.67, sodium: 0.17, fiber: 3.6, fat: 6.6 },
    hens: { energy: 2915, protein: 24.6, lysine: 1.57, methionine: 0.62, threonine: 1.08, calcium: 1.10, phosphorus: 0.66, sodium: 0.17, fiber: 3.7, fat: 6.4 },
    mixed: { energy: 2940, protein: 24.9, lysine: 1.60, methionine: 0.63, threonine: 1.10, calcium: 1.11, phosphorus: 0.66, sodium: 0.17, fiber: 3.7, fat: 6.5 },
  },
  "Hybrid Converter": {
    toms: { energy: 3010, protein: 25.8, lysine: 1.67, methionine: 0.66, threonine: 1.16, calcium: 1.15, phosphorus: 0.68, sodium: 0.17, fiber: 3.5, fat: 6.8 },
    hens: { energy: 2950, protein: 25.0, lysine: 1.60, methionine: 0.63, threonine: 1.10, calcium: 1.12, phosphorus: 0.67, sodium: 0.17, fiber: 3.6, fat: 6.6 },
    mixed: { energy: 2980, protein: 25.4, lysine: 1.64, methionine: 0.65, threonine: 1.13, calcium: 1.14, phosphorus: 0.67, sodium: 0.17, fiber: 3.6, fat: 6.7 },
  },
  "Hybrid Grade Maker": {
    toms: { energy: 3040, protein: 26.2, lysine: 1.72, methionine: 0.68, threonine: 1.19, calcium: 1.16, phosphorus: 0.69, sodium: 0.18, fiber: 3.4, fat: 7.0 },
    hens: { energy: 2980, protein: 25.5, lysine: 1.65, methionine: 0.65, threonine: 1.14, calcium: 1.13, phosphorus: 0.68, sodium: 0.17, fiber: 3.5, fat: 6.8 },
    mixed: { energy: 3010, protein: 25.9, lysine: 1.68, methionine: 0.66, threonine: 1.17, calcium: 1.15, phosphorus: 0.68, sodium: 0.18, fiber: 3.5, fat: 6.9 },
  },
};

const GENETIC_LINE_OPTIONS = ["BUT Big 6", "BUT 6", "Nicholas", "Hybrid Converter", "Hybrid Grade Maker"] as const;
type GeneticLineName = typeof GENETIC_LINE_OPTIONS[number];

function getGeneticRequirements(genetics: string | undefined, sex: "toms" | "hens" | "mixed", ageGroup: string) {
  const line = genetics && GENETIC_LINE_OPTIONS.includes(genetics as GeneticLineName) ? genetics as GeneticLineName : "BUT Big 6";
  const base = GENETIC_REQUIREMENTS[line]?.[sex] ?? GENETIC_REQUIREMENTS["BUT Big 6"].mixed;
  const phaseFallback = REQUIREMENTS[resolveAgeGroup(ageGroup, sex) as keyof typeof REQUIREMENTS] ?? REQUIREMENTS.finisher113_140;
  const blend = (phase: number, genetic: number) => phase + (genetic - phase) * 0.04;

  return {
    energy: blend(phaseFallback.energy, base.energy ?? phaseFallback.energy),
    protein: blend(phaseFallback.protein, base.protein ?? phaseFallback.protein),
    lysine: blend(phaseFallback.lysine, base.lysine ?? phaseFallback.lysine),
    methionine: blend(phaseFallback.methionine, base.methionine ?? phaseFallback.methionine),
    threonine: blend(phaseFallback.threonine, base.threonine ?? phaseFallback.threonine),
    calcium: blend(phaseFallback.calcium, base.calcium ?? phaseFallback.calcium),
    phosphorus: blend(phaseFallback.phosphorus, base.phosphorus ?? phaseFallback.phosphorus),
    sodium: blend(phaseFallback.sodium, base.sodium ?? phaseFallback.sodium),
    fiber: blend(phaseFallback.fiber, base.fiber ?? phaseFallback.fiber),
    fat: blend(phaseFallback.fat, base.fat ?? phaseFallback.fat),
    line,
  };
}

export function statusFromDelta(delta: number, required: number): "PASS" | "WARNING" | "DEFICIT" | "EXCESS" {
  if (required <= 0) return "PASS";
  const ratio = delta / required;
  if (Math.abs(ratio) <= 0.03) return "PASS";
  if (ratio < -0.15) return "DEFICIT";
  if (ratio < 0) return "WARNING";
  if (ratio > 0.15) return "EXCESS";
  return "WARNING";
}

export function buildBalanceReport(profile: ReturnType<typeof profileOf>, ageGroup: string, sex: "toms" | "hens" | "mixed" = "mixed", genetics?: string) {
  const target = getGeneticRequirements(genetics, sex, ageGroup);
  const rows = [
    { key: "energy", label: "Energia", value: profile.energy, required: target.energy, unit: "kcal" },
    { key: "protein", label: "Białko", value: profile.protein, required: target.protein, unit: "%" },
    { key: "lysine", label: "Lizyna", value: profile.lysine, required: target.lysine, unit: "%" },
    { key: "methionine", label: "Metionina", value: profile.methionine, required: target.methionine, unit: "%" },
    { key: "threonine", label: "Treonina", value: profile.threonine, required: target.threonine, unit: "%" },
    { key: "calcium", label: "Ca", value: profile.calcium, required: target.calcium, unit: "%" },
    { key: "phosphorus", label: "P", value: profile.phosphorus, required: target.phosphorus, unit: "%" },
    { key: "sodium", label: "Na", value: profile.sodium, required: target.sodium, unit: "%" },
    { key: "fiber", label: "Włókno", value: profile.fiber, required: target.fiber, unit: "%" },
    { key: "fat", label: "Tłuszcz", value: profile.fat, required: target.fat, unit: "%" },
  ].map((row) => {
    const diff = row.value - row.required;
    return {
      ...row,
      diff,
      status: statusFromDelta(diff, row.required),
      differenceText: `${diff >= 0 ? "+" : ""}${diff.toFixed(2)} ${row.unit}`,
    };
  });

  const issues = rows.filter((row) => row.status !== "PASS");
  return {
    rows,
    overallStatus: issues.length === 0 ? "PASS" : issues.some((row) => row.status === "DEFICIT" || row.status === "EXCESS") ? "WARNING" : "WARNING",
    alerts: issues.map((row) => `${row.label}: ${row.status} (${row.differenceText})`),
  };
}

async function loadIngredients(db: ReturnType<typeof getDb>, mix: Mix, companyId: number) {
  const all = await db.select().from(s.feedIngredients).where(eq(s.feedIngredients.companyId, companyId));
  const map = new Map(all.map((i) => [i.id, i]));
  return mix
    .filter((m) => map.has(m.ingredientId) && m.percent > 0)
    .map((m) => ({ ing: map.get(m.ingredientId)!, percent: m.percent }));
}

function explainMix(items: { ing: s.FeedIngredient; percent: number }[], p: ReturnType<typeof profileOf>, prod: ReturnType<typeof productionFromProfile>, ageGroup: string) {
  const parts: string[] = [];
  const top = [...items].sort((a, b) => b.percent - a.percent).slice(0, 3);
  parts.push(`Mieszanka (${ageGroup}) opiera się na: ${top.map((t) => `${t.ing.name} ${t.percent.toFixed(0)}%`).join(", ")}.`);
  parts.push(`Profil: białko ${p.protein.toFixed(1)}%, energia ${p.energy.toFixed(0)} kcal, lizyna ${p.lysine.toFixed(2)}%, metionina ${p.methionine.toFixed(2)}%, włókno ${p.fiber.toFixed(1)}%, tłuszcz ${p.fat.toFixed(1)}%.`);
  if (p.lysine < 0.9) parts.push("⚠ Niedobór lizyny — rozważ większy udział śruty sojowej lub krystalicznej lizyny; każdy 0.1 p.p. niedoboru lizyny obniża ADG o ok. 8–12 g.");
  if (p.fiber > 5.5) parts.push("⚠ Podwyższone włókno zwiększa pobór wody i wilgotność ściółki — dodatek enzymu ksylanazy poprawi wykorzystanie energii.");
  if (p.fat > 8) parts.push("⚠ Wysoki tłuszcz podnosi ryzyko metaboliczne i zjełczenia — zabezpiecz antyoksydantem.");
  parts.push(`Przewidywane: ADG ${prod.adgG.toFixed(0)} g/d, FCR ${prod.fcr.toFixed(2)}, EPEF ${prod.epef.toFixed(0)}, pobór wody ${prod.waterMl.toFixed(0)} ml/szt/d. Koszt tony: ${p.costPerTon.toFixed(0)} EUR.`);
  parts.push(`Poziom pewności rekomendacji: ${Math.round(88 + prod.safety * 0.1)}%.`);
  return parts.join(" ");
}

function scoreMix(p: ReturnType<typeof profileOf>, prod: ReturnType<typeof productionFromProfile>) {
  let score = 100;
  score -= Math.abs(prod.fcr - 2.3) * 18;
  score -= Math.max(0, 145 - prod.adgG) * 0.12;
  score -= Math.max(0, p.costPerTon - 420) * 0.04;
  score -= prod.metabolicRisk * 0.25;
  return Math.max(Math.min(Math.round(score), 100), 20);
}

export const nutritionRouter = createRouter({
  /* Symulator suwaków — błyskawiczna kalkulacja po stronie serwera */
  simulate: authedQuery.input(mixInput).query(async ({ input, ctx }) => {
    const db = getDb();
    const items = await loadIngredients(db, input.items, requireTenantCompany(ctx.user!));
    const p = profileOf(items);
    const prod = productionFromProfile(p, input.ageGroup, input.sex);
    const total = items.reduce((a, i) => a + i.percent, 0);
    const requirements = getGeneticRequirements(input.genetics, input.sex, input.ageGroup);
    const balance = buildBalanceReport(p, input.ageGroup, input.sex, input.genetics);
    return {
      profile: p,
      production: prod,
      requirements,
      balance: balance.rows,
      totalPercent: total,
      normalized: Math.abs(total - 100) < 0.5,
      costPerKgLive: (p.costPerTon / 1000) * prod.fcr,
      explanation: explainMix(items, p, prod, `${input.genetics} · ${input.ageGroup}`),
      warnings: [
        ...(total > 100.5 ? [`Suma udziałów ${total.toFixed(0)}% — przekracza 100%, wartości znormalizowane`] : []),
        ...(total < 99.5 && total > 0 ? [`Suma udziałów ${total.toFixed(0)}% — uzupełnij do 100%`] : []),
        ...balance.alerts,
      ],
    };
  }),

  /* Inteligentne porównanie receptur A vs B */
  compare: authedQuery
    .input(z.object({ a: mixInput.shape.items, b: mixInput.shape.items, ageGroup: mixInput.shape.ageGroup }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const companyId = requireTenantCompany(ctx.user!);
      const ia = await loadIngredients(db, input.a, companyId);
      const ib = await loadIngredients(db, input.b, companyId);
      const pa = profileOf(ia), pb = profileOf(ib);
      const ra = productionFromProfile(pa, input.ageGroup, "mixed"), rb = productionFromProfile(pb, input.ageGroup, "mixed");
      const sa = scoreMix(pa, ra), sb = scoreMix(pb, rb);
      const reasons: string[] = [];
      if (Math.abs(ra.adgG - rb.adgG) > 3) reasons.push(ra.adgG > rb.adgG ? "wyższy potencjał wzrostu (ADG)" : "niższy potencjał wzrostu (ADG)");
      if (Math.abs(ra.fcr - rb.fcr) > 0.03) reasons.push(ra.fcr < rb.fcr ? "lepsza konwersja paszy" : "gorsza konwersja paszy");
      if (Math.abs(pa.lysine - pb.lysine) > 0.05) reasons.push(pa.lysine > pb.lysine ? "lepszy profil aminokwasów" : "słabszy profil aminokwasów");
      if (Math.abs(pa.costPerTon - pb.costPerTon) > 10) reasons.push(pa.costPerTon < pb.costPerTon ? "niższy koszt tony" : "wyższy koszt tony");
      if (Math.abs(ra.metabolicRisk - rb.metabolicRisk) > 5) reasons.push(ra.metabolicRisk < rb.metabolicRisk ? "mniejsze ryzyko metaboliczne" : "większe ryzyko metaboliczne");
      return {
        a: { profile: pa, production: ra, score: sa },
        b: { profile: pb, production: rb, score: sb },
        verdict: sa === sb ? "Receptury równoważne" : sa > sb ? `Receptura A lepsza (${sa}/100 vs ${sb}/100)` : `Receptura B lepsza (${sb}/100 vs ${sa}/100)`,
        reasons,
      };
    }),

  /* Symulator całego rzutu dla danej mieszanki */
  batchSimulation: authedQuery
    .input(z.object({
      items: mixInput.shape.items,
      ageGroup: mixInput.shape.ageGroup,
      sex: mixInput.shape.sex,
      genetics: mixInput.shape.genetics,
      birds: z.number().default(10000),
      days: z.number().default(140),
    }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const items = await loadIngredients(db, input.items, requireTenantCompany(ctx.user!));
      const p = profileOf(items);
      const prod = productionFromProfile(p, input.ageGroup, input.sex);
      const finalWeightKg = (prod.adgG * input.days) / 1000;
      const livability = 96 - prod.metabolicRisk * 0.05;
      const soldKg = input.birds * (livability / 100) * finalWeightKg;
      const feedKg = soldKg * prod.fcr;
      const feedCost = (feedKg / 1000) * p.costPerTon;
      const chickCost = input.birds * 1.36;
      const vetEnergyCost = soldKg * 0.18;
      const totalCost = feedCost + chickCost + vetEnergyCost;
      const pricePerKg = 4.9; // EUR/kg — cena kontraktowa żywca
      const revenue = soldKg * pricePerKg;
      const profit = revenue - totalCost;
      return {
        finalWeightKg, livability, adgG: prod.adgG, fcr: prod.fcr, epef: prod.epef,
        mortalityPct: 100 - livability, feedTons: feedKg / 1000, waterTons: (soldKg / prod.fcr) * 0 + (input.birds * prod.waterMl * input.days) / 1e6,
        feedCostEur: feedCost, totalCostEur: totalCost, costPerKgLive: totalCost / Math.max(soldKg, 1),
        revenueEur: revenue, grossMarginEur: profit, ammoniaTons: (feedKg * p.protein * 0.16 * 0.35 * 17 / 14) / 1e6,
        certaintyPct: Math.round(85 + prod.safety * 0.12),
      };
    }),

  /* Raport ekspercki dla istniejącej receptury z bazy */
  expertReport: authedQuery.input(z.object({ recipeId: z.number() })).query(async ({ input, ctx }) => {
    const db = getDb();
    const companyId = requireTenantCompany(ctx.user!);
    const [r] = await db.select().from(s.recipes).where(eq(s.recipes.id, input.recipeId));
    if (!r) return null;
    if (r.companyId !== companyId) return null;
    const items = await db.select().from(s.recipeItems).where(eq(s.recipeItems.recipeId, r.id));
    const ings = await db.select().from(s.feedIngredients).where(eq(s.feedIngredients.companyId, companyId));
    const map = new Map(ings.map((i) => [i.id, i]));
    const mix = items.map((it) => ({ ing: map.get(it.ingredientId)!, percent: num(it.percent) })).filter((x) => x.ing);
    const p = profileOf(mix);
    const prod = productionFromProfile(p, "finisher", "mixed");
    return {
      recipe: r,
      composition: mix.map((m) => ({ name: m.ing.name, percent: m.percent, pricePerTon: num(m.ing.pricePerTon) })),
      profile: p,
      production: prod,
      score: scoreMix(p, prod),
      report: explainMix(mix, p, prod, r.ageGroup),
      alternatives: mix
        .filter((m) => num(m.ing.pricePerTon) > p.costPerTon)
        .map((m) => {
          const cheaper = ings.filter((i) => num(i.proteinPct) >= num(m.ing.proteinPct) * 0.85 && num(i.pricePerTon) < num(m.ing.pricePerTon) * 0.9 && i.id !== m.ing.id);
          return cheaper.length ? `Częściowa zamiana ${m.ing.name} na ${cheaper[0].name} obniży koszt tony o ~${((num(m.ing.pricePerTon) - num(cheaper[0].pricePerTon)) * m.percent / 100).toFixed(0)} EUR` : null;
        })
        .filter(Boolean),
    };
  }),

  /* Lista surowców do panelu suwaków */
  ingredients: authedQuery.query(async ({ ctx }) => {
    return getDb().select().from(s.feedIngredients)
      .where(eq(s.feedIngredients.companyId, requireTenantCompany(ctx.user!)))
      .orderBy(desc(s.feedIngredients.stockTons));
  }),

  /* Asystent kreatora — analiza mieszanki względem celów fazy + konkretne podpowiedzi korekt */
  assist: authedQuery.input(mixInput).query(async ({ input, ctx }) => {
    const db = getDb();
    const companyId = requireTenantCompany(ctx.user!);
    const items = await loadIngredients(db, input.items, companyId);
    const p = profileOf(items);
    const prod = productionFromProfile(p, input.ageGroup, input.sex);
    const gk = resolveAgeGroup(input.ageGroup, input.sex) as AgeGroupKey;
    const g = AGE_GROUPS[gk] ?? AGE_GROUPS.finisher1;
    const geneticsTargets = getGeneticRequirements(input.genetics, input.sex, input.ageGroup);
    const total = items.reduce((a, i) => a + i.percent, 0);

    const ings = await db.select().from(s.feedIngredients).where(eq(s.feedIngredients.companyId, companyId));
    const inMix = new Set(items.map((i) => i.ing.id));
    const tips: { type: "error" | "warn" | "ok" | "idea"; text: string }[] = [];

    // bilans masy
    if (total < 99.5) tips.push({ type: "warn", text: `Suma udziałów: ${total.toFixed(1)}% — uzupełnij do 100% (brakuje ${(100 - total).toFixed(1)} p.p.).` });
    else if (total > 100.5) tips.push({ type: "warn", text: `Suma udziałów: ${total.toFixed(1)}% — przekracza 100%, zmniejsz udziały o ${(total - 100).toFixed(1)} p.p.` });
    else tips.push({ type: "ok", text: `Bilans masy prawidłowy (${total.toFixed(1)}%).` });

    // cele fazy
    const dP = p.protein - g.protein, dE = p.energy - g.energy, dL = p.lysine - g.lysine;
    const targetProtein = geneticsTargets.protein || g.protein;
    const targetEnergy = geneticsTargets.energy || g.energy;
    const targetLysine = geneticsTargets.lysine || g.lysine;
    const targetFiber = geneticsTargets.fiber || 4.5;

    if (dP < -1) {
      const best = ings.filter((i) => num(i.proteinPct) >= 40 && !inMix.has(i.id)).sort((a, b) => num(a.pricePerTon) - num(b.pricePerTon))[0];
      tips.push({ type: "error", text: `${input.genetics}: białko ${p.protein.toFixed(1)}% poniżej celu dla fazy (${targetProtein}%). ${best ? `Najtańsza korekta: +${Math.min(10, Math.ceil(-dP / num(best.proteinPct) * 100))}% ${best.name}.` : "Zwiększ udział surowca białkowego."}` });
    } else if (dP > 2.5) tips.push({ type: "warn", text: `${input.genetics}: białko ${p.protein.toFixed(1)}% powyżej potrzeb fazy (${targetProtein}%) — nadmiar przepala budżet i obciąża metabolizm; możesz odjąć surowca białkowego.` });
    else tips.push({ type: "ok", text: `${input.genetics}: białko ${p.protein.toFixed(1)}% w celu fazy (${targetProtein}%).` });

    if (dE < -100) tips.push({ type: "warn", text: `${input.genetics}: energia ${p.energy.toFixed(0)} kcal poniżej celu (${targetEnergy}) — dodaj tłuszcz/olej (+1 p.p. tłuszczu ≈ +85 kcal) lub kukurydzę.` });
    else tips.push({ type: "ok", text: `${input.genetics}: energia ${p.energy.toFixed(0)} kcal OK (cel ${targetEnergy}).` });

    if (dL < -0.08) {
      const lys = ings.find((i) => num(i.lysinePct) > 10);
      tips.push({ type: "error", text: `${input.genetics}: lizyna ${p.lysine.toFixed(2)}% poniżej celu (${targetLysine}%). ${lys ? `Dodaj ~${((-dL) / num(lys.lysinePct) * 100).toFixed(2)}% ${lys.name}.` : "Zwiększ udział śruty sojowej."}` });
    } else tips.push({ type: "ok", text: `${input.genetics}: lizyna ${p.lysine.toFixed(2)}% OK (cel ${targetLysine}%).` });

    if (p.fiber > targetFiber + 0.8) tips.push({ type: "warn", text: `${input.genetics}: włókno ${p.fiber.toFixed(1)}% przekracza benchmark (${targetFiber.toFixed(1)}%); rozważ ksylanazę lub ogranicz otręby/DDGS.` });
    if (p.moisture > 14.5) tips.push({ type: "warn", text: `Wilgotność mieszanki ${p.moisture.toFixed(1)}% — powyżej 14.5% rośnie ryzyko pleśni i mikotoksyn w silosie; skróć czas składowania.` });
    if (p.threonine > 0 && p.threonine < g.lysine * 0.45) tips.push({ type: "idea", text: `Treonina ${p.threonine.toFixed(2)}% — poniżej ~45% poziomu lizyny; drugi ograniczający aminokwas dla indyków, rozważ L-treoninę.` });
    if (p.sodium > 0.25) tips.push({ type: "warn", text: `Sód ${p.sodium.toFixed(2)}% — powyżej 0.25% rośnie pobór wody i mokra ściółka.` });
    if (p.calcium < 0.8 && gk !== "prestarter") tips.push({ type: "idea", text: `Wapń ${p.calcium.toFixed(2)}% — poniżej zalecanego 0.9–1.2% dla szkieletu; dodaj węglan wapnia.` });
    if (prod.metabolicRisk > 45) tips.push({ type: "error", text: `Ryzyko metaboliczne ${prod.metabolicRisk.toFixed(0)}% — za dużo tłuszczu/nadmiar białka dla tej fazy; odejmij tłuszcz lub przenieś recepturę do starszej fazy.` });
    if (p.costPerTon > 480) tips.push({ type: "idea", text: `Koszt ${p.costPerTon.toFixed(0)} EUR/t jest wysoki — sprawdź zakładkę „Porównanie A/B" z wariantem z optymalizatora.` });

    // braki strukturalne
    if (!items.some((i) => i.ing.name.toLowerCase().includes("premiks"))) tips.push({ type: "warn", text: "Brak premiksu witaminowo-mineralnego — w praktyce niezbędny 2.5–3%." });

    return {
      profile: p, production: prod, score: scoreMix(p, prod), tips,
      targets: { protein: g.protein, energy: g.energy, lysine: g.lysine },
      totalPercent: total, scoreLabel: prod.fcr <= 2.3 && prod.metabolicRisk < 30 ? "bardzo dobra" : prod.metabolicRisk > 45 ? "ryzykowna" : "poprawna",
    };
  }),

  /* Zapis własnej receptury z kreatora */
  createRecipe: authedQuery
    .input(z.object({
      name: z.string().min(3).max(120),
      ageGroup: z.string().max(64),
      items: z.array(z.object({ ingredientId: z.number(), percent: z.number().min(0).max(100) })).min(1),
      note: z.string().max(500).optional(),
      /* Tom III — metadane receptury */
      author: z.string().max(128).default("kreator"),
      sex: z.enum(["toms", "hens", "mixed"]).default("mixed"),
      season: z.enum(["winter", "summer", "all"]).default("all"),
      genetics: z.string().max(128).optional(),
      status: z.enum(["draft", "active", "archived"]).default("active"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const companyId = requireTenantCompany(ctx.user!);
      const items = await loadIngredients(db, input.items, companyId);
      const total = items.reduce((a, i) => a + i.percent, 0);
      if (total < 95 || total > 105) throw new Error(`Suma udziałów ${total.toFixed(1)}% — przed zapisem zbilansuj do ok. 100%`);
      const p = profileOf(items);
      const prod = productionFromProfile(p, input.ageGroup);
      const explanation = `Receptura autorska. ${explainMix(items, p, prod, input.ageGroup)}${input.note ? ` Notatka twórcy: ${input.note}` : ""}`;
      const [{ id }] = await db.insert(s.recipes).values({
        companyId,
        name: input.name, ageGroup: input.ageGroup, strategy: "balanced",
        costPerTon: p.costPerTon.toFixed(2), proteinPct: p.protein.toFixed(2),
        energyKcal: Math.round(p.energy), lysinePct: p.lysine.toFixed(3), explanation,
        author: input.author, sex: input.sex, season: input.season,
        genetics: input.genetics ?? null, status: input.status,
      }).returning({ id: s.recipes.id });
      for (const m of items) {
        await db.insert(s.recipeItems).values({ recipeId: id, ingredientId: m.ing.id, percent: m.percent.toFixed(2) });
      }
      // wpis do historii zmian (audyt receptur)
      await db.insert(s.recipeHistory).values({
        recipeId: id, changeNote: `Utworzono recepturę autorską „${input.name}" (${items.length} surowców)`,
        expertReport: `Ocena ${scoreMix(p, prod)}/100, FCR ${prod.fcr.toFixed(2)}, koszt ${p.costPerTon.toFixed(0)} EUR/t`, author: "kreator",
      });
      return { id, score: scoreMix(p, prod), costPerTon: p.costPerTon, explanation };
    }),

  /* Usunięcie własnej receptury */
  deleteRecipe: adminQuery.input(z.object({ recipeId: z.number() })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const companyId = requireTenantCompany(ctx.user!);
    const [recipe] = await db.select().from(s.recipes).where(eq(s.recipes.id, input.recipeId));
    if (!recipe || recipe.companyId !== companyId) return { ok: false };
    await db.delete(s.recipeItems).where(eq(s.recipeItems.recipeId, input.recipeId));
    await db.delete(s.recipes).where(eq(s.recipes.id, input.recipeId));
    return { ok: true };
  }),

  /* EXPORT — receptury, surowce i programy żywienia jako JSON */
  exportData: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const companyId = requireTenantCompany(ctx.user!);
    const [recs, ritems, ings, programs, stages] = await Promise.all([
      db.select().from(s.recipes).where(eq(s.recipes.companyId, companyId)), db.select().from(s.recipeItems),
      db.select().from(s.feedIngredients).where(eq(s.feedIngredients.companyId, companyId)),
      db.select().from(s.feedPrograms).where(eq(s.feedPrograms.companyId, companyId)), db.select().from(s.feedProgramStages),
    ]);
    return {
      format: "bloody-turkey-feed-v1",
      exportedAt: new Date().toISOString(),
      recipes: recs.map((r) => ({ ...r, items: ritems.filter((i) => i.recipeId === r.id).map((i) => ({ ingredientId: i.ingredientId, percent: num(i.percent) })) })),
      ingredients: ings,
      feedPrograms: programs.map((p) => ({ ...p, stages: stages.filter((st) => st.programId === p.id) })),
    };
  }),

  /* IMPORT — wczytuje receptury i/lub surowce z pliku JSON; dopasowuje surowce po nazwie */
  importData: adminQuery
    .input(z.object({
      data: z.object({
        format: z.string(),
        recipes: z.array(z.any()).optional(),
        ingredients: z.array(z.any()).optional(),
      }).passthrough(),
      mode: z.enum(["merge", "replace"]).default("merge"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const companyId = requireTenantCompany(ctx.user!);
      const d = input.data;
      const report = { ingredientsAdded: 0, recipesAdded: 0, recipesSkipped: 0, errors: [] as string[] };

      if (!String(d.format).startsWith("bloody-turkey-feed")) throw new Error("Nieprawidłowy format pliku — oczekiwano eksportu Bloody Turkey (format bloody-turkey-feed-v1)");

      // surowce
      const existing = await db.select().from(s.feedIngredients).where(eq(s.feedIngredients.companyId, companyId));
      const byName = new Map(existing.map((i) => [i.name.toLowerCase(), i]));
      if (d.ingredients) {
        for (const ing of d.ingredients) {
          try {
            const key = String(ing.name ?? "").toLowerCase();
            if (!key || byName.has(key)) continue;
            const [{ id }] = await db.insert(s.feedIngredients).values({
              companyId,
              name: String(ing.name), countryCode: ing.countryCode ?? "PL",
              proteinPct: String(ing.proteinPct ?? 0), energyKcal: Number(ing.energyKcal ?? 0),
              lysinePct: String(ing.lysinePct ?? 0), methioninePct: String(ing.methioninePct ?? 0),
              fiberPct: String(ing.fiberPct ?? 0), fatPct: String(ing.fatPct ?? 0),
              calciumPct: String(ing.calciumPct ?? 0), phosphorusPct: String(ing.phosphorusPct ?? 0),
              pricePerTon: String(ing.pricePerTon ?? 0), stockTons: String(ing.stockTons ?? 0),
            }).returning({ id: s.recipeItems.id });
            byName.set(key, { ...ing, id } as any);
            report.ingredientsAdded++;
          } catch (e: any) { report.errors.push(`Surowiec „${ing?.name}": ${e.message.slice(0, 80)}`); }
        }
      }

      // receptury (dopasowanie surowców po nazwie lub id)
      if (d.recipes) {
        const existingRecs = await db.select().from(s.recipes).where(eq(s.recipes.companyId, companyId));
        const recNames = new Set(existingRecs.map((r) => r.name.toLowerCase()));
        if (input.mode === "replace") {
          const recipeIds = existingRecs.map((recipe) => recipe.id);
          for (const recipeId of recipeIds) await db.delete(s.recipeItems).where(eq(s.recipeItems.recipeId, recipeId));
          await db.delete(s.recipes).where(eq(s.recipes.companyId, companyId));
          recNames.clear();
        }
        const oldIdToIng = new Map((d.ingredients ?? []).map((i: any) => [Number(i.id), i]));
        for (const r of d.recipes) {
          try {
            const name = String(r.name ?? "Importowana").slice(0, 120);
            if (input.mode === "merge" && recNames.has(name.toLowerCase())) { report.recipesSkipped++; continue; }
            const [{ id }] = await db.insert(s.recipes).values({
              companyId,
              name, ageGroup: String(r.ageGroup ?? "własna").slice(0, 64),
              strategy: ["cheapest", "maxGrowth", "balanced"].includes(r.strategy) ? r.strategy : "balanced",
              costPerTon: String(r.costPerTon ?? 0), proteinPct: String(r.proteinPct ?? 0),
              energyKcal: Number(r.energyKcal ?? 0), lysinePct: String(r.lysinePct ?? 0),
              explanation: r.explanation ? String(r.explanation).slice(0, 2000) : "Receptura importowana.",
            }).returning({ id: s.recipes.id });
            let added = 0;
            for (const it of r.items ?? []) {
              const src = oldIdToIng.get(Number(it.ingredientId));
              const target = src ? byName.get(String(src.name).toLowerCase()) : byName.get(String(it.name ?? "").toLowerCase());
              if (target && Number(it.percent) > 0) {
                await db.insert(s.recipeItems).values({ recipeId: id, ingredientId: target.id, percent: String(it.percent) });
                added++;
              }
            }
            if (added === 0) { await db.delete(s.recipes).where(eq(s.recipes.id, id)); report.errors.push(`Receptura „${name}": brak pasujących surowców — pominięto`); continue; }
            await db.insert(s.recipeHistory).values({ recipeId: id, changeNote: `Zaimportowano recepturę „${name}"`, author: "import" });
            recNames.add(name.toLowerCase());
            report.recipesAdded++;
          } catch (e: any) { report.errors.push(`Receptura „${r?.name}": ${e.message.slice(0, 80)}`); }
        }
      }
      return report;
    }),
});
