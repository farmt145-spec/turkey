import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { AlertTriangle, Brain, CheckCircle2, LineChart, Sparkles } from "lucide-react";

/**
 * Sekcja PRODUCTION INTELLIGENCE dla strony BatchDetail — analiza AI dnia,
 * prognoza końca rzutu, alerty produkcyjne (backend: router productionIntel,
 * port FOUNDATION production-engine / ai-engine, standardy BUT Big 6).
 */
export default function ProductionIntelligence({ batchId }: { batchId: number }) {
  const utils = trpc.useUtils();
  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today);
  const [co2, setCo2] = useState("");

  const analyses = trpc.productionIntel.analyses.useQuery({ batchId });
  const latest = analyses.data?.[0] ?? null;
  const forecast = trpc.productionIntel.latestForecast.useQuery({ batchId });
  const alerts = trpc.productionIntel.alerts.useQuery({ batchId, onlyActive: true });

  const analyze = trpc.productionIntel.analyzeDay.useMutation({
    onSuccess: () => {
      utils.productionIntel.analyses.invalidate({ batchId });
      utils.productionIntel.alerts.invalidate({ batchId, onlyActive: true });
    },
  });
  const runForecast = trpc.productionIntel.forecastEnd.useMutation({
    onSuccess: () => utils.productionIntel.latestForecast.invalidate({ batchId }),
  });
  const resolve = trpc.productionIntel.alertResolve.useMutation({
    onSuccess: () => utils.productionIntel.alerts.invalidate({ batchId, onlyActive: true }),
  });

  const riskCls: Record<string, string> = {
    low: "text-emerald-400 border-emerald-900/60 bg-emerald-950/30",
    medium: "text-amber-400 border-amber-900/60 bg-amber-950/30",
    high: "text-orange-400 border-orange-900/60 bg-orange-950/30",
    critical: "text-red-400 border-red-900/60 bg-red-950/30",
  };
  const riskLabel: Record<string, string> = {
    low: "NISKIE", medium: "ŚREDNIE", high: "WYSOKIE", critical: "KRYTYCZNE",
  };

  const f = forecast.data;
  const num = (v: unknown) => Number(v ?? 0);

  return (
    <div className="space-y-6">
      {/* ---------- Analiza AI dnia ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Analiza AI dnia (BUT Big 6)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date" value={day} onChange={(e) => setDay(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs outline-none focus:border-violet-500"
            />
            <input
              placeholder="CO₂ ppm (opc.)" value={co2} onChange={(e) => setCo2(e.target.value)}
              className="w-28 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs outline-none focus:border-violet-500"
            />
            <button
              disabled={analyze.isPending}
              onClick={() => analyze.mutate({ batchId, day, co2Ppm: co2 ? Number(co2) : undefined })}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium hover:bg-violet-500 disabled:opacity-50"
            >
              {analyze.isPending ? "Analizuję…" : "Analizuj dzień"}
            </button>
          </div>
        </div>
        {analyze.error && <div className="mb-2 text-xs text-red-400">{analyze.error.message}</div>}

        {latest ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className={`rounded-xl border p-3 ${riskCls[latest.riskLevel]}`}>
                <div className="text-[10px] uppercase tracking-wider opacity-70">Ryzyko (dzień {latest.dayNumber})</div>
                <div className="text-lg font-bold">{riskLabel[latest.riskLevel]}</div>
              </div>
              <ScoreCard label="Ocena dnia" value={num(latest.dayScore)} suffix="/100" />
              <ScoreCard label="FCR / ADG" value={`${num(latest.fcr)} / ${num(latest.adgGrams)}g`} />
              <ScoreCard label="EPEF" value={num(latest.epef)} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs lg:grid-cols-6">
              {([
                ["Temp", latest.tempScore], ["Wilgotność", latest.humidityScore],
                ["CO₂", latest.co2Score], ["NH₃", latest.nh3Score],
                ["Woda", latest.waterScore], ["Pasza", latest.feedScore],
              ] as const).map(([label, v]) => (
                <div key={label} className="rounded-lg bg-zinc-900 px-2 py-1.5">
                  <div className="text-[10px] text-zinc-500">{label}</div>
                  <div className={`font-bold ${num(v) >= 80 ? "text-emerald-400" : num(v) >= 60 ? "text-amber-400" : "text-red-400"}`}>
                    {num(v)}
                  </div>
                </div>
              ))}
            </div>
            {Array.isArray(latest.detectedIssues) && latest.detectedIssues.length > 0 && (
              <div className="space-y-1">
                {(latest.detectedIssues as { severity: string; description: string }[]).map((i, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className={`mt-0.5 h-3 w-3 shrink-0 ${i.severity === "CRITICAL" || i.severity === "HIGH" ? "text-red-400" : "text-amber-400"}`} />
                    <span className="text-zinc-300">{i.description}</span>
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(latest.recommendations) && latest.recommendations.length > 0 && (
              <div className="rounded-lg bg-zinc-900 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                  <Sparkles className="h-3 w-3" /> Rekomendacje AI
                </div>
                <ul className="list-inside list-disc space-y-0.5 text-xs text-zinc-300">
                  {(latest.recommendations as string[]).slice(0, 6).map((r, idx) => <li key={idx}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-zinc-600">
            Brak analiz — wybierz dzień z wpisem w dzienniku i uruchom analizę AI.
          </div>
        )}
      </div>

      {/* ---------- Prognoza końca rzutu + alerty ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Prognoza końca rzutu
              </h2>
            </div>
            <button
              disabled={runForecast.isPending}
              onClick={() => runForecast.mutate({ batchId, feedPricePerKg: 1.8, livePricePerKg: 6.5 })}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium hover:bg-sky-500 disabled:opacity-50"
            >
              {runForecast.isPending ? "Liczenie…" : "Przelicz"}
            </button>
          </div>
          {f ? (
            <div className="grid grid-cols-2 gap-3">
              <ScoreCard label="Przew. masa końcowa" value={`${(num(f.predictedFinalWeight) / 1000).toFixed(2)} kg`} />
              <ScoreCard label="Przew. FCR / EPEF" value={`${num(f.predictedFcr)} / ${num(f.predictedEpef)}`} />
              <ScoreCard label="Przew. zysk" value={`${num(f.predictedProfit).toLocaleString("pl-PL")} PLN`} />
              <ScoreCard label="Marża / trafność" value={`${num(f.predictedMargin)}% / ${num(f.accuracyPercent)}%`} />
            </div>
          ) : (
            <div className="text-sm text-zinc-600">Brak prognozy — kliknij „Przelicz”.</div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Aktywne alerty AI ({alerts.data?.length ?? 0})
            </h2>
          </div>
          <div className="space-y-1.5">
            {(alerts.data ?? []).map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${a.severity === "critical" ? "bg-red-900/60 text-red-300" : "bg-orange-900/60 text-orange-300"}`}>
                      {a.severity}
                    </span>
                    {a.title}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">{a.description}</div>
                </div>
                <button
                  onClick={() => resolve.mutate({ id: a.id })}
                  className="mt-1 shrink-0 rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                  title="Oznacz jako rozwiązany"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </button>
              </div>
            ))}
            {(alerts.data ?? []).length === 0 && (
              <div className="text-sm text-zinc-600">Brak aktywnych alertów produkcyjnych.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-lg font-bold text-zinc-100">
        {value}{suffix && <span className="text-xs font-normal text-zinc-500">{suffix}</span>}
      </div>
    </div>
  );
}
