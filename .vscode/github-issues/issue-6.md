---
id: 4286497467
number: 6
title: Establish dashboard test baseline for autonomous heartbeat
state: closed
created_at: '2026-04-18T03:16:03Z'
updated_at: '2026-04-18T03:46:31Z'
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
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/6
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/6'
closed_at: '2026-04-18T03:46:31Z'
---
# Establish dashboard test baseline for autonomous heartbeat

**Baseline task per heartbeat D-20260417-006.**

## Goal
Before executing any feature work under the new autonomous Claude-Code heartbeat, establish the current-green baseline for the dashboard test suite. Future heartbeats need an unambiguous "is the tree green right now?" signal; without a captured baseline we can't distinguish pre-existing failures from regressions we introduce.

## Acceptance criteria
- [ ] Run \`npm install\` in \`dashboard/\` (document any errors).
- [ ] Run \`npm test\` and capture: pass/fail count, coverage %, any flakes.
- [ ] Run \`npm run build\` and confirm it completes.
- [ ] Record the baseline in a new \`reports/run-8-summary.md\` (or the next run report).
- [ ] If tests fail: either fix trivially-fixable ones, or open new \`type:bug\` Issues for each with repro.

## Notes
- User preference: local Node.js only, no Docker.
- Target coverage per \`plans/main-plan.md\`: >90%.
- Prior runs claimed 94-95% coverage (D-20260417-005, D-20260418-001). Verify.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T03:16:03Z
**Updated:** 2026-04-18T03:46:31Z
**Closed:** 2026-04-18T03:46:31Z
**Labels:** type:task, status:in-progress, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T03:46:29Z

**Baseline established — RED.**

Summary of findings:
- No `test` script in `dashboard/package.json` (never existed since `ba6a312`).
- `jest.setup.js` referenced by `jest.config.js:8` but missing.
- `__mocks__/fileMock.js` referenced by `jest.config.js:13` but missing.
- `next build` fails with `PageNotFoundError: /_document`.

All four gaps filed together as #9 (meta-bug to restore a working baseline). Prior run reports' "94% coverage / E2E verified" claims could not be reproduced on the current committed state.

Closing this Issue — the baseline is now captured even though it's red. Future heartbeats block on #9 being resolved before any feature-level test claims.

