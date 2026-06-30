# Verification Gates

## Use This Before Push

Run verification in this order:

1. Targeted Vitest specs for the changed behavior (`npm run test`)
2. Typecheck / build (`npm run build` -> `tsc -b && vite build`)
3. Lint (`npm run lint`)
4. Architecture drift checks (below)
5. UI check of the touched screen when UI is affected (Testing Library; a
   browser/Playwright pass for visual or responsive work — see
   [`ui-verification.md`](ui-verification.md))
6. Manual spot check of the touched flow

Do not push code that passes tests but breaks layer direction. Do not push
UI-affecting changes that were never checked rendered.

## Architecture Drift Checklist

Confirm all of the following:

- no `client.data.*`, `getRayfinClient()`, or raw `fetch`/GraphQL outside
  `src/services/*`
- no `RayfinClient` construction outside `src/services/rayfinClient.ts`
- no `rayfin/data/*` import outside `src/domain/types.ts`, and that import is
  type-only (a re-export), never a value import
- no React, `react-router-dom`, Rayfin client, or browser-API import inside
  `src/domain/*`
- no service, hook-with-data, or business rule imported into
  `src/components/ui.tsx`
- no Fluent UI, CSS Modules, or a second component/design library introduced
- no convenience top-level buckets such as `src/features/`, `src/modules/`,
  `src/utils/`, `src/api/`, `src/store/`, or `src/state/`
- no feature-specific business logic buried in a page that belongs in a service
  or domain module
- no data fetching or mutation inside a presentational component
- no module-level mutable state carrying request/user context beyond the
  intentional singletons (`rayfinClient`, `session`)
- no circular imports across page/hook/service boundaries
- no authorization enforced only in the UI without Rayfin `@role`/`policy`
  backing
- no persisted entity shape redefined by hand instead of re-exported from
  `rayfin/data/*`
- no boundary value (`Date`, enum token) leaking to the view unmapped — format
  with `src/lib/format.ts`, resolve enums with `tonedMeta`/`labelledMeta`
- no raw `unknown` flowing past its boundary without narrowing
- no `.tsx` under `src/components` or `src/pages` exporting more than one
  top-level component (except `src/components/ui.tsx`), and no file whose
  primary exported component name disagrees with the file name
- no inline `style={{ ... }}` used for static styling that belongs in a Tailwind
  utility class
- no new vague file names such as `helpers.ts`, `utils.ts`, or `common.ts`

## Useful Search Patterns

Use `rg` for quick audits:

```bash
# Data-client access must live only in src/services.
rg -n "client\.data\.|getRayfinClient\(" src/components src/pages src/hooks src/domain src/lib

# No raw fetch/GraphQL for data.
rg -n "\bfetch\(|gql`" src

# Rayfin entity classes only as type re-exports in src/domain/types.ts.
rg -n "rayfin/data/" src | rg -v "src/domain/types.ts"

# Domain stays free of React / router / client / browser.
rg -n "from ['\"](react|react-router-dom|@microsoft/rayfin)" src/domain

# No Fluent UI or CSS Modules.
rg -n "@fluentui|\.module\.css" src

# Convenience buckets that should not exist.
find src -maxdepth 1 -type d \( -name features -o -name modules -o -name utils -o -name api -o -name store -o -name state \) | sort

# One component per file (ui.tsx is the intentional exception).
rg -n "^export (default |const |function )" src/components src/pages

# Inline style — confirm each is a genuinely dynamic runtime value.
rg -n "style=\{\{" src/components src/pages

# Circular imports, if madge is available.
npx madge --circular src 2>/dev/null || true
```

Interpret results, do not blindly fail on matches. The point is to surface
suspicious files quickly.

## Push Gate Heuristic

Before `git push`, be able to state all of the following:

- pages/hooks own interaction logic; components are mostly props plus rendering
- all persistence and remote calls go through `src/services/*` (Rayfin client)
- `src/domain` holds invariants/types and imports no React, router, or client
- persisted shapes come from `rayfin/data/*` via `src/domain/types.ts`
- view state lives in the page or a `src/hooks/use-<feature>.ts` hook
- the Rayfin client and auth are wired once at bootstrap, not in the view
- validation lives at the correct layer rather than collapsing into one
- errors are mapped to user-facing messages at the page/hook edge
- authorization has a Rayfin policy home, not only a UI check
- file names reveal responsibility without `helpers`/`utils` fallbacks
- UI changes were checked rendered (Testing Library and/or a browser pass) at
  the relevant routes and viewports
- the changed area has tests or a clear reason none were added

If any statement is false, fix the architecture before pushing.
