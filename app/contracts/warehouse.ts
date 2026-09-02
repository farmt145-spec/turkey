import { z } from "zod";

/* ============================================================
   BTE HYBRID — WAREHOUSE contracts (FOUNDATION → KIMI)
   ============================================================ */

export const productCategorySchema = z.enum([
  "feed_raw", "feed_ready", "premix", "concentrate", "oil", "vitamin",
  "amino_acid", "mineral", "medication", "vaccine", "disinfectant",
  "bedding", "gas", "pellet", "consumable", "spare_part", "fuel",
  "office", "custom",
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const movementTypeSchema = z.enum([
  "receipt", "issue", "transfer", "adjustment", "consumption", "return", "production",
]);
export type MovementType = z.infer<typeof movementTypeSchema>;

export const movementSubtypeSchema = z.enum([
  "pz", "import", "own_prod", "return_in", "transfer_in", "brooder_in", "mixer_in",
  "rw", "wz", "consume_feed", "consume_med", "consume_bed", "consume_gas",
  "service", "sale", "disposal", "adjust",
  "wh_to_wh", "silo_to_silo", "farm_to_farm", "brooder_to_house",
  "house_to_house", "house_to_sale", "house_to_disposal",
]);
export type MovementSubtype = z.infer<typeof movementSubtypeSchema>;

export const warehouseAlertTypeSchema = z.enum([
  "low_stock", "expiring_soon", "expired", "feed_shortage", "overstock", "quarantine",
]);
export const warehouseAlertSeveritySchema = z.enum(["info", "warning", "critical", "emergency"]);

const dateDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "format YYYY-MM-DD");

/* --- Product (FOUNDATION: CreateProductDto) --- */
export const warehouseProductCreateSchema = z.object({
  sku: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  category: productCategorySchema,
  subcategory: z.string().max(128).optional(),
  unit: z.string().max(16).default("kg"),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).default(0),
  safetyStock: z.number().min(0).default(0),
  leadTimeDays: z.number().int().min(0).default(7),
  shelfLifeDays: z.number().int().min(1).optional(),
  fcrImpact: z.number().min(-1).max(1).optional(),
  adgImpact: z.number().optional(),
  healthImpact: z.string().max(500).optional(),
  bestPractices: z.string().max(4000).optional(),
  dosageInfo: z.string().max(500).optional(),
});
export type WarehouseProductCreate = z.infer<typeof warehouseProductCreateSchema>;

/* --- Lot details (jakość + kwarantanna) --- */
export const lotDetailsUpsertSchema = z.object({
  lotId: z.number().int().positive(),
  manufacturer: z.string().max(255).optional(),
  productionDate: dateDay.optional(),
  purchaseCost: z.number().min(0).optional(),
  currentCost: z.number().min(0).optional(),
  qrCode: z.string().max(128).optional(),
  barcode: z.string().max(128).optional(),
  certificateUrl: z.string().max(500).optional(),
  moisture: z.number().min(0).max(100).optional(),
  protein: z.number().min(0).max(100).optional(),
  energy: z.number().min(0).optional(),
  mycotoxins: z.record(z.string(), z.number()).optional(),
  labResults: z.record(z.string(), z.unknown()).optional(),
});
export type LotDetailsUpsert = z.infer<typeof lotDetailsUpsertSchema>;

export const quarantineSetSchema = z.object({
  lotId: z.number().int().positive(),
  isQuarantined: z.boolean(),
  reason: z.string().max(500).optional(),
});

/* --- Ruch magazynowy (FOUNDATION: CreateStockMovementDto) --- */
export const warehouseMovementCreateSchema = z.object({
  lotId: z.number().int().positive().optional(),
  productId: z.number().int().positive(),
  type: movementTypeSchema,
  subtype: movementSubtypeSchema,
  quantity: z.number().positive(),
  unitCost: z.number().min(0).default(0),
  fromWarehouseId: z.number().int().positive().optional(),
  fromSiloId: z.number().int().positive().optional(),
  fromHouseId: z.number().int().positive().optional(),
  toWarehouseId: z.number().int().positive().optional(),
  toSiloId: z.number().int().positive().optional(),
  toHouseId: z.number().int().positive().optional(),
  batchId: z.number().int().positive().optional(),
  recipeId: z.number().int().positive().optional(),
  documentNumber: z.string().max(64).optional(),
  documentType: z.string().max(32).optional(),
  notes: z.string().max(500).optional(),
  moistureAtMove: z.number().min(0).max(100).optional(),
  temperatureAtMove: z.number().min(-30).max(60).optional(),
}).refine(
  (v) => v.type !== "receipt" || !!v.toWarehouseId || !!v.toSiloId,
  { message: "Przyjęcie wymaga magazynu/silosu docelowego" },
).refine(
  (v) => !["issue", "consumption"].includes(v.type) || !!v.fromWarehouseId || !!v.fromSiloId,
  { message: "Wydanie/zużycie wymaga magazynu/silosu źródłowego" },
);
export type WarehouseMovementCreate = z.infer<typeof warehouseMovementCreateSchema>;

export const movementListInputSchema = z.object({
  productId: z.number().int().positive().optional(),
  lotId: z.number().int().positive().optional(),
  type: movementTypeSchema.optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

/* --- Analiza AI zapasów --- */
export const warehouseAiAnalysisInputSchema = z.object({
  productId: z.number().int().positive(),
  warehouseId: z.number().int().positive().optional(),
});
export type WarehouseAiAnalysisInput = z.infer<typeof warehouseAiAnalysisInputSchema>;

/* --- Alerty --- */
export const warehouseAlertCreateSchema = z.object({
  type: warehouseAlertTypeSchema,
  severity: warehouseAlertSeveritySchema,
  productId: z.number().int().positive().optional(),
  lotId: z.number().int().positive().optional(),
  warehouseId: z.number().int().positive().optional(),
  message: z.string().min(3).max(500),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type WarehouseAlertCreate = z.infer<typeof warehouseAlertCreateSchema>;

export const warehouseAlertListInputSchema = z.object({
  warehouseId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
  onlyActive: z.boolean().default(true),
});
export const warehouseAlertResolveInputSchema = z.object({
  id: z.number().int().positive(),
  resolvedBy: z.string().max(255).optional(),
});

/* --- Rezerwacja FEFO pod recepturę --- */
export const reserveForRecipeInputSchema = z.object({
  recipeId: z.number().int().positive(),
  batchId: z.number().int().positive(),
  quantityKg: z.number().positive(),
});
export type ReserveForRecipeInput = z.infer<typeof reserveForRecipeInputSchema>;

/* --- Substytuty produktu --- */
export const findSubstitutesInputSchema = z.object({
  productId: z.number().int().positive(),
  requiredQty: z.number().positive(),
});
export type FindSubstitutesInput = z.infer<typeof findSubstitutesInputSchema>;

/* --- Identyfikowalność partii (rich) --- */
export const lotTraceabilityInputSchema = z.object({
  lotId: z.number().int().positive(),
});
