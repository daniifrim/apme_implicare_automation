# Frontend Implementation Plan - APME Implicare

**Scope**: Frontend/UI layer only.

**Consolidation Note**: This plan originally targeted a standalone frontend in `packages/web/`. The codebase is now consolidated into a single Next.js app in `app/` (UI + API routes). Legacy frontend prototypes were removed from the repository.

**Design Reference**: SuperDesign draft `d4ec5b5e-29e3-4b4c-8a34-8201ee4b367c` (Power-User Dense Submissions Dashboard)
- Preview: https://p.superdesign.dev/draft/d4ec5b5e-29e3-4b4c-8a34-8201ee4b367c
- Full HTML spec saved to: `.superdesign/reference/d4ec5b5e-29e3-4b4c-8a34-8201ee4b367c.html`

---

## 1. Foundation (Phase 1)

### 1.1 Project Structure

```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/          # Dashboard routes with shell
│   │   │   ├── layout.tsx      # AppShell with sidebar + header
│   │   │   ├── page.tsx        # Dashboard overview
│   │   │   ├── submissions/
│   │   │   ├── templates/
│   │   │   ├── mappings/
│   │   │   ├── webhooks/
│   │   │   ├── audit/
│   │   │   └── styleguide/     # UI Lab page for testing components
│   │   ├── api/                # Next.js API routes (thin layer)
│   │   └── login/page.tsx
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── card.tsx
│   │   │   └── dropdown-menu.tsx
│   │   │
│   │   ├── layout/             # App shell components
│   │   │   ├── app-shell.tsx   # Main layout wrapper
│   │   │   ├── sidebar.tsx     # Left navigation
│   │   │   ├── sidebar-nav.tsx # Navigation items
│   │   │   └── header.tsx      # Top bar
│   │   │
│   │   └── features/           # Domain-specific components
│   │       ├── submissions/
│   │       │   ├── submission-table.tsx      # Dense data table
│   │       │   ├── submission-filters.tsx    # Toolbar filters
│   │       │   ├── submission-status-chip.tsx
│   │       │   └── submission-detail-drawer.tsx
│   │       │
│   │       ├── templates/
│   │       │   ├── template-editor.tsx       # 3-pane workspace
│   │       │   ├── version-list.tsx
│   │       │   ├── placeholder-inspector.tsx
│   │       │   └── preview-pane.tsx
│   │       │
│   │       ├── mappings/
│   │       │   └── field-mapping-table.tsx
│   │       │
│   │       └── audit/
│   │           └── audit-log-entry.tsx
│   │
│   ├── lib/
│   │   ├── utils.ts            # cn() helper
│   │   ├── api-client.ts       # Typed API client
│   │   └── design-tokens.ts    # CSS variable constants
│   │
│   ├── styles/
│   │   ├── globals.css         # Tailwind + design tokens
│   │   └── design-system.css   # Token definitions
│   │
│   └── types/
│       ├── submission.ts
│       ├── template.ts
│       └── api.ts
│
├── public/
├── tailwind.config.ts
├── next.config.js
└── package.json
```

### 1.2 Design Tokens → CSS Variables

Implement exact tokens from design system:

```css
/* styles/design-system.css */
:root {
  --background: oklch(1.0000 0 0);
  --foreground: oklch(0.1884 0.0128 248.5103);
  --card: oklch(0.9784 0.0011 197.1387);
  --card-foreground: oklch(0.1884 0.0128 248.5103);
  --primary: oklch(0.6723 0.1606 244.9955);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.1884 0.0128 248.5103);
  --secondary-foreground: oklch(1.0000 0 0);
  --muted: oklch(0.9222 0.0013 286.3737);
  --muted-foreground: oklch(0.45 0.01 248);
  --accent: oklch(0.9392 0.0166 250.8453);
  --accent-foreground: oklch(0.6723 0.1606 244.9955);
  --destructive: oklch(0.6188 0.2376 25.7658);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.9317 0.0118 231.6594);
  --input: oklch(0.9809 0.0025 228.7836);
  --ring: oklch(0.6818 0.1584 243.3540);
  
  /* Typography */
  --font-sans: 'Open Sans', system-ui, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: 'JetBrains Mono', Menlo, monospace;
  
  /* Shape */
  --radius: 1.3rem;
  --radius-sm: calc(var(--radius) - 0.5rem);
  --radius-md: calc(var(--radius) - 0.25rem);
  --radius-lg: var(--radius);
}

.dark {
  --background: oklch(0 0 0);
  --foreground: oklch(0.9328 0.0025 228.7857);
  --card: oklch(0.2097 0.0080 274.5332);
  --card-foreground: oklch(0.8853 0 0);
  --primary: oklch(0.6692 0.1607 245.0110);
  --secondary: oklch(0.9622 0.0035 219.5331);
  --secondary-foreground: oklch(0.1884 0.0128 248.5103);
  --muted: oklch(0.2090 0 0);
  --muted-foreground: oklch(0.5637 0.0078 247.9662);
  --accent: oklch(0.1928 0.0331 242.5459);
  --accent-foreground: oklch(0.6692 0.1607 245.0110);
  --border: oklch(0.2674 0.0047 248.0045);
  --input: oklch(0.3020 0.0288 244.8244);
}
```

Tailwind config maps these to utilities:

```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        // ... etc
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        'custom': 'var(--radius)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
      },
    },
  },
}
```

### 1.3 shadcn/ui Component Library

Initialize and customize:

```bash
cd app
npx shadcn@latest init --yes --template next --base-color slate

# Add required components
npx shadcn add button input select tabs badge table card dialog dropdown-menu scroll-area separator skeleton
```

**Customization approach**: Each component gets a `data-apme` variant that uses our tokens. Keep base shadcn components untouched for updates.

---

## 2. Component Implementation (Phase 2)

### 2.1 Layout System

**AppShell** (`components/layout/app-shell.tsx`):
- Left sidebar (fixed, 16rem width)
- Top header (sticky, 4rem height)  
- Scrollable content area
- Mobile: collapsible drawer for sidebar

**Sidebar** (`components/layout/sidebar.tsx`):
- Logo section with APME branding
- Navigation groups: Main, System
- Active state with accent background
- User avatar + email at bottom

**Header** (`components/layout/header.tsx`):
- Breadcrumb/title
- Global search input
- Notifications bell
- Theme toggle (light/dark)

### 2.2 Core UI Components

From design HTML, extract these patterns:

**Buttons** (variants):
- `default`: bg-primary, rounded-custom, font-semibold
- `secondary`: border, bg-white
- `ghost`: text-only, hover:bg-gray-50
- `destructive`: bg-destructive

**Badges/Chips**:
- Status badges with colored dots (green=success, amber=pending, red=error)
- Template chips: bg-primary/5, border-primary/20, uppercase text-[9px]
- Version tags: bg-gray-100

**Inputs**:
- Rounded-custom borders
- Focus ring using --ring
- Monospace font for code/placeholder fields

**Table** (dense, power-user style):
- Compact padding (px-4 py-2)
- Sticky header with bg-gray-50
- Border-r separators between columns
- Hover state: bg-accent/40
- Monospace IDs, tabular-nums for timestamps

**Tabs**:
- Underline style for main nav
- Pill style for filter toggles

### 2.3 Feature Components

**SubmissionTable** (`features/submissions/submission-table.tsx`):
```tsx
// Props interface matching expected API
interface SubmissionTableProps {
  submissions: Submission[];
  isLoading: boolean;
  onRowClick: (id: string) => void;
}

// Columns per design:
// - ID (mono, primary color, bold)
// - Status (green/amber/red with dot)
// - Origin (italic, gray-600)
// - Assigned Flow (flex wrap of chips)
// - Latency (mono, gray-400)
// - Last Seen (tabular-nums, right-aligned)
```

**SubmissionFilters** (`features/submissions/submission-filters.tsx`):
```tsx
// Compact toolbar with:
// - Time window selector (Last 60min/24h/7d)
// - Status pill buttons (ALL/ERRORS/PENDING)
// - Search input for ID/Source
```

**TemplateEditor** (`features/templates/template-editor.tsx`):
```tsx
// 3-column layout:
// - Left: Version history list (clickable, current highlighted)
// - Center: Subject, Preheader inputs + Editor canvas
// - Right: Live preview + Token inspector

// Editor features:
// - Toolbar: Bold, Italic, Link, Insert Token
// - Token highlighting: bg-primary/5, font-mono
// - Preview shows missing values in red
```

---

## 3. Pages (Phase 3)

### 3.1 /styleguide (UI Lab)

Central testing page for all components. Sections:
1. **Design Tokens**: Color swatches, typography scale, radius demo
2. **Component Gallery**: Buttons, inputs, badges, tabs
3. **Submissions Console**: Full table with mock data
4. **Template Editor**: 3-pane workspace demo
5. **Webhook Events**: Event list demo
6. **Audit Log**: Activity feed demo

This becomes the reference implementation for all UI patterns.

### 3.2 /submissions (Dashboard)

Default route after login. Features:
- Filters toolbar
- Dense data table
- Click row → detail drawer/sheet
- Real-time indicator (green dot + "Live Stream Active")

### 3.3 /templates/[id]

Template editing workspace:
- Version list sidebar
- Editor pane
- Live preview
- Publish action

### 3.4 /mappings

Field mapping management:
- Table of canonical keys → Fillout question IDs
- Unmapped questions section
- Validation warnings

### 3.5 /webhooks

Webhook event monitor:
- List of recent events
- Status chips (accepted/rejected)
- Timing metrics
- Replay action (admin only)

### 3.6 /audit

Audit log viewer:
- Actor avatars
- Timestamp
- Change summary
- "View Diff" links

---

## 4. API Contract (Frontend Expectations)

The frontend expects these endpoints from the backend instance:

```typescript
// Expected API shape (to coordinate with backend)

// Submissions
GET /api/submissions?page=&limit=&status=&dateFrom=&dateTo=&search=
Response: { submissions: Submission[], total: number, page: number }

GET /api/submissions/:id
Response: SubmissionDetail

// Templates
GET /api/templates
GET /api/templates/:id
POST /api/templates
POST /api/templates/:id/versions
POST /api/templates/:id/publish/:versionId

// Preview
POST /api/templates/:id/preview
Body: { submissionId?, overrides? }
Response: { html: string, missingPlaceholders: string[] }

// Mappings
GET /api/mappings
PUT /api/mappings/:canonicalKey

// Webhooks
GET /api/webhook-events
POST /api/admin/webhook-events/:id/replay

// Audit
GET /api/audit-log
```

---

## 5. Implementation Order

**Week 1: Foundation**
- [ ] Project scaffold (Next.js + Tailwind + shadcn)
- [ ] Design tokens → CSS variables
- [ ] Base shadcn components customized
- [ ] App shell layout (sidebar + header)

**Week 2: Component Library**
- [ ] Button, Input, Badge variants
- [ ] Table component (dense style)
- [ ] Tabs, Dialog, Dropdown
- [ ] /styleguide page with all components

**Week 3: Feature Components**
- [ ] Submission table + filters
- [ ] Template editor (3-pane layout)
- [ ] Webhook events list
- [ ] Audit log entries

**Week 4: Pages + Polish**
- [ ] /submissions page
- [ ] /templates page
- [ ] /mappings page
- [ ] /webhooks page
- [ ] /audit page
- [ ] Responsive + dark mode
- [ ] Loading states + error handling

---

## 6. Coordination Notes

**No conflicts expected** because:
1. Frontend + backend live in a single app (`app/`)
2. Communication via typed API contracts (section 4)

**Handoff points**:
- Frontend needs CORS enabled on API
- Frontend needs auth session middleware
- API types should be shared (ideally in `packages/types/`)

**Development workflow**:
- Use mock data in `/styleguide` for isolated development
- API integration happens after backend endpoints exist
- Feature flags for unfinished features

---

## 7. Quality Gates

Before marking complete:
- [ ] All components render in /styleguide
- [ ] Design matches SuperDesign reference (visual QA)
- [ ] Dark mode works everywhere
- [ ] Mobile responsive (sidebar becomes drawer)
- [ ] Loading skeletons for async data
- [ ] Error boundaries for crashes
- [ ] Keyboard navigation works
- [ ] No console errors
