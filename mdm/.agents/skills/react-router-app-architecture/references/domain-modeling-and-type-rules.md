# Domain Modeling And Type Rules

## Concept Ownership And Consolidation Rule

Do not keep parallel classes, variables, or functions that perform the same job
in the same boundary without a clear reason.

Prefer:

- one concept
- one name
- one owner

Persisted shapes have exactly one owner: the `rayfin/data/*` entity classes,
re-exported through `src/domain/types.ts`. Never create a second hand-written
copy of an entity shape in `src/`.

Consolidate only when modules represent the same concept in the same boundary
and differ only because of drift. Do not consolidate just because names look
similar across boundaries (a service input DTO and a domain type can coexist).

## Domain-Centered Application Rule

Build business behavior around domain language and models, but do not turn
everything into a domain object.

Use `src/domain` as the semantic center for:

- invariants (quality scoring, dedup)
- value semantics and enums (`RecordStatus`, `UnitOfMeasure`)
- lifecycle helpers (`isActiveStatus`)
- shared display metadata derived from those enums

Keep page draft state, form parsing, the Rayfin client, and browser runtime
state outside `src/domain`.

## Object-Oriented Modeling Rule

Use `class` selectively. Prefer `class` only when at least one is true:

- identity matters over time
- invariants must be protected together with state
- lifecycle transitions are part of the business language

In this app, persisted entities are already classes in `rayfin/data/*`; the
`src/domain` layer is intentionally mostly `type` plus pure functions, which is
the right default. Auth services use a `class` per implementation behind the
`IAuthService` interface because behavior and substitutability matter there.

## Composition Over Inheritance Rule

Prefer composition over inheritance. Avoid deep class hierarchies for
components, services, or hooks. Compose small pure functions and primitives
instead.

## Anemic Model Boundary

Do not force every rule into classes, but also do not let domain types become
empty bags. Healthy split here:

- `src/domain` types + pure functions hold invariants and calculations
- `src/services` orchestrate persistence, side effects, and application flow
- pages/hooks orchestrate interaction flow

## Interface And Type Rule

Choose `interface` and `type` by role, not habit.

Prefer `interface` when:

- the shape is an object-like port or contract with multiple implementations
  (e.g. `IAuthService`, `AsyncState<T>`)

Prefer `type` when:

- the shape is a DTO, draft, or view model local to a feature
  (e.g. `ProductInput`)
- unions, intersections, mapped types, or primitives are involved
  (e.g. `RecordStatus`, `BadgeTone`)

Avoid one-off interfaces for local object literals.

## Unknown Type Rule

Use `unknown` for data that has crossed a trust boundary but is not yet proven
safe.

1. receive untrusted data as `unknown` (e.g. a caught error, an env value)
2. validate or narrow it immediately (`err instanceof Error ? err.message : ...`)
3. convert it into a typed value
4. keep the validated shape flowing inward, never the raw `unknown`

For persisted enum values that may fall outside the current union, use the
`tonedMeta` / `labelledMeta` fallbacks in `src/domain/types.ts` rather than
indexing a metadata map directly (which would throw during render).
