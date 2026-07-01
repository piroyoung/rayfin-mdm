# Refactor Inventory And Completion

Use this whenever a request is a refactor, cleanup, or "make X follow the
architecture" — anything whose goal is to remove violations rather than add a
feature. It exists to guarantee one thing: **a refactor runs to zero. No known
violation is left behind, and no in-scope work is deferred to "next time".**

## The Violation Inventory (the running worklist)

Keep a single living list of every architecture and design-pattern violation in
the change's scope, and burn it down like an issue:

- **Seed it before editing.** Run the **Design-Pattern Compliance Gate** and the
  **Architecture Drift Checklist** in
  [`verification-gates.md`](verification-gates.md) (plus the `rg` audits there)
  across the change's dependency closure, and list *every* hit — including the
  risky, large, or tedious ones.
- **Append continuously.** Every violation you discover while working goes on the
  list the moment you see it. Never fix one smell silently and leave the two next
  to it; never skip one because it "isn't why I came here".
- **Burn it down to zero.** Fix items in dependency order, re-run the gate after
  each batch, add any new findings back to the list, and repeat.

The change is complete only when the inventory is empty **and** the verification
gates (targeted tests, `tsc -b`, lint, Playwright for UI) are green.

## Scope: the dependency closure, not "what I felt like touching"

The inventory covers the **declared target plus everything it depends on (its
downward dependency closure)**:

- A shared module you import that itself violates a rule — a god-file like a
  many-component `ui.tsx`, a helper with logic in the wrong layer — **is in
  scope**. Fix it fully; do not route around it or split only the part you
  happened to use.
- A feature that merely *also* uses the same shared code, but that your target
  does not depend on, is **not** pulled in. That is legitimate staged-migration
  breadth, tracked as a standing backlog — not a residual of this change.
- Only genuine **platform** concerns (`rayfin/` data model, `@role`/RLS, CLI,
  deployment) are out of scope by nature. Record them as "belongs to the `rayfin`
  skill", never as deferred app-code work.

Drawing the boundary from the dependency graph up front is what turns a vague
"thin the page" into a bounded set with a definite zero — and it is why a
surprise leftover (the imported `ui.tsx` you notice at the end) cannot happen:
it was on the list from the start.

## No deferral of in-scope violations

There is no "I'll offer to do that next" for a violation inside scope. Risk is a
planning trigger, not an escape hatch: a large or untested target means you plan
the split (smaller batches, characterization tests — see
[`hotspot-refactor-workflow.md`](hotspot-refactor-workflow.md)) and still finish
it in this change. "Deferring" is reserved for genuine platform concerns handed
to the `rayfin` skill.

## Tracking medium

Default to the agent's todo list (or an inline checklist) and drive it to zero in
the session. For a large or multi-session closure, mirror it into a real GitHub
issue or a `docs/refactor-backlog.md`. Tracking is for visibility — it never
licenses stopping before the in-scope list reaches zero.

## Inventory template

```text
Refactor: make the accounts feature follow the architecture
Scope (target + dependency closure): pages/AccountsPage, components/account/*,
  usecase/accounts/*, domain (account, quality), components/ui.tsx (imported),
  components/listing.tsx (imported)
Out of scope by nature: rayfin/data/Account.ts (@entity/@role -> rayfin skill)

Violations (burn down to zero):
  [ ] ui.tsx defines 16 components (grab-bag)  -> split into shared/, one per file
  [ ] listing.tsx defines 6 components         -> split into shared/, one per file
  [ ] AccountsTable re-encodes status machine  -> domain predicates
  [ ] AccountForm duplicates quality banding   -> qualityTone over qualityBand
  [ ] AccountsPage 693 lines (fat screen)      -> thin container + view-model
Done = every box checked AND tsc/tests/lint/Playwright green
```
