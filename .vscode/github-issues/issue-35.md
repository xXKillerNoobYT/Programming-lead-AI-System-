---
id: 4287088972
number: 35
title: 'Run 32 §A: CLAUDE.md §3/§5/§6/§9 edits — agent-side pipeline spec'
state: closed
created_at: '2026-04-18T06:46:36Z'
updated_at: '2026-04-18T06:59:07Z'
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
  - id: 10723653340
    name: 'status:in-progress'
    color: FBCA04
    description: Actively in work
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10724571764
    name: 'area:heartbeat-pipeline'
    color: 1D76DB
    description: 'Intelligent heartbeat pipeline (TDD, auto-merge, scheduling, skill-chain)'
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/35
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/35'
closed_at: '2026-04-18T06:59:07Z'
---
# Run 32 §A: CLAUDE.md §3/§5/§6/§9 edits — agent-side pipeline spec

## Goal

Bring `CLAUDE.md` into alignment with D-20260418-006 (Run 29 intelligent heartbeat pipeline).

## Changes

### §3 Step 4 (Execute) — replace with full pipeline
The current bullet list ("Write tests alongside code…") becomes a pipeline of skill-driven stations: Brainstorm/plan → Branch → TDD → Capture → Verify → Commit → PR → Review → Merge (gated) → Design-question escape hatch.

### §3 Step 5 (Verify)
Update to reference Step 4e (pipeline verify station) and retain standalone verify rules for meta/non-code ticks.

### §6 Project Conventions — add four bullets
1. TDD mandatory for code-producing Issues (pragmatic scope — see D-20260418-006).
2. Auto-merge policy — gated (5 gates + `auto-merge:ok` label).
3. Heartbeat pipeline is pipeline-shaped, not procedural.
4. Self-pacing cadence — `ScheduleWakeup` with `clamp(delay, 900, 3600)`.

### §9 Completion Criteria — add two bullets
1. Every code change has a test that was observed to fail before the fix existed.
2. TDD-exempt Issues must say so explicitly in the run report.

## Acceptance

- CLAUDE.md reflects all four sections above.
- Decision ID D-20260418-006 cited in the commit.
- Existing phrasing like "Write tests alongside code" removed (conflicts with TDD Iron Law).

## Parent

Parent EPIC: #34

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T06:46:36Z
**Updated:** 2026-04-18T06:59:07Z
**Closed:** 2026-04-18T06:59:07Z
**Labels:** type:task, status:in-progress, autonomous-lead, area:heartbeat-pipeline

---

## Comments

### @xXKillerNoobYT - 2026-04-18T06:59:06Z

Closed by commit b5eb3cd — CLAUDE.md §3/§5/§6/§9 updated per D-20260418-009. See reports/run-32-summary.md for AC walkthrough. Parent EPIC #34 has 5 children remaining (#36 SOUL.md directive, #37 auto-merge gate, #38 ScheduleWakeup, #39 /heartbeat skill-chain, #40 TDD-scope revisit).

