# Boundary And Contract Rules

## Dependency Direction

Follow this direction strictly:

```text
App.tsx / pages / components
  -> hooks (view state)
  -> services (Rayfin data access)
  -> domain
  -> lib (leaf)

components/ui.tsx
  -> domain display metadata + lib only (nothing feature-specific)

services
  -> Rayfin client + domain + lib

domain
  -> other domain modules + rayfin/data/* TYPES only
```

Treat `domain` as the inner policy layer and `services` as the outer integration
layer (it is the only place that talks to the Rayfin client). React only flows
inward through hooks and services.

## Contract Placement Rule

This app's "contracts" are the service input/return types and the domain types.

1. Keep a service's input shape (e.g. `ProductInput`) next to that service.
2. Keep view-model/draft shapes next to the page or hook that owns them.
3. Promote a type into `src/domain/types.ts` only when it is a real, shared
   domain concept (usually derived from `rayfin/data/*`).
4. Never redefine persisted entity shapes by hand — re-export them from
   `rayfin/data/*` through `src/domain/types.ts`.

## Constant Placement Rule

Do not create a global constants dump by default. Use this order:

1. keep a literal local when it is obvious and used once
2. extract to the nearest owning module when the name improves readability
   (e.g. a `PRODUCT_FIELDS` projection inside `services/products.ts`,
   an `EMPTY` form default inside the page)
3. promote to `src/domain/types.ts` only when the value is a cross-screen domain
   concept (e.g. display-metadata maps)

## Validation Ownership Rule

Validate at the narrowest boundary that can correctly own the rule:

- page/form: input shape, required fields, basic parse of user input
- service or view-state hook: workflow preconditions and cross-field
  application rules before a write
- domain: business invariants that must always hold (scoring, dedup, lifecycle)
- Rayfin platform: persistence constraints, `@role`/`policy` row/field rules
  (see the `rayfin` skill)

Do not push domain invariants into the form just because the UI can reject
early, and do not pull UI-input concerns into `src/domain`.

## Error Mapping Rule

Keep error categories explicit:

- input/validation errors (page/form)
- application/workflow errors (service or hook)
- domain errors (domain)
- platform/transport errors (Rayfin client)

Services should throw errors that still make sense without React. Pages and
hooks translate them into user-facing messages — `useAsyncData` already maps a
thrown error to a message string, and `useToast` surfaces command failures.

## Authorization Ownership Rule

Keep authentication and authorization distinct:

- edge: `AuthContext` + `AuthGuard` in `src/App.tsx` resolve the current session
- service/domain: decide whether an operation is allowed when it is app logic
- platform: enforce reusable row/field authorization with Rayfin `@role` and
  `policy` (the source of truth — see the `rayfin` skill)

Do not make UI visibility the only access control; the Rayfin policy layer is
the real gate.

## Serialization Rule

Convert between persisted, domain, and view shapes at explicit boundaries. Do
not let these cross boundaries unchanged without intent:

- `Date` (convert/format with `src/lib/format.ts` at the view edge)
- ids and enum tokens (use `tonedMeta`/`labelledMeta` fallbacks for unknown
  enum values)
- money-like values (format at the view, store raw)

## Import Smell Checks

Treat these as architecture failures:

- a page, component, hook, or `domain` module importing the Rayfin client or
  calling `client.data.*` directly (only `src/services/*` may)
- raw `fetch`/GraphQL for data anywhere
- `src/components/ui.tsx` importing a service or feature page
- `src/domain/*` importing React, `react-router-dom`, the Rayfin client, or
  browser APIs
- `rayfin/data/*` imported anywhere except as **types** re-exported through
  `src/domain/types.ts`
- redefining a persisted entity shape by hand instead of re-exporting it
- module-level mutable state holding request/user context beyond the intentional
  singletons (`rayfinClient`, `session`)
- circular imports across page/hook/service boundaries
- authorization enforced only in the UI with no Rayfin `@role`/`policy` backing
