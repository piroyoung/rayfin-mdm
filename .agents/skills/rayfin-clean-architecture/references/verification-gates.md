# Verification Gates

## Verification Order

Run verification in this order:

1. Targeted Vitest tests for the changed behavior
2. Typecheck (`tsc -b`)
3. Lint (`npm run lint`) or the project quality gate
4. Architecture drift checks and the Design-Pattern Compliance Gate
5. Playwright check of the touched route when UI is affected, including a
   narrow mobile viewport when layout or interaction is responsive
6. Manual spot check of the touched flow

Code that passes tests but breaks layer direction is not done. UI-affecting
changes never checked in a real rendered browser flow are not done.

For a **refactor**, keep a running violation inventory and burn it to zero: seed
it up front from the checks above across the change's dependency closure, append
every violation you find while working, and re-run the gate after each batch
until no item remains. A refactor is done only at zero open violations — never
defer an in-scope violation to "next time". See
[`refactor-inventory-and-completion.md`](refactor-inventory-and-completion.md).

## Architecture Drift Checklist

Confirm all of the following:

- no `@microsoft/rayfin-client`, `RayfinClient`, or `client.data` import outside
  `src/infrastructure/`
- no auth SDK import outside `src/infrastructure/auth/` (and the client
  facade)
- no React, `react-router-dom`, or browser API import inside `src/domain/*`
- no `rayfin/data` entity **value** import inside `src/domain/*` (a type-only
  shape reference is allowed)
- no repository or auth service reached from a component/page without going
  through a use case and port
- no generic catch-all common directory reintroduced
- no convenience top-level buckets such as `src/features/`, `src/modules/`,
  `src/hooks/`, `src/services/`, `src/utils/`, `src/types/`, or `src/store/`
  introduced without an explicit migration plan
- no horizontal `state`, `reducers`, `stores`, or `handlers` directories under
  `src/`
- no feature-specific presentational component placed outside
  `src/components/<feature>/` without a deliberate reason
- no feature-specific logic imported into `src/components/shared/`
- no `usecase` or `domain` module instantiating a repository or auth service
  with `new`
- no service locator or module-level mutable singleton carrying Fabric session
  or user context
- no `import.meta.env` read outside `src/infrastructure/config/`
- no `if (localDev)` / environment branch outside
  `src/infrastructure/config/`
- no circular imports across page, use case, or infrastructure boundaries
- no authorization rule that exists only in the UI with no reliance on `@role`
- no Rayfin entity object or `Date` leaking into domain rules unchanged
- no business logic buried in page containers or route elements
- no business decision inlined in a component or page — a status's allowed
  actions, a lifecycle transition's legality, or a metric's band/tone derived
  from raw status/score literals instead of a domain predicate or a shared
  presentation helper
- no non-trivial async orchestration left inside presentational components
- no new vague file names such as `helpers.ts`, `utils.ts`, or `common.ts`
- no DTO or view-model shapes turned into classes where `type` plus functions
  would be clearer
- no `interface` used for one-off DTOs, and no new `I*`-prefixed port names
  beyond an existing template convention
- no raw `unknown` value flowing past its trust boundary without narrowing
- no `.tsx` file under `src/components/` exporting more than one top-level React
  component, and no file whose primary exported component name disagrees with
  the file name
- no shared "grab-bag" module that defines several presentational primitives
  (split into `src/components/shared/<Component>.tsx`, one per file; the only
  allowed `shared/` barrel is a thin index that *only* re-exports)
- no presentation policy (band/tone/label thresholds over a domain rule)
  duplicated across components instead of a single shared helper
- no `client.data`, `RayfinClient`, or auth SDK import inside a component or
  page
- no CSS Modules or a second general-purpose component library introduced as a
  requirement (styling is Tailwind)
- no inline `style={{ ... }}` used for static styling that belongs in a Tailwind
  class
- no feature-specific or component-name selectors added to the global
  stylesheet
- no `flatRoutes()`, framework-mode route files, or loader/action data APIs
  introduced (routing is declarative)

## Design-Pattern Compliance Gate

Run this pattern-by-pattern pass in addition to the drift checklist. Each line
names a mandated pattern (see [`design-patterns.md`](design-patterns.md)) and the
smell that **fails** the gate. Every failure is a violation that goes on the
inventory and must be fixed before completion.

- **Composition Root** — fails if the client, repositories, or auth service are
  built anywhere but `src/main.tsx` / `infrastructure/config/`, or a use case or
  module singleton constructs its own dependencies.
- **Dependency Injection / Dependency Context** — fails on a service locator, a
  `getRayfinClient()` reached across the app, or ports read from anything but the
  injected Context / Hook arguments.
- **Ports & Adapters** — fails if `client.data`, `RayfinClient`, or an auth SDK
  is imported outside `src/infrastructure/`.
- **Repository** — fails if data access happens outside a repository port, or a
  repository returns raw Rayfin entity shapes instead of domain/view models.
- **Strategy** — fails if the mock-vs-Fabric (or environment) choice is scattered
  in `if` branches instead of selected once in a factory.
- **Facade** — fails if components or use cases talk to the raw RayfinClient
  surface instead of the infrastructure facade.
- **Presenter / View Model** — fails if a component derives its own view model,
  or business derivation lives in JSX instead of `selectors.ts` or a view-model
  Hook.
- **Reducer / State Machine** — fails if multi-field interaction state is mutated
  ad hoc in a component instead of a reducer, or a lifecycle/status transition is
  decided in the View from raw status literals.
- **Factory** — fails if construction and wiring logic is inlined at call sites
  instead of a factory in `infrastructure/config/`.
- **Mapper / Anti-Corruption Layer** — fails if `Date`, ids, or Rayfin entity
  shapes leak inward unconverted instead of being mapped at the adapter boundary.
- **One component per file / no grab-bag** — fails on a `.tsx` that defines more
  than one top-level component (including a many-primitive `ui.tsx`).
- **No business decision in the View** — fails on status→action eligibility,
  lifecycle transition legality, or metric→band/tone derived from raw literals
  instead of a domain predicate or shared presentation helper.

## Useful Search Patterns

Use `rg` for quick audits from the app root:

```bash
# Rayfin SDK / data client must stay inside infrastructure
rg -n "@microsoft/rayfin-client|client\.data|RayfinClient" src/pages src/components src/usecase src/domain

# Domain must be free of React, router, browser, and rayfin/data entities
rg -n "from ['\"][^'\"]*(react|react-router|rayfin/data)" src/domain

# env only in config
rg -n "import\.meta\.env" src --glob '!src/infrastructure/config/**'

# no new use of new Repository/Service in usecase/domain
rg -n "new [A-Z][A-Za-z0-9_]*(Repository|Service)\(" src/usecase src/domain

# convenience buckets and horizontal dirs
find src -type d \( -name features -o -name modules -o -name hooks -o -name services -o -name utils -o -name types -o -name store \) | sort
find src -type d \( -name state -o -name reducers -o -name stores -o -name handlers \) | sort

# one component per file: inspect files with multiple top-level exports
rg -n "^export (default |const |function )" src/components

# styling: no CSS Modules, no static inline style, no global CSS import in a component
rg -n "\.module\.css" src
rg -n "style=\{\{" src/components
rg -n "import .*\.css['\"]" src/components

# routing: declarative only
rg -n "flatRoutes|@react-router/fs-routes|export const loader|export const action" src
```

Interpret results; do not blindly fail on matches. The point is to surface
suspicious files quickly.

## Completion Gate Heuristic

Before considering the change complete, be able to state all of the following:

- the violation inventory for the change's dependency closure is empty — no known
  design-pattern or architecture-drift violation is left open, and no in-scope
  violation was deferred to "next time"
- the use-case layer owns the interaction logic
- the view layer is mostly props plus rendering, styled with Tailwind
- every screen you touched is finished to the full architecture: one component
  per file, inline components extracted, the page reduced to a thin container,
  and no business logic, derivation, or data access left in a page or component
- the fundamentals (one-component-per-file, shared/feature extraction,
  no-logic-in-view) were completed in this pass, not deferred as "too risky"
- feature-local presentational components live under `src/components/<feature>/`
- `components/shared` stays presentational and feature-agnostic
- reducer and state modules live with their owning feature use case
- all data access goes through a repository port; `client.data` stays inside
  `src/infrastructure/data/`
- ports live in `domain`; adapters live in `infrastructure`; nothing inner
  imports the Rayfin SDK
- dependencies are assembled in the composition root and injected, not
  instantiated inside use cases
- the Strategy choice (mock vs Fabric) lives in a factory, not scattered in
  branches
- Fabric session/user context does not leak through singleton or module-level
  state
- validation lives at the correct layer; errors are mapped intentionally rather
  than leaking raw SDK failures
- authorization intent has a home in use cases/policies and relies on `@role`
  server-side, not on UI visibility alone
- Rayfin entity shapes and `Date` are mapped at the adapter boundary
- routing is declarative; pages are thin
- file names reveal responsibility without `helpers`/`utils`/`common`
- classes are used for identity and invariants, `type` for DTOs/view models
- `unknown` is used as a boundary quarantine type
- the changed area has tests or a clear reason why not
- UI-affecting changes were checked in Playwright at the relevant route,
  viewport sizes, and orientation when needed

If any statement is false, fix the architecture before considering the change
done.
