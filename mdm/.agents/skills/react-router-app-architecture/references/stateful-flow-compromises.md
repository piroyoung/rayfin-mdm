# Stateful Flow Compromises

Use these rules for flows such as multi-step wizards, streaming, live playback,
or long-lived session handling that do not fit a simple
`useState` + `useAsyncData` page.

## Principle

Do not pretend every highly stateful flow stays a simple page-state plus
presentational split. When identity, long-lived runtime handles, streaming, or
cancellation semantics matter, allow a controlled compromise:

- a feature-local controller hook
- a reducer-backed state machine inside that hook
- (rarely) an external store via `useSyncExternalStore`

Keep the compromise contained to one owner.

## Where To Put It

Put the controller in `src/hooks/use-<feature>.ts`. If it needs several
internal pieces, keep them as local modules imported only by that hook (e.g.
`src/hooks/<feature>/reducer.ts`) rather than scattering state across components
and pages. Do not promote it to a global top-level store by default.

## When A Reducer Or Store Is Justified

Use a reducer-backed hook (or external store) when at least one is true:

- multiple sibling components must observe the same live state
- the feature owns long-lived identity beyond a single form submit
- streaming or incremental updates arrive over time
- cancellation, replay, resume, or reconnect logic exists
- runtime handles (`AbortController`, timers, subscriptions) must be coordinated

If none hold, prefer a plain hook with `useState` + `useAsyncData`.

## State Split Rule

Separate three categories; do not mix them into one untyped blob:

- **Durable state**: wizard step data, accumulated results, selection — survives
  rerenders.
- **Ephemeral runtime state**: active request id, abort controller, current
  pending phase, retry/backoff.
- **Infrastructure handles**: timers, subscriptions, stream readers.

## Async Safety Rule

Guard against stale completion. Use `AbortController`, request/session ids, or
current-phase guards so an old response never mutates state after a newer intent
replaced it. `useAsyncData` already demonstrates the cancellation pattern —
follow it.

Prefer explicit phases:

```text
idle -> submitting -> running -> succeeded
idle -> submitting -> failed
idle -> submitting -> cancelled
```

## Event And Effect Rule

- Keep user intent as explicit handler calls / reducer actions.
- Keep external events (stream chunks, timer ticks) as separate actions from
  user events.
- Use `useEffect` only to attach/detach external systems and clean them up.
- Keep reducer transitions pure even when the hook is stateful.

## Smells

Refactor when you see:

- streaming/session state spread across several unrelated components
- abort controllers or subscriptions living inside presentational components
- a page managing incremental streaming state directly
- a global store introduced for only one screen
- runtime handles persisted as if they were durable domain data
