---
id: 4287738902
number: 54
title: >-
  Phase 3 §A.5: Replace check-arch.js placeholder with real architecture
  invariants
state: closed
created_at: '2026-04-18T11:04:08Z'
updated_at: '2026-04-18T11:07:30Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/54
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/54'
closed_at: '2026-04-18T11:07:30Z'
---
# Phase 3 §A.5: Replace check-arch.js placeholder with real architecture invariants

Per `plans/phase-3-plan.md` §A.5 (D-20260417-017). Supersedes the placeholder shipped in #22.

## Goal
`dashboard/scripts/check-arch.js` currently just `console.log`s and exits 0. Replace with real invariant checks so arch drift gets caught by `check:all`.

## Minimum viable invariants (v1)
1. **No UI → backbone imports**: nothing under `dashboard/app/**` or `dashboard/__tests__/**` imports `heartbeat.js`, `lib/mcp-client.js`, or any file in root `tests/`. (Reverse direction — backbone → UI — is fine; the dashboard is the surface, heartbeat is the engine.)
2. **No root-tests cross into dashboard**: nothing under root `tests/**` references `dashboard/` paths.
3. **No Docker references sneaking back**: nothing under `dashboard/`, `heartbeat.js`, `lib/**`, or `tests/**` contains the literal strings `docker-compose`, `Dockerfile`, or `docker run` (per D-20260417-005 no-Docker preference). `Docs/**` and `plans/**` are exempt — historical docs may mention the pre-D-005 state.

## Acceptance criteria
- [ ] `dashboard/scripts/check-arch.js` implements the 3 invariants above.
- [ ] Runs on current tree: prints `✓ <invariant>` for each passing check; exits 0 with overall `✓ all architecture invariants hold`.
- [ ] Deliberate violation test: add a synthetic violation in a scratch file, confirm the script catches it, revert. Run report documents the verification.
- [ ] `npm run check:arch` still wired (no change to the script name).
- [ ] `node scripts/cohesion-check.js --all` stays 6/6 green.
- [ ] `npm test` at root stays 41/41.

## Notes
- Use `readdirSync` + `readFileSync` + a simple regex match. No AST parser needed for v1 — invariants are grep-level.
- Phase 3 §A.5 is framed as "real architecture lint"; v1 covers the three most-load-bearing invariants today. Richer checks (layer boundaries, dep-cycle detection) can land as §A.5.1/§A.5.2 sub-issues if surfaced by future heartbeats.
- AC bullet "deliberate violation test" — capture the command output in the run report; don't commit the violation.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T11:04:08Z
**Updated:** 2026-04-18T11:07:30Z
**Closed:** 2026-04-18T11:07:30Z
**Labels:** type:task, status:in-progress, phase:3, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T11:07:29Z

Closed per D-20260418-024 (Run 46). Three invariants live; cohesion 6/6 green. See `reports/run-46-summary.md`.

