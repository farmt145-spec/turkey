import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { CheckCircle2, Landmark, Lightbulb, LineChart, TrendingUp } from "lucide-react";

/**
 * Sekcja ECONOMICS INTELLIGENCE dla strony Economics — dashboard finansowy,
 * predykcja zysku z wpływem decyzji, doradca kosztów AI, analiza sprzedaży
 * (backend: router economicsIntel, port FOUNDATION economics module).
 */
export default function EconomicsIntelligence() {
  const utils = trpc.useUtils();
  const dash = trpc.economicsIntel.dashboard.useQuery();
  const [batchIdInput, setBatchIdInput] = useState("");
  const batchId = Number(batchIdInput) || 0;

  const advisors = trpc.economicsIntel.advisors.useQuery({ batchId }, { enabled: batchId > 0 });
  const sale = trpc.economicsIntel.saleAnalysis.useQuery({ batchId }, { enabled: batchId > 0 });

  const predict = trpc.economicsIntel.predictProfit.useMutation();
  const genAdvisors = trpc.economicsIntel.advisorsGenerate.useMutation({
    onSuccess: () => utils.economicsIntel.advisors.invalidate({ batchId }),
  });
  const markAction = trpc.economicsIntel.advisorAction.useMutation({
    onSuccess: () => utils.economicsIntel.advisors.invalidate({ batchId }),
  });

  const num = (v: unknown) => Number(v ?? 0);
  const d = dash.data;
  const p = predict.data;

  const prioCls: Record<string, string> = {
    critical: "bg-red-900/60 text-red-300",
    high: "bg-orange-900/60 text-orange-300",
    medium: "bg-amber-900/60 text-amber-300",
    low: "bg-zinc-800 text-zinc-400",
  };

  const inputCls =
    "rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs outline-none focus:border-emerald-500";

  return (
    <div className="space-y-6">
      {/* ---------- Dashboard finansowy ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Landmark className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Intelligence — pulpit finansowy
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Przychód" value={d ? `${d.totalRevenue.toLocaleString("pl-PL")} EUR` : "—"} />
          <Kpi label="Koszty" value={d ? `${d.totalCosts.toLocaleString("pl-PL")} EUR` : "—"} />
          <Kpi
            label="Marża (EBITDA)"
            value={d ? `${d.totalMargin.toLocaleString("pl-PL")} EUR` : "—"}
            warn={(d?.totalMargin ?? 0) < 0}
          />
          <Kpi label="Śr. cena sprzedaży" value={d ? `${d.avgPricePerKg} EUR/kg` : "—"} />
          <Kpi label="Aktywne rzuty" value={d?.activeBatches ?? "—"} />
        </div>
        {(d?.costBreakdown.length ?? 0) > 0 && (
          <div className="mt-3 space-y-1">
            {d!.costBreakdown.map((c) => (
              <div key={c.category} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-zinc-400">{c.category}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-zinc-800">
                  <div
                    className="h-full rounded bg-emerald-600"
                    style={{ width: `${Math.min(100, c.percentage)}%` }}
                  />
                </div>
                <span className="w-24 text-right text-zinc-300">{c.percentage}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Predykcja zysku + analiza sprzedaży ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Predykcja zysku rzutu
              </h2>
            </div>
            <div className="flex gap-2">
              <input
                placeholder="ID rzutu" value={batchIdInput}
                onChange={(e) => setBatchIdInput(e.target.value)}
                className={`${inputCls} w-24`}
              />
              <button
                disabled={!batchId || predict.isPending}
                onClick={() => predict.mutate({ batchId })}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium hover:bg-sky-500 disabled:opacity-50"
              >
                {predict.isPending ? "Liczenie…" : "Przelicz"}
              </button>
            </div>
          </div>
          {predict.error && <div className="mb-2 text-xs text-red-400">{predict.error.message}</div>}
          {p ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Przew. zysk" value={`${p.predictedProfit.toLocaleString("pl-PL")} EUR`} warn={p.predictedProfit < 0} />
                <Kpi label="Przew. marża" value={`${p.predictedMargin}%`} warn={p.predictedMargin < 5} />
                <Kpi label="Break-even" value={`${p.breakEvenPrice} EUR/kg`} />
                <Kpi label="Koszt końcowy / kg" value={`${p.predictedCostPerKg} EUR`} />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Wpływ decyzji na zysk</div>
                {p.decisionImpacts.map((di) => (
                  <div key={di.decision} className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-1.5 text-xs">
                    <span>{di.decision}</span>
                    <span className={di.impactOnProfit >= 0 ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
                      {di.impactOnProfit >= 0 ? "+" : ""}{di.impactOnProfit.toLocaleString("pl-PL")} EUR
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-600">Podaj ID rzutu i uruchom predykcję.</div>
          )}
        </div>

        {/* ---------- Analiza sprzedaży + doradca ---------- */}
        <div className="space-y-6">
          {sale.data && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="mb-3 flex items-center gap-2">
                <LineChart className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Optymalny termin sprzedaży
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Optymalna data" value={sale.data.optimalSaleDate} />
                <Kpi label="Trend cen" value={sale.data.priceTrend} />
                <Kpi label="Koszt zwłoki / dzień" value={`${sale.data.delayImpactPerDay} EUR`} warn={sale.data.delayImpactPerDay > 0} />
                <Kpi label="Przew. przychód" value={`${sale.data.predictedRevenue.toLocaleString("pl-PL")} EUR`} />
              </div>
              <div className="mt-2 rounded-lg bg-zinc-900 p-2.5 text-xs text-zinc-300">
                {sale.data.recommendedAction}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Doradca kosztów AI ({advisors.data?.length ?? 0})
                </h2>
              </div>
              <button
                disabled={!batchId || genAdvisors.isPending}
                onClick={() => genAdvisors.mutate({ batchId })}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium hover:bg-violet-500 disabled:opacity-50"
              >
                {genAdvisors.isPending ? "Generuję…" : "Generuj"}
              </button>
            </div>
            <div className="space-y-1.5">
              {(advisors.data ?? []).filter((a) => !a.actionTaken).slice(0, 6).map((a) => (
                <div key={a.id} className="rounded-lg bg-zinc-900 px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${prioCls[a.priority]}`}>
                        {a.priority}
                      </span>
                      <span className="text-xs font-medium">{a.title}</span>
                      <div className="mt-0.5 text-xs text-zinc-400">{a.description}</div>
                      {(num(a.estimatedSavings) > 0 || num(a.estimatedGain) > 0) && (
                        <div className="mt-0.5 text-[11px] text-emerald-400">
                          {num(a.estimatedSavings) > 0 && `Oszczędność: ${num(a.estimatedSavings).toLocaleString("pl-PL")} EUR`}
                          {num(a.estimatedGain) > 0 && ` Potencjalny zysk: ${num(a.estimatedGain).toLocaleString("pl-PL")} EUR`}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => markAction.mutate({ id: a.id })}
                      className="mt-1 shrink-0 rounded bg-zinc-800 p-1.5 hover:bg-zinc-700"
                      title="Oznacz jako wdrożone"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </button>
                  </div>
                </div>
              ))}
              {batchId > 0 && (advisors.data ?? []).length === 0 && (
                <div className="text-sm text-zinc-600">Brak rekomendacji — wygeneruj dla wybranego rzutu.</div>
              )}
              {batchId === 0 && (
                <div className="text-sm text-zinc-600">Podaj ID rzutu, aby zobaczyć rekomendacje i termin sprzedaży.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? "border-red-900/60 bg-red-950/20" : "border-zinc-800 bg-zinc-950/50"}`}>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-lg font-bold text-zinc-100">{value}</div>
    </div>
  );
}
