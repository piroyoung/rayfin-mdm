# Project Bootstrap

Use this guide when starting a new Rayfin app from scratch.

## Baseline Assumptions

A Rayfin app uses this stack:

- TypeScript with TC39 Stage 3 decorators (`ESNext.Decorators` in tsconfig
  `lib`); never enable `experimentalDecorators` or `emitDecoratorMetadata`
- React 19 + Vite
- `react-router-dom` in declarative mode
- Tailwind CSS (v4 via `@tailwindcss/vite`)
- `@microsoft/rayfin-{core,client,data}` for the data model and typed client
- Fabric authentication (`@microsoft/rayfin-auth-provider-fabric`)
- Vitest + Testing Library for tests
- No app-owned server: the backend is the managed Rayfin/Fabric platform (DAB)

## Preferred Bootstrap Path

Scaffold with the Rayfin CLI. It generates the correct decorator tsconfig, the
Tailwind + Vite wiring, the `rayfin/` schema scaffold, `AGENTS.md`, and
`.mcp.json` for the `rayfin` MCP server.

```bash
npm create @microsoft/rayfin@latest my-app
cd my-app
npm run dev   # deploys to Fabric as configured, then starts Vite
```

Pick the template that fits (Blank App, Data App, Todo variants). Do not
retrofit a plain `create-vite` template — you would have to recreate the
decorator config, schema scaffold, and MCP wiring by hand.

Before writing entities or queries, consult the bundled `rayfin` skill / MCP
`search_docs('known limitations')` for platform constraints. Entity decorators,
`@role`/RLS, `rayfin.yml`, and deployment are **owned by the `rayfin` skill**,
not this one.

## Grow The Layers As Needed

Do not create every directory up front. Start from the template's `src/` and
introduce the clean layers as the first real feature needs them:

```text
src/
  main.tsx                     # composition root
  App.tsx                      # declarative routes + AuthGuard
  pages/
  components/<feature>/
  usecase/<feature>/
  domain/{models,repositories,ports}/
  infrastructure/{rayfin,data,auth,config}/
```

Map the template's starter files onto the layers as described in
[`layout-and-module-placement.md`](layout-and-module-placement.md): `services/`
→ `infrastructure/`, `hooks/` → `usecase/`.

## Wire The Composition Root First

Before layering features, establish the dependency-injection spine:

1. `infrastructure/config/` reads and validates `import.meta.env.VITE_*`
2. `infrastructure/rayfin/` builds the `RayfinClient` facade
3. `infrastructure/config/` factories assemble the auth service and
   repositories (Strategy: mock/local vs Fabric)
4. `src/main.tsx` calls the factories and injects the result through providers

This makes [`design-patterns.md`](design-patterns.md) and
[`dependency-injection-lifetime-and-side-effects.md`](dependency-injection-lifetime-and-side-effects.md)
concrete from the first screen.

## First Feature Checklist

For the first data-backed feature:

- domain model in `domain/models/`
- repository port in `domain/repositories/`
- Rayfin adapter in `infrastructure/data/` (uses `client.data.<Entity>`)
- use-case Hook in `usecase/<feature>/`
- presentational components in `components/<feature>/`
- a thin page container in `pages/` wired into `App.tsx`

## Platform And Deployment

Schema migration and deployment run through the Rayfin CLI (`rayfin up`,
`rayfin up db apply`) and are **owned by the `rayfin` skill**. Keep this skill
focused on the `src/` code architecture and hand platform work to the `rayfin`
skill and its MCP tools.
