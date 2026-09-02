# BTE HYBRID — LOCAL DEVELOPMENT ENVIRONMENT

Data: 2026-08-09 · Branch: phase-1 · Status: READY

Projekt jest uruchamialny lokalnie bez VS Code i bez zewnętrznych usług.
Wszystkie kroki poniżej były wykonane i zweryfikowane w sandboxie
(MySQL 8.0.45, Node 20, npm 11).

## 1. Zależności

```bash
npm install        # 579 pakietów (~40 s na normalnym dysku)
```

Uwaga: w sandboxie mount `/mnt/agents` jest ekstremalnie wolny dla dużej liczby
małych plików — instalację i build wykonuj na lokalnym dysku (np. sklonuj repo
lub pracuj w katalogu poza mountem).

## 2. Lokalna baza DEVELOPMENT

Opcja A — Docker (zalecana na własnej maszynie):

```bash
docker compose -f docker-compose.dev.yml up -d
```

Opcja B — dowolny lokalny MySQL 8 / MariaDB: utwórz bazę `bte_dev`
(utf8mb4) i użytkownika z pełnymi prawami do niej.

Skonfiguruj `.env` (szablon: `.env.local.example`):

```
DATABASE_URL=mysql://bte:bte_dev_local@127.0.0.1:3307/bte_dev
```

KRYTYCZNE: baza musi być LOKALNA. Nigdy nie wskazuj produkcyjnego hosta.

## 3. Schema i migracje

```bash
npx drizzle-kit push          # baseline: 89 tabel z db/schema.ts
tsx db/migrate-all.ts         # migracje 0005–0010 (idempotentne)
```

Stan zweryfikowany (2026-08-09): 89/89 tabel, migracje 0005–0010 wykonane
realnie na pustej bazie (34 tabele BTE) oraz idempotentnie na bazie z push.

Uwaga archiwalna: pliki SQL migracji 0000–0004 nie istnieją w repo
(historyczny gitignore); baseline odtwarzany jest przez `drizzle-kit push`.

## 4. Dane demo (seed)

```bash
tsx db/seed.ts                # 3 firmy, 12 ferm, 59 rzutów, receptury
tsx db/seed-erp.ts            # dostawcy, zamówienia, faktury, klimat, energia…
tsx db/seed-daily.ts          # dzienniki, wydania paszy z silosów
tsx db/seed-ext.ts            # rozszerzone karty surowców
tsx db/seed-gap.ts            # choroby, nekropsje, benchmarki, integracje
tsx db/seed-ingredients.ts    # 28 surowców
```

## 5. Uruchomienie

```bash
npm run dev                   # vite + hono na http://localhost:3000
npm run check                 # typecheck (tsc -b) — 0 błędów
npm test                      # vitest — 80/80
npm run build                 # vite build + esbuild api/boot.ts
```

## 6. Local authentication

Use `POST /api/auth/register` to create the first company administrator, then
`POST /api/auth/login`. The backend issues an HttpOnly `bte_sid` cookie signed
with `SESSION_SECRET`; credentials and session secrets never reach Vite.

## 7. Stan walidacji (2026-08-09)

| Krok | Wynik |
|---|---|
| npm install | PASS (579 pakietów) |
| tsc -b | PASS (0 błędów) |
| vitest | PASS (80/80, 7 plików) |
| build | PASS |
| drizzle push (bte_dev) | PASS (89/89 tabel) |
| migracje 0005–0010 | PASS (realne wykonanie + idempotencja) |
| seed ×6 | PASS |
| dev server | PASS (ping public; UNAUTHORIZED bez sesji; pełne API z dev tokenem) |
| strony modułów | PASS (Dashboard, Żywienie/Lab, Zdrowie, Produkcja, Magazyn, Ekonomia, Integracje) |
| skany admin IOT | PASS (feedShortage: 2 silosy, predykcja 41,5 h zapisana i odczytana) |

## 8. Ograniczenia środowiska sandbox

- Baza MySQL w sandboxie żyje w `/tmp` (binaria pobrane z cdn.mysql.com +
  libaio1 wyciągnięte lokalnie z pakietu .deb) — znika po zwolnieniu sandboxa.
  Na własnej maszynie użyj `docker-compose.dev.yml`.
- Produkcja: Dockerfile + deploy/start.sh wykonują migracje idempotentne
  przy starcie kontenera — bez zmian.
