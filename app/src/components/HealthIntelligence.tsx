import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Activity, ClipboardList, HeartPulse, Syringe } from "lucide-react";

/**
 * Sekcja HEALTH INTELLIGENCE dla strony Health — programy szczepień,
 * risk score, rekordy zdrowia (backend: router healthIntel,
 * port FOUNDATION health-intelligence-engine).
 */
export default function HealthIntelligence() {
  const programs = trpc.healthIntel.vaccinationPrograms.useQuery();
  const [batchIdInput, setBatchIdInput] = useState("");
  const batchId = Number(batchIdInput) || 0;
  const schedule = trpc.healthIntel.vaccinationSchedule.useQuery(
    { batchId },
    { enabled: batchId > 0 },
  );
  const risk = trpc.healthIntel.riskScore.useMutation();

  const scoreCls = (v: number) =>
    v >= 80 ? "text-emerald-400" : v >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-6">
      {/* ---------- Programy szczepień ---------- */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Syringe className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Programy szczepień (wieloetapowe)
          </h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {(programs.data ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{p.name}</span>
                {p.isDefault && (
                  <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-400">DOMYŚLNY</span>
                )}
              </div>
              {p.geneticLine && <p className="text-xs text-zinc-500">Linia: {p.geneticLine}</p>}
              <div className="mt-2 space-y-1">
                {p.steps.map((st) => (
                  <div key={st.id} className="flex justify-between rounded bg-zinc-800/60 px-2 py-1 text-xs">
                    <span>{st.vaccineName}</span>
                    <span className="text-zinc-400">d{st.ageDays} · {st.route}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {programs.data?.length === 0 && (
            <p className="py-3 text-xs text-zinc-600">
              Brak programów — utwórz pierwszy przez API <code>healthIntel.vaccinationProgramCreate</code>.
            </p>
          )}
        </div>
      </div>

      {/* ---------- Harmonogram + Risk Score ---------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Harmonogram stada
            </h2>
          </div>
          <input
            value={batchIdInput}
            onChange={(e) => setBatchIdInput(e.target.value)}
            placeholder="ID stada (batch)…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
          />
          {schedule.data?.program && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-zinc-500">Program: {schedule.data.program.name}</p>
              {schedule.data.schedule.map((st: { id: number; vaccineName: string; plannedDate: string; route: string }) => (
                <div key={st.id} className="flex justify-between rounded bg-zinc-800/60 px-2 py-1 text-xs">
                  <span>{st.vaccineName}</span>
                  <span className="text-zinc-400">{st.plannedDate} · {st.route}</span>
                </div>
              ))}
            </div>
          )}
          {schedule.data && !schedule.data.program && (
            <p className="mt-3 text-xs text-zinc-600">Brak dopasowanego programu dla tego stada.</p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Risk Score stada
            </h2>
          </div>
          <button
            disabled={!batchId || risk.isPending}
            onClick={() => risk.mutate({ batchId })}
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40"
          >
            {risk.isPending ? "Obliczanie…" : "Oblicz risk score"}
          </button>
          {risk.data && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  ["Zdrowie", risk.data.healthScore],
                  ["Produkcja", risk.data.productionScore],
                  ["Dobrostan", risk.data.welfareScore],
                  ["Ryzyko (0=brak)", 100 - risk.data.riskScore],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="rounded-lg bg-zinc-950/60 px-3 py-2">
                  <span className="text-xs text-zinc-500">{label}</span>
                  <div className={`text-lg font-bold ${scoreCls(v)}`}>{v}</div>
                </div>
              ))}
              <div className="col-span-2 flex items-center gap-2 rounded-lg bg-zinc-950/60 px-3 py-2 text-xs text-zinc-500">
                <Activity className="h-3 w-3" />
                Śmiertelność {risk.data.factors.mortalityFactor}% · FCR {risk.data.factors.fcrFactor} · Leczenia {risk.data.factors.treatmentFactor} · Wiek {risk.data.factors.ageFactor} d
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
