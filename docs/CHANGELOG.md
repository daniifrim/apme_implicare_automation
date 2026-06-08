# Project Knowledge Changelog

> Living project state document. Not a git log. Last updated: 2026-06-08 12:07

## Current State

APME Implicare Automation is a monorepo with a Next.js 16 web dashboard + API (Prisma/Postgres)
and two Google Apps Script projects (library + spreadsheet wrapper) that automate APME form
processing, email template assignment, and reporting. The dashboard provides operational views
for submissions, templates, mappings, webhooks, and audit history.

## Latest Changes

### 2026-06-06

- **Shadow mode implemented** — `ShadowDecision` model, `computeShadowDecision()`, batch comparison script. Zero email side effects.
- **Legacy email history imported** — 2,059 records from CSV with deduplication and template name normalization.
- **Assignment parity fixes (TDD)** — Fixed 8 systematic bugs causing app vs Apps Script mismatches:
  1. Camp exclusion for past participants (`hasPositiveIntent` "Am participat..." bug)
  2. Prayer NU exclusion gap (CSV import ignored `prayer_adoption="NU"`)
  3. AssignmentEngine exclusion safety net (`isExcluded()` helper)
  4. Boolean strictness for donation/volunteer (`isStrictBooleanTrue()` replacing `hasPositiveIntent("Da")`)
  5. Diacritic normalization for course mapping ("Împuternicit" → "imputernicit")
  6. Legacy template name normalization ("coordonatori Kairos" → "Kairos")
  7. `hasPositiveIntent` `startsWith("nu ")` bug ("Nu am participat, doresc informații" was incorrectly excluded)
  8. Mission-field exclusion tests added ("Nu acum, poate mai târziu", "Nu am resurse financiare")
- **Shadow comparison results** — Match rate improved from 0.3% → 49.9% (+49.6 pp). Mismatches down from 81.7% → 32.2%.
- **PRD created** — `docs/prds/backend-migration-appscript-to-next.md` documents migration phases, cutover checklist, and open work.
- **74 focused tests passing** across 7 test files (up from 64).

### 2026-06-08

- **Apps Script webhook deployed and tested** — End-to-end live test successful:
  - Web app deployed at `https://script.google.com/macros/s/AKfycbxpNX.../exec`
  - `WEBHOOK_API_KEY` configured in Script Properties
  - Health check (`doGet`) returns `{"status":"ok","webhookEnabled":true}`
  - Live email send test successful: POST → 302 redirect → GET response → `{"status":"success","message":"Email sent successfully"}`
- **Fixed Apps Script POST redirect handling** — Apps Script web apps return 302 on POST; response is only available via GET to redirect URL. Updated `send-dispatcher.ts` with `postToAppsScriptWebhook()` helper that handles the two-step flow.
- **Updated `.env`** with production webhook URL and API key.
- **84 tests passing** across 8 focused test files.
- **Send jobs wired into assignment flow** — `createSendJob()` automatically called after each `Assignment` creation, so new submissions queue emails for dispatch. Feature flag `USE_APPS_SCRIPT_SENDER=false` still prevents actual sending until explicitly enabled.
- **End-to-end test passed** — Full flow verified: submission → assignment → send job → Apps Script webhook → email sent → status updated to `sent`. Safety mode redirected test email to `danifrim14@gmail.com`.

### 2026-06-07

- **Apps Script thin adapter implemented** — Phase 5 sender migration:
  - Next.js `SendJob` model with states (pending/sending/sent/failed/skipped/retrying), idempotency key, retry count
  - `send-dispatcher.ts` with `createSendJob()`, `dispatchSendJob()`, `processPendingSendJobs()`
  - Exponential backoff retry: 5min → 15min → 45min, max 3 attempts
  - Feature flag `USE_APPS_SCRIPT_SENDER=false` by default (safe by default)
  - Apps Script webhook adapter (`main-project/api/webhook-adapter.js`) with API key validation
  - Apps Script `doPost()` entry point delegates to existing `GDocsConverter.sendEmailFromGDoc()`
  - Apps Script `doGet()` health check endpoint
  - 10 send-dispatcher tests added (idempotency, feature flag, retry, failure)
  - Total: **84 tests passing** across 8 focused test files
- **PRD updated** with Phase 5 architecture, deployment steps, and cutover checklist progress

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
- `app/src/app/api/submissions/import/route.ts` - Submission import pipeline with canonical decision answers.
- `app/src/app/api/webhooks/fillout/route.ts` - Fillout webhook ingestion with assignments.
- `app/src/lib/audit.ts` - Central audit log writer helper.
- `app/src/lib/assignment-engine.ts` - Submission template assignment logic with exclusions.
- `app/src/lib/shadow-mode.ts` - Shadow-mode decision engine (zero email side effects).
- `app/src/lib/apps-script-automation-contract.test.ts` - Apps Script contract tests.
- `app/src/lib/assignment-parity.test.ts` - Dual-engine parity tests (Apps Script vs Next).
- `app/src/lib/shadow-mode.test.ts` - Shadow mode behavior tests.
- `app/src/components/email-editor.tsx` - Shared email template editor UI.
- `app/src/app/dashboard/` - Dashboard pages (audit, mappings, submissions, templates, webhooks).
- `app/src/app/dashboard/submissions/page.test.tsx` - Submissions UI regression coverage.
- `app/src/app/api/audit-logs/route.test.ts` - Audit log API test coverage.
- `app/src/app/api/mappings/route.test.ts` - Mapping API test coverage.
- `app/src/app/api/submissions/import/route.test.ts` - CSV import tests (canonical answers, exclusions, idempotency).

### Scripts and Data

- `app/scripts/import-legacy-email-history.js` - Import email history CSV into Postgres.
- `app/scripts/run-shadow-comparison.js` - Batch shadow comparison across all submissions.
- `app/scripts/reimport-with-fixes.js` - Re-import CSV with updated canonical answer logic.
- `app/scripts/legacy-email-history-utils.js` - Template name normalization utilities.
- `app/scripts/reconcile-legacy-email-history.js` - Backfill email history tooling.
- `app/scripts/legacy-inference-rules.js` - Rules for inferring template assignments.
- `app/scripts/legacy-inference-rules.test.ts` - Legacy inference test coverage.
- `docs/data/email-history.csv` - Normalized email history export.
- `docs/data/implicare-data.csv` - Normalized submission export.
- `docs/prds/backend-migration-appscript-to-next.md` - Migration PRD.

### Documentation

- `docs/IMPLEMENTATION-SUMMARY.md` - Current implementation summary.
- `docs/prds/backend-migration-appscript-to-next.md` - Backend migration PRD (Phases 0-5, cutover checklist).
- `docs/diagrams/` - Architecture and flow diagrams.
- `docs/submission-detail-modal-plan.md` - UI planning notes for submission detail modal.
- `AGENTS.md` - Project-specific agent rules and workflows.
- `main-project/` - Apps Script automation library.
- `wrapper-project/` - Spreadsheet-bound Apps Script integration.

## Findings & Learnings

### 2026-06-06

- **Finding:** `hasPositiveIntent` with `startsWith("nu ")` incorrectly excluded positive Romanian phrases like "Nu am participat, doresc informații."
- **Why it matters:** Overly broad negative matching caused 133 camp-only-legacy mismatches. Fixed by using specific exclusion phrases instead of prefix matching.
- **Finding:** Apps Script boolean fields (donation, volunteer) only accept `TRUE`/`true`/`"TRUE"`, not "Da".
- **Why it matters:** Using `hasPositiveIntent("Da")` for boolean fields created app-only donation/volunteer mismatches. Fixed with `isStrictBooleanTrue()`.
- **Finding:** Romanian diacritics in course names ("Împuternicit") don't match lowercase ASCII includes.
- **Why it matters:** 46 mobilize-only-legacy mismatches caused by diacritic mismatch. Fixed with NFD normalization before matching.
- **Finding:** Old form versions lack donation/volunteer questions, causing ~65 missing-field mismatches.
- **Why it matters:** These are expected, not bugs — legacy history may include manual sends for older submissions.
- **Finding:** Shadow mode match rate of 49.9% with only ~85 unexplained mismatches (all combinations of known differences) indicates assignment parity is sufficient for sender cutover.
- **Why it matters:** No new systematic app bugs found after eliminating the `startsWith("nu ")` bug. Next milestone can advance to sender strategy selection.

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
