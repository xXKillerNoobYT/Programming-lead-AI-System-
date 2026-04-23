---
id: 4292183298
number: 135
title: 'Phase 3 §C.3: human-override lockfile — .heartbeat-paused'
state: closed
created_at: '2026-04-19T22:22:18Z'
updated_at: '2026-04-19T22:35:48Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/135
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/135'
closed_at: '2026-04-19T22:35:48Z'
---
# Phase 3 §C.3: human-override lockfile — .heartbeat-paused

Per `AI plans/phase-3-plan.md` §C.3: *"Human-override lockfile: dashboard 'Pause heartbeat' writes `.heartbeat-paused` with duration + reason; heartbeat checks and respects it on every tick."*

## Goal
Give the user (or a future dashboard Pause button) a way to stop heartbeat ticks without killing the process. Heartbeat checks for `.heartbeat-paused` at the top of every tick; if present + still valid, logs a paused-status line and returns early.

## Scope — this leaf covers §C.3.a + §C.3.b
- **§C.3.a**: new `lib/pause-lock.js` module — reads/writes the lockfile, validates shape, handles stale (past `pausedUntil`) as not-paused
- **§C.3.b**: `heartbeat.js` `tick()` checks at start; if paused, emits status line + returns `{paused: true, ...}` without writing tick report/audit

Out of scope (follow-ups):
- §C.3.c: dashboard Pause button UI (Phase 3 §D territory)
- §C.3.d: auto-unpause on timer expiry (current v1: manual unpause only — delete the file)

## Acceptance criteria

### lib/pause-lock.js (§C.3.a)
- [ ] Exports `readPauseLock(projectRoot) → {paused: boolean, reason?: string, pausedAt?: ISO, pausedUntil?: ISO, rawError?: string}`
- [ ] Exports `writePauseLock({projectRoot, reason?, durationMs?}) → {path, pausedUntil?: ISO}`
- [ ] Exports `clearPauseLock({projectRoot}) → {cleared: boolean}` (unlinks the file if present)
- [ ] Lockfile path: `<projectRoot>/.heartbeat-paused` (dot-prefix, at repo root — matches git ignore conventions)
- [ ] Lockfile format: JSON `{pausedAt: ISO, pausedUntil?: ISO, reason?: string}`
- [ ] `readPauseLock` returns `{paused: false}` if file missing
- [ ] `readPauseLock` returns `{paused: false, rawError: '<message>'}` if file is malformed JSON (fail-OPEN rather than fail-closed — human can still restart if they accidentally corrupt the file)
- [ ] `readPauseLock` returns `{paused: false}` if `pausedUntil` is in the past (stale lockfile — log but treat as not-paused; do NOT auto-delete)
- [ ] `readPauseLock` returns `{paused: true, ...fields}` if file is valid + `pausedUntil` missing or future
- [ ] `writePauseLock({projectRoot, reason: 'manual'})` writes an indefinite pause (no `pausedUntil`)
- [ ] `writePauseLock({projectRoot, durationMs: 60000})` writes a pause that expires 60s from now
- [ ] Never-throws contract on all three functions: return structured object, log to stderr on failure

### heartbeat.js integration (§C.3.b)
- [ ] `tick()` calls `readPauseLock(REPO_ROOT)` as its first step
- [ ] If `paused === true`: emit console line `[heartbeat] <timestamp> — paused: <reason> — until <pausedUntil|indefinite>`, return `{paused: true, state: null, path: null, auditPath: null}` WITHOUT writing tick report or audit
- [ ] If `paused === false`: proceed with normal tick (unchanged behavior)
- [ ] Tick report + audit are NOT written when paused (explicit no-op — a paused tick is not a tick)

### Tests
- [ ] `tests/pause-lock.test.js` (node:test + node:assert/strict) covering:
  - read: missing file → `{paused: false}`
  - read: valid indefinite pause → `{paused: true, reason, pausedAt}`
  - read: valid timed pause in future → `{paused: true, pausedUntil}`
  - read: stale lockfile (past pausedUntil) → `{paused: false}`
  - read: malformed JSON → `{paused: false, rawError: '...'}`
  - write: indefinite pause creates file with no pausedUntil
  - write: timed pause creates file with future pausedUntil
  - clear: removes the file + returns `{cleared: true}`
  - clear: missing file → `{cleared: false}` (never throws)
- [ ] `tests/heartbeat.test.js` extended: tick() with active pause lock → returns `{paused: true}`, does NOT write .md or .json

### Verification
- [ ] Root `npm test` green (86 + new)
- [ ] `cd dashboard && npm run check:arch` 3/3 PASS
- [ ] `cd dashboard && npm run check:guardrail-coverage` exit 0
- [ ] `node heartbeat.js` with NO lockfile → normal tick
- [ ] `node heartbeat.js` with lockfile → prints paused line, exits 0, does NOT write tick report

### Suggested `heartbeat.js` integration sketch
```js
async function tick(clientsByName = {}, options = {}) {
    const lock = readPauseLock(REPO_ROOT);
    if (lock.paused) {
        const ts = new Date().toISOString();
        const until = lock.pausedUntil || 'indefinite';
        console.log(`[heartbeat] ${ts} — paused: ${lock.reason || 'no reason'} — until ${until}`);
        return { paused: true, state: null, path: null, auditPath: null };
    }
    // ... existing tick body ...
}
```

## Scope (touch ONLY)
- `lib/pause-lock.js` (NEW)
- `heartbeat.js` (modify tick + add import)
- `tests/pause-lock.test.js` (NEW)
- `tests/heartbeat.test.js` (extend)

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T22:22:18Z
**Updated:** 2026-04-19T22:35:48Z
**Closed:** 2026-04-19T22:35:48Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
