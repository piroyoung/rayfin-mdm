# Layout And Module Placement

## Canonical Layout

The canonical directory tree is defined in the **Canonical Layout** section of
[`SKILL.md`](../SKILL.md). Treat that tree as the single source of truth, place
every file in its canonical owner under `src/`, and organize directories by
responsibility, not by team preference or historical drift.

The app root is `src/` (the Rayfin template convention, aliased as `@/*`), not
`app/`. Because `@/*` points at `src/*`, the layers live **directly under
`src/`** — `src/domain`, `src/usecase`, `src/infrastructure`, `src/di`,
`src/components`, `src/pages` — matching the template's flat `src/<layer>`
convention. `src/lib/` is reserved for tiny shared utilities, not a layer
prefix; never create a parallel tree such as `src/lib/domain` when `src/domain`
is the root, and keep every import path consistent with the alias
(`@/domain/...`, not `@/lib/domain/...`). There is no server layer: the backend
is the Rayfin/Fabric platform, reached only through `src/infrastructure/`.

## Mandatory Placement Preflight

Before implementing, list every file you expect to create, move, or extract and
assign its exact target path.

Use this rule:

1. every file must have one canonical owner before code is written
2. if a file has no clear owner, revise the placement plan first
3. do not create a new directory just because the first idea does not fit the
   layout

Treat convenience directories such as `src/features/`, `src/modules/`,
`src/hooks/`, `src/services/`, `src/utils/`, `src/types/`, or `src/store/` as
layout drift unless an explicit migration plan says otherwise.

## Mapping The Rayfin Template Onto The Layers

The `npm create @microsoft/rayfin` template ships a flat starter structure.
Map it onto the clean layers as you grow the app:

- template `src/services/rayfinClient.ts` → `src/infrastructure/rayfin/`
- template `src/services/*AuthService.ts` (+ `IAuthService`) →
  auth port in `src/domain/ports/` + implementations in
  `src/infrastructure/auth/`
- template `src/services/todos.ts` → repository port in
  `src/domain/repositories/` + implementation in
  `src/infrastructure/data/`
- template `src/services/bootstrap.ts` → composition root in `src/main.tsx`
  plus factories in `src/infrastructure/config/`
- template `src/hooks/AuthContext.tsx` → `src/usecase/auth/`
- template `src/pages/`, `src/components/` → unchanged in spirit, kept thin

The platform files under `rayfin/` (`data/*.ts` entities, `rayfin.yml`) stay
where they are and are owned by the `rayfin` skill, not this one.

### Staged Migration Of An Existing App

An app that grew without this skill (flat `src/services/`, `src/hooks/`, and a
`getRayfinClient()` service-locator) migrates one feature at a time — you do not
rewrite it all at once:

1. Keep `bootstrapAuth()` / `initRayfinClient()` as-is. In `src/main.tsx`, after
   auth is bootstrapped, build the dependency graph from the **same** client
   (`createDependencies(getRayfinClient())`) and wrap the tree in
   `DependenciesProvider`. Reuse the one client — do not initialize a second.
2. Migrate a single feature **fully**: extract its repository port + Rayfin
   adapter, move its orchestration into a `usecase` Hook, split every inline
   component in its page into its own file under `src/components/<feature>/`,
   lift all view logic into the use case (view-model Hook + `selectors.ts`), and
   reduce the page to a thin container.
3. Leave the legacy `services/*.ts` in place for features not yet migrated; keep
   them compiling by re-exporting any moved concepts (e.g. `accountName`,
   `AccountInput`) from their new `domain/` home.
4. Replace module-global request/user state (e.g. a `session.ts` `actor`) with
   context passed explicitly — read the actor from the auth context in the use
   case and pass it into writes and the audit port.
5. Repeat feature by feature; delete a legacy service only when its last
   consumer has migrated.

**Staging is breadth, not depth.** "One feature at a time" chooses *which*
feature to migrate — it never licenses a half-migrated feature. Every feature
you touch is finished to the full architecture in that pass: one component per
file, shared/feature components extracted, the page reduced to a thin container,
and zero business logic left in the page or its components. These fundamentals
are basics — plan the split when a screen is large or untested, but complete
them in the same change; never defer them as "too risky".

Keep the build green (`tsc -b`, tests, lint) after each feature.

## Feature Presentational Component Placement

Keep feature-specific presentational components in `src/components/<feature>/`.

Preferred shape:

```text
src/components/todo/
  TodoList.tsx
  TodoListItem.tsx
  TodoComposer.tsx
```

One component per `.tsx` file, and the file name matches the exported
component name. Style with Tailwind utility classes. See
[`component-and-styling-rules.md`](component-and-styling-rules.md) for the full
set of component and styling rules.

Use `src/components/shared/` only when the component is feature-agnostic,
reusable across features, and expressed in generic UI language instead of
product vocabulary.

## State Module Placement

For non-trivial client interaction flows, create a feature directory under
`src/usecase/` and colocate the state modules there.

Preferred shape:

```text
src/usecase/todo/
  use-todo.ts
  state.ts
  reducer.ts
  selectors.ts
  handlers.ts
  types.ts
```

Use these files by responsibility:

- `state.ts`: state shape and initial state
- `reducer.ts`: reducer function and action definitions
- `selectors.ts`: derived read models and computed flags
- `handlers.ts`: event-to-dispatch mapping or async command helpers (calling
  repository ports through the use case)
- `use-<feature>.ts`: public Hook or controller entry point

Do not create horizontal buckets such as `src/state/`, `src/reducers/`,
`src/stores/`, `src/handlers/`, or `src/usecase/state/`.

## Domain And Infrastructure Placement

- Ports (interfaces the app depends on) live in `src/domain/`:
  persistence ports in `repositories/`, other outbound ports (auth, clock,
  notifier) in `ports/`.
- Adapters (concrete implementations) live in `src/infrastructure/`:
  the RayfinClient facade in `rayfin/`, repository implementations in `data/`,
  auth-service implementations in `auth/`, browser adapters in `browser/`, env
  readers and factories in `config/`.
- Domain models, value objects, and policies live in `src/domain/` and never
  import React, the Rayfin SDK, browser APIs, or the `rayfin/data` decorator
  entity **values**; a type-only reference to an entity's instance shape is
  allowed.

## No Generic Common Bucket

Do not add a catch-all common directory.

Prefer this order instead:

1. Keep code with the use case, domain, or infrastructure module that owns it.
2. Duplicate a tiny utility once if the reuse pattern is still uncertain.
3. Extract only after the abstraction is clearly stable.

## Feature Public API Rule

Treat each feature directory as having a public entry point and private
internals.

Prefer:

- `usecase/<feature>/use-<feature>.ts` as the public use-case entry
- one primary port or adapter module as the public data entry

Avoid importing another feature's private files such as `reducer.ts`,
`selectors.ts`, `handlers.ts`, or `state.ts`.

## Circular Dependency Rule

Treat import cycles as architecture violations, especially inside feature
internals.

Common bad cycles:

- `selectors -> handlers -> reducer -> selectors`
- `page -> usecase -> page`
- `infrastructure -> usecase -> infrastructure`

When a cycle appears:

1. move shared pure logic to a lower-level leaf module
2. invert the dependency through a port or parameter
3. merge modules back together if the split was artificial

## TS And TSX Naming Rule

Keep file names explicit enough that responsibility is visible before opening
the file.

Use these defaults:

- page containers: `PascalCase.tsx` ending in `Page`, such as `TodoPage.tsx`
- React component files: `PascalCase.tsx`
- non-component modules: responsibility-based `kebab-case.ts`, such as
  `todo-repository.ts`

For component files:

- one React component per `.tsx` file
- the primary exported component name matches the file name exactly
  (`TodoList.tsx` exports `TodoList`)
- use `.tsx` only when the file renders JSX
- keep feature-specific views under `src/components/<feature>/` until they
  prove generic enough for `src/components/shared/`

See [`component-and-styling-rules.md`](component-and-styling-rules.md) for the
full component and Tailwind conventions.

Inside a feature directory, short file names such as `state.ts`, `reducer.ts`,
`selectors.ts`, `handlers.ts`, and `types.ts` are acceptable because the
directory already provides the feature context.

Avoid vague file names such as `helpers.ts`, `utils.ts`, `common.ts`,
`misc.ts`, `temp.ts`, or `new.ts`.

Use `index.ts` only when it is a deliberate public entry point.

## Typical Flow

For creating a todo:

1. `App.tsx` mounts a route to a thin `src/pages/TodoPage.tsx`.
2. A client use-case Hook (`src/usecase/todo/use-todo.ts`) owns the draft
   state and handlers.
3. A presentational component (`src/components/todo/TodoComposer.tsx`) renders
   fields and calls passed handlers.
4. The handler calls a repository port through the use case.
5. The repository implementation (`src/infrastructure/data/todo-repository.ts`)
   runs `client.data.Todo.create(...)` and maps the result to a view model.

Each step should only depend on the next layer inward or on a port explicitly
created for that boundary.
