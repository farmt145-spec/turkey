# Wdrożenie Bloody Turkey Enterprise — Railway / Render

Kompletna instrukcja publikacji pełnej wersji (frontend + API + MySQL).

---

## Wspólne wymagania wstępne

1. Konto na **GitHub** (repo z tym projektem) oraz na **railway.app** lub **render.com**.
2. Baza **MySQL 8**:
   - Railway: „New → Database → MySQL" — connection string dostaniesz automatycznie,
   - Render nie ma MySQL — użyj zewnętrznej bazy: **PlanetScale**, **Aiven** (darmowy plan) lub Railway tylko pod bazę.

## Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---|---|---|
| `DATABASE_URL` | ✅ | np. `mysql://user:haslo@host:3306/bloody_turkey` |
| `SESSION_SECRET` | ✅ | długi losowy sekret tylko po stronie backendu |
| `NODE_ENV` | ✅ | `production` — bez tego API nie uruchomi listenera |
| `FRONTEND_URL` | ✅ przy osobnym Netlify | pełny adres Netlify, np. `https://bloody-turkey.netlify.app` |
| `SEED_DEMO` | — | `true` przy pierwszym starze = dane demonstracyjne; potem zmień na `false` |
| `UPLOAD_DIR` | — | domyślnie `/data/uploads` (Render) — katalog na wgrywane pliki |
| `PORT` | — | platforma ustawia sama |

Kimi OAuth nie jest używany. Netlify potrzebuje wyłącznie publicznego `VITE_API_URL`; sekretów sesji ani bazy nie wolno tam umieszczać.

---

## Opcja A — Railway (zalecana, najprostsza)

1. Wypchnij projekt na GitHub.
2. Na railway.app: **New Project → Deploy from GitHub repo**.
3. Dodaj usługę **MySQL** w tym samym projekcie.
4. W usłudze aplikacji → **Variables**:
   - `DATABASE_URL` → „Reference variable" wskazująca na `DATABASE_URL` z usługi MySQL (Railway poda też `MYSQL_URL`),
   - `JWT_SECRET` → losowy ciąg,
   - `SEED_DEMO=true`.
5. Plik `railway.toml` w repo zadba o build z `Dockerfile.production`, healthcheck i restart policy.
6. Po deployu Railway da Ci publiczny adres `https://xxx.up.railway.app` (Settings → Networking → Generate Domain).
7. **Po pierwszym udanym starcie** zmień `SEED_DEMO=false` i zrób redeploy — inaczej seed będzie próbował się ładować przy każdym restarcie (skrypty są odporne, ale start trwa dłużej).

## Opcja B — Render

1. Utwórz bazę MySQL poza Renderem (PlanetScale/Aiven) i skopiuj connection string.
2. Na render.com: **New → Blueprint** i wskaż repo — Render odczyta `render.yaml` i utworzy usługę z dyskiem na uploady.
3. W panelu usługi uzupełnij `DATABASE_URL` oraz `FRONTEND_URL` (reszta jest w `render.yaml`).
4. Adres publiczny: `https://bloody-turkey.onrender.com`.
5. Uwaga: darmowy plan Render „usypia" po bezczynności — pierwsze wejście może potrwać ~30 s.

---

## Weryfikacja po wdrożeniu

```bash
curl -i https://TWOJ-ADRES/                              # oczekiwane: 200
curl -i https://TWOJ-ADRES/api/trpc/ping                 # oczekiwane: 200 i ok=true
curl -i -X OPTIONS https://TWOJ-ADRES/api/trpc/ping \
   -H "Origin: https://TWOJ-FRONTEND.netlify.app" \
   -H "Access-Control-Request-Method: GET"              # oczekiwane: Access-Control-Allow-Origin
```

## Aktualizacje

Każdy `git push` na główną gałąź = automatyczny rebuild i restart. Migracje bazy są **idempotentne** i uruchamiają się przy każdym starcie, więc nowe tabele pojawią się same.

## Backupy

- Railway MySQL: włącz automatyczne backupy w zakładce bazy, albo cron z `mysqldump`.
- Uploady: na Renderze są na dysku trwałym (`/data`); na Railway dodaj Volume i ustaw `UPLOAD_DIR` na jego ścieżkę.
