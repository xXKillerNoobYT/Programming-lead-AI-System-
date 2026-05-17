---
id: 4286932973
number: 31
title: 'Dependabot alert #11: glob CLI command injection via -c/--cmd'
state: closed
created_at: '2026-04-18T05:49:58Z'
updated_at: '2026-04-18T08:36:54Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653140
    name: 'type:bug'
    color: D73A4A
    description: Bug to fix
  - id: 10723653340
    name: 'status:in-progress'
    color: FBCA04
    description: Actively in work
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/31
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/31'
closed_at: '2026-04-18T08:36:54Z'
---
# Dependabot alert #11: glob CLI command injection via -c/--cmd

Per D-20260417-024 decomposition of Issue #12.

## Alert
- **Severity**: high
- **Package**: `glob` (transitive)
- **Advisory**: CLI command injection — `-c/--cmd` executes matches with `shell:true`, allowing injection via specially-crafted filenames.
- **GitHub alert**: https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/security/dependabot/11

## Goal
Upgrade `glob` past the vulnerable range. Note: the advisory affects the **CLI**, not the programmatic API. We likely never invoke `glob -c`, but the fix is still to bump to remove the vulnerable code path.

## Acceptance criteria
- [ ] `npm ls glob` — identify direct parents.
- [ ] Run `npm audit --json` to confirm vulnerable ranges + fix versions.
- [ ] Apply the fix (prefer `npm audit fix`; fall back to `overrides` if the parent dep is slow to bump).
- [ ] Verify: `npm test` and `npm run build` pass post-fix.
- [ ] `gh api /repos/:owner/:repo/dependabot/alerts/11` returns `state=fixed` after the PR merges.

## Notes
- Our codebase does **not** shell out to `glob -c/--cmd`, so exploitation risk on this project is near-zero. The upgrade is still required to close the alert and unblock merge gating.
- Bundle with #minimatch-issue if both live under the same parent (likely — both are common transitives via node-glob).

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T05:49:58Z
**Updated:** 2026-04-18T08:36:54Z
**Closed:** 2026-04-18T08:36:54Z
**Labels:** type:bug, status:in-progress, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T08:36:53Z

Closed per D-20260418-019 (Run 41). Root cause: devDep chain via `@typescript-eslint/parser`. `npm audit fix` resolved both; cohesion 6/6 green. See `reports/run-41-summary.md`.

