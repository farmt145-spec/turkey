/**
 * Router tRPC IOT INTELLIGENCE (BTE HYBRID).
 * Port FOUNDATION iot module → KIMI tRPC.
 * RBAC: odczyty/telemetria/kalibracja = authed; skany masowe
 * (feedShortageScan, deviceHealthScan, climateAlarmScan) = adminOnly
 * (zgodnie z macierzą RBAC: operacje masowe/generujące alarmy dla całej fermy).
 */
import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import {
  deviceCalibrateSchema,
  deviceCreateSchema,
  deviceFilterSchema,
  deviceStatusSetSchema,
  deviceTypeCreateSchema,
  deviceUpdateSchema,
  feedShortageScanSchema,
  iotPredictionListSchema,
  telemetryIngestSchema,
  telemetryQuerySchema,
} from "../contracts/iot";
import * as svc from "../services/iot-intelligence.service";

export const iotIntelRouter = createRouter({
  /* typy urządzeń */
  deviceTypeCreate: authedQuery
    .input(deviceTypeCreateSchema)
    .mutation(async ({ input }) => svc.createDeviceType(input)),

  deviceTypes: authedQuery.query(async () => svc.listDeviceTypes()),

  /* urządzenia CRUD */
  deviceCreate: authedQuery
    .input(deviceCreateSchema)
    .mutation(async ({ input }) => svc.createDevice(input)),

  deviceUpdate: authedQuery
    .input(deviceUpdateSchema)
    .mutation(async ({ input }) => svc.updateDevice(input)),

  devices: authedQuery
    .input(deviceFilterSchema)
    .query(async ({ input }) => svc.listDevices(input)),

  deviceSetStatus: authedQuery
    .input(deviceStatusSetSchema)
    .mutation(async ({ input }) => svc.setDeviceStatus(input)),

  deviceTestConnection: authedQuery
    .input(z.object({ deviceId: z.number().int().positive() }))
    .mutation(async ({ input }) => svc.testDeviceConnection(input.deviceId)),

  /* telemetria */
  telemetryIngest: authedQuery
    .input(telemetryIngestSchema)
    .mutation(async ({ input }) => svc.ingestTelemetry(input)),

  telemetry: authedQuery
    .input(telemetryQuerySchema)
    .query(async ({ input }) => svc.queryTelemetry(input)),

  deviceCalibrate: authedQuery
    .input(deviceCalibrateSchema)
    .mutation(async ({ input }) => svc.calibrateDevice(input)),

  /* AI: skany masowe (admin) */
  feedShortageScan: adminQuery
    .input(feedShortageScanSchema)
    .mutation(async ({ input }) => svc.scanFeedShortage(input)),

  deviceHealthScan: adminQuery
    .input(z.object({ farmId: z.number().int().positive() }))
    .mutation(async ({ input }) => svc.scanDeviceHealth(input.farmId)),

  climateAlarmScan: adminQuery
    .input(z.object({ farmId: z.number().int().positive() }))
    .mutation(async ({ input }) => svc.scanClimateAlarms(input.farmId)),

  /* predykcje + dashboard */
  predictions: authedQuery
    .input(iotPredictionListSchema)
    .query(async ({ input }) => svc.listPredictions(input)),

  dashboard: authedQuery
    .input(z.object({ farmId: z.number().int().positive() }))
    .query(async ({ input }) => svc.getIotDashboard(input.farmId)),
});
