import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import {
  Activity, BrainCircuit, Cpu, Gauge, RadioTower, ScanLine, Thermometer, Wheat,
} from "lucide-react";

/**
 * Sekcja IOT INTELLIGENCE dla strony Integrations — rejestr urządzeń IoT,
 * statusy online/offline, skan AI braku paszy w silosach (port FOUNDATION
 * predictFeedShortage), skan zdrowia urządzeń i alarmów klimatycznych,
 * aktywne predykcje AI (backend: router iotIntel).
 */
export default function IotIntelligence() {
  const utils = trpc.useUtils();
  const structure = trpc.org.structure.useQuery();

  const farms = useMemo(
    () => (structure.data?.companies ?? []).flatMap((c) => c.farms.map((f) => ({ id: f.id, name: f.name }))),
    [structure.data],
  );
  const [farmId, setFarmId] = useState<number>(0);
  const effectiveFarmId = farmId || farms[0]?.id || 0;

  const dash = trpc.iotIntel.dashboard.useQuery(
    { farmId: effectiveFarmId },
    { enabled: effectiveFarmId > 0 },
  );
  const devices = trpc.iotIntel.devices.useQuery(
    { farmId: effectiveFarmId },
    { enabled: effectiveFarmId > 0 },
  );
  const predictions = trpc.iotIntel.predictions.useQuery(
    { farmId: effectiveFarmId, activeOnly: true, limit: 20 },
    { enabled: effectiveFarmId > 0 },
  );

  const invalidate = () => {
    utils.iotIntel.dashboard.invalidate();
    utils.iotIntel.devices.invalidate();
    utils.iotIntel.predictions.invalidate();
  };

  const feedScan = trpc.iotIntel.feedShortageScan.useMutation({ onSuccess: invalidate });
  const healthScan = trpc.iotIntel.deviceHealthScan.useMutation({ onSuccess: invalidate });
  const climateScan = trpc.iotIntel.climateAlarmScan.useMutation({ onSuccess: invalidate });
  const setStatus = trpc.iotIntel.deviceSetStatus.useMutation({ onSuccess: invalidate });
  const testConnection = trpc.iotIntel.deviceTestConnection.useMutation({ onSuccess: invalidate });

  const d = dash.data;
  const num = (v: unknown) => Number(v ?? 0);

  const statusCls: Record<string, string> = {
    online: "bg-emerald-900/60 text-emerald-300",
    offline: "bg-zinc-800 text-zinc-400",
    warning: "bg-amber-900/60 text-amber-300",
    error: "bg-red-900/60 text-red-300",
    maintenance: "bg-sky-900/60 text-sky-300",
    calibrating: "bg-violet-900/60 text-violet-300",
  };
  const riskCls: Record<string, string> = {
    critical: "bg-red-900/60 text-red-300",
    high: "bg-orange-900/60 text-orange-300",
    medium: "bg-amber-900/60 text-amber-300",
    low: "bg-emerald-900/60 text-emerald-300",
  };
  const predLabel: Record<string, string> = {
    anomaly_detection: "Anomalia",
    device_failure: "Awaria urządzenia",
    feed_shortage: "Brak paszy",
    climate_fcr_impact: "Klimat → FCR",
    climate_mortality_impact: "Klimat → padnięcia",
    climate_adg_impact: "Klimat → ADG",
  };

  const selectCls =
    "rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs outline-none focus:border-emerald-500";

  return (
    <div className="space-y-6">
      {/* ---------- Nagłówek + wybór fermy ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RadioTower className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Intelligence — urządzenia IoT i predykcje AI
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className={selectCls} value={effectiveFarmId} onChange={(e) => setFarmId(Number(e.target.value))}>
              {farms.length === 0 && <option value={0}>Brak ferm</option>}
              {farms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button
              disabled={healthScan.isPending || effectiveFarmId === 0}
              onClick={() => healthScan.mutate({ farmId: effectiveFarmId })}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-emerald-600 disabled:opacity-50"
            >
              <Cpu className="h-3.5 w-3.5" /> {healthScan.isPending ? "Skanuję…" : "Skan urządzeń (admin)"}
            </button>
            <button
              disabled={climateScan.isPending || effectiveFarmId === 0}
              onClick={() => climateScan.mutate({ farmId: effectiveFarmId })}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-emerald-600 disabled:opacity-50"
            >
              <Thermometer className="h-3.5 w-3.5" /> {climateScan.isPending ? "Skanuję…" : "Skan klimatu (admin)"}
            </button>
          </div>
        </div>
        {(healthScan.error || climateScan.error) && (
          <div className="mb-2 text-xs text-red-400">{healthScan.error?.message ?? climateScan.error?.message}</div>
        )}
        {healthScan.data && (
          <div className="mb-2 text-xs text-emerald-400">
            Skan urządzeń: {healthScan.data.scanned} sprawdzonych, {healthScan.data.alarms} nowych alarmów.
          </div>
        )}
        {climateScan.data && (
          <div className="mb-2 text-xs text-emerald-400">
            Skan klimatu: {climateScan.data.scanned} kurników, {climateScan.data.alarms} alarmów.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Urządzenia" value={d?.devicesTotal ?? "—"} />
          <Kpi label="Online" value={d?.byStatus.online ?? "—"} />
          <Kpi label="Offline" value={d?.byStatus.offline ?? "—"} warn={(d?.byStatus.offline ?? 0) > 0} />
          <Kpi label="Ostrzeżenia/błędy" value={(d?.byStatus.warning ?? 0) + (d?.byStatus.error ?? 0)} warn={((d?.byStatus.warning ?? 0) + (d?.byStatus.error ?? 0)) > 0} />
          <Kpi label="Punkty telemetrii" value={d?.telemetryPoints ?? "—"} />
        </div>
      </div>

      {/* ---------- Skan braku paszy (PORT FOUNDATION predictFeedShortage) ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wheat className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Prognoza opróżnienia silosów (AI)
            </h2>
          </div>
          <button
            disabled={feedScan.isPending || effectiveFarmId === 0}
            onClick={() => feedScan.mutate({ farmId: effectiveFarmId })}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-500 disabled:opacity-50"
          >
            <ScanLine className="h-3.5 w-3.5" /> {feedScan.isPending ? "Analizuję…" : "Skan silosów (admin)"}
          </button>
        </div>
        {feedScan.error && <div className="mb-2 text-xs text-red-400">{feedScan.error.message}</div>}
        {feedScan.data && (
          <>
            <p className="mb-2 text-xs text-zinc-500">
              Przeanalizowano {feedScan.data.scanned} silosów → {feedScan.data.predictions} predykcji, {feedScan.data.alarms} alarmów CRITICAL (&lt; 12 h).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    <th className="py-1.5 pr-3">Silos</th>
                    <th className="py-1.5 pr-3 text-right">Stan [t]</th>
                    <th className="py-1.5 pr-3 text-right">Zużycie [t/d]</th>
                    <th className="py-1.5 pr-3 text-right">Wystarczy na [h]</th>
                    <th className="py-1.5 text-right">Ryzyko</th>
                  </tr>
                </thead>
                <tbody>
                  {feedScan.data.silos.map((r) => (
                    <tr key={String(r.siloId)} className="border-b border-zinc-800/60 text-zinc-300">
                      <td className="py-1.5 pr-3">{String(r.name)}</td>
                      <td className="py-1.5 pr-3 text-right">{r.currentTons != null ? num(r.currentTons).toFixed(2) : "—"}</td>
                      <td className="py-1.5 pr-3 text-right">{r.consumptionTPerDay != null ? num(r.consumptionTPerDay).toFixed(2) : "—"}</td>
                      <td className="py-1.5 pr-3 text-right">{r.hoursRemaining != null ? num(r.hoursRemaining).toFixed(0) : "—"}</td>
                      <td className="py-1.5 text-right">
                        {r.skipped ? (
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">brak danych zużycia</span>
                        ) : (
                          <span className={`rounded px-2 py-0.5 text-[10px] ${riskCls[String(r.risk)] ?? ""}`}>{String(r.risk)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!feedScan.data && (
          <p className="text-xs text-zinc-500">
            Skan liczy zużycie z ostatnich 7 dni i prognozuje czas do osiągnięcia poziomu alarmowego silosu.
            Predykcja &lt; 48 h, alarm krytyczny &lt; 12 h.
          </p>
        )}
      </div>

      {/* ---------- Rejestr urządzeń ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Rejestr urządzeń ({devices.data?.length ?? 0})
          </h2>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {(devices.data ?? []).map(({ device, type }) => {
            const conn = (device.config as Record<string, unknown> | undefined)?.connection as Record<string, unknown> | undefined;
            const host = String(conn?.host ?? (device.config as Record<string, unknown> | undefined)?.host ?? device.ipAddress ?? "");
            const port = conn?.port ?? (device.config as Record<string, unknown> | undefined)?.port ?? device.modbusAddress ?? "";
            const mode = String(conn?.mode ?? (device.config as Record<string, unknown> | undefined)?.connectionMode ?? "mqtt");
            const path = String(conn?.endpoint ?? (device.config as Record<string, unknown> | undefined)?.endpoint ?? "");
            const topic = String(conn?.topic ?? (device.config as Record<string, unknown> | undefined)?.topic ?? device.mqttTopic ?? "");

            return (
              <div key={device.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <Gauge className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="font-medium text-zinc-200">{device.name}</span>
                <code className="text-xs text-zinc-500">{device.code}</code>
                {type && <span className="text-xs text-zinc-500">{type.name}</span>}
                <span className={`rounded px-2 py-0.5 text-[10px] ${statusCls[device.status] ?? ""}`}>{device.status}</span>
                <span className="text-xs text-zinc-500">{mode.toUpperCase()} {host ? `• ${host}${port ? `:${port}` : ""}` : "• brak danych"}</span>
                <span className="flex-1" />
                <span className="text-xs text-zinc-500">
                  {device.lastSeenAt ? `widziano: ${String(device.lastSeenAt).slice(0, 16).replace("T", " ")}` : "brak telemetrii"}
                </span>
                {host && (
                  <button
                    onClick={() => testConnection.mutate({ deviceId: device.id })}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-emerald-600 hover:text-emerald-400"
                  >
                    {testConnection.isPending ? "Testuję…" : "Test połączenia"}
                  </button>
                )}
                {device.status !== "maintenance" ? (
                  <button
                    onClick={() => setStatus.mutate({ deviceId: device.id, status: "maintenance" })}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-sky-600 hover:text-sky-400"
                  >
                    Konserwacja
                  </button>
                ) : (
                  <button
                    onClick={() => setStatus.mutate({ deviceId: device.id, status: "online" })}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-emerald-600 hover:text-emerald-400"
                  >
                    Przywróć
                  </button>
                )}
                {(topic || path) && (
                  <span className="text-[10px] text-zinc-500">{topic || path}</span>
                )}
              </div>
            );
          })}
          {devices.data?.length === 0 && (
            <p className="py-3 text-sm text-zinc-600">
              Brak zarejestrowanych urządzeń dla tej fermy. Urządzenia i typy dodaje się przez API (iotIntel.deviceCreate) — rejestr zasila telemetria z kluczy API powyżej.
            </p>
          )}
        </div>
      </div>

      {/* ---------- Aktywne predykcje AI ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Aktywne predykcje AI ({predictions.data?.length ?? 0})
          </h2>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {(predictions.data ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <Activity className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                {predLabel[p.type] ?? p.type}
              </span>
              <span className="text-xs text-zinc-400">
                ufność: {(num(p.confidence) * 100).toFixed(0)}%
              </span>
              <span className="flex-1 text-xs text-zinc-500">
                {p.prediction ? JSON.stringify(p.prediction).slice(0, 140) : ""}
              </span>
              <span className="text-xs text-zinc-600">
                ważna do: {p.validUntil ? String(p.validUntil).slice(0, 16).replace("T", " ") : "—"}
              </span>
            </div>
          ))}
          {predictions.data?.length === 0 && (
            <p className="py-3 text-sm text-zinc-600">Brak aktywnych predykcji — uruchom skany powyżej.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${warn ? "text-red-400" : "text-zinc-100"}`}>{value}</div>
    </div>
  );
}
