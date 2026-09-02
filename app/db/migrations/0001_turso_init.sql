CREATE TABLE `ai_advisor_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`symptoms` text NOT NULL,
	`inputData` text NOT NULL,
	`recommendations` text NOT NULL,
	`confidence` numeric,
	`disclaimerShown` integer DEFAULT true NOT NULL,
	`veterinarian` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`keyHash` text NOT NULL,
	`keyPrefix` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`lastUsedAt` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_keyHash_unique` ON `api_keys` (`keyHash`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tableName` text NOT NULL,
	`recordId` integer NOT NULL,
	`action` text NOT NULL,
	`oldValues` text,
	`newValues` text,
	`author` text DEFAULT 'system' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `batch_day_facts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`farmId` integer NOT NULL,
	`houseId` integer NOT NULL,
	`batchId` integer NOT NULL,
	`day` text NOT NULL,
	`ageDays` integer NOT NULL,
	`birdCount` integer NOT NULL,
	`avgWeightG` integer,
	`adgG` numeric,
	`feedKg` numeric DEFAULT '0' NOT NULL,
	`cumulativeFeedKg` numeric DEFAULT '0' NOT NULL,
	`mortality` integer DEFAULT 0 NOT NULL,
	`cumulativeMortality` integer DEFAULT 0 NOT NULL,
	`fcr` numeric,
	`biomassKg` numeric,
	`waterLiters` numeric,
	`tempC` numeric,
	`humidityPct` numeric,
	`co2Ppm` integer,
	`ammoniaPpm` numeric,
	`inputSnapshot` text NOT NULL,
	`sourceWatermark` integer NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `batch_day_facts_batch_day_unique` ON `batch_day_facts` (`batchId`,`day`);--> statement-breakpoint
CREATE INDEX `batch_day_facts_company_day_idx` ON `batch_day_facts` (`companyId`,`day`);--> statement-breakpoint
CREATE INDEX `batch_day_facts_house_day_idx` ON `batch_day_facts` (`houseId`,`day`);--> statement-breakpoint
CREATE TABLE `batch_day_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`dayAge` integer NOT NULL,
	`ageGroup` integer NOT NULL,
	`targetWeightKg` numeric,
	`currentWeightKg` numeric,
	`feedRequirementKg` numeric,
	`proteinTargetPct` numeric,
	`energyTargetKcal` integer,
	`deviationPct` numeric,
	`status` text DEFAULT 'PASS' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `batch_forecasts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`weeklyForecasts` text NOT NULL,
	`predictedFcr` numeric NOT NULL,
	`predictedAdg` numeric NOT NULL,
	`predictedEpef` numeric,
	`predictedMortalityPct` numeric,
	`predictedFeedTons` numeric,
	`predictedFeedCost` numeric,
	`predictedMargin` numeric,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`assumptions` text,
	`confidenceIntervals` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`houseId` integer NOT NULL,
	`sectorId` integer,
	`geneticLineId` integer,
	`code` text NOT NULL,
	`geneticLine` text NOT NULL,
	`sex` text NOT NULL,
	`chickSupplier` text,
	`chickPrice` numeric DEFAULT '0.000' NOT NULL,
	`startDate` text NOT NULL,
	`plannedEndDate` text,
	`initialCount` integer NOT NULL,
	`currentCount` integer NOT NULL,
	`soldCount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `benchmark_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer NOT NULL,
	`batchId` integer NOT NULL,
	`houseId` integer,
	`period` text NOT NULL,
	`fcr` numeric,
	`adg` numeric,
	`epef` numeric,
	`costPerKg` numeric,
	`feedCostPerKg` numeric,
	`mortalityRate` numeric,
	`margin` numeric,
	`profit` numeric,
	`farmRank` integer,
	`houseRank` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `benchmarks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer,
	`metric` text NOT NULL,
	`value` numeric NOT NULL,
	`period` text NOT NULL,
	`source` text DEFAULT 'internal' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `biosecurity_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer NOT NULL,
	`day` text NOT NULL,
	`area` text NOT NULL,
	`checkName` text NOT NULL,
	`passed` integer DEFAULT true NOT NULL,
	`score` integer,
	`inspector` text DEFAULT 'system' NOT NULL,
	`note` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bird_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`farmId` integer,
	`houseId` integer,
	`batchId` integer,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`sex` text DEFAULT 'mixed' NOT NULL,
	`ageGroup` integer NOT NULL,
	`dayAge` integer DEFAULT 0 NOT NULL,
	`targetWeightKg` numeric,
	`productionGoal` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `climate_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`houseId` integer NOT NULL,
	`ts` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`tempC` numeric,
	`humidityPct` numeric,
	`co2Ppm` integer,
	`ammoniaPpm` numeric,
	`ventilationPct` integer,
	`source` text DEFAULT 'sensor' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`countryCode` text NOT NULL,
	`baseCurrency` text DEFAULT 'EUR' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`party` text NOT NULL,
	`kind` text NOT NULL,
	`number` text NOT NULL,
	`validFrom` text NOT NULL,
	`validTo` text,
	`valueEur` numeric,
	`terms` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `costs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`category` text NOT NULL,
	`amount` numeric NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`day` text NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `daily_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`day` text NOT NULL,
	`mortality` integer DEFAULT 0 NOT NULL,
	`culls` integer DEFAULT 0 NOT NULL,
	`waterLiters` numeric,
	`feedKg` numeric,
	`tempC` numeric,
	`humidityPct` numeric,
	`ammoniaPpm` numeric,
	`note` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `diet_requirements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`gender` text DEFAULT 'mixed' NOT NULL,
	`ageGroup` integer NOT NULL,
	`ageFromDays` integer NOT NULL,
	`ageToDays` integer NOT NULL,
	`targetWeightKg` numeric,
	`energyKcal` integer NOT NULL,
	`proteinPct` numeric NOT NULL,
	`lysinePct` numeric DEFAULT '0' NOT NULL,
	`methioninePct` numeric DEFAULT '0' NOT NULL,
	`threoninePct` numeric DEFAULT '0' NOT NULL,
	`calciumPct` numeric DEFAULT '0' NOT NULL,
	`phosphorusPct` numeric DEFAULT '0' NOT NULL,
	`sodiumPct` numeric DEFAULT '0' NOT NULL,
	`extraParams` text,
	`sourceReference` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `disease_references` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`diseaseId` integer NOT NULL,
	`title` text NOT NULL,
	`authors` text,
	`journal` text,
	`year` integer,
	`url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `diseases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`latinName` text,
	`category` text NOT NULL,
	`symptoms` text,
	`diagnosis` text,
	`treatmentProtocol` text,
	`prevention` text,
	`severity` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`reference` text,
	`docDate` text NOT NULL,
	`url` text,
	`note` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dynamic_entities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`data` text NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `economics_ai_advisors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`date` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`justification` text NOT NULL,
	`estimatedSavings` numeric,
	`estimatedGain` numeric,
	`actionTaken` integer DEFAULT false NOT NULL,
	`actionResult` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `energy_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer NOT NULL,
	`kind` text NOT NULL,
	`day` text NOT NULL,
	`consumption` numeric NOT NULL,
	`unit` text NOT NULL,
	`costEur` numeric NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `executive_summaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`period` text DEFAULT 'batch' NOT NULL,
	`strengths` text NOT NULL,
	`threats` text NOT NULL,
	`topCosts` text NOT NULL,
	`profitOpportunities` text NOT NULL,
	`endForecast` text,
	`recommendations` text NOT NULL,
	`metricsSnapshot` text,
	`generatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `experiment_scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`name` text NOT NULL,
	`description` text,
	`baseRecipeId` integer NOT NULL,
	`changes` text NOT NULL,
	`experimentStatus` text DEFAULT 'draft' NOT NULL,
	`results` text,
	`startedAt` integer,
	`completedAt` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `farms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`name` text NOT NULL,
	`countryCode` text NOT NULL,
	`city` text NOT NULL,
	`lat` numeric NOT NULL,
	`lng` numeric NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feed_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`type` text NOT NULL,
	`severity` text DEFAULT 'warning' NOT NULL,
	`sourceType` text NOT NULL,
	`sourceId` integer NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`parameter` text,
	`actualValue` numeric,
	`thresholdValue` numeric,
	`unit` text,
	`consequences` text,
	`recommendations` text,
	`alertStatus` text DEFAULT 'active' NOT NULL,
	`acknowledgedBy` text,
	`acknowledgedAt` integer,
	`resolvedAt` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feed_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`siloId` integer NOT NULL,
	`batchId` integer NOT NULL,
	`recipeId` integer,
	`day` text NOT NULL,
	`kg` numeric NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feed_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`name` text NOT NULL,
	`countryCode` text NOT NULL,
	`pricePerTon` numeric NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`proteinPct` numeric NOT NULL,
	`energyKcal` integer NOT NULL,
	`lysinePct` numeric DEFAULT '0' NOT NULL,
	`methioninePct` numeric DEFAULT '0' NOT NULL,
	`fiberPct` numeric DEFAULT '0' NOT NULL,
	`fatPct` numeric DEFAULT '0' NOT NULL,
	`calciumPct` numeric DEFAULT '0' NOT NULL,
	`phosphorusPct` numeric DEFAULT '0' NOT NULL,
	`stockTons` numeric DEFAULT '0' NOT NULL,
	`moisturePct` numeric DEFAULT '12' NOT NULL,
	`ashPct` numeric DEFAULT '0' NOT NULL,
	`starchPct` numeric DEFAULT '0' NOT NULL,
	`cystinePct` numeric DEFAULT '0' NOT NULL,
	`threoninePct` numeric DEFAULT '0' NOT NULL,
	`tryptophanPct` numeric DEFAULT '0' NOT NULL,
	`argininePct` numeric DEFAULT '0' NOT NULL,
	`sodiumPct` numeric DEFAULT '0' NOT NULL,
	`producer` text,
	`code` text,
	`extraParams` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feed_program_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`programId` integer NOT NULL,
	`name` text NOT NULL,
	`dayFrom` integer NOT NULL,
	`dayTo` integer NOT NULL,
	`recipeId` integer,
	`proteinTargetPct` numeric,
	`energyTargetKcal` integer,
	`feedPerBirdG` integer
);
--> statement-breakpoint
CREATE TABLE `feed_programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`name` text NOT NULL,
	`sex` text DEFAULT 'mixed' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feed_usages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`day` text NOT NULL,
	`kg` numeric NOT NULL,
	`recipeId` integer
);
--> statement-breakpoint
CREATE TABLE `forecast_accuracy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`metric` text NOT NULL,
	`predicted` numeric NOT NULL,
	`actual` numeric NOT NULL,
	`accuracyPct` numeric NOT NULL,
	`day` text NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `genetic_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`name` text NOT NULL,
	`supplier` text,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hatchery_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`geneticLineId` integer NOT NULL,
	`code` text NOT NULL,
	`eggsSet` integer NOT NULL,
	`fertilePct` numeric,
	`hatchedCount` integer,
	`hatchPct` numeric,
	`setDate` text NOT NULL,
	`hatchDate` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_daily_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`day` text NOT NULL,
	`mortalityRate` numeric,
	`fcr` numeric,
	`adgGrams` numeric,
	`waterPerFeedRatio` numeric,
	`notes` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_record_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`healthRecordId` integer NOT NULL,
	`kind` text NOT NULL,
	`fileName` text NOT NULL,
	`filePath` text NOT NULL,
	`mimeType` text,
	`sizeBytes` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`type` text NOT NULL,
	`day` text NOT NULL,
	`description` text NOT NULL,
	`performedBy` text NOT NULL,
	`cost` numeric,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `house_quick_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`houseId` integer NOT NULL,
	`batchId` integer,
	`author` text DEFAULT 'system' NOT NULL,
	`category` text DEFAULT 'INNE' NOT NULL,
	`noteText` text NOT NULL,
	`eventDate` text NOT NULL,
	`eventTime` text,
	`photoUrl` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `houses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer NOT NULL,
	`name` text NOT NULL,
	`houseType` text NOT NULL,
	`areaM2` numeric NOT NULL,
	`maxDensityKgM2` numeric DEFAULT '42.0' NOT NULL,
	`lengthM` numeric DEFAULT '0.0' NOT NULL,
	`widthM` numeric DEFAULT '0.0' NOT NULL,
	`heightM` numeric DEFAULT '0.0' NOT NULL,
	`feederCount` integer DEFAULT 0 NOT NULL,
	`drinkerCount` integer DEFAULT 0 NOT NULL,
	`lightingLux` integer DEFAULT 0 NOT NULL,
	`lightingHours` numeric DEFAULT '0.0' NOT NULL,
	`ventilationM3h` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sourceModule` text NOT NULL,
	`targetModule` text NOT NULL,
	`kind` text DEFAULT 'api' NOT NULL,
	`config` text,
	`enabled` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`number` text NOT NULL,
	`kind` text NOT NULL,
	`counterparty` text NOT NULL,
	`issueDate` text NOT NULL,
	`dueDate` text,
	`amountNet` numeric NOT NULL,
	`vatPct` integer DEFAULT 23 NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`paid` integer DEFAULT false NOT NULL,
	`batchId` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `iot_ai_predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deviceId` integer,
	`farmId` integer NOT NULL,
	`houseId` integer,
	`type` text NOT NULL,
	`modelVersion` text DEFAULT '1.0.0' NOT NULL,
	`confidence` numeric NOT NULL,
	`prediction` text NOT NULL,
	`features` text,
	`validUntil` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `iot_device_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`manufacturer` text,
	`model` text,
	`icon` text,
	`defaultConfig` text,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `iot_device_types_code_unique` ON `iot_device_types` (`code`);--> statement-breakpoint
CREATE TABLE `iot_devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer NOT NULL,
	`houseId` integer,
	`sectorId` integer,
	`deviceTypeId` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`serialNumber` text,
	`macAddress` text,
	`ipAddress` text,
	`modbusAddress` integer,
	`mqttTopic` text,
	`positionX` numeric,
	`positionY` numeric,
	`config` text,
	`calibration` text,
	`status` text DEFAULT 'offline' NOT NULL,
	`lastSeenAt` integer,
	`firmwareVersion` text,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `iot_telemetry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deviceId` integer NOT NULL,
	`ts` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`metric` text NOT NULL,
	`rawValue` text NOT NULL,
	`processedValue` numeric,
	`unit` text,
	`quality` text DEFAULT 'good' NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `knowledge_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ingredientId` integer,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`year` integer,
	`authors` text,
	`url` text,
	`doi` text,
	`summary` text NOT NULL,
	`keyFindings` text,
	`recommendations` text,
	`commonMistake` text,
	`mistakeConsequence` text,
	`mistakeSolution` text,
	`credibility` numeric DEFAULT '0.50' NOT NULL,
	`isPeerReviewed` integer DEFAULT false NOT NULL,
	`applicablePhases` text,
	`tags` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lab_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer NOT NULL,
	`batchId` integer,
	`sampleType` text NOT NULL,
	`testName` text NOT NULL,
	`resultValue` text NOT NULL,
	`unit` text,
	`refRange` text,
	`verdict` text DEFAULT 'ok' NOT NULL,
	`labName` text,
	`day` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `litter` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`houseId` integer NOT NULL,
	`material` text NOT NULL,
	`thicknessCm` numeric NOT NULL,
	`moisturePct` numeric,
	`cost` numeric DEFAULT '0' NOT NULL,
	`laidAt` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `litter_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`houseId` integer NOT NULL,
	`sectorId` integer,
	`eventDate` text NOT NULL,
	`material` text NOT NULL,
	`quantityKg` numeric NOT NULL,
	`areaM2` numeric,
	`kgPerM2` numeric,
	`reason` text DEFAULT 'inne' NOT NULL,
	`beforeStatus` text,
	`afterStatus` text,
	`cost` numeric DEFAULT '0' NOT NULL,
	`note` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `maintenance_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer NOT NULL,
	`houseId` integer,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`ticketStatus` text DEFAULT 'open' NOT NULL,
	`reportedBy` text DEFAULT 'system' NOT NULL,
	`dueDate` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `material_batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ingredientId` integer NOT NULL,
	`batchNumber` text NOT NULL,
	`supplierId` integer,
	`quantityTons` numeric NOT NULL,
	`pricePerTon` numeric NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`receivedAt` text NOT NULL,
	`expiresAt` text,
	`qualityNotes` text,
	`labProfile` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `material_interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ingredientAId` integer NOT NULL,
	`ingredientBId` integer NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`maxCombinedPct` numeric,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `material_substitutions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ingredientId` integer NOT NULL,
	`substituteId` integer NOT NULL,
	`maxReplacementPct` numeric NOT NULL,
	`nutritionalPenaltyPct` numeric,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `measurement_quality_flags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`sourceTable` text NOT NULL,
	`sourceId` integer NOT NULL,
	`metric` text NOT NULL,
	`quality` text NOT NULL,
	`reason` text NOT NULL,
	`flaggedBy` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`resolvedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `measurement_quality_source_metric_unique` ON `measurement_quality_flags` (`sourceTable`,`sourceId`,`metric`);--> statement-breakpoint
CREATE INDEX `measurement_quality_company_created_idx` ON `measurement_quality_flags` (`companyId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `medicines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`name` text NOT NULL,
	`substance` text,
	`form` text,
	`stockQty` numeric DEFAULT '0' NOT NULL,
	`unit` text DEFAULT 'ml' NOT NULL,
	`expiryDate` text,
	`minStock` numeric DEFAULT '0' NOT NULL,
	`pricePerUnit` numeric,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`author` text DEFAULT 'system' NOT NULL,
	`channel` text DEFAULT 'general' NOT NULL,
	`body` text NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mortalities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`day` text NOT NULL,
	`count` integer NOT NULL,
	`cause` text
);
--> statement-breakpoint
CREATE TABLE `necropsy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`day` text NOT NULL,
	`birdCount` integer DEFAULT 1 NOT NULL,
	`findings` text NOT NULL,
	`suspectedDiseaseId` integer,
	`vet` text DEFAULT 'system' NOT NULL,
	`verdict` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`severity` text DEFAULT 'info' NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link` text,
	`read_flag` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nutritional_standards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`gender` text DEFAULT 'mixed' NOT NULL,
	`productionType` text DEFAULT 'broiler' NOT NULL,
	`phase` text NOT NULL,
	`ageFromDays` integer NOT NULL,
	`ageToDays` integer NOT NULL,
	`targetWeightFromKg` numeric,
	`targetWeightToKg` numeric,
	`meMinKcal` integer NOT NULL,
	`meMaxKcal` integer NOT NULL,
	`proteinMinPct` numeric NOT NULL,
	`proteinMaxPct` numeric NOT NULL,
	`fatMinPct` numeric,
	`fatMaxPct` numeric,
	`fiberMaxPct` numeric,
	`lysineMinPct` numeric NOT NULL,
	`methionineMinPct` numeric NOT NULL,
	`calciumMinPct` numeric,
	`calciumMaxPct` numeric,
	`phosphorusMinPct` numeric,
	`sodiumMinPct` numeric,
	`sodiumMaxPct` numeric,
	`extraParams` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prediction_findings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`predictionRunId` integer NOT NULL,
	`companyId` integer NOT NULL,
	`batchId` integer,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`recommendation` text,
	`status` text DEFAULT 'open' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`resolvedAt` integer,
	`resolvedBy` integer
);
--> statement-breakpoint
CREATE INDEX `prediction_findings_company_status_idx` ON `prediction_findings` (`companyId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `prediction_findings_run_idx` ON `prediction_findings` (`predictionRunId`);--> statement-breakpoint
CREATE TABLE `prediction_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`code` text NOT NULL,
	`version` text NOT NULL,
	`domain` text DEFAULT 'production' NOT NULL,
	`inputContract` text NOT NULL,
	`thresholds` text NOT NULL,
	`logic` text,
	`source` text NOT NULL,
	`author` text NOT NULL,
	`effectiveFrom` text NOT NULL,
	`effectiveTo` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prediction_rules_scope_code_version_unique` ON `prediction_rules` (`companyId`,`code`,`version`);--> statement-breakpoint
CREATE INDEX `prediction_rules_status_effective_idx` ON `prediction_rules` (`status`,`effectiveFrom`);--> statement-breakpoint
CREATE TABLE `prediction_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`batchId` integer,
	`houseId` integer,
	`ruleId` integer,
	`ruleVersion` text NOT NULL,
	`curveId` integer,
	`curveVersion` text,
	`asOf` integer NOT NULL,
	`inputSnapshot` text NOT NULL,
	`output` text NOT NULL,
	`confidence` numeric NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`sourceWatermark` integer NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `prediction_runs_company_batch_asof_idx` ON `prediction_runs` (`companyId`,`batchId`,`asOf`);--> statement-breakpoint
CREATE INDEX `prediction_runs_rule_created_idx` ON `prediction_runs` (`ruleId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `production_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`justification` text NOT NULL,
	`isResolved` integer DEFAULT false NOT NULL,
	`resolvedAt` integer,
	`resolvedBy` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `production_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`dayNumber` integer NOT NULL,
	`fcr` numeric,
	`adgGrams` numeric,
	`epef` numeric,
	`mortalityRate` numeric,
	`tempScore` numeric,
	`waterScore` numeric,
	`feedScore` numeric,
	`humidityScore` numeric,
	`co2Score` numeric,
	`nh3Score` numeric,
	`dayScore` numeric NOT NULL,
	`riskLevel` text NOT NULL,
	`detectedIssues` text,
	`possibleCauses` text,
	`recommendations` text,
	`forecast7Days` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `production_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`eventType` text NOT NULL,
	`dayNumber` integer DEFAULT 0 NOT NULL,
	`description` text NOT NULL,
	`metadata` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `production_forecasts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`predictedFinalWeight` numeric NOT NULL,
	`predictedFcr` numeric NOT NULL,
	`predictedEpef` numeric NOT NULL,
	`totalFeedConsumptionKg` numeric NOT NULL,
	`totalCost` numeric NOT NULL,
	`predictedRevenue` numeric NOT NULL,
	`predictedProfit` numeric NOT NULL,
	`predictedMargin` numeric NOT NULL,
	`accuracyPercent` numeric,
	`generatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`supplierId` integer NOT NULL,
	`number` text NOT NULL,
	`item` text NOT NULL,
	`quantity` numeric NOT NULL,
	`unit` text DEFAULT 'kg' NOT NULL,
	`priceNet` numeric NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`orderDate` text NOT NULL,
	`deliveryDate` text,
	`orderStatus` text DEFAULT 'draft' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_balances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipeId` integer NOT NULL,
	`parameterCode` text NOT NULL,
	`requiredValue` numeric NOT NULL,
	`recipeValue` numeric NOT NULL,
	`differenceValue` numeric NOT NULL,
	`status` text DEFAULT 'PASS' NOT NULL,
	`unit` text NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipeId` integer NOT NULL,
	`changeNote` text NOT NULL,
	`oldProfile` text,
	`newProfile` text,
	`expertReport` text,
	`author` text DEFAULT 'system' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipeId` integer NOT NULL,
	`ingredientId` integer NOT NULL,
	`percent` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`name` text NOT NULL,
	`ageGroup` text NOT NULL,
	`strategy` text NOT NULL,
	`costPerTon` numeric NOT NULL,
	`proteinPct` numeric NOT NULL,
	`energyKcal` integer NOT NULL,
	`lysinePct` numeric NOT NULL,
	`explanation` text,
	`version` integer DEFAULT 1 NOT NULL,
	`author` text DEFAULT 'system' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sex` text DEFAULT 'mixed' NOT NULL,
	`season` text DEFAULT 'all' NOT NULL,
	`genetics` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reference_curves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`geneticLineId` integer,
	`geneticLine` text,
	`sex` text NOT NULL,
	`ageDays` integer NOT NULL,
	`targetWeightG` integer,
	`targetAdgG` numeric,
	`targetFcr` numeric,
	`targetFeedKg` numeric,
	`targetMortalityPct` numeric,
	`tempMinC` numeric,
	`tempMaxC` numeric,
	`humidityMinPct` numeric,
	`humidityMaxPct` numeric,
	`co2MaxPpm` integer,
	`ammoniaMaxPpm` numeric,
	`source` text NOT NULL,
	`version` text NOT NULL,
	`author` text NOT NULL,
	`effectiveFrom` text NOT NULL,
	`effectiveTo` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reference_curves_scope_age_version_unique` ON `reference_curves` (`companyId`,`geneticLine`,`sex`,`ageDays`,`version`);--> statement-breakpoint
CREATE INDEX `reference_curves_lookup_idx` ON `reference_curves` (`status`,`sex`,`ageDays`,`effectiveFrom`);--> statement-breakpoint
CREATE TABLE `risk_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`calculatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`healthScore` integer NOT NULL,
	`productionScore` integer NOT NULL,
	`welfareScore` integer NOT NULL,
	`riskScore` integer NOT NULL,
	`factors` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`day` text NOT NULL,
	`birdCount` integer NOT NULL,
	`totalWeightKg` numeric NOT NULL,
	`pricePerKg` numeric NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`buyer` text
);
--> statement-breakpoint
CREATE TABLE `scenario_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`paramFeedPriceChange` numeric,
	`paramSoyPriceChange` numeric,
	`paramFcrChange` numeric,
	`paramMortalityChange` numeric,
	`paramSaleDelayDays` integer,
	`paramGasPriceChange` numeric,
	`paramRecipeId` integer,
	`predictedCost` numeric NOT NULL,
	`predictedMargin` numeric NOT NULL,
	`predictedProfit` numeric NOT NULL,
	`predictedCostPerKg` numeric NOT NULL,
	`impactOnProfit` numeric NOT NULL,
	`createdBy` text DEFAULT 'system' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer,
	`name` text NOT NULL,
	`assumptions` text NOT NULL,
	`result` text NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedule_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`day` text NOT NULL,
	`eventType` text NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`doneAt` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`houseId` integer NOT NULL,
	`name` text NOT NULL,
	`areaM2` numeric NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `selects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`name` text NOT NULL,
	`criteria` text NOT NULL,
	`origin` text DEFAULT 'manual' NOT NULL,
	`birdCount` integer NOT NULL,
	`avgWeightG` integer NOT NULL,
	`fcr` numeric,
	`mortalityPct` numeric,
	`waterIntakeMl` integer,
	`status` text DEFAULT 'ok' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `silos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer NOT NULL,
	`name` text NOT NULL,
	`capacityTons` numeric NOT NULL,
	`currentTons` numeric DEFAULT '0' NOT NULL,
	`recipeId` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lotId` integer NOT NULL,
	`kind` text NOT NULL,
	`qty` numeric NOT NULL,
	`reference` text,
	`batchId` integer,
	`day` text NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`countryCode` text,
	`nip` text,
	`email` text,
	`phone` text,
	`rating` integer DEFAULT 3 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`farmId` integer,
	`title` text NOT NULL,
	`description` text,
	`assignee` text,
	`dueDate` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sourceBatchId` integer NOT NULL,
	`targetBatchId` integer NOT NULL,
	`birdCount` integer NOT NULL,
	`avgWeightG` integer,
	`transportMortality` integer DEFAULT 0 NOT NULL,
	`transferDate` integer NOT NULL,
	`durationMin` integer,
	`driver` text,
	`vehicle` text,
	`signatureFrom` text,
	`signatureTo` text,
	`documentNo` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `treatments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`startedAt` text NOT NULL,
	`product` text NOT NULL,
	`activeSubstance` text NOT NULL,
	`dose` text NOT NULL,
	`reason` text,
	`withdrawalDays` integer DEFAULT 0 NOT NULL,
	`vet` text,
	`cost` numeric DEFAULT '0' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unionId` text NOT NULL,
	`name` text,
	`email` text,
	`avatar` text,
	`passwordHash` text,
	`sessionVersion` integer DEFAULT 1 NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`companyId` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`lastSignInAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_unionId_unique` ON `users` (`unionId`);--> statement-breakpoint
CREATE TABLE `vaccination_program_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`programId` integer NOT NULL,
	`vaccineName` text NOT NULL,
	`ageDays` integer NOT NULL,
	`route` text NOT NULL,
	`dosePerBird` text,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vaccination_programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer,
	`name` text NOT NULL,
	`geneticLine` text,
	`description` text,
	`isDefault` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vaccinations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`day` text NOT NULL,
	`vaccine` text NOT NULL,
	`method` text,
	`done` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouse_ai_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`productId` integer NOT NULL,
	`warehouseId` integer,
	`avgDailyConsumption` numeric NOT NULL,
	`currentStock` numeric NOT NULL,
	`daysOfSupply` numeric NOT NULL,
	`stockoutRisk` numeric NOT NULL,
	`expiryRisk` numeric NOT NULL,
	`rotationScore` integer NOT NULL,
	`predictedStockoutDate` text,
	`recommendedOrderQty` numeric,
	`recommendedOrderDate` text,
	`bestSupplierId` integer,
	`generatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouse_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`productId` integer,
	`lotId` integer,
	`warehouseId` integer,
	`message` text NOT NULL,
	`details` text,
	`isResolved` integer DEFAULT false NOT NULL,
	`resolvedAt` integer,
	`resolvedBy` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouse_lot_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lotId` integer NOT NULL,
	`manufacturer` text,
	`productionDate` text,
	`purchaseCost` numeric,
	`currentCost` numeric,
	`qrCode` text,
	`barcode` text,
	`certificateUrl` text,
	`moisture` numeric,
	`protein` numeric,
	`energy` numeric,
	`mycotoxins` text,
	`labResults` text,
	`isQuarantined` integer DEFAULT false NOT NULL,
	`quarantineReason` text,
	`releasedAt` integer,
	`releasedBy` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_lot_details_lotId_unique` ON `warehouse_lot_details` (`lotId`);--> statement-breakpoint
CREATE TABLE `warehouse_lots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`warehouseId` integer NOT NULL,
	`product` text NOT NULL,
	`lotNumber` text NOT NULL,
	`qty` numeric NOT NULL,
	`unit` text DEFAULT 'kg' NOT NULL,
	`receivedDate` text NOT NULL,
	`expiryDate` text,
	`supplierId` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouse_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lotId` integer,
	`productId` integer NOT NULL,
	`type` text NOT NULL,
	`subtype` text NOT NULL,
	`quantity` numeric NOT NULL,
	`unitCost` numeric DEFAULT '0' NOT NULL,
	`totalValue` numeric DEFAULT '0' NOT NULL,
	`fromWarehouseId` integer,
	`fromSiloId` integer,
	`fromHouseId` integer,
	`toWarehouseId` integer,
	`toSiloId` integer,
	`toHouseId` integer,
	`batchId` integer,
	`recipeId` integer,
	`documentNumber` text,
	`documentType` text,
	`notes` text,
	`moistureAtMove` numeric,
	`temperatureAtMove` numeric,
	`performedBy` text DEFAULT 'system' NOT NULL,
	`performedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouse_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`subcategory` text,
	`unit` text DEFAULT 'kg' NOT NULL,
	`minStock` numeric DEFAULT '0' NOT NULL,
	`maxStock` numeric,
	`reorderPoint` numeric DEFAULT '0' NOT NULL,
	`safetyStock` numeric DEFAULT '0' NOT NULL,
	`leadTimeDays` integer DEFAULT 7 NOT NULL,
	`shelfLifeDays` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`fcrImpact` numeric,
	`adgImpact` numeric,
	`healthImpact` text,
	`bestPractices` text,
	`dosageInfo` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouse_products_sku_unique` ON `warehouse_products` (`sku`);--> statement-breakpoint
CREATE TABLE `warehouse_stock_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`productId` integer NOT NULL,
	`warehouseId` integer NOT NULL,
	`quantity` numeric DEFAULT '0' NOT NULL,
	`reserved` numeric DEFAULT '0' NOT NULL,
	`available` numeric DEFAULT '0' NOT NULL,
	`unitCost` numeric DEFAULT '0' NOT NULL,
	`totalValue` numeric DEFAULT '0' NOT NULL,
	`lastUpdated` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`farmId` integer NOT NULL,
	`name` text NOT NULL,
	`capacityTons` numeric NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weighings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batchId` integer NOT NULL,
	`weighedAt` integer NOT NULL,
	`dayAge` integer NOT NULL,
	`sampleSize` integer NOT NULL,
	`avgWeightG` integer NOT NULL,
	`medianG` integer,
	`stdDevG` integer,
	`minG` integer,
	`maxG` integer,
	`cv` numeric,
	`operator` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `withdrawal_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`treatmentId` integer NOT NULL,
	`batchId` integer NOT NULL,
	`medicine` text NOT NULL,
	`startDay` text NOT NULL,
	`withdrawalDays` integer NOT NULL,
	`safeFrom` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedBy` text DEFAULT 'system' NOT NULL
);
