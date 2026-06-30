# Layout And Dependency Rules Overview

This topic is split across focused references. Use the matching one instead of
reading one oversized file.

- [`layout-and-module-placement.md`](layout-and-module-placement.md): canonical
  `src/` directory layout, page/component/hook/service placement, naming, and
  typical flow
- [`client-layer-responsibilities.md`](client-layer-responsibilities.md): what
  belongs in pages, components, `ui.tsx`, hooks, and lib
- [`data-and-domain-layer-responsibilities.md`](data-and-domain-layer-responsibilities.md):
  what belongs in `src/services` (Rayfin data access) and `src/domain`
- [`boundary-and-contract-rules.md`](boundary-and-contract-rules.md): dependency
  direction, contract placement, validation, authorization, serialization, and
  import smells
- [`domain-modeling-and-type-rules.md`](domain-modeling-and-type-rules.md):
  concept ownership, domain-centered modeling, `class` vs `type`, `interface`,
  and `unknown`
- [`dependency-injection-lifetime-and-side-effects.md`](dependency-injection-lifetime-and-side-effects.md):
  wiring at the edge, the Rayfin client singleton, runtime/async safety, and
  side effects

Always read `layout-and-module-placement.md` first, then read the narrowest
additional matching reference for the task instead of loading the whole catalog.

Remember the precedence rule from `SKILL.md`: on data access, entities, auth,
schema, and deployment, the `rayfin` skill wins.
