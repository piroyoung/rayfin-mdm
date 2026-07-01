# View State And Handler Patterns

## When To Add A View State Module

Add a use-case module when at least one is true:

- the view has more than one piece of related state
- multiple handlers mutate that state
- async fetching, optimistic updates, or retries are involved
- derived values are non-trivial
- the same screen needs to be reused or tested with different data

For a single boolean toggle, keep state in the component.

## Refactoring A Fat Screen (Non-Negotiable)

When you touch an existing screen that mixes rendering with logic and inline
components, split it fully in the same change. These are basics, not optional
polish — a large or untested file is a reason to plan carefully, never a reason
to defer:

1. **Extract every inline top-level component into its own file** under
   `src/components/<feature>/` (one component per file), or `shared/` when it is
   feature-agnostic. Each becomes render-only: props, passed handlers, and
   ephemeral UI state only.
2. **Lift all view logic into the use case.** Put pure derivation (filtering,
   sorting, grouping, "best default", view models) in `selectors.ts`;
   interaction state and orchestration (create/update/status/merge/delete,
   toasts, reloads, confirm flows) in a page view-model Hook
   (`use-<feature>-page.ts`); form draft, validity, and derived previews in a
   form Hook (`use-<feature>-form.ts`). Put record-shape mapping in
   `domain/models`.
3. **Reduce the page to a thin container:** call the view-model Hook and wire
   its values and handlers into the extracted components. No filtering, no
   orchestration, no domain calls, no second component in the file.

A component may still hold genuinely ephemeral UI state (modal open, selected
radio, active tab) and may call its own view-model Hook — the logic lives in the
Hook, not in the component body. It must never hold business logic, data
derivation, data access, or a second top-level component.

## Suggested Structure

For a feature `todo`:

```text
src/usecase/todo/
  use-todo.ts
  state.ts
  reducer.ts
  selectors.ts
  handlers.ts
  types.ts
```

Use this responsibility split:

- `types.ts`: state-only types used by reducer, selectors, and handlers
- `state.ts`: initial state factory and state shape definition
- `reducer.ts`: reducer plus intent-named action types
- `selectors.ts`: derived values such as visible items, computed flags, view
  models (the Presenter output)
- `handlers.ts`: event-to-dispatch mapping and async command helpers that call
  repository ports through the use case
- `use-todo.ts`: the public Hook that receives ports and exposes the view model

For very small features, two files such as `use-feature.ts` and `state.ts`
are enough.

## Data Access From A Use Case

- The use case receives repository ports (and other ports) by injection —
  through its Hook argument list or a React Context supplied by the composition
  root.
- Handlers call those ports; they never import `client.data`, `RayfinClient`,
  or an auth SDK.
- Map port results into view state; expose a view model, not raw rows.

```ts
export function useTodo(deps: { todos: TodoRepository } = useDeps()) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const view = selectTodoView(state);

  const createTodo = useCallback(async (title: string) => {
    dispatch({ type: "todoCreateRequested" });
    try {
      const todo = await deps.todos.create({ title });
      dispatch({ type: "todoCreated", todo });
    } catch (err) {
      dispatch({ type: "todoCreateFailed", error: toMessage(err) });
    }
  }, [deps.todos]);

  return { view, createTodo /* … */ };
}
```

## Component Contract

Components should:

- accept props from the use case (via the page container)
- call passed handlers
- render JSX styled with Tailwind
- hold ephemeral UI state only when it is genuinely view-local

Components should not:

- import `client.data`, `RayfinClient`, or repository modules
- call ports or the Rayfin client directly
- own reducer logic or async orchestration
- own derived business view models
- encode business decisions — which actions a record's status allows, whether a
  lifecycle transition is legal, or how a metric maps to a band/tone. Call a
  domain predicate (`canSubmitAccount(account)`) or read a ready flag from the
  view-model; never re-derive the rule from status or score literals in JSX.

## No Business Decisions In The View

Even a render-only component must not *decide* business questions from raw
fields. Two leaks slip through most often, even after a screen looks "thin":

- **Status → action eligibility / lifecycle transitions.** A row that shows
  "Submit" only for `draft`/`rejected` and "Archive" only for `approved` is
  encoding the record's state machine in JSX. Put each rule in a domain
  predicate and let the component ask it:

  ```ts
  // domain/models/account.ts — the state machine lives here
  export function canSubmitAccount(a: Pick<Account, 'status'>): boolean {
    return a.status === 'draft' || a.status === 'rejected';
  }
  ```
  ```tsx
  // components/account/AccountsTable.tsx — asks, never re-encodes
  {canSubmitAccount(a) && <Button onClick={() => onSubmit(a)}>Submit</Button>}
  ```

- **Metric → band / tone / label thresholds.** `score >= 80 ? 'green' : …`
  inlined in a component is a business banding rule, and it gets copy-pasted to
  every place that shows the metric. Keep the thresholds in the domain and map
  the band to a UI tone in one shared presentation helper that every view
  reuses:

  ```ts
  // domain/quality.ts — thresholds are a domain rule
  export function qualityBand(score: number): 'high' | 'medium' | 'low' { … }
  ```
  ```ts
  // components/shared/qualityTone.ts — one band→tone map, reused everywhere
  export function qualityTone(score: number): BadgeTone {
    const band = qualityBand(score);
    return band === 'high' ? 'green' : band === 'medium' ? 'amber' : 'red';
  }
  ```

If a component needs a decision it imports a named domain predicate or a shared
presentation helper, or receives a ready boolean/enum from the view-model. It
never re-derives the rule from status or score literals.

## Component File And Styling Rules

Apply these in addition to the contract above:

- One React component per `.tsx` file. The file name (`PascalCase.tsx`) and the
  primary exported component name match exactly.
- Co-define the component's `Props` type in the same file.
- Style with Tailwind utility classes; do not use CSS Modules or inline `style`
  for static styling.

See [`component-and-styling-rules.md`](component-and-styling-rules.md) for the
full set of file-shape and Tailwind conventions.

## Action Granularity

Prefer descriptive action names that match user intent:

- `todoCreateRequested`
- `todoCreated`
- `completionToggled`
- `todoCreateFailed`

Avoid generic action names such as `SET_STATE`, `UPDATE_FIELD`, or `RESET` when
they hide what the user actually did.

## Selector Rule

Keep selectors pure and dependency-free.

Selectors should:

- take the state shape as input
- return derived values / the view model
- not call ports or the Rayfin client
- not trigger side effects
- not mutate state

When a derived value needs freshly fetched data, do the fetch in the use-case
Hook, not in a selector.

## Handler Rule

Handlers can:

- read current state through a passed selector or snapshot
- call async dependencies through injected ports
- dispatch reducer actions

Handlers should not:

- own UI rendering
- import React components
- write directly to module-level mutable state

## Hook Contract

A `use-<feature>.ts` Hook should:

- receive its dependencies (ports) through its argument list or React Context
- expose a small interface (a view model plus handlers) to the view layer
- combine state, selectors, and handlers into a single object
- own subscription cleanup

A view should be able to swap one Hook implementation, or one injected port
implementation, for another in tests without changing the component tree. This
is what makes the Strategy and Ports-and-Adapters patterns pay off.
