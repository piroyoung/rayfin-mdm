# Project Bootstrap

Bootstrap is owned by **Rayfin**, not by this skill. Use this guide to start a
new app or understand how this one is wired; defer to the `rayfin` skill for the
authoritative workflow.

## Baseline Stack (this app)

- TypeScript with TC39 Stage 3 decorators
  (`lib` includes `ESNext.Decorators`; never enable `experimentalDecorators`)
- React 19 + Vite
- `react-router-dom` v7 in declarative mode (no framework mode / FlatRoute)
- TailwindCSS v4 via `@tailwindcss/vite` (no Fluent UI, no CSS Modules)
- Rayfin client + auth (`@microsoft/rayfin-client`, `-auth-provider-fabric`,
  `-core`, `-data`) with the `rayfin/` project as the data source of truth
- Vitest + Testing Library for tests
- Path alias `@/*` -> `src/*`

## Preferred Bootstrap Path

For a new app, prefer the Rayfin template generator — it produces the correct
tsconfig, `rayfin/` project, auth wiring, and Vite setup:

```bash
npm create @microsoft/rayfin@latest <name>
```

Do not scaffold with `create-react-router`/framework mode or hand-build a server
layer; this architecture is a Rayfin-backed client SPA.

## Scripts (from this app's `package.json`)

| Command | Description |
|---------|-------------|
| `npm run dev` | `rayfin up --exclude-services staticHosting && vite` (deploy backend, start dev server) |
| `npm run build` | `tsc -b && vite build` |
| `npm run build:fabric` | Build for Fabric deployment |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run rayfin:up` | Deploy app to Fabric |

`predev`/`prebuild` run `rayfin env --framework vite` to materialize env.

## Architecture-Aligned Directories

Create only what the first feature needs, following
[`layout-and-module-placement.md`](layout-and-module-placement.md):

```text
src/App.tsx        src/main.tsx     src/main.css
src/components/     src/components/ui.tsx
src/pages/          src/hooks/
src/services/       src/domain/      src/lib/
```

Add files to these existing owners rather than introducing new top-level
buckets.

## Data, Auth, Schema, Deploy

These are Rayfin concerns — follow the `rayfin` skill:

- entities/schema live in `rayfin/data/*`; the React layer consumes their types
  via `src/domain/types.ts`
- the Rayfin client is configured once in `src/services/rayfinClient.ts` /
  `bootstrap.ts`
- auth is wired via `AuthContext` + the auth services
- deploy and apply schema with `rayfin up`

## Bootstrap Verification

Before feature work, confirm:

- `npm run dev` starts (backend deploys, Vite serves)
- `npm run lint`, `npm run build` (`tsc -b`), and `npm run test` pass
- the standard mobile viewport meta tag is present in `index.html`
- routes are declared in `src/App.tsx`, with pages under `src/pages/`
- no component/page imports the Rayfin client directly (only `src/services/*`)
- Tailwind is wired (`src/main.css` + `@tailwindcss/vite`) and `ui.tsx`
  primitives are available
