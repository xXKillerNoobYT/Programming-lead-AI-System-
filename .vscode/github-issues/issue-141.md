---
id: 4292333651
number: 141
title: 'Phase 3 §C.5.a: tick-timeout primitive module'
state: closed
created_at: '2026-04-19T23:42:52Z'
updated_at: '2026-04-19T23:52:27Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653121
    name: 'type:task'
    color: 0E8A16
    description: Atomic implementation task
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653593
    name: 'phase:3'
    color: C5DEF5
    description: 'Phase 3 — checks, multi-project'
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/141
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/141'
closed_at: '2026-04-19T23:52:27Z'
---
# Phase 3 §C.5.a: tick-timeout primitive module

Per `AI plans/phase-3-plan.md` §C.5: *"Tick timeout: if a heartbeat exceeds `maxTickDurationMs` (default 5 min), abort the tick, log a `C.5-timeout` decision, and wait for the next scheduled wake."*

## Scope — §C.5.a only (primitive module)
Same scoping rationale as §C.4.a (#139 → PR #140): heartbeat.js v1 is read-only so no live tick will ever take 5 minutes, but the primitive is worth landing now as the 7th backbone module. §C.5.b (wire into tick()) is a follow-up for when tick() gains substantive work.

## Goal
New `lib/tick-timeout.js` module that takes any async task + races it against a timeout. On timeout: calls a caller-provided `onTimeout` hook, then throws a `TickTimeoutError` so the caller can distinguish timeout from task-rejection.

## Acceptance criteria

### lib/tick-timeout.js — NEW
- Exports `runWithTimeout({task, timeoutMs?, onTimeout?, _timer?})` returning `Promise<T>`
- Exports `TickTimeoutError` — Error subclass with `.timeoutMs` and `.message = 'tick exceeded <N>ms'`
- Exports constant `DEFAULT_TIMEOUT_MS = 5 * 60 * 1000` (5 minutes per §C.5 spec)
- `task`: async function, invoked once; returns value or rejects
- `timeoutMs`: default `DEFAULT_TIMEOUT_MS`
- `onTimeout`: `({timeoutMs, startedAt}) => void` — called BEFORE the throw. No-op default.
- `_timer`: DI seam — `{setTimeout, clearTimeout}`. Defaults to global built-ins. Tests inject a manual-tick fake.
- **Intentionally THROWS on timeout** (joins `retry-backoff` as second control-flow primitive that breaks never-throws convention — caller must distinguish "timed out" from "task rejected"). Document this in the module JSDoc banner.
- If task resolves before timeout: returns task's value, clears the timer (no lingering handles)
- If task rejects before timeout: propagates task's rejection, clears the timer
- If timer fires before task settles: calls onTimeout synchronously, throws `TickTimeoutError`. The task's eventual resolution/rejection is DISCARDED (unhandled promise rejection is the caller's concern — document in JSDoc).
- Never leaks timer handles — every code path either calls `clearTimeout(id)` or lets the timer fire exactly once.

### Tests — tests/tick-timeout.test.js (NEW, node:test)
Use a manual-tick fake `_timer`:
```js
function mkFakeTimer() {
    const fires = [];
    return {
        setTimeout: (fn, ms) => {
            const entry = { fn, ms, cancelled: false };
            fires.push(entry);
            return entry;
        },
        clearTimeout: (entry) => { if (entry) entry.cancelled = true; },
        fire: (idx) => { const e = fires[idx]; if (!e.cancelled) e.fn(); },
        get pending() { return fires.filter((e) => !e.cancelled).length; },
    };
}
```

Minimum 10 cases:
1. Task resolves before timeout → returns value; timer cleared; onTimeout NOT called
2. Task rejects before timeout → propagates rejection; timer cleared; onTimeout NOT called
3. Timer fires before task settles → onTimeout called once with `{timeoutMs, startedAt}`; throws TickTimeoutError; error.message includes `'tick exceeded 500ms'` (when timeoutMs=500)
4. TickTimeoutError.timeoutMs matches the configured timeoutMs
5. TickTimeoutError is `instanceof Error` and `instanceof TickTimeoutError`
6. Default timeoutMs is 5 * 60 * 1000 (import `DEFAULT_TIMEOUT_MS`; assert)
7. Custom timeoutMs honored (`_timer.setTimeout` called with that value)
8. Timer handle cleared on task success (fake timer shows `pending === 0` after resolution)
9. Timer handle cleared on task rejection (fake timer shows `pending === 0` after rejection)
10. onTimeout fires BEFORE the throw (use order-observation technique from retry-backoff test #11)

### Verification
- Root `npm test` ≥ 128 (was 118 + 10 new)
- `cd dashboard && npm run check:arch` 3/3
- `cd dashboard && npm run check:guardrail-coverage` exit 0

## Scope — TOUCH ONLY
- `lib/tick-timeout.js` (NEW)
- `tests/tick-timeout.test.js` (NEW)

## Out of scope (future sub-leaves)
- §C.5.b: integrate into heartbeat.js `tick()` — deferred until tick() has substantive work
- "Log a C.5-timeout decision" — onTimeout hook is the extension point; decision-log writing is the caller's concern

## Why primitive-first (consistent with §C.1.a + §C.2 + §C.4.a)
Land the utility; unblock future callers. Fake `_timer` lets tests run in <100ms without real 5-minute waits.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T23:42:52Z
**Updated:** 2026-04-19T23:52:27Z
**Closed:** 2026-04-19T23:52:27Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
