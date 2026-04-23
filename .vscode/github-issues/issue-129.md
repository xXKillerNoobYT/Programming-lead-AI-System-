---
id: 4292022096
number: 129
title: 'Phase 3 §C.1.c: migrate heartbeat.js runShell from execFileSync to safeSpawn'
state: closed
created_at: '2026-04-19T21:04:07Z'
updated_at: '2026-04-19T21:17:14Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/129
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/129'
closed_at: '2026-04-19T21:17:14Z'
---
# Phase 3 §C.1.c: migrate heartbeat.js runShell from execFileSync to safeSpawn

Per `AI plans/phase-3-plan.md` §C.1 (final sub-leaf). §C.1.a (#125/PR #126) and §C.1.b (#127/PR #128) have landed; the detector already flagged the sole remaining raw call.

## Goal
Replace the single raw outbound call at `heartbeat.js:235` (inside `runShell()`) with a call through `safeSpawn` from `lib/guardrails.js`. After this lands, `npm run check:guardrail-coverage` on the real repo exits 0 (no violations).

## Current state
```
heartbeat.js:235  [exec]  return execFileSync(cmd, args, {
```

The `runShell(cmd, args, options)` function on heartbeat.js:233-245 wraps `execFileSync` with cwd=REPO_ROOT + UTF-8 encoding and swallows errors via `err.stdout || ''`.

## Acceptance criteria
- [ ] `heartbeat.js` imports `safeSpawn` from `./lib/guardrails`
- [ ] `runShell()` routes through `safeSpawn` instead of `execFileSync`
- [ ] Existing `runShell()` behavior preserved: returns stdout string on success; returns empty string (or best-available output) on failure; never throws
- [ ] `heartbeat.js` no longer imports `execFileSync` from `node:child_process` (if it's the only use of that import; otherwise leave the import and only fix the call site)
- [ ] `cd dashboard && npm run check:guardrail-coverage` on the real repo exits 0 (no violations)
- [ ] `npm test` at repo root green — including any `tests/heartbeat.test.js` cases that touch `runShell()` behavior
- [ ] `cd dashboard && npm run check:arch` still 3/3 green
- [ ] `node heartbeat.js` runs end-to-end without errors; paste the tick summary line
- [ ] No allowlist enforcement yet — pass `safeSpawn(cmd, args, {})` or omit the 3rd arg so it's passthrough. Enforcement opts in a later Issue.

## Scope (touch ONLY these files)
- `heartbeat.js` (modify runShell + imports)
- `tests/heartbeat.test.js` (may need to update if existing tests directly mock `execFileSync`; otherwise leave alone)

## Out of scope
- Adding allowlist (future leaf)
- Migrating other callers that don't exist yet (§C.1.c is ONLY the execFileSync call at line 235)
- Refactoring runShell's overall signature — keep the `(cmd, args, options)` shape and return-string contract

## Why small matters
The detector already validated that this is THE ONLY raw call in backbone. A minimal, behavior-preserving swap is the whole job. Keeping scope tight lets the spec reviewer verify "behavior identical" by diff + test output, and lets the code reviewer focus on the spawnSync vs execFileSync failure-mode difference (execFileSync throws, spawnSync returns status).

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T21:04:07Z
**Updated:** 2026-04-19T21:17:14Z
**Closed:** 2026-04-19T21:17:14Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
