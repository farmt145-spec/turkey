# BTE HYBRID — INTEGRACJA MODUŁU IOT (FOUNDATION → KIMI)

Data: 2026-08-09 · Branch: phase-1 · Status: DONE (static) / RUNTIME PENDING

## Zakres

Port modułu FOUNDATION `iot` (NestJS/Prisma) do rdzenia KIMI. Zgodnie z audytem:
IOT = serwis satelitarny + tabele raportowe. KIMI pozostaje źródłem prawdy dla
klimatu (climate_logs), energii (energy_logs), silosów (silos) i powiadomień
(notifications); FOUNDATION dokłada rejestr urządzeń, surową telemetrię i warstwę
predykcji AI. Istniejące funkcje KIMI bez zmian — nowe tabele wyłącznie addytywne.

## 1. Baza danych (Drizzle, additive-only)

| Tabela | Port z FOUNDATION (Prisma) |
|---|---|
| iot_device_types | DeviceType (kod unikalny, 23 kategorie) |
| iot_devices | Device (farm/house/sector, serial/mac/ip, modbusAddress 0–247, mqttTopic, pozycja X/Y, status 6-wartościowy, lastSeenAt) |
| iot_telemetry | Telemetry (deviceId, ts, metric, rawValue JSON, processedValue, quality 5-wartościowa) |
| iot_ai_predictions | AIPrediction (6 typów, confidence, prediction JSON, validUntil) |

Migracja `db/migrations/0010_iot_intelligence.sql` + journal idx 10
— PRZYGOTOWANA, NIE WYKONANA.

Nieużywane modele FOUNDATION (celowe): FeedSilo (KIMI: silos — REUSE),
Alarm (KIMI: notifications z typem "iot_alarm" — REUSE), osobne tabele
ClimateReading/EnergyReading (KIMI: climate_logs/energy_logs — REUSE).

## 2. Kontrakty — `contracts/iot.ts`

Zod: deviceCategory (23 wartości 1:1 z enum FOUNDATION), deviceStatus (6),
telemetryQuality (5), predictionType (6), deviceCreate (modbusAddress 0–247),
deviceUpdate (partial + id), deviceFilter, telemetryPoint/Ingest (paczka 1–1000),
telemetryQuery (limit domyślny 500, max 5000), calibrate, setStatus,
feedShortageScan, predictionList.

## 3. Serwisy — `services/iot-intelligence.service.ts`

- **scanFeedShortage — PORT 1:1** z FOUNDATION ai-engine.predictFeedShortage:
  hoursRemaining = (currentLevel − alertLevel) / consumption; predykcja < 48 h,
  confidence 0.95 jeśli < 24 h (else 0.8), alarm CRITICAL < 12 h.
  ADAPTACJE: currentLevel → silos.currentTons; alertLevel → 10% capacityTons
  (stała SILO_ALERT_RATIO — KIMI silos nie ma pola alertLevel); consumption [t/d]
  → feed_usages (batchId, day, kg, recipeId) z ostatnich 7 dni — per silo po
  zgodności recipeId, fallback: równy podział zużycia fermy na silosy; alarm →
  notifications (severity critical, typ alarmu w treści) zamiast tabeli Alarm.
- **CRUD urządzeń i typów** — create/update/list z filtrem (farm/house/sector/
  status/kategoria/isActive), domyślny mqttTopic `bte/{farmId}/{code}`.
- **ingestTelemetry** — transakcja: paczka punktów + lastSeenAt/status online
  dla dotkniętych urządzeń.
- **calibrateDevice** — punkt telemetryczny z flagą kalibracji + status online.
- **scanDeviceHealth** — deterministyczny zamiennik placeholderów Math.random()
  z FOUNDATION: offline przy braku telemetrii > 2 h (+ alarm), warning przy
  > 20% złych odczytów/24 h (+ predykcja device_failure, confidence 0.70).
- **scanClimateAlarms** — REUSE climate_logs (ostatni odczyt per kurnik);
  progi zgodne z modułem PRODUCTION: CO2 > 3000 ppm, NH3 > 25 ppm,
  T poza 10–35°C → alarm + predykcja climate_mortality_impact (0.75).
- **listPredictions / getIotDashboard** — aktywne predykcje + KPI statusów.
- Tabele iot_* nie mają kolumn ...base (status/updatedBy) — autorzy nie są
  zapisywani; KIMI notifications nie ma type/payload (severity + body).

## 3a. Runtime validation fix pack (2026-08-09)

Po pierwszej pełnej instalacji node_modules wykryto i naprawiono:
- kolumna `code` w iot_devices (schema + migracja 0010 + kontrakt) — serwis/UI
  jej używały; kolumna `metric` w iot_telemetry (jak wcześniej);
- kontrakt iot dopasowany do serwisu/testów (telemetryIngest = paczka punktów
  z deviceId+metric per punkt, calibrate = deviceId/metric/value, statusSet =
  deviceId/status, feedShortageScan/predictionList farmId wymagane, +activeOnly,
  +typy DeviceFilter/TelemetryQuery/DeviceCalibrate/DeviceStatusSet/
  FeedShortageScan/IotPredictionList);
- scanFeedShortage przepisany na realny schemat KIMI (silos.farmId, brak
  silos.houseId; feed_usages bez siloId — konsumpcja przez recipeId);
- powiadomienia KIMI (severity/title/body, max 500 znaków).

## 4. API — `api/iot-intel-router.ts` (14 procedur)

authed: deviceTypeCreate, deviceTypes, deviceCreate, deviceUpdate, devices,
deviceSetStatus, telemetryIngest, telemetry, deviceCalibrate, predictions,
dashboard.
adminQuery (skany masowe generujące alarmy dla całej fermy): feedShortageScan,
deviceHealthScan, climateAlarmScan.
Autor zapisów: ctx.user.name ?? ctx.user.unionId ?? "system".

## 5. Frontend — `components/IotIntelligence.tsx` → strona Integrations

Wybór fermy (z org.structure), KPI urządzeń (online/offline/warning/telemetria),
skan silosów z tabelą ryzyka (critical/high/medium/low), rejestr urządzeń ze
zmianą statusu (konserwacja/przywróć), aktywne predykcje AI z ufnością i datą
ważności. Sekcja wpięta w `Integrations.tsx` między klucze API a dokumentację
ingest — naturalne miejsce dla urządzeń wysyłających dane.

## 6. Funkcje FOUNDATION zintegrowane

- predictFeedShortage 1:1 (progi 48/24/12 h, confidence 0.95/0.8) ✓
- Rejestr DeviceType (23 kategorie) + Device (modbus/mqtt/pozycja) ✓
- Telemetria z jakością odczytu (good/bad/uncertain/sensor_error/calibration_error) ✓
- AIPrediction z validUntil i confidence ✓
- Alarmy FEED_SILO_EMPTY / DEVICE_OFFLINE / CLIMATE_THRESHOLD ✓

## 7. Funkcje KIMI zachowane

Klucze API, dokumentacja ingest, backup/eksport (strona Integrations bez zmian
poza wpięciem sekcji), climate_logs, energy_logs, silos, notifications,
maintenance_tickets — bez naruszenia.

## 8. Testy statyczne

`api/iot-intel.test.ts`: 5 testów kontraktów (zakres modbus, partial update,
paczka telemetrii 1–1000, limit 500/5000, wymagane farmId), 5 testów RBAC
(UNAUTHORIZED bez sesji; FORBIDDEN dla roli user na feedShortageScan),
regresja rejestracji routera obok pozostałych 5 routerów domenowych.

## 9. Status runtime

PENDING — jak we wszystkich modułach (node_modules niekompletne, npm ci/install
zabronione). Walidacja statyczna: bilans nawiasów 8 plików + grep wiring.

## 10. Migracje

0010_iot_intelligence.sql — PRZYGOTOWANA, NIE WYKONANA (łańcuch 0005–0010).
