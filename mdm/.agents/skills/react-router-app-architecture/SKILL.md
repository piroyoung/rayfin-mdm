---
name: react-router-app-architecture
description: "Own React Router app-code architecture, page/route boundaries, UI structure, and verification for this Vite + Rayfin SPA. Use when the request mentions react-router-dom routes or pages, component boundaries, view-state hooks, domain models, data access through Rayfin services, Tailwind UI, responsive UI, charts, UI verification, or app-structure refactoring under `src/`. Defer to the `rayfin` skill for data access, entities, auth, schema, and deployment. Do not use this skill for Rayfin entity/schema design, Fabric platform setup, or release delivery."
metadata:
  author: microsoft
  version: 0.1.0
  adapted-from: anaregdesign/lantern .github/skills/react-router-app-architecture
---

# React Router App Architecture

## Overview

Use this skill as the default architecture workflow for the React Router SPA in
this repository (`mdm/`, React 19 + Vite + `react-router-dom`). Use it from
bootstrap through ongoing implementation. Keep route/page modules declarative,
view files thin, data access behind `src/services/`, and dependency direction
explicit before writing code.

This skill owns **app-code** structure, dependency direction, UI guardrails, and
verification under `src/`. It does **not** own data persistence, entities, auth,
schema migrations, or deployment — those belong to the `rayfin` skill and the
Rayfin platform.

This skill is adapted from a generic React Router architecture skill that
assumed framework mode (loaders/actions, FlatRoute), Fluent UI, CSS Modules, an
`app/` layout, and a swappable ORM behind repository ports. **This app does none
of those.** The rules below are rewritten to match this app's real conventions.

## Precedence (read first)

When this skill conflicts with the **`rayfin` skill** or this app's established
conventions, **rayfin and the existing app conventions win.** Concretely:

- **Data access** is always the Rayfin client (`client.data.<Entity>`) wrapped
  in `src/services/*`. Never hand-roll `fetch`/GraphQL, ORM clients, repository
  ports, or a `server/` layer. See the `rayfin` skill for query/mutation rules.
- **Entities & schema** live in `rayfin/data/*` and are the source of truth for
  persisted shapes. `src/domain/types.ts` re-exports their instance types; the
  React layer never imports `rayfin/data/*` except for those type re-exports.
- **Auth** uses the Rayfin auth services (`src/services/*AuthService.ts` +
  `src/hooks/AuthContext.tsx`). Follow the `rayfin` skill for auth behavior.
- **Deployment, schema apply, and config bootstrap** are owned by Rayfin
  (`rayfin up`, `rayfin env`). Defer to the `rayfin` skill.
- **UI design system** is TailwindCSS v4 + the primitives in
  `src/components/ui.tsx`. Do **not** introduce Fluent UI, CSS Modules, or a
  second component library.

Everything else in this skill — layer placement, thin views, view-state hooks,
domain modeling, boundary validation, verification, refactoring — applies.

## Quick Start

1. Always read
   [`references/layout-and-module-placement.md`](references/layout-and-module-placement.md)
   before deciding where code should live.
2. Run a placement preflight before implementing:
   - list every new file, moved file, and extracted file
   - assign the exact canonical target path for each file before writing code
   - if a file does not fit the canonical `src/` layout, stop and revise the
     placement plan before inventing a new directory
3. Classify the requested change:
   - route/page composition
   - presentational UI
   - client interaction / view state
   - data access or side effect (Rayfin service)
   - domain rule
   - cross-cutting utility
4. Place code in the canonical layout:
   - `src/App.tsx` (route table) and `src/pages/` (one page per route)
   - `src/components/` (presentational components)
   - `src/components/ui.tsx` (shared design-system primitives)
   - `src/hooks/` (view-state and cross-cutting React hooks)
   - `src/services/` (Rayfin-client data access + side effects)
   - `src/domain/` (types + pure business functions)
   - `src/lib/` (framework-agnostic utilities)
5. Read the narrowest additional reference file after the layout reference:
   - architecture overview index:
     [`references/layout-and-dependency-rules.md`](references/layout-and-dependency-rules.md)
   - page/component/hook/lib responsibilities:
     [`references/client-layer-responsibilities.md`](references/client-layer-responsibilities.md)
   - data (services) and domain responsibilities:
     [`references/data-and-domain-layer-responsibilities.md`](references/data-and-domain-layer-responsibilities.md)
   - boundary, contract, and validation rules:
     [`references/boundary-and-contract-rules.md`](references/boundary-and-contract-rules.md)
   - domain modeling and type rules:
     [`references/domain-modeling-and-type-rules.md`](references/domain-modeling-and-type-rules.md)
   - dependency wiring, lifetime, and side-effect rules:
     [`references/dependency-injection-lifetime-and-side-effects.md`](references/dependency-injection-lifetime-and-side-effects.md)
   - routing and page-module rules:
     [`references/routing-and-page-guidelines.md`](references/routing-and-page-guidelines.md)
   - view-state and handler composition:
     [`references/view-state-and-handler-patterns.md`](references/view-state-and-handler-patterns.md)
   - component file, Tailwind, and `ui.tsx` rules:
     [`references/component-and-styling-rules.md`](references/component-and-styling-rules.md)
   - chart and data visualization guidance:
     [`references/chart-and-data-visualization-guidance.md`](references/chart-and-data-visualization-guidance.md)
   - responsive and mobile UI guidance:
     [`references/responsive-and-mobile-ui-guidance.md`](references/responsive-and-mobile-ui-guidance.md)
   - UI verification workflow:
     [`references/ui-verification.md`](references/ui-verification.md)
   - stateful flow compromise rules:
     [`references/stateful-flow-compromises.md`](references/stateful-flow-compromises.md)
   - hotspot refactor workflow:
     [`references/hotspot-refactor-workflow.md`](references/hotspot-refactor-workflow.md)
   - project bootstrap:
     [`references/project-bootstrap.md`](references/project-bootstrap.md)
   - verification before push:
     [`references/verification-gates.md`](references/verification-gates.md)

## Non-Negotiable Rules

- Keep dependency direction inward:
  - `src/pages` and `src/components` depend on hooks, services, domain, and lib
    — never the other way around
  - `src/hooks` (view state) depends on `src/services`, `src/domain`, `src/lib`
  - `src/services` (data access) depends on the Rayfin client and `src/domain`
  - `src/domain` depends only on other domain modules and `rayfin/data/*`
    **types**; it never imports React, the Rayfin client, or browser APIs
  - `src/lib` is leaf-level and depends on nothing app-specific
- Lock file placement before coding. Name the exact target file paths first,
  then implement.
- All persistence and remote calls go through `src/services/*` using the Rayfin
  client. Pages, components, hooks, and domain never call `client.data.*`
  directly and never use raw `fetch`/GraphQL. (See the `rayfin` skill.)
- Keep `src/components/` presentational. Allow only ephemeral UI state there
  (local input focus, disclosure toggles, active tab). No data fetching, no
  mutation orchestration, no business rules.
- Keep reusable, feature-agnostic primitives in `src/components/ui.tsx`. Keep
  feature-specific presentational components as their own files in
  `src/components/`.
- Style with TailwindCSS v4 utility classes composed through the `cn()` helper
  (`src/lib/format.ts`). Compose UI from `src/components/ui.tsx` primitives
  (`Button`, `Field`, `Modal`, `Badge`, `Card`, `Tooltip`, etc.) before adding
  new low-level controls. Do not introduce Fluent UI or CSS Modules.
- Keep UI visually simple: concise labels, low-noise layouts, restrained text
  density, deliberate spacing. Use `Tooltip` for supplemental, non-essential
  detail — never hide required labels, validation messages, or critical status
  only inside a tooltip.
- When rendering charts, choose the simplest chart that matches the task and
  keep it low-noise and accessible. See
  [`references/chart-and-data-visualization-guidance.md`](references/chart-and-data-visualization-guidance.md).
- Build responsive UI so the same feature stays capable on desktop and mobile,
  using Tailwind's responsive utilities and content-driven breakpoints. Keep a
  touch and keyboard path for every primary action; do not rely on hover-only
  interaction.
- One React component per `.tsx` file. The file name (`PascalCase.tsx`) and the
  primary exported component name match exactly. Tiny private presentational
  helpers with no state, no effects, and no exports may stay in the same file;
  everything else gets its own file. (`src/components/ui.tsx` is the deliberate
  exception: it is the shared primitive library and exports several primitives.)
- Keep async state, mutation handlers, and derived view models in `src/hooks/`
  or local to the page. Extract a `use-<feature>.ts` hook into `src/hooks/` when
  a screen's state, handlers, and async flow grow past a simple `useState` +
  `useAsyncData` pair.
- Use `react-router-dom` declarative routing: register routes in `src/App.tsx`
  and put one page component per route under `src/pages/`. Do not add framework-
  mode loaders/actions, FlatRoute file routing, or an `app/routes/` tree.
- Validate at the correct layer: input shape in the page/form, application rules
  in the service or a view-state hook, business invariants in `src/domain`.
- Domain types derive from `rayfin/data/*` via `src/domain/types.ts`. Do not
  redefine persisted shapes by hand.
- Do not create alternate top-level buckets such as `src/features/`,
  `src/modules/`, `src/store/`, `src/utils/`, or `src/api/`. Keep code in the
  canonical owner; if a file does not fit, revise the plan before inventing a
  directory.
- Keep feature internals cohesive and avoid circular dependencies across
  extracted modules.
- Use `class` only when identity, invariants, or lifecycle matter (rare here —
  domain is mostly `type` + pure functions). Keep DTO/view-model shapes as
  `type`. Use `interface` for stable, multi-implementation contracts (e.g.
  `IAuthService`).
- Use `unknown` at trust boundaries; narrow or parse immediately. Do not let
  raw `unknown` drift into hooks, components, or domain.

## Implementation Workflow

### Placement Preflight For Every Change

- Read
  [`references/layout-and-module-placement.md`](references/layout-and-module-placement.md)
  first.
- Write the exact target paths for every created or moved file before touching
  code.
- Confirm each target path matches one canonical owner:
  - route registration: `src/App.tsx`
  - page (route screen): `src/pages/<Name>Page.tsx`
  - presentational component: `src/components/<Name>.tsx`
  - shared primitive: `src/components/ui.tsx`
  - view-state / cross-cutting hook: `src/hooks/`
  - data access + side effects: `src/services/`
  - domain concept or pure rule: `src/domain/`
  - framework-agnostic utility: `src/lib/`
- If any planned file lacks a clear owner, fix the placement plan first.

### 0. Bootstrap is owned by Rayfin

- When starting from scratch, prefer `npm create @microsoft/rayfin@latest`. It
  generates the correct tsconfig (TC39 decorators), `rayfin/` project, auth
  wiring, and Vite setup. See
  [`references/project-bootstrap.md`](references/project-bootstrap.md) and the
  `rayfin` skill.
- Do not retrofit `create-react-router`/framework mode onto this app.

### 1. Model the change around a use case

- Name the user intent first.
- Put invariants and pure business rules in `src/domain/` (e.g. `quality.ts`,
  `duplicates.ts`); keep enum/union types and their display metadata in
  `src/domain/types.ts`, derived from `rayfin/data/*`.
- Put data reads/writes and audit side effects in a `src/services/*` module that
  wraps the Rayfin client.
- Keep literals local until they become stable, named concepts.
- Treat untrusted data as `unknown` first, then narrow at the boundary.

### 2. Keep view logic out of components

- For a non-trivial screen, keep state and handlers in the page component and
  lean on `useAsyncData` for loads; extract a `use-<feature>.ts` hook into
  `src/hooks/` when the flow grows (multiple related state fields, several
  mutating handlers, optimistic updates, or reuse across screens).
- Keep feature-specific presentational components in `src/components/`. Promote
  a primitive into `src/components/ui.tsx` only once it is genuinely
  feature-agnostic and reused.
- Compose views from `ui.tsx` primitives before introducing custom controls.
- Keep on-screen copy terse; move optional elaboration into `Tooltip`.
- That hook/page owns: async calls (via services), state transitions, derived
  screen state, event handlers, and error/pending mapping.

### 3. Use router and existing hooks before inventing state containers

- Use `react-router-dom` (`useNavigate`, `useParams`, `<NavLink>`, `<Outlet>`)
  for navigation and route params.
- Use `useAsyncData` for read-and-reload flows and `useToast` for transient
  feedback rather than re-implementing them.
- Add client state only for interaction state the router/hooks do not own.

### 4. Move data through services explicitly

- Pages and hooks call `src/services/*` functions; services call
  `client.data.<Entity>` and return plain domain-typed objects.
- Services own explicit field projection (the Rayfin/DAB client returns only the
  primary key unless fields are selected), sorting, and audit logging.
- Do not pass the Rayfin client or raw query builders up into the view.

### 5. Assemble dependencies at the edge

- The Rayfin client is a singleton created once in `src/services/rayfinClient.ts`
  during bootstrap (`src/services/bootstrap.ts`) and accessed via
  `getRayfinClient()`. Do not construct clients inside pages, hooks, or domain.
- Auth services are selected at bootstrap and provided through
  `src/hooks/AuthContext.tsx`.

### 6. Validate and map errors by layer

- Keep input-shape validation in the page/form.
- Keep workflow/application rules in the service or view-state hook.
- Keep invariant enforcement in `src/domain`.
- Map service/Rayfin errors to user-facing messages at the hook/page edge
  (`useAsyncData` already maps thrown errors to a message string).

### 7. Keep authorization and serialization explicit

- Resolve authentication at the edge (`AuthContext` + `AuthGuard` in
  `src/App.tsx`); enforce row/field authorization in Rayfin `@role`/`policy`
  (see the `rayfin` skill), not only in the UI.
- Convert `Date`, ids, and enum tokens at boundaries; use the `tonedMeta` /
  `labelledMeta` fallbacks in `src/domain/types.ts` for enum values that may
  fall outside the current union.

### 8. Keep mutable state scoped

- Do not store request/user-specific state in module globals beyond the
  intentional singletons (Rayfin client, current actor in `src/services/session.ts`).
- Treat client-side async race conditions as correctness issues — `useAsyncData`
  already cancels stale loads; preserve that pattern in custom hooks.

### 9. Use explicit compromises for stateful flows

- For wizard/streaming/session-style flows, allow a feature-local controller
  hook in `src/hooks/`. See
  [`references/stateful-flow-compromises.md`](references/stateful-flow-compromises.md).

### 10. Push side effects into explicit modules

- Keep audit logging, seeding, and other side effects in named `src/services/*`
  modules (`audit.ts`, `seed.ts`), not hidden inside components.
- Schema changes and migrations are a Rayfin concern (`rayfin up`) — defer to
  the `rayfin` skill.

### 11. Verify before push

- Run `npm run lint`, the TypeScript build (`tsc -b` via `npm run build`), and
  `npm run test` (Vitest) for the touched area.
- Audit for boundary drift and forbidden imports (see
  [`references/verification-gates.md`](references/verification-gates.md)).
- For UI-affecting changes, verify the rendered result — Testing Library for
  component behavior, and optionally Playwright/manual browser checks at the
  relevant routes and viewports
  ([`references/ui-verification.md`](references/ui-verification.md)).
- Fix architecture violations before pushing even if tests pass.

### 12. Refactor overloaded files in phases

- When a `.ts`/`.tsx` file has too many responsibilities, do not rewrite it in
  one jump. Follow
  [`references/hotspot-refactor-workflow.md`](references/hotspot-refactor-workflow.md).

## Placement Guide

- Need a new route screen: `src/pages/<Name>Page.tsx` + a `<Route>` in
  `src/App.tsx`
- Need feature-local pure rendering and markup: `src/components/<Name>.tsx`
- Need a reusable, feature-agnostic UI primitive: `src/components/ui.tsx`
- Need client-side state, handlers, or orchestration for a screen: keep it in
  the page, or extract `src/hooks/use-<feature>.ts`
- Need data reads/writes or audit side effects: `src/services/<feature>.ts`
- Need a business invariant, scoring, or dedup rule: `src/domain/`
- Need enum/union types or display metadata: `src/domain/types.ts`
- Need a framework-agnostic helper (formatting, `cn`): `src/lib/`
- Need entity/persisted shapes: re-export types from `rayfin/data/*` via
  `src/domain/types.ts` (never redefine by hand)

## References

- layout and module placement, always read first:
  [`references/layout-and-module-placement.md`](references/layout-and-module-placement.md)
- overview index for placement and dependency rules:
  [`references/layout-and-dependency-rules.md`](references/layout-and-dependency-rules.md)
- page/component/hook/lib responsibilities:
  [`references/client-layer-responsibilities.md`](references/client-layer-responsibilities.md)
- data (services) and domain responsibilities:
  [`references/data-and-domain-layer-responsibilities.md`](references/data-and-domain-layer-responsibilities.md)
- boundary and contract rules:
  [`references/boundary-and-contract-rules.md`](references/boundary-and-contract-rules.md)
- domain modeling and type rules:
  [`references/domain-modeling-and-type-rules.md`](references/domain-modeling-and-type-rules.md)
- dependency wiring, lifetime, and side-effect rules:
  [`references/dependency-injection-lifetime-and-side-effects.md`](references/dependency-injection-lifetime-and-side-effects.md)
- routing and page-module guidance:
  [`references/routing-and-page-guidelines.md`](references/routing-and-page-guidelines.md)
- view-state and handler composition:
  [`references/view-state-and-handler-patterns.md`](references/view-state-and-handler-patterns.md)
- component file, Tailwind, and `ui.tsx` rules:
  [`references/component-and-styling-rules.md`](references/component-and-styling-rules.md)
- chart and data visualization guidance:
  [`references/chart-and-data-visualization-guidance.md`](references/chart-and-data-visualization-guidance.md)
- responsive and mobile UI guidance:
  [`references/responsive-and-mobile-ui-guidance.md`](references/responsive-and-mobile-ui-guidance.md)
- UI verification workflow:
  [`references/ui-verification.md`](references/ui-verification.md)
- stateful flow compromise rules:
  [`references/stateful-flow-compromises.md`](references/stateful-flow-compromises.md)
- hotspot refactor workflow:
  [`references/hotspot-refactor-workflow.md`](references/hotspot-refactor-workflow.md)
- project bootstrap:
  [`references/project-bootstrap.md`](references/project-bootstrap.md)
- verification before push:
  [`references/verification-gates.md`](references/verification-gates.md)
