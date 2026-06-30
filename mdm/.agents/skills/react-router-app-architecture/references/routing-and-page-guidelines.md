# Routing And Page Guidelines

This app uses `react-router-dom` in **declarative mode**. There is no framework
mode, no FlatRoute file routing, and no loaders/actions. Routes are a component
tree in `src/App.tsx`; each screen is one page component in `src/pages/`.

## Route Table In `src/App.tsx`

- Wrap the app in providers and a router:
  `ToastProvider` > `BrowserRouter` > `Routes`.
- Use an `AuthGuard` wrapper to gate authenticated vs unauthenticated routes.
- Nest authenticated screens inside the `AppLayout` route and render them
  through `<Outlet/>`:

```tsx
<Routes>
  <Route path="/auth" element={<AuthGuard requireAuth={false}><AuthPage /></AuthGuard>} />
  <Route element={<AuthGuard requireAuth><AppLayout /></AuthGuard>}>
    <Route index element={<DashboardPage />} />
    <Route path="/products" element={<ProductsPage />} />
    {/* ...one <Route> per screen... */}
  </Route>
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

Keep `App.tsx` a declarative map: no data fetching, no business logic, no
Rayfin-client calls.

## Pages

- One page component per route, named `<Name>Page.tsx` under `src/pages/`.
- A page owns top-level composition and screen state; it loads data with
  `useAsyncData` + `src/services/*`, mutates via `src/services/*`, and renders
  through `src/components/*` + `ui.tsx`.
- Keep a page focused on one screen. If it grows several related state fields and
  handlers, extract a `src/hooks/use-<feature>.ts` view-state hook.

A page should not:

- call `client.data.*` or use raw `fetch`/GraphQL (go through services)
- contain reusable cross-screen logic that belongs in a hook or service
- redefine persisted shapes (use `src/domain/types.ts`)

## URL Shape

Prefer URLs that read like resources:

- collection screen: `/products`, `/customers`
- the index route (`/`) for the dashboard
- nested/detail screens by URL shape (`/products/:productId`) using
  `useParams()` when detail routes are added

Reserve verb-shaped paths for genuine operations that do not fit a resource
view; keep them rare. This app currently keeps actions (submit, approve, merge)
inside the collection screen via modals rather than dedicated routes — follow
that pattern unless a flow genuinely needs its own URL.

## Navigation And Params

- Use `<NavLink>` / `<Link>` for navigation and `useNavigate()` for programmatic
  redirects (e.g. post-auth).
- Use `useParams()` for dynamic segments and `useSearchParams()` for filter/sort
  state that should be shareable via URL.
- Use the router's redirect (`<Navigate>`) for auth gating and the catch-all,
  as in `AuthGuard`.

## Data Loading

- This is a client SPA: load data **in the page/hook** with `useAsyncData`
  calling a service, not in a route loader.
- Expose `reload()` from `useAsyncData` to refresh after a mutation instead of
  manually re-fetching.
- Handle `loading` / `error` / empty states in the page using `Spinner` and
  `EmptyState` from `ui.tsx`.
