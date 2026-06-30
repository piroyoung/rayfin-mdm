# Layout And Module Placement

This app uses a `src/` layout with the path alias `@/*` -> `src/*`. Read this
file before deciding where any new code lives.

## Canonical Layout

```text
src/
  main.tsx              entry point + Rayfin client/auth bootstrap render
  App.tsx               route table (react-router-dom) + auth gate
  main.css              Tailwind entry + global base styles
  components/           presentational components
    ui.tsx              shared design-system primitives (Button, Field, ...)
    AppLayout.tsx       app shell (sidebar/header, <Outlet/>)
    <Name>.tsx          feature-specific presentational components
  pages/                one component per route screen
    <Name>Page.tsx
  hooks/                view-state and cross-cutting React hooks
    AuthContext.tsx
    useAsyncData.ts
    useToast.tsx
    use-<feature>.ts    extracted per-screen view-state hook (when needed)
  services/             Rayfin-client data access + side effects
    rayfinClient.ts     typed client singleton
    bootstrap.ts        reads env, builds client + auth service
    session.ts          current-actor wiring
    <feature>.ts        CRUD + lifecycle for a domain (products, customers, ...)
    audit.ts            audit-log side effect
  domain/               types + pure business functions (no React, no client)
    types.ts            enum/union types + display metadata (from rayfin/data/*)
    quality.ts          scoring rules
    duplicates.ts       dedup rules
  lib/                  framework-agnostic utilities
    format.ts           cn(), fmtMoney, fmtRelative, initials, ...
  __tests__/            Vitest + Testing Library specs
rayfin/data/*           Rayfin entity classes — source of truth for persisted
                        shapes (owned by the rayfin skill, NOT app code)
```

Use these directories by responsibility, not by team preference or historical
drift.

## Mandatory Placement Preflight

Before implementing, list every file you expect to create, move, or extract and
assign its exact target path.

Rules:

1. every file must have one canonical owner before code is written
2. if a file has no clear owner, revise the placement plan first
3. do not create a new directory just because the first idea does not fit

Treat convenience directories such as `src/features/`, `src/modules/`,
`src/utils/`, `src/api/`, `src/store/`, or `src/state/` as layout drift unless an
explicit migration plan says otherwise. This app deliberately keeps a small,
flat set of folders.

## Page And Route Placement

- Each route screen is one component in `src/pages/` named `<Name>Page.tsx`.
- Register it as a `<Route>` in `src/App.tsx`. Authenticated screens render
  inside the `AppLayout` route; the auth screen and the catch-all redirect are
  siblings. See [`routing-and-page-guidelines.md`](routing-and-page-guidelines.md).
- A page owns top-level composition and screen state; it delegates data access
  to `src/services/*` and reuse-worthy state to a `src/hooks/use-<feature>.ts`.

## Component Placement

- Feature-specific presentational components live as their own files in
  `src/components/` (e.g. `AppLayout.tsx`, `AuthPage.tsx`, `ErrorBoundary.tsx`).
- Reusable, feature-agnostic primitives live in `src/components/ui.tsx` — the
  one deliberately multi-export module (`Button`, `Field`, `Modal`, `Badge`,
  `Card`, `Tooltip`, `Spinner`, `EmptyState`, etc.).
- One component per `.tsx` file otherwise, with the file name matching the
  exported component name. See
  [`component-and-styling-rules.md`](component-and-styling-rules.md).

## View-State Hook Placement

For a non-trivial screen, keep state in the page or extract a hook into
`src/hooks/`.

- Start with `useState` + `useAsyncData` inside the page.
- Extract `src/hooks/use-<feature>.ts` when the screen has several related state
  fields, multiple mutating handlers, optimistic updates, or needs to be reused
  or tested independently.
- Do not create horizontal buckets such as `src/state/`, `src/reducers/`,
  `src/stores/`, or `src/handlers/`.

## Data Access Placement

- Every read/write to persisted data goes through a `src/services/*` module that
  wraps the Rayfin client. Group by domain noun (`products.ts`, `customers.ts`,
  `reference.ts`, `stewardship.ts`) plus cross-cutting services (`audit.ts`,
  `session.ts`, `seed.ts`).
- The Rayfin client itself is created once in `src/services/rayfinClient.ts`.
- See [`data-and-domain-layer-responsibilities.md`](data-and-domain-layer-responsibilities.md)
  and the `rayfin` skill.

## No Generic Common Bucket

Do not add a catch-all common directory. Prefer this order:

1. Keep code with the page, hook, service, or domain module that owns it.
2. Put a genuinely framework-agnostic helper in `src/lib/` (formatting, `cn`).
3. Extract further only after the abstraction is clearly stable.

Avoid vague file names such as `helpers.ts`, `misc.ts`, `temp.ts`, or `new.ts`.

## Circular Dependency Rule

Treat import cycles as architecture violations. Common bad cycles:

- `page -> hook -> page`
- `service -> domain -> service`
- `components/ui.tsx -> page`

When a cycle appears: move shared pure logic to a lower leaf module (`src/lib`
or `src/domain`), invert the dependency through a parameter, or merge modules
that were split artificially.

## Typical Flow

For a form submission on a page:

1. `src/App.tsx` registers the route; `src/pages/<X>Page.tsx` renders the screen.
2. The page (or a `src/hooks/use-<x>.ts` hook) owns draft state and handlers.
3. A presentational component (or `ui.tsx` primitives) renders fields and calls
   passed handlers.
4. A `src/services/<x>.ts` function performs the Rayfin mutation and audit log.
5. `src/domain/*` enforces any business invariant (e.g. quality score) the
   service applies.

Each step should depend only on the next layer inward (page -> hook -> service
-> domain), never outward.
