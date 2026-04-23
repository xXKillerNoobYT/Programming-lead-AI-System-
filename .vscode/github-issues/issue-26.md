---
id: 4286838633
number: 26
title: >-
  Phase 4 §B.1: GitHub Actions CI workflow — lint + types + tests +
  coverage-gate on PR
state: closed
created_at: '2026-04-18T05:19:30Z'
updated_at: '2026-04-18T08:07:27Z'
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
  - id: 10723653672
    name: 'phase:4'
    color: C5DEF5
    description: Phase 4 — production scale
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/26
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/26'
closed_at: '2026-04-18T08:07:27Z'
---
# Phase 4 §B.1: GitHub Actions CI workflow — lint + types + tests + coverage-gate on PR

Per `plans/phase-4-plan.md` §B.1 (D-20260417-022).

## Goal
Every PR to `main` runs the Phase 3 cohesion-check battery. Failed checks block merge. Turn "green on main" from a claim into a gated fact.

## Acceptance criteria
- [ ] `.github/workflows/ci.yml` exists and triggers on `pull_request` targeting `main`.
- [ ] Job matrix runs on `ubuntu-latest` (add `windows-latest` in a follow-up once the Windows path audit §C.6 lands).
- [ ] Steps: checkout → setup-node@v4 (Node 20) → `npm ci` (root) → `npm ci` (dashboard/) → `npm test` (root node:test) → `cd dashboard && npm run check:all` (or the individual `check:*` scripts if #22 is still open) → upload coverage as artifact.
- [ ] Concurrency group cancels stale runs on force-push.
- [ ] Workflow completes in < 5 min on a green main.
- [ ] Verified: open a draft PR that introduces a deliberate regression (e.g. a failing test) → CI fails; revert → CI passes.

## Dependencies
- Phase 3 §A.1 / §A.2 (#22, #23) — the `check:*` scripts and cohesion-check runner must exist first. If they don't by the time this Issue is picked up, either block the Issue or substitute a minimal inline `npm test` invocation and capture the proper integration as a follow-up.

## Notes
- No `secrets.GITHUB_TOKEN` scope increase needed for this workflow — default read-only is enough.
- Do not add CodeQL here; that's §B.3.
- Do not add release automation here; that's §B.2.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T05:19:30Z
**Updated:** 2026-04-18T08:07:27Z
**Closed:** 2026-04-18T08:07:27Z
**Labels:** type:task, status:in-progress, phase:4, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T08:07:26Z

Closed per D-20260418-018 (Run 40). `.github/workflows/ci.yml` ships; first real exercise happens on PR merge. See `reports/run-40-summary.md`.

