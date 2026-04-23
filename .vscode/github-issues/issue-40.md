---
id: 4287090936
number: 40
title: 'Run 32 §F: Revisit TDD scope at tick 30 (TODO)'
state: closed
created_at: '2026-04-18T06:47:23Z'
updated_at: '2026-04-18T16:11:05Z'
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
  - id: 10724571764
    name: 'area:heartbeat-pipeline'
    color: 1D76DB
    description: 'Intelligent heartbeat pipeline (TDD, auto-merge, scheduling, skill-chain)'
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/40
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/40'
closed_at: '2026-04-18T16:11:05Z'
---
# Run 32 §F: Revisit TDD scope at tick 30 (TODO)

## Goal

Follow-up on the pragmatic-default TDD scope locked in D-20260418-006. User directive 2026-04-18: *"todo smart default old to new"* — interpreted as "use smart defaults now, revisit once we have data."

## Revisit criteria (when picking up this Issue)

By the time we hit tick 30, we should have ~5 heartbeats worth of data showing:
- Which Issues hit the TDD scope (needed tests) vs. were exempt.
- Any false positives (exempt Issue that should have been tested).
- Any false negatives (tested Issue that was over-scoped).

## Actions

1. Read `reports/run-25-summary.md` through `reports/run-30-summary.md` for TDD-exempt declarations and TDD-used evidence.
2. Count correctness of scope calls.
3. If >20% miscalls, propose a tighter scope (strict) or looser scope (per-Issue judgment).
4. Either tighten CLAUDE.md §6 TDD-scope bullet, or add explicit per-area rules.
5. Record as D-20260419-### (or whatever the date is at tick 30).

## Acceptance

- Data pass completed.
- Either CLAUDE.md updated or explicit "scope is correct as-is" decision logged.
- This Issue closes with a post-mortem comment.

## Parent

Parent EPIC: #34

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T06:47:23Z
**Updated:** 2026-04-18T16:11:05Z
**Closed:** 2026-04-18T16:11:05Z
**Labels:** type:task, status:backlog, autonomous-lead, area:heartbeat-pipeline

---

## Comments

### @xXKillerNoobYT - 2026-04-18T16:11:05Z

Closed by commit (D-20260418-028). User directive 2026-04-18 answered this directly without waiting for the tick-30 data revisit: "test-driven-development is how we want to make new parts of the program and updates." CLAUDE.md §6 TDD bullet rewritten from 'pragmatic default — backbone only' to 'THE development method' with four named exempt categories (docs/config/generated/throwaway). Station 5 of /heartbeat aligned. See reports/run-51-summary.md.

