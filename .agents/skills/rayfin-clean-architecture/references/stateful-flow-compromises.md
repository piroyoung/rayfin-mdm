# Stateful Flow Compromises

Use these rules for flows such as streaming generation, live session handling,
multi-step wizards, live playback, or long-lived subscriptions.

## Principle

Do not pretend every highly stateful flow can stay as a simple stateless Hook
plus presentational view split.

When identity, long-lived runtime handles, streaming state, or cancellation
semantics matter, allow a controlled compromise:

- a feature-local controller
- a feature-local store
- a reducer-backed state machine

Keep the compromise contained to the owning feature directory, and still reach
data and services through injected ports — never `client.data` or the Rayfin
SDK directly.

## Where To Put It

Use a feature directory under `src/usecase/`.

Preferred shape:

```text
src/usecase/generation-session/
  use-generation-session.ts
  controller.ts
  store.ts
  state.ts
  reducer.ts
  selectors.ts
  handlers.ts
```

Do not promote these modules to a top-level `src/stores` or global client state
by default.

## When A Store Is Justified

Allow `store.ts` when at least one is true:

- multiple sibling views must observe the same live session
- the feature owns long-lived identity beyond a single form submit
- streaming or incremental updates arrive over time
- cancellation, replay, resume, or reconnect logic exists
- runtime handles such as `AbortController`, stream readers, or subscriptions
  must be coordinated

If none are true, prefer a Hook plus reducer without a dedicated store.

## State Split Rule

Separate the state into three categories and never merge them into one
anonymous blob.

### Durable state

Survives rerenders and often persistence boundaries: message list, session
metadata, wizard step data, playback bookmark.

### Ephemeral runtime state

Exists only while a live operation runs: active request id, abort controller,
current chunk buffer, retry backoff, current pending phase.

### Infrastructure handles

Talk to the outside world: stream reader, socket handle, audio context, timer
registration, subscription handle.

## Controlled Architecture Compromise

For a stateful feature, this is acceptable:

- components remain mostly render-only
- page containers remain shell and composition
- a feature-local controller or store owns lifecycle-heavy orchestration
- data/service access still goes through injected ports and adapters

This is better than forcing streaming logic into page containers,
presentational components, generic global stores, or ad-hoc module-level
variables.

## Event And Effect Rule

- Keep user intent as explicit actions or handler calls.
- Keep stream events as separate actions from user events.
- Use Effects only to attach or detach external systems.
- Keep reducer transitions pure even when the controller is stateful.

Prefer explicit phases such as:

```text
idle -> submitting -> streaming -> succeeded
idle -> submitting -> failed
idle -> submitting -> cancelled
```

## Async Safety Rule

Guard against stale completion with one or more of: `AbortController`, request
ids, session ids, stream token comparison, current-phase guards. Never let an
old response or stream keep mutating state after a newer intent replaced it.

## External Store Rule

Use `useSyncExternalStore` only when multiple components must subscribe to the
same live feature state and a Hook-local reducer is no longer enough. Do not
introduce an external store merely to avoid prop drilling for a single screen.

## Router Compromise Rule

Routing here is declarative `react-router-dom`, so there are no loaders/actions
to lean on. Own ordinary request lifecycle in the use-case Hook (call the
repository port, track pending/error in the reducer). For streaming or
session-oriented flows, allow a feature-local runtime store for the parts the
router does not model: token streaming, incremental updates, reconnect, abort
and resume, live session coordination.

## General Examples

- `generation-session/store.ts`: streaming chunks, request ids, cancellation
- `wizard-session/reducer.ts`: multi-step transition logic
- `media-playback/controller.ts`: playback state, timers, external player events
- `generation-session/handlers.ts`: submit prompt, receive chunks, cancel/retry

## Smells

Refactor when you see:

- session state spread across several unrelated components
- stream readers or abort controllers inside presentational components
- page containers managing incremental streaming state directly
- a generic global store introduced for only one screen
- reducer state mixed with live infrastructure handles in untyped bags
- runtime handles persisted as if they were durable domain data
- a controller importing `client.data` or `RayfinClient` instead of a port
