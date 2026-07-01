# Routing And Navigation

Rayfin apps route with `react-router-dom` in **declarative mode**: a
`<BrowserRouter>` wrapping `<Routes>`/`<Route>` composed in `App.tsx`, with a
thin container per screen under `src/pages/`. There is no framework-mode file
routing, no `flatRoutes()`, and no loaders/actions — data is loaded inside
use-case Hooks through repository ports.

## Route Composition

Compose all routes in `src/App.tsx`. Keep it declarative and thin: guards,
route table, and mounts only.

```tsx
// src/App.tsx
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={<AuthGuard requireAuth={false}><AuthPage /></AuthGuard>}
        />
        <Route
          path="/"
          element={<AuthGuard requireAuth><TodoPage /></AuthGuard>}
        />
        <Route path="/todos/:todoId" element={<AuthGuard requireAuth><TodoDetailPage /></AuthGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

`App.tsx` may define a small `AuthGuard` helper, but its exported top-level
component is `App`. If the guard grows, move it to
`src/usecase/auth/` and keep `App.tsx` as composition only.

## Page Containers

Each screen is one thin container in `src/pages/`, named `<Feature>Page.tsx`.

A page container should:

- read route params with `useParams` and navigation with `useNavigate`
- call the feature use-case Hook
- map use-case state into feature-component props
- render feature and shared components

A page container should not:

- call `client.data` or a repository directly
- own reducer logic or business rules
- become a reusable state container

```tsx
// src/pages/TodoPage.tsx
export function TodoPage() {
  const { view, createTodo, toggleTodo, removeTodo } = useTodo();
  return (
    <TodoScreen
      view={view}
      onCreate={createTodo}
      onToggle={toggleTodo}
      onRemove={removeTodo}
    />
  );
}
```

## URL Shape

Prefer resource-shaped URLs:

- collection: `/todos`
- single resource: `/todos/:todoId`
- sub-collection: `/todos/:todoId/comments`
- single sub-resource: `/todos/:todoId/comments/:commentId`

Reserve verb-shaped paths for genuine non-CRUD operations (`/imports/:id/run`)
and keep them rare. Map each meaningful URL to one page container.

## Navigation And Params

- Read params with `useParams()` inside the page container and pass primitives
  into use cases; do not read params deep in components.
- Navigate with `useNavigate()` for imperative moves and `<Navigate>` for
  declarative redirects (e.g. inside a guard).
- Reflect shareable UI state (selected tab, filter) in the URL with
  `useSearchParams` when it should survive reload or be linkable; keep purely
  ephemeral UI state in the component.
- Do not duplicate the current route or auth-redirect state in component state
  when the router already owns it.

## Auth Gating

- Resolve authentication through the injected auth service (via the auth
  Context/Hook), and gate routes with a single `AuthGuard` at the route
  boundary.
- Keep the guard declarative: show a loading state while the session resolves,
  redirect unauthenticated users to `/auth`, and redirect authenticated users
  away from `/auth`.
- Keep authorization *intent* (who may do what) in use cases and domain
  policies; Rayfin enforces record access server-side via `@role`.

## Anti-Patterns

- `flatRoutes()`, framework-mode routes, or `app/routes/` file routing
- loaders/actions/fetchers (declarative mode does not use them here)
- data fetching inside a route element or page container instead of a use case
- a page container calling `client.data` or a repository directly
- more than one top-level component exported from a page file
- redirect/auth logic duplicated across many pages instead of one `AuthGuard`
