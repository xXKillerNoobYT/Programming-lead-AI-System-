---
id: 4287090571
number: 39
title: 'Run 32 §E: Pipeline skill-chain wiring in /heartbeat command'
state: closed
created_at: '2026-04-18T06:47:15Z'
updated_at: '2026-04-18T07:49:17Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/39
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/39'
closed_at: '2026-04-18T07:49:17Z'
---
# Run 32 §E: Pipeline skill-chain wiring in /heartbeat command

## Goal

Update `.claude/commands/heartbeat.md` so a single `/heartbeat` invocation drives the entire 14-station pipeline (per D-20260418-006) with explicit skill invocations at each station.

## Skill map per station

| # | Station | Skill / Subagent |
|---|---|---|
| 1 | Orient | native (git/gh reads + Dev-Q&A + reports/decision-log/memory) |
| 2 | Pick | `issue-triage-picker` subagent |
| 3 | Plan | `superpowers:brainstorming` + `superpowers:writing-plans` (conditional) |
| 4 | Branch | native (Bash) |
| 5 | Build | `superpowers:test-driven-development` |
| 5b | Debug | `superpowers:systematic-debugging` (on ≥3 failed fix attempts) |
| 6 | Capture | native (gh issue create) |
| 7 | Verify | `superpowers:verification-before-completion` |
| 8 | Commit | `commit-commands:commit` |
| 9 | PR | `commit-commands:commit-push-pr` |
| 10 | Review | `pr-review-toolkit:review-pr` |
| 11 | Merge | auto-merge-gate script (sub-issue C) |
| 12 | Record | native (writes) + `run-report-validator` subagent |
| 13 | Plan-ahead | `superpowers:writing-plans` if backlog < 3 and plans/ is fuzzy |
| 14 | Next | `ScheduleWakeup` (sub-issue D) |
| — | Escape | `post-dev-qa` skill for blocking design questions |

## Acceptance

- `.claude/commands/heartbeat.md` reflects the full map.
- Each station's skill invocation is explicit (with conditions noted).
- Runs cleanly on a dry-run tick (simple Issue like a doc fix) showing every applicable station fires.

## Parent

Parent EPIC: #34

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T06:47:15Z
**Updated:** 2026-04-18T07:49:17Z
**Closed:** 2026-04-18T07:49:17Z
**Labels:** type:task, status:in-progress, autonomous-lead, area:heartbeat-pipeline

---

## Comments

### @xXKillerNoobYT - 2026-04-18T07:49:16Z

Closed by commit (D-20260418-017). Full 14-station pipeline wired into .claude/commands/heartbeat.md with explicit skill invocations at each station. Station 11 (auto-merge THIS tick's PR, gated) kept distinct from 11b (cross-tick sweep). Escape hatch to post-dev-qa documented once. See reports/run-39-summary.md for the station table.

