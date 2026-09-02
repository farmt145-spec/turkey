import { trpc } from "@/providers/trpc";
import { useMemo, useRef, useState } from "react";
import {
  KeyRound, Plus, Ban, Copy, CheckCircle2, Download, Upload, DatabaseBackup,
  Cable, Thermometer, Wheat, Skull, Weight, AlertTriangle, Server, Wifi,
} from "lucide-react";
import { toast } from "sonner";
import IotIntelligence from "@/components/IotIntelligence";

const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500";
const cardCls = "rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur";

export default function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integracje i kopie zapasowe</h1>
        <p className="text-sm text-zinc-500">Wpinanie komputerów fermowych, wag, czujników klimatu przez API oraz pełny eksport/import danych chowu</p>
      </div>
      <ApiKeys />
      <ExternalDeviceSetup />
      <IotIntelligence />
      <IngestDocs />
      <Backup />
    </div>
  );
}

/* ================= PODŁĄCZANIE URZĄDZEŃ ZEWNĘTRZNYCH ================= */
function ExternalDeviceSetup() {
  const structure = trpc.org.structure.useQuery();
  const deviceTypes = trpc.iotIntel.deviceTypes.useQuery();
  const utils = trpc.useUtils();
  const farms = useMemo(
    () => (structure.data?.companies ?? []).flatMap((c) => c.farms.map((f) => ({ id: f.id, name: f.name }))),
    [structure.data],
  );
  const [farmId, setFarmId] = useState<number>(0);
  const [name, setName] = useState("Kontroler klimatu — Kurnik 3");
  const [code, setCode] = useState("CTRL-K3-01");
  const [deviceTypeId, setDeviceTypeId] = useState<number>(0);
  const [mode, setMode] = useState<"mqtt" | "http" | "tcp" | "modbus" | "serial">("mqtt");
  const [host, setHost] = useState("10.0.0.18");
  const [port, setPort] = useState(1883);
  const [topic, setTopic] = useState("bte/farm-1/house-3");
  const [endpoint, setEndpoint] = useState("/api/v1/ingest");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [notes, setNotes] = useState("Komputer kurnika z kontrolerem klimatu i systemem automatycznym.");
  const createDevice = trpc.iotIntel.deviceCreate.useMutation({
    onSuccess: () => {
      toast.success("Urządzenie zapisane i podpięte do systemu");
      setName("");
      setCode("");
      setNotes("");
      utils.iotIntel.devices.invalidate();
      utils.iotIntel.dashboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const effectiveFarmId = farmId || farms[0]?.id || 0;
  const selectedType = deviceTypes.data?.find((t) => t.id === deviceTypeId);
  const saveDevice = () => {
    if (!effectiveFarmId || !deviceTypeId || !name.trim() || !code.trim()) {
      toast.error("Wybierz fermę, typ urządzenia i uzupełnij nazwę oraz kod");
      return;
    }

    createDevice.mutate({
      farmId: effectiveFarmId,
      deviceTypeId,
      code: code.trim(),
      name: name.trim(),
      ipAddress: host || undefined,
      mqttTopic: mode === "mqtt" ? (topic || undefined) : undefined,
      config: {
        source: "manual-setup",
        connectionMode: mode,
        endpoint: endpoint || undefined,
        username: username || undefined,
        password: password || undefined,
        apiKey: apiKey || undefined,
        notes: notes || undefined,
      },
      connection: {
        mode,
        host: host || undefined,
        port: port || undefined,
        topic: mode === "mqtt" ? (topic || undefined) : undefined,
        endpoint: mode === "http" ? (endpoint || undefined) : undefined,
        username: username || undefined,
        password: password || undefined,
        apiKey: apiKey || undefined,
        notes: notes || undefined,
      },
    });
  };

  return (
    <div className={`${cardCls} p-5`}>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        <Server className="h-4 w-4 text-emerald-400" /> Podłączanie komputerów i urządzeń zewnętrznych
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Tak działa zapis połączenia: system zapisuje parametry połączenia w polu JSON urządzenia, więc przyszły użytkownik może odtworzyć konfigurację w jednej chwili.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Farma</label>
            <select className={inputCls} value={effectiveFarmId} onChange={(e) => setFarmId(Number(e.target.value))}>
              {farms.length === 0 && <option value={0}>Brak ferm</option>}
              {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Typ urządzenia</label>
            <select className={inputCls} value={deviceTypeId} onChange={(e) => setDeviceTypeId(Number(e.target.value))}>
              <option value={0}>Wybierz typ</option>
              {(deviceTypes.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Nazwa urządzenia</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Kontroler klimatu — Kurnik 3" />
          </div>

          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Kod urządzenia</label>
            <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder="CTRL-K3-01" />
          </div>

          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Tryb połączenia</label>
            <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="mqtt">MQTT</option>
              <option value="http">HTTP/REST</option>
              <option value="tcp">TCP</option>
              <option value="modbus">Modbus</option>
              <option value="serial">RS-232 / serial</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Host / adres IP</label>
            <input className={inputCls} value={host} onChange={(e) => setHost(e.target.value)} placeholder="10.0.0.18" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Port</label>
              <input className={inputCls} type="number" value={port} onChange={(e) => setPort(Number(e.target.value || 0))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Temat MQTT / endpoint</label>
              <input className={inputCls} value={mode === "mqtt" ? topic : endpoint} onChange={(e) => mode === "mqtt" ? setTopic(e.target.value) : setEndpoint(e.target.value)} placeholder={mode === "mqtt" ? "bte/farm-1/house-3" : "/api/v1/ingest"} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Użytkownik</label>
              <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="opcjonalnie" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Hasło / token</label>
              <input className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="opcjonalnie" type="password" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Klucz API</label>
            <input className={inputCls} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="opcjonalnie" />
          </div>

          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">Uwagi / instrukcja</label>
            <textarea className={`${inputCls} min-h-[86px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opis połączenia, komputer kurnika, modem, port, lokalizacja itp." />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              {selectedType ? `Typ: ${selectedType.name}` : "Wybierz typ urządzenia"}
            </div>
            <button
              disabled={createDevice.isPending}
              onClick={saveDevice}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {createDevice.isPending ? "Zapisuję…" : "Zapisz urządzenie"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-400">
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          <Cable className="h-3.5 w-3.5 text-emerald-400" /> Instrukcja dla przyszłych użytkowników
        </h3>
        <ol className="list-inside list-decimal space-y-1.5 text-zinc-300">
          <li>Wybierz właściwą fermę i typ urządzenia, np. kontroler klimatu, czujnik temperatury, waga, komputer kurnika.</li>
          <li>Podaj adres IP, port lub temat MQTT. W przypadku połączenia z komputerem kurnika sprawdź, czy adres jest dostępny w sieci lokalnej.</li>
          <li>Jeśli dane wysyłają się przez HTTP, wpisz endpoint, np. /api/v1/ingest, i klucz API. Jeśli przez MQTT, wpisz temat, np. bte/farm-1/house-3.</li>
          <li>Zapisz konfigurację — dane są przechowywane w polu JSON urządzenia i odtwarzane przy następnym podłączeniu.</li>
          <li>Po podłączeniu sprawdź status w sekcji IoT Intelligence oraz wczytaj testową paczkę telemetryczną z przykładu poniżej.</li>
        </ol>
      </div>
    </div>
  );
}

/* ================= KLUCZE API ================= */
function ApiKeys() {
  const keys = trpc.transfer.apiKeys.useQuery();
  const integrations = trpc.transfer.integrations.useQuery();
  const utils = trpc.useUtils();
  const [label, setLabel] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const create = trpc.transfer.createApiKey.useMutation({
    onSuccess: (d) => {
      setFreshKey(d.apiKey);
      setLabel("");
      utils.transfer.apiKeys.invalidate();
      toast.success("Klucz utworzony — skopiuj go teraz, potem będzie niewidoczny");
    },
    onError: (e) => toast.error(e.message),
  });
  const revoke = trpc.transfer.revokeApiKey.useMutation({
    onSuccess: () => { utils.transfer.apiKeys.invalidate(); toast.success("Klucz dezaktywowany"); },
  });

  return (
    <div className={`${cardCls} p-5`}>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        <Cable className="h-4 w-4 text-emerald-400" /> Wpinanie komputerów i urządzeń — klucze API
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Każdy komputer fermowy, waga, kontroler klimatu czy system paszarnii dostaje własny klucz i wysyła dane na endpoint <code className="rounded bg-zinc-800 px-1">POST /api/v1/ingest</code>.
      </p>

      <div className="flex gap-2">
        <input className={inputCls} placeholder="Nazwa urządzenia, np. Kontroler klimatu — Kurnik 3" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button disabled={label.trim().length < 2 || create.isPending}
          onClick={() => create.mutate({ label: label.trim() })}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Nowy klucz
        </button>
      </div>

      {freshKey && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-950/40 p-3">
          <KeyRound className="h-4 w-4 shrink-0 text-emerald-400" />
          <code className="flex-1 select-all break-all text-sm text-emerald-200">{freshKey}</code>
          <button onClick={() => { navigator.clipboard.writeText(freshKey); toast.success("Skopiowano"); }}
            className="shrink-0 rounded border border-zinc-700 p-1.5 hover:border-emerald-600"><Copy className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mt-4 divide-y divide-zinc-800/70">
        {(keys.data ?? []).map((k) => (
          <div key={k.id} className="flex items-center gap-3 py-2 text-sm">
            <KeyRound className={`h-4 w-4 ${k.active ? "text-emerald-500" : "text-zinc-600"}`} />
            <span className="flex-1">{k.label}</span>
            <code className="text-xs text-zinc-500">{k.keyPrefix}…</code>
            <span className="text-xs text-zinc-500">
              {k.lastUsedAt ? `ostatnie użycie: ${String(k.lastUsedAt).slice(0, 16).replace("T", " ")}` : "nie używany"}
            </span>
            {k.active ? (
              <button onClick={() => revoke.mutate({ id: k.id })} className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-red-600 hover:text-red-400">
                <Ban className="h-3 w-3" /> Dezaktywuj
              </button>
            ) : <span className="text-xs text-zinc-600">nieaktywny</span>}
          </div>
        ))}
        {keys.data?.length === 0 && <p className="py-3 text-sm text-zinc-600">Brak kluczy — utwórz pierwszy powyżej.</p>}
      </div>

      {integrations.data && integrations.data.length > 0 && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Zarejestrowane integracje ({integrations.data.length})</h3>
          <div className="flex flex-wrap gap-1.5">
            {integrations.data.map((i) => (
              <span key={i.id} className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300">
                {i.sourceModule} → {i.targetModule} <span className="text-zinc-500">({i.kind})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= DOKUMENTACJA INGEST ================= */
function IngestDocs() {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const examples = [
    { icon: Thermometer, name: "Klimat (co minutę z kontrolera)", body: `{"type":"climate","houseId":1,"tempC":21.5,"humidityPct":62,"co2Ppm":1800,"ammoniaPpm":8,"ventilationPct":45}` },
    { icon: Wheat, name: "Zużycie paszy (z wagi silosu)", body: `{"type":"feedUsage","batchId":1,"kg":1240,"day":"2026-08-07"}` },
    { icon: Skull, name: "Padnięcia (raport z kurnika)", body: `{"type":"mortality","batchId":1,"count":12,"cause":"nieznana"}` },
    { icon: Weight, name: "Ważenie (waga automatyczna)", body: `{"type":"weighing","batchId":1,"avgWeightG":4850,"sampleSize":120,"dayAge":74}` },
  ];
  return (
    <div className={`${cardCls} p-5`}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Jak wpiąć urządzenie — gotowe szablony</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {examples.map((e) => (
          <div key={e.name} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="mb-1.5 flex items-center gap-2 text-sm font-medium"><e.icon className="h-4 w-4 text-emerald-400" /> {e.name}</div>
            <pre className="overflow-x-auto rounded bg-zinc-900 p-2 text-[11px] leading-relaxed text-zinc-300">
{`curl -X POST ${base}/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: TWÓJ_KLUCZ" \\
  -d '${e.body}'`}
            </pre>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        Dane wpisane przez API trafiają wprost do modułów: klimat → IoT Live, zużycie → FCR/Analytics, padnięcia → Zdrowie, ważenia → Produkcja. Zalecamy osobny klucz dla każdego urządzenia — łatwo go wyłączyć bez wpływu na resztę.
      </p>
    </div>
  );
}

/* ================= PEŁNA KOPIA ZAPASOWA ================= */
function Backup() {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const importMut = trpc.transfer.importAll.useMutation({
    onSuccess: (r) => {
      const total = r.report.reduce((a, x) => a + x.inserted, 0);
      const skipped = r.report.reduce((a, x) => a + x.skipped, 0);
      toast.success(`Import zakończony: ${total} nowych rekordów, ${skipped} pominiętych (już istniały)`);
      setBusy(false);
    },
    onError: (e) => { toast.error(e.message); setBusy(false); },
  });

  const doExport = async () => {
    setBusy(true);
    try {
      const data = await utils.transfer.exportAll.fetch();
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `bloody-turkey-pelna-kopia-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Wyeksportowano ${data.totalRows} rekordów z ${data.tables.length} tabel`);
    } finally { setBusy(false); }
  };

  const onImportFile = async (f: File) => {
    setBusy(true);
    try {
      const data = JSON.parse(await f.text());
      importMut.mutate({ data });
    } catch {
      toast.error("To nie jest prawidłowy plik pełnej kopii (JSON)");
      setBusy(false);
    }
  };

  return (
    <div className={`${cardCls} p-5`}>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        <DatabaseBackup className="h-4 w-4 text-emerald-400" /> Pełna kopia zapasowa danych chowu
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Wszystko w jednym pliku JSON: fermy, kurniki, rzuty, ważenia, padnięcia, zużycie paszy, zabiegi, szczepienia, koszty, sprzedaże, dziennik, surowce, receptury, programy, magazyny, silosy, dostawcy, zamówienia, faktury, leki, wyniki badań, klimat, energia, biosecurity, dokumenty, zadania, wylęgarnia, partie magazynowe, scenariusze i benchmarki.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={doExport} disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
          <Download className="h-4 w-4" /> {busy ? "Pracuję…" : "Eksportuj wszystko (JSON)"}
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-600 disabled:opacity-50">
          <Upload className="h-4 w-4" /> Importuj kopię (merge — nic nie nadpisuje)
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ""; }} />
      </div>
      {importMut.data && (
        <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Raport importu</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs sm:grid-cols-3">
            {importMut.data.report.filter((r) => r.inserted > 0 || r.skipped > 0).map((r) => (
              <div key={r.table} className="flex justify-between text-zinc-400">
                <span>{r.label}</span>
                <span><b className="text-emerald-400">+{r.inserted}</b>{r.skipped ? <span className="text-zinc-600"> / {r.skipped} istn.</span> : null}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
