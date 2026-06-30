# Component And Styling Rules

Use these rules whenever you create or modify a React component, its styling, or
its file layout. This app styles with **TailwindCSS v4 utility classes** and a
shared primitive library in `src/components/ui.tsx`. It does **not** use Fluent
UI or CSS Modules. Do not introduce either.

## Goal

- Keep each component independently readable, movable, and testable.
- Compose from the shared `ui.tsx` primitives before hand-rolling controls.
- Keep styling as Tailwind utilities merged through the `cn()` helper.

## One Component Per File

- A `.tsx` file exports exactly one React component as its primary, file-named
  export, e.g. `AppLayout.tsx` exports `AppLayout`.
- Do not co-define a second top-level component in the same file just because
  they are used together. Each gets its own file.
- Tiny presentational helpers strictly private to the component (a one-screen
  sub-row, a local `Icon`) may stay in the same file when all hold:
  - it is not exported
  - it holds no state, effects, or async logic
  - extracting it would not improve readability
  When in doubt, give it its own file.
- **Deliberate exception:** `src/components/ui.tsx` is the shared design-system
  module and intentionally exports several primitives. Do not split it per
  primitive, and do not add a second such multi-export module.

## Filename And Export Conventions

- Component files: `PascalCase.tsx` matching the exported component name.
- Pages: `<Name>Page.tsx` in `src/pages/`.
- Use `.tsx` only when the file renders JSX; plain logic stays in `.ts`.
- Prefer named exports for components. `src/App.tsx` keeps a `default` export
  because `main.tsx` imports it as default — match existing entry conventions.
- Co-define the component's prop type in the same file as inline props or
  `type <ComponentName>Props = { ... }`. Move it to `src/domain/types.ts` only
  when it is a shared domain concept.

## Component File Layout

Keep this order inside a component file:

1. imports (React, `react-router-dom`, `@/` modules, then assets)
2. local types / constants
3. the component function
4. small private sub-components or helpers that satisfy the one-file exception

Do not let a component file own:

- async orchestration -> page or `src/hooks/`
- data access / mutations -> `src/services/*`
- business invariants -> `src/domain/*`

## Styling With Tailwind

- Apply Tailwind utility classes directly in `className`.
- Merge conditional/variant classes with `cn()` from `src/lib/format.ts`
  (do not hand-concatenate class strings).
- Express variants as a record keyed by a prop, like the `BUTTON_VARIANTS` and
  `BADGE_TONES` maps in `ui.tsx`, rather than sprawling ternaries.
- Reserve inline `style={{ ... }}` for genuinely dynamic runtime values (e.g. a
  computed `width` percentage in `ProgressBar`, portal coordinates in
  `Tooltip`). Do not use inline style for static styling that is a utility class.
- Keep global CSS minimal: `src/main.css` holds the Tailwind entry and a small
  set of base/root styles only. Do not add feature-specific selectors there.

## Compose From `ui.tsx` First

Before adding a new low-level control, reach for an existing primitive:

- forms: `Field`, `Input`, `Textarea`, `Select`
- actions: `Button` (variants `primary`/`secondary`/`ghost`/`danger`)
- overlays: `Modal`, `ConfirmDialog`
- status/among data: `Badge`, `QualityBadge`, `ProgressBar`, `Spinner`,
  `EmptyState`, `Card`, `StatCard`, `PageHeader`
- supplemental detail: `Tooltip`

Add a new primitive to `ui.tsx` only once it is genuinely feature-agnostic and
reused. Keep feature-specific composition in the page or a `src/components/*`
component.

## Accessibility And Quiet UI

- Keep primary labels, required-field markers, validation messages, and critical
  status visible without depending on hover. Use `Tooltip` only for supplemental
  detail.
- Keep on-screen copy terse and layouts low-noise.
- Preserve keyboard and focus behavior in interactive primitives (the existing
  `Modal` handles `Escape`; `Tooltip` shows on focus as well as hover) when you
  extend them.

## Forbidden Patterns

- Two exported components in one `.tsx` file (except the `ui.tsx` library).
- Component filename and exported component name disagreeing.
- Introducing Fluent UI, CSS Modules, `styled-components`, or a second
  general-purpose component/design library.
- Inline `style={{ ... }}` for static styling that belongs in a utility class.
- Hidden helper components growing their own state, effects, or async logic
  while living inside another component's file.
- Data fetching or `client.data.*` calls inside a component.

## Verification

Use these checks alongside [`verification-gates.md`](verification-gates.md):

```bash
# One component per file (ui.tsx is the intentional multi-export exception).
rg -n "^export (default |const |function )" src/components src/pages

# No Fluent UI or CSS Modules creeping in.
rg -n "@fluentui|\.module\.css" src

# No data-client calls inside components/pages.
rg -n "client\.data\.|getRayfinClient\(" src/components src/pages

# Inline style usage — confirm each is a genuinely dynamic runtime value.
rg -n "style=\{\{" src/components src/pages
```

Treat results as signals: investigate each match and either fix it or document
why it is a deliberate exception.
