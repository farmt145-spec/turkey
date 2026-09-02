# FEED INTELLIGENCE — INTEGRACJA (podetap FEED/NUTRITION)

Źródła: BTE_DUAL_AUDIT, BTE_FUNCTION_MATRIX, BTE_MODULE_MATRIX (werdykt FEED: FOUNDATION logika + KIMI UI/model).
Wykonano bez pełnej instalacji node_modules — praca statyczna, walidacja runtime odroczona.

## Co zintegrowano (FOUNDATION feed-module → KIMI)

| Funkcja FOUNDATION | Status | Realizacja |
|---|---|---|
| OptimizationService (cost/fcr/adg/health/balanced) | ✅ ZINTEGROWANE | `services/feed-intelligence.service.ts::optimizeRecipe` (algorytm 1:1, typy na KIMI) |
| KnowledgeService (search + commonMistakes) | ✅ ZINTEGROWANE | `searchKnowledge`, `addKnowledgeEntry` + tabela `knowledge_entries` |
| ExperimentService (scenariusze A/B) | ✅ ZINTEGROWANE | `runExperiment`, `getExperiment` + tabela `experiment_scenarios` |
| ForecastService (prognoza stada) | ✅ ZINTEGROWANE | `forecastBatch` (model wzrostu Gompertza) + tabela `batch_forecasts` |
| AlertService (create/list/acknowledge/scan) | ✅ ZINTEGROWANE | `createFeedAlert`, `listFeedAlerts`, `acknowledgeFeedAlert`, `scanStockAlerts` + tabela `feed_alerts` |
| NutritionalStandard | ✅ MODEL | tabela `nutritional_standards` (seed/UI — kolejny podetap) |
| MaterialBatch / Substitution / Interaction | ✅ MODEL | tabele `material_batches`, `material_substitutions`, `material_interactions` (serwisy — kolejny podetap) |
| ExpertService (explain-why, karty surowców, profile) | 🟡 CZĘŚCIOWO | KIMI ma `nutrition.expertReport`/`assist` (reguły); pełny port — kolejny podetap |
| RecipeComparison | 🟡 MODEL | KIMI ma `recipe_history`; porównania A/B — kolejny podetap |

## Co zachowano z KIMI (bez zmian funkcjonalnych)
- `nutrition.simulate`, `nutrition.assist`, `nutrition.expertReport`, `nutrition.exportData/importData`
- `farm.ingredients`, `farm.recipes`, `feedProgram.programs`, `gap.recipeHistory/forecastAccuracy`
- Cała strona NutritionLab (kalkulator suwaków + symulacja rzutu) — rozszerzona, nie nadpisana
- Tabele: recipes, recipe_items, feed_ingredients, feed_programs(+stages), feed_usages, feed_deliveries, recipe_history, forecast_accuracy

## Artefakty
1. `db/schema.ts` — +8 tabel (ADDITIVE, 0 zmian w istniejących), konwencja KIMI (serial PK, mysqlEnum, base, decimal)
2. `db/migrations/0005_feed_intelligence.sql` + wpis w `_journal.json` — **PRZYGOTOWANA, NIE WYKONANA**
3. `contracts/feed.ts` — Zod kontrakty domenowe (single source dla API)
4. `services/feed-intelligence.service.ts` — port logiki (czyste funkcje, Drizzle)
5. `api/feed-intel-router.ts` — 10 procedur tRPC; RBAC: authed + `alertsScan` admin
6. `api/router.ts` — podpięty `feedIntel`
7. `api/feed-intel.test.ts` — 10 testów (walidacja kontraktów + RBAC; nie wymagają DB)
8. `src/components/FeedIntelligence.tsx` + sekcja w `NutritionLab.tsx`

## Znane ograniczenia / dług techniczny
- Prognoza używa modelu heurystycznego (Gompertz) — FOUNDATION również używa modeli heurystycznych; parametry do kalibracji na danych realnych.
- `materialBatches`, `substitutions`, `interactions`: model bez serwisów/UI (świadomie — zakres „kontrakt+model" tego podetapu).
- Pola FOUNDATION `minInclusion/maxInclusion` (limity per surowiec) zmapowane na constraints wywołania — brak kolumn w `feed_ingredients` (decyzja: nie rozszerzać tabeli KIMI w tym podetapie).
