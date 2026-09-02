import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { BookOpen, FlaskConical, Sparkles } from "lucide-react";

/**
 * Sekcja FEED INTELLIGENCE dla NutritionLab — optymalizator receptur,
 * baza wiedzy o surowcach, eksperymenty (backend: router feedIntel,
 * port FOUNDATION feed-module). Wyświetlana jako osobna sekcja pod laboratorium.
 */
export default function FeedIntelligence() {
  const [priority, setPriority] = useState<"cost" | "fcr" | "adg" | "health" | "balanced">("balanced");
  const [query, setQuery] = useState("");
  const [runOpt, setRunOpt] = useState(false);

  const optimize = trpc.feedIntel.optimize.useQuery(
    { priority },
    { enabled: runOpt },
  );
  const knowledge = trpc.feedIntel.knowledgeSearch.useQuery(
    query ? { query } : {},
  );

  return (
    <div className="space-y-6">
      {/* ---------- Optymalizator ---------- */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Optymalizator receptur
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["balanced", "cost", "fcr", "adg", "health"] as const).map((p) => (
            <button
              key={p}
              onClick={() => { setPriority(p); setRunOpt(false); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                priority === p ? "bg-red-600/20 text-red-400" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {p === "balanced" ? "Zbalansowany" : p === "cost" ? "Koszt" : p === "fcr" ? "FCR" : p === "adg" ? "ADG" : "Zdrowie"}
            </button>
          ))}
          <button
            onClick={() => setRunOpt(true)}
            className="ml-auto rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
          >
            Optymalizuj
          </button>
        </div>
        {optimize.data && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-zinc-500">
              Szacowany koszt: <span className="font-semibold text-zinc-200">{optimize.data.estimatedCostPerTon} EUR/t</span>
            </p>
            <div className="grid gap-1">
              {optimize.data.ingredients.map((i) => (
                <div key={i.ingredientId} className="flex items-center justify-between rounded bg-zinc-800/60 px-3 py-1.5 text-xs">
                  <span>Surowiec #{i.ingredientId}</span>
                  <span className="font-semibold text-zinc-200">{i.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------- Baza wiedzy ---------- */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Wiedza o surowcach
          </h2>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj: soja, mykotoksyny, lizyna…"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
        />
        <div className="mt-3 space-y-2">
          {(knowledge.data?.entries ?? []).slice(0, 8).map((e) => (
            <div key={e.id} className="rounded-lg bg-zinc-800/60 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-200">{e.title}</span>
                <span className="text-zinc-500">{e.source}{e.year ? ` · ${e.year}` : ""}</span>
              </div>
              <p className="mt-1 text-zinc-400">{e.summary}</p>
            </div>
          ))}
          {knowledge.data && knowledge.data.entries.length === 0 && (
            <p className="py-4 text-center text-xs text-zinc-600">
              Brak wpisów wiedzy — baza zostanie zasilona w kolejnej fazie.
            </p>
          )}
        </div>
        {(knowledge.data?.commonMistakes.length ?? 0) > 0 && (
          <div className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="mb-1 text-xs font-semibold text-amber-400">Typowe błędy</p>
            {knowledge.data!.commonMistakes.map((m, i) => (
              <div key={i} className="mt-1 text-xs text-amber-200/80">
                <strong>{m.mistake}</strong> — {m.consequence} → {m.solution}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Eksperymenty ---------- */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Laboratorium eksperymentów
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          Scenariusze A/B na bazie istniejących receptur (add/remove/adjust surowców)
          dostępne przez API <code className="text-zinc-400">feedIntel.experimentRun</code>.
          Pełny kreator eksperymentów — w kolejnej iteracji UI.
        </p>
      </div>
    </div>
  );
}
