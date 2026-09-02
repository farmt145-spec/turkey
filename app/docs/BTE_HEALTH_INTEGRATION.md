# BTE HYBRID — INTEGRACJA MODUŁU HEALTH (FOUNDATION → KIMI)

Data: 2026-08-09 · Branch: phase-1 · Status: DONE (static) / RUNTIME PENDING

## Zakres

Port modułu FOUNDATION `health-intelligence-engine` (NestJS/Prisma) do rdzenia KIMI
(Drizzle/MySQL + tRPC + React). Zasada: REUSE > ADAPT > EXTEND > CREATE. Żadna
istniejąca funkcja KIMI nie została usunięta ani zmieniona.

## 1. Baza danych (Drizzle, additive-only)

Nowe tabele w `db/schema.ts` (konwencja KIMI: serial PK, mysqlEnum, pola bazowe
status/createdAt/updatedAt/updatedBy):

| Tabela | Port z FOUNDATION (Prisma) |
|---|---|
| vaccination_programs | VaccinationProgram |
| vaccination_program_steps | VaccinationProgramStep |
| health_records | HealthRecord |
| health_record_files | HealthRecordFile |
| disease_references | DiseaseReference |
| risk_scores | RiskScore |
| ai_advisor_logs | AiAdvisorLog |
| health_daily_metrics | DailyMetric (port domenowy) |

Migracja `db/migrations/0006_health_intelligence.sql` + wpis w `meta/_journal.json`
— PRZYGOTOWANA, NIE WYKONANA (brak DATABASE_URL w środowisku).

## 2. Kontrakty — `contracts/health.ts`

Zod: administrationRoute, vaccinationStepCreate, vaccinationProgramCreate (steps ≥ 1),
healthRecordCreate (typy: vaccination/treatment/supplement/necropsy/inspection),
riskScoreResult (+factors), aiAdvisorRequest (symptoms ≥ 1), diseasePrediction,
diseaseReferenceCreate.

## 3. Serwisy — `services/health-intelligence.service.ts`

Porty 1:1 (progi i wagi zachowane z FOUNDATION):

- **VaccinationProgramService** → createVaccinationProgram / listVaccinationPrograms /
  vaccinationScheduleForBatch (dopasowanie geneticLine else isDefault; plannedDate =
  startDate + ageDays).
- **HealthRecordService** → createHealthRecord / listHealthRecords.
- **RiskScoreService** → calculateRiskScore(batchId):
  health = 100 − mortality×20 − activeTreatments×5 − (>2 records ? 10);
  production = 100 − (fcr>2.0 nadwyżka×20) − (adg<50 ? 15);
  welfare z ostatniego wpisu climate_logs kurnika rzutu (NH3>20 → −(nh3−20)×2;
  CO2>2500 → −(co2−2500)/100; temp poza 18–27 → −|t−22|×2);
  riskScore = round((100−health)×0.4 + (100−prod)×0.3 + (100−welfare)×0.3).
  ADAPTACJA: KIMI treatments nie ma endDate — "aktywne leczenie" = zabieg bez wpisu
  w withdrawal_periods. Zapis do risk_scores.
- **AIAdvisorService** → analyzeHealth(input, veterinarian): wnioskowanie regułowe 1:1
  (dopasowanie objawów ×25/maxScore; Newcastle <21 dni +15; kokcydioza 14–28 dni +20;
  ascites >35 dni +15; mortalność >0.5 +15; spadek pobrania paszy >20% +10; wody >20% +5;
  probability = min(score/maxScore×100, 95); próg >20; top 5). Zapis ai_advisor_logs.
  Disclaimer: "REKOMENDACJA WSPOMAGAJĄCA — nie zastępuje oceny lekarza weterynarii…".
- **DiseaseReferenceService** → addDiseaseReference / diseaseWithReferences.

## 4. API — `api/health-intel-router.ts` (router `healthIntel`)

9 procedur: vaccinationPrograms, vaccinationProgramCreate, vaccinationSchedule,
records, recordCreate, riskScore (mutacja), analyze (adminQuery), diseaseDetail,
diseaseReferenceAdd. Wszystkie authedQuery poza analyze (adminOnly).

FIX: przy okazji przywrócono wpis `feedIntel: feedIntelRouter` w appRouter
(zagubiony w commicie cb93151) + test regresyjny.

## 5. Frontend

- `src/components/HealthIntelligence.tsx` (nowy): lista programów szczepień z krokami,
  harmonogram szczepień dla rzutu (input ID), kalkulator ryzyka (4 karty wyników
  + czynniki), motyw zinc-dark, ikony lucide.
- `src/pages/Health.tsx`: dodano `<HealthIntelligence />` przed `<LibraryAndWithdrawals />`.
  Istniejące sekcje (karencje, historia leczenia, nadchodzące szczepienia, biblioteka
  chorób gap.healthIntel) BEZ ZMIAN.

## 6. Testy — `api/health-intel.test.ts`

Walidacja kontraktów (poprawne/błędne payloady), RBAC (analyze → FORBIDDEN dla
user, UNAUTHORIZED bez sesji), rejestracja routerów feedIntel+healthIntel w appRouter.
Testy statyczne — bez DB.

## 7. Zachowane funkcje KIMI

treatments/karencje, vaccinations (CRUD + markDone), gap.healthIntel (diseases,
withdrawals), koszty weterynaryjne w economice, climate_logs, wszystkie 60+
istniejących tabel — nietknięte.

## 8. Runtime validation: PENDING

node_modules niekompletne (mount ~timeout SIGTERM przy npm ci/install).
Do wykonania po pełnej instalacji: typecheck, vitest, build.
