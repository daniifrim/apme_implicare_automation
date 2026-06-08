# AGENTS.md

Guidelines for AI coding agents working on the APME Implicare Automation project.

## Project Structure

This is a monorepo with two distinct parts:

- **`app/`** - Next.js 16 web application (dashboard + API + Prisma)
- **`main-project/`** - Google Apps Script library (core automation logic)
- **`wrapper-project/`** - Google Apps Script bound to spreadsheet
- **`docs/`** - Documentation, PRDs, data exports
- **`scripts/`** - Root-level deployment and orchestration scripts

### Web App (`app/`)

```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/              # Main app route group (app shell layout)
│   │   ├── dashboard/          # Legacy/dashboard route group
│   │   ├── api/                # API routes
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles + CSS variables
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── template-editor/    # Email template editor
│   │   ├── settings/           # Settings page sections
│   │   └── layout/             # App shell (sidebar, header, nav)
│   ├── lib/                    # Core business logic (co-located with tests)
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # Shared TypeScript types
│   └── test/                   # Test setup
├── prisma/                     # Prisma schema + migrations + seed
├── scripts/                    # Data import + utility scripts
├── public/                     # Static assets
└── docker-compose.yml          # Production stack definition
```

### Key App Routes

| Route | Purpose |
|-------|---------|
| `/` | Redirect to dashboard |
| `/dashboard` | Overview with stats, charts, quick actions |
| `/submissions` | Form submissions list |
| `/submissions/[id]` | Submission detail + assignments |
| `/templates` | Email templates list |
| `/templates/[id]` | Template detail + version history |
| `/templates/[id]/edit` | BlockNote-based template editor |
| `/mappings` | Field mapping configuration |
| `/settings` | App settings (appearance, automation, backup, etc.) |
| `/audit` | Audit log viewer |
| `/users` | User management |
| `/webhooks` | Webhook event viewer |

### Core Lib Modules (`app/src/lib/`)

| Module | Purpose |
|--------|---------|
| `assignment-engine.ts` | Determines which email templates to assign to a submission |
| `assignments.ts` | Assignment CRUD + business rules |
| `send-dispatcher.ts` | Email send orchestration |
| `shadow-mode.ts` | Shadow-mode comparison for validation |
| `audit.ts` | Audit logging utilities |
| `webhook.ts` | Webhook parsing + validation |
| `email-template-normalization.ts` | Template content normalization |
| `normalize.ts` | General normalization helpers |
| `prisma.ts` | Prisma client singleton |
| `utils.ts` | `cn()` and other shared utilities |

## Development Commands

### Web App (Next.js)

From repo root:
```bash
pnpm -C app dev              # Start dev server
pnpm -C app build            # Production build
pnpm -C app start            # Start production server
pnpm -C app lint             # Run ESLint
pnpm -C app test             # Run all tests
pnpm -C app test -- assignment-engine.test.ts   # Run single test file
pnpm -C app test -- -t "should assign"          # Run tests matching pattern
pnpm -C app test:coverage    # Run tests with coverage
pnpm -C app db:migrate       # Run Prisma migrations
pnpm -C app db:generate      # Generate Prisma client
pnpm -C app db:studio        # Open Prisma Studio
pnpm -C app db:seed          # Seed database
```

Or using root package.json shortcuts:
```bash
npm run dev                  # Runs dev-with-data.sh (Docker + dev server)
npm run app:dev
npm run app:build
npm run app:test
npm run app:lint
```

### Docker / Deployment

```bash
npm run docker:build         # Build Docker image via buildx bake
npm run docker:push          # Push image to registry
npm run deploy               # Deploy to VPS via SSH + Docker Swarm
npm run deploy:full          # Push image then deploy
npm run vps:migrate          # Run Prisma migrate deploy on VPS
```

### Apps Script Projects

```bash
npm run push-clasp           # Push both projects to Apps Script only
npm run push-clasp-github    # Push to Apps Script + commit to GitHub
npm run push-main            # Push main project only
npm run push-wrapper         # Push wrapper project only
npm run pull-main            # Pull main project from Apps Script
npm run pull-wrapper         # Pull wrapper project from Apps Script
```

## Code Style Guidelines

### TypeScript (Web App)

- **Strict mode enabled** - always use proper types, no `any`
- Use `type` for object shapes, `interface` for extensible contracts
- Prefer `unknown` over `any` for catch blocks
- Use `@/` path alias for imports from `src/` directory
- Prefer named exports over default exports
- Use nullish coalescing (`??`) over logical OR (`||`)

### Naming Conventions

- **PascalCase**: Components, classes, interfaces, types
- **camelCase**: Functions, variables, instance properties
- **UPPER_SNAKE_CASE**: Constants, environment variables
- **kebab-case**: File names, route segments
- Boolean props: Use `is`/`has`/`should` prefixes (e.g., `isLoading`, `hasError`)

### Imports

Order:
1. React/Next built-ins
2. Third-party libraries
3. `@/` aliases (lib, components, types)
4. Relative imports

Example:
```typescript
import { useState } from 'react'
import { NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'

import { utils } from './utils'
```

### Error Handling

- Always wrap API route handlers in try-catch
- Log errors to console with context
- Return structured error responses
- Never expose internal error details to client

```typescript
try {
  // operation
} catch (error) {
  console.error('Context message:', error)
  return NextResponse.json(
    { error: 'User-friendly message' },
    { status: 500 }
  )
}
```

### Testing (Vitest)

- Co-locate tests alongside source files (e.g., `foo.ts` + `foo.test.ts`)
- Use `describe` blocks for organization
- Use descriptive test names with "should"
- Use factory functions for test data
- Mock external dependencies
- Test environment: `jsdom` with `@testing-library/react`

### React/Next.js

- Use Server Components by default
- Mark Client Components with `'use client'` when needed
- Use `function` syntax for components
- Destructure props in function parameters
- Use `cn()` utility for conditional class names
- Follow shadcn/ui patterns for UI components

### Database (Prisma)

- Always use Prisma client from `@/lib/prisma.ts` singleton
- Use transactions for related operations
- Prefer type-safe queries with `include`
- Use camelCase for field names in schema

### Styling

- Use Tailwind CSS v4
- Prefer composition over complex conditional classes
- Use `cn()` from `@/lib/utils` for class merging
- Follow existing color system (CSS variables in globals.css)

### Apps Script Specific

- Apps Script uses ES5-style JavaScript
- Use JSDoc comments for type hints
- Follow existing Google Apps Script patterns
- Be aware of execution time limits (6 minutes)

## Local Development Setup (Web App)

### Prerequisites

- Docker Desktop (for PostgreSQL + Redis)
- Node.js + PNPM

### Database Setup

The `dev-with-data.sh` script starts all required services:

```bash
npm run dev
```

Or manually start a local PostgreSQL container:

```bash
docker run -d --name apme-postgres \
  -e POSTGRES_USER=apme \
  -e POSTGRES_PASSWORD=apme_password \
  -e POSTGRES_DB=apme_implicare \
  -p 5432:5432 \
  postgres:16-alpine
```

If the container already exists but is stopped:

```bash
docker start apme-postgres
```

Run migrations:

```bash
pnpm -C app db:migrate
```

### Seeding Data

The database can be populated from local data files after a fresh setup. Run these in order:

1. **Import email templates** (from `docs/email-templates/*.txt`):
   ```bash
   curl -X POST http://localhost:3000/api/templates/import
   ```

2. **Import submissions** (from `docs/data/implicare-data.csv`):
   ```bash
   curl -X POST http://localhost:3000/api/submissions/import
   ```

3. **Reconcile legacy email history** (creates template assignments from `docs/data/email-history.csv`):
   ```bash
   node app/scripts/reconcile-legacy-email-history.js --dry-run   # Preview first
   node app/scripts/reconcile-legacy-email-history.js --apply      # Apply changes
   ```

The dev server (`pnpm -C app dev`) must be running for steps 1 and 2.

### Environment

Web app environment is configured in `app/.env`. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | NextAuth configuration |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `FILLOUT_API_KEY` / `FILLOUT_WEBHOOK_SECRET` | Fillout form integration |
| `APP_URL` / `APP_HOST` | Public app URL |

## Deployment

The app deploys as a Docker Swarm stack to a Hetzner VPS:

- **Image**: `ghcr.io/daniifrim/apme-implicare-web:latest`
- **Orchestration**: Docker Swarm (defined in `docker-compose.yml`)
- **Reverse Proxy**: Traefik with Let's Encrypt TLS
- **Services**: web (Next.js), postgres, redis
- **Health checks**: `/api/health` endpoint

Deploy commands:
```bash
npm run docker:push    # Build + push image
npm run deploy         # Deploy stack to VPS
npm run vps:migrate    # Run pending migrations on VPS
```

## Important Notes

- **Safety Mode**: Apps Script has `TEST_MODE` - emails redirect to test address
- **Prisma**: Regenerate client after schema changes (`pnpm -C app db:generate`)
- **Environment**: Web app uses `.env` in `app/` directory
- **Apps Script Auth**: Uses `mobilizare@apme.ro` account
- **Docker**: PostgreSQL runs in a container named `apme-postgres` — start it before running the web app
