# Layer Responsibilities

What belongs in each layer, from `App.tsx` and pages down through `domain` and
Rayfin infrastructure. Read this alongside
[`layout-and-module-placement.md`](layout-and-module-placement.md) for where
files live and
[`boundary-and-contract-rules.md`](boundary-and-contract-rules.md) for the
dependency direction these responsibilities must respect.

There is no server layer in a Rayfin app: the backend is the managed
Rayfin/Fabric platform, reached only through `src/infrastructure/`.

## Presentation Layer

### `src/App.tsx`

- Compose the declarative router (`<BrowserRouter>` / `<Routes>` / `<Route>`).
- Wire route-level guards such as `AuthGuard`.
- Mount page containers.

Do not fetch data, call repositories or the Rayfin client, or hold business
rules here. See
[`routing-and-navigation.md`](routing-and-navigation.md).

### `src/pages/`

- Provide one thin container per screen.
- Read route params (`useParams`) and navigation helpers.
- Compose feature components and the feature use-case Hook.
- Map use-case state into component props.

Do not call `client.data`, own reducer logic, or become the main state
container for reusable interactions.

### `src/components/<feature>/`

- Render UI from props with Tailwind styling.
- Hold tiny UI-local state only when it is truly view-local, such as popover
  open state, active tab index, focused element, or an uncontrolled input
  bridge.

Do not fetch data, own mutation orchestration, call repositories or the Rayfin
client, contain business rules, or introduce component-local `state/` or
`reducers/` directories.

### `src/components/shared/`

- Hold reusable presentational primitives.
- Keep these components styleable and composable.
- Treat `shared` as an extraction target, not the default starting location.

Promote a component to `shared` only when:

1. it is used or clearly about to be used across multiple features
2. the API can be expressed in generic UI terms rather than product vocabulary
3. it does not need feature-specific state or handlers
4. extraction reduces duplication without turning it into a configurable
   monster

Do not import feature use cases, own feature vocabulary, or hide data access in
`shared`.

## Use Case Layer

### `src/usecase/`

- Own screen-level state and event handlers.
- Assemble view models for components.
- Coordinate repository ports, navigation, optimistic UI, reducers, and derived
  state.
- Hold use-case-local mapping when that mapping is part of the interaction
  flow.
- Expose a stable interface for the view layer.

Prefer a feature directory when more than one file is needed for the same flow.

Call outbound work only through **ports** injected into the Hook or read from
Context. Never import `RayfinClient`, `client.data`, or an auth SDK here.

Reserve `store.ts` for cases where shared identity and lifecycle actually
matter across multiple sibling views (see
[`stateful-flow-compromises.md`](stateful-flow-compromises.md)). Do not default
to a store when a Hook plus reducer is enough.

### `src/usecase/auth/`

- Expose view-facing auth state (`user`, `isAuthenticated`, `signIn`,
  `signOut`) through a Hook and Context.
- Depend on an injected auth-service **port**, not on a concrete
  implementation. The composition root supplies the implementation.

## Domain Layer

### `src/domain/models/`

- Hold business/view concepts that enforce invariants or domain behavior.
- Use `class` when identity or invariants matter; otherwise `type` plus
  functions.
- Keep them free from React, the Rayfin SDK, browser APIs, and the
  `rayfin/data` decorator entities.

These are **not** the Rayfin `@entity` classes. Rayfin entities are persistence
schema owned by the platform; domain models are the app's own business/view
types. A repository maps between them when their shapes diverge.

Do not place `CreateXInput`, `UpdateXPayload`, or `ListXResult` types here
unless they are genuinely domain concepts, which is rare.

### `src/domain/value-objects/`

- Hold small immutable domain concepts with validation and equality semantics.
- Prefer validated factory functions or constructors over raw object literals.
- Keep them free from transport, framework, and persistence details.

### `src/domain/policies/`

- Hold business rules that span multiple models or require explicit decision
  logic.
- Prefer this directory when the code reads like a rule or policy statement.
- Encode authorization intent here even though Rayfin enforces `@role`
  server-side; the policy documents and centralizes the app's expectation.

### `src/domain/services/`

- Hold domain-level orchestration that is still infrastructure-free and not
  naturally owned by a single model or value object.
- Use sparingly; prefer `policies/` when the code is fundamentally a rule.

### `src/domain/repositories/`

- Define repository ports as interfaces or types.
- Describe what the use case needs from persistence in domain terms.
- Keep these contracts independent from Rayfin, `client.data`, and the query
  DSL.

Do not turn repository ports into generic request/response contract storage.

### `src/domain/ports/`

- Define non-persistence outbound ports the app depends on: auth service,
  clock, id generator, notifier, feature flags.
- Keep them small and intention-revealing.

## Infrastructure Layer

### `src/infrastructure/rayfin/`

- Own the `RayfinClient` singleton and its schema binding
  (`RayfinClient<TodoAppSchema>`).
- Expose a small facade so the rest of infrastructure depends on a narrow
  surface, not on the full SDK.
- Read the Fabric session here when adapters need it.

This is one of the only places allowed to import `@microsoft/rayfin-client`.

### `src/infrastructure/data/`

- Hold repository implementations that satisfy `domain/repositories/` ports.
- Use the typed `client.data.<Entity>` internally
  (`.select().where().orderBy().execute()`, `.findById()`, `.create()`,
  `.update()`, `.delete()`).
- Map Rayfin entity/query shapes to domain/view models at this boundary; scope
  reads and writes by `user_id` / `claims.sub`.
- Keep implementations stateless with respect to request identity; take the
  client and session through the constructor.

See [`rayfin-data-access.md`](rayfin-data-access.md) for the full data-access
rules.

### `src/infrastructure/auth/`

- Hold auth-service implementations that satisfy the `domain/ports/` auth port.
- Provide at least the strategies the project needs, such as a mock/local-dev
  service and the Fabric-brokered service.
- Accept the RayfinClient and config through the constructor.

### `src/infrastructure/browser/`

- Hold browser-only integrations such as `localStorage`, `sessionStorage`,
  clipboard, media query, `BroadcastChannel`, or `IntersectionObserver`
  adapters.
- Keep direct DOM and browser API calls here unless the logic is tiny and
  strictly component-local.

### `src/infrastructure/config/`

- Read environment configuration (`import.meta.env.VITE_*`) and expose it as a
  typed, validated object.
- Hold factory functions that assemble adapters for the composition root
  (`create-rayfin-client`, `create-auth-service`, `create-repositories`).
- Treat `import.meta.env` values as `unknown` until validated. Publishable keys
  (`pk-*`) are client-safe; never place service secrets here.
