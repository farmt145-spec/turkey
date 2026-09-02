import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { AlertTriangle, Boxes, CheckCircle2, LineChart, PackageSearch, ScanLine } from "lucide-react";

/**
 * Sekcja WAREHOUSE INTELLIGENCE dla strony Warehouse — dashboard zapasów,
 * katalog produktów z rekomendacjami zamówień AI, alerty magazynowe
 * (backend: router warehouseIntel, port FOUNDATION warehouse module).
 */
export default function WarehouseIntelligence() {
  const utils = trpc.useUtils();
  const dash = trpc.warehouseIntel.dashboard.useQuery();
  const products = trpc.warehouseIntel.products.useQuery();
  const alerts = trpc.warehouseIntel.alerts.useQuery({ onlyActive: true });
  const [analysisFor, setAnalysisFor] = useState<number | null>(null);

  const scan = trpc.warehouseIntel.alertScan.useMutation({
    onSuccess: () => utils.warehouseIntel.alerts.invalidate(),
  });
  const analyze = trpc.warehouseIntel.aiAnalysis.useMutation();
  const resolve = trpc.warehouseIntel.alertResolve.useMutation({
    onSuccess: () => utils.warehouseIntel.alerts.invalidate(),
  });

  const num = (v: unknown) => Number(v ?? 0);
  const d = dash.data;

  const sevCls: Record<string, string> = {
    info: "bg-sky-900/60 text-sky-300",
    warning: "bg-amber-900/60 text-amber-300",
    critical: "bg-orange-900/60 text-orange-300",
    emergency: "bg-red-900/60 text-red-300",
  };

  return (
    <div className="space-y-6">
      {/* ---------- Dashboard KPI ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Intelligence — stan i prognozy zapasów
            </h2>
          </div>
          <button
            disabled={scan.isPending}
            onClick={() => scan.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-500 disabled:opacity-50"
          >
            <ScanLine className="h-3.5 w-3.5" />
            {scan.isPending ? "Skanuję…" : "Skan alertów (admin)"}
          </button>
        </div>
        {scan.error && <div className="mb-2 text-xs text-red-400">{scan.error.message}</div>}
        {scan.data && <div className="mb-2 text-xs text-emerald-400">Wygenerowano {scan.data.generated} nowych alertów.</div>}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Produkty" value={d?.totalProducts ?? "—"} />
          <Kpi label="Aktywne partie" value={d?.activeLots ?? "—"} />
          <Kpi label="Wartość zapasów" value={d ? `${d.totalInventoryValue.toLocaleString("pl-PL")} PLN` : "—"} />
          <Kpi label="Poniżej progu zamówienia" value={d?.lowStockItems ?? "—"} warn={(d?.lowStockItems ?? 0) > 0} />
          <Kpi label="Aktywne alerty" value={d?.activeAlerts ?? "—"} warn={(d?.activeAlerts ?? 0) > 0} />
        </div>

        {(d?.topConsumed.length ?? 0) > 0 && (
          <div className="mt-3 rounded-lg bg-zinc-900 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
              Top zużycie (90 dni)
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {d!.topConsumed.map((t) => (
                <span key={t.name} className="rounded bg-zinc-800 px-2 py-1">
                  {t.name}: <b>{t.quantity.toLocaleString("pl-PL")}</b>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------- Produkty + analiza AI ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <PackageSearch className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Katalog produktów ({products.data?.length ?? 0})
          </h2>
        </div>
        <div className="space-y-1.5">
          {(products.data ?? []).map((p) => (
            <div key={p.id} className="rounded-lg bg-zinc-900 px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-zinc-500">{p.sku}</span>{" "}
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{p.category}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={p.belowReorder ? "font-bold text-red-400" : "text-zinc-300"}>
                    {num(p.totalStock).toLocaleString("pl-PL")} {p.unit}
                    {p.belowReorder && " ▼ próg"}
                  </span>
                  <button
                    disabled={analyze.isPending && analysisFor === p.id}
                    onClick={() => { setAnalysisFor(p.id); analyze.mutate({ productId: p.id }); }}
                    className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <LineChart className="h-3 w-3" /> Analiza AI
                  </button>
                </div>
              </div>
              {analyze.data && analysisFor === p.id && (
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-zinc-950/60 p-2.5 text-xs lg:grid-cols-4">
                  <span>Dni zapasu: <b>{analyze.data.daysOfSupply}</b></span>
                  <span>Ryzyko braku: <b className={analyze.data.stockoutRisk >= 40 ? "text-red-400" : "text-emerald-400"}>{analyze.data.stockoutRisk}%</b></span>
                  <span>Ryzyko ważności: <b className={analyze.data.expiryRisk > 0 ? "text-amber-400" : "text-emerald-400"}>{analyze.data.expiryRisk}%</b></span>
                  <span>Rotacja: <b>{analyze.data.rotationScore}/100</b></span>
                  {analyze.data.recommendedOrderQty > 0 && (
                    <span className="col-span-2 text-amber-300">
                      Rekomendowane zamówienie: <b>{analyze.data.recommendedOrderQty.toLocaleString("pl-PL")} {p.unit}</b>
                      {analyze.data.recommendedOrderDate && ` do ${analyze.data.recommendedOrderDate}`}
                    </span>
                  )}
                  {analyze.data.bestSupplierName && (
                    <span className="col-span-2 text-zinc-400">Najlepszy dostawca: {analyze.data.bestSupplierName}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          {(products.data ?? []).length === 0 && (
            <div className="text-sm text-zinc-600">
              Brak produktów w katalogu — dodaj pierwszy przez warehouseIntel.productCreate.
            </div>
          )}
        </div>
      </div>

      {/* ---------- Alerty magazynowe ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Aktywne alerty magazynowe ({alerts.data?.length ?? 0})
          </h2>
        </div>
        <div className="space-y-1.5">
          {(alerts.data ?? []).map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm">
              <div>
                <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${sevCls[a.severity]}`}>
                  {a.severity}
                </span>
                {a.message}
                <div className="mt-0.5 text-[10px] text-zinc-500">{a.type.replace(/_/g, " ")}</div>
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
            <div className="text-sm text-zinc-600">Brak aktywnych alertów magazynowych.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? "border-amber-900/60 bg-amber-950/20" : "border-zinc-800 bg-zinc-950/50"}`}>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-lg font-bold text-zinc-100">{value}</div>
    </div>
  );
}
