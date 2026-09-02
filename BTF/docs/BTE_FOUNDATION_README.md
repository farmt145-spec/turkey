# BTE Foundation README

## 1. What the current foundation is
The current workspace contains a multi-module enterprise codebase with several overlapping implementations. The foundation to preserve is the existing source tree, especially the main apps and the business modules for feed, health, production, warehouse, economics, and IoT. The goal of this cleanup is to reduce noise and prepare a cleaner handoff without replacing the current business logic.

## 2. How to run it
The main application entry points are:
- API: apps/api
- Web app: apps/web
- Monorepo-style enterprise foundation: zbuduj

## 3. Frontend
- Primary web app: apps/web
- Monorepo web app: zbuduj/apps/web
- The frontend uses React + Vite + TypeScript.

## 4. Backend
- Primary API: apps/api
- Backend framework appears to be NestJS.
- Other business modules are preserved in separate folders and are still valuable domain assets.

## 5. Database
- Prisma is the main database layer used in multiple modules.
- The database inventory is documented in BTE_DATABASE_INVENTORY.md.
- Several schema variants exist and should be reviewed later; they are not merged in this pass.

## 6. API
- The current integration API is centered around apps/api.
- Additional domain APIs are present in the separate business modules.

## 7. Modules
Preserved business modules:
- feed
- health
- production
- warehouse
- economics
- iot

## 8. Dependencies
- Node.js and npm are the main package managers.
- The project uses TypeScript, NestJS, Vite, React, Prisma, and related tooling.

## 9. Build
Use the package-level scripts from the relevant app directories.
Example:
- npm run build in apps/api
- npm run build in apps/web
- npm run build in zbuduj

## 10. Tests
Use the relevant package scripts such as:
- npm test in apps/api
- npm run test in the domain package if available

## 11. Deployment
Deployment should follow the existing project structure and currently configured package scripts. No new deployment strategy is introduced in this cleanup pass.
