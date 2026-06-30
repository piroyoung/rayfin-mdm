# Hotspot Refactor Workflow

Use this workflow when a `.ts`/`.tsx` file has accumulated too many
responsibilities and must be split without breaking behavior. Treat it as
controlled extraction, not a rewrite.

## Priority Rule

When several refactor candidates exist, do not start with the largest file by
default. Prioritize:

1. correctness risk (likely to cause bugs, stale-async races, authorization or
   persistence mistakes)
2. change frequency (touched often, slows delivery)
3. architecture damage (breaks boundaries — e.g. a component calling
   `client.data.*`, a page embedding business rules, `rayfin/data/*` imported as
   values)
4. extraction leverage (cleaning it unblocks nearby files)
5. file size (a signal, not the deciding factor)

Good first targets have both high risk and high churn.

High-priority hotspots in this app usually look like:

- a page that mixes rendering, async orchestration, and inline business rules
- a component that fetches data or calls services directly
- a service that has grown several unrelated domain concerns
- a domain module that has started importing React or the Rayfin client

Within one hotspot, fix seams in this order:

1. hidden side effects and mutable state
2. boundary violations (move data calls into `src/services/*`, rules into
   `src/domain`)
3. duplicated validation or error mapping
4. view-state / handler extraction into a `src/hooks/use-<feature>.ts`
5. naming cleanup and cosmetic reshaping

Stabilize behavior first, improve elegance second.

## Phase 1: Analyze

Read the file and classify each responsibility before moving code:

- UI rendering
- routing/composition wiring
- state transitions and handlers
- async orchestration
- data access (`client.data.*` calls that belong in a service)
- domain rules
- cross-cutting utilities

Useful checks:

- count imports and note each one's layer
- find module-level mutable state
- find `useEffect`, `client.data.`, `getRayfinClient(`, and large inline
  condition blocks
- find repeated derived expressions and parameter groups

Do not edit yet. Understand why the file grew.

## Phase 2: Plan

Write the plan around seams, not lines. Prefer this extraction order:

1. pure constants and small utilities -> nearest owner or `src/lib`
2. local types and mappers
3. derived selectors / `useMemo` logic
4. handlers and async commands -> page or `src/hooks/use-<feature>.ts`
5. data access -> `src/services/<feature>.ts`
6. business invariants -> `src/domain/*`
7. entry-point cleanup -> page/component renders and composes only

Choose targets by responsibility:

- render-only code -> `src/components/*` or the page
- view state, handlers, derived values -> `src/hooks/use-<feature>.ts`
- data reads/writes + side effects -> `src/services/*`
- business invariants -> `src/domain/*`
- framework-agnostic helpers -> `src/lib/*`

Define the smallest safe batch: removes one responsibility, keeps the file
compiling, is reviewable on its own. Do not combine a rename, a behavior change,
and a large move in one batch unless inseparable.

## Phase 3: Consider Risks

Common failure modes:

- hidden module-level mutable state
- stale closures after extraction
- accidental dependency inversion (a service importing a page)
- `rayfin/data/*` leaking in as a value import instead of a type
- circular imports caused by rushed extraction
- tests asserting file-local implementation details

If the file is behavior-critical, add or update tests first (reducer/handler
transitions, service input shape, pending/error states) — see
[`ui-verification.md`](ui-verification.md).

## Phase 4: Execute In Small Batches

Extract one seam at a time. After each batch:

- fix imports
- rerun `npm run test` for the touched area
- rerun `tsc -b` (`npm run build`) if the boundary changed
- confirm no new circular dependency
- confirm the extracted module did not become another feature's private
  dependency

Favor many small extractions over one heroic refactor.

## Phase 5: Verify

Behavior:

- existing tests still pass
- changed flows still work (Testing Library and/or a browser pass)
- no stale async result overwrites newer state

Architecture:

- the file now has one clear role
- extracted modules live in the correct layer (`hooks`/`services`/`domain`/`lib`)
- no component/page calls `client.data.*` directly
- no `domain` imports React or the Rayfin client
- the remaining entry file mostly wires modules together

## Phase 6: Report

Summarize in terms of responsibilities moved, not files changed: what was
extracted, what stayed and why, what risk was reduced, and the next remaining
seam if the file is still too large.

## Target End State

- entry file: composition and top-level flow only
- hook files: state, derived values, handlers
- service files: Rayfin data access and side effects
- domain files: invariants and business rules
- presentational files: rendering only
