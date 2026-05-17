---
id: 4288516624
number: 58
title: Wire remaining superpowers skills into /heartbeat pipeline + SOUL
state: closed
created_at: '2026-04-18T16:13:08Z'
updated_at: '2026-04-18T16:15:39Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/58
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/58'
closed_at: '2026-04-18T16:15:39Z'
---
# Wire remaining superpowers skills into /heartbeat pipeline + SOUL

## Goal

Per user directive 2026-04-18 (`/superpowers:using-superpowers` skill with arg "make sure that this loop and heartbeat is taking advantage of using superpowers"): ensure the `/heartbeat` command and its SOUL explicitly reference and invoke the full relevant catalog of superpowers skills.

## Gap audit

Currently wired (5 of ~13):
- `superpowers:brainstorming` (Station 3)
- `superpowers:writing-plans` (Station 3)
- `superpowers:test-driven-development` (Station 5)
- `superpowers:systematic-debugging` (Station 5b)
- `superpowers:verification-before-completion` (Station 7)

Missing — worth wiring:
- `superpowers:using-superpowers` — meta-discipline, pre-tick
- `superpowers:receiving-code-review` — Station 10 aftermath
- `superpowers:finishing-a-development-branch` — Station 11 pre-merge sanity
- `superpowers:dispatching-parallel-agents` — optional at plan-time (multi-task ticks)
- `superpowers:subagent-driven-development` — plan-driven execution with subagents
- `superpowers:executing-plans` — complex-plan execution

Not relevant:
- `superpowers:using-git-worktrees` (D-026 chose branches)
- `superpowers:writing-skills` (only for skill-authoring, not pipeline)
- `superpowers:requesting-code-review` (redundant with Station 10's pr-review-toolkit)

## Changes

1. `.claude/commands/heartbeat.md` — add "Superpowers catalog — skills this pipeline uses" reference section; augment Stations 3, 10, 11 with the missing skills
2. `.claude/loops/heartbeat/SOUL.md` — add a compact "Superpowers invocation map" table (which skill at which station)

## Acceptance

- All high-value superpowers skills named at their point of use
- Tick-start discipline references `using-superpowers` (self-referential but correct)
- No over-inclusion (skip git-worktrees, writing-skills, requesting-code-review)
- Decision ID + run report recorded

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T16:13:08Z
**Updated:** 2026-04-18T16:15:39Z
**Closed:** 2026-04-18T16:15:39Z
**Labels:** type:task, status:in-progress, autonomous-lead, area:heartbeat-pipeline

---

## Comments

### @xXKillerNoobYT - 2026-04-18T16:15:39Z

Closed by commit (D-20260418-029). 10 superpowers skills now wired (up from 5): using-superpowers pre-tick, brainstorming/writing-plans/dispatching-parallel-agents/subagent-driven-development/executing-plans at Station 3, test-driven-development at 5, systematic-debugging at 5b, verification-before-completion at 7, receiving-code-review at NEW 10b, finishing-a-development-branch pre-Station-11. Catalog table added to .claude/commands/heartbeat.md; compact map added to SOUL. Skipped using-git-worktrees (D-026), writing-skills, requesting-code-review (redundant). See reports/run-52-summary.md.

