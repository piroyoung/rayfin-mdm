# Design Patterns

This is the design-pattern core of the skill. It defines the patterns every
Rayfin app must use to keep the Rayfin SDK behind clean boundaries, and it says
exactly where each pattern lives. Read it before wiring dependencies, adding
data access, or introducing an auth flow.

The patterns compose into one rule: **the app depends on ports; adapters depend
on Rayfin; the composition root wires them together.**

```text
pages/components ──▶ use case ──▶ port (domain)
                                    ▲
                                    │ implements
                          adapter (infrastructure) ──▶ RayfinClient / browser
        main.tsx (composition root) builds adapters and injects them
```

## 1. Composition Root

**Intent.** Assemble the entire object graph once, at the outermost edge, so no
inner module has to construct its own dependencies.

**Where.** `src/main.tsx`, using factories from
`src/infrastructure/config/`.

```tsx
// src/main.tsx
const config = readConfig(import.meta.env);          // validated config
const client = createRayfinClient(config);           // Facade + singleton
const authService = createAuthService(client, config); // Strategy chosen here
const repositories = createRepositories(client);     // Factory

createRoot(document.getElementById("root")!).render(
  <AppProviders authService={authService} repositories={repositories}>
    <App />
  </AppProviders>,
);
```

**Anti-patterns.** Building the client or repositories inside a component, a
use case, or a module singleton; reading `import.meta.env` outside
`infrastructure/config/`.

## 2. Dependency Injection

**Intent.** Make every dependency explicit and substitutable.

**Where.** Constructors for adapter classes; Hook arguments for use cases;
React Context for view-facing dependencies. Details in
[`dependency-injection-lifetime-and-side-effects.md`](dependency-injection-lifetime-and-side-effects.md).

```ts
// use case receives ports, never concrete clients
export function useTodo(deps: { todos: TodoRepository }) { /* ... */ }
```

**Anti-patterns.** Service locators; `new SomeRepository()` inside a use case;
importing `getRayfinClient()` across the app instead of injecting a facade.

### Dependency Context (how use cases receive ports)

Provide the assembled `AppDependencies` to the React tree through **one**
Context, and read it in use cases with a `useDependencies()` hook. This is the
concrete home of "inject ports through one Context", and it lives in `src/di/`.

```ts
// src/di/dependencies.ts
export interface AppDependencies {
  accounts: AccountRepository;
  audit: AuditLog;
  // add a port here as each feature migrates onto the layered architecture
}
```

```tsx
// src/di/DependenciesProvider.tsx
const DependenciesContext = createContext<AppDependencies | null>(null);

export function DependenciesProvider({ deps, children }: {
  deps: AppDependencies;
  children: ReactNode;
}) {
  return (
    <DependenciesContext.Provider value={deps}>
      {children}
    </DependenciesContext.Provider>
  );
}

export function useDependencies(): AppDependencies {
  const deps = useContext(DependenciesContext);
  if (!deps) {
    throw new Error('useDependencies must be used within a DependenciesProvider');
  }
  return deps;
}
```

```ts
// a use case reads its ports from the context
export function useAccounts() {
  const { accounts, audit } = useDependencies();
  // ...
}
```

The composition root builds `AppDependencies` and wraps the app in
`DependenciesProvider`; nothing below constructs its own ports. Live user
context (the current actor) is NOT stored in this graph — read it from the auth
context inside the use case and pass it explicitly per call.

## 3. Ports And Adapters (Hexagonal)

**Intent.** Invert dependencies so the app owns the interfaces and the Rayfin
SDK sits behind them.

**Where.** Ports in `src/domain/` (`repositories/`, `ports/`); adapters in
`src/infrastructure/`.

```ts
// src/domain/ports/auth-service.ts  (port)
export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  signIn(): Promise<AuthUser>;
  signOut(): Promise<void>;
}
```

```ts
// src/infrastructure/auth/rayfin-auth-service.ts  (adapter)
export class RayfinAuthService implements AuthService { /* uses RayfinClient */ }
```

**Anti-patterns.** A use case importing the Rayfin SDK directly; a port that
leaks `client.data` types or the query DSL into its signature.

## 4. Repository

**Intent.** Give the app a persistence-shaped interface in domain terms, and
keep the typed `client.data.<Entity>` calls in one place.

**Where.** Port in `src/domain/repositories/`; implementation in
`src/infrastructure/data/`. Full rules in
[`rayfin-data-access.md`](rayfin-data-access.md).

```ts
// src/domain/repositories/todo-repository.ts  (port)
export interface TodoRepository {
  list(): Promise<Todo[]>;
  create(input: NewTodo): Promise<Todo>;
  setCompleted(id: string, isCompleted: boolean): Promise<Todo>;
  remove(id: string): Promise<void>;
}
```

```ts
// src/infrastructure/data/rayfin-todo-repository.ts  (adapter)
export class RayfinTodoRepository implements TodoRepository {
  constructor(private readonly client: RayfinClientFacade) {}
  async list(): Promise<Todo[]> {
    const rows = await this.client.data.Todo
      .select(["id", "title", "isCompleted", "createdAt"])
      .orderBy({ createdAt: "desc" })
      .execute();
    return rows.map(toTodo); // Mapper
  }
}
```

**Anti-patterns.** Calling `client.data` from a use case or component; returning
raw Rayfin entity objects across the boundary; hand-writing `fetch`/GraphQL.

## 5. Strategy

**Intent.** Swap an implementation by environment or context without changing
callers.

**Where.** Alternative adapters in `src/infrastructure/`, chosen in the
composition root.

```ts
// src/infrastructure/config/create-auth-service.ts
export function createAuthService(client: RayfinClientFacade, config: Config): AuthService {
  return config.localDev
    ? new MockAuthService(client)      // local email/password
    : new RayfinAuthService(client, config.fabric); // Fabric brokered auth
}
```

Use the same shape for data (an in-memory repository for local dev vs a
Rayfin-backed repository). Both implement the same port.

**Anti-patterns.** `if (localDev)` branches scattered through use cases or
components; environment checks outside `infrastructure/config/`.

## 6. Facade

**Intent.** Expose a small, stable surface over the `RayfinClient` so the rest
of infrastructure depends on a narrow contract.

**Where.** `src/infrastructure/rayfin/`.

```ts
// src/infrastructure/rayfin/client.ts
export interface RayfinClientFacade {
  readonly data: RayfinClient<TodoAppSchema>["data"];
  getSession(): RayfinSession;
}
```

**Anti-patterns.** Passing the full `RayfinClient` everywhere; importing
`@microsoft/rayfin-client` outside `infrastructure/`.

## 7. Presenter / View Model

**Intent.** Keep components render-only by producing view-ready props in the
use case.

**Where.** `src/usecase/<feature>/` (selectors + the `use-<feature>` Hook);
consumed by `src/components/<feature>/`.

```ts
// selectors.ts — pure, derives a view model from state
export const selectTodoView = (s: TodoState): TodoView => ({
  items: s.todos.filter(matchesFilter(s.filter)),
  remaining: s.todos.filter((t) => !t.isCompleted).length,
  isEmpty: s.todos.length === 0,
});
```

**Anti-patterns.** Components deriving business view state, filtering, or
sorting inline; passing raw repository results into deep component trees.

## 8. Reducer / State Machine

**Intent.** Model async interaction phases explicitly instead of scattering
boolean flags.

**Where.** `src/usecase/<feature>/reducer.ts` + `state.ts`.

```text
idle -> loading -> ready
ready -> saving -> ready
saving -> failed
```

Use descriptive, intent-named actions (`todoCreated`, `completionToggled`,
`loadFailed`), not `SET_STATE`. See
[`view-state-and-handler-patterns.md`](view-state-and-handler-patterns.md).

**Anti-patterns.** Parallel `isLoading`/`isError`/`isSaving` booleans that can
contradict; reducers that call repositories or mutate external state.

## 9. Factory

**Intent.** Encapsulate multi-step assembly of adapters and inject the result.

**Where.** `src/infrastructure/config/` (`create-rayfin-client.ts`,
`create-auth-service.ts`, `create-repositories.ts`).

```ts
export function createRepositories(client: RayfinClientFacade) {
  return { todos: new RayfinTodoRepository(client) } as const;
}
```

**Anti-patterns.** Inlining assembly logic into `main.tsx` until it becomes a
tangle; factories that read env directly instead of receiving validated config.

## 10. Mapper / Anti-Corruption Layer

**Intent.** Translate Rayfin entity shapes and Fabric `claims` into the app's
domain/view terms at the boundary, so Rayfin's model never leaks inward.

**Where.** `src/infrastructure/data/` (next to the repository that uses it).

```ts
// map a Rayfin Todo row (DTO) into the domain/view model
export const toTodo = (row: TodoRow): Todo => ({
  id: row.id,
  title: row.title,
  isCompleted: row.isCompleted,
  createdAt: new Date(row.createdAt),
});
```

Keep the mapping shallow for simple screens — when the Rayfin row and the view
model are identical, the "mapper" is the identity and you may return the row
typed as the domain model. Introduce an explicit mapper only when the shapes
genuinely diverge (renames, `Date` conversion, computed fields, claim
extraction). Do not over-map.

**Anti-patterns.** Domain models importing `rayfin/data` entities; `claims` or
`Date` flowing into use cases unconverted; a mapper that also performs a query
or a side effect.

## Pattern Selection Cheatsheet

- new data need → **Repository** port + adapter (+ **Mapper** if shapes differ)
- new outbound dependency (auth, clock, notifier) → **Port + Adapter**
- environment/context variation → **Strategy** chosen in the composition root
- wiring it all up → **Composition Root** + **Factory** + **Dependency
  Injection**
- keeping components dumb → **Presenter / View Model** via use-case selectors
- async interaction with phases → **Reducer / State Machine**
- narrowing the SDK surface → **Facade**

If a change does not clearly need a pattern, do not add one. Patterns exist to
protect boundaries, not to add indirection for its own sake.
