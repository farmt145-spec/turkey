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

Use the app folder as the site root.

### Build settings

- Base directory: `app`
- Build command: `npm install --legacy-peer-deps && npx vite build`
- Publish directory: `dist/public`

### Required environment variable

```bash
VITE_API_URL=https://your-backend.example.com
```

Important:
- the frontend is static and should be hosted on Netlify
- MySQL / database / backend should not be exposed publicly
- keep database and API on a separate secure backend service (for example Railway, Render, Azure App Service, or a custom private runtime)

## Important notes

- the app is designed for a single project architecture and does not create a separate parallel system
- demo/full mode is available in the UI
- ERP create flows include a default company fallback to avoid broken inserts
- in `Struktura` you can create your own company and auto-generate starter data (farm + house + first batch)

## License

This project is provided as a working internal prototype / enterprise foundation for development purposes.
