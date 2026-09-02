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

## 2. New Netlify site

Create a **new Netlify project** from this repository. The root `netlify.toml`
already points Netlify to `app` and routes `/api/*` to Netlify Functions.

Current site used for deployment:

```text
sparkling-phoenix-7b29ee
```

Build command:

```bash
npm install --legacy-peer-deps && npm run build
```

Publish directory:

```bash
dist/public
```

In Netlify: **Site configuration → Environment variables → Add variables**:

For Turso / LibSQL:

```bash
TURSO_DB_URL=libsql://twoja-baza.turso.io
TURSO_AUTH_TOKEN=<token-turso>
SESSION_SECRET=<długi losowy sekret>
API_KEY_PEPPER=<drugi długi losowy sekret do haszowania kluczy API>
```

For MySQL (np. connection string z Render / Railway):

```bash
DATABASE_TYPE=mysql
DATABASE_URL=******host:3306/baza
SESSION_SECRET=<długi losowy sekret>
API_KEY_PEPPER=<drugi długi losowy sekret do haszowania kluczy API>
```

Optional demo mode:

```bash
DEMO_MODE=true
DEMO_COMPANY_ID=1
VITE_DEMO_MODE=true
```

Optional:

```bash
VITE_API_URL=
```

Leave `VITE_API_URL` empty when the frontend and API run on the same Netlify
domain. Trigger **Deploy site** again after changing environment variables.

### Agent access note

- The agent can use the Netlify panel only when browser-based OAuth/MCP access is active in the current session.
- Netlify account authorization is not stored in this repository.
- Do not commit Netlify tokens, OAuth credentials, database passwords, or other secrets to git.
- Keep all real values only in **Netlify → Site configuration → Environment variables**.

## 3. Database

Keep the database credentials only in Netlify server-side environment variables.
Do not expose tokens or connection data in frontend code.

If you use MySQL on Netlify:
- the app uses `DATABASE_TYPE=mysql`
- the function reads `DATABASE_URL`
- the function applies idempotent SQL migrations automatically on cold start
- demo data is seeded automatically when the database is empty

For a local database, run from `app`:

```bash
npm run db:migrate
npx tsx db/seed.ts
npx tsx db/seed-ingredients.ts
```

## 4. Production topology

```text
Browser
      --> Netlify frontend + Netlify Functions
      --> Turso / LibSQL or MySQL database
```

## 5. Local run

```bash
cd app
npm install --legacy-peer-deps
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

Open:

```text
http://127.0.0.1:4173
```

## 6. Important notes

- App is a single repo deployed on Netlify with server-side functions under `/api/*`.
- The app now opens directly into the seeded public workspace without a login screen.
- New companies can start with copied recipes, nutritional norms, ingredients, and starter structure data.
- Do not expose database credentials to the browser.
- W widoku `Struktura` możesz utworzyć własną firmę; opcja seed doda dane startowe (ferma/kurnik/rzut).
