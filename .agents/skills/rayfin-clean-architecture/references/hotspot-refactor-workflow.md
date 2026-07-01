# Hotspot Refactor Workflow

Use this workflow when a `ts` or `tsx` file has accumulated too many
responsibilities and must be split without breaking behavior.

## Goal

Reduce one hotspot file into explicit modules with clearer boundaries, smaller
review batches, and preserved behavior. Treat this as controlled extraction,
not a rewrite.

## Priority Rule

When several refactor candidates exist, do not start with the largest file by
default. Prioritize by this order:

1. correctness risk
2. change frequency
3. architecture damage
4. extraction leverage
5. file size

Interpret the order like this:

- correctness risk: likely to cause bugs, race conditions, stale-response bugs,
  or auth/ownership mistakes
- change frequency: touched often and slows delivery
- architecture damage: currently breaks boundaries, such as a component calling
  `client.data`, a use case importing `RayfinClient`, or a Rayfin entity
  leaking into `domain`
- extraction leverage: cleaning this file makes nearby files easier to fix
- file size: a signal, not the deciding factor

Examples of high-priority hotspots:

- a page or component that mixes rendering, async orchestration, and
  `client.data` calls
- a use case that owns retries and reducer-worthy state plus direct SDK access
- an adapter that leaks Rayfin/network errors and entity shapes across
  boundaries
- a use-case module with module-level mutable state or stale async races

Within one hotspot, prioritize seams in this order:

1. hidden side effects and mutable state
2. boundary violations (SDK/`client.data` reaching outside infrastructure)
3. duplicated validation or error mapping
4. reducer, selector, and handler extraction
5. naming cleanup and cosmetic reshaping

Stabilize behavior first. Improve elegance second.

## Phase 1: Analyze

Read the hotspot file and classify each responsibility before moving code.

Identify:

- UI rendering
- route/page wiring
- state transitions
- event handlers
- async orchestration
- data access (`client.data`) and mapping
- domain rules
- cross-cutting utilities

Mark what is pure and easy to extract, what is boundary-sensitive, what is
coupled by naming or hidden shared state, and what is risky because it changes
behavior or async lifecycle.

Useful checks:

- count imports and note which layer each belongs to
- find mutable module state
- find `useEffect`, `client.data`, `RayfinClient`, `new`, and large inline
  condition blocks
- find repeated parameter groups and repeated derived expressions

Do not edit yet. First understand why the file grew.

## Phase 2: Plan

Write a refactor plan around seams, not lines.

Prefer this extraction order:

1. pure constants and small utilities
2. local types and mappers
3. selectors and derived read models
4. reducer and state definitions
5. event handlers and async command helpers
6. repository/browser adapters and ports
7. domain rules or policies
8. entry-point cleanup

Choose target files based on responsibility:

- render-only code → `src/components/<feature>/`
- reducer, selectors, handlers → `src/usecase/<feature>/`
- data access via `client.data` → a repository adapter in
  `src/infrastructure/data/` behind a port in
  `src/domain/repositories/`
- browser integrations → `src/infrastructure/browser/`
- Rayfin client wiring → `src/infrastructure/rayfin/`
- business invariants → `src/domain/*`

Define the smallest safe batch. A good batch removes one responsibility, keeps
the old file compiling, and is reviewable without reading the whole system.

Do not combine naming migrations, behavior changes, and large structural
movement in the same batch unless they are inseparable.

Also plan which validation stays at the boundary, which error categories need
explicit mapping, what the feature's public entry point becomes, and how to
avoid circular imports.

## Phase 3: Consider Risks

Before moving code, check the failure modes:

- hidden module-level mutable state (e.g. a cached session)
- stale closures after extraction
- accidental dependency inversion
- Rayfin entity shapes or `Date` leaking into `domain`
- Fabric session/context leaking into singletons
- circular imports caused by rushed extraction
- tests asserting file-local implementation details
- over-extraction into vague common modules

If the file is a behavior hotspot, add characterization tests first:
reducer transitions, selector outputs, mapper output, pending/error states, and
ownership scoping.

## Phase 4: Execute In Small Batches

Extract one seam at a time:

1. Move pure helpers and constants
2. Move types and mappers
3. Move selectors
4. Move reducer and state
5. Move async handlers
6. Move adapters behind ports
7. Shrink the original file to composition only

After each batch: fix imports, rerun targeted tests, rerun typecheck if the
boundary changed, confirm no new circular dependency, and confirm the extracted
module did not become another feature's private dependency.

Favor many small extractions over one heroic refactor.

## Phase 5: Verify

Behavior checks: existing tests still pass, changed flows still work, no stale
async result overwrites newer state.

Architecture checks:

- the hotspot file now has one clear role
- extracted modules live in the correct layer
- no `client.data`/`RayfinClient` import escaped into `usecase`, `components`,
  `pages`, or `domain`
- no generic catch-all module was introduced
- the remaining entry file mostly wires modules together
- validation and error mapping still live at intentional boundaries

## Phase 6: Report

Summarize in terms of responsibilities moved, not just files changed: what was
extracted, what stayed and why, what risks were reduced, and what follow-up
seams remain. If the file is still too large, name the next seam instead of
pretending the refactor is complete.

## Heuristics

Extract when a block can be named clearly, belongs to another layer, can be
tested in isolation, is reused or will stabilize, or hides state transitions or
mapping logic.

Do not extract when the only outcome is more files with no boundary
improvement, the new module name would be vague (`helpers`, `utils`), or the
code is tightly coupled and should first be simplified in place.

## Target End State

- entry file: composition and top-level flow only
- use-case files: state, reducer, selectors, handlers
- infrastructure files: Rayfin/browser adapters behind ports
- domain files: invariants and business rules
- presentational files: rendering only
