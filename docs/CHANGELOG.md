# Project Knowledge Changelog

> Living project state document. Not a git log. Last updated: February 14, 2026

## Current State

APME Implicare Automation is a monorepo with a Next.js 16 web dashboard + API (Prisma/Postgres)
and two Google Apps Script projects (library + spreadsheet wrapper) that automate APME form
processing, email template assignment, and reporting. The dashboard provides operational views
for submissions, templates, mappings, webhooks, and audit history.

## Latest Changes

### February 14, 2026

- Fixed CSV filename mismatch in submission import route (`implicare-data.csv` instead of old name).
- Fixed undeclared `missingAssignment` variable bug in legacy email history reconciliation script.

### February 12, 2026

- Added audit log API support with filterable, paginated responses and related dashboard UI.
- Added mapping management API with tests, plus UI improvements in the mappings dashboard.
- Extended template workflows with publish adjustments, version handling, and duplicate endpoint.
- Expanded submissions tooling with import updates, new tests, and richer list/detail UI behavior.
- Added legacy inference rules and updated reconciliation tooling for backfilling email history.
- Replaced legacy CSV exports with normalized data files under `docs/data/`.
- Added and refreshed diagrams under `docs/diagrams/` plus submission detail modal planning notes.

## Key Files

### Core (Next.js App)

- `app/src/app/api/audit-logs/route.ts` - Audit log listing with filters and pagination.
- `app/src/app/api/mappings/route.ts` - Mapping CRUD endpoints for dashboard management.
- `app/src/app/api/templates/[id]/duplicate/route.ts` - Template duplication endpoint.
- `app/src/app/api/templates/[id]/versions/[versionId]/route.ts` - Template version handling.
- `app/src/app/api/submissions/import/route.ts` - Submission import pipeline updates.
- `app/src/lib/audit.ts` - Central audit log writer helper.
- `app/src/lib/assignment-engine.ts` - Submission template assignment logic.
- `app/src/components/email-editor.tsx` - Shared email template editor UI.
- `app/src/app/dashboard/` - Dashboard pages (audit, mappings, submissions, templates, webhooks).
- `app/src/app/dashboard/submissions/page.test.tsx` - Submissions UI regression coverage.
- `app/src/app/api/audit-logs/route.test.ts` - Audit log API test coverage.
- `app/src/app/api/mappings/route.test.ts` - Mapping API test coverage.

### Scripts and Data

- `app/scripts/reconcile-legacy-email-history.js` - Backfill email history tooling.
- `app/scripts/legacy-inference-rules.js` - Rules for inferring template assignments.
- `app/scripts/legacy-inference-rules.test.ts` - Legacy inference test coverage.
- `docs/data/email-history.csv` - Normalized email history export.
- `docs/data/implicare-data.csv` - Normalized submission export.

### Documentation

- `docs/IMPLEMENTATION-SUMMARY.md` - Current implementation summary.
- `docs/diagrams/` - Architecture and flow diagrams.
- `docs/submission-detail-modal-plan.md` - UI planning notes for submission detail modal.
- `AGENTS.md` - Project-specific agent rules and workflows.
- `main-project/` - Apps Script automation library.
- `wrapper-project/` - Spreadsheet-bound Apps Script integration.

## Findings & Learnings

### February 12, 2026

- **Finding:** Audit log queries need both pagination and filter metadata to keep UI responsive.
- **Why it matters:** The audit dashboard relies on consistent filter sets for fast navigation.
- **Finding:** Legacy template inference logic must mirror Apps Script rules to reconcile history.
- **Why it matters:** Backfill accuracy depends on using the same mapping heuristics.
- **Finding:** Mapping data and audit records now move together in the UI.
- **Why it matters:** Operators can trace template behavior across both systems.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (app), JavaScript (Apps Script)
- **Database:** PostgreSQL via Prisma
- **Testing:** Vitest + React Testing Library
- **Package Manager:** PNPM
- **Deployment:** Vercel (web app) + Google Apps Script

## Development

### Commands

```bash
pnpm -C app dev              # Start dev server
pnpm -C app build            # Production build
pnpm -C app start            # Start production server
pnpm -C app lint             # Run ESLint
pnpm -C app test             # Run all tests
pnpm -C app test -- -t "..." # Run tests matching pattern
pnpm -C app db:migrate       # Run Prisma migrations
pnpm -C app db:generate      # Generate Prisma client
pnpm -C app db:studio        # Open Prisma Studio
npm run app:dev              # Root shortcut for app dev server
npm run app:test             # Root shortcut for app tests
```

### Setup Notes

- Web app environment variables live in `app/.env`.
- Apps Script auth uses the `mobilizare@apme.ro` account.
- Diagram sources live under `docs/diagrams/` and are kept in Mermaid format.
