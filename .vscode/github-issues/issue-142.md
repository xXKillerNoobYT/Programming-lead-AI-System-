---
id: 4292353785
number: 142
title: '§C.5.a follow-up: tick-timeout task-type guard + edge-value tests'
state: closed
created_at: '2026-04-19T23:51:28Z'
updated_at: '2026-04-20T00:13:37Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/142
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/142'
closed_at: '2026-04-20T00:13:37Z'
---
# §C.5.a follow-up: tick-timeout task-type guard + edge-value tests

Per code reviewer NITs on PR for Issue #141 (§C.5.a tick-timeout). The 3rd NIT (onTimeout hook try/catch hardening) was applied inline; these 2 remain.

## Items

### 1. `task`-type validation
Currently `runWithTimeout({})` or `runWithTimeout({task: undefined})` routes through `Promise.resolve().then(() => task())` which throws `TypeError: task is not a function` — correct rejection, but confusing error location.

Fix: one-line fail-fast guard at top:
```js
if (typeof task !== 'function') {
    throw new TypeError('runWithTimeout: task must be a function');
}
```

### 2. Edge `timeoutMs` value tests
Missing coverage:
- `timeoutMs: 0` → fires on next macrotask (valid; immediate-timeout use case)
- `timeoutMs: Infinity` / `NaN` / negative / string → Node's `setTimeout` coerces NaN/negative to 1, Infinity to TIMEOUT_MAX. Defensive behavior should be test-locked.

Add 3-4 test cases exercising these edges; either confirm the Node-level coercion OR add a guard in `runWithTimeout` that rejects non-finite-non-negative timeoutMs with a TypeError.

## AC
- [ ] `task`-type guard added with matching test
- [ ] 3-4 edge-value tests for `timeoutMs` added (either asserting current Node behavior OR a new guard)
- [ ] Root `npm test` still green

## Scope
- `lib/tick-timeout.js`
- `tests/tick-timeout.test.js`

Same "close-the-review-loop" pattern as D-036 (§C.2 follow-up), D-038 (§C.3 follow-up).


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T23:51:28Z
**Updated:** 2026-04-20T00:13:37Z
**Closed:** 2026-04-20T00:13:37Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
