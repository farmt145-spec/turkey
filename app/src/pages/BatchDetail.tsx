import { useParams, Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { fmtNum, num, countryFlag } from "@/lib/geo";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { ArrowLeft, Plus, RefreshCw, Syringe, ClipboardPlus, ChartNoAxesCombined, X } from "lucide-react";
import ProductionIntelligence from "@/components/ProductionIntelligence";

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500";

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const batchId = Number(id);
  const q = trpc.farm.production.batchDetail.useQuery({ id: batchId });
  const utils = trpc.useUtils();
  const addWeighing = trpc.farm.production.addWeighing.useMutation({
    onSuccess: () => utils.farm.production.batchDetail.invalidate({ id: batchId }),
  });
  const regen = trpc.farm.production.regenerateSelects.useMutation({
    onSuccess: () => utils.farm.production.batchDetail.invalidate({ id: batchId }),
  });
  const markVax = trpc.farm.health.markVaccinationDone.useMutation({
    onSuccess: () => utils.farm.production.batchDetail.invalidate({ id: batchId }),
  });

  const [wf, setWf] = useState({ dayAge: 0, sampleSize: 100, avgWeightG: 0, stdDevG: 0 });
  const d = q.data;
  if (!d) return <div className="p-8 text-sm text-zinc-500">Ładowanie rzutu…</div>;

  const weightData = d.weighings.map((w) => ({
    day: w.dayAge, avg: w.avgWeightG / 1000, min: (w.minG ?? 0) / 1000, max: (w.maxG ?? 0) / 1000, cv: num(w.cv),
  }));
  const mortData = Object.values(
    d.mortalities.reduce<Record<string, { day: string; count: number }>>((acc, m) => {
      const k = m.day;
      acc[k] = acc[k] ?? { day: k, count: 0 };
      acc[k].count += m.count;
      return acc;
    }, {}),
  );
  const isActive = d.batch.status === "active";
  const openQuickWalk = () => setSearchParams({ obchod: "1" });
  const openAnalytics = () => setSearchParams({ centrum: "1" });
  const closeOverlay = () => setSearchParams({});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/produkcja" className="rounded-lg bg-zinc-800 p-2 hover:bg-zinc-700"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="text-2xl font-bold font-mono text-red-300">{d.batch.code}</h1>
          <p className="text-sm text-zinc-500">
            {d.farm ? `${countryFlag(d.farm.countryCode)} ${d.farm.name} · ` : ""}{d.house?.name} · {d.batch.geneticLine} ·{" "}
            {d.batch.sex === "toms" ? "indory" : d.batch.sex === "hens" ? "indyczki" : "mieszany"} · start {d.batch.startDate}
          </p>
        </div>
        {isActive && (
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={openQuickWalk} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500">
              <ClipboardPlus className="h-4 w-4" /> + Szybki obchód
            </button>
            <button onClick={openAnalytics} className="inline-flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/70">
              <ChartNoAxesCombined className="h-4 w-4" /> Centrum analityczne
            </button>
          </div>
        )}
      </div>

      {searchParams.get("centrum") === "1" && <BatchAnalyticsCenter batch={d} batchId={batchId} onClose={closeOverlay} />}
      {searchParams.get("obchod") === "1" && isActive && <QuickWalk batchId={batchId} sex={d.batch.sex} onClose={closeOverlay} />}

      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        {[
          ["Sztuki", `${fmtNum(d.batch.currentCount)} / ${fmtNum(d.batch.initialCount)}`],
          ["Śr. masa", `${(d.avgWeightG / 1000).toFixed(2)} kg`],
          ["Biomasa", `${fmtNum(d.biomassKg / 1000, 1)} t`],
          ["ADG", `${fmtNum(d.adgG)} g/d`],
          ["FCR", d.fcr.toFixed(2)],
          ["Śmiertelność", `${d.mortalityPct.toFixed(2)}%`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{l}</div>
            <div className="mt-1 text-lg font-bold text-red-200">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Krzywa wzrostu</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weightData}>
              <CartesianGrid stroke="#27272a" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} unit="d" />
              <YAxis stroke="#71717a" fontSize={11} unit=" kg" />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
              <Line type="monotone" dataKey="max" stroke="#3f3f46" dot={false} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="avg" stroke="#ef4444" strokeWidth={2} dot={false} name="średnia" />
              <Line type="monotone" dataKey="min" stroke="#3f3f46" dot={false} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Śmiertelność dzienna</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mortData}>
              <CartesianGrid stroke="#27272a" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={10} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
              <Bar dataKey="count" fill="#f59e0b" name="padnięcia" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ważenie + Dynamic Select Engine */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Nowe ważenie → uruchamia Event Engine
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-zinc-500">Wiek (dni)
              <input type="number" className={inputCls} value={wf.dayAge || ""} onChange={(e) => setWf({ ...wf, dayAge: Number(e.target.value) })} />
            </label>
            <label className="text-xs text-zinc-500">Liczba ważonych
              <input type="number" className={inputCls} value={wf.sampleSize} onChange={(e) => setWf({ ...wf, sampleSize: Number(e.target.value) })} />
            </label>
            <label className="text-xs text-zinc-500">Średnia masa (g)
              <input type="number" className={inputCls} value={wf.avgWeightG || ""} onChange={(e) => setWf({ ...wf, avgWeightG: Number(e.target.value) })} />
            </label>
            <label className="text-xs text-zinc-500">Odchylenie std. (g, opcjonalnie)
              <input type="number" className={inputCls} value={wf.stdDevG || ""} onChange={(e) => setWf({ ...wf, stdDevG: Number(e.target.value) })} />
            </label>
          </div>
          <button
            disabled={addWeighing.isPending || !wf.avgWeightG || !wf.dayAge}
            onClick={() => addWeighing.mutate({ batchId, dayAge: wf.dayAge, sampleSize: wf.sampleSize, avgWeightG: wf.avgWeightG, stdDevG: wf.stdDevG || undefined })}
            className="mt-4 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Zapisz ważenie i przelicz KPI
          </button>
          {addWeighing.data && (
            <p className="mt-2 text-xs text-emerald-400">
              Zapisano. CV = {num(addWeighing.data.cv).toFixed(1)}% — Dynamic Select Engine zaktualizował selekty.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Dynamic Select Engine</h2>
            <button
              onClick={() => regen.mutate({ batchId })}
              className="flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs hover:bg-zinc-700"
            >
              <RefreshCw className="h-3 w-3" /> Przelicz selekty
            </button>
          </div>
          <div className="space-y-2">
            {d.selects.map((sel) => (
              <div key={sel.id} className={`rounded-lg border p-3 ${
                sel.status === "critical" ? "border-red-900/60 bg-red-950/30"
                : sel.status === "warning" ? "border-amber-900/60 bg-amber-950/20"
                : "border-zinc-800 bg-zinc-900"
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{sel.name}</span>
                  <span className={`text-xs font-semibold ${
                    sel.status === "critical" ? "text-red-400" : sel.status === "warning" ? "text-amber-400" : "text-emerald-400"
                  }`}>{sel.status === "ok" ? "🟢" : sel.status === "warning" ? "🟡" : "🔴"} {fmtNum(sel.birdCount)} szt.</span>
                </div>
                <div className="mt-1 grid grid-cols-4 gap-2 text-xs text-zinc-400">
                  <span>Śr. masa <b className="text-zinc-200">{(sel.avgWeightG / 1000).toFixed(2)} kg</b></span>
                  <span>FCR <b className="text-zinc-200">{num(sel.fcr).toFixed(2)}</b></span>
                  <span>Śmiert. <b className="text-zinc-200">{num(sel.mortalityPct).toFixed(1)}%</b></span>
                  <span>Woda <b className="text-zinc-200">{fmtNum(sel.waterIntakeMl ?? 0)} ml</b></span>
                </div>
                <div className="mt-1 text-[10px] text-zinc-600">{sel.origin === "dynamic" ? "wykryty automatycznie" : "ręczny"} · {sel.criteria}</div>
                {sel.status === "critical" && (
                  <div className="mt-2 rounded bg-red-950/50 px-2 py-1 text-[11px] text-red-300">
                    🔍 Selekt wymaga analizy: sprawdź temperaturę, dostęp do paszy i wody w strefie oraz historię zdrowotną.
                  </div>
                )}
              </div>
            ))}
            {d.selects.length === 0 && <div className="text-sm text-zinc-600">Brak selektów — dodaj ważenie lub przelicz.</div>}
          </div>
        </div>
      </div>

      {/* Dziennik produkcji */}
      <DailyLogSection batchId={batchId} />

      {/* Analiza AI + prognoza + alerty (FOUNDATION production-engine) */}
      <ProductionIntelligence batchId={batchId} />

      {/* Szczepienia + leczenie */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Kalendarz szczepień</h2>
          <div className="space-y-1.5">
            {d.vaccinations.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-md bg-zinc-900 px-3 py-2 text-sm">
                <Syringe className={`h-4 w-4 ${v.done ? "text-emerald-400" : "text-amber-400"}`} />
                <span className="text-zinc-400">{v.day}</span>
                <span className="flex-1">{v.vaccine}</span>
                <span className="text-xs text-zinc-500">{v.method}</span>
                {!v.done && (
                  <button onClick={() => markVax.mutate({ id: v.id })} className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700">
                    Oznacz wykonane
                  </button>
                )}
                {v.done && <span className="text-xs text-emerald-400">✓</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Historia leczenia</h2>
          <div className="space-y-1.5">
            {d.treatments.map((t) => (
              <div key={t.id} className="rounded-md bg-zinc-900 px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{t.product}</span>
                  <span className="text-xs text-zinc-500">{t.startedAt}</span>
                </div>
                <div className="text-xs text-zinc-400">{t.activeSubstance} · {t.dose} · karencja {t.withdrawalDays} dni {t.vet ? `· ${t.vet}` : ""}</div>
              </div>
            ))}
            {d.treatments.length === 0 && <div className="text-sm text-zinc-600">Brak interwencji weterynaryjnych.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= DZIENNIK PRODUKCJI ================= */

function DailyLogSection({ batchId }: { batchId: number }) {
  const stats = trpc.daily.stats.useQuery({ batchId });
  const utils = trpc.useUtils();
  const upsert = trpc.daily.upsert.useMutation({
    onSuccess: () => {
      utils.daily.stats.invalidate({ batchId });
      utils.farm.production.batchDetail.invalidate({ id: batchId });
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    day: today, mortality: 0, culls: 0, waterLiters: "", feedKg: "",
    tempC: "", humidityPct: "", ammoniaPpm: "", note: "",
  });

  const d = stats.data;
  const t = d?.totals;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Dziennik produkcji — wpis dzienny
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9">
          <label className="text-xs text-zinc-500">Data
            <input type="date" className={inputCls} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-500">Upadki (szt.)
            <input type="number" min={0} className={inputCls} value={f.mortality || ""} onChange={(e) => setF({ ...f, mortality: Number(e.target.value) })} />
          </label>
          <label className="text-xs text-zinc-500">Brakowania (szt.)
            <input type="number" min={0} className={inputCls} value={f.culls || ""} onChange={(e) => setF({ ...f, culls: Number(e.target.value) })} />
          </label>
          <label className="text-xs text-zinc-500">Woda (l)
            <input type="number" min={0} className={inputCls} value={f.waterLiters} onChange={(e) => setF({ ...f, waterLiters: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-500">Pasza (kg)
            <input type="number" min={0} className={inputCls} value={f.feedKg} onChange={(e) => setF({ ...f, feedKg: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-500">Temp. (°C)
            <input type="number" step="0.1" className={inputCls} value={f.tempC} onChange={(e) => setF({ ...f, tempC: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-500">Wilgotność (%)
            <input type="number" step="0.1" className={inputCls} value={f.humidityPct} onChange={(e) => setF({ ...f, humidityPct: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-500">NH₃ (ppm)
            <input type="number" step="0.1" className={inputCls} value={f.ammoniaPpm} onChange={(e) => setF({ ...f, ammoniaPpm: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-500">Uwagi
            <input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={upsert.isPending}
            onClick={() => upsert.mutate({
              batchId, day: f.day, mortality: f.mortality, culls: f.culls,
              waterLiters: f.waterLiters ? Number(f.waterLiters) : undefined,
              feedKg: f.feedKg ? Number(f.feedKg) : undefined,
              tempC: f.tempC ? Number(f.tempC) : undefined,
              humidityPct: f.humidityPct ? Number(f.humidityPct) : undefined,
              ammoniaPpm: f.ammoniaPpm ? Number(f.ammoniaPpm) : undefined,
              note: f.note || undefined,
            })}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-50"
          >
            {upsert.isPending ? "Zapisuję…" : "Zapisz wpis (przeliczy stan stada)"}
          </button>
          {upsert.data && (
            <span className="text-xs text-emerald-400">
              ✓ {upsert.data.updated ? "Zaktualizowano istniejący wpis" : "Dodano wpis"} — stan stada i KPI przeliczone.
            </span>
          )}
          {upsert.isError && <span className="text-xs text-red-400">{upsert.error.message}</span>}
        </div>
      </div>

      {t && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {[
            ["Upadki łącznie", `${fmtNum(t.mortality)} szt.`],
            ["Brakowania", `${fmtNum(t.culls)} szt.`],
            ["Straty ogółem", `${t.lossPct.toFixed(2)}%`],
            ["Woda łącznie", `${fmtNum(t.waterLiters / 1000, 1)} m³`],
            ["Pasza łącznie", `${fmtNum(t.feedKg / 1000, 2)} t`],
            ["Pasza / kg biomasy", t.feedPerKgBiomass.toFixed(2)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">{l}</div>
              <div className="mt-1 text-lg font-bold">{v}</div>
            </div>
          ))}
        </div>
      )}

      {d && d.logs.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Woda na ptaka (ml/dzień)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.logs}>
                <CartesianGrid stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
                <Line type="monotone" dataKey="waterPerBirdMl" stroke="#38bdf8" strokeWidth={2} dot={false} name="ml/ptak" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Straty narastająco (szt.)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.logs}>
                <CartesianGrid stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }} />
                <Line type="monotone" dataKey="cumLoss" stroke="#f59e0b" strokeWidth={2} dot={false} name="upadki+brakowania" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {d && d.logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-right">Upadki</th>
                <th className="px-3 py-2 text-right">Brakow.</th>
                <th className="px-3 py-2 text-right">Woda (l)</th>
                <th className="px-3 py-2 text-right">ml/ptak</th>
                <th className="px-3 py-2 text-right">Pasza (kg)</th>
                <th className="px-3 py-2 text-right">g/ptak</th>
                <th className="px-3 py-2 text-right">°C</th>
                <th className="px-3 py-2 text-right">Wilg. %</th>
                <th className="px-3 py-2 text-right">NH₃</th>
                <th className="px-3 py-2 text-right">Odch. wody</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {[...d.logs].reverse().slice(0, 14).map((l) => (
                <tr key={l.day} className="hover:bg-zinc-900/50">
                  <td className="px-3 py-2">{l.day}</td>
                  <td className={`px-3 py-2 text-right ${l.mortality > 0 ? "text-amber-400" : "text-zinc-500"}`}>{l.mortality}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{l.culls}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(l.water)}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{l.waterPerBirdMl ? fmtNum(l.waterPerBirdMl) : "—"}</td>
                  <td className="px-3 py-2 text-right">{fmtNum(l.feed)}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{l.feedPerBirdG ? fmtNum(l.feedPerBirdG) : "—"}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{l.tempC ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{l.humidityPct ?? "—"}</td>
                  <td className={`px-3 py-2 text-right ${(l.ammoniaPpm ?? 0) > 20 ? "text-red-400" : "text-zinc-400"}`}>{l.ammoniaPpm ?? "—"}</td>
                  <td className={`px-3 py-2 text-right ${(l.waterDeviationPct ?? 0) > 15 ? "text-red-400" : (l.waterDeviationPct ?? 0) < -15 ? "text-sky-400" : "text-zinc-400"}`}>
                    {l.waterDeviationPct !== null ? `${l.waterDeviationPct > 0 ? "+" : ""}${l.waterDeviationPct.toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QuickWalk({ batchId, sex, onClose }: { batchId: number; sex: "toms" | "hens" | "mixed"; onClose: () => void }) {
  const utils = trpc.useUtils();
  const upsert = trpc.daily.upsert.useMutation({
    onSuccess: () => {
      utils.daily.stats.invalidate({ batchId });
      utils.farm.production.batchDetail.invalidate({ id: batchId });
    },
  });
  const [f, setF] = useState({
    day: new Date().toISOString().slice(0, 10), observation: "", status: "OK", bedded: false,
    tempC: "", humidityPct: "", ammoniaPpm: "", mortality: "", feedKg: "", waterLiters: "",
    toms: "", hens: "",
  });
  const save = () => {
    const note = [
      "[OBCHÓD]",
      `Status: ${f.status}`,
      f.observation.trim() ? `Obserwacja: ${f.observation.trim()}` : "",
      f.bedded ? "Ścielono: tak" : "",
      sex === "mixed" && (f.toms || f.hens) ? `Podział: indory ${f.toms || "brak danych"}, indyczki ${f.hens || "brak danych"}` : "",
    ].filter(Boolean).join(" | ").slice(0, 500);
    upsert.mutate({
      batchId, day: f.day, note,
      preserveExisting: true,
      mortality: Number(f.mortality) || 0, culls: 0,
      tempC: f.tempC ? Number(f.tempC) : undefined,
      humidityPct: f.humidityPct ? Number(f.humidityPct) : undefined,
      ammoniaPpm: f.ammoniaPpm ? Number(f.ammoniaPpm) : undefined,
      feedKg: f.feedKg ? Number(f.feedKg) : undefined,
      waterLiters: f.waterLiters ? Number(f.waterLiters) : undefined,
    });
  };
  return (
    <section className="rounded-2xl border border-red-800/70 bg-zinc-900 p-5 shadow-xl shadow-red-950/20">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-red-300">+ Szybki obchód</h2><p className="mt-1 text-xs text-zinc-500">Wpis zostanie zapisany w istniejącym Dzienniku Produkcji.</p></div><button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Zamknij"><X className="h-5 w-5" /></button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-zinc-500">Data<input type="date" className={inputCls} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></label>
        <label className="text-xs text-zinc-500">Status stada<select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>OK</option><option>Do obserwacji</option><option>Wymaga reakcji</option></select></label>
        <label className="text-xs text-zinc-500">Temperatura (°C, opcjonalnie)<input type="number" step="0.1" className={inputCls} value={f.tempC} onChange={(e) => setF({ ...f, tempC: e.target.value })} /></label>
        <label className="text-xs text-zinc-500">Wilgotność (%, opcjonalnie)<input type="number" step="0.1" className={inputCls} value={f.humidityPct} onChange={(e) => setF({ ...f, humidityPct: e.target.value })} /></label>
        <label className="text-xs text-zinc-500">NH₃ (ppm, opcjonalnie)<input type="number" step="0.1" className={inputCls} value={f.ammoniaPpm} onChange={(e) => setF({ ...f, ammoniaPpm: e.target.value })} /></label>
        <label className="text-xs text-zinc-500">Upadki (szt., opcjonalnie)<input type="number" min="0" className={inputCls} value={f.mortality} onChange={(e) => setF({ ...f, mortality: e.target.value })} /></label>
        <label className="text-xs text-zinc-500">Pasza (kg, opcjonalnie)<input type="number" min="0" step="0.1" className={inputCls} value={f.feedKg} onChange={(e) => setF({ ...f, feedKg: e.target.value })} /></label>
        <label className="text-xs text-zinc-500">Woda (l, opcjonalnie)<input type="number" min="0" step="0.1" className={inputCls} value={f.waterLiters} onChange={(e) => setF({ ...f, waterLiters: e.target.value })} /></label>
      </div>
      {sex === "mixed" && <div className="mt-3 grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 sm:grid-cols-2"><label className="text-xs text-zinc-500">Indory — obserwacja/liczba (opcjonalnie)<input className={inputCls} value={f.toms} onChange={(e) => setF({ ...f, toms: e.target.value })} /></label><label className="text-xs text-zinc-500">Indyczki — obserwacja/liczba (opcjonalnie)<input className={inputCls} value={f.hens} onChange={(e) => setF({ ...f, hens: e.target.value })} /></label></div>}
      <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={f.bedded} onChange={(e) => setF({ ...f, bedded: e.target.checked })} className="accent-red-600" /> Ścielono podczas obchodu</label>
      <label className="mt-3 block text-xs text-zinc-500">Obserwacja / notatka<textarea maxLength={380} rows={3} className={inputCls} value={f.observation} onChange={(e) => setF({ ...f, observation: e.target.value })} placeholder="Co zauważono w stadzie?" /></label>
      <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={upsert.isPending} onClick={save} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">{upsert.isPending ? "Zapisuję…" : "Zapisz obchód"}</button>{upsert.isSuccess && <span className="text-xs text-emerald-400">Obchód zapisany w Dzienniku Produkcji.</span>}{upsert.isError && <span className="text-xs text-red-400">{upsert.error.message}</span>}</div>
    </section>
  );
}

function BatchAnalyticsCenter({ batch, batchId, onClose }: { batch: any; batchId: number; onClose: () => void }) {
  const daily = trpc.daily.stats.useQuery({ batchId });
  const logs = daily.data?.logs ?? [];
  const latest = [...logs].reverse()[0];
  const quickWalks = [...logs].reverse().filter((log: any) => log.note?.startsWith("[OBCHÓD]"));
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(`${batch.batch.startDate}T00:00:00`).getTime()) / 86400000));
  const value = (present: unknown, formatted: string) => present === null || present === undefined || present === 0 ? "brak danych" : formatted;
  const cards = [
    ["Liczba początkowa", fmtNum(batch.batch.initialCount)], ["Aktualnie", fmtNum(batch.batch.currentCount)],
    ["Wiek", `${ageDays} dni`], ["Upadki", value(daily.data?.totals?.mortality, `${fmtNum(daily.data?.totals?.mortality)} szt.`)],
    ["Śr. masa", value(batch.avgWeightG, `${(batch.avgWeightG / 1000).toFixed(2)} kg`)], ["FCR", value(batch.fcr, batch.fcr?.toFixed(2))],
    ["Pasza", value(daily.data?.totals?.feedKg, `${fmtNum(daily.data?.totals?.feedKg)} kg`)], ["Woda", value(daily.data?.totals?.waterLiters, `${fmtNum(daily.data?.totals?.waterLiters)} l`)],
    ["Temperatura", value(latest?.tempC, `${latest?.tempC} °C`)], ["Wilgotność", value(latest?.humidityPct, `${latest?.humidityPct}%`)], ["NH₃", value(latest?.ammoniaPpm, `${latest?.ammoniaPpm} ppm`)],
  ];
  return <section className="rounded-2xl border border-red-800/70 bg-zinc-950 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-red-300">Centrum analityczne rzutu</h2><p className="text-sm text-zinc-500">{batch.batch.code} — dane z istniejącego rzutu i Dziennika Produkcji</p></div><button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Zamknij"><X className="h-5 w-5" /></button></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{cards.map(([label, data]) => <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3"><div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div><div className="mt-1 text-sm font-bold text-red-100">{data}</div></div>)}</div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><h3 className="font-semibold text-red-200">Ostatnie ważenia</h3>{batch.weighings.length ? <div className="mt-2 space-y-2">{batch.weighings.slice(-5).reverse().map((w: any) => <div key={w.id} className="flex justify-between text-sm"><span className="text-zinc-400">dzień {w.dayAge}</span><span>{(w.avgWeightG / 1000).toFixed(2)} kg · n={w.sampleSize}</span></div>)}</div> : <p className="mt-2 text-sm text-zinc-500">brak danych</p>}</div><div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><h3 className="font-semibold text-red-200">Szybkie obchody / notatki</h3>{quickWalks.length ? <div className="mt-2 space-y-2">{quickWalks.slice(0, 5).map((log: any) => <div key={log.day} className="rounded bg-zinc-950 p-2 text-xs"><span className="mr-2 font-mono text-red-300">{log.day}</span>{log.note}</div>)}</div> : <p className="mt-2 text-sm text-zinc-500">brak danych</p>}</div></div><div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800"><table className="w-full text-sm"><thead className="bg-zinc-900 text-left text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="px-3 py-2">Historia dzienna</th><th className="px-3 py-2 text-right">Upadki</th><th className="px-3 py-2 text-right">Pasza</th><th className="px-3 py-2 text-right">Woda</th><th className="px-3 py-2 text-right">Temp.</th><th className="px-3 py-2">Notatka</th></tr></thead><tbody className="divide-y divide-zinc-800">{logs.length ? [...logs].reverse().slice(0, 14).map((log: any) => <tr key={log.day}><td className="px-3 py-2">{log.day}</td><td className="px-3 py-2 text-right">{log.mortality || "—"}</td><td className="px-3 py-2 text-right">{log.feed || "—"}</td><td className="px-3 py-2 text-right">{log.water || "—"}</td><td className="px-3 py-2 text-right">{log.tempC ?? "—"}</td><td className="max-w-80 truncate px-3 py-2 text-xs text-zinc-400">{log.note || "—"}</td></tr>) : <tr><td colSpan={6} className="px-3 py-4 text-center text-zinc-500">brak danych</td></tr>}</tbody></table></div></section>;
}
