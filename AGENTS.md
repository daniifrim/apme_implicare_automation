# AGENTS.md

Guidelines for AI coding agents working on the APME Implicare Automation project.

## Project Structure

This is a monorepo with two distinct parts:

- **`app/`** - Next.js 16 web application (dashboard + API + Prisma)
- **`main-project/`** - Google Apps Script library (core automation logic)
- **`wrapper-project/`** - Google Apps Script bound to spreadsheet
- **`docs/`** - Documentation, PRDs, data exports

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
```

Or using root package.json shortcuts:
```bash
npm run app:dev
npm run app:build
npm run app:test
npm run app:lint
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

## Important Notes

- **Safety Mode**: Apps Script has `TEST_MODE` - emails redirect to test address
- **Prisma**: Regenerate client after schema changes (`pnpm -C app db:generate`)
- **Environment**: Web app uses `.env` in `app/` directory
- **Apps Script Auth**: Uses `mobilizare@apme.ro` account
