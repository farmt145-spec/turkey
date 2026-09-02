import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { countryFlag, fmtNum, num } from "@/lib/geo";
import { ClipboardPlus, ChartNoAxesCombined } from "lucide-react";
import { useMemo, useState } from "react";

type SexFilter = "all" | "toms" | "hens" | "mixed";

export default function Production() {
  const batches = trpc.farm.production.batches.useQuery();
  const [filter, setFilter] = useState<"all" | "active" | "closed">("active");
  const [farmFilter, setFarmFilter] = useState<number | "all">("all");
  const [houseFilter, setHouseFilter] = useState<number | "all">("all");
  const [sexFilter, setSexFilter] = useState<SexFilter>("all");

  const rows = useMemo(
    () =>
      (batches.data ?? []).filter((b) => {
        const matchesStatus = filter === "all" ? true : b.batch.status === filter;
        const matchesFarm = farmFilter === "all" || b.farm?.id === farmFilter;
        const matchesHouse = houseFilter === "all" || b.house?.id === houseFilter;
        const matchesSex = sexFilter === "all" || b.batch.sex === sexFilter;
        return matchesStatus && matchesFarm && matchesHouse && matchesSex;
      }),
    [batches.data, filter, farmFilter, houseFilter, sexFilter],
  );

  const farmOptions = useMemo(() => {
    const map = new Map<number, { id: number; label: string }>();
    for (const row of batches.data ?? []) {
      if (!row.farm?.id) continue;
      map.set(row.farm.id, {
        id: row.farm.id,
        label: `${countryFlag(row.farm.countryCode)} ${row.farm.city}`,
      });
    }
    return [...map.values()];
  }, [batches.data]);

  const houseOptions = useMemo(() => {
    const map = new Map<number, { id: number; label: string }>();
    for (const row of batches.data ?? []) {
      if (!row.house?.id) continue;
      if (farmFilter !== "all" && row.farm?.id !== farmFilter) continue;
      map.set(row.house.id, { id: row.house.id, label: row.house.name });
    }
    return [...map.values()];
  }, [batches.data, farmFilter]);

  const grouped = useMemo(() => {
    const groupedMap = new Map<string, { key: number; label: string; houses: Map<number, { key: number; label: string; rows: typeof rows }> }>();

    for (const row of rows) {
      const farmId = row.farm?.id ?? 0;
      const houseId = row.house?.id ?? 0;
      const farmLabel = row.farm ? `${countryFlag(row.farm.countryCode)} ${row.farm.city}` : "Brak fermy";
      const houseLabel = row.house?.name ?? "Brak kurnika";
      const farmKey = `${farmId}:${farmLabel}`;

      if (!groupedMap.has(farmKey)) {
        groupedMap.set(farmKey, {
          key: farmId,
          label: farmLabel,
          houses: new Map(),
        });
      }

      const farmGroup = groupedMap.get(farmKey)!;
      if (!farmGroup.houses.has(houseId)) {
        farmGroup.houses.set(houseId, {
          key: houseId,
          label: houseLabel,
          rows: [],
        });
      }

      farmGroup.houses.get(houseId)!.rows.push(row);
    }

    return [...groupedMap.values()].map((farm) => ({
      ...farm,
      houses: [...farm.houses.values()],
    }));
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Produkcja — rzuty</h1>
          <p className="text-sm text-zinc-500">Podział według ferm, kurników, rzutów i płci</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
          {([['active', 'Aktywne'], ['closed', 'Zamknięte'], ['all', 'Wszystkie']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${filter === v ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Ferma</label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            value={farmFilter}
            onChange={(e) => {
              const nextValue = e.target.value === 'all' ? 'all' : Number(e.target.value);
              setFarmFilter(nextValue);
              setHouseFilter('all');
            }}
          >
            <option value="all">Wszystkie fermy</option>
            {farmOptions.map((farm) => (
              <option key={farm.id} value={farm.id}>{farm.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Kurnik</label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            value={houseFilter}
            onChange={(e) => setHouseFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">Wszystkie kurniki</option>
            {houseOptions.map((house) => (
              <option key={house.id} value={house.id}>{house.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Płeć</label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-200"
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value as SexFilter)}
          >
            <option value="all">Wszystkie</option>
            <option value="toms">Indory</option>
            <option value="hens">Indyczki</option>
            <option value="mixed">Mieszane</option>
          </select>
        </div>

        <div className="flex items-end">
          <div className="w-full rounded-lg border border-emerald-800 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-200">
            {rows.length} rzutów w widoku
          </div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
          Brak rzutów dla wybranych filtrów.
        </div>
      ) : (
        grouped.map((farmGroup) => (
          <div key={`${farmGroup.key}-${farmGroup.label}`} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">Ferma</div>
                <div className="text-lg font-semibold text-zinc-100">{farmGroup.label}</div>
              </div>
              <div className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                {farmGroup.houses.reduce((sum, house) => sum + house.rows.length, 0)} rzutów
              </div>
            </div>

            {farmGroup.houses.map((houseGroup) => (
              <div key={`${farmGroup.key}-${houseGroup.key}-${houseGroup.label}`} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Kurnik</div>
                    <div className="text-base font-semibold text-zinc-200">{houseGroup.label}</div>
                  </div>
                  <div className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400">
                    {houseGroup.rows.length} rzuty
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Rzut</th>
                        <th className="px-4 py-3 text-left">Płeć</th>
                        <th className="px-4 py-3 text-left">Linia</th>
                        <th className="px-4 py-3 text-right">Wiek (dni)</th>
                        <th className="px-4 py-3 text-right">Sztuki</th>
                        <th className="px-4 py-3 text-right">Śr. masa</th>
                        <th className="px-4 py-3 text-right">ADG</th>
                        <th className="px-4 py-3 text-right">FCR</th>
                        <th className="px-4 py-3 text-right">Śmiert.</th>
                        <th className="px-4 py-3 text-right">EPEF</th>
                        <th className="px-4 py-3 text-right">kg/m²</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-zinc-950/50">
                      {houseGroup.rows.map((row) => (
                        <tr key={row.batch.id} className="hover:bg-zinc-900/70">
                          <td className="px-4 py-3">
                            <Link to={`/produkcja/${row.batch.id}`} className="font-mono font-medium text-red-400 hover:underline">
                              {row.batch.code}
                            </Link>
                            <div className="text-[10px] text-zinc-500">
                              {row.batch.status === "closed" && "zamknięty"}
                            </div>
                            {row.batch.status === "active" && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Link to={`/produkcja/${row.batch.id}?obchod=1`} className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-500">
                                  <ClipboardPlus className="h-3 w-3" /> Szybki obchód
                                </Link>
                                <Link to={`/produkcja/${row.batch.id}?centrum=1`} className="inline-flex items-center gap-1 rounded border border-red-800/70 bg-red-950/30 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-950/60">
                                  <ChartNoAxesCombined className="h-3 w-3" /> Centrum analityczne
                                </Link>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {row.batch.sex === "toms" ? "indory" : row.batch.sex === "hens" ? "indyczki" : "mieszany"}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{row.batch.geneticLine}</td>
                          <td className="px-4 py-3 text-right">{row.ageDays}</td>
                          <td className="px-4 py-3 text-right">{fmtNum(row.batch.currentCount)}</td>
                          <td className="px-4 py-3 text-right font-medium">{(row.avgWeightG / 1000).toFixed(2)} kg</td>
                          <td className="px-4 py-3 text-right">{fmtNum(row.adgG)} g</td>
                          <td className={`px-4 py-3 text-right font-medium ${row.fcr < 2.4 ? "text-emerald-400" : row.fcr > 2.7 ? "text-red-400" : ""}`}>
                            {row.fcr.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right ${row.mortalityPct > 4 ? "text-red-400" : ""}`}>
                            {row.mortalityPct.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right">{fmtNum(row.epef)}</td>
                          <td className={`px-4 py-3 text-right ${row.densityKgM2 > (row.house ? num(row.house.maxDensityKgM2) : 42) ? "text-amber-400" : ""}`}>
                            {row.densityKgM2.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
