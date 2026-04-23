---
id: 4289950614
number: 106
title: Local main diverges from origin/main after squash-merges (3 orphan commits)
state: open
created_at: '2026-04-19T04:55:50Z'
updated_at: '2026-04-20T07:25:59Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/106
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/106'
---
# Local main diverges from origin/main after squash-merges (3 orphan commits)

**Parent**: #105 (recurring bug-hunt /loop)
**Fingerprint**: `FP: git/main-divergence/squash-merge-orphans`
**Surfaced by**: bug-hunt /loop tick 1 (2026-04-19)

## Symptom

`git checkout main && git pull --ff-only` fails:

```
Your branch and 'origin/main' have diverged,
and have 3 and 13 different commits each, respectively.
fatal: Not possible to fast-forward, aborting.
```

The 3 local-main commits are:

```
2a8a384 docs(reports): Run 8 — autonomous heartbeat bootstrap per D-20260417-006 (#4 #5 #6 #7 #8)
10b812f docs(CLAUDE.md): clarify plans/ folder chain and one-bit-at-a-time workflow per D-20260417-006
a0a470b feat: add CLAUDE.md autonomous programming lead + project .mcp.json per D-20260417-006
```

These are the pre-squash versions of what became the squash-merge commit `6cb566f` on `origin/main` (PR #10 "Autonomous heartbeat bootstrap (Run 8) + dashboard red baseline (Run 9)"). The content is already in `origin/main` — just under a different SHA.

## Why this matters

1. Any heartbeat that runs `git checkout main && git pull` silently fails and then branches from stale local main — I hit this *exact* trap in tick 1 and had to detect+work around it.
2. `commit-commands:clean_gone` and similar cleanup skills key off `[gone]` branches but don't handle orphaned main-HEAD commits.
3. This class of drift will re-occur on EVERY squash-merge that lands on GitHub while a local `main` exists.

## Proposed fix

**Short-term**: `git reset --hard origin/main` on local `main` (destroys no content — the commits are already in `origin/main` via squash). **Requires explicit user approval per CLAUDE.md §5 guardrails.**

**Long-term**: either
- **A**: Add a PreToolUse hook that warns when branching off stale local `main`, OR
- **B**: Adopt the defensive convention "always branch off `origin/<ref>`" and document it in CLAUDE.md §6, OR
- **C**: Configure `git config pull.ff only` + a post-merge hook that hard-resets local `main` to `origin/main` after every fetch

## AC

- [ ] `git checkout main && git pull --ff-only` succeeds (or is replaced by a documented safer pattern)
- [ ] Either (a) convention documented in CLAUDE.md §6 or (b) hook in place to warn/prevent

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T04:55:50Z
**Updated:** 2026-04-20T07:25:59Z
**Labels:** type:bug, status:backlog, autonomous-lead, phase:meta, priority:low
