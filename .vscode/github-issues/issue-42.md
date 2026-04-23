---
id: 4287119101
number: 42
title: Parallel-session D-ID collision protocol is insufficient
state: closed
created_at: '2026-04-18T06:56:57Z'
updated_at: '2026-04-18T07:22:33Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653140
    name: 'type:bug'
    color: D73A4A
    description: Bug to fix
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/42
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/42'
closed_at: '2026-04-18T07:22:33Z'
---
# Parallel-session D-ID collision protocol is insufficient

## Problem

During Run 32 (CLAUDE.md pipeline spec — D-20260418-009), my D-ID claim collided **three times** in a single tick with parallel Claude Code sessions also writing to `decision-log.md`:

1. First claim: **D-20260418-006** → already taken by parallel agent's weekly-agent-update (Run 29)
2. Second claim: **D-20260418-007** → taken first by mempalace-portability (Run 30), then a SECOND parallel session *also* took D-007 for Part-7-rename (Run 30)
3. Third claim: **D-20260418-008** → had to be bumped to avoid another race
4. Final: **D-20260418-009** — after yet another re-read showed more movement

## Existing protocol

`D-20260418-004` was a reserved placeholder per D-005 — the hope was that reserving a slot would prevent monotonic collisions. It doesn't work when ≥3 parallel sessions are all claiming the *next* D-ID concurrently.

## Capture (per Polsia Rule 2)

This is a genuine coordination bug. Symptoms:
- Multiple parallel sessions all think they are "the heartbeat."
- Each claims the next monotonic D-ID without realtime sync.
- The same "Run 30" title was claimed by 3 different sessions with 3 different scopes.
- Issue titles had to be renamed Run 29 → Run 30 → Run 31 → Run 32 across the tick.

## Proposed approaches (to be brainstormed)

1. **Timestamp-based D-IDs** — `D-YYYYMMDD-HHMMSS` instead of `D-YYYYMMDD-###`. Collision-free by construction.
2. **Single-session lock** — `.claude/heartbeat-session.lock` file pinned via flock. Parallel sessions must wait or abort.
3. **Reserve via commit** — the parallel agents must each commit their D-ID reservation immediately (empty decision-log entry first), then fill it in. Read-after-commit prevents stealing.
4. **Batch-commit decision-log** — `decision-log.md` is append-only per commit; git will auto-merge appends. Collisions become non-destructive.
5. **Disallow parallel heartbeats** — user directive to run only one at a time.

## Acceptance

- Protocol chosen (via Dev-Q&A if user input needed) + committed as a new Decision ID.
- `CLAUDE.md` §6 updated to reflect the new protocol.
- Retroactive consistency sweep across the log if scheme changes.

## Source

Run 32 report; D-20260418-009.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T06:56:57Z
**Updated:** 2026-04-18T07:22:33Z
**Closed:** 2026-04-18T07:22:33Z
**Labels:** type:bug, status:backlog, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T07:22:33Z

Closed by commit (D-20260418-013). Singular-heartbeat rule encoded in three places: (1) .claude/loops/heartbeat/SOUL.md Core Identity + dedicated section, (2) CLAUDE.md §6 bullet, (3) weekly-agent-update SOUL's never-change-first-2-sentences guardrail protects the identity line from drift. See reports/run-35-summary.md for the five-collision history this session demonstrates why the rule was needed.

