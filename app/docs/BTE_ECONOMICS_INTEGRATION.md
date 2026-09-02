# BTE HYBRID — INTEGRACJA MODUŁU ECONOMICS (FOUNDATION → KIMI)

Data: 2026-08-09 · Branch: phase-1 · Status: DONE (static) / RUNTIME PENDING

## Zakres

Port modułu FOUNDATION `economics` (NestJS/Prisma) do rdzenia KIMI. Zgodnie z audytem:
ECONOMICS = ERP KIMI (costs, sales, PnL, faktury, kontrahenci) + analityka FOUNDATION
(predykcja zysku, scenariusze, doradca AI, benchmarki). Istniejące funkcje KIMI bez
zmian — nowe tabele wyłącznie addytywne.

## 1. Baza danych (Drizzle, additive-only)

| Tabela | Port z FOUNDATION (Prisma) |
|---|---|
| scenario_results | ScenarioResult (parametry + wyniki "co jeśli") |
| economics_ai_advisors | AIAdvisor (rekomendacje kosztowe z uzasadnieniem) |
| executive_summaries | ExecutiveSummary (strengths/threats/topCosts/recommendations) |
| benchmark_entries | BenchmarkEntry (KPI per rzut + ranking) |

Migracja `db/migrations/0009_economics_intelligence.sql` + journal idx 9
— PRZYGOTOWANA, NIE WYKONANA.

Nieużywane modele FOUNDATION (celowe): DailyCost (KIMI: costs), FeedRecord
(KIMI: feed_usages), HealthRecord (moduł HEALTH), TransferRecord (KIMI: transfers),
SaleRecord (KIMI: sales), Contractor (KIMI: contractors w ERP), FinancialDashboard
cache (dashboard liczony na żywo).

## 2. Kontrakty — `contracts/economics.ts`

Zod: predictProfitInput (batchId + opcjonalne oczekiwania), profitPrediction +
decisionImpact, createScenarioInput (≥1 parametr, limity: FCR ±2, opóźnienie ±60 dni),
advisor action, saleAnalysis, summary (period daily/weekly/monthly/batch),
benchmark list/recalc.

## 3. Serwisy — `services/economics-intelligence.service.ts`

Porty 1:1 (progi i współczynniki zachowane):

- **predictProfit** — remainingDays=120−dni, dailyCost=total/dni, finalBirds,
  break-even, 4 wpływy decyzji (FCR −0.1 → +3% kosztu; opóźnienie 7 dni; tańsza
  receptura +2%; wcześniejsza sprzedaż 5 dni), confidence 0.85.
- **createScenario** — współczynniki 1:1: soja=25%×Δ%, FCR=feed×Δ/2.5,
  śmiertelność=utrata przychodu, opóźnienie=+50g/dzień×cena, gaz, receptura
  (ADAPT: recipes.costPerTon/1000 × feed_usages.kg). Zapis scenario_results.
- **generateAIRecommendations** — progi 1:1: pasza>65% (oszcz. 8%), energia>12% (7%),
  śmiertelność>4% (60% utraconego przychodu, CRITICAL), FCR>2.6 (6%, z ostatniej
  analizy production_analyses), robocizna>8% (10%), timing<14 dni i >10 kg (1.3%).
- **analyzeSale** — 1:1: optimalDays=105+(waga−10)×2, trend (≤80 rising / ≤100 stable
  / >100 falling), delayImpactPerDay, przychód ×1.1×12.8.
- **getFinancialDashboard** — agregacja costs/sales, rozkład kosztów 5 kategorii
  (ADAPT: energy=energy, vet=vet z costs KIMI), EBITDA, śr. cena.
- **generateExecutiveSummary** — strengths/threats/opportunities/topCosts/
  recommendations, zapis executive_summaries.
- **recalculateBenchmarks** — wpisy per rzut (FCR/ADG/EPEF z production_analyses,
  costPerKg z biomasy+sprzedaży), okres ISO-week, ranking po marży (farmRank).

ADAPTACJE danych: DailyCost per-dzień → agregacja `costs` KIMI po kategoriach
(feed/energy/vet/labor); waluta neutralna (EUR jak w KIMI); avgWeight z weighings.

## 4. API — `api/economics-intel-router.ts` (router `economicsIntel`)

12 procedur: predictProfit, scenarioCreate, scenarios, advisorsGenerate, advisors,
advisorAction, saleAnalysis, dashboard, summaryGenerate, latestSummary, benchmarks —
wszystkie authed; **benchmarkRecalc = adminQuery**. Zarejestrowany w appRouter.

## 5. Frontend

- `src/components/EconomicsIntelligence.tsx` (nowy): pulpit finansowy (przychód/
  koszty/EBITDA/cena + paski rozkładu), predykcja zysku (4 KPI + wpływ decyzji),
  optymalny termin sprzedaży, doradca AI (lista z priorytetami, oszczędnościami,
  oznaczaniem wdrożenia).
- `src/pages/Economics.tsx`: `<EconomicsIntelligence />` po nagłówku.
  Istniejące wykresy PnL (pie/bar/tabela) BEZ ZMIAN.

## 6. Testy — `api/economics-intel.test.ts`

5 testów kontraktów (minimalne wejście, ≥1 parametr scenariusza, limity, domyślny
period), 5 testów RBAC (UNAUTHORIZED; benchmarkRecalc FORBIDDEN dla user), regresja
rejestracji 5 routerów domenowych. Bez DB.

## 7. Zachowane funkcje KIMI

farm.economics.batchPnl (PnL per rzut), costs (8 kategorii + waluta), sales,
contractors, purchaseOrders, contracts, invoices, scenarios (proste JSON),
benchmarks (metryki), analytics (EPEF, forecast, compareBatches) — nietknięte.

## 8. Runtime validation: PENDING

node_modules niekompletne (npm ci/install → SIGTERM timeout środowiska).
Po pełnej instalacji: typecheck, vitest, build. Migracja 0009 nie wykonana.
