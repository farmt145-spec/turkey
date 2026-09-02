# BTE HYBRID — INTEGRACJA MODUŁU PRODUCTION (FOUNDATION → KIMI)

Data: 2026-08-09 · Branch: phase-1 · Status: DONE (static) / RUNTIME PENDING

## Zakres

Port modułu FOUNDATION `production-engine` (NestJS/Prisma) do rdzenia KIMI
(Drizzle/MySQL + tRPC + React). Zgodnie z planem audytu: PRODUCTION = KIMI (stada,
ważenia, dziennik, KPI) + AIAnalysis/AIForecast z FOUNDATION. Zasada REUSE > ADAPT >
EXTEND > CREATE — żadna istniejąca funkcja KIMI nie została usunięta ani zmieniona.

## 1. Baza danych (Drizzle, additive-only)

| Tabela | Port z FOUNDATION (Prisma) |
|---|---|
| production_analyses | AIAnalysis (score dnia, ryzyko, problemy, rekomendacje, prognoza 7-dni) |
| production_forecasts | AIForecast (prognoza końca rzutu + ekonomia) |
| production_alerts | Alert (alerty AI HIGH/CRITICAL) |
| production_events | ProductionEvent (oś czasu rzutu) |

Migracja `db/migrations/0007_production_intelligence.sql` + wpis journal idx 7
— PRZYGOTOWANA, NIE WYKONANA.

Nieużywane modele FOUNDATION (celowe): Nursery (KIMI: houses/sectors wystarczają),
Photo/Video/Document (KIMI: documents), Vaccination/Treatment (KIMI ma własne),
DemoState (poza zakresem hybrydy).

## 2. Kontrakty — `contracts/production.ts`

Zod: riskLevel, productionAlertType, productionEventType, analyzeDayInput (data
YYYY-MM-DD + opcjonalny override CO2), dayAnalysisResult, detectedIssue, forecast7Day,
batchEndForecastInput (domyślne ceny 1.8/6.5 PLN), batchEndForecast, alert list/resolve,
productionEventCreate, splitBatch (≥1 cel), mergeBatches (≥2 źródła).

## 3. Serwisy — `services/production-intelligence.service.ts`

Porty 1:1 (progi, wagi, standardy BUT Big 6 zachowane):

- **AIEngineService.analyzeDay** → `analyzeDay`: FCR/ADG/EPEF, scoring środowiska
  (temp/wilgotność/CO2/NH3/woda/pasza), detekcja 11 typów problemów, przyczyny,
  rekomendacje, dayScore (env 0.25 + pobranie 0.25 + wydajność 0.3 + śmiertelność 0.2),
  riskLevel (CRITICAL>0 lub <30 → critical…), prognoza 7-dni (ADG×0.95, mortalność
  0.03%/dzień). Zapis production_analyses + auto-alerty HIGH/CRITICAL.
- **AIEngineService.forecastBatchEnd** → `forecastBatchEnd`: trend masy z ostatnich
  14 ważeń ×0.9, FCR +0.015/dzień (cap 5.0), EPEF na 140 dni, ekonomia (pasza/pisklęta/
  inne 0.15/dzień), trafność 60+completeness×30 (cap 95). Zapis production_forecasts.
- **BatchService.splitBatch/mergeBatches** → `splitBatch`/`mergeBatches` (transakcje,
  kody -S1/-S2 / MERGED-ts, zdarzenia production_events).
  ADAPT: KIMI batches.status nie ma TRANSFERRED → pełny transfer = "closed".
- **BatchService.getTimeline** → `batchTimeline` (zdarzenia + dziennik + ważenia +
  szczepienia + zabiegi + transfery + alerty, sortowane).
- **BatchService.getTraceability** → `traceability` (łańcuch RECEIPT→HOUSE→…→DAILY).
- alerty: listAlerts / resolveAlert; zdarzenia: logEvent.

ADAPTACJE danych: daily_logs KIMI nie trzyma CO2 ani masy → CO2 z climate_logs
kurnika (ten dzień, fallback ostatni) lub z inputu; masa z ostatniego ważenia ≤ dnia;
masa początkowa = najwcześniejsze ważenie, fallback 60 g (norma dzień 1).

## 4. API — `api/production-intel-router.ts` (router `productionIntel`)

11 procedur: analyzeDay, analyses, forecastEnd, latestForecast, alerts, alertResolve,
eventCreate, timeline, traceability — wszystkie authedQuery;
**split / merge = adminQuery** (operacje destrukcyjne). Router zarejestrowany w appRouter.

## 5. Frontend

- `src/components/ProductionIntelligence.tsx` (nowy): analiza AI dnia (wybór daty +
  opcjonalny CO2), karty ryzyka/oceny/FCR/ADG/EPEF, 6 mini-score'ów środowiskowych,
  lista problemów i rekomendacji, prognoza końca rzutu (masa/FCR/EPEF/zysk/marża/
  trafność), aktywne alerty z przyciskiem rozwiązania.
- `src/pages/BatchDetail.tsx`: dodano `<ProductionIntelligence batchId>` po sekcji
  dziennika. Istniejące sekcje (KPI, wykresy, ważenia, szczepienia, leczenie,
  DailyLogSection) BEZ ZMIAN.

## 6. Testy — `api/production-intel.test.ts`

Walidacja kontraktów (5 testów), RBAC (5 testów: UNAUTHORIZED bez sesji,
FORBIDDEN split/merge dla user), regresja rejestracji productionIntel obok
feedIntel/healthIntel. Bez DB.

## 7. Zachowane funkcje KIMI

daily.upsert/stats/logs (dziennik + Calculation Engine), farm.production.batches/
batchDetail (KPI centralne: FCR/EPEF/kg-m²), addWeighing, regenerateSelects,
mortalities, feed_usages, transfery (transfer-router + Transfers), harmonogram
(schedule_events) — wszystko nietknięte.

## 8. Runtime validation: PENDING

node_modules niekompletne (npm ci/install → SIGTERM timeout środowiska).
Po pełnej instalacji: typecheck, vitest, build. Migracja 0007 nie wykonana.
