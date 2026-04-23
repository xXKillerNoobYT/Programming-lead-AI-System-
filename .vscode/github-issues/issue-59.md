---
id: 4288524107
number: 59
title: >-
  Tighten branching strategy: ONE active in-dev branch at a time, 3-day dev
  window, finish-to-main before next
state: closed
created_at: '2026-04-18T16:17:02Z'
updated_at: '2026-04-18T16:19:47Z'
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
  - id: 10724571764
    name: 'area:heartbeat-pipeline'
    color: 1D76DB
    description: 'Intelligent heartbeat pipeline (TDD, auto-merge, scheduling, skill-chain)'
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/59
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/59'
closed_at: '2026-04-18T16:19:47Z'
---
# Tighten branching strategy: ONE active in-dev branch at a time, 3-day dev window, finish-to-main before next

## Goal

Per user directive 2026-04-18 (verbatim):
> *"the branches They're cool and all but they're not much good if they're just getting developed we need to make sure that they can merge back into the main and actually get used. yeah now I don't mind him sitting there up to three days if we think we got more development that's going to be happening in the area of that branch or the branch just aint ready for production yet. But that's your job is to get one branch one feature one goal ready for production before moving on. So you should have no more than one current and development branch and then there should be the beta branch where things are getting stabilized and once we've got a good staple version that should go back to the main branch and then we can work on the next slew of updates or whatever."*

## Tightens D-20260418-026

The original D-026 branching-strategy decision allowed multiple concurrent `feature/*` + `bugfix/*` branches. User now constrains this: **at most ONE active in-dev branch at a time**. The heartbeat finishes one feature/goal to production (`main`) before starting another.

## New rules

1. **Concurrency cap**: at any given time, zero-or-one `feature/*` + `bugfix/*` branch open. If one is in-flight, the heartbeat continues it; new work waits.
2. **3-day dev-time window**: an active in-dev branch may sit up to 3 days if still making progress OR not-yet-production-ready. Past 3 days with no progress → close it (merge to beta at minimum) OR file a Dev-Q&A explaining why it's still open.
3. **Lifecycle**: `feature/*` → `beta` (stabilization) → `main` (stable release) → start next feature. One feature/goal to production before the next.
4. **Hotfix still carves out**: `hotfix/*` can run concurrent with a feature/bugfix because it's user-authorized per incident.
5. **Meta branch** (per D-025) is not counted — doc-only branches are always free to use.

## Distinct from D-20260418-027

D-027's 6-hour grace is for **superseded** PRs (commits already landed in main via another path). This rule is about **active in-development** branches (commits NOT yet in main). The two windows coexist:
- Active dev branch ageing → up to 3 days OK if progressing
- Superseded PR → 6 hours before auto-close

## Changes

- `CLAUDE.md` §6 **Branching strategy — git-flow-lite** bullet: add one-at-a-time + 3-day dev window + finish-to-main-first rules
- `.claude/commands/heartbeat.md` Station 2 (Pick) + Station 4 (Branch): concurrency check — if an open non-meta feature/bugfix branch exists, CONTINUE it rather than creating new
- Memory file `feedback_branching_strategy_git_flow_lite.md` updated

## Acceptance

- All three surfaces reflect the one-at-a-time rule
- Decision ID recorded
- Run report written

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T16:17:02Z
**Updated:** 2026-04-18T16:19:47Z
**Closed:** 2026-04-18T16:19:47Z
**Labels:** type:task, status:in-progress, autonomous-lead, area:heartbeat-pipeline

---

## Comments

### @xXKillerNoobYT - 2026-04-18T16:19:47Z

Closed by commit (D-20260418-030). Three new rules codified: (1) concurrency cap — ONE feature/bugfix in flight, (2) 3-day dev window distinct from D-027's 6h supersession, (3) lifecycle mandate — finish one feature to production before next. Station 2 gains concurrency pre-check; Station 4 gains continue-vs-create logic. See reports/run-53-summary.md.

