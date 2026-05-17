---
id: 4292288551
number: 139
title: 'Phase 3 §C.4.a: retry-with-backoff primitive module'
state: closed
created_at: '2026-04-19T23:15:58Z'
updated_at: '2026-04-19T23:28:06Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/139
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/139'
closed_at: '2026-04-19T23:28:06Z'
---
# Phase 3 §C.4.a: retry-with-backoff primitive module

Per `AI plans/phase-3-plan.md` §C.4: *"Retry/backoff: on agent-delegation failure, retry 3× with exponential backoff (2 s / 8 s / 30 s); on 4th failure escalate to User Guidance."*

## Scope — §C.4.a only (primitive module)
The aspirational "on agent-delegation failure" caller doesn't exist yet (heartbeat.js v1 is read-only — no delegation). This leaf delivers the PRIMITIVE as a 6th backbone module, ready for the future delegation caller. §C.4.b (integration into a delegation caller) is a later leaf.

## Goal
New `lib/retry-backoff.js` module that takes any async task + retries it with exponential backoff up to a configurable attempt limit. Escalates to a caller-provided handler on final failure.

## Acceptance criteria

### lib/retry-backoff.js — NEW
- [ ] Exports `retryWithBackoff({task, maxAttempts?, delaysMs?, onRetry?, onEscalate?, _clock?})`
- [ ] `task`:  — the work to attempt
- [ ] `maxAttempts`: number, default 3 (so 3 retries + the original = up to 4 calls before escalation)
- [ ] `delaysMs`: array of numbers, default `[2000, 8000, 30000]` (matches §C.4 spec exponential sequence)
- [ ] `onRetry`: `({attempt, error, nextDelayMs}) => void` — called before each backoff sleep; defaults to no-op
- [ ] `onEscalate`: `({attempts, lastError}) => void` — called once after final failure before throwing; defaults to no-op
- [ ] `_clock`: DI seam — object with `sleep(ms)` method; defaults to real setTimeout-based. Tests inject fake to avoid waiting.
- [ ] Returns the task's resolved value on success (any attempt)
- [ ] If all retries exhausted: calls `onEscalate`, then throws the last error (so caller can decide whether to swallow or propagate)
- [ ] If delaysMs is shorter than maxAttempts-1: reuse the last delay for remaining retries (caller explicitly wants N delays but more retries)
- [ ] If delaysMs is longer than maxAttempts-1: ignore the extras (upper bound wins)
- [ ] Exports constants: `DEFAULT_DELAYS_MS = [2000, 8000, 30000]`, `DEFAULT_MAX_ATTEMPTS = 3`
- [ ] NOT never-throws — this is a retry primitive; final failure MUST throw so callers can wrap in try/catch. Document this explicitly in JSDoc (different from cohesion-gate / audit-trail / pause-lock).

### Tests — tests/retry-backoff.test.js (NEW)
- [ ] `task` succeeds on first try → returns value, no retry, no escalate
- [ ] `task` fails once then succeeds → returns value, onRetry called once with attempt=1
- [ ] `task` fails on all attempts (maxAttempts=3) → onEscalate called once, then throws lastError
- [ ] `onRetry` receives correct `{attempt, error, nextDelayMs}` each call
- [ ] Default delays are [2000, 8000, 30000]
- [ ] Custom `delaysMs` honored
- [ ] If delaysMs shorter than maxAttempts-1, last delay reused
- [ ] `_clock.sleep` called for each retry delay (NOT for initial attempt, NOT after final failure)
- [ ] `_clock.sleep` receives the right delay value each call
- [ ] Test harness uses a fake clock (no real wall-clock waits — tests should run in <100ms total)
- [ ] `onEscalate` called exactly once, with `{attempts, lastError}`, BEFORE the throw

### Verification
- [ ] Root `npm test` green (was 106 + ~11 new ≥ 117)
- [ ] `cd dashboard && npm run check:arch` 3/3
- [ ] `cd dashboard && npm run check:guardrail-coverage` exit 0

## Scope — TOUCH ONLY
- `lib/retry-backoff.js` (NEW)
- `tests/retry-backoff.test.js` (NEW)

## Out of scope (future sub-leaves)
- §C.4.b: integrate into a future delegation caller (heartbeat.js doesn't delegate yet)
- "Escalate to User Guidance" UI wiring — `onEscalate` is just a callback hook in v1

## Why primitive-first
Same rationale as §C.1.a (guardrails gateway before callers) and §C.2 (audit writer before decomposition caller): land the utility, unblock downstream callers. The retry primitive can be unit-tested fully in isolation with a fake clock; integration comes when there's a real failing caller to wrap.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T23:15:58Z
**Updated:** 2026-04-19T23:28:06Z
**Closed:** 2026-04-19T23:28:06Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
