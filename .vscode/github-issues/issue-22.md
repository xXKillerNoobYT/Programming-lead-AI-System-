---
id: 4286733465
number: 22
title: 'Phase 3 §A.1: Add check:* scripts to dashboard/package.json'
state: closed
created_at: '2026-04-18T04:46:00Z'
updated_at: '2026-04-18T07:05:19Z'
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
  - id: 10723653593
    name: 'phase:3'
    color: C5DEF5
    description: 'Phase 3 — checks, multi-project'
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/22
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/22'
closed_at: '2026-04-18T07:05:19Z'
---
# Phase 3 §A.1: Add check:* scripts to dashboard/package.json

Per `plans/phase-3-plan.md` §A.1 (D-20260417-015).

## Goal
Wire the cohesion-check surface by adding each individual check as its own npm script so the cohesion runner (§A.2) and humans can invoke them one at a time.

## Acceptance criteria
- [ ] `dashboard/package.json` has new scripts, each runnable standalone and exiting non-zero on failure:
  - `check:lint` → `next lint` (reuse existing)
  - `check:types` → `tsc --noEmit`
  - `check:tests` → `jest`
  - `check:coverage-threshold` → thin wrapper over `jest --coverage --coverageThreshold` reading the floor from `reports/coverage-floor.json` (§A.4 will write it; for now, hardcode 90)
  - `check:arch` → placeholder `node scripts/check-arch.js` that exits 0 until §A.5 fills it in
  - `check:deps` → `npm audit --audit-level=high --production` (non-zero on high/critical)
  - `check:all` → runs them in sequence and stops at the first non-zero (temporary; replaced by `cohesion-check.js` in §A.2)
- [ ] Each script has a matching one-liner in `dashboard/README.md` (or create `dashboard/CHECKS.md`).
- [ ] Run `npm run check:all` from `dashboard/` and capture the output in the run report — this becomes the current baseline.

## Dependencies
- None. Wave-1 unblocker.

## Notes
Don't install new devDeps in this Issue — if a check needs a tool not already in `package.json`, either use a placeholder (as with `check:arch`) or capture the dep-gap as a new `type:task` Issue and move on.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:46:00Z
**Updated:** 2026-04-18T07:05:19Z
**Closed:** 2026-04-18T07:05:19Z
**Labels:** type:task, status:in-progress, phase:3, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T07:05:16Z

Closed per D-20260418-008 (Run 31). Baseline: **5 green + 1 known-tracked red**. See `reports/run-31-summary.md`. PR: #43.

