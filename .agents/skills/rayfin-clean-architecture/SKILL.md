---
name: rayfin-clean-architecture
description: "Own the app-code architecture, layer boundaries, design-pattern discipline, UI structure, and verification for a Rayfin SDK app (React 19 + Vite + Tailwind + declarative React Router, Fabric-authenticated, data through the Rayfin typed client over Data API Builder). Use when the request mentions Rayfin app structure, RayfinClient/client.data access, repository ports and adapters, composition root and dependency injection, client use cases, domain models, pages and components, Tailwind UI, Playwright UI verification, or app-structure refactoring. Defer data-model decorators, @role/RLS, auth methods, CLI, and deployment to the bundled `rayfin` skill and its MCP tools."
---

# Rayfin Clean Architecture

## Top Priority Rules (Non-Negotiable)

**These five rules are the most important in this skill. They are absolute,
take precedence over convenience, speed, or any other guidance here, and must
never be violated.**

1. **Obey the canonical `src/` layout and inward dependency direction.** Place
   every file in its canonical owner under `src/`, and keep dependencies
   pointing strictly inward: `pages`/`components` → `usecase` →
   `domain`; `infrastructure` implements `domain` ports.
   Dependencies must never point outward, and `domain` must never import
   React, the Rayfin SDK, browser APIs, or the `rayfin/data` decorator models.
2. **Reach the Rayfin SDK only through infrastructure ports.** Never call
   `client.data.<Entity>`, `RayfinClient`, or an auth SDK from `pages`,
   `components`, `usecase`, or `domain`. Data and auth flow through a
   port defined in `domain` and an adapter implemented in
   `infrastructure/`. This is the Repository + Ports-and-Adapters rule.
3. **Assemble dependencies once in the composition root and inject them.**
   `src/main.tsx` is the composition root: read config, build the RayfinClient,
   pick the concrete adapters, and inject them through constructors, function
   parameters, props, or a single React Context. No service locators, no
   module-level mutable singletons carrying request/user state, no `new
   SomeRepository()` inside `usecase` or `domain`.
4. **One component per file; declarative routing; thin pages — completed in
   one pass.** Each `.tsx` exports exactly one React component whose name
   matches the file. Routing uses `react-router-dom` in declarative mode
   (`<BrowserRouter>` / `<Routes>` / `<Route>`) composed in `App.tsx`, with
   `src/pages/` holding thin route containers that delegate to use cases. These
   are basics: when you touch a screen, split every inline component into its
   own file and move all logic out in the SAME change. A large or untested file
   is a reason to plan the split carefully, never a reason to defer it.
5. **Never exceed a layer's responsibility, and defer platform concerns.**
   Components render, use cases orchestrate, domain holds business rules,
   infrastructure talks to Rayfin and the browser. A component never *decides*
   business questions — which actions a record's status allows, whether a
   lifecycle transition is legal, or how a score maps to a band or tone; it
   calls a domain predicate or reads a view-model flag instead of re-deriving
   the rule from status or score literals. Data-model decorators
   (`@entity`, `@role`, RLS policies), auth methods, CLI, schema migration,
   and deployment belong to the Rayfin platform — keep them in `rayfin/` and
   defer to the bundled `rayfin` skill and its MCP tools instead of
   duplicating or contradicting them here.

The detailed rules in the rest of this document expand on these five. Whenever
any guidance appears to conflict, these five always win.

**Risk is a planning trigger, not an escape hatch.** When a required change is
risky — a large or untested file, a broad rename, splitting a fat screen,
removing shared module-global state — make an explicit plan (smaller batches,
characterization tests where behavior could regress, and a verification pass)
and complete it in the same change. Never silently descope, half-finish, or
defer required app-code work because it "feels risky": risk raises the planning
and verification bar, it does not license skipping the work. Deferring genuine
*platform* concerns (data model, `@role`/RLS, CLI, deployment) to the `rayfin`
skill is scoping, not descoping — that is still expected.

**Refactors run to zero.** When the job is to remove violations, keep a living
violation inventory: seed it before editing by running the Design-Pattern
Compliance Gate and drift checks across the change's dependency closure, append
every violation you find while working, and loop — fixing in dependency order —
until the inventory is empty and the gates are green. Never finish an app-code
refactor with a known open violation, and never leave an imported shared module
(e.g. a many-component `ui.tsx`) half-split. See
[`references/refactor-inventory-and-completion.md`](references/refactor-inventory-and-completion.md)
and the Design-Pattern Compliance Gate in
[`references/verification-gates.md`](references/verification-gates.md).

## Overview

Use this skill as the default architecture workflow for a **Rayfin SDK app**: a
React 19 single-page app built with Vite, styled with Tailwind CSS, routed with
`react-router-dom` in declarative mode, authenticated against Microsoft Fabric,
and backed by the Rayfin typed client (`@microsoft/rayfin-client`) talking to a
managed Data API Builder (DAB) backend. There is **no app-owned server layer**;
the backend is the Rayfin/Fabric platform.

This skill owns code structure, dependency direction, **design-pattern
discipline**, UI guardrails, and verification for the app codebase in `src/`.
It does **not** own the Rayfin platform surface. Leave the data-model
decorators, `@role`/row-level-security, auth methods, `rayfin.yml`, CLI
(`rayfin up`, `rayfin login`), schema migration, and Fabric deployment to the
bundled `rayfin` skill (`.agents/skills/rayfin/`) and its MCP tools
(`search_docs`, `get_doc`, `discover_packages`). When platform questions
appear, hand them off rather than answering them here.

Because Rayfin ships a typed GraphQL-style client and enforces access with
server-side `@role` policies, this skill's job is to keep that power **behind
clean boundaries**: repository ports in `domain`, adapters in
`infrastructure`, orchestration in `usecase`, and render-only `components`.

For UI work, use Tailwind utility classes as the styling system (the Rayfin
template ships Tailwind v4), keep presentation quiet and simple, and keep
required labels, validation, and critical status visible without hover.

## Canonical Layout

This canonical directory layout is the most important structural rule in this
skill. Place every file in its canonical owner and organize directories by
responsibility, not by team preference or historical drift.

```text
src/
  main.tsx                      # Composition Root: config → client → adapters → inject
  App.tsx                       # Declarative router composition + auth gate (thin)
  pages/                        # Route containers, one per screen (thin)
  components/
    <feature>/                  # Feature-local presentational components
    shared/                     # Feature-agnostic presentational primitives
  usecase/
    <feature>/
      use-<feature>.ts          # public Hook / controller entry point
      state.ts reducer.ts selectors.ts handlers.ts types.ts
    auth/
      use-auth.ts
      AuthContext.tsx           # view-facing auth context (service is injected)
  domain/
    models/                     # business/view models (NOT the @entity classes)
    value-objects/
    policies/
    services/                   # infrastructure-free domain orchestration (rare)
    repositories/               # persistence ports (interfaces)
    ports/                      # other outbound ports (auth, clock, notifier)
  infrastructure/
    rayfin/                     # RayfinClient facade + schema binding
    data/                       # repository implementations wrapping client.data.<Entity>
    auth/                       # auth-service implementations (mock vs Fabric)
    browser/                    # localStorage, clipboard, media-query adapters
    config/                     # import.meta.env readers + dependency factories
  di/                           # AppDependencies + DependenciesProvider/useDependencies
  lib/                          # tiny shared utilities only (formatters, guards)

rayfin/                         # PLATFORM — owned by the `rayfin` skill + MCP
  data/                         # @entity decorator models (persistence schema)
  rayfin.yml                    # Fabric service configuration
```

The `@/` alias points at `src/`, so layers live **directly under `src/`**
(`src/domain`, `src/usecase`, `src/infrastructure`, `src/di`, `src/components`,
`src/pages`) — matching the Rayfin template's flat `src/<layer>` convention.
`src/lib/` is reserved for tiny shared utilities, not a layer prefix. Match the
project's existing root and never create a parallel tree such as `src/lib/domain`
when `src/domain` already exists.

The Placement Guide below maps each need to its location, and
[`references/layout-and-module-placement.md`](references/layout-and-module-placement.md)
covers the placement preflight, naming, and feature-boundary rules.

## Quick Start

1. Always read
   [`references/layout-and-module-placement.md`](references/layout-and-module-placement.md)
   before deciding where code should live, and
   [`references/design-patterns.md`](references/design-patterns.md) before
   wiring dependencies or data access.
2. Run a placement preflight before implementing:
   - list every new file, moved file, and extracted file
   - assign the exact canonical target path for each file before writing code
   - if a file does not fit the canonical layout, stop and revise the plan
     before inventing a new directory
3. Classify the requested change:
   - route/page composition
   - presentational UI
   - client interaction flow (use case)
   - data access (repository port + Rayfin adapter)
   - auth flow
   - domain rule
   - cross-boundary contract or mapper
   - platform concern (data model, `@role`, CLI, deploy) → **hand off to the
     `rayfin` skill**
4. Place code in its canonical owner from the Canonical Layout above.
5. Read the narrowest matching reference for the task. The References section
   at the end lists every reference grouped by topic; load only the one or two
   that match the change.

## Core Rules

These rules expand the five Top Priority Rules above. Each group links to the
reference that owns the full detail; load that reference for a matching change.

### Layout and dependencies

- Lock file placement before coding: name exact target paths first, then
  implement. If a file does not fit the Canonical Layout, revise the plan
  instead of inventing a convenience directory.
- Keep dependency direction inward: `pages`/`components` → `usecase` →
  `domain`; `infrastructure` implements `domain` ports;
  `domain` depends only on `domain`.
- Keep feature-local components in `src/components/<feature>/` and promote to
  `src/components/shared/` only when feature-agnostic. Do not add generic
  buckets (`src/hooks/`, `src/services/`, `src/utils/`, `src/types/`,
  `src/store/`) or horizontal `state`/`reducers`/`handlers` directories. The
  Rayfin template's flat `services/` and `hooks/` map onto
  `infrastructure/` and `usecase/` respectively.
- See
  [`references/layout-and-module-placement.md`](references/layout-and-module-placement.md)
  and
  [`references/layer-responsibilities.md`](references/layer-responsibilities.md).

### Design patterns, boundaries, and dependency injection

- Model outbound needs as **ports** in `domain` (repository ports,
  auth/clock/notifier ports) and their **adapters** in `infrastructure`.
  Use cases and domain depend on ports, never on `RayfinClient` or
  `client.data`.
- Use the **Repository** pattern for all data access: the port lives in
  `domain/repositories/`, and the Rayfin-backed implementation in
  `infrastructure/data/` uses the typed `client.data.<Entity>` internally.
- Use **Strategy** to swap implementations by environment (e.g. an in-memory
  repository or mock auth service for local dev vs the Rayfin-backed ones),
  and choose the strategy in the composition root.
- Assemble everything in the **Composition Root** (`src/main.tsx`) with
  explicit **Factory** functions in `infrastructure/config/`. Inject by
  constructor, parameter, props, or one Context. Never use a service locator
  or a stateful module singleton.
- Keep authorization intent explicit in use cases/policies even though Rayfin
  enforces `@role` server-side; treat Fabric session/claims as request context
  passed explicitly.
- See
  [`references/design-patterns.md`](references/design-patterns.md),
  [`references/dependency-injection-lifetime-and-side-effects.md`](references/dependency-injection-lifetime-and-side-effects.md),
  and
  [`references/boundary-and-contract-rules.md`](references/boundary-and-contract-rules.md).

### Rayfin data access

- Never call `client.data.<Entity>` or hand-write GraphQL/`fetch` outside
  `infrastructure/`. Go through a repository port.
- Return domain/view models from repositories. Map the Rayfin entity/query
  shape to the domain shape only when they genuinely diverge; for simple
  screens the query DTO may be the view model directly — do not over-map.
- Keep query composition (`.select().where().orderBy().execute()`,
  `.findById()`, `.create()`, `.update()`, `.delete()`) inside the adapter, and
  keep `user_id`/`claims.sub` scoping and Fabric session reads at that
  boundary.
- See
  [`references/rayfin-data-access.md`](references/rayfin-data-access.md).

### Routing, pages, and navigation

- Use `react-router-dom` in declarative mode: compose `<Routes>` in `App.tsx`,
  keep an `AuthGuard` at the route boundary, and put one thin container per
  screen in `src/pages/`. Read params with `useParams`, navigate with
  `useNavigate`/`<Navigate>`.
- Shape URLs as resources (`/items`, `/items/:itemId`,
  `/items/:itemId/comments`) and keep pages limited to composition and
  delegation to use cases. There are no loaders/actions/framework-mode routes
  here.
- See
  [`references/routing-and-navigation.md`](references/routing-and-navigation.md).

### Client state and components

- Keep async state, mutation handlers, and derived view models in
  `src/usecase/`, with `state`/`reducer`/`selectors`/`handlers` colocated
  in the owning feature directory. Keep components presentational with only
  ephemeral UI state.
- Expose data to the view through use-case Hooks that call repository ports;
  never let a component call a repository or the Rayfin client directly.
- See
  [`references/view-state-and-handler-patterns.md`](references/view-state-and-handler-patterns.md).

### Components, styling, and UI presentation

- One React component per `.tsx` file with the file name matching the exported
  component. Style with **Tailwind** utility classes; do not introduce CSS
  Modules or a second general-purpose component library as a requirement. Keep
  repeated utility clusters DRY by extracting a component or a small
  `@apply`-based class, not by copy-paste.
- Keep UI visually simple and keep required labels, validation, and critical
  status visible without hover. Choose the simplest accessible chart for the
  task, and build responsive UI that stays capable on desktop and mobile.
- See
  [`references/component-and-styling-rules.md`](references/component-and-styling-rules.md)
  and
  [`references/ui-presentation-guidance.md`](references/ui-presentation-guidance.md).

### Domain modeling and types

- Use `class` only when identity, invariants, or lifecycle matter; prefer
  composition over inheritance and keep DTO/view shapes as `type` plus
  functions. Use `interface` for stable object ports, `type` for DTOs, unions,
  and view models.
- Treat untrusted data as `unknown` at the boundary and narrow it immediately —
  including Rayfin query results promoted into domain shapes and
  `import.meta.env` values. Keep the `rayfin/data` decorator entity **values**
  out of `domain`; domain models are separate business/view types, though a
  **type-only** reference to an entity's instance shape is allowed.
- See
  [`references/domain-modeling-and-type-rules.md`](references/domain-modeling-and-type-rules.md).

### Bootstrap and verification

- Bootstrap new projects with `npm create @microsoft/rayfin@latest`; it
  generates the correct `tsconfig` (TC39 decorators, `ESNext.Decorators`),
  Tailwind + Vite wiring, `rayfin/` schema scaffold, and `.mcp.json`. Do not
  retrofit a plain Vite template or enable `experimentalDecorators`.
- For UI-affecting changes, verify the rendered result with Playwright
  (accessible locators, web-first assertions, relevant routes and viewports)
  rather than code inspection alone. Run typecheck, lint, and Vitest.
- See
  [`references/project-bootstrap.md`](references/project-bootstrap.md),
  [`references/playwright-ui-verification.md`](references/playwright-ui-verification.md),
  [`references/verification-gates.md`](references/verification-gates.md), and
  [`references/refactor-inventory-and-completion.md`](references/refactor-inventory-and-completion.md).

## Implementation Workflow

### Placement Preflight For Every Change

- Read
  [`references/layout-and-module-placement.md`](references/layout-and-module-placement.md)
  first.
- Write the exact target paths for every created or moved file before touching
  code.
- Confirm each target path matches one canonical owner:
  - route composition and page containers: `src/App.tsx`, `src/pages/`
  - feature-local presentational UI: `src/components/<feature>/`
  - shared presentational UI: `src/components/shared/`
  - client orchestration and state: `src/usecase/<feature>/`
  - domain concepts and ports: `src/domain/`
  - Rayfin/browser adapters and repository implementations:
    `src/infrastructure/`
  - platform data model / config: `rayfin/` (**defer to the `rayfin` skill**)
- If any planned file lacks a clear owner, fix the placement plan before
  implementing.

### 0. Bootstrap new projects correctly

- Follow
  [`references/project-bootstrap.md`](references/project-bootstrap.md): scaffold
  with `npm create @microsoft/rayfin@latest`, then grow the `src/lib/` layers
  as the first feature needs them.
- Before writing entities or queries, consult the `rayfin` skill / MCP
  `search_docs('known limitations')` for platform constraints (text length
  caps, scalar types, FK naming, MSSQL gotchas).

### 1. Model the change around a use case

- Name the user intent first.
- Put invariants in `domain/models` or `domain/value-objects`, and cross-entity
  rules in `domain/policies`.
- Define the data need as a **repository port** in `domain/repositories/` and
  any other outbound need (auth, clock) as a **port** in `domain/ports/`.
- Keep request/response and query shapes near the adapter or use case that owns
  them; promote a type into `domain` only when it is a real business concept.
- Keep `rayfin/data` decorator entities and `@role` policies out of `domain` —
  they are platform schema, not domain models.

### 2. Keep view logic out of components

- Build a Hook or controller in `src/usecase/<feature>/` for each
  non-trivial screen or interaction flow; give it a feature directory when it
  needs submodules.
- Keep feature-specific presentational components in
  `src/components/<feature>/`; promote to `src/components/shared/` only when
  truly feature-agnostic.
- Let the use case own async calls (through repository ports), reducer logic,
  derived view state, event handlers, and error/pending mapping. Pass
  view-ready props into components.
- **Never leave logic in the view.** Filtering, sorting, derivation, mapping,
  orchestration (create/update/status/merge/delete), toasts, and reloads live
  in the use case (a page view-model Hook plus `selectors.ts`); form draft,
  validity, and derived previews live in a form Hook. Components and pages hold
  only props, passed handlers, and ephemeral UI state (open/selected/active
  tab).
- **No business decisions in the View.** A component or page never derives a
  status's allowed actions, a lifecycle transition, or a metric's band/tone from
  raw literals; it calls a domain predicate (`canSubmitAccount`) or a shared
  presentation helper (`qualityTone`), or reads a ready flag from the
  view-model.
- **Treat "one component per file" and "extract shared/feature components" as
  non-negotiable basics.** When you touch a fat screen, extract every inline
  top-level component into its own file under `src/components/<feature>/` (or
  `shared/` when feature-agnostic) in the same pass, and reduce the page to a
  thin container. Plan the split for a large or untested file; do not defer it.

### 3. Route and navigate declaratively

- Compose routes in `App.tsx` with `<Routes>`/`<Route>`, gate protected routes
  with an `AuthGuard`, and keep each `src/pages/*Page.tsx` thin.
- Use `useParams`, `useNavigate`, and `<Navigate>` for navigation state instead
  of duplicating it in component state.

### 4. Access data through repository ports

- The use case calls a repository port; the port is implemented in
  `infrastructure/data/` using `client.data.<Entity>`.
- Return domain/view models from the repository; scope by `user_id` /
  `claims.sub` and read the Fabric session inside the adapter.
- Do not expect Rayfin entity instance identity to survive across the client
  boundary; treat query results as DTOs.

### 5. Assemble dependencies at the edge

- Build the RayfinClient, repositories, and auth service in the composition
  root (`src/main.tsx`) using factory functions in `infrastructure/config/`.
- Inject them through constructors, props, or one Context. Prefer manual DI
  with explicit factories before any DI container.
- Recreate request-scoped dependencies from the current Fabric session/context
  rather than from module globals.

### 6. Validate and map errors by layer

- Validate transport/parse shape at the adapter boundary (including Rayfin
  results and env), use-case rules in `usecase`, and invariants in
  `domain`.
- Map Rayfin/network and domain errors to view-facing states in the use case,
  not inside components.

### 7. Keep authorization and serialization explicit

- Resolve authentication at the edge (composition root / auth adapter), but
  keep authorization intent in use cases or domain policies even though Rayfin
  enforces `@role` server-side.
- Convert `Date`, ids, and value objects at the adapter boundary rather than
  leaking Rayfin entity shapes inward.

### 8. Keep mutable state scoped

- Do not store request-specific state in module globals or singleton services.
- Pass Fabric session/user context and correlation metadata explicitly.
- Treat client-side async race conditions as correctness issues and guard
  against stale responses.

### 9. Use explicit compromises for stateful flows

- For streaming, session, playback, or wizard-style flows, allow a
  feature-local controller or store inside `src/usecase/<feature>/` when
  lifecycle and identity genuinely matter.
- Split durable state, ephemeral runtime state, and infrastructure handles
  explicitly. See
  [`references/stateful-flow-compromises.md`](references/stateful-flow-compromises.md).

### 10. Keep side effects and platform workflows explicit

- Keep schema changes and deployment in the Rayfin platform workflow
  (`rayfin up`, `rayfin up db apply`) — **defer to the `rayfin` skill**, do not
  hide them in components or adapters.
- Use barrel exports sparingly and only when they do not obscure ownership or
  create cycles.

### 11. Verify before completing the change

- Run targeted Vitest tests for the touched area, typecheck, and lint.
- Audit for boundary drift and forbidden imports (Rayfin SDK outside
  infrastructure, `client.data` outside repositories, React/SDK inside domain).
- For UI-affecting changes, run the touched route in Playwright and confirm the
  rendered result, interaction states, and responsive layout.
- For a refactor, keep a violation inventory and burn it to zero: seed it from
  the Design-Pattern Compliance Gate and drift checks across the dependency
  closure, append every violation you find, and loop until it is empty. See
  [`references/refactor-inventory-and-completion.md`](references/refactor-inventory-and-completion.md).
- Fix architecture violations before considering the change done even if tests
  pass.

### 12. Refactor overloaded files in phases

- When a `ts`/`tsx` file has too many responsibilities, follow the hotspot
  workflow in
  [`references/hotspot-refactor-workflow.md`](references/hotspot-refactor-workflow.md).
- Prioritize the hotspot that combines correctness risk, change frequency, and
  boundary damage. Move one stable seam at a time and keep the file working
  after each batch.

## Placement Guide

- Need feature-local pure rendering and markup: `src/components/<feature>/`
- Need reusable pure UI primitives or shared composition wrappers:
  `src/components/shared/`
- Need route composition or an auth gate: `src/App.tsx`
- Need a per-screen route container: `src/pages/<Feature>Page.tsx`
- Need client-side state, handlers, reducers, selectors, or orchestration:
  `src/usecase/<feature>/`
- Need view-facing auth state: `src/usecase/auth/`
- Need a business invariant or behavior-rich model: `src/domain/models/`
- Need a small immutable business concept with validation:
  `src/domain/value-objects/`
- Need cross-entity business rules: `src/domain/policies/`
- Need a persistence port: `src/domain/repositories/`
- Need another outbound port (auth, clock, notifier): `src/domain/ports/`
- Need a Rayfin client facade or schema binding:
  `src/infrastructure/rayfin/`
- Need a repository implementation over `client.data.<Entity>`:
  `src/infrastructure/data/`
- Need an auth-service implementation: `src/infrastructure/auth/`
- Need a browser adapter (storage, clipboard, media query):
  `src/infrastructure/browser/`
- Need env reading or a dependency factory: `src/infrastructure/config/`
- Need the injected dependency graph or its React provider/hook: `src/di/`
  (`AppDependencies`, `DependenciesProvider`, `useDependencies`)
- Need a data-model entity, `@role`, `rayfin.yml`, CLI, or deployment:
  `rayfin/` — **defer to the `rayfin` skill and its MCP tools**
- Need a reusable type or utility: place it with the owning use case or domain
  module first; extract only after repeated reuse proves the boundary

## References

Read [`references/layout-and-module-placement.md`](references/layout-and-module-placement.md)
and [`references/design-patterns.md`](references/design-patterns.md) first, then
load only the one or two references that match the change.

- layout and module placement, always read first:
  [`references/layout-and-module-placement.md`](references/layout-and-module-placement.md)
- design patterns (composition root, DI, ports/adapters, repository, strategy,
  presenter): [`references/design-patterns.md`](references/design-patterns.md)
- client, domain, and infrastructure layer responsibilities:
  [`references/layer-responsibilities.md`](references/layer-responsibilities.md)
- boundary and contract rules:
  [`references/boundary-and-contract-rules.md`](references/boundary-and-contract-rules.md)
- dependency injection, lifetime, and side effects:
  [`references/dependency-injection-lifetime-and-side-effects.md`](references/dependency-injection-lifetime-and-side-effects.md)
- Rayfin data access through repository ports:
  [`references/rayfin-data-access.md`](references/rayfin-data-access.md)
- declarative routing and navigation:
  [`references/routing-and-navigation.md`](references/routing-and-navigation.md)
- domain modeling and type rules:
  [`references/domain-modeling-and-type-rules.md`](references/domain-modeling-and-type-rules.md)
- view-state and handler composition:
  [`references/view-state-and-handler-patterns.md`](references/view-state-and-handler-patterns.md)
- component file and Tailwind styling rules:
  [`references/component-and-styling-rules.md`](references/component-and-styling-rules.md)
- chart and responsive/mobile UI guidance:
  [`references/ui-presentation-guidance.md`](references/ui-presentation-guidance.md)
- Playwright UI verification workflow:
  [`references/playwright-ui-verification.md`](references/playwright-ui-verification.md)
- stateful flow compromise rules:
  [`references/stateful-flow-compromises.md`](references/stateful-flow-compromises.md)
- hotspot refactor workflow:
  [`references/hotspot-refactor-workflow.md`](references/hotspot-refactor-workflow.md)
- project bootstrap with the Rayfin CLI:
  [`references/project-bootstrap.md`](references/project-bootstrap.md)
- verification gates:
  [`references/verification-gates.md`](references/verification-gates.md)
