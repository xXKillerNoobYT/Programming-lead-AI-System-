---
id: 4287663006
number: 52
title: >-
  Phase 3 §A.4: Coverage-floor writer — auto-persist last-green coverage to
  reports/coverage-floor.json
state: closed
created_at: '2026-04-18T10:32:13Z'
updated_at: '2026-04-18T10:37:22Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/52
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/52'
closed_at: '2026-04-18T10:37:22Z'
---
# Phase 3 §A.4: Coverage-floor writer — auto-persist last-green coverage to reports/coverage-floor.json

Per `plans/phase-3-plan.md` §A.4 (D-20260417-017).

## Goal
On every green cohesion run, persist the latest coverage percentages to `reports/coverage-floor.json`. `check:coverage-threshold` (from #22) already reads this file when present — §A.4 is the producer side. Together they turn "coverage must stay ≥ 90%" from a hardcoded floor into a ratcheting floor that only ever goes up.

## Acceptance criteria
- [ ] `dashboard/jest.config.js` adds `coverageReporters: ['text', 'lcov', 'json-summary']` so `coverage/coverage-summary.json` gets written on every `--coverage` run.
- [ ] `dashboard/scripts/cohesion-check.js` — after all checks pass AND `coverage/coverage-summary.json` exists, read the top-level totals and write `reports/coverage-floor.json` with `{ statements, branches, functions, lines, ts, decisionId }`.
- [ ] On a failing cohesion run, **do not** update `coverage-floor.json` (don't ratchet down).
- [ ] `check-coverage-threshold.js` already reads `reports/coverage-floor.json.statements` as the floor — verify round-trip: run cohesion once to populate the file, re-run to confirm the threshold uses the written value.
- [ ] `reports/coverage-floor.json` is committed (source of truth for regression tracking; unlike `reports/cohesion/*.json` which are per-run artifacts).
- [ ] `npm test` at root stays 41/41 green; `npm run check:all` in `dashboard/` stays 6/6 green.

## Dependencies
- #22 §A.1 (check scripts exist). ✓ closed
- #23 §A.2 (cohesion runner writes the JSON report). ✓ closed

## Notes
- The floor file is committed so CI can compare against it. Every green main push updates it — over time it's a monotonic trail of coverage improvement.
- Budget: only ever ratchets UP. Drops must be deliberate — if a refactor legitimately removes covered code, the fix is to edit `coverage-floor.json` in the same PR that drops coverage and justify in the decision log.
- Phase 3 §E.3 (`CoverageTrend` chart) reads this file as its time-series input.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T10:32:13Z
**Updated:** 2026-04-18T10:37:22Z
**Closed:** 2026-04-18T10:37:22Z
**Labels:** type:task, status:in-progress, phase:3, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T10:37:20Z

Closed per D-20260418-023 (Run 45). Round-trip verified; first real floor captured at 95.45/91.66/92/94.59. See `reports/run-45-summary.md`.

