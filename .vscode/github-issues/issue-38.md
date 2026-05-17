---
id: 4287090200
number: 38
title: 'Run 32 §D: Self-scheduling via ScheduleWakeup — clamp(15min, 60min)'
state: closed
created_at: '2026-04-18T06:47:05Z'
updated_at: '2026-04-18T07:45:14Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/38
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/38'
closed_at: '2026-04-18T07:45:14Z'
---
# Run 32 §D: Self-scheduling via ScheduleWakeup — clamp(15min, 60min)

## Goal

Make the heartbeat self-pace so it runs continuously: next tick fires ~15 minutes after the last one stopped, capped at 60 minutes even if a tick ran long.

## Mechanism

At end of each `/heartbeat` tick, call:
\`\`\`
ScheduleWakeup({
  delaySeconds: clamp(ideal_delay_seconds, 900, 3600),
  prompt: "<<autonomous-loop-dynamic>>",
  reason: "heartbeat tick N complete; next tick in Xm for Y"
})
\`\`\`

- Minimum 900s (15 min) — avoids thrashing on fast ticks.
- Maximum 3600s (60 min) — avoids idling on slow ticks.
- `ideal_delay_seconds` = heuristic based on whether backlog has queued work (short delay) vs. idle (longer).

## Changes

- Update `.claude/commands/heartbeat.md` to include the ScheduleWakeup call at end-of-tick.
- Document the cadence rule in CLAUDE.md §6 (already added by sub-issue A).
- Smoke-test: run `/loop /heartbeat` once and verify the next-wake delay appears in tool output within 15-60 min range.

## Acceptance

- `/heartbeat` command ends with a `ScheduleWakeup` call.
- Delay is always within [900, 3600].
- Documented in CLAUDE.md.
- A tick report shows the scheduled next-wake time.

## Parent

Parent EPIC: #34

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T06:47:05Z
**Updated:** 2026-04-18T07:45:14Z
**Closed:** 2026-04-18T07:45:14Z
**Labels:** type:task, status:in-progress, autonomous-lead, area:heartbeat-pipeline

---

## Comments

### @xXKillerNoobYT - 2026-04-18T07:45:14Z

Closed by commit (D-20260418-016). Station 12 added to .claude/commands/heartbeat.md with the ScheduleWakeup({delaySeconds: clamp(ideal, 60, 270), prompt: "<<autonomous-loop-dynamic>>"}) form + three-bucket heuristic (idle 270s / queued 60s / collision-pause 270s). Clamp mandatory. See reports/run-38-summary.md.

