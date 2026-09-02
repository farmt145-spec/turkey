# BTE Database Inventory

## 1. Prisma schema files found
- [bloody_turkey_schema.prisma](bloody_turkey_schema.prisma)
- [candidate_shared_schema.prisma](candidate_shared_schema.prisma)
- [eval_merged_schema.prisma](eval_merged_schema.prisma)
- [merged_shared_schema.prisma](merged_shared_schema.prisma)
- [BloodyturkeyEnterprise/bloody_turkey_schema.prisma](BloodyturkeyEnterprise/bloody_turkey_schema.prisma)
- [BloodyturkeyEnterprise/candidate_shared_schema.prisma](BloodyturkeyEnterprise/candidate_shared_schema.prisma)
- [BloodyturkeyEnterprise/eval_merged_schema.prisma](BloodyturkeyEnterprise/eval_merged_schema.prisma)
- [BloodyturkeyEnterprise/merged_shared_schema.prisma](BloodyturkeyEnterprise/merged_shared_schema.prisma)
- [bloody-turkey-feed-module/prisma/schema.prisma](bloody-turkey-feed-module/prisma/schema.prisma)
- [bloody-turkey-iot/apps/api/src/prisma/schema.prisma](bloody-turkey-iot/apps/api/src/prisma/schema.prisma)
- [turkey-economics/schema.prisma](turkey-economics/schema.prisma)
- [turkey-health-intelligence-engine/backend/prisma/schema.prisma](turkey-health-intelligence-engine/backend/prisma/schema.prisma)
- [turkey-production-engine/schema.prisma](turkey-production-engine/schema.prisma)
- [turkey-warehouse/schema.prisma](turkey-warehouse/schema.prisma)
- [zbuduj/apps/api/prisma/schema.prisma](zbuduj/apps/api/prisma/schema.prisma)
- [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)
- [apps/api/prisma/seed.ts](apps/api/prisma/seed.ts)
- [BloodyturkeyEnterprise/apps/api/prisma/schema.prisma](BloodyturkeyEnterprise/apps/api/prisma/schema.prisma)
- [BloodyturkeyEnterprise/zbuduj/apps/api/prisma/schema.prisma](BloodyturkeyEnterprise/zbuduj/apps/api/prisma/schema.prisma)

## 2. Schema inventory by area
### Root legacy / merged schemas
- [bloody_turkey_schema.prisma](bloody_turkey_schema.prisma): contains core enterprise models including Company, Farm, User, Flock, Warehouse, HealthEvent, AuditLog.
- [candidate_shared_schema.prisma](candidate_shared_schema.prisma): expanded merged schema with many domain models including Feed, Health, Production, Warehouse, IoT, AI and reporting models.
- [eval_merged_schema.prisma](eval_merged_schema.prisma): evaluation / comparison schema with a large merged model set.
- [merged_shared_schema.prisma](merged_shared_schema.prisma): merged shared schema with many overlapping models.

### Domain module schemas
- [bloody-turkey-feed-module/prisma/schema.prisma](bloody-turkey-feed-module/prisma/schema.prisma): feed-oriented models such as Recipe, Ingredient, MaterialBatch, FeedAlert, ExperimentScenario.
- [turkey-economics/schema.prisma](turkey-economics/schema.prisma): economics domain models such as Batch, DailyCost, SaleRecord, AIAdvisor, ExecutiveSummary.
- [turkey-health-intelligence-engine/backend/prisma/schema.prisma](turkey-health-intelligence-engine/backend/prisma/schema.prisma): health domain models such as HealthRecord, Vaccination, Treatment, LabResult, Disease.
- [turkey-production-engine/schema.prisma](turkey-production-engine/schema.prisma): production domain models such as Batch, DailyLog, Alert, ProductionEvent.
- [turkey-warehouse/schema.prisma](turkey-warehouse/schema.prisma): warehouse domain models such as Warehouse, Lot, StockItem, StockMovement, TransferItem.
- [bloody-turkey-iot/apps/api/src/prisma/schema.prisma](bloody-turkey-iot/apps/api/src/prisma/schema.prisma): IoT models such as Device, Telemetry, Alarm, DigitalTwinState.
- [zbuduj/apps/api/prisma/schema.prisma](zbuduj/apps/api/prisma/schema.prisma): monorepo-oriented schema with RearingFacility, House, ProductionCycle, HealthRecord, IoTDevice.

## 3. Important duplicate / overlapping entities
The following entities appear repeatedly across schemas and should be treated as duplicates or overlapping concepts for later review:
- Farm
- Building
- House
- Batch
- ProductionCycle
- Recipe
- Ingredient
- HealthRecord
- Warehouse
- User
- Organization

## 4. Recommended handling
- Keep the current domain module schemas as business-domain assets.
- Archive the root-level merged candidate schemas as historical references rather than active foundation.
- Do not merge or replace schemas yet; only document and isolate them.
- Preserve seed files and migration assets until a later controlled integration phase.
