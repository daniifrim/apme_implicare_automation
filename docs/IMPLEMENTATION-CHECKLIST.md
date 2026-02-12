---
title: "APME Implicare App - Implementation Checklist"
status: draft
source: docs/PRD-apme-implicare-app.md
last_updated: 2026-02-12
---

# Implementation Checklist

This checklist translates `docs/PRD-apme-implicare-app.md` into build steps that can be executed incrementally while keeping the system deployable.

Email sending/provider integration is explicitly deferred.

## 0) Repo + project setup

- Create a new app workspace within this repo (or a sibling repo) with:
  - web app (Next.js)
  - API layer (same Next.js app or separate Node service)
  - worker (queue processor)
  - shared packages (types, rules engine, utilities)
- Decide monorepo tooling:
  - Recommended: `pnpm` workspaces + `turborepo` (or keep it simple with a single Next app + `src/worker`)
- Add baseline dev tooling:
  - lint (eslint)
  - formatting (prettier)
  - typecheck
  - basic test runner (vitest/jest)
- Add `.env.example` for local development only (no secrets).

Acceptance:
- `npm/pnpm` commands run locally.
- CI-ready scripts exist (even if CI isn’t set up yet).

## 1) Database foundation (PostgreSQL)

- Add migrations framework (choose one):
  - Prisma migrations, or
  - Drizzle migrations, or
  - Knex migrations
- Create minimal schema for MVP:
  - `users` (or defer if using auth provider)
  - `audit_log`
  - `webhook_events`
  - `submissions`
  - `submission_answers`
  - `fillout_forms`
  - `fillout_questions`
  - `field_mappings`
  - `templates`
  - `template_versions`
  - `template_variants`
  - `assignments`
  - `legacy_email_history`
- Add critical constraints + indices:
  - unique: `webhook_events.event_id`
  - unique: `submissions.submission_id`
  - indices on: `submissions.submission_time`, `submissions.email` (if stored), `assignments.submission_id`, `template_versions.template_id`

Acceptance:
- `migrate up` creates schema cleanly.
- Fresh DB can be initialized with one command.

## 2) Webhook ingestion (Fillout)

- Implement `POST /api/webhooks/fillout`:
  - raw body capture (required for signature verification)
  - verify `X-Webhook-Signature` (HMAC SHA-256) with stored secret
  - store into `webhook_events`
  - upsert `submissions` + insert `submission_answers`
- Idempotency:
  - do nothing if `webhook_events.event_id` already processed
  - ensure `submission_id` uniqueness
- Error behavior:
  - invalid signature => 401
  - malformed payload => 400
  - internal error => 500 but keep logs
- Add an internal “replay event” admin endpoint:
  - reprocess stored raw event into normalized tables

Acceptance:
- Valid webhook requests are accepted and stored.
- Duplicate delivery does not create duplicates.
- Invalid signature is rejected.

## 3) CSV import (bootstrap data)

- Build import scripts (one-time or admin endpoints) to ingest:
  - `docs/data/Implicare 2.0 - Implicare 2.0.csv` => `submissions` (as legacy submissions) + `legacy_raw_columns` storage
  - `docs/data/Implicare 2.0 - Email History.csv` => `legacy_email_history`
- Normalization rules:
  - Convert `TRUE/FALSE` strings to boolean
  - Parse dates where possible, else store raw
  - Preserve raw row JSON for audit/debug

Acceptance:
- Running import twice is safe (idempotent) or explicitly blocked.
- Imported records appear in dashboard queries.

## 4) Auth + role-based access control

- Implement authentication:
  - Recommended: Google OAuth
- Implement authorization:
  - roles: Admin / Editor / Viewer
- Add UI-level and API-level checks.
- Add audit entries for sensitive operations (template publish, mapping changes, replay/backfill).

Acceptance:
- Unauthenticated access is blocked.
- Role restrictions work for template editing and admin actions.

## 5) Dashboard (Submissions)

- UI: Submissions list view
  - filters: date range, status, search (email/name)
  - columns: submission time, email, name, location/city, assigned templates, status
- UI: Submission detail view
  - raw answers
  - normalized canonical fields
  - assignment evaluation output (selected templates + reason codes)

Acceptance:
- Submissions are navigable and searchable.
- Detail view shows enough context to debug mappings and rules.

## 6) Field mappings UI (canonical -> Fillout question ID)

- Define canonical keys list (initial set based on current automation fields).
- UI: mappings screen
  - show unmapped Fillout questions
  - map each canonical key to a question ID
  - show last-seen question text (`name`) for human comprehension
- Add mapping validation:
  - warn if multiple canonical keys map to same question ID
  - warn if mapped question disappears

Acceptance:
- Admin can map unknown questions.
- Mappings are used by normalization and template preview.

## 7) Templates (CRUD + versioning)

- UI: Templates list
  - name, status, published version, last edited
- UI: Template detail
  - versions list
  - publish/unpublish
  - audit trail
- API: create template, create version, publish version

Acceptance:
- Editing creates a new immutable version.
- Publish switches the active version.

## 8) WYSIWYG editor + rendering pipeline

- Pick editor approach (email-safe):
  - block-based builder, OR
  - constrained rich text editor
- Store:
  - editor JSON
  - rendered HTML snapshot
  - subject/preheader
- Implement placeholder tooling:
  - placeholder insert menu
  - validation for unknown placeholders
  - fallback behavior for missing values

Acceptance:
- Editor can produce HTML reliably.
- Preview shows substituted placeholders.

## 9) Template variants (A/B + conditional)

- Data model:
  - variant rules + weights
- Selection algorithm:
  - deterministic hash of (email or submissionId) for consistent variant selection
- UI: variant management on a template

Acceptance:
- Same input consistently selects the same variant.
- Admin can configure A/B splits.

## 10) Assignment engine (rules)

- Port the current logic from Apps Script to backend TypeScript:
  - read canonical fields derived from Fillout answers
  - return selected templates + reason codes
- Store an `assignment` record per submission evaluation.
- UI: show reasons per template on submission detail.

Acceptance:
- Assignment results are stable and explainable.
- Engine is unit-tested with representative fixtures.

## 11) Admin: webhook events + errors

- UI: webhook events list
  - status (accepted/rejected)
  - timestamps
  - reason for rejection (signature, parsing)
- UI: event detail
  - headers + raw payload (redacted where needed)
  - replay button (admin only)

Acceptance:
- Ops can diagnose ingestion issues quickly.

## 12) Fillout API backfill (optional in MVP)

- Implement admin-only backfill endpoint using Fillout REST API:
  - list submissions by date range
  - pagination
  - store normalized data identically to webhook ingestion

Acceptance:
- Backfill can hydrate a new DB from Fillout.

## 13) VPS deployment (Swarm)

- Add a new stack under `vps-infra/stacks/` (in the infra repo):
  - `compose.yml` with Traefik labels
  - `.env.example`
- Build/push image to GHCR (linux/amd64)
- Deploy with `docker stack deploy` and validate with healthcheck.

Acceptance:
- App is reachable over HTTPS via Traefik.
- Webhook endpoint reachable and stable.
- DB/redis services healthy.

## 14) Quality gates

- Add unit tests for:
  - webhook signature verification
  - idempotency
  - placeholder rendering
  - variant selection
  - assignment engine outputs
- Add minimal e2e smoke test plan (manual acceptable initially):
  - login
  - open submissions dashboard
  - open template editor
  - render preview

Acceptance:
- Test suite passes cleanly.
- No secrets in repo.

## 15) Cutover strategy (later)

- Keep Apps Script running while the new app runs in parallel.
- Use the app in “shadow mode”:
  - ingest submissions
  - run assignments
  - preview outputs
- When email sending is implemented, switch traffic and disable Apps Script triggers.
