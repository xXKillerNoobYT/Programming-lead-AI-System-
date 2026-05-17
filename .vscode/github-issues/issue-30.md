---
id: 4286932631
number: 30
title: 'Dependabot alert #19: minimatch ReDoS — upstream bump'
state: closed
created_at: '2026-04-18T05:49:50Z'
updated_at: '2026-04-18T08:36:51Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/30
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/30'
closed_at: '2026-04-18T08:36:51Z'
---
# Dependabot alert #19: minimatch ReDoS — upstream bump

Per D-20260417-024 decomposition of Issue #12.

## Alert
- **Severity**: high
- **Package**: `minimatch` (transitive)
- **Advisory**: ReDoS via `matchOne()` combinatorial backtracking with multiple `!(…)` patterns.
- **GitHub alert**: https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/security/dependabot/19

## Goal
Upgrade `minimatch` past the vulnerable range by bumping the parent that pulls it in.

## Acceptance criteria
- [ ] `npm ls minimatch` inside `dashboard/` (and root if applicable) — identify the transitive parent (likely jest, glob, or a testing tool).
- [ ] Run `npm audit --json` to confirm the exact vulnerable ranges + fix versions.
- [ ] Apply the fix: either `npm audit fix`, a targeted `npm install <parent>@latest`, or an `overrides` entry in the relevant `package.json`.
- [ ] Verify: `npm test` and `npm run build` pass post-fix.
- [ ] `gh api /repos/:owner/:repo/dependabot/alerts/19` returns `state=fixed` after the PR merges.

## Notes
- This alert is independent of Dependabot PR #2 (which handles next). Do not bundle them; separate fixes reduce review risk.
- If the fix requires bumping a major version of a test framework, capture that scope in a child Issue (per D-20260417-018 sub-issue rule).

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T05:49:50Z
**Updated:** 2026-04-18T08:36:51Z
**Closed:** 2026-04-18T08:36:51Z
**Labels:** type:bug, status:in-progress, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T08:36:50Z

Closed per D-20260418-019 (Run 41). Root cause: devDep chain via `@typescript-eslint/parser`. `npm audit fix` resolved both; cohesion 6/6 green. See `reports/run-41-summary.md`.

