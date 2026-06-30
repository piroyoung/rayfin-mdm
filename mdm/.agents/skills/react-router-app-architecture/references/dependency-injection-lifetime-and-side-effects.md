# Dependency Wiring, Lifetime, And Side Effects

## Wiring Rule

Keep dependencies explicit and easy to substitute.

Prefer:

- explicit function parameters for stateless helpers and services
- React Context for cross-tree app dependencies (auth via `AuthContext`)
- a single composition point at bootstrap (`src/services/bootstrap.ts` +
  `src/main.tsx`) that builds the Rayfin client and selects the auth service

Avoid:

- constructing the Rayfin client or auth services inside pages, components,
  hooks, or domain
- hidden service-locator lookups that obscure what a screen depends on
- random module-level mutable singletons that carry domain state

This app does not need a DI container. Manual wiring at bootstrap plus Context is
enough.

## The Rayfin Client Singleton

- `src/services/rayfinClient.ts` is the only module that calls
  `new RayfinClient(...)`. It exposes `initRayfinClient()` (called once at
  bootstrap) and `getRayfinClient()` (used by services).
- Pages, hooks, components, and domain never import `RayfinClient` or call
  `getRayfinClient()`; they go through `src/services/*`.
- `getRayfinClient()` throws if called before bootstrap — keep that guard.

## Runtime / Async Safety Rule

Treat thread safety here as async safety in the browser:

- avoid module-level mutable state beyond the intentional singletons (the Rayfin
  client and the current actor in `src/services/session.ts`)
- guard concurrent client flows against stale responses — `useAsyncData` already
  cancels superseded loads with a `cancelled` flag; preserve that pattern when
  you write custom hooks
- when a newer user intent replaces an older in-flight request, do not let the
  old response mutate state

## Side Effect Rule

Make side effects explicit and reviewable:

- audit logging lives in `src/services/audit.ts` and is called from the write
  services (`createProduct` -> `logAudit`), not hidden in components
- seeding/demo data lives in `src/services/seed.ts`
- do not bury writes or audit calls inside presentational components or `ui.tsx`

## Schema And Migrations

Schema changes, migrations, and config bootstrap are **Rayfin** concerns
(`rayfin up`, `rayfin env`). Do not implement migration logic in app code.
Defer to the `rayfin` skill.

## Migration Workflow Rule (renaming app concepts)

When renaming an app-code term or moving a module:

1. choose the canonical new name/shape
2. do a direct replacement across `src/` in one focused change
3. update tests, types, and docs in the same change
4. keep a temporary alias only when a real consumer cannot migrate together
5. remove the alias as soon as the blocker migrates

Avoid parallel old/new names that drift in scope.
