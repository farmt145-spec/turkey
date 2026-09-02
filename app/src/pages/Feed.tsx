import { trpc } from "@/providers/trpc";
import { countryFlag, fmtEur2, fmtNum, num } from "@/lib/geo";
import { useMemo, useState } from "react";
import {
  FlaskConical, Sparkles, Scale, History, Wheat, Truck, ClipboardList,
  Printer, ChevronDown, ChevronUp, BadgeCheck, AlertTriangle, GitCompareArrows,
  Wand2, Download, Upload, Trash2, Plus, CheckCircle2, XCircle, Lightbulb, Info,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { getProductMode, productModeLabel } from "@/lib/product-mode";

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500";
const cardCls = "rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur";
const headCls = "border-b border-zinc-800 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-zinc-400";

const AGE_GROUPS = [
  { key: "prestarter", label: "Prestarter 0–14 d" },
  { key: "starter", label: "Starter 15–28 d" },
  { key: "grower1", label: "Grower I 29–56 d" },
  { key: "grower2", label: "Grower II 57–84 d" },
  { key: "finisher1", label: "Finisher I 85–112 d" },
  { key: "finisher2", label: "Finisher II 113+ d" },
] as const;

type Tab = "creator" | "optimizer" | "recipes" | "compare" | "ingredients" | "programs" | "deliveries";
const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "creator", label: "Kreator receptur", icon: Wand2 },
  { key: "optimizer", label: "Optymalizator", icon: Sparkles },
  { key: "recipes", label: "Receptury i raporty", icon: ClipboardList },
  { key: "compare", label: "Porównanie A/B", icon: GitCompareArrows },
  { key: "ingredients", label: "Surowce", icon: Wheat },
  { key: "programs", label: "Programy żywienia", icon: FlaskConical },
  { key: "deliveries", label: "Wydania z silosów", icon: Truck },
];

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? "border-emerald-700 bg-emerald-950/50 text-emerald-300"
    : score >= 60 ? "border-amber-700 bg-amber-950/40 text-amber-300"
    : "border-red-800 bg-red-950/40 text-red-300";
  return <span className={`rounded-lg border px-2 py-1 text-sm font-bold ${cls}`}>{score}/100</span>;
}

function buildRecipeAlerts(assistData: any, total: number, activeCount: number) {
  const alerts: { level: "info" | "warning" | "critical"; title: string; text: string }[] = [];

  if (activeCount === 0) {
    alerts.push({
      level: "info",
      title: "Rozpocznij kompletowanie receptury",
      text: "Dodaj minimum 2–3 surowce i ustaw udział procentowy, aby system ocenił mieszankę według fazy żywienia.",
    });
    return alerts;
  }

  if (Math.abs(total - 100) > 5) {
    alerts.push({
      level: "warning",
      title: "Suma udziałów odbiega od 100%",
      text: `Aktualnie ${total.toFixed(1)}%. Warto doprowadzić udział do 100%, aby receptura była spójna operacyjnie.`,
    });
  }

  if (assistData) {
    if (assistData.profile?.protein < (assistData.targets?.protein ?? 0) * 0.96) {
      alerts.push({
        level: "warning",
        title: "Białko poniżej celu",
        text: `Profil receptury: ${Number(assistData.profile?.protein ?? 0).toFixed(1)}% przy wymaganym ${Number(assistData.targets?.protein ?? 0).toFixed(1)}%.`,
      });
    }

    if (assistData.profile?.energy < (assistData.targets?.energy ?? 0) * 0.97) {
      alerts.push({
        level: "warning",
        title: "Energia poniżej rekomendacji",
        text: `Energia ${Number(assistData.profile?.energy ?? 0).toFixed(0)} kcal/kg przy celu ${Number(assistData.targets?.energy ?? 0).toFixed(0)} kcal/kg.`,
      });
    }

    if (assistData.production?.fcr > 2.5) {
      alerts.push({
        level: "critical",
        title: "FCR jest za wysoki",
        text: `Obecny FCR ${Number(assistData.production?.fcr ?? 0).toFixed(2)} wskazuje na warunki poniżej oczekiwań dla tej fazy produkcji.`,
      });
    }

    if (assistData.production?.metabolicRisk > 25) {
      alerts.push({
        level: "critical",
        title: "Ryzyko metaboliczne rośnie",
        text: `Metabolic risk wynosi ${Number(assistData.production?.metabolicRisk ?? 0).toFixed(0)}%. Rozważ korektę składników i zwiększenie kontroli fazy.`,
      });
    }

    if (assistData.profile?.costPerTon > 1600) {
      alerts.push({
        level: "warning",
        title: "Mieszanka jest droższa od benchmarku",
        text: `Koszt tony ${Number(assistData.profile?.costPerTon ?? 0).toFixed(0)} EUR może ograniczać rentowność przy tej linii genetycznej.`,
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      level: "info",
      title: "Receptura w dobrej kondycji",
      text: "System nie wykrył ostrych odchyleń. W dalszej kolejności warto zatwierdzić wariant i przejść do analizy produkcyjnej.",
    });
  }

  return alerts.slice(0, 4);
}

export default function Feed() {
  const [tab, setTab] = useState<Tab>("optimizer");
  const mode = getProductMode();
  const premiumHighlights = [
    { label: "Receptury", value: "AI + ekspercki scoring" },
    { label: "Kontrola kosztu", value: "benchmark / korekta" },
    { label: "Raport prod.", value: "FCR / ADG / EPEF" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-500/5 p-4 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
              Premium Nutrition Suite
            </div>
            <h1 className="text-2xl font-bold text-white">Żywienie — Feed Formulation Engine</h1>
          </div>
          <div className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${mode === "demo" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
            {productModeLabel(mode)}
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-400">Baza surowców, optymalizator, raporty eksperckie, historia zmian i porównywarka receptur — przygotowane dla pracy operacyjnej i prezentacji klienta.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {premiumHighlights.map((item) => (
            <div key={item.label} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{item.label}</div>
              <div className="mt-2 text-sm font-semibold text-emerald-300">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Baza surowców, optymalizator, raporty eksperckie, historia zmian i porównywarka receptur</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
              tab === t.key
                ? "border-emerald-700 bg-emerald-950/50 text-emerald-300"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "creator" && <RecipeCreator />}
      {tab === "optimizer" && <Optimizer />}
      {tab === "recipes" && <Recipes />}
      {tab === "compare" && <CompareRecipes />}
      {tab === "ingredients" && <Ingredients />}
      {tab === "programs" && <FeedPrograms />}
      {tab === "deliveries" && <FeedDeliveries />}
    </div>
  );
}

/* ================= KREATOR RECEPUR + EXPORT/IMPORT ================= */
type MixRow = { ingredientId: number; percent: number };

function RecipeCreator() {
  const ings = trpc.farm.feed.ingredients.useQuery();
  const utils = trpc.useUtils();
  const [ageGroup, setAgeGroup] = useState<string>("grower2");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [mix, setMix] = useState<MixRow[]>([]);
  const [addId, setAddId] = useState(0);
  const [batchKg, setBatchKg] = useState(1000);
  const [sex, setSex] = useState<"toms" | "hens" | "mixed">("mixed");
  const [season, setSeason] = useState<"winter" | "summer" | "all">("all");

  const active = mix.filter((m) => m.percent > 0);
  const debounced = useRef<MixRow[]>([]);
  const [liveItems, setLiveItems] = useState<MixRow[]>([]);
  useEffect(() => {
    debounced.current = active;
    const t = setTimeout(() => setLiveItems(debounced.current), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(active)]);

  const assist = trpc.nutrition.assist.useQuery(
    { items: liveItems, ageGroup: ageGroup as any },
    { enabled: liveItems.length > 0 },
  );

  const total = mix.reduce((a, m) => a + m.percent, 0);

  const recipeAlerts = useMemo(
    () => buildRecipeAlerts(assist.data, total, active.length),
    [assist.data, total, active.length],
  );

  const create = trpc.nutrition.createRecipe.useMutation({
    onSuccess: (d) => {
      toast.success(`Receptura zapisana — ocena ${d.score}/100`);
      utils.farm.feed.recipes.invalidate();
      setMix([]); setName(""); setNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const list = ings.data ?? [];
  // Ten sam surowiec może istnieć w katalogu pod różnymi identyfikatorami.
  // W jednej mieszance pokazujemy go tylko raz, aby nie dublować pozycji.
  const ingredientKey = (name: string) => name.trim().toLocaleLowerCase("pl-PL");
  const usedIngredientNames = new Set(
    mix.map((m) => list.find((i) => i.id === m.ingredientId)?.name).filter(Boolean).map((name) => ingredientKey(name!)),
  );
  const available = list.filter((i) => !usedIngredientNames.has(ingredientKey(i.name)));

  const setPct = (id: number, pct: number) =>
    setMix((m) => m.map((r) => (r.ingredientId === id ? { ...r, percent: Math.max(0, Math.min(100, pct)) } : r)));

  /* ---- export ---- */
  const doExport = async () => {
    const data = await utils.nutrition.exportData.fetch();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bloody-turkey-zywienie-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Wyeksportowano dane żywienia (JSON)");
  };

  /* ---- import ---- */
  const fileRef = useRef<HTMLInputElement>(null);
  const importMut = trpc.nutrition.importData.useMutation({
    onSuccess: (r) => {
      toast.success(`Import: +${r.recipesAdded} receptur, +${r.ingredientsAdded} surowców${r.recipesSkipped ? `, pominięto ${r.recipesSkipped} duplikatów` : ""}`);
      if (r.errors.length) toast.warning(`${r.errors.length} pozycji z błędami — szczegóły w konsoli`);
      if (r.errors.length) console.warn("Import errors:", r.errors);
      utils.farm.feed.recipes.invalidate(); utils.farm.feed.ingredients.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const onImportFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      importMut.mutate({ data, mode: "merge" });
    } catch {
      toast.error("To nie jest prawidłowy plik JSON z eksportu");
    }
  };

  const tipIcon = { error: XCircle, warn: AlertTriangle, ok: CheckCircle2, idea: Lightbulb } as const;
  const tipCls = {
    error: "border-red-800/60 bg-red-950/30 text-red-300",
    warn: "border-amber-800/60 bg-amber-950/25 text-amber-300",
    ok: "border-emerald-800/60 bg-emerald-950/25 text-emerald-300",
    idea: "border-sky-800/60 bg-sky-950/25 text-sky-300",
  } as const;

  return (
    <div className="space-y-6">
      {/* EXPORT / IMPORT */}
      <div className={`${cardCls} flex flex-wrap items-center justify-between gap-3 p-4`}>
        <div className="text-sm text-zinc-400">
          <b className="text-zinc-200">Export / Import danych żywienia</b> — receptury, surowce i programy w jednym pliku JSON (backup, przeniesienie między fermami, archiwum).
        </div>
        <div className="flex gap-2">
          <button onClick={doExport} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500">
            <Download className="h-4 w-4" /> Eksportuj JSON
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importMut.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-600 disabled:opacity-50">
            <Upload className="h-4 w-4" /> {importMut.isPending ? "Importuję…" : "Importuj JSON"}
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ""; }} />
        </div>
      </div>

      {recipeAlerts.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {recipeAlerts.map((alert) => (
            <div
              key={alert.title}
              className={`rounded-xl border p-3 ${
                alert.level === "critical"
                  ? "border-red-500/30 bg-red-500/5 text-red-200"
                  : alert.level === "warning"
                    ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
                    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
              }`}
            >
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">{alert.level}</div>
              <div className="text-sm font-semibold">{alert.title}</div>
              <p className="mt-1 text-xs leading-relaxed opacity-90">{alert.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* lewa kolumna — skład */}
        <div className={`${cardCls} p-5 lg:col-span-3`}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            <Wand2 className="h-4 w-4 text-emerald-400" /> Własna receptura — kreator z asystentem
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-zinc-500">Nazwa receptury
              <input className={inputCls} placeholder="np. Grower II — mieszanka jesienna" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="text-xs text-zinc-500">Faza żywienia (cele oceny)
              <select className={inputCls} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                {AGE_GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-500">Płeć stada
              <select className={inputCls} value={sex} onChange={(e) => setSex(e.target.value as any)}>
                <option value="mixed">mieszane</option><option value="toms">indory</option><option value="hens">indyczki</option>
              </select>
            </label>
            <label className="text-xs text-zinc-500">Sezon
              <select className={inputCls} value={season} onChange={(e) => setSeason(e.target.value as any)}>
                <option value="all">całoroczna</option><option value="winter">zimowa</option><option value="summer">letnia</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <select className={inputCls} value={addId} onChange={(e) => setAddId(Number(e.target.value))}>
              <option value={0}>— dodaj surowiec —</option>
              {available.map((i) => <option key={i.id} value={i.id}>{countryFlag(i.countryCode)} {i.name} ({fmtEur2(num(i.pricePerTon))}/t)</option>)}
            </select>
            <button disabled={!addId} onClick={() => {
              const ingredient = list.find((i) => i.id === addId);
              if (!ingredient || usedIngredientNames.has(ingredientKey(ingredient.name))) return;
              setMix((m) => [...m, { ingredientId: addId, percent: 0 }]);
              setAddId(0);
            }}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600 disabled:opacity-40">
              <Plus className="h-4 w-4" /> Dodaj
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {mix.length === 0 && (
              <p className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
                <Info className="h-4 w-4" /> Dodaj surowce i ustaw udziały — asystent na bieżąco oceni mieszankę względem celów fazy.
              </p>
            )}
            {mix.map((row) => {
              const ing = list.find((i) => i.id === row.ingredientId);
              if (!ing) return null;
              return (
                <div key={row.ingredientId} className="flex items-center gap-3 rounded-lg bg-zinc-900/70 px-3 py-2">
                  <span className="w-48 truncate text-sm">{countryFlag(ing.countryCode)} {ing.name}</span>
                  <input type="range" min={0} max={80} step={0.5} value={row.percent}
                    onChange={(e) => setPct(row.ingredientId, Number(e.target.value))}
                    className="flex-1 accent-emerald-500" />
                  <input type="number" step={0.5} min={0} max={100} value={row.percent}
                    onChange={(e) => setPct(row.ingredientId, Number(e.target.value))}
                    className={`${inputCls} w-20 text-right`} />
                  <span className="text-xs text-zinc-500">%</span>
                  <button onClick={() => setMix((m) => m.filter((r) => r.ingredientId !== row.ingredientId))}
                    className="text-zinc-600 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>

          <div className={`mt-4 flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
            Math.abs(total - 100) < 0.5 ? "border-emerald-800/60 text-emerald-300" : "border-amber-800/60 text-amber-300"}`}>
            <span>Suma udziałów</span>
            <b>{total.toFixed(1)}%</b>
          </div>

          <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/20 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-red-300">Przelicznik mieszadła</h3>
                <p className="mt-1 text-xs text-zinc-500">Zmiana masy partii natychmiast przelicza ilość każdego surowca. Nie zmienia parametrów receptury.</p>
              </div>
              <label className="w-full text-xs text-zinc-400 sm:w-48">Masa całej mieszanki (kg)
                <input type="number" min={0} step={1} value={batchKg || ""} onChange={(e) => setBatchKg(Math.max(0, Number(e.target.value)))} className={`${inputCls} mt-1 text-right`} />
              </label>
            </div>
            {active.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Dodaj surowce do receptury, aby zobaczyć ilości dla partii.</p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900 text-left text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="px-3 py-2">Surowiec</th><th className="px-3 py-2 text-right">Udział</th><th className="px-3 py-2 text-right">Ilość</th></tr></thead>
                  <tbody className="divide-y divide-zinc-800">
                    {active.map((row) => {
                      const ingredient = list.find((i) => i.id === row.ingredientId);
                      if (!ingredient) return null;
                      const kg = batchKg * row.percent / 100;
                      return <tr key={row.ingredientId}><td className="px-3 py-2 text-zinc-200">{ingredient.name}</td><td className="px-3 py-2 text-right text-zinc-400">{row.percent.toFixed(2)}%</td><td className="px-3 py-2 text-right font-semibold text-red-300">{kg.toFixed(2)} kg</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <label className="mt-3 block text-xs text-zinc-500">Notatka (opcjonalnie — trafi do raportu eksperckiego)
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. wariant na droższą soję, test na rzucie PL-KRK-03" />
          </label>

          <button
            disabled={create.isPending || name.trim().length < 3 || active.length === 0 || Math.abs(total - 100) > 5}
            onClick={() => create.mutate({ name: name.trim(), ageGroup: AGE_GROUPS.find((g) => g.key === ageGroup)?.label ?? ageGroup, items: active, note: note || undefined, sex, season, author: "panel" })}
            className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {create.isPending ? "Zapisuję…" : "Zapisz recepturę (trafi do listy z raportem eksperckim)"}
          </button>
        </div>

        {/* prawa kolumna — asystent na żywo */}
        <div className={`${cardCls} p-5 lg:col-span-2`}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Asystent — ocena na żywo</h3>
          {assist.isLoading && active.length > 0 && <p className="text-sm text-zinc-500">Analizuję…</p>}
          {!assist.data && !assist.isLoading && (
            <p className="text-sm text-zinc-500">Ocena pojawi się po dodaniu pierwszego surowca.</p>
          )}
          {assist.data && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ScoreBadge score={assist.data.score} />
                <div className="grid flex-1 grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="rounded bg-zinc-900 p-1.5"><span className="text-zinc-500">FCR</span><div className="font-bold">{assist.data.production.fcr.toFixed(2)}</div></div>
                  <div className="rounded bg-zinc-900 p-1.5"><span className="text-zinc-500">ADG</span><div className="font-bold">{assist.data.production.adgG.toFixed(0)} g</div></div>
                  <div className="rounded bg-zinc-900 p-1.5"><span className="text-zinc-500">Koszt</span><div className="font-bold">{fmtEur2(assist.data.profile.costPerTon)}</div></div>
                </div>
              </div>
              {/* cele fazy — paski */}
              <div className="space-y-1.5 rounded-lg bg-zinc-900/60 p-3">
                {([
                  ["Białko", assist.data.profile.protein, assist.data.targets.protein, "%"],
                  ["Energia", assist.data.profile.energy, assist.data.targets.energy, " kcal"],
                  ["Lizyna", assist.data.profile.lysine, assist.data.targets.lysine, "%"],
                ] as const).map(([label, val, tgt, unit]) => {
                  const ratio = Math.min(val / tgt, 1.25);
                  const good = val >= tgt * 0.95 && val <= tgt * 1.12;
                  return (
                    <div key={label} className="text-xs">
                      <div className="mb-0.5 flex justify-between text-zinc-400">
                        <span>{label}</span><span>{val.toFixed(unit === " kcal" ? 0 : 2)}{unit} / cel {tgt}{unit}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded bg-zinc-800">
                        <div className={`h-full rounded ${good ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${ratio * 80}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* podpowiedzi */}
              <div className="space-y-1.5">
                {assist.data.tips.map((t, i) => {
                  const Ic = tipIcon[t.type];
                  return (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${tipCls[t.type]}`}>
                      <Ic className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{t.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= OPTYMALIZATOR ================= */
function Optimizer() {
  const utils = trpc.useUtils();
  const optimize = trpc.farm.feed.optimize.useMutation({
    onSuccess: () => { utils.farm.feed.recipes.invalidate(); toast.success("Receptura zoptymalizowana i zapisana"); },
    onError: (e) => toast.error(e.message),
  });
  const [goal, setGoal] = useState({
    proteinMin: 24, energyMin: 2950, lysineMin: 1.35,
    strategy: "cheapest" as "cheapest" | "maxGrowth" | "balanced",
    ageGroup: "Grower II 57–84 d",
  });

  return (
    <div className={`${cardCls} p-5`}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        <Sparkles className="h-4 w-4 text-emerald-400" /> Recipe Optimization Engine
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <label className="text-xs text-zinc-500">Grupa wiekowa
          <select className={inputCls} value={goal.ageGroup} onChange={(e) => setGoal({ ...goal, ageGroup: e.target.value })}>
            {AGE_GROUPS.map((g) => <option key={g.key}>{g.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500">Strategia
          <select className={inputCls} value={goal.strategy} onChange={(e) => setGoal({ ...goal, strategy: e.target.value as any })}>
            <option value="cheapest">Minimalizacja kosztu</option>
            <option value="maxGrowth">Maksymalizacja ADG</option>
            <option value="balanced">Zrównoważona</option>
          </select>
        </label>
        <label className="text-xs text-zinc-500">Białko min. (%)
          <input type="number" step="0.1" className={inputCls} value={goal.proteinMin} onChange={(e) => setGoal({ ...goal, proteinMin: Number(e.target.value) })} />
        </label>
        <label className="text-xs text-zinc-500">Energia min. (kcal/kg)
          <input type="number" step="10" className={inputCls} value={goal.energyMin} onChange={(e) => setGoal({ ...goal, energyMin: Number(e.target.value) })} />
        </label>
        <label className="text-xs text-zinc-500">Lizyna min. (%)
          <input type="number" step="0.01" className={inputCls} value={goal.lysineMin} onChange={(e) => setGoal({ ...goal, lysineMin: Number(e.target.value) })} />
        </label>
      </div>
      <button
        disabled={optimize.isPending}
        onClick={() => optimize.mutate(goal)}
        className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        {optimize.isPending ? "Optymalizuję…" : "Optymalizuj recepturę"}
      </button>
      {optimize.isError && <p className="mt-2 text-xs text-red-400">{optimize.error.message}</p>}
      {optimize.data && (
        <div className="mt-4 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <div><span className="text-zinc-500">Koszt:</span> <b>{fmtEur2(num(optimize.data.cost))}/t</b></div>
            <div><span className="text-zinc-500">Białko:</span> <b>{num(optimize.data.protein).toFixed(1)}%</b></div>
            <div><span className="text-zinc-500">Energia:</span> <b>{fmtNum(num(optimize.data.energy))} kcal</b></div>
            <div><span className="text-zinc-500">Lizyna:</span> <b>{num(optimize.data.lysine).toFixed(2)}%</b></div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-emerald-300/90">💡 {optimize.data.explanation}</p>
        </div>
      )}
    </div>
  );
}

/* ================= RECEPURY + RAPORT EKSPERCKI + HISTORIA ================= */
function Recipes() {
  const recipes = trpc.farm.feed.recipes.useQuery();
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className={cardCls}>
      <h2 className={headCls}>Receptury ({recipes.data?.length ?? 0}) — kliknij, aby otworzyć raport ekspercki</h2>
      <div className="divide-y divide-zinc-800">
        {(recipes.data ?? []).map((r) => (
          <div key={r.id}>
            <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="w-full p-4 text-left hover:bg-zinc-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {r.strategy === "cheapest" ? "NAJTAŃSZA" : r.strategy === "maxGrowth" ? "MAX ADG" : "ZRÓWNOWAŻONA"}
                  </span>
                  {(r as any).version > 1 && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-sky-400">v{(r as any).version}</span>}
                  {(r as any).status === "draft" && <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-300">SZKIC</span>}
                  {(r as any).status === "archived" && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">ARCHIWUM</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-emerald-400">{fmtEur2(num(r.costPerTon))}/t</span>
                  {openId === r.id ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </div>
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {r.ageGroup} · białko {num(r.proteinPct).toFixed(1)}% · {r.energyKcal} kcal · lizyna {num(r.lysinePct).toFixed(2)}%
                {[
                  (r as any).sex && (r as any).sex !== "mixed" ? ((r as any).sex === "toms" ? "indory" : "indyczki") : null,
                  (r as any).season === "winter" ? "zimowa" : (r as any).season === "summer" ? "letnia" : null,
                  (r as any).genetics, (r as any).author && (r as any).author !== "system" ? `autor: ${(r as any).author}` : null,
                ].filter(Boolean).map((x) => <span key={x} className="ml-2 rounded bg-zinc-800/70 px-1.5 py-0.5 text-[10px] text-zinc-400">{x}</span>)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.items.filter((i) => num(i.percent) >= 1).map((i) => (
                  <span key={i.id} className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-300">
                    {i.ingredient?.name} {num(i.percent).toFixed(1)}%
                  </span>
                ))}
              </div>
            </button>
            {openId === r.id && <ExpertPanel recipeId={r.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpertPanel({ recipeId }: { recipeId: number }) {
  const report = trpc.nutrition.expertReport.useQuery({ recipeId });
  const history = trpc.gap.feedIntel.recipeHistory.useQuery({ recipeId });
  const utils = trpc.useUtils();
  const logChange = trpc.gap.feedIntel.logRecipeChange.useMutation({
    onSuccess: () => { utils.gap.feedIntel.recipeHistory.invalidate(); toast.success("Zmiana zalogowana w historii receptury"); },
    onError: (e) => toast.error(e.message),
  });
  const [note, setNote] = useState("");

  if (report.isLoading) return <div className="border-t border-zinc-800 p-4 text-sm text-zinc-500">Generuję raport ekspercki…</div>;
  const d = report.data;
  if (!d) return <div className="border-t border-zinc-800 p-4 text-sm text-zinc-500">Brak raportu.</div>;

  const printReport = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>Raport ekspercki — ${d.recipe.name}</title><style>
      body{font-family:system-ui,Arial;padding:32px;color:#111} h1{font-size:20px} h2{font-size:14px;margin-top:20px;text-transform:uppercase;color:#555}
      table{border-collapse:collapse;width:100%;font-size:12px} td,th{border:1px solid #ccc;padding:5px 8px;text-align:left}
      .kpi{display:inline-block;margin:4px 12px 4px 0;font-size:13px} .score{font-size:24px;font-weight:700}
      ul{font-size:12px;padding-left:18px} p{font-size:13px;line-height:1.5}
    </style></head><body>
      <h1>Raport ekspercki żywienia — ${d.recipe.name}</h1>
      <p>Bloody Turkey Enterprise · wygenerowano ${new Date().toLocaleString("pl-PL")}</p>
      <h2>Ocena ogólna</h2><div class="score">${d.score}/100</div>
      <h2>Wskaźniki produkcyjne</h2>
      <div><span class="kpi"><b>FCR:</b> ${d.production.fcr.toFixed(2)}</span><span class="kpi"><b>ADG:</b> ${d.production.adgG.toFixed(0)} g/d</span>
      <span class="kpi"><b>EPEF:</b> ${d.production.epef.toFixed(0)}</span><span class="kpi"><b>Koszt tony:</b> ${d.profile.costPerTon.toFixed(0)} EUR</span>
      <span class="kpi"><b>Ryzyko metaboliczne:</b> ${d.production.metabolicRisk.toFixed(0)}%</span></div>
      <h2>Skład</h2><table><tr><th>Surowiec</th><th>Udział %</th><th>Cena EUR/t</th></tr>
      ${d.composition.map((c) => `<tr><td>${c.name}</td><td>${c.percent.toFixed(1)}</td><td>${c.pricePerTon.toFixed(0)}</td></tr>`).join("")}
      </table>
      <h2>Uzasadnienie eksperta</h2><p>${d.report}</p>
      ${d.alternatives.length ? `<h2>Propozycje optymalizacji kosztu</h2><ul>${d.alternatives.map((a) => `<li>${a}</li>`).join("")}</ul>` : ""}
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4 border-t border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <ScoreBadge score={d.score} />
        <div className="grid flex-1 grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          <div className="rounded-lg bg-zinc-900 p-2"><div className="text-zinc-500">FCR</div><b>{d.production.fcr.toFixed(2)}</b></div>
          <div className="rounded-lg bg-zinc-900 p-2"><div className="text-zinc-500">ADG</div><b>{d.production.adgG.toFixed(0)} g/d</b></div>
          <div className="rounded-lg bg-zinc-900 p-2"><div className="text-zinc-500">EPEF</div><b>{d.production.epef.toFixed(0)}</b></div>
          <div className="rounded-lg bg-zinc-900 p-2"><div className="text-zinc-500">Ryzyko metab.</div><b className={d.production.metabolicRisk > 40 ? "text-red-400" : "text-emerald-400"}>{d.production.metabolicRisk.toFixed(0)}%</b></div>
          <div className="rounded-lg bg-zinc-900 p-2"><div className="text-zinc-500">Bezpieczeństwo</div><b>{d.production.safety.toFixed(0)}%</b></div>
        </div>
        <button onClick={printReport} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-600 hover:text-emerald-300">
          <Printer className="h-3.5 w-3.5" /> Eksport raportu (PDF/druk)
        </button>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs leading-relaxed text-zinc-300">
        <b className="text-emerald-400">Dlaczego taka ocena? </b>{d.report}
      </div>

      {d.alternatives.length > 0 && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
          <b className="text-xs text-amber-300">Propozycje tańszych zamienników:</b>
          <ul className="mt-1 list-inside list-disc text-xs text-amber-200/80">
            {d.alternatives.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <History className="h-3.5 w-3.5" /> Historia zmian receptury ({history.data?.length ?? 0})
        </h3>
        <div className="mb-2 flex gap-2">
          <input className={inputCls} placeholder="Notatka o zmianie, np. podniesiono udział DDGS o 3%…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button
            disabled={!note.trim() || logChange.isPending}
            onClick={() => { logChange.mutate({ recipeId, changeNote: note, expertReport: `Ocena ${d.score}/100, FCR ${d.production.fcr.toFixed(2)}` }); setNote(""); }}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium hover:bg-emerald-500 disabled:opacity-50"
          >Zaloguj zmianę</button>
        </div>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {(history.data ?? []).map((h) => (
            <div key={h.id} className="flex items-start gap-2 rounded bg-zinc-900/70 px-3 py-1.5 text-xs">
              <BadgeCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              <div>
                <span className="text-zinc-500">{String(h.createdAt).slice(0, 16).replace("T", " ")} · {h.author}</span>
                <div className="text-zinc-300">{h.changeNote}</div>
                {h.expertReport && <div className="text-zinc-500">{h.expertReport}</div>}
              </div>
            </div>
          ))}
          {history.data?.length === 0 && <div className="text-xs text-zinc-600">Brak zalogowanych zmian.</div>}
        </div>
      </div>
    </div>
  );
}

/* ================= PORÓWNANIE A/B ================= */
function CompareRecipes() {
  const recipes = trpc.farm.feed.recipes.useQuery();
  const [aId, setAId] = useState(0);
  const [bId, setBId] = useState(0);
  const [ageGroup, setAgeGroup] = useState<string>("finisher1");
  const list = recipes.data ?? [];
  const ra = list.find((r) => r.id === aId);
  const rb = list.find((r) => r.id === bId);
  const enabled = !!ra && !!rb && aId !== bId;

  const cmp = trpc.nutrition.compare.useQuery(
    {
      a: (ra?.items ?? []).map((i) => ({ ingredientId: i.ingredientId, percent: num(i.percent) })),
      b: (rb?.items ?? []).map((i) => ({ ingredientId: i.ingredientId, percent: num(i.percent) })),
      ageGroup: ageGroup as any,
    },
    { enabled },
  );

  const selCls = inputCls;
  const Col = ({ title, data, tone }: { title: string; data: any; tone: "a" | "b" }) => (
    <div className={`rounded-xl border p-4 ${tone === "a" ? "border-emerald-900/50 bg-emerald-950/10" : "border-sky-900/50 bg-sky-950/10"}`}>
      <div className="mb-3 flex items-center justify-between">
        <b>{title}</b>
        {data && <ScoreBadge score={data.score} />}
      </div>
      {data && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-zinc-900 p-2"><span className="text-zinc-500">FCR</span><div className="text-base font-bold">{data.production.fcr.toFixed(2)}</div></div>
          <div className="rounded bg-zinc-900 p-2"><span className="text-zinc-500">ADG</span><div className="text-base font-bold">{data.production.adgG.toFixed(0)} g</div></div>
          <div className="rounded bg-zinc-900 p-2"><span className="text-zinc-500">EPEF</span><div className="text-base font-bold">{data.production.epef.toFixed(0)}</div></div>
          <div className="rounded bg-zinc-900 p-2"><span className="text-zinc-500">Koszt/t</span><div className="text-base font-bold">{fmtEur2(data.profile.costPerTon)}</div></div>
          <div className="rounded bg-zinc-900 p-2"><span className="text-zinc-500">Lizyna</span><div className="text-base font-bold">{data.profile.lysine.toFixed(2)}%</div></div>
          <div className="rounded bg-zinc-900 p-2"><span className="text-zinc-500">Ryzyko</span><div className="text-base font-bold">{data.production.metabolicRisk.toFixed(0)}%</div></div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`${cardCls} p-5`}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        <Scale className="h-4 w-4 text-emerald-400" /> Inteligentne porównanie receptur
      </h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <label className="text-xs text-zinc-500">Receptura A
          <select className={selCls} value={aId} onChange={(e) => setAId(Number(e.target.value))}>
            <option value={0}>— wybierz —</option>
            {list.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500">Receptura B
          <select className={selCls} value={bId} onChange={(e) => setBId(Number(e.target.value))}>
            <option value={0}>— wybierz —</option>
            {list.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500">Faza żywienia
          <select className={selCls} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
            {AGE_GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </label>
      </div>

      {!enabled && <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500"><AlertTriangle className="h-4 w-4" /> Wybierz dwie różne receptury, aby zobaczyć porównanie.</p>}
      {enabled && cmp.isLoading && <p className="mt-4 text-sm text-zinc-500">Porównuję…</p>}
      {enabled && cmp.data && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Col title={ra!.name} data={cmp.data.a} tone="a" />
            <Col title={rb!.name} data={cmp.data.b} tone="b" />
          </div>
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
            <b className="text-emerald-300">Werdykt: {cmp.data.verdict}</b>
            {cmp.data.reasons.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-emerald-200/80">
                {cmp.data.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SUROWCE ================= */
function Ingredients() {
  const ings = trpc.farm.feed.ingredients.useQuery();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const filtered = useMemo(
    () => (ings.data ?? []).filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [ings.data, q],
  );
  const nutrientRow = (label: string, v: number, unit = "%", ref?: number) => {
    if (!v && !ref) return null;
    const dev = ref && v ? Math.abs(v - ref) / ref : 0;
    return (
      <div className="flex justify-between border-b border-zinc-800/50 py-1 text-xs" key={label}>
        <span className="text-zinc-500">{label}</span>
        <span className={dev > 0.2 ? "font-semibold text-amber-400" : "text-zinc-300"}>
          {v ? `${v.toFixed(2)}${unit}` : "—"}
          {ref ? <span className="ml-1 text-zinc-600">(ref {ref}{unit})</span> : null}
          {dev > 0.2 ? " ⚠" : ""}
        </span>
      </div>
    );
  };
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Surowce — karty analityczne ({filtered.length})</h2>
        <input className={`${inputCls} max-w-56`} placeholder="Szukaj surowca…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="divide-y divide-zinc-800/70">
        {filtered.map((i) => {
          const anyI = i as any;
          const open = openId === i.id;
          return (
            <div key={i.id}>
              <button onClick={() => setOpenId(open ? null : i.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-900/50">
                <span className="flex-1">{countryFlag(i.countryCode)} {i.name}{anyI.code ? <span className="ml-2 text-[10px] text-zinc-600">{anyI.code}</span> : null}</span>
                <span className="text-zinc-400">{num(i.proteinPct).toFixed(1)}% białka</span>
                <span className="w-20 text-right font-medium">{fmtEur2(num(i.pricePerTon))}/t</span>
                <span className={`w-16 text-right ${num(i.stockTons) < 20 ? "text-amber-400" : "text-zinc-400"}`}>{fmtNum(num(i.stockTons))} t</span>
                {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
              </button>
              {open && (
                <div className="grid gap-4 border-t border-zinc-800/60 bg-zinc-950/50 p-4 sm:grid-cols-3">
                  <div>
                    <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Chemia</h4>
                    {nutrientRow("Wilgotność", num(anyI.moisturePct), "%", 13)}
                    {nutrientRow("Popiół", num(anyI.ashPct))}
                    {nutrientRow("Skrobia", num(anyI.starchPct))}
                    {nutrientRow("Włókno", num(i.fiberPct))}
                    {nutrientRow("Tłuszcz", num(i.fatPct))}
                  </div>
                  <div>
                    <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Aminokwasy</h4>
                    {nutrientRow("Lizyna", num(i.lysinePct))}
                    {nutrientRow("Metionina", num(i.methioninePct))}
                    {nutrientRow("Cystyna", num(anyI.cystinePct))}
                    {nutrientRow("Treonina", num(anyI.threoninePct))}
                    {nutrientRow("Tryptofan", num(anyI.tryptophanPct))}
                    {nutrientRow("Arginina", num(anyI.argininePct))}
                  </div>
                  <div>
                    <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Minerały i pochodzenie</h4>
                    {nutrientRow("Wapń", num(i.calciumPct))}
                    {nutrientRow("Fosfor", num(i.phosphorusPct))}
                    {nutrientRow("Sód", num(anyI.sodiumPct), "%", 0.2)}
                    <div className="flex justify-between py-1 text-xs"><span className="text-zinc-500">Energia</span><span className="text-zinc-300">{i.energyKcal > 0 ? `${fmtNum(i.energyKcal)} kcal` : "—"}</span></div>
                    {anyI.producer && <div className="flex justify-between py-1 text-xs"><span className="text-zinc-500">Producent</span><span className="text-zinc-300">{anyI.producer}</span></div>}
                    {num(anyI.moisturePct) > 14.5 && (
                      <div className="mt-2 flex items-start gap-1.5 rounded border border-amber-800/60 bg-amber-950/30 px-2 py-1.5 text-[11px] text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> Wilgotność powyżej normy — ryzyko pleśni/mikotoksyn, zalecane badanie laboratoryjne partii.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= PROGRAMY ŻYWIENIA ================= */
function FeedPrograms() {
  const programs = trpc.feedProgram.programs.useQuery();
  return (
    <div className={cardCls}>
      <h2 className={headCls}>Programy żywienia ({programs.data?.length ?? 0})</h2>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {(programs.data ?? []).map((p) => (
          <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.name}</span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                {p.sex === "toms" ? "indory" : p.sex === "hens" ? "indyczki" : "mieszany"}
              </span>
            </div>
            <div className="mt-3 space-y-1">
              {p.stages.map((st) => (
                <div key={st.id} className="flex items-center gap-3 rounded bg-zinc-800/60 px-3 py-1.5 text-xs">
                  <span className="w-24 font-medium">{st.name}</span>
                  <span className="text-zinc-500">{st.dayFrom}–{st.dayTo} d</span>
                  <span className="text-zinc-400">{st.recipe?.name ?? "—"}</span>
                  <span className="ml-auto text-zinc-500">
                    {st.proteinTargetPct ? `B ${num(st.proteinTargetPct)}%` : ""} {st.feedPerBirdG ? `· ${st.feedPerBirdG} g/pt` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= WYDANIA Z SILOSÓW ================= */
function FeedDeliveries() {
  const deliveries = trpc.feedProgram.deliveries.useQuery();
  const batches = trpc.farm.production.batches.useQuery();
  const warehouse = trpc.org.warehouseOverview.useQuery();
  const recipes = trpc.farm.feed.recipes.useQuery();
  const utils = trpc.useUtils();
  const delivery = trpc.feedProgram.delivery.useMutation({
    onSuccess: () => { utils.feedProgram.deliveries.invalidate(); utils.org.warehouseOverview.invalidate(); toast.success("Wydano paszę — stan silosu zaktualizowany"); },
    onError: (e) => toast.error(e.message),
  });
  const refill = trpc.feedProgram.refillSilo.useMutation({
    onSuccess: () => { utils.org.warehouseOverview.invalidate(); toast.success("Silos uzupełniony"); },
    onError: (e) => toast.error(e.message),
  });

  const [f, setF] = useState({ siloId: 0, batchId: 0, kg: 0, day: new Date().toISOString().slice(0, 10) });
  const [rf2, setRf2] = useState({ siloId: 0, tons: 20, recipeId: 0 });
  const active = (batches.data ?? []).filter((b) => b.batch.status === "active");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className={`${cardCls} p-5`}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Wydanie paszy z silosu</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-zinc-500">Silos
            <select className={inputCls} value={f.siloId} onChange={(e) => setF({ ...f, siloId: Number(e.target.value) })}>
              <option value={0}>— wybierz —</option>
              {(warehouse.data?.silos ?? []).map((sl) => (
                <option key={sl.id} value={sl.id}>
                  {sl.farm?.city} · {sl.name} ({num(sl.currentTons).toFixed(1)} t{sl.recipe ? ` · ${sl.recipe.name}` : ""})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-500">Rzut
            <select className={inputCls} value={f.batchId} onChange={(e) => setF({ ...f, batchId: Number(e.target.value) })}>
              <option value={0}>— wybierz —</option>
              {active.map((b) => <option key={b.batch.id} value={b.batch.id}>{b.batch.code} · {b.farm?.city}</option>)}
            </select>
          </label>
          <label className="text-xs text-zinc-500">Data
            <input type="date" className={inputCls} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-500">Ilość (kg)
            <input type="number" className={inputCls} value={f.kg || ""} onChange={(e) => setF({ ...f, kg: Number(e.target.value) })} />
          </label>
        </div>
        <button
          disabled={delivery.isPending || !f.siloId || !f.batchId || !f.kg}
          onClick={() => delivery.mutate(f)}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
        >Wydaj paszę (odejmie stan silosu)</button>

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Uzupełnienie silosu</h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-500">Silos
            <select className={inputCls} value={rf2.siloId} onChange={(e) => setRf2({ ...rf2, siloId: Number(e.target.value) })}>
              <option value={0}>— wybierz —</option>
              {(warehouse.data?.silos ?? []).map((sl) => <option key={sl.id} value={sl.id}>{sl.farm?.city} · {sl.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-zinc-500">Tony
            <input type="number" className={`${inputCls} w-24`} value={rf2.tons} onChange={(e) => setRf2({ ...rf2, tons: Number(e.target.value) })} />
          </label>
          <label className="text-xs text-zinc-500">Receptura
            <select className={inputCls} value={rf2.recipeId} onChange={(e) => setRf2({ ...rf2, recipeId: Number(e.target.value) })}>
              <option value={0}>bez zmian</option>
              {(recipes.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <button
            disabled={refill.isPending || !rf2.siloId}
            onClick={() => refill.mutate({ siloId: rf2.siloId, tons: rf2.tons, recipeId: rf2.recipeId || undefined })}
            className="rounded-lg bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600 disabled:opacity-50"
          >Uzupełnij</button>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className={headCls}>Ostatnie wydania ({deliveries.data?.length ?? 0})</h2>
        <div className="max-h-96 divide-y divide-zinc-800/70 overflow-y-auto">
          {(deliveries.data ?? []).slice(0, 30).map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="text-zinc-500">{d.day}</span>
              <span className="font-mono text-xs">{d.batchCode}</span>
              <span className="flex-1 text-zinc-400">{d.silo?.name} {d.recipe ? `· ${d.recipe.name}` : ""}</span>
              <span className="font-medium">{fmtNum(num(d.kg))} kg</span>
            </div>
          ))}
          {deliveries.data?.length === 0 && <div className="p-6 text-center text-sm text-zinc-600">Brak wydań.</div>}
        </div>
      </div>
    </div>
  );
}
