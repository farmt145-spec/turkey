# Bloody Turkey Enterprise

A modern poultry ERP / operations platform for turkey production management, nutrition, health, production intelligence, warehouse, and enterprise dashboards.

## Overview

This repository contains the Bloody Turkey foundation and enterprise layer including:

- operational dashboard and command center
- production and batch visibility
- feed and nutrition lab
- ERP modules and data model
- architecture and audit documents
- frontend app deployed as a static site on Netlify

## Project structure

- `app/` — frontend + API + database model
- `BTF/` — modular enterprise foundation
- `BTE_AUDIT/` — audits, architecture, comparison, risk documents
- `bloody-turkey-kimi/` — additional implementation modules

## Local development

```bash
cd app
npm install --legacy-peer-deps
npm run dev -- --host localhost --port 4173
```

Open:

```text
http://localhost:4173
```

## Production build

```bash
cd app
npm install --legacy-peer-deps
npm run build
```

## Netlify deployment

Create a new Netlify site from this repository.

### Build settings

- The repository root `netlify.toml` is ready for a fresh Netlify project.
- If you enter settings manually, use:
  - Base directory: `app`
  - Build command: `npm install --legacy-peer-deps && npm run build`
  - Publish directory: `dist/public`
  - Functions directory: `netlify/functions`

### Required environment variables

```bash
TURSO_DB_URL=libsql://<db>-<org>.turso.io
TURSO_AUTH_TOKEN=<turso-token>
SESSION_SECRET=<long-random-secret>
API_KEY_PEPPER=<second-long-random-secret>
```

Optional demo mode:

```bash
DEMO_MODE=true
DEMO_COMPANY_ID=1
VITE_DEMO_MODE=true
```

Important:
- Netlify serves the frontend and the `/api/*` endpoints through Netlify Functions.
- `VITE_API_URL` is optional; leave it empty to use the same Netlify site for API calls.
- do not expose database credentials in the browser

## Important notes

- the app is designed for a single project architecture and does not create a separate parallel system
- demo/full mode is available in the UI
- ERP create flows include a default company fallback to avoid broken inserts
- in `Struktura` and during first registration you can create your own company with copied recipes, norms, ingredients, and starter farm data

## License

This project is provided as a working internal prototype / enterprise foundation for development purposes.
