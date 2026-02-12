---
title: "APME Implicare Automation - Web App PRD"
status: draft
owner: Dani
last_updated: 2026-02-12
---

# Product Requirements Document (PRD)

## 1) Overview

APME currently runs a Google Apps Script automation that reads Fillout submissions (via a Google Sheets sync) and sends follow-up emails based on user interests. The goal is to evolve this into a real web application with a proper dashboard and a template management system where admins can edit templates in-app using a WYSIWYG editor, manage template versions/variants, and inspect operational status.

This PRD covers the first major product increment: the operational control plane (dashboard + template editor + ingestion + rule evaluation + job queue scaffolding). Email sending/provider integration is explicitly deferred.

## 2) Goals

### Primary goals

1. Provide a web dashboard for admins to:
   - View incoming submissions (near real-time)
   - See processing state and outcomes (what templates would be assigned)
   - Inspect historical email events imported from the legacy sheet
2. Move templates into the app:
   - WYSIWYG editing for email templates
   - Template versioning (immutable snapshots)
   - Template variants (A/B or conditional routing)
   - Live preview using real submission data and placeholders
3. Replace the Sheets polling ingestion with Fillout webhooks:
   - Verify webhook signatures
   - Store raw events for audit and replay
   - Normalize data into a stable schema
4. Set up deployment on the VPS (Docker Swarm + Traefik) in a way that fits the existing `vps-infra` conventions.

### Secondary goals

1. Reduce fragility from changing Fillout question text by mapping canonical fields to Fillout question IDs.
2. Provide a path to gradually migrate away from Google Sheets as the source of truth.
3. Support multi-user access (admin/editor/viewer) with audit logs.

## 3) Non-goals (for this phase)

1. Email sending and deliverability (SMTP/Gmail API/provider choice) is deferred.
2. A full graphical rule builder is deferred (rules may remain code-defined initially).
3. Full CRM features (segmentation, lists, drip campaigns) are out of scope.
4. Public end-user UI is out of scope; this is an internal admin app.

## 4) Current system (baseline)

### Current ingestion

- Fillout syncs submissions into Google Sheets via native integration.
- Apps Script reads the `Implicare 2.0` tab and filters on `Processing Status != 'PROCESSED'`.

### Current logic

- `TemplateAssignment.assignTemplates(person)` uses Romanian column headers (question text) + mappings/patterns.
- Templates are stored in an `Email Templates` sheet and often reference Google Docs.

### Current template assets (migration source)

- A local folder is currently used as a source-of-truth copy of template documents:
  - `/Users/danifrim/Downloads/Email Templates`
- This folder is not part of the repository and should not be committed.
- Migration expectation:
  - We will import these templates into the app (WYSIWYG) to create initial `Template` + `TemplateVersion` records.
  - Any Google Docs-backed templates used by the legacy system should be cross-referenced during import to preserve names and intended usage.

### Current operational signals

- A CSV export exists in `docs/data/`:
  - `docs/data/Implicare 2.0 - Implicare 2.0.csv`
  - `docs/data/Implicare 2.0 - Email History.csv`

## 5) Target system (high-level)

### 5.1 Architecture

Web application + API + background worker deployed on a VPS using Docker Swarm.

- Frontend: Next.js (dashboard + editor)
- API: Node.js (can be Next.js API routes or a separate service)
- Database: PostgreSQL (recommended; SQLite is not suitable for concurrency + jobs)
- Queue: Redis (for async processing and future email jobs)
- Ingress/TLS: Traefik (existing Swarm pattern)

### 5.2 Data source of truth

For the new system:

- Postgres becomes the system of record.
- Fillout webhooks are the primary ingestion mechanism.
- Google Sheets becomes optional (export/backfill/reporting only).

## 6) Users and permissions

### Roles

1. Admin
   - Full access to settings, mappings, templates, jobs, and user management
2. Editor
   - Can create/edit templates and variants, preview changes, view submissions
3. Viewer
   - Read-only dashboard access

### Authentication

- Google OAuth is the expected default (restrict to allowlisted emails/domains).
- Sessions via secure cookies.

### Auditability

- All changes to templates, mappings, variants, and settings must be recorded with:
  - actor (user)
  - timestamp
  - before/after
  - reason/comment (optional)

## 7) Functional requirements

### 7.1 Submissions ingestion (Fillout)

#### Webhook endpoint

- Provide a public HTTPS endpoint for Fillout to POST submissions to.
- Verify Fillout webhook signatures via `X-Webhook-Signature` (HMAC-SHA256 over JSON string).
- Store raw webhook events for idempotency and replay.

#### Idempotency

- Use Fillout event `id` (when using database webhooks) and/or `submissionId` as unique identifiers.
- If Fillout retries the same event, the app must not create duplicates.

#### Data storage

- Persist raw payload in a `webhook_events` table.
- Normalize submissions into:
  - `submissions` table (core metadata)
  - `submission_answers` (question id/name/type/value)
- Preserve the original question text (`name`) because it is useful for UI and backfills.

#### Field mapping

- Introduce canonical keys (e.g., `FIRST_NAME`, `EMAIL`, `LOCATION`, etc.).
- Map canonical keys to Fillout `question.id` (stable).
- Allow remapping if the form changes.
- Provide an admin UI to map unknown questions to canonical keys.

#### Backfill

- Provide an admin-only backfill action that pulls historical submissions via Fillout REST API using `GET /forms/{formId}/submissions` with pagination and date filters.
- Store the same normalized structures.

### 7.2 Templates (WYSIWYG + versioning)

#### Template model

- A template has an identity (name, description, tags, status).
- Edits create new versions; versions are immutable.
- A version includes:
  - editor document (JSON)
  - rendered HTML snapshot
  - subject template
  - optional preheader
  - placeholder schema (what it expects)

#### WYSIWYG editor

- Must support email-safe layout:
  - headings, paragraphs, lists
  - basic formatting (bold/italic/underline)
  - links
  - images (optional; can be Phase 2)
  - simple blocks/sections
- The editor must prevent invalid/unsafe HTML.

#### Placeholders

- Use the existing placeholder style from the legacy system as the compatibility baseline:
  - `{{FirstName}}`, `{{LastName}}`, `{{Email}}`, `{{Missionary}}`, `{{EthnicGroup}}`, `{{PrayerDuration}}`, `{{Location}}`, `{{City}}`, `{{Church}}`
- App must provide:
  - a reference list of allowed placeholders
  - validation that flags unknown placeholders
  - preview rendering given a submission

#### Preview

- Admin selects a submission (or a synthetic sample) and previews the rendered HTML.
- Preview must show:
  - substituted placeholders
  - missing values highlighted (e.g., fallback values)

#### Publishing

- Draft vs Published versions.
- Only one published version per template at a time.
- Publishing creates an audit entry.

### 7.3 Template variants

#### Purpose

- Allow multiple versions/variants of a template to be chosen based on:
  - random A/B split
  - conditional rules (e.g., diaspora vs Romania)

#### Variant selection

- Define a deterministic selection algorithm.
- For A/B:
  - use a stable hash of (submissionId or email) to pick a variant so the same person remains consistent.

### 7.4 Rules engine (assignment)

#### MVP

- Port the current logic from `main-project/core/template-assignment.js` into the backend as deterministic TypeScript code.
- The engine returns:
  - list of templates to assign
  - reason codes (why each template was selected)
  - any missing required fields

#### Outputs

- Store an assignment record per submission:
  - templates selected
  - rule evaluation details
  - timestamps

#### Future

- Replace code rules with a JSON-defined ruleset editable in UI.

### 7.5 Dashboard

#### Submissions dashboard

- Filters:
  - date range
  - processed/unprocessed (in app terms)
  - location type (Romania/diaspora/unknown)
  - search by email/name
- Table columns:
  - submission time
  - email
  - name
  - location/city
  - assigned templates
  - status

#### Template dashboard

- Show:
  - template list
  - published version
  - last edited
  - usage counts (based on assignment records)

#### Legacy email history

- Import `docs/data/Implicare 2.0 - Email History.csv`.
- Display email history per person/template.
- Use for dedupe logic later.

### 7.6 Admin tools

- Manage canonical field mappings
- Manage template placeholders/fallback behavior
- Trigger backfills
- View webhook events/errors
- Export data

## 8) Data requirements and schema (conceptual)

### 8.1 Core entities

1. User
2. FilloutForm
3. FilloutQuestion
4. FieldMapping (canonical key -> questionId)
5. Submission
6. SubmissionAnswer
7. Template
8. TemplateVersion
9. TemplateVariant
10. Assignment
11. WebhookEvent
12. AuditLog
13. LegacyEmailHistory (imported)

### 8.2 Key constraints

- `submissions.submission_id` unique
- `webhook_events.event_id` unique
- One published template version per template

### 8.3 Normalization notes

The CSV shows mixed types:

- booleans as `TRUE/FALSE` strings
- blanks for missing values
- multi-select fields stored as comma-separated text

We must normalize into typed columns where useful, but always preserve raw data.

## 9) API requirements (initial)

### Webhooks

- `POST /api/webhooks/fillout`
  - Verify signature
  - Store event and submission
  - Return 2xx quickly

### Submissions

- `GET /api/submissions?filters...`
- `GET /api/submissions/:id`

### Templates

- `GET /api/templates`
- `POST /api/templates`
- `GET /api/templates/:id`
- `POST /api/templates/:id/versions`
- `POST /api/templates/:id/publish/:versionId`

### Preview

- `POST /api/templates/:id/preview`
  - body: submissionId + versionId/variant + test overrides

### Mappings

- `GET /api/mappings`
- `PUT /api/mappings/:canonicalKey`

### Admin backfill

- `POST /api/admin/fillout/backfill`
  - date range + pagination strategy

## 10) Security and compliance

### Secrets handling

- No secrets in git.
- Real secrets must live on the VPS in `/opt/stacks/<service>/.env`.
- Fillout API keys must be treated as secrets.

### Webhook verification

- Require signature validation.
- Reject invalid signatures with 401.

### Data privacy

- This system stores PII (name, email, phone, location).
- Provide a deletion workflow (admin-only) to delete a person/submission.
- Log access to sensitive data in audit logs where practical.

## 11) Deployment requirements (VPS / Swarm)

### Constraints

- Must fit the `vps-infra` approach:
  - Swarm stacks only
  - Traefik ingress
  - `.env` on VPS
  - images built locally and pushed to GHCR

### Proposed stack

- `apme-implicare-web` (Next.js)
- `apme-implicare-worker` (queue processor; can be the same image with a different command)
- `apme-implicare-postgres` (or shared postgres stack)
- `apme-implicare-redis`

### Domains

- Example:
  - `apme-implicare.ifrim.tech` for the dashboard
  - `hooks.apme-implicare.ifrim.tech` for webhooks (optional; can share same host)

## 12) Observability

### Logging

- Structured logs for:
  - webhook requests (accepted/rejected, timing)
  - normalization errors
  - assignment evaluation

### Metrics (MVP)

- webhook events received / rejected
- submissions ingested
- assignment evaluations run
- template preview renders

## 13) Success criteria

For the MVP release:

1. Webhook ingestion works reliably with signature verification.
2. Submissions appear in the dashboard within 1 minute.
3. Admin can create/edit/publish a template version and preview it with real submissions.
4. Assignment logic produces stable outputs and can be inspected in the UI.
5. Legacy CSV import completes and email history is visible.

## 14) Milestones (no dates)

1. Repo scaffolding for app + database + worker
2. Webhook ingestion + storage
3. CSV import + basic dashboard
4. Template editor + versioning + preview
5. Rule engine port + assignment records
6. Variants (A/B) + deterministic selection
7. Admin mappings UI + Fillout API backfill

## 15) Open questions

1. Final email sending approach (SMTP vs Gmail API) is deferred.
2. Exact WYSIWYG implementation choice (block-based email builder vs rich text) needs a decision.
3. User management details (single org, allowlist, domains) need confirmation.
4. Whether to support multi-form ingestion (multiple Fillout forms) in MVP.
