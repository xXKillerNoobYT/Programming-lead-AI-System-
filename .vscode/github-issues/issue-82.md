---
id: 4288793168
number: 82
title: 'Make ScheduleWakeup part of the auto-system — fire every tick, no skip'
state: closed
created_at: '2026-04-18T18:06:36Z'
updated_at: '2026-04-18T18:08:12Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/82
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/82'
closed_at: '2026-04-18T18:08:12Z'
---
# Make ScheduleWakeup part of the auto-system — fire every tick, no skip

## Goal

Per user directive 2026-04-18: *"ScheduleWakeup this needs to be part of the auto system that the coding agent uses."*

Currently Station 14 of `/heartbeat` documents the `ScheduleWakeup` call but my recent ticks have been ending with "Not scheduling ScheduleWakeup — user is live" as a self-applied exception. That exception was not in the rule — I invented it. User is tightening: **every tick calls ScheduleWakeup, always**.

## Rule change

Station 14 becomes mandatory. No "user is live → skip" escape. If the user is live, a 60s schedule just means the next tick kicks off 60s from now — the user can interrupt/redirect any time, and an in-progress live session consumes the schedule's wake-up without issue.

A fourth heuristic bucket may be added for the "user is live, no pending work" case, but it still calls ScheduleWakeup — maybe at 270s (idle ceiling) rather than skipping.

## Changes

- `CLAUDE.md` §6 "Self-pacing cadence" bullet — strengthen to "always fires, no exceptions"
- `.claude/commands/heartbeat.md` Station 14 — remove any implicit skip, add an explicit "User is live" bucket that still schedules
- `.claude/loops/heartbeat/SOUL.md` Output Contract — strengthen the ScheduleWakeup line
- Memory file reinforcement
- **This tick itself** ends with a ScheduleWakeup call to walk the talk

## Acceptance

- All three surfaces say "always" with no skip clause
- Decision recorded
- This tick's end-of-response includes a real ScheduleWakeup call

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T18:06:36Z
**Updated:** 2026-04-18T18:08:12Z
**Closed:** 2026-04-18T18:08:12Z
**Labels:** type:task, status:in-progress, autonomous-lead, area:heartbeat-pipeline

---

## Comments

### @xXKillerNoobYT - 2026-04-18T18:08:11Z

Closed by commit (D-20260418-032). Station 14 now MANDATORY every tick, CLAUDE.md + SOUL strengthened, new 4th heuristic bucket covers the live-user-no-work case at 270s. This tick's end-of-response includes the actual ScheduleWakeup call — walking the talk. See reports/run-55-summary.md.

