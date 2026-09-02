# BTE HYBRID — INTEGRACJA MODUŁU WAREHOUSE (FOUNDATION → KIMI)

Data: 2026-08-09 · Branch: phase-1 · Status: DONE (static) / RUNTIME PENDING

## Zakres

Port modułu FOUNDATION `warehouse` (NestJS/Prisma) do rdzenia KIMI.
Zgodnie z audytem: WAREHOUSE = pełny FOUNDATION + silosy KIMI. Istniejące funkcje
KIMI (warehouses, silosy, warehouse_lots + FEFO w gap.lots, stock_movements,
org.warehouseOverview, dostawcy) bez zmian — nowe tabele wyłącznie addytywne.

## 1. Baza danych (Drizzle, additive-only)

| Tabela | Port z FOUNDATION (Prisma) |
|---|---|
| warehouse_products | Product (katalog + parametry zapasu + pola wiedzy AI) |
| warehouse_lot_details | Lot extra (jakość, mykotoksyny, kwarantanna, koszty) — rozszerzenie 1:1 warehouse_lots |
| warehouse_stock_items | StockItem (snapshot stanu per produkt×magazyn) |
| warehouse_movements | StockMovement (7 typów × 24 podtypy, dokumenty PZ/RW/WZ) |
| warehouse_ai_analyses | WarehouseAIAnalysis (prognoza braku, rekomendacja zamówienia) |
| warehouse_alerts | WarehouseAlert (6 typów, severity info/warning/critical/emergency) |

Migracja `db/migrations/0008_warehouse_intelligence.sql` + journal idx 8
— PRZYGOTOWANA, NIE WYKONANA.

Nieużywane modele FOUNDATION (celowe): Organization/House/Zone/Rack/Location
(KIMI: companies/farms/houses/sectors/warehouses/silos), Transfer (KIMI ma własny
moduł transferów), ProductAIInsight (wiedza AI zintegrowana w kolumnach produktu),
Recipe (KIMI recipes/recipe_items).

## 2. Kontrakty — `contracts/warehouse.ts`

Zod: productCategory (19), movementType (7), movementSubtype (24), productCreate,
lotDetailsUpsert, quarantineSet, movementCreate (+refine: przyjęcie wymaga celu,
wydanie źródła), movementList, aiAnalysisInput, alertCreate/list/resolve,
reserveForRecipeInput, findSubstitutesInput, lotTraceabilityInput.

## 3. Serwisy — `services/warehouse-intelligence.service.ts`

Porty 1:1 (progi zachowane):
- **createStockMovement** — walidacja partii (stan, kwarantanna), totalValue,
  update warehouse_lots.qty + snapshot stock_items (transakcja).
- **generateAIAnalysis** — zużycie 90 dni, avgDailyConsumption = total/90,
  daysOfSupply, stockoutRisk 0.8/0.4/0.1 wg leadTimeDays, expiryRisk (partie <30 dni),
  rotationScore, predictedStockoutDate, recommendedOrderQty =
  reorderPoint+safetyStock−stan, recommendedOrderDate, bestSupplier.
  ADAPT: Lot→warehouse_lots (product po nazwie); qualityScore→suppliers.rating.
- **runAlertScan** — 1:1: low stock (CRITICAL ≤ safetyStock), ważność ≤30 dni
  (CRITICAL ≤7), brak paszy (EMERGENCY przy 0) + dedup aktywnych alertów.
- **getDashboard** — liczniki, wartość zapasów, lowStock, top-5 zużycia (90 dni).
- **reserveForRecipe** — FEFO po warehouse_lots (expiryDate asc, pomija kwarantannę),
  pozycje KIMI recipe_items.percent; błąd przy niedoborze (1:1 komunikat).
- **findSubstitutes** — produkty tej samej kategorii z dostępnym stanem ≥ wymaganej.
- **lotTraceability** — ruchy + zużycie wg rzutów + finalDestination (1:1 progi 95%).
- upsertLotDetails / setQuarantine (auto-alert), listProducts/listMovements/getInventory.

## 4. API — `api/warehouse-intel-router.ts` (router `warehouseIntel`)

15 procedur: products, productCreate, inventory, movements, movementCreate,
lotDetailsUpsert, quarantineSet, aiAnalysis, latestAnalysis, alerts, alertCreate,
alertResolve, **alertScan = adminQuery**, dashboard, reserveRecipe, substitutes,
lotTraceability. Zarejestrowany w appRouter.

## 5. Frontend

- `src/components/WarehouseIntelligence.tsx` (nowy): KPI dashboard (produkty, partie,
  wartość, poniżej progu, alerty), top zużycie 90 dni, katalog produktów ze statusem
  progu + analiza AI per produkt (dni zapasu, ryzyka, rekomendacja zamówienia,
  najlepszy dostawca), lista alertów z rozwiązywaniem, przycisk skanu (admin).
- `src/pages/Warehouse.tsx`: `<WarehouseIntelligence />` przed `LotsSection`.
  Istniejące sekcje (silosy, magazyny, LotsSection z gap.lots) BEZ ZMIAN.

## 6. Testy — `api/warehouse-intel.test.ts`

6 testów kontraktów (domyślne wartości, refine cel/źródło, dodatnie ilości),
5 testów RBAC (UNAUTHORIZED; alertScan FORBIDDEN dla user), regresja rejestracji
4 routerów domenowych. Bez DB.

## 7. Zachowane funkcje KIMI

org.warehouseOverview (silosy+magazyny), gap.lots (partie, FEFO wydanie,
traceability, scanAlerts ważności), feedProgram.delivery/refillSilo (wydania z
silosów), stock_movements (prosty dziennik), suppliers, purchase_orders — nietknięte.

## 8. Runtime validation: PENDING

node_modules niekompletne (npm ci/install → SIGTERM timeout środowiska).
Po pełnej instalacji: typecheck, vitest, build. Migracja 0008 nie wykonana.
