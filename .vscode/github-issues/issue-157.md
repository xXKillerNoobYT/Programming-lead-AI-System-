---
id: 4292885061
number: 157
title: >-
  dashboard: add `check:peer-deps` script that catches unowned peer deps before
  they're pruned on fresh install
state: open
created_at: '2026-04-20T03:20:00Z'
updated_at: '2026-04-20T07:25:34Z'
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
  - id: 10728044845
    name: 'phase:meta'
    color: ededed
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/157
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/157'
---
# dashboard: add `check:peer-deps` script that catches unowned peer deps before they're pruned on fresh install

## Pattern observed
Two same-class bugs have now bitten fresh-install heartbeats: #86 (`jest-environment-jsdom`) and #155 (`@testing-library/dom`). Both share the same root cause:

> A devDep declares a peer dep that is not explicitly listed in our own `devDependencies`. npm 10+ prunes peers it doesn't own on a clean install, leaving the module unresolvable at test time.

Every session that starts with `rm -rf node_modules && npm install --legacy-peer-deps` (which is what `session-prefetch.sh` does under the hood) is exposed to this pattern until each peer is listed.

Run 35 cost ~4 tool calls debugging #155 before the first productive edit on #152 landed. That's the cost of every future occurrence of this pattern, and there are likely more peers hiding in `@testing-library/jest-dom`, `ts-jest`, `eslint-config-next`, etc.

## Proposed fix
Add a tiny `dashboard/scripts/check-peer-deps.js` that:

1. Walks every `dependencies` + `devDependencies` entry.
2. For each, reads `node_modules/<name>/package.json` and pulls out `peerDependencies`.
3. Fails the script if any listed peer is **not** itself in `dependencies` or `devDependencies` of the top-level `dashboard/package.json` (allow-list: `react`, `react-dom`, and any peer marked `peerDependenciesMeta.<name>.optional = true`).

Wire it as `check:peer-deps` in `package.json` and add it to `scripts/cohesion-check.js` so the full-house check catches it too.

## Acceptance criteria
- [ ] `dashboard/scripts/check-peer-deps.js` exists and exits non-zero when a required peer is missing, zero when clean.
- [ ] `package.json` has a `check:peer-deps` script.
- [ ] `scripts/cohesion-check.js` includes the new check (or it's explicitly wired into `check:all`).
- [ ] Running `node scripts/check-peer-deps.js` on `main` today reports clean after PR #156 merges (i.e., PR #156 makes this check green).
- [ ] A deliberate test: temporarily remove `@testing-library/dom` from `devDependencies`, run the script, see it fail → revert.

## Relationship to existing Issues
- Solves the class that #86 and #155 are instances of.
- Orthogonal to #89 (npm ci vs npm install) — both address the same "flaky fresh install" surface but from different angles.

## Pattern source
Captured by Run 35 self-improvement pass (CLAUDE.md §3 Step 4b + heartbeat §3 self-improvement protocol). Motivated by the 4-tool-call debugging tax spent on #155 at the top of this tick.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T03:20:00Z
**Updated:** 2026-04-20T07:25:34Z
**Labels:** type:task, status:backlog, autonomous-lead, phase:meta, priority:medium
