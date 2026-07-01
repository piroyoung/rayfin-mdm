# Domain Modeling And Type Rules

## Domain Models Vs Rayfin Entities

Rayfin `@entity` classes in `rayfin/data` are **persistence schema** owned by
the platform: they carry DB/DAB decorators (`@uuid`, `@text`, `@role`, …) and
are coupled to the database dialect. They are not domain models.

The app's **domain models** live in `src/domain/models/` and are the
business/view types the app reasons about. They are free of decorators, the
Rayfin SDK, React, and browser APIs. A repository adapter maps between a Rayfin
entity row (a DTO) and a domain model when their shapes diverge.

Do not import `rayfin/data` entity **values** (the decorated classes) into
`domain`, and do not push DB or `@role` concerns into domain models. A
**type-only** reference to an entity's instance shape (`import type { Account }
from '.../rayfin/data/Account'`, e.g. re-exported through a `domain/types`
barrel) is allowed — it carries no runtime, decorator, or SDK dependency and is
often the most type-safe source of a record's persisted shape.

## Concept Ownership And Consolidation Rule

Do not keep parallel classes, variables, or functions that perform the same job
in the same boundary without a clear reason.

Prefer:

- one concept
- one name
- one owner

Consolidate only when the modules represent the same concept in the same
boundary and differ only from historical drift. Do not consolidate merely
because names or fields look similar across boundaries — a Rayfin entity row, a
domain model, and a view model can legitimately look alike yet stay separate.

## Domain-Centered Application Rule

Build business behavior around domain language and domain models, but do not
model the entire app as if everything were a domain object.

Use the domain as the semantic center for:

- invariants
- value semantics
- lifecycle transitions
- business rule names
- authorization intent (policies)

Keep query/response DTOs, route params, view models, browser runtime state, and
Rayfin adapters outside `domain`.

## Object-Oriented Modeling Rule

Use object-oriented modeling selectively, not by default.

Prefer `class` when at least one is true:

- identity matters over time
- invariants must be protected together with state
- lifecycle transitions are part of the business language
- behavior belongs naturally on the model instead of in a detached helper

Prefer `type` plus pure functions when the module is mainly a DTO, mapper,
stateless transform, or lightweight contract — which is common for view models
built from Rayfin rows.

## Composition Over Inheritance Rule

Prefer composition over inheritance.

Use inheritance only when the subtype relationship is stable, substitutability
is real, and shared behavior cannot be expressed more clearly through
composition. Avoid deep class hierarchies for components, repositories,
adapters, or use cases.

## Anemic Model Boundary

Do not force every rule into classes, but do not let domain models become empty
bags of fields either.

Healthy split:

- models and value objects protect their own invariants
- policies decide cross-model rules and authorization intent
- domain services coordinate domain behavior that belongs to no single model
- use cases orchestrate application flow, permissions, and data access through
  ports

## Interface And Type Rule

Choose `interface` and `type` by role, not by habit.

Prefer `interface` when:

- the shape is an object-like port or contract (repository port, auth port)
- multiple implementations are expected (Strategy)
- the contract is part of DI or architecture boundaries

Prefer `type` when:

- the shape is a DTO, query result, or view model
- the shape is local to one feature or module
- unions, intersections, mapped types, tuples, or primitives are involved

Do not add `I*`-prefixed port names gratuitously. If the project already uses a
convention such as the template's `IAuthService`, you may keep it for
consistency, but do not spread the prefix to new ports.

## Unknown Type Rule

Use `unknown` for data that has crossed a trust boundary but has not yet been
proven safe.

Best practice:

1. receive untrusted data as `unknown`
2. validate or narrow it immediately
3. convert it into a DTO, value object, or domain model
4. keep the validated shape flowing inward instead of the raw `unknown`

Apply this specifically to:

- `import.meta.env.VITE_*` values read in `infrastructure/config/`
- data crossing into the app from Rayfin query results before mapping
- anything parsed from `localStorage`, URL params, or postMessage

Treat `unknown` as a boundary quarantine type, not a long-lived application
type.
