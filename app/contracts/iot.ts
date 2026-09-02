import { z } from "zod";

/* ============================================================
   BTE HYBRID — IOT contracts (FOUNDATION → KIMI)
   ============================================================ */

export const deviceCategorySchema = z.enum([
  "climate_controller", "temperature_sensor", "humidity_sensor", "co2_sensor",
  "nh3_sensor", "h2s_sensor", "airflow_sensor", "energy_meter", "gas_meter",
  "water_meter", "feed_scale", "feed_silo_level", "feed_auto", "drinker",
  "ai_camera", "bird_scale", "mortality_counter", "door_sensor", "generator",
  "ups", "fire_alarm", "disinfection_system", "unknown",
]);
export type DeviceCategory = z.infer<typeof deviceCategorySchema>;

export const deviceStatusSchema = z.enum([
  "online", "offline", "warning", "error", "maintenance", "calibrating",
]);
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

export const telemetryQualitySchema = z.enum([
  "good", "bad", "uncertain", "sensor_error", "calibration_error",
]);
export type TelemetryQuality = z.infer<typeof telemetryQualitySchema>;

export const predictionTypeSchema = z.enum([
  "anomaly_detection", "device_failure", "feed_shortage",
  "climate_fcr_impact", "climate_mortality_impact", "climate_adg_impact",
]);
export type PredictionType = z.infer<typeof predictionTypeSchema>;

/* --- typ urządzenia --- */
export const deviceTypeCreateSchema = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  category: deviceCategorySchema,
  manufacturer: z.string().max(128).optional(),
  model: z.string().max(128).optional(),
  icon: z.string().max(64).optional(),
  defaultConfig: z.record(z.string(), z.unknown()).optional(),
});
export type DeviceTypeCreate = z.infer<typeof deviceTypeCreateSchema>;

export const externalConnectionSchema = z.object({
  mode: z.enum(["mqtt", "http", "tcp", "modbus", "serial"]).default("mqtt"),
  host: z.string().max(128).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  topic: z.string().max(255).optional(),
  endpoint: z.string().max(255).optional(),
  username: z.string().max(128).optional(),
  password: z.string().max(128).optional(),
  apiKey: z.string().max(256).optional(),
  notes: z.string().max(512).optional(),
});
export type ExternalConnection = z.infer<typeof externalConnectionSchema>;

/* --- urządzenie (FOUNDATION: CreateDeviceDto) --- */
export const deviceCreateSchema = z.object({
  farmId: z.number().int().positive(),
  houseId: z.number().int().positive().optional(),
  sectorId: z.number().int().positive().optional(),
  deviceTypeId: z.number().int().positive(),
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  serialNumber: z.string().max(128).optional(),
  macAddress: z.string().max(32).optional(),
  ipAddress: z.string().max(45).optional(),
  modbusAddress: z.number().int().min(0).max(247).optional(),
  mqttTopic: z.string().max(255).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  connection: externalConnectionSchema.optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type DeviceCreate = z.infer<typeof deviceCreateSchema>;

export const deviceUpdateSchema = deviceCreateSchema.partial().extend({
  id: z.number().int().positive(),
  status: deviceStatusSchema.optional(),
  isActive: z.boolean().optional(),
});
export type DeviceUpdate = z.infer<typeof deviceUpdateSchema>;

export const deviceFilterSchema = z.object({
  farmId: z.number().int().positive().optional(),
  houseId: z.number().int().positive().optional(),
  sectorId: z.number().int().positive().optional(),
  status: deviceStatusSchema.optional(),
  category: deviceCategorySchema.optional(),
  isActive: z.boolean().optional(),
});
export type DeviceFilter = z.infer<typeof deviceFilterSchema>;

/* --- telemetria (FOUNDATION: TelemetryBatchDto) --- */
export const telemetryPointSchema = z.object({
  deviceId: z.number().int().positive(),
  ts: z.string().datetime().optional(), // ISO; domyślnie teraz
  metric: z.string().min(1).max(64),
  rawValue: z.record(z.string(), z.unknown()).optional(),
  processedValue: z.number().optional(),
  unit: z.string().max(16).optional(),
  quality: telemetryQualitySchema.default("good"),
});
export const telemetryIngestSchema = z.object({
  points: z.array(telemetryPointSchema).min(1).max(1000),
});
export type TelemetryIngest = z.infer<typeof telemetryIngestSchema>;

export const telemetryQuerySchema = z.object({
  deviceId: z.number().int().positive().optional(),
  metric: z.string().max(64).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(5000).default(500),
});
export type TelemetryQuery = z.infer<typeof telemetryQuerySchema>;

/* --- kalibracja + status --- */
export const deviceCalibrateSchema = z.object({
  deviceId: z.number().int().positive(),
  metric: z.string().min(1).max(64),
  value: z.number(),
  note: z.string().max(255).optional(),
});
export type DeviceCalibrate = z.infer<typeof deviceCalibrateSchema>;
export const deviceStatusSetSchema = z.object({
  deviceId: z.number().int().positive(),
  status: deviceStatusSchema,
});
export type DeviceStatusSet = z.infer<typeof deviceStatusSetSchema>;

export const deviceConnectionTestSchema = z.object({
  deviceId: z.number().int().positive(),
});
export type DeviceConnectionTest = z.infer<typeof deviceConnectionTestSchema>;

/* --- AI: silosy / skan alarmów --- */
export const feedShortageScanSchema = z.object({
  farmId: z.number().int().positive(),
});
export type FeedShortageScan = z.infer<typeof feedShortageScanSchema>;

export const iotPredictionListSchema = z.object({
  farmId: z.number().int().positive(),
  deviceId: z.number().int().positive().optional(),
  type: predictionTypeSchema.optional(),
  activeOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).default(50),
});
export type IotPredictionList = z.infer<typeof iotPredictionListSchema>;
