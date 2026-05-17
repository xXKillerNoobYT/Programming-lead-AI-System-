---
id: 4292212924
number: 136
title: '§C.3 follow-up: pause-lock test-coverage + durationMs guards'
state: closed
created_at: '2026-04-19T22:34:39Z'
updated_at: '2026-04-19T23:00:50Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/136
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/136'
closed_at: '2026-04-19T23:00:50Z'
---
# §C.3 follow-up: pause-lock test-coverage + durationMs guards

Per code-quality reviewer NITs on PR for Issue #135 (§C.3 pause-lock). All 4 items are polish/coverage; none block the §C.3 merge. Bundled into one follow-up leaf.

## Items to address

### 1. Guard `writePauseLock` against non-positive durationMs
Currently: `Number.isFinite(durationMs)` allows `0` and negative values → writes an immediately-stale lockfile (not a correctness bug — `readPauseLock` treats stale as `paused:false` — but surprising).

Fix: gate on `durationMs > 0` OR document the current behavior explicitly in JSDoc.

### 2. Test: garbage `pausedUntil` string stays paused
`lib/pause-lock.js:115-117` documents that `pausedUntil: 'not a date'` should KEEP the heartbeat paused (user fixes or deletes file — don't silently unlock). No test protects this documented behavior.

Add:
```js
// Garbage pausedUntil must NOT unlock the heartbeat
writeFileSync(lockfilePath(root), JSON.stringify({
    pausedAt, pausedUntil: 'not a date', reason: 'x'
}), 'utf8');
assert.equal(readPauseLock(root).paused, true);
```

### 3. Test: valid JSON, wrong shape fail-OPEN
`readPauseLock` correctly short-circuits on `'42'`, `'[1,2]'`, `'null'` — any valid JSON that isn't a plain object → `{paused:false, rawError}`. Test covers the `JSON.parse` throw path but not this branch.

Add 2-3 cases to the malformed describe block.

### 4. Test: circular `reason` in writePauseLock
Outer try/catch already handles this (verified by reviewer), but no test explicitly asserts the `{path:null}` return on a circular reference.

Add:
```js
const circular = {}; circular.self = circular;
const r = writePauseLock({projectRoot, reason: circular});
assert.equal(r.path, null);
```

## AC
- [ ] `writePauseLock` gates on `durationMs > 0` OR JSDoc explicitly documents the 0/negative behavior
- [ ] 3 new tests in `tests/pause-lock.test.js` (items 2, 3, 4 — item 3 may be 2-3 micro-tests)
- [ ] Root `npm test` still green (100 + ~5 = ~105)
- [ ] `check:arch` 3/3, `check:guardrail-coverage` exit 0

## Scope (TOUCH ONLY)
- `lib/pause-lock.js` (1-2 lines for durationMs guard, optional)
- `tests/pause-lock.test.js` (add ~5 test cases)

Keeps §C.3 merge clean; polish happens in a follow-up subagent-driven-development leaf.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T22:34:39Z
**Updated:** 2026-04-19T23:00:50Z
**Closed:** 2026-04-19T23:00:50Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
