# Dependency Injection, Lifetime, And Side Effects

Read this together with [`design-patterns.md`](design-patterns.md), which owns
the Composition Root, Factory, and Strategy patterns this file relies on.

## Composition Root Rule

Assemble the whole dependency graph in one place: `src/main.tsx`.

The composition root:

1. reads and validates configuration through `infrastructure/config/`
2. builds the `RayfinClient` (facade) once
3. selects the concrete adapters (auth service, repositories) — the Strategy
   choice, e.g. mock vs Fabric based on the API URL
4. injects them into the React tree through props and a single Context, and
   into use cases through their Hook arguments

Everything below the composition root receives its dependencies; it never
reaches out to build them.

## Dependency Injection Rule

Keep dependencies explicit and easy to substitute.

Prefer:

- constructor injection for adapter classes (repositories, auth services)
- explicit function parameters for stateless helpers
- factory functions in `infrastructure/config/` for assembly
- React Context to pass already-built dependencies to the view, and Hook
  arguments to pass them to use cases

Avoid:

- service locators that hide what a use case depends on
- module-level mutable singletons that carry Fabric session or user state
- direct imports of `RayfinClient`, `client.data`, or a concrete repository
  inside `usecase` or `domain`
- calling `new SomeRepository()` inside a use case or component

Introduce a DI container only when wiring complexity truly justifies it; manual
factories are the default.

## Client Singleton Rule

The `RayfinClient` is an expensive, stateless-per-user client. Build it once in
the composition root and share it by injection.

- construct it in `infrastructure/rayfin/` and hand it to the factories
- do not construct a second client per feature or per component
- if the template exposes a module-level `initRayfinClient()` / `getRayfinClient()`
  pair, treat those as an infrastructure detail wrapped by the facade, and still
  inject the facade rather than importing the getter across the app

## Runtime Safety Rule

Treat safety in this SPA mainly as async safety and session safety.

Use these rules:

- avoid module-level mutable state read or written across unrelated flows
- keep Fabric session, user context, and correlation metadata passed
  explicitly per call rather than stored in a global. In a use case, read the
  current actor from the auth context and pass it into writes and ports — never
  from a module-global holder:

  ```ts
  const { user } = useAuth();
  const actor = user?.email ?? user?.name ?? user?.id ?? 'system';
  await accounts.create({ ...fields, createdBy: actor, updatedBy: actor });
  await audit.record({ ...entry, actor });
  ```
- re-read the current session from the injected auth service or client when an
  operation needs it, instead of caching it in a module variable
- guard client-side concurrent flows against stale responses, such as multiple
  in-flight queries or rapid form retries (`AbortController`, request ids,
  current-phase guards)

## Lifetime Rule

Choose lifetimes deliberately.

Use this default:

- singleton lifetime for the expensive stateless `RayfinClient` facade
- effectively singleton (built once at the composition root) for repositories
  and the auth service, since they are stateless with respect to a single
  signed-in user
- transient lifetime for cheap stateless helpers, mappers, and pure adapters
- per-interaction lifetime for use-case state (owned by the React Hook and its
  reducer)

Avoid hidden global state that leaks across flows, and never share a single
mutable use-case state instance across unrelated screens to save allocation.

## Side Effect Rule

Make side effects explicit and keep them out of render and domain code.

- keep data mutations behind repository ports; call them from use-case handlers
- keep browser side effects (storage, clipboard, navigation) behind adapters or
  router hooks, invoked from use cases
- attach and detach external systems (subscriptions, timers, streams) only in
  Effects, and keep reducers pure

## Platform Workflow Rule

Schema migration and deployment are Rayfin platform workflows, not app code.

- schema changes flow through `rayfin up` / `rayfin up db apply`
- entity/`@role` definitions live in `rayfin/data`

Do not bury schema or deployment side effects inside components, use cases, or
adapters. **Defer these workflows to the `rayfin` skill and its MCP tools.**

## Migration Workflow Rule

When changing architecture terms or boundaries, prefer the lowest-friction
migration path.

Use this order:

1. choose the canonical new name or shape
2. perform a direct replacement across the codebase in one focused change
3. update tests, types, and documentation in the same change
4. retain a compatibility alias only when a real consumer cannot migrate in the
   same change set
5. remove the alias as soon as the blocking consumer migrates

Avoid parallel old and new names that drift, and deprecated names kept past
their stated removal point.
