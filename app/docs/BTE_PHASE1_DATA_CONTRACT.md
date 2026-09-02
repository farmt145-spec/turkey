# BTE PHASE 1 — DATA CONTRACT + SECURITY FOUNDATION

Źródła: BTE_DUAL_AUDIT.md, BTE_DATABASE_COMPARISON.md, BTE_DUPLICATE_REGISTER.md, BTE_TARGET_ARCHITECTURE.md.
Zakres: wyłącznie przygotowanie kontraktu danych + fundament bezpieczeństwa. **Migracje NIE zostały wykonane.**

---

## 1. MAPOWANIE MODELU: FOUNDATION (Prisma) → KIMI (Drizzle)

Zasada: schemat KIMI (`db/schema.ts`, 60 tabel) jest kanoniczny. Tabele istniejące — mapowanie/rozszerzenie; tabele nowe — dodatek (sekcja 2). `?` = relacja do ustalenia w Phase 2.

| # | FOUNDATION (moduł: model) | KIMI Drizzle | Typ akcji |
|---|---|---|---|
| 1 | warehouse: Organization | `companies` | MAP 1:1 (rename pól) |
| 2 | iot: UserFarm | `users` + NOWA `user_farms` | MAP + ADD join table |
| 3 | iot: Building / Zone | `houses` / `sectors` | MAP 1:1 |
| 4 | health/economics/warehouse/production: House ×4 | `houses` | DEDUP → jedna tabela |
| 5 | production/economics/warehouse: Batch ×3 | `batches` | DEDUP → jedna tabela |
| 6 | production: Nursery | `hatchery_batches` | MAP |
| 7 | feed: Recipe, RecipeIngredient, RecipeHistory | `recipes`, `recipe_items`, `recipe_history` | MAP + EXTEND (pola optymalizacji) |
| 8 | warehouse: Recipe, RecipeIngredient (duplikat) | jw. | DEDUP (usunąć duplikat pojęcia) |
| 9 | feed: NutritionalStandard | `feed_ingredients` + NOWA `nutritional_standards` | EXTEND/ADD |
| 10 | feed: MaterialBatch / RawMaterialSubstitution / MaterialInteraction | NOWE `material_batches`, `material_substitutions`, `material_interactions` | ADD |
| 11 | feed: MaterialExpertProfile / MaterialKnowledgeEntry / ExpertDecisionLog / UserExpertProfile | NOWE `expert_profiles`, `knowledge_entries`, `expert_decision_log` | ADD |
| 12 | feed: ExperimentScenario / BatchForecast / ForecastAccuracy / RecipeComparison | NOWE `experiment_scenarios`, `batch_forecasts`; `forecast_accuracy` (KIMI istnieje — MAP); NOWA `recipe_comparisons` | ADD + MAP |
| 13 | feed: ProductionBatch / BatchRecipeAssignment / ProductionResult / FeedAlert / FeedInventory | NOWE `feed_production_batches`, `batch_recipe_assignments`, `feed_production_results`, `feed_alerts`, `feed_inventory` | ADD |
| 14 | feed/economics: Supplier / Contractor | `suppliers` (KIMI ERP) | DEDUP → MAP |
| 15 | health: HealthRecord + HealthImage + HealthDocument | NOWE `health_records`, `health_record_files` | ADD |
| 16 | health: Vaccination + VaccinationProgram + VaccinationStep | `vaccinations` (MAP) + NOWE `vaccination_programs`, `vaccination_program_steps` | MAP + ADD |
| 17 | health: Treatment / WithdrawalPeriod / Necropsy / LabResult / Disease(+Image/Reference) | `treatments`, `withdrawal_periods`, `necropsy`, `lab_results`, `diseases` (MAP wszystkie) + NOWA `disease_references` | MAP + ADD |
| 18 | health: DailyMetric / EnvironmentData / RiskScore / AIAdvisorLog | NOWE `health_daily_metrics`, `environment_data`, `risk_scores`, `ai_advisor_logs` | ADD |
| 19 | production: DailyLog / ProductionEvent / AIAnalysis / AIForecast / Alert / Photo / Video / Document | `daily_logs` (MAP); NOWE `production_events`, `ai_analyses`, `ai_forecasts`; Alert → wspólny `alerts` (patrz #26); multimedia → `documents` (EXTEND o `domain`, `mediaType`) | MAP + ADD + EXTEND |
| 20 | warehouse: Zone/Rack/Location/Product/ProductAIInsight | NOWE `warehouse_zones`, `warehouse_racks`, `warehouse_locations`, `products`, `product_ai_insights` | ADD |
| 21 | warehouse: Lot/LotItem/StockItem/StockMovement/TransferItem | `warehouse_lots` (MAP) + NOWE `lot_items`, `stock_items`; `stock_movements` (MAP+EXTEND); NOWA `stock_transfer_items` | MAP + ADD |
| 22 | warehouse: WarehouseAIAnalysis / WarehouseAlert | NOWE `warehouse_ai_analyses`; Alert → wspólny `alerts` | ADD |
| 23 | economics: DailyCost / FeedRecord / HealthRecord / TransferRecord / SaleRecord | NOWA `daily_costs`; FeedRecord→`feed_usages` (MAP); HealthRecord→#15; TransferRecord→`transfers` (MAP); `sales` (MAP) | ADD + MAP |
| 24 | economics: ScenarioResult / AIAdvisor / ExecutiveSummary / BenchmarkEntry / FinancialDashboard | NOWE `batch_scenarios`, `ai_advisors`, `executive_summaries`; `benchmarks` (MAP+EXTEND); FinancialDashboard → widok/materialized (NIE tabela) | ADD + MAP |
| 25 | iot: DeviceType/Device/Integration/Telemetry/ClimateData/FeedSilo | NOWE `device_types`, `devices`, `iot_integrations`; NOWA `telemetry`; `climate_logs` (MAP); FeedSilo→`silos` (EXTEND) | ADD + MAP + EXTEND |
| 26 | iot: Alarm/AlarmAcknowledgement + feed FeedAlert + production Alert | NOWA wspólna `alerts` + `alert_acknowledgements` (kolumna `source`: feed/warehouse/production/iot) | ADD (unifikacja DUP-18) |
| 27 | iot: Notification | `notifications` (MAP) | MAP |
| 28 | iot: AIPrediction/AIModel/MortalityRecord/FCRRecord/ADGRecord/MaintenanceRecord/DigitalTwinState | NOWE `ai_predictions`, `ai_models`, `digital_twin_states`; MortalityRecord→`mortalities` (MAP); NOWE `fcr_records`, `adg_records`; MaintenanceRecord→`maintenance_tickets` (MAP+EXTEND) | ADD + MAP |

### Konflikty nazw (D3) — rozstrzygnięcia do zastosowania w schemacie:
- `transfers` (stada, KIMI) → zostaje; zapasy (warehouse) → **`stock_transfer_items`** (#21). Docelowo rozważyć rename `transfers`→`flock_transfers` (Phase 2).
- `scenarios` (globalne what-if, KIMI) → zostaje; per-batch (economics) → **`batch_scenarios`** (#24).
- `integrations` (katalog, KIMI) → zostaje; konfiguracje IoT → **`iot_integrations`** (#25).

---

## 2. PROPOZYCJA ROZSZERZENIA SCHEMA DRIZZLE (NIE WDROŻONA)

Nowe tabele (28 pozycji ADD powyżej) — wszystkie w konwencji KIMI: `mysqlTable`, PK `serial("id")`, FK jako `bigint(..., { mode: "number", unsigned: true })` + **jawne `references()`** (naprawa luki FK z audytu), indeksy na kolumnach raportowych. Grupy:

1. **RBAC/org**: `user_farms(userId, farmId, roleOnFarm)`
2. **Feed intelligence**: `nutritional_standards`, `material_batches`, `material_substitutions`, `material_interactions`, `expert_profiles`, `knowledge_entries`, `expert_decision_log`, `experiment_scenarios`, `batch_forecasts`, `recipe_comparisons`, `feed_production_batches`, `batch_recipe_assignments`, `feed_production_results`, `feed_inventory`
3. **Health intelligence**: `health_records`, `health_record_files`, `vaccination_programs`, `vaccination_program_steps`, `disease_references`, `health_daily_metrics`, `environment_data`, `risk_scores`, `ai_advisor_logs`
4. **Production AI**: `production_events`, `ai_analyses`, `ai_forecasts`
5. **Warehouse**: `warehouse_zones`, `warehouse_racks`, `warehouse_locations`, `products`, `product_ai_insights`, `lot_items`, `stock_items`, `stock_transfer_items`, `warehouse_ai_analyses`
6. **Economics**: `daily_costs`, `batch_scenarios`, `ai_advisors`, `executive_summaries`
7. **IoT**: `device_types`, `devices`, `iot_integrations`, `telemetry`, `ai_predictions`, `ai_models`, `digital_twin_states`, `fcr_records`, `adg_records`
8. **Wspólne**: `alerts`, `alert_acknowledgements`

Rozszerzenia istniejących tabel (EXTEND): `silos`(+deviceId, telemetry refs), `documents`(+domain, mediaType), `maintenance_tickets`(+deviceId), `benchmarks`(+farmId, metric set), `recipes`(+optimization meta), `stock_movements`(+lotItemId, stockItemId), `companies`(+tier — licensing, Phase 2).

Szczegółowe DDL/kolumny per tabela — do wygenerowania w Phase 2 przy porcie każdego modułu (scope Phase 1 = wykaz + mapowanie).

---

## 3. PLAN MIGRACJI (PRZYGOTOWANY, NIE WYKONANY)

1. **M-0005 `rbac_and_contracts`**: `user_farms`, `alerts`+`alert_acknowledgements`, `companies.tier`, FK `references()` + indeksy na istniejących tabelach. Ryzyko: niskie (additive). Rollback: `drizzle-kit drop`.
2. **M-0006+ per domena (Phase 2)**: feed → warehouse → health → economics → production → iot; każda migracja niezależna, additive, z down-script.
3. Zasady: brak DROP/RENAME na tabelach KIMI w Phase 1–2; nowe kolumny nullable lub z default; każda migracja weryfikowana na czystej bazie MySQL 8 + seed demo.
4. Wykonanie: `drizzle-kit generate` (offline) → review SQL → `drizzle-kit migrate` na środowisku testowym — **nie w tej fazie**.

---

## 4. RBAC — WDROŻENIE W PHASE 1

### Zmiany w kodzie (wykonane)
- Wszystkie biznesowe procedury: `publicQuery` → **`authedQuery`** (9 routerów: analytics, command, daily, erp, farm, gap, nutrition, org, transfer).
- Operacje wrażliwe: → **`adminQuery`**: `transfer.exportAll`, `transfer.importAll`, `transfer.apiKeys`, `transfer.createApiKey`, `transfer.revokeApiKey`, `nutrition.importData`, `nutrition.deleteRecipe`, `gap.dynamicEntities.remove`.
- Bez zmian: `ping` (public), `auth.me`/`auth.logout` (authed), `middleware.ts` (mechanizmy już istniały — wykorzystane, nie przebudowane).

### Macierz ochrony (aktualna)
| Poziom | Zakres | Liczba procedur (szac.) |
|---|---|---|
| public | `ping` | 1 |
| authed | wszystkie odczyty + mutacje operacyjne domen | ~60 |
| admin | eksport/import masowy, klucze API, delete, EAV remove | 8 |

### Model ról docelowy (Phase 2+, zgodnie z BTE_TARGET_ARCHITECTURE)
`admin`, `manager`, `zootechnik`, `magazynier`, `weterynarz`, `viewer` + `user_farms.roleOnFarm` + `requirePermission("zasób:akcja")`. Phase 1 nie zmienia tabeli `users` — korzysta z istniejącego enuma `user`/`admin`.

### Pozostałe luki (świadomie odroczone — Phase 2)
- Role są płaskie (user/admin) — granulacja w Phase 2 (permissions).
- Tier/licensing enforcement (`requireTier`) — Phase 2 (po `companies.tier`).
- Frontend ukrywa akcje wg roli — Phase 2 (teraz: serwer odrzuca 401/403; UI pokaże błąd).
