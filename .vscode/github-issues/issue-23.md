---
id: 4286733807
number: 23
title: 'Phase 3 §A.2: Create dashboard/scripts/cohesion-check.js runner'
state: closed
created_at: '2026-04-18T04:46:09Z'
updated_at: '2026-04-18T07:38:02Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/23
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/23'
closed_at: '2026-04-18T07:38:01Z'
---
# Phase 3 §A.2: Create dashboard/scripts/cohesion-check.js runner

Per `plans/phase-3-plan.md` §A.2 (D-20260417-015).

## Goal
Single entry point that runs every `check:*` script from §A.1 in sequence, captures stdout/stderr per check, stops at first failure with a readable report, and writes a machine-readable JSON artifact future heartbeats can parse.

## Acceptance criteria
- [ ] `dashboard/scripts/cohesion-check.js` exists and is invocable via `node scripts/cohesion-check.js` from `dashboard/` and `npm run check:all`.
- [ ] For each `check:*` script, invokes it, captures combined output, records duration, pass/fail.
- [ ] Stops at first failure (fail-fast) OR runs all + reports (configurable via `--all` flag). Default: fail-fast.
- [ ] Exits 0 only if every check passes; non-zero otherwise.
- [ ] Writes `reports/cohesion/<ISO-timestamp>.json` with shape:
  ```json
  {
    "ts": "2026-04-17T22:00:00Z",
    "decisionId": "D-YYYYMMDD-###",
    "passed": true,
    "checks": [
      { "name": "check:lint", "passed": true, "durationMs": 1423, "output": "…" },
      { "name": "check:tests", "passed": false, "durationMs": 6204, "output": "…" }
    ]
  }
  ```
- [ ] Uses `execFile`-style child spawn (no shell string interpolation); see the repo's security reminder about `src/utils/execFileNoThrow.ts` patterns.
- [ ] Runs on Windows, macOS, Linux (no Unix-only assumptions).
- [ ] Verified locally: `node scripts/cohesion-check.js` exits 0 on the current green baseline and writes the JSON artifact.

## Dependencies
- §A.1 (scripts must exist).

## Notes
`reports/cohesion/` may need a `.gitkeep` so the empty dir exists in git. Add `reports/cohesion/*.json` to `.gitignore` if the user prefers run artifacts uncommitted.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:46:09Z
**Updated:** 2026-04-18T07:38:02Z
**Closed:** 2026-04-18T07:38:01Z
**Labels:** type:task, status:in-progress, phase:3, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T07:38:00Z

Closed per D-20260418-015 (Run 37). All 8 AC items met; baseline 6/6 green captured in `reports/run-37-summary.md` + `reports/cohesion/2026-04-18T07-34-25.981Z.json`.

