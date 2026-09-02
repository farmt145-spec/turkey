import {
  sqliteTable,
  sqliteEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  decimal,
  boolean,
  date,
  json,
  index,
  uniqueIndex,
} from "./sqlite-core";

export const users = sqliteTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  sessionVersion: int("sessionVersion").notNull().default(1),
  role: sqliteEnum("role", ["user", "admin"]).default("user").notNull(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ============================================================
   AUDIT TRAIL — globalny, każda tabela biznesowa
   ============================================================ */

export const auditLog = sqliteTable("audit_log", {
  id: serial("id").primaryKey(),
  tableName: varchar("tableName", { length: 64 }).notNull(),
  recordId: bigint("recordId", { mode: "number", unsigned: true }).notNull(),
  action: sqliteEnum("action", ["create", "update", "delete"]).notNull(),
  oldValues: json("oldValues"),
  newValues: json("newValues"),
  author: varchar("author", { length: 255 }).notNull().default("system"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/* ============================================================
   ORGANIZACJA — multi-company (multi-tenant)
   ============================================================ */

const base = {
  status: sqliteEnum("status", ["active", "archived"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  updatedBy: varchar("updatedBy", { length: 255 }).notNull().default("system"),
};

export const companies = sqliteTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  countryCode: varchar("countryCode", { length: 2 }).notNull(),
  baseCurrency: varchar("baseCurrency", { length: 3 }).notNull().default("EUR"),
  ...base,
});

export const geneticLines = sqliteTable("genetic_lines", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  supplier: varchar("supplier", { length: 255 }),
  notes: text("notes"),
  ...base,
});

export const farms = sqliteTable("farms", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  countryCode: varchar("countryCode", { length: 2 }).notNull(),
  city: varchar("city", { length: 255 }).notNull(),
  lat: decimal("lat", { precision: 9, scale: 5 }).notNull(),
  lng: decimal("lng", { precision: 9, scale: 5 }).notNull(),
  capacity: int("capacity").notNull().default(0),
  ...base,
});

export const houses = sqliteTable("houses", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  houseType: sqliteEnum("houseType", ["brooder", "finisher"]).notNull(),
  areaM2: decimal("areaM2", { precision: 10, scale: 1 }).notNull(),
  maxDensityKgM2: decimal("maxDensityKgM2", { precision: 5, scale: 1 })
    .notNull()
    .default("42.0"),
  lengthM: decimal("lengthM", { precision: 7, scale: 1 }).notNull().default("0.0"),
  widthM: decimal("widthM", { precision: 7, scale: 1 }).notNull().default("0.0"),
  heightM: decimal("heightM", { precision: 5, scale: 1 }).notNull().default("0.0"),
  feederCount: int("feederCount").notNull().default(0),
  drinkerCount: int("drinkerCount").notNull().default(0),
  lightingLux: int("lightingLux").notNull().default(0),
  lightingHours: decimal("lightingHours", { precision: 4, scale: 1 }).notNull().default("0.0"),
  ventilationM3h: int("ventilationM3h").notNull().default(0),
  ...base,
});

export const sectors = sqliteTable("sectors", {
  id: serial("id").primaryKey(),
  houseId: bigint("houseId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  areaM2: decimal("areaM2", { precision: 10, scale: 1 }).notNull(),
  ...base,
});

/* ============================================================
   PRODUKCJA
   ============================================================ */

export const batches = sqliteTable("batches", {
  id: serial("id").primaryKey(),
  houseId: bigint("houseId", { mode: "number", unsigned: true }).notNull(),
  sectorId: bigint("sectorId", { mode: "number", unsigned: true }),
  geneticLineId: bigint("geneticLineId", { mode: "number", unsigned: true }),
  code: varchar("code", { length: 64 }).notNull(),
  geneticLine: varchar("geneticLine", { length: 128 }).notNull(),
  sex: sqliteEnum("sex", ["toms", "hens", "mixed"]).notNull(),
  chickSupplier: varchar("chickSupplier", { length: 255 }),
  chickPrice: decimal("chickPrice", { precision: 8, scale: 3 })
    .notNull()
    .default("0.000"),
  startDate: date("startDate", { mode: "string" }).notNull(),
  plannedEndDate: date("plannedEndDate", { mode: "string" }),
  initialCount: int("initialCount").notNull(),
  currentCount: int("currentCount").notNull(),
  soldCount: int("soldCount").notNull().default(0),
  status: sqliteEnum("status", ["active", "closed", "planned", "archived"])
    .notNull()
    .default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  updatedBy: varchar("updatedBy", { length: 255 }).notNull().default("system"),
});

export const weighings = sqliteTable("weighings", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  weighedAt: timestamp("weighedAt").notNull(),
  dayAge: int("dayAge").notNull(),
  sampleSize: int("sampleSize").notNull(),
  avgWeightG: int("avgWeightG").notNull(),
  medianG: int("medianG"),
  stdDevG: int("stdDevG"),
  minG: int("minG"),
  maxG: int("maxG"),
  cv: decimal("cv", { precision: 5, scale: 2 }),
  operator: varchar("operator", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const selects = sqliteTable("selects", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  criteria: varchar("criteria", { length: 255 }).notNull(),
  origin: sqliteEnum("origin", ["manual", "dynamic"]).notNull().default("manual"),
  birdCount: int("birdCount").notNull(),
  avgWeightG: int("avgWeightG").notNull(),
  fcr: decimal("fcr", { precision: 5, scale: 3 }),
  mortalityPct: decimal("mortalityPct", { precision: 5, scale: 2 }),
  waterIntakeMl: int("waterIntakeMl"),
  status: sqliteEnum("status", ["ok", "warning", "critical"])
    .notNull()
    .default("ok"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const mortalities = sqliteTable("mortalities", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  count: int("count").notNull(),
  cause: varchar("cause", { length: 255 }),
});

export const feedUsages = sqliteTable("feed_usages", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  kg: decimal("kg", { precision: 12, scale: 1 }).notNull(),
  recipeId: bigint("recipeId", { mode: "number", unsigned: true }),
});

export const litter = sqliteTable("litter", {
  id: serial("id").primaryKey(),
  houseId: bigint("houseId", { mode: "number", unsigned: true }).notNull(),
  material: varchar("material", { length: 128 }).notNull(),
  thicknessCm: decimal("thicknessCm", { precision: 4, scale: 1 }).notNull(),
  moisturePct: decimal("moisturePct", { precision: 5, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  laidAt: date("laidAt", { mode: "string" }).notNull(),
  ...base,
});

/* ============================================================
   DZIENNIK PRODUKCJI — dzienne wpisy (upadki, woda, pasza, środowisko)
   ============================================================ */

export const dailyLogs = sqliteTable("daily_logs", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  mortality: int("mortality").notNull().default(0),
  culls: int("culls").notNull().default(0),
  waterLiters: decimal("waterLiters", { precision: 12, scale: 1 }),
  feedKg: decimal("feedKg", { precision: 12, scale: 1 }),
  tempC: decimal("tempC", { precision: 4, scale: 1 }),
  humidityPct: decimal("humidityPct", { precision: 4, scale: 1 }),
  ammoniaPpm: decimal("ammoniaPpm", { precision: 5, scale: 1 }),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  updatedBy: varchar("updatedBy", { length: 255 }).notNull().default("system"),
});

/* ============================================================
   PROGRAM ŻYWIENIA + WYDANIA PASZY
   ============================================================ */

export const feedPrograms = sqliteTable("feed_programs", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sex: sqliteEnum("sex", ["toms", "hens", "mixed"]).notNull().default("mixed"),
  ...base,
});

export const feedProgramStages = sqliteTable("feed_program_stages", {
  id: serial("id").primaryKey(),
  programId: bigint("programId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  dayFrom: int("dayFrom").notNull(),
  dayTo: int("dayTo").notNull(),
  recipeId: bigint("recipeId", { mode: "number", unsigned: true }),
  proteinTargetPct: decimal("proteinTargetPct", { precision: 5, scale: 2 }),
  energyTargetKcal: int("energyTargetKcal"),
  feedPerBirdG: int("feedPerBirdG"),
});

export const feedDeliveries = sqliteTable("feed_deliveries", {
  id: serial("id").primaryKey(),
  siloId: bigint("siloId", { mode: "number", unsigned: true }).notNull(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  recipeId: bigint("recipeId", { mode: "number", unsigned: true }),
  day: date("day", { mode: "string" }).notNull(),
  kg: decimal("kg", { precision: 12, scale: 1 }).notNull(),
  ...base,
});

/* ============================================================
   TRANSFERY — pełna genealogia stad
   ============================================================ */

export const transfers = sqliteTable("transfers", {
  id: serial("id").primaryKey(),
  sourceBatchId: bigint("sourceBatchId", { mode: "number", unsigned: true }).notNull(),
  targetBatchId: bigint("targetBatchId", { mode: "number", unsigned: true }).notNull(),
  birdCount: int("birdCount").notNull(),
  avgWeightG: int("avgWeightG"),
  transportMortality: int("transportMortality").notNull().default(0),
  transferDate: timestamp("transferDate").notNull(),
  durationMin: int("durationMin"),
  driver: varchar("driver", { length: 255 }),
  vehicle: varchar("vehicle", { length: 255 }),
  signatureFrom: varchar("signatureFrom", { length: 255 }),
  signatureTo: varchar("signatureTo", { length: 255 }),
  documentNo: varchar("documentNo", { length: 64 }).notNull(),
  ...base,
});

/* ============================================================
   HARMONOGRAM PRODUKCJI (Workflow Engine)
   ============================================================ */

export const scheduleEvents = sqliteTable("schedule_events", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  eventType: sqliteEnum("eventType", [
    "placement", "vaccination", "weighing", "feedChange", "litter",
    "treatment", "sampling", "washing", "disinfection", "housePrep", "sale",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  done: boolean("done").notNull().default(false),
  doneAt: timestamp("doneAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/* ============================================================
   ŻYWIENIE + MAGAZYN
   ============================================================ */

export const feedIngredients = sqliteTable("feed_ingredients", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  countryCode: varchar("countryCode", { length: 2 }).notNull(),
  pricePerTon: decimal("pricePerTon", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  proteinPct: decimal("proteinPct", { precision: 5, scale: 2 }).notNull(),
  energyKcal: int("energyKcal").notNull(),
  lysinePct: decimal("lysinePct", { precision: 5, scale: 3 }).notNull().default("0"),
  methioninePct: decimal("methioninePct", { precision: 5, scale: 3 })
    .notNull()
    .default("0"),
  fiberPct: decimal("fiberPct", { precision: 5, scale: 2 }).notNull().default("0"),
  fatPct: decimal("fatPct", { precision: 5, scale: 2 }).notNull().default("0"),
  calciumPct: decimal("calciumPct", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  phosphorusPct: decimal("phosphorusPct", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  stockTons: decimal("stockTons", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  /* Tom III — rozszerzona karta surowca */
  moisturePct: decimal("moisturePct", { precision: 5, scale: 2 }).notNull().default("12"),
  ashPct: decimal("ashPct", { precision: 5, scale: 2 }).notNull().default("0"),
  starchPct: decimal("starchPct", { precision: 5, scale: 2 }).notNull().default("0"),
  cystinePct: decimal("cystinePct", { precision: 5, scale: 3 }).notNull().default("0"),
  threoninePct: decimal("threoninePct", { precision: 5, scale: 3 }).notNull().default("0"),
  tryptophanPct: decimal("tryptophanPct", { precision: 5, scale: 3 }).notNull().default("0"),
  argininePct: decimal("argininePct", { precision: 5, scale: 3 }).notNull().default("0"),
  sodiumPct: decimal("sodiumPct", { precision: 5, scale: 3 }).notNull().default("0"),
  producer: varchar("producer", { length: 255 }),
  code: varchar("code", { length: 32 }),
  extraParams: json("extraParams"), // witaminy, mikroelementy, mykotoksyny itd. wg Tom III
  ...base,
});

export const recipes = sqliteTable("recipes", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  ageGroup: varchar("ageGroup", { length: 64 }).notNull(),
  strategy: sqliteEnum("strategy", ["cheapest", "maxGrowth", "balanced"]).notNull(),
  costPerTon: decimal("costPerTon", { precision: 10, scale: 2 }).notNull(),
  proteinPct: decimal("proteinPct", { precision: 5, scale: 2 }).notNull(),
  energyKcal: int("energyKcal").notNull(),
  lysinePct: decimal("lysinePct", { precision: 5, scale: 3 }).notNull(),
  explanation: text("explanation"),
  /* Tom III — metadane receptury */
  version: int("version").notNull().default(1),
  author: varchar("author", { length: 128 }).notNull().default("system"),
  status: sqliteEnum("status", ["draft", "active", "archived"]).notNull().default("active"),
  sex: sqliteEnum("sex", ["toms", "hens", "mixed"]).notNull().default("mixed"),
  season: sqliteEnum("season", ["winter", "summer", "all"]).notNull().default("all"),
  genetics: varchar("genetics", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const recipeItems = sqliteTable("recipe_items", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipeId", { mode: "number", unsigned: true }).notNull(),
  ingredientId: bigint("ingredientId", { mode: "number", unsigned: true }).notNull(),
  percent: decimal("percent", { precision: 5, scale: 2 }).notNull(),
});

/* ============================================================
   ETAP 2 — MODEL DANYCH: rozszerzenia biznesowe bez
   tworzenia równoległego systemu.
   ============================================================ */

export const birdGroups = sqliteTable("bird_groups", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  farmId: bigint("farmId", { mode: "number", unsigned: true }),
  houseId: bigint("houseId", { mode: "number", unsigned: true }),
  batchId: bigint("batchId", { mode: "number", unsigned: true }),
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  sex: sqliteEnum("sex", ["toms", "hens", "mixed"]).notNull().default("mixed"),
  ageGroup: int("ageGroup").notNull(),
  dayAge: int("dayAge").notNull().default(0),
  targetWeightKg: decimal("targetWeightKg", { precision: 8, scale: 3 }),
  productionGoal: varchar("productionGoal", { length: 128 }),
  status: sqliteEnum("status", ["active", "planned", "archived"])
    .notNull()
    .default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type BirdGroup = typeof birdGroups.$inferSelect;

export const dietRequirements = sqliteTable("diet_requirements", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  gender: sqliteEnum("gender", ["toms", "hens", "mixed"]).notNull().default("mixed"),
  ageGroup: int("ageGroup").notNull(),
  ageFromDays: int("ageFromDays").notNull(),
  ageToDays: int("ageToDays").notNull(),
  targetWeightKg: decimal("targetWeightKg", { precision: 8, scale: 3 }),
  energyKcal: int("energyKcal").notNull(),
  proteinPct: decimal("proteinPct", { precision: 5, scale: 2 }).notNull(),
  lysinePct: decimal("lysinePct", { precision: 5, scale: 3 }).notNull().default("0"),
  methioninePct: decimal("methioninePct", { precision: 5, scale: 3 }).notNull().default("0"),
  threoninePct: decimal("threoninePct", { precision: 5, scale: 3 }).notNull().default("0"),
  calciumPct: decimal("calciumPct", { precision: 5, scale: 2 }).notNull().default("0"),
  phosphorusPct: decimal("phosphorusPct", { precision: 5, scale: 2 }).notNull().default("0"),
  sodiumPct: decimal("sodiumPct", { precision: 5, scale: 3 }).notNull().default("0"),
  extraParams: json("extraParams"),
  sourceReference: varchar("sourceReference", { length: 255 }),
  status: sqliteEnum("status", ["draft", "active", "archived"])
    .notNull()
    .default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type DietRequirement = typeof dietRequirements.$inferSelect;

export const recipeBalances = sqliteTable("recipe_balances", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipeId", { mode: "number", unsigned: true }).notNull(),
  parameterCode: varchar("parameterCode", { length: 64 }).notNull(),
  requiredValue: decimal("requiredValue", { precision: 12, scale: 4 }).notNull(),
  recipeValue: decimal("recipeValue", { precision: 12, scale: 4 }).notNull(),
  differenceValue: decimal("differenceValue", { precision: 12, scale: 4 }).notNull(),
  status: sqliteEnum("status", ["PASS", "WARNING", "DEFICIT", "EXCESS"])
    .notNull()
    .default("PASS"),
  unit: varchar("unit", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RecipeBalance = typeof recipeBalances.$inferSelect;

export const batchDayProfiles = sqliteTable("batch_day_profiles", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  dayAge: int("dayAge").notNull(),
  ageGroup: int("ageGroup").notNull(),
  targetWeightKg: decimal("targetWeightKg", { precision: 8, scale: 3 }),
  currentWeightKg: decimal("currentWeightKg", { precision: 8, scale: 3 }),
  feedRequirementKg: decimal("feedRequirementKg", { precision: 10, scale: 3 }),
  proteinTargetPct: decimal("proteinTargetPct", { precision: 5, scale: 2 }),
  energyTargetKcal: int("energyTargetKcal"),
  deviationPct: decimal("deviationPct", { precision: 6, scale: 2 }),
  status: sqliteEnum("status", ["PASS", "WARNING", "DEFICIT", "EXCESS"]) 
    .notNull()
    .default("PASS"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BatchDayProfile = typeof batchDayProfiles.$inferSelect;

export const houseQuickNotes = sqliteTable("house_quick_notes", {
  id: serial("id").primaryKey(),
  houseId: bigint("houseId", { mode: "number", unsigned: true }).notNull(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }),
  author: varchar("author", { length: 255 }).notNull().default("system"),
  category: sqliteEnum("category", [
    "OBSERVACJA",
    "ŻYWIENIE",
    "ZDROWIE",
    "ŚCIÓŁKA",
    "WODA",
    "WENTYLACJA",
    "TEMPERATURA",
    "PRODUKCJA",
    "INNE",
  ]).notNull().default("INNE"),
  noteText: text("noteText").notNull(),
  eventDate: date("eventDate", { mode: "string" }).notNull(),
  eventTime: varchar("eventTime", { length: 16 }),
  photoUrl: varchar("photoUrl", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HouseQuickNote = typeof houseQuickNotes.$inferSelect;

export const litterEvents = sqliteTable("litter_events", {
  id: serial("id").primaryKey(),
  houseId: bigint("houseId", { mode: "number", unsigned: true }).notNull(),
  sectorId: bigint("sectorId", { mode: "number", unsigned: true }),
  eventDate: date("eventDate", { mode: "string" }).notNull(),
  material: varchar("material", { length: 128 }).notNull(),
  quantityKg: decimal("quantityKg", { precision: 10, scale: 2 }).notNull(),
  areaM2: decimal("areaM2", { precision: 10, scale: 2 }),
  kgPerM2: decimal("kgPerM2", { precision: 6, scale: 2 }),
  reason: sqliteEnum("reason", [
    "wilgotna_sciółka",
    "zbrylenie",
    "okolice_poideł",
    "okolice_karmideł",
    "wejście",
    "strefa_odpoczynku",
    "inne",
  ]).notNull().default("inne"),
  beforeStatus: varchar("beforeStatus", { length: 255 }),
  afterStatus: varchar("afterStatus", { length: 255 }),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LitterEvent = typeof litterEvents.$inferSelect;

export const warehouses = sqliteTable("warehouses", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  capacityTons: decimal("capacityTons", { precision: 10, scale: 1 }).notNull(),
  ...base,
});

export const silos = sqliteTable("silos", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  capacityTons: decimal("capacityTons", { precision: 10, scale: 1 }).notNull(),
  currentTons: decimal("currentTons", { precision: 10, scale: 2 }).notNull().default("0"),
  recipeId: bigint("recipeId", { mode: "number", unsigned: true }),
  ...base,
});

/* ============================================================
   ZDROWIE
   ============================================================ */

export const treatments = sqliteTable("treatments", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  startedAt: date("startedAt", { mode: "string" }).notNull(),
  product: varchar("product", { length: 255 }).notNull(),
  activeSubstance: varchar("activeSubstance", { length: 255 }).notNull(),
  dose: varchar("dose", { length: 128 }).notNull(),
  reason: varchar("reason", { length: 255 }),
  withdrawalDays: int("withdrawalDays").notNull().default(0),
  vet: varchar("vet", { length: 255 }),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const vaccinations = sqliteTable("vaccinations", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  vaccine: varchar("vaccine", { length: 255 }).notNull(),
  method: varchar("method", { length: 128 }),
  done: boolean("done").notNull().default(false),
});

/* ============================================================
   EKONOMIA
   ============================================================ */

export const costs = sqliteTable("costs", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  category: sqliteEnum("category", [
    "chicks", "feed", "vet", "energy", "litter", "labor", "transport", "other",
  ]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  day: date("day", { mode: "string" }).notNull(),
  note: varchar("note", { length: 255 }),
});

export const sales = sqliteTable("sales", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  birdCount: int("birdCount").notNull(),
  totalWeightKg: decimal("totalWeightKg", { precision: 12, scale: 1 }).notNull(),
  pricePerKg: decimal("pricePerKg", { precision: 6, scale: 3 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  buyer: varchar("buyer", { length: 255 }),
});


/* ============================================================
   ERP — łańcuch dostaw, finanse, laboratorium, klimat, energia,
   utrzymanie ruchu, bioasekuracja, dokumenty, zadania, komunikacja
   ============================================================ */

export const suppliers = sqliteTable("suppliers", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: sqliteEnum("category", ["feed", "chicks", "medicine", "equipment", "energy", "transport", "other"]).notNull(),
  countryCode: varchar("countryCode", { length: 2 }),
  nip: varchar("nip", { length: 32 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  rating: int("rating").notNull().default(3),
  ...base,
});

export const purchaseOrders = sqliteTable("purchase_orders", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  supplierId: bigint("supplierId", { mode: "number", unsigned: true }).notNull(),
  number: varchar("number", { length: 64 }).notNull(),
  item: varchar("item", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 14, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 16 }).notNull().default("kg"),
  priceNet: decimal("priceNet", { precision: 14, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  orderDate: date("orderDate", { mode: "string" }).notNull(),
  deliveryDate: date("deliveryDate", { mode: "string" }),
  orderStatus: sqliteEnum("orderStatus", ["draft", "sent", "confirmed", "delivered", "cancelled"]).notNull().default("draft"),
  ...base,
});

export const contracts = sqliteTable("contracts", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  party: varchar("party", { length: 255 }).notNull(),
  kind: sqliteEnum("kind", ["purchase", "sale", "service", "lease"]).notNull(),
  number: varchar("number", { length: 64 }).notNull(),
  validFrom: date("validFrom", { mode: "string" }).notNull(),
  validTo: date("validTo", { mode: "string" }),
  valueEur: decimal("valueEur", { precision: 14, scale: 2 }),
  terms: text("terms"),
  ...base,
});

export const invoices = sqliteTable("invoices", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  number: varchar("number", { length: 64 }).notNull(),
  kind: sqliteEnum("kind", ["sale", "purchase"]).notNull(),
  counterparty: varchar("counterparty", { length: 255 }).notNull(),
  issueDate: date("issueDate", { mode: "string" }).notNull(),
  dueDate: date("dueDate", { mode: "string" }),
  amountNet: decimal("amountNet", { precision: 14, scale: 2 }).notNull(),
  vatPct: int("vatPct").notNull().default(23),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  paid: boolean("paid").notNull().default(false),
  batchId: bigint("batchId", { mode: "number", unsigned: true }),
  ...base,
});

export const medicines = sqliteTable("medicines", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  substance: varchar("substance", { length: 255 }),
  form: varchar("form", { length: 64 }),
  stockQty: decimal("stockQty", { precision: 12, scale: 2 }).notNull().default("0"),
  unit: varchar("unit", { length: 16 }).notNull().default("ml"),
  expiryDate: date("expiryDate", { mode: "string" }),
  minStock: decimal("minStock", { precision: 12, scale: 2 }).notNull().default("0"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }),
  ...base,
});

export const labResults = sqliteTable("lab_results", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }),
  sampleType: sqliteEnum("sampleType", ["blood", "swab", "water", "feed", "litter", "carcass"]).notNull(),
  testName: varchar("testName", { length: 255 }).notNull(),
  resultValue: varchar("resultValue", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 32 }),
  refRange: varchar("refRange", { length: 64 }),
  verdict: sqliteEnum("verdict", ["ok", "warning", "critical"]).notNull().default("ok"),
  labName: varchar("labName", { length: 255 }),
  day: date("day", { mode: "string" }).notNull(),
  ...base,
});

export const climateLogs = sqliteTable("climate_logs", {
  id: serial("id").primaryKey(),
  houseId: bigint("houseId", { mode: "number", unsigned: true }).notNull(),
  ts: timestamp("ts").defaultNow().notNull(),
  tempC: decimal("tempC", { precision: 4, scale: 1 }),
  humidityPct: decimal("humidityPct", { precision: 4, scale: 1 }),
  co2Ppm: int("co2Ppm"),
  ammoniaPpm: decimal("ammoniaPpm", { precision: 5, scale: 1 }),
  ventilationPct: int("ventilationPct"),
  source: varchar("source", { length: 32 }).notNull().default("sensor"),
});

export const energyLogs = sqliteTable("energy_logs", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(),
  kind: sqliteEnum("kind", ["power", "gas", "water", "fuel"]).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  consumption: decimal("consumption", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 16 }).notNull(),
  costEur: decimal("costEur", { precision: 12, scale: 2 }).notNull(),
  ...base,
});

export const maintenanceTickets = sqliteTable("maintenance_tickets", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(),
  houseId: bigint("houseId", { mode: "number", unsigned: true }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: sqliteEnum("priority", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  ticketStatus: sqliteEnum("ticketStatus", ["open", "in_progress", "done", "cancelled"]).notNull().default("open"),
  reportedBy: varchar("reportedBy", { length: 255 }).notNull().default("system"),
  dueDate: date("dueDate", { mode: "string" }),
  ...base,
});

export const biosecurityChecks = sqliteTable("biosecurity_checks", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  area: varchar("area", { length: 128 }).notNull(),
  checkName: varchar("checkName", { length: 255 }).notNull(),
  passed: boolean("passed").notNull().default(true),
  score: int("score"),
  inspector: varchar("inspector", { length: 255 }).notNull().default("system"),
  note: varchar("note", { length: 500 }),
  ...base,
});

export const documents = sqliteTable("documents", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: sqliteEnum("category", ["vet", "contract", "invoice", "protocol", "certificate", "other"]).notNull().default("other"),
  reference: varchar("reference", { length: 128 }),
  docDate: date("docDate", { mode: "string" }).notNull(),
  url: varchar("url", { length: 500 }),
  note: varchar("note", { length: 500 }),
  ...base,
});

export const tasks = sqliteTable("tasks", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignee: varchar("assignee", { length: 255 }),
  dueDate: date("dueDate", { mode: "string" }),
  priority: sqliteEnum("priority", ["low", "medium", "high"]).notNull().default("medium"),
  done: boolean("done").notNull().default(false),
  ...base,
});

export const messages = sqliteTable("messages", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  author: varchar("author", { length: 255 }).notNull().default("system"),
  channel: varchar("channel", { length: 64 }).notNull().default("general"),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  severity: sqliteEnum("severity", ["info", "warning", "critical"]).notNull().default("info"),
  title: varchar("title", { length: 255 }).notNull(),
  body: varchar("body", { length: 500 }),
  link: varchar("link", { length: 255 }),
  read: boolean("read_flag").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const hatcheryBatches = sqliteTable("hatchery_batches", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  geneticLineId: bigint("geneticLineId", { mode: "number", unsigned: true }).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  eggsSet: int("eggsSet").notNull(),
  fertilePct: decimal("fertilePct", { precision: 5, scale: 2 }),
  hatchedCount: int("hatchedCount"),
  hatchPct: decimal("hatchPct", { precision: 5, scale: 2 }),
  setDate: date("setDate", { mode: "string" }).notNull(),
  hatchDate: date("hatchDate", { mode: "string" }),
  ...base,
});

export type AuditLog = typeof auditLog.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type GeneticLine = typeof geneticLines.$inferSelect;
export type Farm = typeof farms.$inferSelect;
export type House = typeof houses.$inferSelect;
export type Sector = typeof sectors.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type Weighing = typeof weighings.$inferSelect;
export type Select = typeof selects.$inferSelect;
export type Litter = typeof litter.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type FeedIngredient = typeof feedIngredients.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeItem = typeof recipeItems.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type Silo = typeof silos.$inferSelect;
export type Treatment = typeof treatments.$inferSelect;
export type Vaccination = typeof vaccinations.$inferSelect;
export type Cost = typeof costs.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Mortality = typeof mortalities.$inferSelect;
export type FeedUsage = typeof feedUsages.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type FeedProgram = typeof feedPrograms.$inferSelect;
export type FeedProgramStage = typeof feedProgramStages.$inferSelect;
export type FeedDelivery = typeof feedDeliveries.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Medicine = typeof medicines.$inferSelect;
export type LabResult = typeof labResults.$inferSelect;
export type ClimateLog = typeof climateLogs.$inferSelect;
export type EnergyLog = typeof energyLogs.$inferSelect;
export type MaintenanceTicket = typeof maintenanceTickets.$inferSelect;
export type BiosecurityCheck = typeof biosecurityChecks.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type HatcheryBatch = typeof hatcheryBatches.$inferSelect;

/* ============================================================
   LUKI Z DOKUMENTACJI — zdrowie (choroby, nekropsja, karencja),
   magazyn (partie/loty, ruchy, lokalizacje), ekonomia
   (scenariusze, benchmarki), żywienie (historia receptur,
   dokładność prognoz, profile eksperckie), integracje,
   generyczny rejestr encji (odpowiednik /v1/entities)
   ============================================================ */

export const diseases = sqliteTable("diseases", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  latinName: varchar("latinName", { length: 255 }),
  category: sqliteEnum("category", ["viral", "bacterial", "parasitic", "metabolic", "fungal", "other"]).notNull(),
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  treatmentProtocol: text("treatmentProtocol"),
  prevention: text("prevention"),
  severity: sqliteEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  ...base,
});

export const necropsy = sqliteTable("necropsy", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  birdCount: int("birdCount").notNull().default(1),
  findings: text("findings").notNull(),
  suspectedDiseaseId: bigint("suspectedDiseaseId", { mode: "number", unsigned: true }),
  vet: varchar("vet", { length: 255 }).notNull().default("system"),
  verdict: varchar("verdict", { length: 255 }),
  ...base,
});

export const withdrawalPeriods = sqliteTable("withdrawal_periods", {
  id: serial("id").primaryKey(),
  treatmentId: bigint("treatmentId", { mode: "number", unsigned: true }).notNull(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  medicine: varchar("medicine", { length: 255 }).notNull(),
  startDay: date("startDay", { mode: "string" }).notNull(),
  withdrawalDays: int("withdrawalDays").notNull(),
  safeFrom: date("safeFrom", { mode: "string" }).notNull(),
  ...base,
});

/* --- magazyn: partie (loty) z traceability FIFO/FEFO --- */
export const warehouseLots = sqliteTable("warehouse_lots", {
  id: serial("id").primaryKey(),
  warehouseId: bigint("warehouseId", { mode: "number", unsigned: true }).notNull(),
  product: varchar("product", { length: 255 }).notNull(),
  lotNumber: varchar("lotNumber", { length: 64 }).notNull(),
  qty: decimal("qty", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 16 }).notNull().default("kg"),
  receivedDate: date("receivedDate", { mode: "string" }).notNull(),
  expiryDate: date("expiryDate", { mode: "string" }),
  supplierId: bigint("supplierId", { mode: "number", unsigned: true }),
  ...base,
});

export const stockMovements = sqliteTable("stock_movements", {
  id: serial("id").primaryKey(),
  lotId: bigint("lotId", { mode: "number", unsigned: true }).notNull(),
  kind: sqliteEnum("kind", ["in", "out", "transfer", "adjust"]).notNull(),
  qty: decimal("qty", { precision: 12, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 128 }),
  batchId: bigint("batchId", { mode: "number", unsigned: true }),
  day: date("day", { mode: "string" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/* --- ekonomia: scenariusze i benchmarki --- */
export const scenarios = sqliteTable("scenarios", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  assumptions: json("assumptions").notNull(),
  result: json("result").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const benchmarks = sqliteTable("benchmarks", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }),
  metric: varchar("metric", { length: 64 }).notNull(),
  value: decimal("value", { precision: 12, scale: 4 }).notNull(),
  period: varchar("period", { length: 32 }).notNull(),
  source: varchar("source", { length: 64 }).notNull().default("internal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/* --- żywienie: historia zmian receptur i dokładność prognoz --- */
export const recipeHistory = sqliteTable("recipe_history", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipeId", { mode: "number", unsigned: true }).notNull(),
  changeNote: varchar("changeNote", { length: 500 }).notNull(),
  oldProfile: json("oldProfile"),
  newProfile: json("newProfile"),
  expertReport: text("expertReport"),
  author: varchar("author", { length: 255 }).notNull().default("system"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const forecastAccuracy = sqliteTable("forecast_accuracy", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  metric: varchar("metric", { length: 64 }).notNull(),
  predicted: decimal("predicted", { precision: 12, scale: 4 }).notNull(),
  actual: decimal("actual", { precision: 12, scale: 4 }).notNull(),
  accuracyPct: decimal("accuracyPct", { precision: 6, scale: 2 }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/* --- integracje między modułami (sourceModule -> targetModule) --- */
export const integrations = sqliteTable("integrations", {
  id: serial("id").primaryKey(),
  sourceModule: varchar("sourceModule", { length: 64 }).notNull(),
  targetModule: varchar("targetModule", { length: 64 }).notNull(),
  kind: sqliteEnum("kind", ["api", "webhook", "device", "file"]).notNull().default("api"),
  config: json("config"),
  enabled: boolean("enabled").notNull().default(true),
  ...base,
});

/* --- generyczny rejestr encji dynamicznych (odpowiednik /v1/entities/:entity) --- */
export const dynamicEntities = sqliteTable("dynamic_entities", {
  id: serial("id").primaryKey(),
  entity: varchar("entity", { length: 64 }).notNull(),
  data: json("data").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
export type Disease = typeof diseases.$inferSelect;
export type Necropsy = typeof necropsy.$inferSelect;
export type WithdrawalPeriod = typeof withdrawalPeriods.$inferSelect;
export type WarehouseLot = typeof warehouseLots.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
/* --- klucze API do wpinania komputerów/czujników/systemów zewnętrznych (ingest danych) --- */
export const apiKeys = sqliteTable("api_keys", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 128 }).notNull(),
  keyHash: varchar("keyHash", { length: 64 }).notNull().unique(), // sha256 klucza — samego klucza nie przechowujemy
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(), // do rozpoznania na liście
  active: boolean("active").notNull().default(true),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;

export type Benchmark = typeof benchmarks.$inferSelect;
export type RecipeHistory = typeof recipeHistory.$inferSelect;
export type ForecastAccuracy = typeof forecastAccuracy.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type DynamicEntity = typeof dynamicEntities.$inferSelect;

/* ============================================================
   FEED INTELLIGENCE — rozszerzenie domenowe (port z FOUNDATION feed-module)
   Tabele ADDITIVE: nie modyfikują istniejących tabel KIMI.
   Źródło mapowania: BTE_PHASE1_DATA_CONTRACT.md §1 (poz. 9–13)
   ============================================================ */

/* --- Normy żywieniowe per faza wzrostu (FOUNDATION: NutritionalStandard) --- */
export const nutritionalStandards = sqliteTable("nutritional_standards", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(), // np. "Indyk brojler — starter 0–14 dni"
  code: varchar("code", { length: 64 }).notNull(),
  gender: sqliteEnum("gender", ["toms", "hens", "mixed"]).notNull().default("mixed"),
  productionType: sqliteEnum("productionType", ["broiler", "breeder"]).notNull().default("broiler"),
  phase: sqliteEnum("phase", ["starter", "grower", "finisher", "breeder_maintenance"]).notNull(),
  ageFromDays: int("ageFromDays").notNull(),
  ageToDays: int("ageToDays").notNull(),
  targetWeightFromKg: decimal("targetWeightFromKg", { precision: 6, scale: 3 }),
  targetWeightToKg: decimal("targetWeightToKg", { precision: 6, scale: 3 }),
  /* makroskładniki — zakresy min/max jak w FOUNDATION */
  meMinKcal: int("meMinKcal").notNull(),
  meMaxKcal: int("meMaxKcal").notNull(),
  proteinMinPct: decimal("proteinMinPct", { precision: 5, scale: 2 }).notNull(),
  proteinMaxPct: decimal("proteinMaxPct", { precision: 5, scale: 2 }).notNull(),
  fatMinPct: decimal("fatMinPct", { precision: 5, scale: 2 }),
  fatMaxPct: decimal("fatMaxPct", { precision: 5, scale: 2 }),
  fiberMaxPct: decimal("fiberMaxPct", { precision: 5, scale: 2 }),
  /* aminokwasy / minerały — zakresy (min wymagane, max opcjonalne) */
  lysineMinPct: decimal("lysineMinPct", { precision: 5, scale: 3 }).notNull(),
  methionineMinPct: decimal("methionineMinPct", { precision: 5, scale: 3 }).notNull(),
  calciumMinPct: decimal("calciumMinPct", { precision: 5, scale: 2 }),
  calciumMaxPct: decimal("calciumMaxPct", { precision: 5, scale: 2 }),
  phosphorusMinPct: decimal("phosphorusMinPct", { precision: 5, scale: 2 }),
  sodiumMinPct: decimal("sodiumMinPct", { precision: 5, scale: 3 }),
  sodiumMaxPct: decimal("sodiumMaxPct", { precision: 5, scale: 3 }),
  extraParams: json("extraParams"), // pozostałe normy (treonina, witaminy itd.)
  ...base,
});
export type NutritionalStandard = typeof nutritionalStandards.$inferSelect;

/* --- Partie surowców (FOUNDATION: MaterialBatch) --- */
export const materialBatches = sqliteTable("material_batches", {
  id: serial("id").primaryKey(),
  ingredientId: bigint("ingredientId", { mode: "number", unsigned: true }).notNull(), // → feed_ingredients
  batchNumber: varchar("batchNumber", { length: 64 }).notNull(),
  supplierId: bigint("supplierId", { mode: "number", unsigned: true }), // → suppliers
  quantityTons: decimal("quantityTons", { precision: 10, scale: 3 }).notNull(),
  pricePerTon: decimal("pricePerTon", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  receivedAt: date("receivedAt", { mode: "string" }).notNull(),
  expiresAt: date("expiresAt", { mode: "string" }),
  qualityNotes: text("qualityNotes"),
  labProfile: json("labProfile"), // zmierzone wartości partii (białko, wilgotność itd.)
  ...base,
});
export type MaterialBatch = typeof materialBatches.$inferSelect;

/* --- Substytucje surowców (FOUNDATION: RawMaterialSubstitution) --- */
export const materialSubstitutions = sqliteTable("material_substitutions", {
  id: serial("id").primaryKey(),
  ingredientId: bigint("ingredientId", { mode: "number", unsigned: true }).notNull(), // surowiec podstawowy
  substituteId: bigint("substituteId", { mode: "number", unsigned: true }).notNull(), // zamiennik → feed_ingredients
  maxReplacementPct: decimal("maxReplacementPct", { precision: 5, scale: 2 }).notNull(), // maks. % zastąpienia
  nutritionalPenaltyPct: decimal("nutritionalPenaltyPct", { precision: 5, scale: 2 }), // utrata wartości odżywczej %
  notes: text("notes"),
  ...base,
});
export type MaterialSubstitution = typeof materialSubstitutions.$inferSelect;

/* --- Interakcje między surowcami (FOUNDATION: MaterialInteraction) --- */
export const materialInteractions = sqliteTable("material_interactions", {
  id: serial("id").primaryKey(),
  ingredientAId: bigint("ingredientAId", { mode: "number", unsigned: true }).notNull(),
  ingredientBId: bigint("ingredientBId", { mode: "number", unsigned: true }).notNull(),
  type: sqliteEnum("type", ["synergy", "antagonism", "limit"]).notNull(),
  description: text("description").notNull(),
  maxCombinedPct: decimal("maxCombinedPct", { precision: 5, scale: 2 }), // dla type=limit
  ...base,
});
export type MaterialInteraction = typeof materialInteractions.$inferSelect;

/* --- Baza wiedzy o surowcach (FOUNDATION: MaterialKnowledgeEntry) --- */
export const knowledgeEntries = sqliteTable("knowledge_entries", {
  id: serial("id").primaryKey(),
  ingredientId: bigint("ingredientId", { mode: "number", unsigned: true }), // null = wpis ogólny
  type: sqliteEnum("type", ["publication", "manufacturer_guide", "standard", "common_mistake", "research_paper"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  source: varchar("source", { length: 255 }).notNull(), // NRC, CVB, INRA, producent…
  year: int("year"),
  authors: varchar("authors", { length: 500 }),
  url: varchar("url", { length: 1000 }),
  doi: varchar("doi", { length: 255 }),
  summary: text("summary").notNull(),
  keyFindings: json("keyFindings"), // string[]
  recommendations: json("recommendations"), // string[]
  commonMistake: text("commonMistake"), // dla type=common_mistake: opis błędu
  mistakeConsequence: text("mistakeConsequence"),
  mistakeSolution: text("mistakeSolution"),
  credibility: decimal("credibility", { precision: 3, scale: 2 }).notNull().default("0.50"), // 0–1
  isPeerReviewed: boolean("isPeerReviewed").notNull().default(false),
  applicablePhases: json("applicablePhases"), // string[] faz wzrostu
  tags: json("tags"), // string[]
  ...base,
});
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;

/* --- Eksperymenty recepturowe (FOUNDATION: ExperimentScenario) --- */
export const experimentScenarios = sqliteTable("experiment_scenarios", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  baseRecipeId: bigint("baseRecipeId", { mode: "number", unsigned: true }).notNull(), // → recipes
  changes: json("changes").notNull(), // [{ ingredientId, action: "remove"|"add"|"adjust", value }]
  experimentStatus: sqliteEnum("experimentStatus", ["draft", "running", "completed", "abandoned"]).notNull().default("draft"),
  results: json("results"), // wyliczony profil po zmianach + porównanie z bazą
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  ...base,
});
export type ExperimentScenario = typeof experimentScenarios.$inferSelect;

/* --- Prognozy zużycia/wyników stada (FOUNDATION: BatchForecast) --- */
export const batchForecasts = sqliteTable("batch_forecasts", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  weeklyForecasts: json("weeklyForecasts").notNull(), // [{ week, ageDays, weight, feedConsumption, fcr, mortality }]
  predictedFcr: decimal("predictedFcr", { precision: 4, scale: 3 }).notNull(),
  predictedAdg: decimal("predictedAdg", { precision: 5, scale: 3 }).notNull(),
  predictedEpef: decimal("predictedEpef", { precision: 6, scale: 3 }),
  predictedMortalityPct: decimal("predictedMortalityPct", { precision: 5, scale: 2 }),
  predictedFeedTons: decimal("predictedFeedTons", { precision: 8, scale: 3 }),
  predictedFeedCost: decimal("predictedFeedCost", { precision: 12, scale: 2 }),
  predictedMargin: decimal("predictedMargin", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  assumptions: json("assumptions"), // string[]
  confidenceIntervals: json("confidenceIntervals"), // { metric: { low, high } }
  ...base,
});
export type BatchForecast = typeof batchForecasts.$inferSelect;

/* --- Alerty paszowe z cyklem życia (FOUNDATION: FeedAlert) --- */
export const feedAlerts = sqliteTable("feed_alerts", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  type: sqliteEnum("type", ["price_spike", "stock_low", "stock_out", "quality_deviation", "standard_violation", "forecast_deviation", "interaction_warning"]).notNull(),
  severity: sqliteEnum("severity", ["info", "warning", "critical"]).notNull().default("warning"),
  sourceType: sqliteEnum("sourceType", ["recipe", "ingredient", "batch", "standard"]).notNull(),
  sourceId: bigint("sourceId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  parameter: varchar("parameter", { length: 64 }), // np. "sodium"
  actualValue: decimal("actualValue", { precision: 12, scale: 4 }),
  thresholdValue: decimal("thresholdValue", { precision: 12, scale: 4 }),
  unit: varchar("unit", { length: 32 }),
  consequences: json("consequences"), // string[]
  recommendations: json("recommendations"), // string[]
  alertStatus: sqliteEnum("alertStatus", ["active", "acknowledged", "resolved"]).notNull().default("active"),
  acknowledgedBy: varchar("acknowledgedBy", { length: 255 }),
  acknowledgedAt: timestamp("acknowledgedAt"),
  resolvedAt: timestamp("resolvedAt"),
  ...base,
});
export type FeedAlert = typeof feedAlerts.$inferSelect;

/* ============================================================
   HEALTH INTELLIGENCE — rozszerzenie domenowe (port z FOUNDATION health-intelligence-engine)
   Tabele ADDITIVE. Źródło mapowania: BTE_PHASE1_DATA_CONTRACT.md §1 (poz. 15–18)
   ============================================================ */

/* --- Programy szczepień (FOUNDATION: VaccinationProgram) --- */
export const vaccinationPrograms = sqliteTable("vaccination_programs", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  geneticLine: varchar("geneticLine", { length: 128 }), // FOUNDATION: breed
  description: text("description"),
  isDefault: boolean("isDefault").notNull().default(false),
  ...base,
});
export type VaccinationProgram = typeof vaccinationPrograms.$inferSelect;

/* --- Kroki programu szczepień (FOUNDATION: VaccinationStep) --- */
export const vaccinationProgramSteps = sqliteTable("vaccination_program_steps", {
  id: serial("id").primaryKey(),
  programId: bigint("programId", { mode: "number", unsigned: true }).notNull(), // → vaccination_programs
  vaccineName: varchar("vaccineName", { length: 255 }).notNull(),
  ageDays: int("ageDays").notNull(), // dzień życia stada
  route: sqliteEnum("route", ["drinking_water", "spray", "injection_im", "injection_sc", "eye_drop", "wing_web"]).notNull(),
  dosePerBird: varchar("dosePerBird", { length: 64 }),
  notes: text("notes"),
  ...base,
});
export type VaccinationProgramStep = typeof vaccinationProgramSteps.$inferSelect;

/* --- Zdrowotne rekordy zbiorcze (FOUNDATION: HealthRecord) --- */
export const healthRecords = sqliteTable("health_records", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches (FOUNDATION: flockId)
  type: sqliteEnum("type", ["vaccination", "treatment", "supplement", "necropsy", "inspection"]).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  description: text("description").notNull(),
  performedBy: varchar("performedBy", { length: 255 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  ...base,
});
export type HealthRecord = typeof healthRecords.$inferSelect;

/* --- Pliki przy rekordach zdrowia (FOUNDATION: HealthImage + HealthDocument) --- */
export const healthRecordFiles = sqliteTable("health_record_files", {
  id: serial("id").primaryKey(),
  healthRecordId: bigint("healthRecordId", { mode: "number", unsigned: true }).notNull(), // → health_records
  kind: sqliteEnum("kind", ["image", "document"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  filePath: varchar("filePath", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  sizeBytes: int("sizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HealthRecordFile = typeof healthRecordFiles.$inferSelect;

/* --- Referencje naukowe chorób (FOUNDATION: DiseaseReference) --- */
export const diseaseReferences = sqliteTable("disease_references", {
  id: serial("id").primaryKey(),
  diseaseId: bigint("diseaseId", { mode: "number", unsigned: true }).notNull(), // → diseases
  title: varchar("title", { length: 500 }).notNull(),
  authors: varchar("authors", { length: 500 }),
  journal: varchar("journal", { length: 255 }),
  year: int("year"),
  url: varchar("url", { length: 1000 }),
  ...base,
});
export type DiseaseReference = typeof diseaseReferences.$inferSelect;

/* --- Wyniki oceny ryzyka stada (FOUNDATION: RiskScore) --- */
export const riskScores = sqliteTable("risk_scores", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches (FOUNDATION: flockId)
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
  healthScore: int("healthScore").notNull(), // 0–100
  productionScore: int("productionScore").notNull(),
  welfareScore: int("welfareScore").notNull(),
  riskScore: int("riskScore").notNull(), // wynik zbiorczy 0–100 (100 = najniższe ryzyko)
  factors: json("factors"), // { mortalityFactor, fcrFactor, environmentFactor, treatmentFactor, ageFactor }
  ...base,
});
export type RiskScore = typeof riskScores.$inferSelect;

/* --- Logi doradcy AI zdrowia (FOUNDATION: AIAdvisorLog) --- */
export const aiAdvisorLogs = sqliteTable("ai_advisor_logs", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  symptoms: json("symptoms").notNull(), // string[]
  inputData: json("inputData").notNull(), // pełny payload zapytania
  recommendations: json("recommendations").notNull(), // DiseasePrediction[]
  confidence: decimal("confidence", { precision: 4, scale: 3 }), // 0–1
  disclaimerShown: boolean("disclaimerShown").notNull().default(true),
  veterinarian: varchar("veterinarian", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiAdvisorLog = typeof aiAdvisorLogs.$inferSelect;

/* --- Dzienne metryki zdrowotno-produkcyjne stada (FOUNDATION: DailyMetric) --- */
export const healthDailyMetrics = sqliteTable("health_daily_metrics", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  day: date("day", { mode: "string" }).notNull(),
  mortalityRate: decimal("mortalityRate", { precision: 6, scale: 3 }), // % dzienny
  fcr: decimal("fcr", { precision: 4, scale: 3 }),
  adgGrams: decimal("adgGrams", { precision: 6, scale: 1 }),
  waterPerFeedRatio: decimal("waterPerFeedRatio", { precision: 4, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HealthDailyMetric = typeof healthDailyMetrics.$inferSelect;


/* ============================================================
   BTE HYBRID — PRODUCTION ENGINE (FOUNDATION → KIMI)
   Tabele addytywne; istniejące tabele KIMI bez zmian.
   ============================================================ */

/* --- Analiza AI dnia produkcji (FOUNDATION: AIAnalysis) --- */
export const productionAnalyses = sqliteTable("production_analyses", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  dayNumber: int("dayNumber").notNull(),
  fcr: decimal("fcr", { precision: 5, scale: 3 }),
  adgGrams: decimal("adgGrams", { precision: 7, scale: 2 }),
  epef: decimal("epef", { precision: 7, scale: 2 }),
  mortalityRate: decimal("mortalityRate", { precision: 6, scale: 4 }), // 0–1
  tempScore: decimal("tempScore", { precision: 5, scale: 1 }),
  waterScore: decimal("waterScore", { precision: 5, scale: 1 }),
  feedScore: decimal("feedScore", { precision: 5, scale: 1 }),
  humidityScore: decimal("humidityScore", { precision: 5, scale: 1 }),
  co2Score: decimal("co2Score", { precision: 5, scale: 1 }),
  nh3Score: decimal("nh3Score", { precision: 5, scale: 1 }),
  dayScore: decimal("dayScore", { precision: 5, scale: 1 }).notNull(), // 0–100
  riskLevel: sqliteEnum("riskLevel", ["low", "medium", "high", "critical"]).notNull(),
  detectedIssues: json("detectedIssues"), // {type,severity,description}[]
  possibleCauses: json("possibleCauses"), // string[]
  recommendations: json("recommendations"), // string[]
  forecast7Days: json("forecast7Days"), // {day,predictedWeight,predictedMortality,predictedFCR}[]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProductionAnalysis = typeof productionAnalyses.$inferSelect;

/* --- Prognoza końca rzutu (FOUNDATION: AIForecast) --- */
export const productionForecasts = sqliteTable("production_forecasts", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  predictedFinalWeight: decimal("predictedFinalWeight", { precision: 8, scale: 1 }).notNull(), // g
  predictedFcr: decimal("predictedFcr", { precision: 5, scale: 3 }).notNull(),
  predictedEpef: decimal("predictedEpef", { precision: 7, scale: 2 }).notNull(),
  totalFeedConsumptionKg: decimal("totalFeedConsumptionKg", { precision: 12, scale: 1 }).notNull(),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }).notNull(),
  predictedRevenue: decimal("predictedRevenue", { precision: 14, scale: 2 }).notNull(),
  predictedProfit: decimal("predictedProfit", { precision: 14, scale: 2 }).notNull(),
  predictedMargin: decimal("predictedMargin", { precision: 6, scale: 2 }).notNull(), // %
  accuracyPercent: decimal("accuracyPercent", { precision: 5, scale: 1 }),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});
export type ProductionForecast = typeof productionForecasts.$inferSelect;

/* --- Alerty produkcyjne AI (FOUNDATION: Alert) --- */
export const productionAlerts = sqliteTable("production_alerts", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  type: sqliteEnum("type", [
    "fcr_deterioration", "feed_drop", "water_spike", "mortality_rise",
    "environmental", "nutritional", "health", "temperature_anomaly",
    "humidity_anomaly", "co2_high", "nh3_high",
  ]).notNull(),
  severity: sqliteEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  justification: text("justification").notNull(), // uzasadnienie AI
  isResolved: boolean("isResolved").notNull().default(false),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: varchar("resolvedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProductionAlert = typeof productionAlerts.$inferSelect;

/* --- Zdarzenia produkcyjne / oś czasu rzutu (FOUNDATION: ProductionEvent) --- */
export const productionEvents = sqliteTable("production_events", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  eventType: sqliteEnum("eventType", [
    "chick_receipt", "weighing", "feed_change", "vaccination", "treatment",
    "breakdown", "alert", "temp_change", "transfer", "sale", "cleaning",
    "inspection", "daily_log",
  ]).notNull(),
  dayNumber: int("dayNumber").notNull().default(0),
  description: varchar("description", { length: 500 }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProductionEvent = typeof productionEvents.$inferSelect;


/* ============================================================
   BTE HYBRID — WAREHOUSE (FOUNDATION → KIMI)
   Tabele addytywne; istniejące tabele KIMI (warehouses, silos,
   warehouse_lots, stock_movements) bez zmian.
   ============================================================ */

/* --- Katalog produktów magazynowych (FOUNDATION: Product) --- */
export const warehouseProducts = sqliteTable("warehouse_products", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: sqliteEnum("category", [
    "feed_raw", "feed_ready", "premix", "concentrate", "oil", "vitamin",
    "amino_acid", "mineral", "medication", "vaccine", "disinfectant",
    "bedding", "gas", "pellet", "consumable", "spare_part", "fuel",
    "office", "custom",
  ]).notNull(),
  subcategory: varchar("subcategory", { length: 128 }),
  unit: varchar("unit", { length: 16 }).notNull().default("kg"),
  minStock: decimal("minStock", { precision: 12, scale: 2 }).notNull().default("0"),
  maxStock: decimal("maxStock", { precision: 12, scale: 2 }),
  reorderPoint: decimal("reorderPoint", { precision: 12, scale: 2 }).notNull().default("0"),
  safetyStock: decimal("safetyStock", { precision: 12, scale: 2 }).notNull().default("0"),
  leadTimeDays: int("leadTimeDays").notNull().default(7),
  shelfLifeDays: int("shelfLifeDays"),
  isActive: boolean("isActive").notNull().default(true),
  /* pola wiedzy AI (FOUNDATION Product) */
  fcrImpact: decimal("fcrImpact", { precision: 4, scale: 2 }), // -1..+1
  adgImpact: decimal("adgImpact", { precision: 6, scale: 1 }), // g/dzień
  healthImpact: varchar("healthImpact", { length: 500 }),
  bestPractices: text("bestPractices"),
  dosageInfo: varchar("dosageInfo", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WarehouseProduct = typeof warehouseProducts.$inferSelect;

/* --- Rozszerzenie partii: jakość + kwarantanna + koszty (FOUNDATION: Lot extra) --- */
export const warehouseLotDetails = sqliteTable("warehouse_lot_details", {
  id: serial("id").primaryKey(),
  lotId: bigint("lotId", { mode: "number", unsigned: true }).notNull().unique(), // → warehouse_lots
  manufacturer: varchar("manufacturer", { length: 255 }),
  productionDate: date("productionDate", { mode: "string" }),
  purchaseCost: decimal("purchaseCost", { precision: 12, scale: 4 }),
  currentCost: decimal("currentCost", { precision: 12, scale: 4 }),
  qrCode: varchar("qrCode", { length: 128 }),
  barcode: varchar("barcode", { length: 128 }),
  certificateUrl: varchar("certificateUrl", { length: 500 }),
  /* parametry jakości */
  moisture: decimal("moisture", { precision: 5, scale: 2 }),
  protein: decimal("protein", { precision: 5, scale: 2 }),
  energy: decimal("energy", { precision: 7, scale: 1 }),
  mycotoxins: json("mycotoxins"), // {aflatoxin, ochratoxin, fumonisin, …}
  labResults: json("labResults"),
  /* kwarantanna */
  isQuarantined: boolean("isQuarantined").notNull().default(false),
  quarantineReason: varchar("quarantineReason", { length: 500 }),
  releasedAt: timestamp("releasedAt"),
  releasedBy: varchar("releasedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type WarehouseLotDetail = typeof warehouseLotDetails.$inferSelect;

/* --- Snapshot stanu magazynowego (FOUNDATION: StockItem) --- */
export const warehouseStockItems = sqliteTable("warehouse_stock_items", {
  id: serial("id").primaryKey(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(), // → warehouse_products
  warehouseId: bigint("warehouseId", { mode: "number", unsigned: true }).notNull(), // → warehouses
  quantity: decimal("quantity", { precision: 14, scale: 2 }).notNull().default("0"),
  reserved: decimal("reserved", { precision: 14, scale: 2 }).notNull().default("0"),
  available: decimal("available", { precision: 14, scale: 2 }).notNull().default("0"),
  unitCost: decimal("unitCost", { precision: 12, scale: 4 }).notNull().default("0"),
  totalValue: decimal("totalValue", { precision: 14, scale: 2 }).notNull().default("0"),
  lastUpdated: timestamp("lastUpdated")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type WarehouseStockItem = typeof warehouseStockItems.$inferSelect;

/* --- Bogaty dziennik ruchów magazynowych (FOUNDATION: StockMovement) --- */
export const warehouseMovements = sqliteTable("warehouse_movements", {
  id: serial("id").primaryKey(),
  lotId: bigint("lotId", { mode: "number", unsigned: true }), // → warehouse_lots
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  type: sqliteEnum("type", [
    "receipt", "issue", "transfer", "adjustment", "consumption", "return", "production",
  ]).notNull(),
  subtype: sqliteEnum("subtype", [
    "pz", "import", "own_prod", "return_in", "transfer_in", "brooder_in", "mixer_in",
    "rw", "wz", "consume_feed", "consume_med", "consume_bed", "consume_gas",
    "service", "sale", "disposal", "adjust",
    "wh_to_wh", "silo_to_silo", "farm_to_farm", "brooder_to_house",
    "house_to_house", "house_to_sale", "house_to_disposal",
  ]).notNull(),
  quantity: decimal("quantity", { precision: 14, scale: 2 }).notNull(),
  unitCost: decimal("unitCost", { precision: 12, scale: 4 }).notNull().default("0"),
  totalValue: decimal("totalValue", { precision: 14, scale: 2 }).notNull().default("0"),
  /* źródło / cel */
  fromWarehouseId: bigint("fromWarehouseId", { mode: "number", unsigned: true }),
  fromSiloId: bigint("fromSiloId", { mode: "number", unsigned: true }),
  fromHouseId: bigint("fromHouseId", { mode: "number", unsigned: true }),
  toWarehouseId: bigint("toWarehouseId", { mode: "number", unsigned: true }),
  toSiloId: bigint("toSiloId", { mode: "number", unsigned: true }),
  toHouseId: bigint("toHouseId", { mode: "number", unsigned: true }),
  /* referencje */
  batchId: bigint("batchId", { mode: "number", unsigned: true }),
  recipeId: bigint("recipeId", { mode: "number", unsigned: true }),
  documentNumber: varchar("documentNumber", { length: 64 }),
  documentType: varchar("documentType", { length: 32 }),
  notes: varchar("notes", { length: 500 }),
  /* jakość w momencie ruchu */
  moistureAtMove: decimal("moistureAtMove", { precision: 5, scale: 2 }),
  temperatureAtMove: decimal("temperatureAtMove", { precision: 4, scale: 1 }),
  performedBy: varchar("performedBy", { length: 255 }).notNull().default("system"),
  performedAt: timestamp("performedAt").defaultNow().notNull(),
});
export type WarehouseMovement = typeof warehouseMovements.$inferSelect;

/* --- Analiza AI zapasów (FOUNDATION: WarehouseAIAnalysis) --- */
export const warehouseAiAnalyses = sqliteTable("warehouse_ai_analyses", {
  id: serial("id").primaryKey(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  warehouseId: bigint("warehouseId", { mode: "number", unsigned: true }),
  avgDailyConsumption: decimal("avgDailyConsumption", { precision: 12, scale: 2 }).notNull(),
  currentStock: decimal("currentStock", { precision: 14, scale: 2 }).notNull(),
  daysOfSupply: decimal("daysOfSupply", { precision: 8, scale: 1 }).notNull(),
  stockoutRisk: decimal("stockoutRisk", { precision: 4, scale: 2 }).notNull(), // 0–1
  expiryRisk: decimal("expiryRisk", { precision: 4, scale: 2 }).notNull(), // 0–1
  rotationScore: int("rotationScore").notNull(), // 0–100
  predictedStockoutDate: date("predictedStockoutDate", { mode: "string" }),
  recommendedOrderQty: decimal("recommendedOrderQty", { precision: 12, scale: 2 }),
  recommendedOrderDate: date("recommendedOrderDate", { mode: "string" }),
  bestSupplierId: bigint("bestSupplierId", { mode: "number", unsigned: true }),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});
export type WarehouseAiAnalysis = typeof warehouseAiAnalyses.$inferSelect;

/* --- Alerty magazynowe (FOUNDATION: WarehouseAlert) --- */
export const warehouseAlerts = sqliteTable("warehouse_alerts", {
  id: serial("id").primaryKey(),
  type: sqliteEnum("type", [
    "low_stock", "expiring_soon", "expired", "feed_shortage", "overstock", "quarantine",
  ]).notNull(),
  severity: sqliteEnum("severity", ["info", "warning", "critical", "emergency"]).notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }),
  lotId: bigint("lotId", { mode: "number", unsigned: true }),
  warehouseId: bigint("warehouseId", { mode: "number", unsigned: true }),
  message: varchar("message", { length: 500 }).notNull(),
  details: json("details"),
  isResolved: boolean("isResolved").notNull().default(false),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: varchar("resolvedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WarehouseAlert = typeof warehouseAlerts.$inferSelect;


/* ============================================================
   BTE HYBRID — ECONOMICS (FOUNDATION → KIMI)
   Tabele addytywne; istniejące costs/sales/scenarios/benchmarks
   KIMI bez zmian.
   ============================================================ */

/* --- Wyniki analiz "co jeśli" (FOUNDATION: ScenarioResult) --- */
export const scenarioResults = sqliteTable("scenario_results", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /* parametry zmienione w scenariuszu */
  paramFeedPriceChange: decimal("paramFeedPriceChange", { precision: 6, scale: 2 }), // %
  paramSoyPriceChange: decimal("paramSoyPriceChange", { precision: 6, scale: 2 }), // %
  paramFcrChange: decimal("paramFcrChange", { precision: 5, scale: 2 }), // ±pkt
  paramMortalityChange: decimal("paramMortalityChange", { precision: 6, scale: 2 }), // %
  paramSaleDelayDays: int("paramSaleDelayDays"),
  paramGasPriceChange: decimal("paramGasPriceChange", { precision: 6, scale: 2 }), // %
  paramRecipeId: bigint("paramRecipeId", { mode: "number", unsigned: true }),
  /* wyniki */
  predictedCost: decimal("predictedCost", { precision: 14, scale: 2 }).notNull(),
  predictedMargin: decimal("predictedMargin", { precision: 14, scale: 2 }).notNull(),
  predictedProfit: decimal("predictedProfit", { precision: 14, scale: 2 }).notNull(),
  predictedCostPerKg: decimal("predictedCostPerKg", { precision: 10, scale: 4 }).notNull(),
  impactOnProfit: decimal("impactOnProfit", { precision: 14, scale: 2 }).notNull(),
  createdBy: varchar("createdBy", { length: 255 }).notNull().default("system"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ScenarioResult = typeof scenarioResults.$inferSelect;

/* --- Rekomendacje doradcy kosztów AI (FOUNDATION: AIAdvisor) --- */
export const economicsAiAdvisors = sqliteTable("economics_ai_advisors", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  date: timestamp("date").defaultNow().notNull(),
  category: sqliteEnum("category", [
    "feed", "energy", "health", "labor", "transport", "timing", "recipe", "general",
  ]).notNull(),
  priority: sqliteEnum("priority", ["critical", "high", "medium", "low"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  justification: text("justification").notNull(),
  estimatedSavings: decimal("estimatedSavings", { precision: 12, scale: 2 }),
  estimatedGain: decimal("estimatedGain", { precision: 12, scale: 2 }),
  actionTaken: boolean("actionTaken").notNull().default(false),
  actionResult: varchar("actionResult", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EconomicsAiAdvisor = typeof economicsAiAdvisors.$inferSelect;

/* --- Podsumowanie zarządcze rzutu (FOUNDATION: ExecutiveSummary) --- */
export const executiveSummaries = sqliteTable("executive_summaries", {
  id: serial("id").primaryKey(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  period: sqliteEnum("period", ["daily", "weekly", "monthly", "batch"]).notNull().default("batch"),
  strengths: json("strengths").notNull(), // string[]
  threats: json("threats").notNull(), // string[]
  topCosts: json("topCosts").notNull(), // {category, amount, percent}[]
  profitOpportunities: json("profitOpportunities").notNull(), // string[]
  endForecast: json("endForecast"), // {predictedWeight, predictedMargin, predictedProfit}
  recommendations: json("recommendations").notNull(), // {action, impact, priority}[]
  metricsSnapshot: json("metricsSnapshot"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});
export type ExecutiveSummary = typeof executiveSummaries.$inferSelect;

/* --- Wpisy benchmarkowe per rzut (FOUNDATION: BenchmarkEntry) --- */
export const benchmarkEntries = sqliteTable("benchmark_entries", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(), // → farms
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(), // → batches
  houseId: bigint("houseId", { mode: "number", unsigned: true }),
  period: varchar("period", { length: 32 }).notNull(), // np. "2026-W32"
  fcr: decimal("fcr", { precision: 5, scale: 3 }),
  adg: decimal("adg", { precision: 7, scale: 2 }),
  epef: decimal("epef", { precision: 7, scale: 2 }),
  costPerKg: decimal("costPerKg", { precision: 10, scale: 4 }),
  feedCostPerKg: decimal("feedCostPerKg", { precision: 10, scale: 4 }),
  mortalityRate: decimal("mortalityRate", { precision: 6, scale: 4 }), // 0–1
  margin: decimal("margin", { precision: 14, scale: 2 }),
  profit: decimal("profit", { precision: 14, scale: 2 }),
  farmRank: int("farmRank"),
  houseRank: int("houseRank"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BenchmarkEntry = typeof benchmarkEntries.$inferSelect;


/* ============================================================
   BTE HYBRID — IOT (FOUNDATION → KIMI)
   Tabele addytywne; istniejące climate_logs/energy_logs/silos/
   notifications KIMI bez zmian.
   ============================================================ */

/* --- Typy urządzeń IoT (FOUNDATION: DeviceType) --- */
export const iotDeviceTypes = sqliteTable("iot_device_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: sqliteEnum("category", [
    "climate_controller", "temperature_sensor", "humidity_sensor", "co2_sensor",
    "nh3_sensor", "h2s_sensor", "airflow_sensor", "energy_meter", "gas_meter",
    "water_meter", "feed_scale", "feed_silo_level", "feed_auto", "drinker",
    "ai_camera", "bird_scale", "mortality_counter", "door_sensor", "generator",
    "ups", "fire_alarm", "disinfection_system", "unknown",
  ]).notNull(),
  manufacturer: varchar("manufacturer", { length: 128 }),
  model: varchar("model", { length: 128 }),
  icon: varchar("icon", { length: 64 }),
  defaultConfig: json("defaultConfig"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type IotDeviceType = typeof iotDeviceTypes.$inferSelect;

/* --- Urządzenia IoT (FOUNDATION: Device) --- */
export const iotDevices = sqliteTable("iot_devices", {
  id: serial("id").primaryKey(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(), // → farms
  houseId: bigint("houseId", { mode: "number", unsigned: true }), // → houses (FOUNDATION buildingId)
  sectorId: bigint("sectorId", { mode: "number", unsigned: true }), // → sectors (FOUNDATION zoneId)
  deviceTypeId: bigint("deviceTypeId", { mode: "number", unsigned: true }).notNull(), // → iot_device_types
  code: varchar("code", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  serialNumber: varchar("serialNumber", { length: 128 }),
  macAddress: varchar("macAddress", { length: 32 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  modbusAddress: int("modbusAddress"),
  mqttTopic: varchar("mqttTopic", { length: 255 }),
  /* pozycja na rzucie cyfrowym kurnika */
  positionX: decimal("positionX", { precision: 8, scale: 2 }),
  positionY: decimal("positionY", { precision: 8, scale: 2 }),
  config: json("config"),
  calibration: json("calibration"),
  status: sqliteEnum("status", [
    "online", "offline", "warning", "error", "maintenance", "calibrating",
  ]).notNull().default("offline"),
  lastSeenAt: timestamp("lastSeenAt"),
  firmwareVersion: varchar("firmwareVersion", { length: 64 }),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export type IotDevice = typeof iotDevices.$inferSelect;

/* --- Telemetria urządzeń (FOUNDATION: Telemetry) --- */
export const iotTelemetry = sqliteTable("iot_telemetry", {
  id: serial("id").primaryKey(),
  deviceId: bigint("deviceId", { mode: "number", unsigned: true }).notNull(), // → iot_devices
  ts: timestamp("ts").defaultNow().notNull(),
  metric: varchar("metric", { length: 64 }).notNull(), // co mierzy punkt (temperature/humidity/co2/...)
  rawValue: json("rawValue").notNull(),
  processedValue: decimal("processedValue", { precision: 14, scale: 4 }),
  unit: varchar("unit", { length: 16 }),
  quality: sqliteEnum("quality", [
    "good", "bad", "uncertain", "sensor_error", "calibration_error",
  ]).notNull().default("good"),
  metadata: json("metadata"),
});
export type IotTelemetry = typeof iotTelemetry.$inferSelect;

/* --- Predykcje AI nad telemetrią/klimatem (FOUNDATION: AIPrediction) --- */
export const iotAiPredictions = sqliteTable("iot_ai_predictions", {
  id: serial("id").primaryKey(),
  deviceId: bigint("deviceId", { mode: "number", unsigned: true }), // → iot_devices
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(), // → farms
  houseId: bigint("houseId", { mode: "number", unsigned: true }), // → houses
  type: sqliteEnum("type", [
    "anomaly_detection", "device_failure", "feed_shortage",
    "climate_fcr_impact", "climate_mortality_impact", "climate_adg_impact",
  ]).notNull(),
  modelVersion: varchar("modelVersion", { length: 32 }).notNull().default("1.0.0"),
  confidence: decimal("confidence", { precision: 4, scale: 2 }).notNull(), // 0–1
  prediction: json("prediction").notNull(),
  features: json("features"),
  validUntil: timestamp("validUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type IotAiPrediction = typeof iotAiPredictions.$inferSelect;

/* ============================================================
   PREDICTION ENGINE — wersjonowane dane wejściowe i wyniki.
   Tabele źródłowe pozostają kanoniczne; batch_day_facts jest
   idempotentną projekcją ich stanu na koniec dnia.
   ============================================================ */

export const batchDayFacts = sqliteTable("batch_day_facts", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  farmId: bigint("farmId", { mode: "number", unsigned: true }).notNull(),
  houseId: bigint("houseId", { mode: "number", unsigned: true }).notNull(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }).notNull(),
  day: date("day", { mode: "string" }).notNull(),
  ageDays: int("ageDays").notNull(),
  birdCount: int("birdCount").notNull(),
  avgWeightG: int("avgWeightG"),
  adgG: decimal("adgG", { precision: 9, scale: 3 }),
  feedKg: decimal("feedKg", { precision: 12, scale: 3 }).notNull().default("0"),
  cumulativeFeedKg: decimal("cumulativeFeedKg", { precision: 12, scale: 3 }).notNull().default("0"),
  mortality: int("mortality").notNull().default(0),
  cumulativeMortality: int("cumulativeMortality").notNull().default(0),
  fcr: decimal("fcr", { precision: 9, scale: 4 }),
  biomassKg: decimal("biomassKg", { precision: 12, scale: 3 }),
  waterLiters: decimal("waterLiters", { precision: 12, scale: 3 }),
  tempC: decimal("tempC", { precision: 6, scale: 2 }),
  humidityPct: decimal("humidityPct", { precision: 6, scale: 2 }),
  co2Ppm: int("co2Ppm"),
  ammoniaPpm: decimal("ammoniaPpm", { precision: 8, scale: 2 }),
  inputSnapshot: json("inputSnapshot").notNull(),
  sourceWatermark: timestamp("sourceWatermark").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("batch_day_facts_batch_day_unique").on(table.batchId, table.day),
  index("batch_day_facts_company_day_idx").on(table.companyId, table.day),
  index("batch_day_facts_house_day_idx").on(table.houseId, table.day),
]);

export const predictionRules = sqliteTable("prediction_rules", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  code: varchar("code", { length: 64 }).notNull(),
  version: varchar("version", { length: 32 }).notNull(),
  domain: varchar("domain", { length: 64 }).notNull().default("production"),
  inputContract: json("inputContract").notNull(),
  thresholds: json("thresholds").notNull(),
  logic: json("logic"),
  source: varchar("source", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  effectiveFrom: date("effectiveFrom", { mode: "string" }).notNull(),
  effectiveTo: date("effectiveTo", { mode: "string" }),
  status: sqliteEnum("status", ["draft", "active", "archived"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("prediction_rules_scope_code_version_unique").on(table.companyId, table.code, table.version),
  index("prediction_rules_status_effective_idx").on(table.status, table.effectiveFrom),
]);

export const referenceCurves = sqliteTable("reference_curves", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  geneticLineId: bigint("geneticLineId", { mode: "number", unsigned: true }),
  geneticLine: varchar("geneticLine", { length: 128 }),
  sex: sqliteEnum("sex", ["toms", "hens", "mixed"]).notNull(),
  ageDays: int("ageDays").notNull(),
  targetWeightG: int("targetWeightG"),
  targetAdgG: decimal("targetAdgG", { precision: 9, scale: 3 }),
  targetFcr: decimal("targetFcr", { precision: 9, scale: 4 }),
  targetFeedKg: decimal("targetFeedKg", { precision: 12, scale: 3 }),
  targetMortalityPct: decimal("targetMortalityPct", { precision: 7, scale: 4 }),
  tempMinC: decimal("tempMinC", { precision: 6, scale: 2 }),
  tempMaxC: decimal("tempMaxC", { precision: 6, scale: 2 }),
  humidityMinPct: decimal("humidityMinPct", { precision: 6, scale: 2 }),
  humidityMaxPct: decimal("humidityMaxPct", { precision: 6, scale: 2 }),
  co2MaxPpm: int("co2MaxPpm"),
  ammoniaMaxPpm: decimal("ammoniaMaxPpm", { precision: 8, scale: 2 }),
  source: varchar("source", { length: 255 }).notNull(),
  version: varchar("version", { length: 32 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  effectiveFrom: date("effectiveFrom", { mode: "string" }).notNull(),
  effectiveTo: date("effectiveTo", { mode: "string" }),
  status: sqliteEnum("status", ["draft", "active", "archived"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("reference_curves_scope_age_version_unique").on(table.companyId, table.geneticLine, table.sex, table.ageDays, table.version),
  index("reference_curves_lookup_idx").on(table.status, table.sex, table.ageDays, table.effectiveFrom),
]);

export const predictionRuns = sqliteTable("prediction_runs", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }),
  houseId: bigint("houseId", { mode: "number", unsigned: true }),
  ruleId: bigint("ruleId", { mode: "number", unsigned: true }),
  ruleVersion: varchar("ruleVersion", { length: 32 }).notNull(),
  curveId: bigint("curveId", { mode: "number", unsigned: true }),
  curveVersion: varchar("curveVersion", { length: 32 }),
  asOf: timestamp("asOf").notNull(),
  inputSnapshot: json("inputSnapshot").notNull(),
  output: json("output").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  status: sqliteEnum("status", ["completed", "invalid", "superseded"]).notNull().default("completed"),
  sourceWatermark: timestamp("sourceWatermark").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("prediction_runs_company_batch_asof_idx").on(table.companyId, table.batchId, table.asOf),
  index("prediction_runs_rule_created_idx").on(table.ruleId, table.createdAt),
]);

export const predictionFindings = sqliteTable("prediction_findings", {
  id: serial("id").primaryKey(),
  predictionRunId: bigint("predictionRunId", { mode: "number", unsigned: true }).notNull(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  batchId: bigint("batchId", { mode: "number", unsigned: true }),
  type: varchar("type", { length: 64 }).notNull(),
  severity: sqliteEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  recommendation: text("recommendation"),
  status: sqliteEnum("status", ["open", "acknowledged", "resolved"]).notNull().default("open"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: bigint("resolvedBy", { mode: "number", unsigned: true }),
}, (table) => [
  index("prediction_findings_company_status_idx").on(table.companyId, table.status, table.createdAt),
  index("prediction_findings_run_idx").on(table.predictionRunId),
]);

export const measurementQualityFlags = sqliteTable("measurement_quality_flags", {
  id: serial("id").primaryKey(),
  companyId: bigint("companyId", { mode: "number", unsigned: true }).notNull(),
  sourceTable: varchar("sourceTable", { length: 64 }).notNull(),
  sourceId: bigint("sourceId", { mode: "number", unsigned: true }).notNull(),
  metric: varchar("metric", { length: 64 }).notNull(),
  quality: sqliteEnum("quality", ["accepted", "rejected", "suspect"]).notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  flaggedBy: bigint("flaggedBy", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
}, (table) => [
  uniqueIndex("measurement_quality_source_metric_unique").on(table.sourceTable, table.sourceId, table.metric),
  index("measurement_quality_company_created_idx").on(table.companyId, table.createdAt),
]);
