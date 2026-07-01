# Boundary And Contract Rules

## Dependency Direction

Follow this direction strictly:

```text
App.tsx / pages / components
  -> usecase
  -> domain (models, value-objects, policies, repositories, ports)

components/shared
  -> nothing application-specific

infrastructure
  -> domain (implements its ports)
  -> Rayfin SDK, browser APIs, rayfin/data schema (for the typed client)

domain
  -> domain only
```

Treat `domain` as the inner policy layer and `infrastructure` as the
outer integration layer. The composition root (`src/main.tsx`) is the only
module allowed to import across all layers to wire them together.

## Ports And Adapters Rule

Every outbound dependency crosses a port:

- persistence → a repository port in `domain/repositories/`, implemented in
  `infrastructure/data/`
- auth, clock, id generation, notification → a port in `domain/ports/`,
  implemented in `infrastructure/`

Use cases and domain depend on the port type. They must never import
`RayfinClient`, `client.data`, or an auth SDK. The adapter depends on the port
(implements it) and on the Rayfin SDK.

## Contract Placement Rule

Do not move query, input, or response shapes into `domain` just because they
are reused.

Use this decision order:

1. Keep a repository's input/result shapes near the port or its adapter.
2. Keep view models near the owning use case.
3. Promote a type into `domain/models` only when it is a real business concept
   with invariants.
4. If contracts become broadly shared across many boundaries, introduce a
   dedicated `src/contracts/` directory later instead of polluting
   `domain`.

The Rayfin `@entity` classes in `rayfin/data` are platform schema, not domain
contracts. Never import their **values** (the decorated classes) into `domain`.
A **type-only** reference to an entity's instance shape (`import type { Account }
from '.../rayfin/data/Account'`, e.g. via a `domain/types` barrel) is allowed: it
carries no runtime, decorator, or SDK dependency, and is often the most
type-safe source of a record's persisted shape.

## Constant Placement Rule

Do not create a global constants dump by default.

Use this order:

1. keep a literal local when it is obvious and used once
2. extract to the nearest owning module when the name improves readability
3. extract to a feature-level `constants.ts` only when several modules in the
   same feature share it
4. promote to a wider scope only when the constant is truly cross-feature and
   stable

Use `domain` for constants only when the value is really a domain concept.

## Validation Ownership Rule

Validate at the narrowest boundary that can correctly own the rule.

Use this split:

- adapters (`infrastructure`): shape of Rayfin query results, env values,
  and browser inputs crossing into the app; treat them as `unknown` first
- use cases (`usecase`): permission intent, workflow preconditions,
  cross-field application rules
- domain (`domain`): business invariants that must always hold

Do not push domain invariants outward just because the UI can reject early, and
do not pull Rayfin-specific parsing into `domain`.

## Error Mapping Rule

Keep error categories explicit:

- infrastructure errors (Rayfin/network/auth SDK failures)
- application or use-case errors
- domain errors

Adapters translate Rayfin/network failures into meaningful application errors
at the boundary. Use cases map those into view-facing pending/error states.
Components render the mapped state; they do not catch raw SDK errors.

## Authorization Ownership Rule

Keep authentication and authorization distinct.

Use this split:

- composition root / auth adapter: resolve the current Fabric principal or
  session
- use case: decide whether the requested operation is allowed in app terms
- domain policy: enforce reusable business authorization rules

Rayfin enforces access server-side through `@role` policies, but keep the app's
authorization intent explicit in use cases and policies. Do not make UI
visibility the only access control, and do not bury authorization inside
repositories.

## Serialization Rule

Convert between Rayfin entity shapes, transport values, and domain shapes at
explicit boundaries.

Do not let these cross boundaries unchanged without intent:

- `Date`
- ids and `user_id` / `claims.sub` values
- money-like values
- value objects
- raw Rayfin entity objects

Prefer domain/view models with primitives over leaking runtime-rich Rayfin
objects into use cases and components.

## Import Smell Checks

Treat these as architecture failures:

- `components`, `pages`, `usecase`, or `domain` importing
  `@microsoft/rayfin-client`, `client.data`, or an auth SDK
- `domain` importing React, `react-router-dom`, browser APIs, or the
  `rayfin/data` entities
- `components/shared` importing feature-specific use cases
- a use case constructing its own repository or auth service with `new`
- a repository or auth service reachable from a component without going through
  a use case and port
- module-level mutable state holding Fabric session or user context
- circular imports across page, use case, or infrastructure boundaries
- authorization enforced only in the UI with no reliance on `@role`
- Rayfin entity objects or `Date` leaking into domain rules unchanged
- `I*`-prefixed port names added gratuitously (an existing convention such as
  the template's `IAuthService` may be kept, but do not spread the prefix)
