# BTE Foundation

This directory contains a clean copy of the active Bloody Turkey Enterprise foundation extracted from the current workspace.

## What is included

- Application source for the active frontend and API:
  - apps/web
  - apps/api
- Business modules preserved as-is:
  - modules/feed-module
  - modules/iot
  - modules/economics
  - modules/health-intelligence-engine
  - modules/production-engine
  - modules/warehouse
- Documentation copied from the workspace root.

## Prerequisites

- Node.js 18+
- npm

## Install

```bash
cd apps/api && npm install
cd ../web && npm install
```

## Run locally

API:

```bash
cd apps/api
npm run start:dev
```

Web:

```bash
cd apps/web
npm run dev
```

## Validation

```bash
cd apps/api && npm test -- --runInBand
cd apps/api && npm run build
cd ../web && npm run build
```

## Notes

- This copy intentionally excludes generated artifacts, caches, logs, and environment files.
- The original workspace was not modified.
