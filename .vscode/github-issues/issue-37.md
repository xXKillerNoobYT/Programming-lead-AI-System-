---
id: 4287089576
number: 37
title: 'Run 32 §C: Auto-merge gate implementation — check script + CI integration'
state: open
created_at: '2026-04-18T06:46:55Z'
updated_at: '2026-04-20T07:25:40Z'
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
  - id: 10739055869
    name: 'priority:low'
    color: C5DEF5
    description: Nice-to-have; work on when higher bands empty
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/37
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/37'
---
# Run 32 §C: Auto-merge gate implementation — check script + CI integration

## Goal

Implement the five-gate auto-merge check so the pipeline station "Merge" can act on it.

## Gates (all must pass for auto-merge)

1. Full relevant test suite green on the PR branch.
2. No review findings from `pr-review-toolkit:review-pr` panel rated ≥ blocker.
3. No open `silent-failure-hunter` findings on the PR.
4. No merge conflicts vs. `main`.
5. Issue (referenced in the PR body) carries the `auto-merge:ok` label.

## Changes

- `scripts/auto-merge-gate.js` (new) — pure function `checkGates({prNumber, issueNumber}) → {pass, failures[]}`.
- Unit tests in `tests/auto-merge-gate.test.js` using Node built-in test runner.
- `/heartbeat` command's Merge station calls this check. If `pass`: `gh pr merge --squash --delete-branch`. If not: comment failures on PR, leave open.
- Optional GitHub Actions workflow `.github/workflows/auto-merge-gate.yml` that runs the same check on PR events and posts a status check.

## Acceptance

- Script exists with tests (red → green TDD evidence in run report).
- `/heartbeat` command references it.
- Dry-run on a test PR confirms correct gate pass/fail behavior.

## Parent

Parent EPIC: #34

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T06:46:55Z
**Updated:** 2026-04-20T07:25:40Z
**Labels:** type:task, status:backlog, autonomous-lead, area:heartbeat-pipeline, priority:low
