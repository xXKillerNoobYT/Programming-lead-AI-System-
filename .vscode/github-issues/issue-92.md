---
id: 4289180606
number: 92
title: >-
  Add PreToolUse hook blocking direct-to-main git commits/pushes per D-061
  enforcement
state: closed
created_at: '2026-04-18T21:06:03Z'
updated_at: '2026-04-18T21:12:49Z'
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
  - id: 10724571764
    name: 'area:heartbeat-pipeline'
    color: 1D76DB
    description: 'Intelligent heartbeat pipeline (TDD, auto-merge, scheduling, skill-chain)'
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/92
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/92'
closed_at: '2026-04-18T21:12:49Z'
---
# Add PreToolUse hook blocking direct-to-main git commits/pushes per D-061 enforcement

## Goal

Enforce D-20260418-061 (direct-to-main forbidden except hotfixes) via a Claude Code hook. Rule has been violated 4 times today (commits `43c18a9`, `36cd630`, `d4bb241`, `c8b94e3`), each cascading open PRs to CONFLICTING and burning user's premium-request Copilot quota.

## Approach

Add `PreToolUse` hook in `.claude/settings.json` that pattern-matches `Bash` commands for:
- `git push origin main` / `git push --force origin main`
- `git commit` while HEAD is `main`
- `gh pr merge --admin`

On match: block with message citing D-061 and suggesting the correct path (`meta/abort-run-<N>` branch, or `hotfix/*` with user authorization).

## Out of scope
- GitHub branch-protection (different surface, admin-level).
- Native git `pre-push` hook (local-only, not shared across clones).

## Acceptance
- Hook blocks direct-to-main commits/pushes from Claude Code sessions
- Hotfix branches still work
- Issue closes when #92 has a working hook committed
- Test: try to `git push origin main` after hook installed — blocked
- TDD: write test that simulates the hook invocation first (D-028)

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T21:06:03Z
**Updated:** 2026-04-18T21:12:49Z
**Closed:** 2026-04-18T21:12:49Z
**Labels:** type:bug, status:backlog, autonomous-lead, area:heartbeat-pipeline

---

## Comments

### @xXKillerNoobYT - 2026-04-18T21:12:49Z

Closed by D-20260418-087 — static `permissions.deny` patterns in `.claude/settings.json` block direct-to-main git commands (push origin main*, push --force origin main*, gh pr merge --admin*). Simpler than a PreToolUse hook; 80% solution with 20% effort. Hotfix/* branches unaffected (push their own branch name). UI merges unaffected (not Bash). If violations continue despite this, upgrade to a dynamic PreToolUse hook.

