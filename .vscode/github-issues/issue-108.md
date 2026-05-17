---
id: 4289950616
number: 108
title: >-
  Branch-name/content drift: bugfix/react-19-stable-upgrade absorbed Issue #24
  feature work
state: open
created_at: '2026-04-19T04:55:50Z'
updated_at: '2026-04-20T07:26:00Z'
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
  - id: 10739055869
    name: 'priority:low'
    color: C5DEF5
    description: Nice-to-have; work on when higher bands empty
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/108
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/108'
---
# Branch-name/content drift: bugfix/react-19-stable-upgrade absorbed Issue #24 feature work

**Parent**: #105 (recurring bug-hunt /loop)
**Fingerprint**: `FP: git/branch-drift/bugfix-absorbs-feature`
**Surfaced by**: bug-hunt /loop tick 1 (2026-04-19)

## Symptom

`bugfix/react-19-stable-upgrade` was created (reflog `@{3}`, then reset to `origin/main` at `@{2}`) as a narrow bugfix for the React-19-RC peer conflict (#87). Per the `git-flow-lite` convention (`feedback_branching_strategy_git_flow_lite` memory), a `bugfix/*` branch should be narrow — one Issue, one fix.

Current `git log --oneline -5`:

```
f37fc88 docs(reports): Run 203 summary — Issue #24 AC 8/8 satisfied
de75af7 feat(dashboard): Issue #24 final leaf — Zustand WS store + React 19 stable (D-20260419-017)
5f8cd2a docs(reports): Run 202 summary — MainPanes leaf
f00d03e feat(dashboard): Issue #24 MainPanes leaf — two-pane hybrid layout (D-20260419-016)
dbb8183 docs(reports): Run 198 summary — LeftRail leaf
```

The branch now contains **four feature leaves for Issue #24** plus the React-19 fix — that's epic-scoped feature work on what was supposed to be a hotfix.

## Why this matters

1. PR #103 is open for the React-19 fix but will drag in all of Issue #24's unfinished feature work if reviewers aren't careful.
2. The branch name lies about its scope — future-Claude (or the user) can't trust branch names as a signal.
3. This is the exact "silent process drift" the /loop is meant to catch: the singular-heartbeat mutex was supposed to prevent parallel work but clearly didn't fully succeed.

## Proposed fix

Three options:

- **A**: Rename the branch to reflect actual scope (`feature/issue-24-shell-routing` or similar) and open Issue #24's PR from it, then cherry-pick the React-19 commit back to a narrow `bugfix/react-19-stable-upgrade-v2` for PR #103. **Most work, cleanest history.**
- **B**: Update PR #103's title/description to acknowledge the bundled scope ("React 19 fix + Issue #24 shell routing end-to-end"). **Low effort, honest about state.**
- **C**: Close PR #103, re-create as narrow single-commit PR, rebase remaining Issue-24 work onto a new feature branch. **Medium effort.**

## AC

- [ ] Branch name matches branch content (either via rename, split, or honest re-scoping of PR #103)
- [ ] No future bugfix/* branches accumulate unrelated feature work (enforced by convention in CLAUDE.md §6 or hook)

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T04:55:50Z
**Updated:** 2026-04-20T07:26:00Z
**Labels:** type:bug, status:backlog, autonomous-lead, phase:meta, priority:low
