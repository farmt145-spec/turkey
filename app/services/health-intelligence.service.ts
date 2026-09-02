/**
 * Serwisy domenowe HEALTH INTELLIGENCE.
 * Port logiki z FOUNDATION health-intelligence-engine (NestJS/Prisma → czyste funkcje/Drizzle).
 * Źródła: risk-score.service.ts, ai-advisor.service.ts, vaccination/disease-library.
 * Mapowanie: Flock→batches, DailyMetric→health_daily_metrics, EnvironmentData→climate_logs.
 */
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import * as s from "../db/schema";
import type {
  AiAdvisorRequest,
  DiseasePrediction,
  DiseaseReferenceCreate,
  HealthRecordCreate,
  RiskScoreResult,
  VaccinationProgramCreate,
} from "../contracts/health";

const num = (v: unknown): number => Number(v ?? 0);

/* ============================================================
   1. PROGRAMY SZCZEPIEŃ (FOUNDATION: vaccination module)
   ============================================================ */

export async function createVaccinationProgram(input: VaccinationProgramCreate) {
  const db = getDb();
  const [{ id: programId }] = await db
    .insert(s.vaccinationPrograms)
    .values({
      name: input.name,
      geneticLine: input.geneticLine ?? null,
      description: input.description ?? null,
      isDefault: input.isDefault,
    } as never)
    .returning({ id: s.vaccinationPrograms.id });
  for (const step of input.steps) {
    await db.insert(s.vaccinationProgramSteps).values({ programId, ...step } as never);
  }
  return { id: programId, steps: input.steps.length };
}

export async function listVaccinationPrograms() {
  const db = getDb();
  const programs = await db
    .select()
    .from(s.vaccinationPrograms)
    .where(eq(s.vaccinationPrograms.status, "active"))
    .orderBy(desc(s.vaccinationPrograms.id));
  const steps = await db.select().from(s.vaccinationProgramSteps).where(eq(s.vaccinationProgramSteps.status, "active"));
  return programs.map((p) => ({
    ...p,
    steps: steps.filter((st) => st.programId === p.id).sort((a, b) => a.ageDays - b.ageDays),
  }));
}

/** Harmonogram szczepień dla stada: program dopasowany do linii genetycznej lub domyślny */
export async function vaccinationScheduleForBatch(batchId: number) {
  const db = getDb();
  const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, batchId));
  if (!batch) throw new Error(`Stado ${batchId} nie istnieje`);
  const programs = await db.select().from(s.vaccinationPrograms).where(eq(s.vaccinationPrograms.status, "active"));
  const program =
    programs.find((p) => p.geneticLine && p.geneticLine === batch.geneticLine) ??
    programs.find((p) => p.isDefault) ??
    null;
  if (!program) return { batch, program: null, schedule: [] as unknown[] };
  const steps = await db
    .select()
    .from(s.vaccinationProgramSteps)
    .where(eq(s.vaccinationProgramSteps.programId, program.id));
  const startDate = new Date(batch.startDate);
  const schedule = steps
    .sort((a, b) => a.ageDays - b.ageDays)
    .map((st) => ({
      ...st,
      plannedDate: new Date(startDate.getTime() + st.ageDays * 86400000).toISOString().slice(0, 10),
    }));
  return { batch, program, schedule };
}

/* ============================================================
   2. HEALTH RECORDS (FOUNDATION: health module)
   ============================================================ */

export async function createHealthRecord(input: HealthRecordCreate) {
  const db = getDb();
  const [{ id }] = await db
    .insert(s.healthRecords)
    .values({ ...input, cost: input.cost != null ? String(input.cost) : null } as never)
    .returning({ id: s.vaccinationProgramSteps.id });
  return { id };
}

export async function listHealthRecords(batchId: number) {
  const db = getDb();
  return db
    .select()
    .from(s.healthRecords)
    .where(and(eq(s.healthRecords.batchId, batchId), eq(s.healthRecords.status, "active")))
    .orderBy(desc(s.healthRecords.day));
}

/* ============================================================
   3. RISK SCORE (port RiskScoreService — wagi i progi 1:1)
   ============================================================ */

export async function calculateRiskScore(batchId: number): Promise<RiskScoreResult & { id: number }> {
  const db = getDb();
  const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, batchId));
  if (!batch) throw new Error(`Stado ${batchId} nie istnieje`);

  const metrics = await db
    .select()
    .from(s.healthDailyMetrics)
    .where(eq(s.healthDailyMetrics.batchId, batchId))
    .orderBy(desc(s.healthDailyMetrics.day))
    .limit(7);
  const latestMetric = metrics[0];

  const withdrawal = await db
    .select({ treatmentId: s.withdrawalPeriods.treatmentId })
    .from(s.withdrawalPeriods)
    .where(eq(s.withdrawalPeriods.batchId, batchId));
  const withdrawalIds = new Set(withdrawal.map((w) => w.treatmentId));
  const allTreatments = await db.select().from(s.treatments).where(eq(s.treatments.batchId, batchId));
  /* „aktywne" leczenie = bez zakończonej karencji (treatments nie ma endDate — aproksymacja 1:1 z FOUNDATION `endDate: null`) */
  const activeTreatments = allTreatments.filter((t) => !withdrawalIds.has(t.id));

  const recentHealthRecords = await db
    .select()
    .from(s.healthRecords)
    .where(eq(s.healthRecords.batchId, batchId))
    .orderBy(desc(s.healthRecords.day))
    .limit(5);

  /* healthScore — progi 1:1 z RiskScoreService */
  let healthScore = 100;
  if (latestMetric?.mortalityRate) healthScore -= num(latestMetric.mortalityRate) * 20;
  if (activeTreatments.length > 0) healthScore -= activeTreatments.length * 5;
  if (recentHealthRecords.length > 2) healthScore -= 10;
  healthScore = Math.max(0, Math.min(100, healthScore));

  /* productionScore */
  let productionScore = 100;
  if (latestMetric?.fcr && num(latestMetric.fcr) > 2.0) productionScore -= (num(latestMetric.fcr) - 2.0) * 20;
  if (latestMetric?.adgGrams && num(latestMetric.adgGrams) < 50) productionScore -= 15;
  productionScore = Math.max(0, Math.min(100, productionScore));

  /* welfareScore — EnvironmentData → climate_logs (NH₃/CO₂/temp, progi 1:1) */
  let welfareScore = 100;
  const [envData] = await db
    .select()
    .from(s.climateLogs)
    .where(eq(s.climateLogs.houseId, batch.houseId))
    .orderBy(desc(s.climateLogs.ts))
    .limit(1);
  if (envData) {
    const nh3 = num(envData.ammoniaPpm);
    const co2 = num(envData.co2Ppm);
    const temp = num(envData.tempC);
    if (nh3 > 20) welfareScore -= (nh3 - 20) * 2;
    if (co2 > 2500) welfareScore -= (co2 - 2500) / 100;
    if (temp > 27 || (temp > 0 && temp < 18)) welfareScore -= Math.abs(temp - 22) * 2;
  }
  welfareScore = Math.max(0, Math.min(100, welfareScore));

  const riskScore = Math.round((100 - healthScore) * 0.4 + (100 - productionScore) * 0.3 + (100 - welfareScore) * 0.3);
  const ageDays = Math.floor((Date.now() - new Date(batch.startDate).getTime()) / 86400000);

  const result: RiskScoreResult = {
    healthScore: Math.round(healthScore),
    productionScore: Math.round(productionScore),
    welfareScore: Math.round(welfareScore),
    riskScore,
    factors: {
      mortalityFactor: num(latestMetric?.mortalityRate),
      fcrFactor: num(latestMetric?.fcr),
      environmentFactor: envData ? num(envData.ammoniaPpm) + num(envData.co2Ppm) / 100 : 0,
      treatmentFactor: activeTreatments.length,
      ageFactor: ageDays,
    },
  };

  const [{ id }] = await db
    .insert(s.riskScores)
    .values({ batchId, ...result, factors: result.factors as never } as never)
    .returning({ id: s.riskScores.id });
  return { id, ...result };
}

/* ============================================================
   4. AI ADVISOR (port AIAdvisorService — regułowa inferencja 1:1)
   ============================================================ */

function parseSymptoms(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[,\n;]/).map((x) => x.trim()).filter(Boolean);
}

export async function analyzeHealth(input: AiAdvisorRequest, veterinarian?: string): Promise<DiseasePrediction[]> {
  const db = getDb();
  const [batch] = await db.select().from(s.batches).where(eq(s.batches.id, input.batchId));
  if (!batch) throw new Error(`Stado ${input.batchId} nie istnieje`);
  const diseases = await db.select().from(s.diseases).where(eq(s.diseases.status, "active"));
  const ageDays = input.ageDays ?? Math.floor((Date.now() - new Date(batch.startDate).getTime()) / 86400000);

  const predictions: DiseasePrediction[] = [];
  for (const disease of diseases) {
    const diseaseSymptoms = parseSymptoms(disease.symptoms);
    let score = 0;
    let maxScore = 0;

    const matches = input.symptoms.filter((sym) =>
      diseaseSymptoms.some((ds) => ds.toLowerCase().includes(sym.toLowerCase())),
    );
    score += matches.length * 25;
    maxScore += input.symptoms.length * 25;

    const name = disease.name;
    if (name.includes("Newcastle") && ageDays < 21) score += 15;
    if (name.toLowerCase().includes("kokcyd") && ageDays >= 14 && ageDays <= 28) score += 20;
    if (name.toLowerCase().includes("ascites") && ageDays > 35) score += 15;

    if (input.mortalityRate && input.mortalityRate > 0.5) score += 15;
    if (input.feedIntakeDropPct && input.feedIntakeDropPct > 20) score += 10;
    if (input.waterIntakeDropPct && input.waterIntakeDropPct > 20) score += 5;

    const probability = maxScore > 0 ? Math.min((score / maxScore) * 100, 95) : 0;
    if (probability > 20) {
      predictions.push({
        diseaseId: disease.id,
        diseaseName: name,
        probability: Math.round(probability * 10) / 10,
        possibleCauses: inferCauses(input),
        recommendedTests: recommendTests(name),
        immediateActions: immediateActions(name, input),
        productionImpact: "FCR +5%, ADG -3% (szacunek)",
        disclaimer:
          "REKOMENDACJA WSPOMAGAJĄCA — nie zastępuje oceny lekarza weterynarii. Wymagana weryfikacja kliniczna.",
      });
    }
  }
  const sorted = predictions.sort((a, b) => b.probability - a.probability).slice(0, 5);

  await db.insert(s.aiAdvisorLogs).values({
    batchId: input.batchId,
    symptoms: input.symptoms as never,
    inputData: input as never,
    recommendations: sorted as never,
    confidence: sorted[0] ? String(sorted[0].probability / 100) : null,
    veterinarian: veterinarian ?? null,
    disclaimerShown: true,
  } as never);

  return sorted;
}

function inferCauses(input: AiAdvisorRequest): string[] {
  const causes: string[] = [];
  if (input.mortalityRate && input.mortalityRate > 0.5) causes.push("Podwyższona śmiertelność");
  if (input.feedIntakeDropPct && input.feedIntakeDropPct > 20) causes.push("Spadek pobrania paszy");
  if (input.waterIntakeDropPct && input.waterIntakeDropPct > 20) causes.push("Spadek pobrania wody");
  if (causes.length === 0) causes.push("Czynnik patogenny");
  return causes;
}

function recommendTests(diseaseName: string): string[] {
  const tests = ["Badanie kliniczne stada"];
  const n = diseaseName.toLowerCase();
  if (n.includes("coli") || n.includes("baktery") || n.includes("salmon")) tests.push("Posiew bakteriologiczny", "Antybiogram");
  if (n.includes("newcastle") || n.includes("gryp") || n.includes("wirus")) tests.push("PCR", "Serologia (ELISA)");
  if (n.includes("kokcyd") || n.includes("pasożyt")) tests.push("Badanie kału (flotacja)");
  return tests;
}

function immediateActions(diseaseName: string, input: AiAdvisorRequest): string[] {
  const actions = ["Izolacja podejrzanych osobników", "Wzmocnienie biosecurity hali"];
  if ((input.mortalityRate ?? 0) > 1) actions.unshift("Pilna konsultacja weterynaryjna");
  if ((input.feedIntakeDropPct ?? 0) > 20) actions.push("Kontrola jakości paszy i wody");
  if (diseaseName.toLowerCase().includes("kokcyd")) actions.push("Ocena podłoża (wilgotność)");
  return actions;
}

/* ============================================================
   5. DISEASE REFERENCES (FOUNDATION: disease-library)
   ============================================================ */

export async function addDiseaseReference(input: DiseaseReferenceCreate) {
  const db = getDb();
  const [{ id }] = await db.insert(s.diseaseReferences).values(input as never).returning({ id: s.aiAdvisorLogs.id });
  return { id };
}

export async function diseaseWithReferences(diseaseId: number) {
  const db = getDb();
  const [disease] = await db.select().from(s.diseases).where(eq(s.diseases.id, diseaseId));
  if (!disease) return null;
  const references = await db
    .select()
    .from(s.diseaseReferences)
    .where(and(eq(s.diseaseReferences.diseaseId, diseaseId), eq(s.diseaseReferences.status, "active")))
    .orderBy(desc(s.diseaseReferences.year));
  return { ...disease, references };
}
