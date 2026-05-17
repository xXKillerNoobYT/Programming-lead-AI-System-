---
id: 4288498208
number: 57
title: 'Establish git-flow-lite branching strategy: main / beta / feature+bugfix'
state: closed
created_at: '2026-04-18T16:04:18Z'
updated_at: '2026-04-18T16:07:38Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/57
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/57'
closed_at: '2026-04-18T16:07:38Z'
---
# Establish git-flow-lite branching strategy: main / beta / feature+bugfix

## Goal

Per user directive 2026-04-18: *"we should have our main branch our beta branch — the beta branches for a code that's buggy and then we should have our development or new feature or bug fix branches but we should get those closed when we can and if not pulled back into at least the beta branch. This is something I want to get enforced all the way across in all the branches."*

## Branching model

| Branch | Purpose | Lifetime | Receives PRs from |
|---|---|---|---|
| `main` | Production-quality, always-green, user-approved-for-release | Permanent | `beta` only (periodic sync) + rare `hotfix/*` |
| `beta` | Integration branch; expected to pass tests but may have edge-case bugs | Permanent | `feature/*`, `bugfix/*` |
| `feature/issue-<N>-<slug>` | New-feature implementation | Short (one heartbeat → PR → merge → delete) | N/A (source branch) |
| `bugfix/issue-<N>-<slug>` | Bug fix implementation | Short | N/A |
| `hotfix/issue-<N>-<slug>` | Critical fix direct to main (rare, user-authorized) | Short | N/A |
| `meta/<slug>` | Doc-only / Q-cleanup / no-PR branch-tag ticks | Short; may or may not open a PR | N/A |

## Flow

1. Feature/bugfix branches branch off **`beta`** (not main)
2. Feature PR → `beta` via gated auto-merge (5 gates + `auto-merge:ok` label)
3. `beta → main` sync happens on a separate cadence — user-initiated or at phase boundaries
4. Hotfix branches off `main`, PR → `main` directly, user-authorized per incident
5. Stale feature branches (no commit ≥ 7 days) should be **closed** (merged or abandoned) — fallback = merge into `beta`

## Enforcement

- `CLAUDE.md` §6 adds a **Branching strategy** bullet documenting the rules
- `.claude/commands/heartbeat.md` Station 4 branches from `beta`, not main
- `.claude/commands/heartbeat.md` Station 11 auto-merge targets `beta`
- New meta-tick type: **beta → main sync** (manual, user-triggered)
- Durable memory for the policy

## Acceptance

- [ ] CLAUDE.md §6 updated
- [ ] `/heartbeat` Stations 4 + 11 target `beta`
- [ ] Memory file saved
- [ ] `beta` branch created off main **after** the current 15-PR stack drains and main advances (deferred to next tick; cannot create off stale main while stack is in flight)
- [ ] Decision ID recorded

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T16:04:18Z
**Updated:** 2026-04-18T16:07:38Z
**Closed:** 2026-04-18T16:07:38Z
**Labels:** type:task, status:in-progress, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T16:07:34Z

Closed by commit (D-20260418-026 + D-20260418-027). CLAUDE.md §6 has branching strategy + 6h grace bullets. .claude/commands/heartbeat.md Stations 4/11/11b.c updated. Memory saved. Beta branch creation deferred to first tick after Q-002 stack drains — documented in reports/run-50-summary.md.

