# Client Layer Responsibilities

This covers the React-facing layers under `src/`: pages, components, the shared
`ui.tsx` primitives, hooks, and `lib`. For data access and domain, see
[`data-and-domain-layer-responsibilities.md`](data-and-domain-layer-responsibilities.md).

## `src/App.tsx` (route table)

- Declare routes with `react-router-dom` (`<BrowserRouter>`, `<Routes>`,
  `<Route>`), and wrap them with the app-wide providers (`ToastProvider`) and
  the `AuthGuard`.
- Map URLs to page components and compose layout routes via `<Outlet/>`.

Do not put business rules, data fetching, or Rayfin-client calls here. Keep it a
declarative route map.

## `src/pages/<Name>Page.tsx`

- Own the top-level composition for one route screen.
- Own screen-level state and handlers (or delegate to a `src/hooks/use-<x>.ts`
  hook), load data via `useAsyncData` + `src/services/*`, and surface feedback
  via `useToast`.
- Render through `src/components/*` and `src/components/ui.tsx` primitives.

Do not call `client.data.*` directly, hide reusable cross-screen logic only in a
page, or duplicate the `ui.tsx` primitives.

## `src/components/<Name>.tsx`

- Render UI from props.
- Hold tiny UI-local state only when it is truly view-local (popover open state,
  active tab index, focused element, uncontrolled input bridge).

Do not fetch data, own mutation orchestration, build service payloads, contain
business rules, or introduce component-local `state/`/`reducers/` directories.

## `src/components/ui.tsx` (shared primitives)

- Hold reusable, feature-agnostic presentational primitives styled with Tailwind
  (`Badge`, `Button`, `Tooltip`, `Spinner`, `Card`, `PageHeader`, `StatCard`,
  `EmptyState`, `Field`, `Input`, `Textarea`, `Select`, `Modal`,
  `ConfirmDialog`, `QualityBadge`, `ProgressBar`).
- This is the single deliberate multi-export component module; treat it as an
  extraction target, not the default home for new feature views.

Promote a component into `ui.tsx` only when:

1. it is used or clearly about to be used across multiple screens
2. its API is expressible in generic UI terms, not product vocabulary
3. it does not need feature-specific state, handlers, or services

Do not import services, hooks-with-data, or domain business rules into `ui.tsx`;
a primitive that depends on domain display metadata (e.g. `QualityBadge` reading
`qualityBand`) is acceptable, but data fetching is not.

## `src/hooks/`

- Own reusable React behavior and screen-level view state.
- `useAsyncData` runs an async loader, tracks `{ data, loading, error, reload }`,
  and cancels stale loads — use it for read-and-reload flows.
- `useToast` provides transient feedback; `AuthContext` exposes auth state.
- Extract a `use-<feature>.ts` hook here when a screen's state + handlers +
  async flow grow past a simple `useState` + `useAsyncData` pair, or when two
  screens share the flow.

A hook may call `src/services/*` and compose other hooks. It must not render JSX
or import presentational components. See
[`view-state-and-handler-patterns.md`](view-state-and-handler-patterns.md).

## `src/lib/`

- Hold framework-agnostic utilities with no app-state and no React
  (`cn()` class merge, money/date/relative formatting, `initials`).
- Keep these pure and dependency-light so any layer can import them.

Do not put data access, React hooks, or domain business rules here.

## Browser-only integrations

This app needs few browser adapters. When one is genuinely required (clipboard,
media query, storage), wrap it in a small hook under `src/hooks/` or a pure
helper in `src/lib/` rather than scattering direct DOM calls through components.
Tiny, strictly component-local DOM use (e.g. an `Escape`-key listener inside
`Modal`) may stay in the component.
