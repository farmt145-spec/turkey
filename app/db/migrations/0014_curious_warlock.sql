ALTER TABLE `houses` ADD `lengthM` decimal(7,1) DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `houses` ADD `widthM` decimal(7,1) DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `houses` ADD `heightM` decimal(5,1) DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `houses` ADD `feederCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `houses` ADD `drinkerCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `houses` ADD `lightingLux` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `houses` ADD `lightingHours` decimal(4,1) DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `houses` ADD `ventilationM3h` int DEFAULT 0 NOT NULL;
