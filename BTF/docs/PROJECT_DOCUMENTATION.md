# Dokumentacja projektu BloodyturkeyEnterprise-kopia

Data wygenerowania: 2026-08-06

## 1) Zakres i założenia

Dokument został wygenerowany na podstawie kodu źródłowego w głównym katalogu roboczym.
Aby uniknąć duplikatów, za źródło prawdy przyjęto katalogi najwyższego poziomu (bez mirrorów w katalogu BloodyturkeyEnterprise oraz bez katalogów build/output).

## 2) Drzewo katalogów (skrót)

.
- agents/
  - output/
- agents deisng/
  - output/
- agents enterprie/
  - output/
- agents1/
  - output/
- app-14/
  - src/
  - drag-and-drop/
  - upload/
- apps/
  - api/
  - web/
- bloody-turkey-feed-module/
  - frontend/
  - prisma/
  - src/
- bloody-turkey-iot/
  - apps/
    - api/
    - web/
  - docker/
- turkey-economics/
  - frontend/
  - src/
  - tests/
- turkey-health-intelligence-engine/
  - backend/
  - frontend/
- turkey-production-engine/
- turkey-warehouse/
  - docker/
  - frontend/
  - prisma/
  - src/
  - tests/
- zbuduj/
  - apps/
    - api/
    - web/
  - packages/
    - config/
    - database/
    - shared/
    - types/
    - ui/
  - outputs/
  - work/

## 3) Lista modułów

### 3.1 Moduły domenowe (top-level)

- apps/api (integracje między modułami)
- bloody-turkey-feed-module (żywienie, receptury, wiedza ekspercka, analityka feed)
- bloody-turkey-iot (IoT, telemetry, alarmy, dashboard, AI dla urządzeń)
- turkey-economics (koszty, predykcja zysku, scenariusze, benchmarki, dashboard finansowy)
- turkey-health-intelligence-engine (zdrowie, leczenie, szczepienia, AI advisor/detection, risk score)
- turkey-production-engine (produkcja: batch, daily-log, transfer)
- turkey-warehouse (magazyn, traceability, transfery, alerty, integracja recipe)
- zbuduj/apps/api (moduł enterprise API)
- zbuduj/apps/web (frontend enterprise)

### 3.2 Moduły wewnętrzne monorepo zbuduj

- @bloody-turkey/api
- @bloody-turkey/web
- @bloody-turkey/database
- @bloody-turkey/shared
- @bloody-turkey/types
- @bloody-turkey/ui

### 3.3 Moduły funkcjonalne w zbuduj/apps/api/src/modules

- entity
- feed
- health
- organization
- platform
- production

### 3.4 Moduły funkcjonalne w bloody-turkey-iot/apps/api/src/modules

- ai-engine
- alarms
- auth
- buildings
- dashboard
- device-types
- devices
- digital-twin
- farms
- integrations
- notifications
- reports
- telemetry
- users

### 3.5 Moduły funkcjonalne w turkey-health-intelligence-engine/backend/src/modules

- ai-advisor
- ai-detection
- audit
- auth
- dashboard
- disease-library
- health
- risk-score
- treatment
- vaccination
- withdrawal

## 4) Endpointy API

Uwaga: lista oparta o kontrolery NestJS odnalezione w głównej kopii repo.

### 4.1 apps/api (integration)

Base: /integrations
- POST /
- GET /

### 4.2 bloody-turkey-feed-module

Base: /feed
- POST /recipes
- GET /recipes
- GET /recipes/:id
- PUT /recipes/:id
- DELETE /recipes/:id
- POST /recipes/generate
- POST /recipes/simulate
- POST /expert/analyze-decision
- POST /expert/explain-why
- GET /expert/ingredient-card/:materialId
- POST /expert/profiles
- POST /experiments
- GET /experiments/:id
- POST /forecasts
- POST /forecasts/:id/analyze-accuracy
- POST /comparisons
- GET /knowledge/search
- GET /knowledge/material/:materialId
- POST /knowledge/entries
- GET /alerts
- POST /alerts/:id/acknowledge
- GET /dashboard
- POST /batches/:batchId/analyze
- GET /recipes/:id/economics

### 4.3 bloody-turkey-iot

Base: /auth
- POST /login

Base: /devices
- POST /
- GET /
- GET /:id
- GET /:id/telemetry
- POST /:id/telemetry
- PATCH /:id
- DELETE /:id
- POST /:id/calibrate
- POST /:id/command

Base: /dashboard
- GET /:farmId/overview
- GET /:farmId/map
- GET /:farmId/timeseries
- GET /:farmId/devices/status

Base: /alarms
- GET /:farmId
- POST /:alarmId/acknowledge
- POST /:alarmId/resolve
- GET /:farmId/stats

Base: /ai
- GET /predictions/:farmId
- GET /anomaly/:deviceId

### 4.4 turkey-economics

Base: /economics
- POST /costs
- GET /costs/:batchId
- POST /predict
- POST /scenarios
- GET /scenarios/:batchId
- POST /advisors/generate
- GET /advisors/:batchId
- GET /benchmarks
- POST /benchmarks/recalculate/:farmId
- POST /sales
- GET /sales/analysis/:batchId
- GET /dashboard
- POST /executive-summary

### 4.5 turkey-health-intelligence-engine

Base: /auth
- POST /login
- POST /register

Base: /health
- POST /
- GET /
- GET /:id
- PUT /:id
- DELETE /:id

Base: /treatments
- GET /
- POST /
- PATCH /:id
- DELETE /:id

Base: /vaccinations
- GET /
- POST /
- PATCH /:id

Base: /withdrawals
- GET /
- POST /calculate/:treatmentId

Base: /diseases
- GET /
- GET /:id
- POST /

Base: /risk-scores
- GET /:flockId/latest

Base: /ai-detection
- GET /alerts

Base: /ai-advisor
- POST /analyze

Base: /health/dashboard
- GET /

### 4.6 turkey-warehouse

Base: /warehouse
- POST /products
- GET /products
- GET /products/:id
- POST /lots
- GET /lots
- POST /lots/traceability
- POST /movements
- POST /transfers
- POST /transfers/execute
- GET /transfers
- GET /inventory
- GET /inventory/by-lot
- POST /ai/analyze/:productId
- GET /ai/substitutes/:productId
- POST /alerts
- POST /alerts/resolve
- GET /alerts
- POST /alerts/scan/:organizationId
- GET /dashboard/:organizationId
- POST /recipes/reserve

### 4.7 zbuduj/apps/api

Base: /v1/entities
- GET /:entity
- POST /:entity
- PATCH /:entity/:id
- DELETE /:entity/:id

Base: /v1/feed
- POST /programs
- GET /programs
- GET /programs/:id
- PUT /programs/:id
- PATCH /programs/:id/archive
- PATCH /programs/:id/restore
- POST /recipes
- GET /recipes
- GET /recipes/:id
- PUT /recipes/:id
- DELETE /recipes/:id
- POST /recipes/generate
- POST /ingredients
- GET /ingredients
- PUT /ingredients/:id

Base: /v1/health
- POST /
- GET /
- GET /:id
- PATCH /:id
- DELETE /:id

Base: /v1/organization
- POST /companies
- GET /companies
- GET /companies/:id
- PUT /companies/:id
- DELETE /companies/:id
- PATCH /companies/:id/archive
- PATCH /companies/:id/restore
- PATCH /companies/:id/activate
- PATCH /companies/:id/deactivate
- POST /farms
- GET /farms
- GET /farms/:id
- PUT /farms/:id
- DELETE /farms/:id
- PATCH /farms/:id/archive
- PATCH /farms/:id/restore
- PATCH /farms/:id/activate
- PATCH /farms/:id/deactivate
- POST /farms/:id/copy-structure
- GET /stats
- POST /rearing-facilities
- GET /rearing-facilities
- GET /rearing-facilities/:id
- PUT /rearing-facilities/:id
- DELETE /rearing-facilities/:id
- PATCH /rearing-facilities/:id/archive
- PATCH /rearing-facilities/:id/restore
- PATCH /rearing-facilities/:id/activate
- PATCH /rearing-facilities/:id/deactivate
- POST /houses
- GET /houses
- GET /houses/:id
- PUT /houses/:id
- DELETE /houses/:id
- PATCH /houses/:id/archive
- PATCH /houses/:id/restore
- PATCH /houses/:id/activate
- PATCH /houses/:id/deactivate
- POST /sectors
- GET /sectors
- GET /sectors/:id
- PUT /sectors/:id
- DELETE /sectors/:id
- PATCH /sectors/:id/archive
- PATCH /sectors/:id/restore
- PATCH /sectors/:id/activate
- PATCH /sectors/:id/deactivate

Base: /v1/production
- POST /batches
- GET /batches
- GET /batches/:id
- PUT /batches/:id
- DELETE /batches/:id
- POST /production-cycles
- GET /production-cycles
- GET /production-cycles/:id
- PUT /production-cycles/:id
- DELETE /production-cycles/:id

## 5) Modele Prisma

### 5.1 zbuduj/apps/api/prisma/schema.prisma

RearingFacility, House, BirdType, ProductionCycle, FeedProgram, Ingredient, IngredientAnalysis, WarehouseLot, InventoryMovement, Vaccination, Treatment, HealthRecord, Bedding, ClimateReading, IoTDevice, Task, Notification, Report, FeedRecipeIngredient, Supplier, Customer, Employee, Permission, RolePermission

### 5.2 turkey-health-intelligence-engine/backend/prisma/schema.prisma

House, HealthRecord, HealthImage, HealthDocument, Vaccination, VaccinationProgram, VaccinationStep, Treatment, WithdrawalPeriod, Necropsy, LabResult, DailyMetric, EnvironmentData, Disease, DiseaseImage, DiseaseReference, RiskScore, AIAdvisorLog

### 5.3 bloody-turkey-iot/apps/api/src/prisma/schema.prisma

Building, Zone, UserFarm, DeviceType, Device, Integration, Telemetry, ClimateData, FeedSilo, Alarm, AlarmAcknowledgement, Notification, AIPrediction, AIModel, MortalityRecord, FCRRecord, ADGRecord, MaintenanceRecord, DigitalTwinState

### 5.4 turkey-warehouse/schema.prisma

Organization, House, Zone, Rack, Location, Product, ProductAIInsight, Lot, LotItem, StockItem, StockMovement, TransferItem, Supplier, Recipe, RecipeIngredient, WarehouseAIAnalysis, WarehouseAlert, Batch

### 5.5 turkey-economics/schema.prisma

House, Batch, DailyCost, FeedRecord, HealthRecord, TransferRecord, SaleRecord, Contractor, ScenarioResult, AIAdvisor, ExecutiveSummary, BenchmarkEntry, FinancialDashboard

### 5.6 turkey-production-engine/schema.prisma

Nursery, House, Batch, DailyLog, AIAnalysis, AIForecast, Alert, ProductionEvent, Vaccination, Treatment, Photo, Video, Document, DemoState

### 5.7 bloody-turkey-feed-module/prisma/schema.prisma

MaterialBatch, RawMaterialSubstitution, Supplier, NutritionalStandard, Recipe, RecipeIngredient, RecipeHistory, ProductionBatch, BatchRecipeAssignment, ProductionResult, FeedAlert, FeedInventory, MaterialExpertProfile, MaterialKnowledgeEntry, ExpertDecisionLog, ExperimentScenario, BatchForecast, ForecastAccuracy, RecipeComparison, UserExpertProfile, MaterialInteraction

## 6) Zależności między modułami

## 6.1 Zależności techniczne (monorepo zbuduj)

- @bloody-turkey/shared zależy od @bloody-turkey/types
- @bloody-turkey/ui zależy od @bloody-turkey/types
- @bloody-turkey/api korzysta z NestJS + Prisma + PostgreSQL
- @bloody-turkey/web korzysta z Next.js + React + React Query + React Hook Form + Zod

## 6.2 Zależności domenowe (na poziomie danych i API)

- turkey-warehouse łączy magazyn z recepturami i produkcją (endpoint reserveForRecipe przyjmuje recipeId i batchId)
- turkey-economics operuje na partiach, kosztach, zdrowiu i sprzedaży (modele Batch, DailyCost, FeedRecord, HealthRecord, SaleRecord)
- turkey-health-intelligence-engine zasila decyzje weterynaryjne i ryzyko (HealthRecord, Treatment, Vaccination, RiskScore, AIAdvisorLog)
- bloody-turkey-iot dostarcza telemetrię i alarmy do analiz operacyjnych (Telemetry, Alarm, AIPrediction)
- zbuduj/apps/api agreguje procesy enterprise: organization, production, feed, health
- apps/api (integration) służy do rejestracji integracji między modułami sourceModule -> targetModule

## 6.3 Diagram zależności (logiczny)

- zbuduj/apps/api -> organization, production, feed, health
- turkey-production-engine -> turkey-economics
- bloody-turkey-iot -> turkey-production-engine
- turkey-health-intelligence-engine -> turkey-production-engine
- turkey-warehouse -> bloody-turkey-feed-module
- turkey-warehouse -> turkey-production-engine
- turkey-economics -> turkey-production-engine
- turkey-economics -> turkey-health-intelligence-engine
- apps/api(integration) -> all domain modules

## 7) Główne zależności zewnętrzne

- NestJS (w wielu backendach)
- Prisma + @prisma/client
- PostgreSQL driver (pg)
- Swagger decorators
- Next.js + React (frontend)
- Turbo (workspaces w bloody-turkey-iot)
- TensorFlow.js Node (moduł IoT API)

## 8) Uwagi końcowe

- W repo występują zduplikowane drzewa katalogów (np. w katalogu BloodyturkeyEnterprise oraz katalogach agents/output); ta dokumentacja opisuje główną kopię źródłową.
- Endpointy zostały wylistowane z kontrolerów TypeScript; parametry, walidacje i role znajdują się bezpośrednio w klasach kontrolerów i DTO.
