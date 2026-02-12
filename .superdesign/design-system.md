# APME Implicare Web App - Design System (Draft)

This document defines the visual system for the APME Implicare admin web app (dashboard + template editor + ingestion + mappings + audit).

Principles:
- Calm, operational control-plane UI (clarity first, low visual noise).
- High readability for long sessions (templates, logs, tables).
- Accessible focus states and clear status semantics.
- Email-template editor/preview is the hero: layouts must support side-by-side work.

## Product context

Primary surfaces (MVP):
- Submissions dashboard (filters + dense table + status chips)
- Submission details (answers + assignments + webhook raw payload)
- Templates list (published version, last edited, usage counts)
- Template editor (WYSIWYG + placeholder list + versioning + preview)
- Canonical field mappings (unknown questions -> canonical keys)
- Webhook events/errors (idempotency, timing, payload inspect)
- Audit log (actor, before/after, reason)

## Typography

Font families (intentional but practical):
- Sans (UI): Open Sans
- Serif (long-form / occasional emphasis): Georgia
- Mono (code, payload JSON, IDs): Menlo

Type usage:
- Use sans for navigation, tables, forms, buttons.
- Use mono for:
  - webhook IDs, submission IDs
  - placeholder tokens like {{FirstName}}
  - JSON payload previews

## Color system (OKLCH tokens)

We follow a semantic token system inspired by shadcn-style variables.

Canonical tokens (Light):
```css
:root {
  --background: oklch(1.0000 0 0);
  --foreground: oklch(0.1884 0.0128 248.5103);

  --card: oklch(0.9784 0.0011 197.1387);
  --card-foreground: oklch(0.1884 0.0128 248.5103);

  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.1884 0.0128 248.5103);

  --primary: oklch(0.6723 0.1606 244.9955);
  --primary-foreground: oklch(1.0000 0 0);

  --secondary: oklch(0.1884 0.0128 248.5103);
  --secondary-foreground: oklch(1.0000 0 0);

  --muted: oklch(0.9222 0.0013 286.3737);
  --muted-foreground: oklch(0.1884 0.0128 248.5103);

  --accent: oklch(0.9392 0.0166 250.8453);
  --accent-foreground: oklch(0.6723 0.1606 244.9955);

  --destructive: oklch(0.6188 0.2376 25.7658);
  --destructive-foreground: oklch(1.0000 0 0);

  --border: oklch(0.9317 0.0118 231.6594);
  --input: oklch(0.9809 0.0025 228.7836);
  --ring: oklch(0.6818 0.1584 243.3540);

  --sidebar: oklch(0.9784 0.0011 197.1387);
  --sidebar-foreground: oklch(0.1884 0.0128 248.5103);
  --sidebar-primary: oklch(0.6723 0.1606 244.9955);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9392 0.0166 250.8453);
  --sidebar-accent-foreground: oklch(0.6723 0.1606 244.9955);
  --sidebar-border: oklch(0.9271 0.0101 238.5177);
  --sidebar-ring: oklch(0.6818 0.1584 243.3540);

  --font-sans: Open Sans, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Menlo, monospace;

  --radius: 1.3rem;
  --spacing: 0.25rem;

  /* Shadow tokens exist, but default look is border-forward (very low elevation). */
  --shadow-opacity: 0;
}

.dark {
  --background: oklch(0 0 0);
  --foreground: oklch(0.9328 0.0025 228.7857);

  --card: oklch(0.2097 0.0080 274.5332);
  --card-foreground: oklch(0.8853 0 0);

  --popover: oklch(0 0 0);
  --popover-foreground: oklch(0.9328 0.0025 228.7857);

  --primary: oklch(0.6692 0.1607 245.0110);
  --primary-foreground: oklch(1.0000 0 0);

  --secondary: oklch(0.9622 0.0035 219.5331);
  --secondary-foreground: oklch(0.1884 0.0128 248.5103);

  --muted: oklch(0.2090 0 0);
  --muted-foreground: oklch(0.5637 0.0078 247.9662);

  --accent: oklch(0.1928 0.0331 242.5459);
  --accent-foreground: oklch(0.6692 0.1607 245.0110);

  --destructive: oklch(0.6188 0.2376 25.7658);
  --destructive-foreground: oklch(1.0000 0 0);

  --border: oklch(0.2674 0.0047 248.0045);
  --input: oklch(0.3020 0.0288 244.8244);
  --ring: oklch(0.6818 0.1584 243.3540);

  --sidebar: oklch(0.2097 0.0080 274.5332);
  --sidebar-foreground: oklch(0.8853 0 0);
  --sidebar-primary: oklch(0.6818 0.1584 243.3540);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.1928 0.0331 242.5459);
  --sidebar-accent-foreground: oklch(0.6692 0.1607 245.0110);
  --sidebar-border: oklch(0.3795 0.0220 240.5943);
  --sidebar-ring: oklch(0.6818 0.1584 243.3540);

  --font-sans: Open Sans, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Menlo, monospace;

  --shadow-opacity: 0;
}
```

Status semantics (component-level, not global tokens):
- Success: green (use chart-2 as a base if needed)
- Warning: amber/yellow (use chart-3)
- Info: primary blue
- Error: destructive red

## Shape, borders, shadows

- Corner radius: large, friendly by default (`--radius: 1.3rem`).
- Surfaces rely on borders and subtle elevation rather than heavy shadows.
- Use 1px borders for cards, tables, and inputs.
- Focus: visible ring using `--ring` (2px) + slight offset.

## Spacing & density

- Base spacing unit: 4px (`--spacing: 0.25rem`).
- Default layout density: medium-dense (admin power user), with an alternate compact mode later.

## Layout conventions

- App shell: left sidebar + top header + scrollable content.
- Submissions table: sticky header, horizontal scroll allowed, status/assignment chips.
- Editor shell: three-column at desktop:
  - left: template list + versions
  - center: editor
  - right: live preview + placeholder inspector
- Mobile: collapse sidebar into drawer; editor becomes stacked tabs (Edit / Preview / Placeholders).

## Components (minimum set)

- Buttons: primary / secondary / ghost / destructive; support loading state.
- Inputs: text, textarea, select, combobox (async later), date range.
- Badges/chips: status + template tags.
- Table: sortable headers, row hover, inline actions.
- Cards: summary metrics, empty states.
- Tabs: used heavily in details + editor.
- Dialogs: publish confirmation, backfill action, mapping assignment.
- Toasts: webhook accepted/rejected, template published.

## Motion

- Prefer subtle UI motion (150-220ms): drawer slide, dialog fade+scale, table row highlight.
- Avoid excessive parallax or marketing-style animations.

## Content guidelines

- Use short, operational labels.
- Prefer explicit statuses over icons-only.
- Surface reason codes and validation warnings in a readable, scannable way.
