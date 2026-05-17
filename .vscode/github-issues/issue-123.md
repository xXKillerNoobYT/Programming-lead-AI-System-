---
id: 4290456249
number: 123
title: >-
  Phase 3 §A.3: wire cohesion-check into heartbeat.js as the agent-report →
  decision-log gate
state: closed
created_at: '2026-04-19T09:29:24Z'
updated_at: '2026-04-19T09:45:34Z'
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
  - id: 10723653593
    name: 'phase:3'
    color: C5DEF5
    description: 'Phase 3 — checks, multi-project'
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/123
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/123'
closed_at: '2026-04-19T09:45:34Z'
---
# Phase 3 §A.3: wire cohesion-check into heartbeat.js as the agent-report → decision-log gate

Per `AI plans/phase-3-plan.md` §A.3.

## Goal
Wire the §A.2 cohesion-check runner (`dashboard/scripts/cohesion-check.js`, exports `runCheck`/`BLOCKING`/`FLAGGED`) into `heartbeat.js` as the gate between "agent report received" and "decision logged."

## Acceptance criteria
- [ ] New module `lib/cohesion-gate.js` exports `runCohesionGate({ projectRoot, options })` returning `{ passed, blockingFailures, flaggedFailures, reportPath }`
- [ ] `heartbeat.js` calls the gate after the existing tick state-read; if `passed === false` writes the failure into the heartbeat tick report under a "Cohesion gate" section + does NOT append a Decision ID for that tick
- [ ] On `passed === true`, writes the gate's report path under "Cohesion gate" so audit trail survives
- [ ] New tests in `tests/cohesion-gate.test.js` cover: blocking-pass, blocking-fail, flagged-fail-still-passes, gate-runner-missing-graceful-skip
- [ ] Root `npm test` (node --test tests/*.test.js) green
- [ ] `heartbeat.js` still runs end-to-end without errors
- [ ] No UI changes (this is backbone only); arch invariant 1 (UI must not import backbone) still passes via `npm run check:arch`

## Dependencies
- §A.2 cohesion runner already on main (PR #120, D-027)
- §A.4 coverage-floor on main (PR #121, D-028)
- §A.5 arch invariants on main (PR #122, D-029)

## Out of scope
- Auto-revert on failure (§A.7 — separate Issue)
- Surfacing in Log tab (§A.5 column B — Phase 3 §D.5 territory)
- Wiring into Phase-4 CI workflow (§A.3 stays Phase-3 local-only)

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T09:29:24Z
**Updated:** 2026-04-19T09:45:34Z
**Closed:** 2026-04-19T09:45:34Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
