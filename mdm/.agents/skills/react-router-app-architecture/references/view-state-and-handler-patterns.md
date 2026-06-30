# View State And Handler Patterns

## When To Add A View-State Hook

Keep simple screen state in the page with `useState` + `useAsyncData`. Extract a
`src/hooks/use-<feature>.ts` hook when at least one is true:

- the screen has several related pieces of state that change together
- multiple handlers mutate that state
- async fetching plus optimistic updates or retries are involved
- derived values are non-trivial
- the same flow needs to be reused or tested across screens

For a single boolean toggle or a one-off modal flag, keep it in the component.

## Suggested Shape

Most screens in this app follow a lightweight pattern inside the page:

```tsx
const { data, loading, error, reload } = useAsyncData(() => listProducts());
const toast = useToast();
const [draft, setDraft] = useState<ProductInput>(EMPTY);

async function onSave() {
  try {
    await createProduct(draft);
    toast.success('Saved');
    reload();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Save failed');
  }
}
```

When this grows, lift it into `src/hooks/use-products.ts` that returns a small
interface (`{ products, loading, error, draft, setDraft, save, remove }`) so the
page becomes mostly rendering.

## Component Contract

Components should:

- accept props (data + handlers) from the page or hook
- call passed handlers
- render JSX with Tailwind + `ui.tsx` primitives
- hold ephemeral UI state only when genuinely view-local

Components should not:

- import services or call `client.data.*`
- own async orchestration or audit side effects
- own derived business view models

## Handler Rules

Handlers (in the page or hook) can:

- read current state
- call services (`src/services/*`) for data and side effects
- update state and trigger `reload()`
- surface success/error via `useToast`

Handlers should not:

- own rendering or import presentational components
- write to module-level mutable state
- embed business invariants that belong in `src/domain`

## Derived State

Compute derived/filtered/sorted view data with `useMemo` from the loaded data
and current filters, keeping it pure. When a derived value needs fresh data,
fetch through a service in the hook, not inside the memo.

## Naming

Prefer handler/intent names that match what the user did (`onApprove`,
`onMergeSelected`, `onSubmitChangeRequest`) over generic `onClick1`/`setX`.

## Hook Contract

A `use-<feature>.ts` hook should:

- accept its dependencies through arguments or Context
- call services and compose `useAsyncData` / `useToast`
- combine state, derived values, and handlers into one small object for the view
- own effect cleanup (preserve `useAsyncData`'s stale-load cancellation)
- never render JSX or import components

A page should be able to swap the hook implementation in tests without changing
the component tree.
