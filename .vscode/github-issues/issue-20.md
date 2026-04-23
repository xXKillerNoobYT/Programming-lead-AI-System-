---
id: 4286712440
number: 20
title: 'Bootstrap heartbeat.js: minimal tick loop with state read + tick report'
state: closed
created_at: '2026-04-18T04:36:54Z'
updated_at: '2026-04-18T04:45:30Z'
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
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/20
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/20'
closed_at: '2026-04-18T04:44:08Z'
---
# Bootstrap heartbeat.js: minimal tick loop with state read + tick report

**Captured per user directive 2026-04-17**: *"start with the core, the backbone, one little area at a time getting that done really well."* Option 2 picked at Run 15 handoff.

## Context
Per `Docs/Plans/Part 1.md` §2-§3 and the end-goal memory, the **core backbone** of DevLead MCP is `heartbeat.js` — the autonomous scheduler that reads state, decomposes tasks, delegates to 3rd-party coding agents via MCP, reviews outputs, runs hourly Grok escalation. This is the analog of what Claude-Code-in-a-session has been doing manually these last 5 heartbeats. The program must eventually do it without Claude Code in the loop.

## Scope for THIS Issue (one atomic area, done well)
**v0: read-only tick.** No delegation, no LLM calls, no WebSocket yet. Just prove the scheduler runs and captures state.

- `heartbeat.js` at project root, runnable as `node heartbeat.js` (one-shot) or `node heartbeat.js --watch` (loop)
- Produces a `reports/heartbeat-tick-<ISO-timestamp>.md` with:
  - Current git branch + short SHA
  - Open GitHub Issue count (backlog + in-progress)
  - Latest `reports/run-*.md` summary line
  - Last 3 Decision IDs from `decision-log.md`
- `package.json` root-level script: `npm run heartbeat` → `node heartbeat.js`
- `package.json` root-level script: `npm run heartbeat:watch` → `node heartbeat.js --watch` (interval configurable via env, default 60s)
- Minimum Jest tests for pure functions (state-extraction logic, report formatting); shell-outs are mocked or skipped in CI

## Out of scope (future Issues)
- MCP tool registry / task decomposition / 3rd-party agent delegation / Grok / review loop / WebSocket feed

## Acceptance criteria
- [ ] `heartbeat.js` at repo root, runs via `node heartbeat.js` without errors on a clean checkout
- [ ] One tick produces a valid `reports/heartbeat-tick-*.md` with the 4 state blocks
- [ ] `npm run heartbeat` + `npm run heartbeat:watch` work from repo root
- [ ] Jest tests cover pure helpers (parse git branch output, extract D-IDs, format tick report)
- [ ] `npm test` passes
- [ ] Real command output in the run report (no claims without evidence)
- [ ] Decision ID logged; docs updated if `CLAUDE.md`/`README.md` need to reference the new scripts

## Why this is the right next piece
- Smallest atomic unit of "core program actually runs"
- Matches user's iteration philosophy (one area, done well, before moving on)
- Produces something visible/testable immediately — future heartbeats can read its tick files
- Paves the way for MCP tool registry + delegation in subsequent Issues

## Source
User directive 2026-04-17 + `Docs/Plans/Part 1.md` §2-§3 + end-goal philosophy memory. Post-Run-15 handoff.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:36:54Z
**Updated:** 2026-04-18T04:45:30Z
**Closed:** 2026-04-18T04:44:08Z
**Labels:** type:task, status:backlog, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T04:44:07Z

Closed as duplicate of #18 per D-20260417-015 (Run 17 heartbeat). Same scope; #18 was created first (during Run 16) and was the better-structured ticket. Work landed in commit 0559cf8 on `run-17/phase-3-plan`. See #18 for AC-level closure notes.

### @xXKillerNoobYT - 2026-04-18T04:45:30Z

Backfill comment per D-20260417-015 (Run 17 heartbeat).

This Issue was closed just as I was about to — recording the audit trail here for the decision log / future heartbeats:

**Shipped in commit `982e25e`** — "chore: sync dashboard tests, plans, and project updates" (2026-04-17 16:32 MDT, user-authored outside the heartbeat workflow). The v0 read-only tick loop matches the Issue body scope exactly:

- [x] `heartbeat.js` at repo root, runs as `node heartbeat.js` (one-shot) or `node heartbeat.js --watch` via the `main()` argv check + `if (require.main === module)` guard
- [x] Produces `reports/heartbeat-tick-<ISO-timestamp>.md` with all 4 state blocks (git, GH Issues, latest run report, last 3 Decision IDs) — see `formatTickReport()` in heartbeat.js:121-153
- [x] Root `package.json` scripts: `heartbeat` + `heartbeat:watch` (interval configurable via `HEARTBEAT_INTERVAL_MS` env, default 60_000ms)
- [x] Unit tests cover pure helpers — `tests/heartbeat.test.js` has 24 tests across 6 describe blocks
- [x] `npm test` passes 24/24 (verified this heartbeat: `ℹ tests 24 / ℹ pass 24 / ℹ fail 0`)
- [x] Decision ID D-20260417-015 backfilled into `decision-log.md` this run

D-20260417-015 was previously referenced in the heartbeat.js header comment but was missing from decision-log.md — fixed in Run 17.

Report: `reports/run-17-summary.md`.

