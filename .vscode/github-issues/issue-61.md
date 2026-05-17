---
id: 4288672338
number: 61
title: >-
  SessionStart hook should run `npm install` (both root + dashboard/) before
  first heartbeat
state: closed
created_at: '2026-04-18T17:14:25Z'
updated_at: '2026-04-19T02:52:01Z'
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
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10728044845
    name: 'phase:meta'
    color: ededed
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/61
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/61'
closed_at: '2026-04-19T02:52:01Z'
---
# SessionStart hook should run `npm install` (both root + dashboard/) before first heartbeat

## Pattern observed
**Run 28 (PR #60, auto-merge gate work)** — a fresh remote heartbeat session hit `Cannot find module '@modelcontextprotocol/sdk/client/index.js'` on the very first `npm test` because `node_modules/` didn't exist. Manual `npm install` was required before any TDD could start, costing ~2 tool calls of debugging.

This happens on **every fresh clone / fresh remote worktree** and will keep burning session time until the harness takes care of it.

## Why SessionStart is the right place
- `.claude/scripts/session-prefetch.sh` already exists and is wired to the SessionStart hook in `.claude/settings.json`.
- That script is *best-effort* (runs with `set +e`, safe to fail silently) — an idempotent `npm install` there is a natural fit.
- Remote sessions start from scratch; installing once at session boot is cheaper than doing it at every tick.

## Proposed change
In `.claude/scripts/session-prefetch.sh`, add before the orient-state capture:

```bash
# Ensure dependencies are ready so `npm test` works out-of-the-box.
(cd "$REPO_ROOT"            && npm install --silent --no-audit --no-fund 2>&1 | tail -5) >> "$OUT" 2>&1
(cd "$REPO_ROOT/dashboard"  && npm install --silent --no-audit --no-fund 2>&1 | tail -5) >> "$OUT" 2>&1
```

Record the install summary in the prefetch output so the model can spot dep drift.

## Acceptance
- [ ] `session-prefetch.sh` installs root + dashboard deps.
- [ ] `session-state.md` has a short "## Dependency install summary" section with the tail of each install's output.
- [ ] Verified by deleting `node_modules/` locally, triggering the SessionStart hook manually, confirming `npm test` works immediately after without user intervention.

## Pattern source
Captured by the Run-28 self-improvement pass per `.claude/commands/heartbeat.md` §3.

## Labels
`type:task`, `phase:meta`, `status:backlog`

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T17:14:25Z
**Updated:** 2026-04-19T02:52:01Z
**Closed:** 2026-04-19T02:52:01Z
**Labels:** type:task, status:backlog, autonomous-lead, phase:meta
