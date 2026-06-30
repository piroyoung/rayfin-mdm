# Data And Domain Layer Responsibilities

This app has **no server/ORM/repository-port layer**. Persistence is the Rayfin
platform, accessed through the Rayfin client. "Data access" means `src/services/*`
wrapping that client; "domain" means pure types and business rules in
`src/domain/`. For client query/mutation specifics, defer to the `rayfin` skill.

## `src/services/` (Rayfin data access)

- Wrap the Rayfin client (`getRayfinClient().data.<Entity>`) and expose
  domain-typed functions (`listProducts`, `createProduct`, `setProductStatus`,
  `mergeProducts`, ...). Group one module per domain noun.
- Own **explicit field projection**: the Rayfin/DAB client returns only the
  primary key unless fields are selected, so every read enumerates the columns
  it needs (keep the projection in sync with the matching `rayfin/data/*` entity).
- Own sorting, filtering, and cursor pagination at the query boundary.
- Own side effects that accompany a write, e.g. audit logging via
  `src/services/audit.ts` and stamping `createdBy`/`updatedBy` from
  `src/services/session.ts`.
- Apply domain rules by calling `src/domain/*` (e.g. `scoreProduct`) rather than
  re-implementing them.
- Return plain objects typed by `src/domain/types.ts`; do not leak query
  builders or the client instance to callers.

Do not put React, JSX, or component imports in services. Do not hand-roll
`fetch`/GraphQL — always use `client.data.<Entity>` (see the `rayfin` skill).

## `src/services/rayfinClient.ts` + `bootstrap.ts` + `session.ts`

- `rayfinClient.ts` constructs the typed `RayfinClient<MdmSchema>` once and
  exposes `getRayfinClient()`; it is the only module that calls `new RayfinClient`.
- `bootstrap.ts` reads env, decides local vs Fabric, builds the client, and
  selects the auth service. It runs once before React mounts (`src/main.tsx`).
- `session.ts` holds the current actor and feeds `createdBy`/`updatedBy` /
  audit. Treat this singleton as intentional; do not add other module-level
  mutable request state.

## `src/services/*AuthService.ts` + `IAuthService.ts`

- `IAuthService` is the auth contract (an `interface` with multiple
  implementations). `MockAuthService` is local-dev; `RayfinAuthService` is the
  Fabric/brokered implementation. Selection happens in `bootstrap.ts`.
- Follow the `rayfin` skill for auth behavior; this skill only owns where the
  code lives and how it is wired.

## `src/domain/types.ts`

- Re-export entity instance types from `rayfin/data/*` so the React layer never
  imports the backend project directly except through this module.
- Derive enum/union types from those classes (`RecordStatus = Customer['status']`)
  and define display metadata maps (`RECORD_STATUS_META`, `UOM_META`, ...).
- Provide resilient accessors (`tonedMeta`, `labelledMeta`, `humanizeToken`,
  `optionsOf`) so persisted values outside the current union do not crash render.

`rayfin/data/*` entity classes are the single source of truth for persisted
shapes. Do not redefine those shapes by hand anywhere in `src/`.

## `src/domain/` (pure business rules)

- Hold business invariants and calculations as pure functions and small types:
  quality scoring (`quality.ts`), duplicate detection (`duplicates.ts`),
  lifecycle helpers (`isActiveStatus`).
- Keep these free of React, the Rayfin client, browser APIs, and HTTP.
- Use `class` only when identity/invariants/lifecycle genuinely matter; this
  domain is mostly `type` + pure functions, which is the right default here.

Do not place data fetching, view models, or display-only concerns that belong to
a page inside `src/domain/`. Display metadata maps are the deliberate exception
because they are derived from domain enums and shared across screens.
