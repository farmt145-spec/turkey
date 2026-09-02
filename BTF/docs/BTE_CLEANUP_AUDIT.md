# BTE Cleanup Audit

## 1. Summary
This audit covers the current Bloody Turkey Enterprise workspace before any cleanup. The goal is to preserve business logic and prepare a cleaner foundation for handoff.

## 2. Active / primary project
- Primary workspace root: /Users/apple/Desktop/BloodyturkeyEnterprise-kopia
- Most relevant active application structure:
  - apps/api: integration API and shared backend entry point
  - apps/web: web frontend entry point
  - zbuduj/apps/api and zbuduj/apps/web: more complete enterprise-oriented monorepo-style foundation
- The strongest existing foundation appears to be the zbuduj workspace, with package-based structure and a clearer monorepo layout.

## 3. Legacy / duplicate / experimental areas
- Root-level mirror directory: BloodyturkeyEnterprise/ (contains a duplicate copy of the same project layout)
- Root-level archive-like folders: agents/, agents deisng/, agents enterprie/, agents1/ containing generated output and experiments
- Experimental or generated projects: app-14/, bloodyTurkey_Foundation/, bloodyTurkey_Foundation.zip, PROJECT_DOCUMENTATION.zip
- Separate domain modules retained as business modules:
  - bloody-turkey-feed-module
  - bloody-turkey-iot
  - turkey-economics
  - turkey-health-intelligence-engine
  - turkey-production-engine
  - turkey-warehouse

## 4. Likely unused / low-value items
- Generated build artifacts and caches under app-14/dist, node_modules, dist, build, outputs, work
- Temporary files and backup-like artifacts such as *.bak, *.orig, *.log
- Duplicate schema files at the repository root and inside legacy folders
- Multiple agent output folders that appear experimental and should be archived rather than used as primary code

## 5. Modules by category
### KEEP
- apps/api
- apps/web
- zbuduj/apps/api
- zbuduj/apps/web
- bloody-turkey-feed-module
- bloody-turkey-iot
- turkey-economics
- turkey-health-intelligence-engine
- turkey-production-engine
- turkey-warehouse

### MERGE
- Domain modules that have overlapping logic with other modules and should be reviewed later for consolidation
- Shared schema concepts across multiple Prisma files

### ARCHIVE
- agents/, agents deisng/, agents enterprie/, agents1/ output folders
- app-14/ (experimental UI/demo app)
- bloodyTurkey_Foundation/ (foundation snapshot candidate)
- PROJECT_DOCUMENTATION.zip and bloodyTurkey_Foundation.zip
- Root-level duplicate schema files: bloody_turkey_schema.prisma, candidate_shared_schema.prisma, eval_merged_schema.prisma, merged_shared_schema.prisma, merged_shared_schema.prisma.bak

### REMOVE
- Generated build artifacts, caches, and temporary files
- node_modules directories that are not needed for source control
- dist/build/coverage/output/work directories where present

### REVIEW
- The root apps/ folder vs the zbuduj monorepo layout
- Whether the root-level apps/api and apps/web should continue as the main integration surface or be superseded by zbuduj
- Any business modules that are incomplete but still valuable

## 6. Security note
The workspace contains many .env-like files in generated folders. These must be treated as potential secrets and should not be deleted or exposed during cleanup.

## 7. Suggested preservation strategy
- Preserve business modules and their source code.
- Do not merge modules yet.
- Archive experimental and duplicate content.
- Remove only generated and obvious temporary artifacts.
