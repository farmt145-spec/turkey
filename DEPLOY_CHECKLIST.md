# Bloody Turkey — Deployment Checklist

## 1. GitHub repo

Remote should point to:

```bash
git remote set-url origin https://github.com/borek112/indykpol.git
```

Then push:

```bash
git push origin HEAD:main
```

## 2. Frontend deploy on Netlify

In Netlify, set **Base directory** to `app`.

Build command:

```bash
npm install --legacy-peer-deps && npx vite build
```

Publish directory:

```bash
dist/public
```

In Netlify: **Site configuration → Environment variables → Add a variable**:

```bash
VITE_API_URL=https://twoj-backend.example.com/api/trpc
```

Wartość musi wskazywać dokładnie endpoint tRPC:

```text
https://twoj-backend.example.com/api/trpc
```

The value is embedded during the frontend build, so trigger **Deploy site** again
after changing it. Do not add `DATABASE_URL`, `JWT_SECRET`, or MySQL credentials
to Netlify.

## 3. Backend deploy

Deploy API separately from frontend. Keep backend on a private service and do not expose MySQL publicly.

Recommended providers:
- Railway
- Render
- Azure App Service
- custom private VPS

Required backend variables:

```text
DATABASE_URL=mysql://...
JWT_SECRET=<długi losowy sekret>
NODE_ENV=production
FRONTEND_URL=https://twoj-site.netlify.app
CORS_ORIGIN=https://twoj-site.netlify.app
SEED_DEMO=true   # tylko przy pierwszym uruchomieniu
```

After the first successful deployment, set `SEED_DEMO=false` and redeploy.

## 4. Database

Keep the database private. Only backend should connect to it.

Do not expose:
- MySQL public port
- database host publicly
- admin credentials in frontend

The tables are created by the backend from:

```text
app/db/migrations/0000_full_schema_sync.sql
```

Set these variables on Railway/Render, not on Netlify:

```env
DATABASE_URL=mysql://user:password@private-host:3306/database
SEED_DEMO=true
```

On the first backend start, migrations create the schema. When the service is
healthy and the demo data is visible, change `SEED_DEMO` to `false` and redeploy.
For a local database, run from `app`:

```bash
npm run db:migrate
npx tsx db/seed.ts
npx tsx db/seed-ingredients.ts
```

## 5. Production topology

```text
Browser (Netlify frontend)
      --> API backend (private host)
      --> MySQL database (private)
```

## 6. Local run

```bash
cd app
npm install --legacy-peer-deps
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

Open:

```text
http://127.0.0.1:4173
```

## 7. Important notes

- App is a single repo but split into frontend/backend deploy units.
- Frontend site is static only.
- API and DB must be hosted separately.
- Do not expose the database to the public internet.
- Po zalogowaniu możesz utworzyć własną firmę w widoku `Struktura`; opcja seed doda dane startowe (ferma/kurnik/rzut).
