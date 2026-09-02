/**
 * IoT Intelligence Service (BTE HYBRID INTEGRATION — moduł IOT)
 *
 * Port logiki FOUNDATION iot module na stos KIMI (Drizzle + MySQL).
 * Źródła:
 *  - modules/iot/apps/api/src/prisma/schema.prisma (DeviceType/Device/Telemetry/FeedSilo/Alarm/AIPrediction)
 *  - modules/iot/apps/api/src/ai-engine/ai-engine.service.ts (predictFeedShortage — logika 1:1)
 *
 * ADAPTACJE:
 *  - FOUNDATION FeedSilo (currentLevel/alertLevel/consumption) → KIMI `silos` (farmId, currentTons/
 *    capacityTons, recipeId). Poziom alarmowy = 10% pojemności (stała SILO_ALERT_RATIO — KIMI silos
 *    nie ma pola alertLevel). Zużycie [t/dzień] liczone z KIMI `feed_usages` (batchId, day, kg,
 *    recipeId) z ostatnich 7 dni: per silo po zgodności recipeId, a gdy silo nie ma recipeId —
 *    równy podział całkowitego zużycia fermy na liczbę silosów.
 *  - Alarmy FOUNDATION (osobna tabela Alarm, 21 typów) → KIMI `notifications`
 *    (severity + title/body; typ alarmu osadzony w treści) + wpis `iot_ai_predictions`.
 *  - detectAnomaly / predictDeviceFailure w FOUNDATION używały Math.random() (placeholder AI).
 *    Tu: wersja deterministyczna — brak telemetrii > OFFLINE_AFTER_H → offline, jakość odczytów
 *    bad/sensor_error > 20% → warning (prawdopodobna awaria/kalibracja).
 *  - Alarm klimatu: progi zgodne z modułem PRODUCTION (CO2 3000 ppm, NH3 25 ppm, T 10–35°C),
 *    dane z KIMI `climate_logs` (źródło prawdy KIMI — REUSE).
 *  - Tabele iot_* nie mają kolumn ...base (status/updatedBy) — autorzy nie są zapisywani.
 */
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import * as s from "../db/schema";
import type {
  DeviceCalibrate,
  DeviceCreate,
  DeviceFilter,
  DeviceStatusSet,
  DeviceTypeCreate,
  DeviceUpdate,
  FeedShortageScan,
  IotPredictionList,
  TelemetryIngest,
  TelemetryQuery,
} from "../contracts/iot";
import net from "node:net";

// ─── constants (port FOUNDATION ai-engine) ──────────────────────────────────
const SILO_ALERT_RATIO = 0.1; // ADAPTACJA: brak alertLevel w KIMI silos
const FEED_SHORTAGE_PREDICT_H = 48; // FOUNDATION: < 48h → AIPrediction
const FEED_SHORTAGE_HIGH_CONF_H = 24; // FOUNDATION: < 24h → confidence 0.95 (else 0.8)
const FEED_SHORTAGE_ALARM_H = 12; // FOUNDATION: < 12h → alarm CRITICAL
const OFFLINE_AFTER_H = 2;
const CO2_LIMIT_PPM = 3000;
const NH3_LIMIT_PPM = 25;
const TEMP_MIN_C = 10;
const TEMP_MAX_C = 35;

// ─── device types & devices CRUD ────────────────────────────────────────────
export async function createDeviceType(input: DeviceTypeCreate) {
  const db = getDb();
  await db.insert(s.iotDeviceTypes).values({ ...input });
  const [row] = await db.select().from(s.iotDeviceTypes).where(eq(s.iotDeviceTypes.code, input.code)).limit(1);
  return row;
}

export async function listDeviceTypes() {
  const db = getDb();
  return db.select().from(s.iotDeviceTypes).orderBy(s.iotDeviceTypes.category, s.iotDeviceTypes.name);
}

export async function createDevice(input: DeviceCreate) {
  const db = getDb();
  const { positionX, positionY, connection, config, ...rest } = input;
  const mergedConfig = {
    ...(config ?? {}),
    ...(connection ? { connection } : {}),
    source: (config as Record<string, unknown> | undefined)?.source ?? (connection ? "manual-setup" : "api"),
  };
  const [{ id }] = await db.insert(s.iotDevices).values({
    ...rest,
    config: mergedConfig,
    ...(positionX != null ? { positionX: String(positionX) } : {}),
    ...(positionY != null ? { positionY: String(positionY) } : {}),
    mqttTopic: input.mqttTopic ?? connection?.topic ?? `bte/${input.farmId}/${input.code}`,
  }).returning({ id: s.iotDevices.id });
  const [row] = await db.select().from(s.iotDevices).where(eq(s.iotDevices.id, id)).limit(1);
  return row;
}

export async function updateDevice(input: DeviceUpdate) {
  const db = getDb();
  const { id, positionX, positionY, ...rest } = input;
  await db.update(s.iotDevices).set({
    ...rest,
    ...(positionX != null ? { positionX: String(positionX) } : {}),
    ...(positionY != null ? { positionY: String(positionY) } : {}),
  }).where(eq(s.iotDevices.id, id));
  const [row] = await db.select().from(s.iotDevices).where(eq(s.iotDevices.id, id)).limit(1);
  return row;
}

export async function listDevices(filter: DeviceFilter) {
  const db = getDb();
  const conds = [
    filter.farmId ? eq(s.iotDevices.farmId, filter.farmId) : undefined,
    filter.houseId ? eq(s.iotDevices.houseId, filter.houseId) : undefined,
    filter.sectorId ? eq(s.iotDevices.sectorId, filter.sectorId) : undefined,
    filter.status ? eq(s.iotDevices.status, filter.status) : undefined,
    filter.category ? eq(s.iotDeviceTypes.category, filter.category) : undefined,
    filter.isActive === undefined ? undefined : eq(s.iotDevices.isActive, filter.isActive),
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  return db
    .select({ device: s.iotDevices, type: s.iotDeviceTypes })
    .from(s.iotDevices)
    .leftJoin(s.iotDeviceTypes, eq(s.iotDevices.deviceTypeId, s.iotDeviceTypes.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(s.iotDevices.code);
}

export async function setDeviceStatus(input: DeviceStatusSet) {
  const db = getDb();
  await db
    .update(s.iotDevices)
    .set({ status: input.status })
    .where(eq(s.iotDevices.id, input.deviceId));
  const [row] = await db.select().from(s.iotDevices).where(eq(s.iotDevices.id, input.deviceId)).limit(1);
  return row;
}

export async function testDeviceConnection(deviceId: number) {
  const db = getDb();
  const [device] = await db.select().from(s.iotDevices).where(eq(s.iotDevices.id, deviceId)).limit(1);
  if (!device) throw new Error("Urządzenie nie istnieje");

  const config = (device.config ?? {}) as Record<string, unknown>;
  const connection = (config.connection ?? {}) as Record<string, unknown>;
  const host = String(connection.host ?? config.host ?? device.ipAddress ?? "").trim();
  const port = Number(connection.port ?? config.port ?? device.modbusAddress ?? 1883);
  const mode = String(connection.mode ?? config.connectionMode ?? "mqtt");
  const endpoint = String(connection.endpoint ?? config.endpoint ?? "/api/v1/ingest");

  const probe = await new Promise<{ ok: boolean; status: "online" | "offline" | "warning"; message: string }>((resolve) => {
    const timeoutMs = 4000;
    const finish = (ok: boolean, status: "online" | "offline" | "warning", message: string) => resolve({ ok, status, message });

    if (!host) return finish(false, "offline", "Brak hosta/IP. Uzupełnij adres urządzenia.");

    if (mode === "serial") return finish(false, "warning", "Połączenie serial nie może być sprawdzone automatycznie bez portu COM / USB.");

    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      finish(false, "offline", `Timeout po ${timeoutMs} ms dla ${host}:${port}`);
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      finish(true, "online", `Połączenie do ${host}:${port} aktywne (${mode.toUpperCase()}).`);
    });

    socket.once("error", () => {
      clearTimeout(timer);
      if (mode === "http") {
        fetch(`http://${host}:${port}${endpoint || "/"}`, { signal: AbortSignal.timeout(4000) })
          .then(() => finish(true, "online", `HTTP ${host}:${port}${endpoint} odpowiada.`))
          .catch(() => finish(false, "offline", `HTTP ${host}:${port}${endpoint} nie odpowiada.`));
        return;
      }
      finish(false, "offline", `Nie udało się połączyć do ${host}:${port} (${mode.toUpperCase()}).`);
    });

    if (mode === "http") {
      fetch(`http://${host}:${port}${endpoint || "/"}`, { signal: AbortSignal.timeout(4000) })
        .then(() => {
          clearTimeout(timer);
          finish(true, "online", `HTTP ${host}:${port}${endpoint} odpowiada.`);
        })
        .catch(() => {
          clearTimeout(timer);
          finish(false, "offline", `HTTP ${host}:${port}${endpoint} nie odpowiada.`);
        });
      return;
    }

    socket.connect(port, host);
  });

  await db
    .update(s.iotDevices)
    .set({ status: probe.status, lastSeenAt: new Date() })
    .where(eq(s.iotDevices.id, deviceId));

  const [row] = await db.select().from(s.iotDevices).where(eq(s.iotDevices.id, deviceId)).limit(1);
  return { device: row, ...probe };
}

// ─── telemetry ──────────────────────────────────────────────────────────────
/** Ingest paczki punktów telemetrycznych + aktualizacja lastSeenAt/statusu urządzeń. */
export async function ingestTelemetry(input: TelemetryIngest) {
  const db = getDb();
  const now = new Date();
  const touched = new Set<number>();
  await db.transaction(async (tx) => {
    for (const p of input.points) {
      await tx.insert(s.iotTelemetry).values({
        deviceId: p.deviceId,
        ts: p.ts ? new Date(p.ts) : now,
        metric: p.metric,
        rawValue: p.rawValue ?? {},
        processedValue: p.processedValue != null ? String(p.processedValue) : null,
        unit: p.unit ?? null,
        quality: p.quality ?? "good",
      });
      touched.add(p.deviceId);
    }
    for (const deviceId of touched) {
      await tx
        .update(s.iotDevices)
        .set({ lastSeenAt: now, status: "online" })
        .where(eq(s.iotDevices.id, deviceId));
    }
  });
  return { inserted: input.points.length, devices: touched.size };
}

export async function queryTelemetry(q: TelemetryQuery) {
  const db = getDb();
  const conds = [
    q.deviceId ? eq(s.iotTelemetry.deviceId, q.deviceId) : undefined,
    q.metric ? eq(s.iotTelemetry.metric, q.metric) : undefined,
    q.from ? gte(s.iotTelemetry.ts, new Date(q.from)) : undefined,
    q.to ? lte(s.iotTelemetry.ts, new Date(q.to)) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  return db
    .select()
    .from(s.iotTelemetry)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(s.iotTelemetry.ts))
    .limit(q.limit ?? 500);
}

/** Kalibracja: zapis punktu telemetrycznego z wartością po kalibracji + status online. */
export async function calibrateDevice(input: DeviceCalibrate) {
  const db = getDb();
  await db.insert(s.iotTelemetry).values({
    deviceId: input.deviceId,
    ts: new Date(),
    metric: input.metric,
    rawValue: { calibration: true, note: input.note ?? null },
    processedValue: String(input.value),
    quality: "good",
  });
  await db
    .update(s.iotDevices)
    .set({ status: "online", lastSeenAt: new Date() })
    .where(eq(s.iotDevices.id, input.deviceId));
  return { ok: true };
}

// ─── AI: feed shortage (PORT 1:1 z FOUNDATION predictFeedShortage) ──────────
/**
 * FOUNDATION: hoursRemaining = (currentLevel - alertLevel) / consumption;
 * < 48h → AIPrediction(feed_shortage); confidence 0.95 jeśli < 24h, else 0.8;
 * < 12h → Alarm CRITICAL.
 * ADAPTACJA: currentLevel → silos.currentTons; alertLevel → 10% capacityTons;
 * consumption [t/d] → feed_usages (kg) z ostatnich 7 dni, per silo po recipeId
 * (fallback: równy podział zużycia fermy na silosy).
 */
export async function scanFeedShortage(input: FeedShortageScan) {
  const db = getDb();
  const siloRows = await db.select().from(s.silos).where(eq(s.silos.farmId, input.farmId));
  if (siloRows.length === 0) return { scanned: 0, predictions: 0, alarms: 0, silos: [] as Array<Record<string, unknown>> };

  // zużycie fermy z ostatnich 7 dni: feed_usages ← batches ← houses(farm)
  const farmHouses = await db.select({ id: s.houses.id }).from(s.houses).where(eq(s.houses.farmId, input.farmId));
  const houseIds = farmHouses.map((h) => h.id);
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  let totalKg = 0;
  const kgByRecipe = new Map<number, number>();
  if (houseIds.length > 0) {
    const farmBatches = await db.select({ id: s.batches.id }).from(s.batches).where(inArray(s.batches.houseId, houseIds));
    const batchIds = farmBatches.map((b) => b.id);
    if (batchIds.length > 0) {
      const usage = await db
        .select({ recipeId: s.feedUsages.recipeId, kg: sql<number>`COALESCE(SUM(${s.feedUsages.kg}),0)` })
        .from(s.feedUsages)
        .where(and(inArray(s.feedUsages.batchId, batchIds), gte(s.feedUsages.day, since)))
        .groupBy(s.feedUsages.recipeId);
      for (const u of usage) {
        const kg = Number(u.kg);
        totalKg += kg;
        if (u.recipeId != null) kgByRecipe.set(u.recipeId, (kgByRecipe.get(u.recipeId) ?? 0) + kg);
      }
    }
  }

  const results: Array<Record<string, unknown>> = [];
  let predictions = 0;
  let alarms = 0;

  for (const silo of siloRows) {
    const currentT = Number(silo.currentTons ?? 0);
    const capacityT = Number(silo.capacityTons ?? 0);
    const alertT = capacityT * SILO_ALERT_RATIO;
    // ADAPTACJA przypisania zużycia do silosu (patrz nagłówek pliku)
    const siloKg = silo.recipeId != null ? (kgByRecipe.get(silo.recipeId) ?? 0) : totalKg / siloRows.length;
    const consumptionPerDay = siloKg / 7 / 1000; // t/dzień
    if (consumptionPerDay <= 0) {
      results.push({ siloId: silo.id, name: silo.name, skipped: "no_consumption_data" });
      continue;
    }
    // PORT 1:1: (currentLevel - alertLevel) / consumption → dni → godziny
    const hoursRemaining = ((currentT - alertT) / consumptionPerDay) * 24;

    if (hoursRemaining < FEED_SHORTAGE_PREDICT_H) {
      const confidence = hoursRemaining < FEED_SHORTAGE_HIGH_CONF_H ? 0.95 : 0.8;
      const validUntil = new Date(Date.now() + Math.max(hoursRemaining, 0) * 3600 * 1000);
      await db.insert(s.iotAiPredictions).values({
        farmId: input.farmId,
        type: "feed_shortage",
        confidence: confidence.toFixed(2),
        prediction: {
          siloId: silo.id,
          siloName: silo.name,
          hoursRemaining: Math.round(hoursRemaining * 10) / 10,
          currentTons: currentT,
          alertTons: Math.round(alertT * 100) / 100,
          consumptionTPerDay: Math.round(consumptionPerDay * 1000) / 1000,
        },
        validUntil,
      });
      predictions++;

      if (hoursRemaining < FEED_SHORTAGE_ALARM_H) {
        await db.insert(s.notifications).values({
          severity: "critical",
          title: `KRYTYCZNE: pasza w silosie ${silo.name} na < ${FEED_SHORTAGE_ALARM_H}h`,
          body: `FEED_SILO_EMPTY | Poziom ${currentT.toFixed(2)} t, zużycie ${consumptionPerDay.toFixed(2)} t/d. Pozostało ~${hoursRemaining.toFixed(1)} h (siloId=${silo.id}). Zamów dostawę natychmiast.`,
        });
        alarms++;
      }
    }
    results.push({
      siloId: silo.id,
      name: silo.name,
      currentTons: currentT,
      consumptionTPerDay: Math.round(consumptionPerDay * 1000) / 1000,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      risk: hoursRemaining < FEED_SHORTAGE_ALARM_H ? "critical" : hoursRemaining < FEED_SHORTAGE_HIGH_CONF_H ? "high" : hoursRemaining < FEED_SHORTAGE_PREDICT_H ? "medium" : "low",
    });
  }
  return { scanned: siloRows.length, predictions, alarms, silos: results };
}

// ─── AI: device health (deterministyczna wersja placeholderów FOUNDATION) ───
/** Skan urządzeń: offline (brak lastSeenAt > 2h) + duży udział złych odczytów → warning + powiadomienia. */
export async function scanDeviceHealth(farmId: number) {
  const db = getDb();
  const devices = await db
    .select()
    .from(s.iotDevices)
    .where(and(eq(s.iotDevices.farmId, farmId), eq(s.iotDevices.isActive, true)));
  const offlineThreshold = new Date(Date.now() - OFFLINE_AFTER_H * 3600 * 1000);
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  let alarms = 0;
  const report: Array<Record<string, unknown>> = [];

  for (const d of devices) {
    const issues: string[] = [];
    if (!d.lastSeenAt || d.lastSeenAt < offlineThreshold) {
      if (d.status !== "offline") {
        await db.update(s.iotDevices).set({ status: "offline" }).where(eq(s.iotDevices.id, d.id));
      }
      issues.push("offline");
      await db.insert(s.notifications).values({
        severity: "warning",
        title: `Urządzenie offline: ${d.name} (${d.code})`,
        body: `DEVICE_OFFLINE | Brak telemetrii od ponad ${OFFLINE_AFTER_H} h (deviceId=${d.id}). Sprawdź zasilanie i łączność.`,
      });
      alarms++;
    }
    const qual = await db
      .select({
        total: sql<number>`COUNT(*)`,
        bad: sql<number>`SUM(CASE WHEN ${s.iotTelemetry.quality} IN ('bad','sensor_error','calibration_error') THEN 1 ELSE 0 END)`,
      })
      .from(s.iotTelemetry)
      .where(and(eq(s.iotTelemetry.deviceId, d.id), gte(s.iotTelemetry.ts, since)));
    const total = Number(qual[0]?.total ?? 0);
    const bad = Number(qual[0]?.bad ?? 0);
    if (total >= 10 && bad / total > 0.2) {
      issues.push("bad_quality");
      if (d.status === "online") {
        await db.update(s.iotDevices).set({ status: "warning" }).where(eq(s.iotDevices.id, d.id));
      }
      await db.insert(s.iotAiPredictions).values({
        farmId,
        deviceId: d.id,
        type: "device_failure",
        confidence: "0.70",
        prediction: { deviceId: d.id, code: d.code, badRatio24h: Math.round((bad / total) * 100) / 100, recommendation: "Sprawdź czujnik / wykonaj kalibrację" },
        validUntil: new Date(Date.now() + 24 * 3600 * 1000),
      });
    }
    report.push({ deviceId: d.id, code: d.code, status: d.status, issues });
  }
  return { scanned: devices.length, alarms, devices: report };
}

// ─── AI: climate alarms (REUSE KIMI climate_logs; progi zgodne z PRODUCTION) ─
export async function scanClimateAlarms(farmId: number) {
  const db = getDb();
  const farmHouses = await db.select().from(s.houses).where(eq(s.houses.farmId, farmId));
  let alarms = 0;
  const report: Array<Record<string, unknown>> = [];

  for (const house of farmHouses) {
    const [latest] = await db
      .select()
      .from(s.climateLogs)
      .where(eq(s.climateLogs.houseId, house.id))
      .orderBy(desc(s.climateLogs.ts))
      .limit(1);
    if (!latest) continue;
    const breaches: string[] = [];
    if (latest.co2Ppm != null && Number(latest.co2Ppm) > CO2_LIMIT_PPM) breaches.push(`CO2 ${latest.co2Ppm} ppm > ${CO2_LIMIT_PPM}`);
    if (latest.ammoniaPpm != null && Number(latest.ammoniaPpm) > NH3_LIMIT_PPM) breaches.push(`NH3 ${latest.ammoniaPpm} ppm > ${NH3_LIMIT_PPM}`);
    if (latest.tempC != null && (Number(latest.tempC) > TEMP_MAX_C || Number(latest.tempC) < TEMP_MIN_C))
      breaches.push(`T ${latest.tempC}°C poza ${TEMP_MIN_C}–${TEMP_MAX_C}`);
    if (breaches.length > 0) {
      await db.insert(s.notifications).values({
        severity: "critical",
        title: `Alarm klimatyczny: ${house.name}`,
        body: `CLIMATE_THRESHOLD | ${breaches.join("; ")} (houseId=${house.id})`.slice(0, 500),
      });
      await db.insert(s.iotAiPredictions).values({
        farmId,
        houseId: house.id,
        type: "climate_mortality_impact",
        confidence: "0.75",
        prediction: { houseId: house.id, breaches, note: "Przekroczenia progów klimatycznych — podwyższone ryzyko padnięć/FCR" },
        validUntil: new Date(Date.now() + 12 * 3600 * 1000),
      });
      alarms++;
    }
    report.push({ houseId: house.id, name: house.name, breaches });
  }
  return { scanned: farmHouses.length, alarms, houses: report };
}

// ─── predictions & dashboard ────────────────────────────────────────────────
export async function listPredictions(input: IotPredictionList) {
  const db = getDb();
  const conds = [
    eq(s.iotAiPredictions.farmId, input.farmId),
    input.deviceId ? eq(s.iotAiPredictions.deviceId, input.deviceId) : undefined,
    input.type ? eq(s.iotAiPredictions.type, input.type) : undefined,
    input.activeOnly ? gte(s.iotAiPredictions.validUntil, new Date()) : undefined,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  return db
    .select()
    .from(s.iotAiPredictions)
    .where(and(...conds))
    .orderBy(desc(s.iotAiPredictions.createdAt))
    .limit(input.limit ?? 50);
}

export async function getIotDashboard(farmId: number) {
  const db = getDb();
  const devices = await db.select().from(s.iotDevices).where(eq(s.iotDevices.farmId, farmId));
  const byStatus = { online: 0, offline: 0, warning: 0, error: 0, maintenance: 0, calibrating: 0 } as Record<string, number>;
  for (const d of devices) byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
  const deviceIds = devices.map((d) => d.id);
  const tel = deviceIds.length
    ? await db
        .select({ n: sql<number>`COUNT(*)` })
        .from(s.iotTelemetry)
        .where(inArray(s.iotTelemetry.deviceId, deviceIds))
    : [{ n: 0 }];
  const predictions = await db
    .select()
    .from(s.iotAiPredictions)
    .where(and(eq(s.iotAiPredictions.farmId, farmId), gte(s.iotAiPredictions.validUntil, new Date())))
    .orderBy(desc(s.iotAiPredictions.createdAt))
    .limit(10);
  return {
    devicesTotal: devices.length,
    byStatus,
    telemetryPoints: Number(tel[0]?.n ?? 0),
    activePredictions: predictions,
  };
}
