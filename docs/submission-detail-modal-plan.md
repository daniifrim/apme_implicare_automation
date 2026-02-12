ABOUTME: Captures the implementation plan for the submissions detail modal redesign
ABOUTME: Documents Superdesign inspiration mapping and codebase integration steps
# Submission Detail Modal Plan (Superdesign-Inspired)

## Design Reference
- Superdesign project: `72c1d0b0-40bd-47a8-bff6-e70235ccdbdf`
- Draft: `af699054-ca34-4570-8c04-591646ae1b99` (Template Detail Card with Preview)

**Status**: Draft HTML not fetched in this environment. `superdesign get-design` failed with `ENOTFOUND api.superdesign.dev`.

## Intended Visual Pattern
Use the “detail card + preview” layout to structure submissions:
- Left column: primary details + answers (dense, scannable)
- Right column: metadata and assignments summary (card stack)
- Clear header with name + submission ID + status chip

## Implementation Steps
1. Fetch draft HTML when Superdesign API is reachable:
   - `superdesign get-design --draft-id af699054-ca34-4570-8c04-591646ae1b99 --output .superdesign/reference/af699054-ca34-4570-8c04-591646ae1b99.html`
2. Review layout primitives and extract:
   - Card paddings, border radius, and header spacing
   - Two-column grid behavior and breakpoint rules
   - Preview panel styling for right column
3. Update modal layout in `app/src/app/dashboard/submissions/page.tsx`:
   - Apply spacing/radius tokens consistent with template detail card
   - Refine header and section dividers
4. Align typography and status badges to match the template card:
   - Heading size
   - Badge radius
   - Label styles (uppercase, tracking)
5. Validate responsive behavior:
   - `lg` breakpoint for two columns
   - Single column on mobile

## Implementation Notes
- Keep modal read-only for now.
- Use existing `Dialog`, `ScrollArea`, and tailwind tokens.
- Preserve current data fetch approach (`/api/submissions/:id`).
