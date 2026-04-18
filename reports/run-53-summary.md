# Run 53 Summary — Tighten Branching Strategy: One Branch At A Time + 3-Day Dev Window (D-20260418-030)

## Overview
**Task**: User directive 2026-04-18 tightening D-026 — *"no more than one current and development branch … get one branch one feature one goal ready for production before moving on … branches sitting up to three days [are] OK if we think we got more development that's going to be happening in the area of that branch or the branch just aint ready for production yet."*
**Decision ID**: D-20260418-030.
**Status**: COMPLETE. Closes **Issue #59**.
**Branch**: `meta/q-002-stack-recovery`.
**TDD**: EXEMPT — docs-only (CLAUDE.md, heartbeat.md, memory file).

## Three new rules on top of D-026

### 1. Concurrency cap — ONE at a time

At most one `feature/*` OR `bugfix/*` branch in flight. If one is open and unmerged, the heartbeat CONTINUES it rather than picking a new Issue.

- **Station 2 pre-check** added: `gh pr list --state open --head-prefix 'feature/' --head-prefix 'bugfix/'` (or `git branch -a` grep). If one exists, continue that branch's Issue.
- **Station 4 continue-vs-create** logic: if an existing in-dev branch was detected, checkout that branch rather than creating a new one.
- **Exceptions**: `hotfix/*` (user-authorized per incident) and `meta/<slug>` (doc-only) don't count toward the cap.

### 2. 3-day dev-time window

An active in-dev branch may sit up to **3 days** if:
- Progress is being made (recent commits), OR
- It's genuinely not-yet-production-ready

Past 3 days of stagnation → close (merge to beta at minimum) OR file a Dev-Q&A explaining why still open.

**Distinct from D-027's 6-hour supersession grace**. Different things:
- 3-day dev window = active in-progress branch with unique commits
- 6-hour supersession = PR whose commits already landed in main via another path

The two windows coexist.

### 3. Lifecycle mandate

`feature/*` → `beta` (stabilization) → `main` (stable release) → start next feature. **One feature/goal to production before the next.** The heartbeat's job is to drive one thing all the way home.

## Files changed

| File | Change |
|---|---|
| `CLAUDE.md` §6 | Branching strategy bullet gains three sub-bullets: concurrency cap, 3-day window, lifecycle mandate. All cite D-030. |
| `.claude/commands/heartbeat.md` Station 2 | Added concurrency pre-check block before `issue-triage-picker` invocation |
| `.claude/commands/heartbeat.md` Station 4 | Added "continue-vs-create check" — switch to existing branch if in-flight |
| `decision-log.md` | D-20260418-030 appended |
| `~/.claude/.../memory/feedback_branching_strategy_git_flow_lite.md` | "Tightened by D-030" section appended |
| `reports/run-53-summary.md` | This file |

## Interaction with other rules

| Rule | How one-at-a-time interacts |
|---|---|
| D-013 Singular-Heartbeat | Reinforces it at branch layer (one tick + one branch = one flow) |
| D-014 fast cadence (1–4.5 min) | Not in conflict — each tick continues the same branch rather than forking a new one |
| D-026 git-flow-lite | Tightened (this is a superseding update to a specific clause) |
| D-027 6-hour supersession grace | Parallel rule, different concept. Coexists cleanly. |
| D-028 TDD-as-method | Unchanged. TDD is per-change; concurrency is per-branch. |
| D-029 superpowers map | Unchanged. Station 2 gains a pre-check; downstream skill invocations identical. |
| `superpowers:finishing-a-development-branch` (pre-Station-11) | Strengthened utility — when there's only ONE branch at a time, the "is this really done?" check becomes the signal that unblocks the next feature. |

## Tests

Not run — docs-only tick. Dashboard 17/17 + root 24/24 last verified Runs 33 & 35.

## Decision

| ID | Decision | Why |
|---|---|---|
| D-20260418-030 | One in-dev branch cap + 3-day dev window + lifecycle mandate | User explicit: "no more than one current and development branch … get one … ready for production before moving on"; 3-day window gives realistic dev-time elasticity without letting branches decay; separation from D-027 keeps the two timers independent |

## Metrics

- **Issues closed**: 1 (#59 branching tighten)
- **Issues opened**: 1 (#59 — closed by this same commit)
- **Files added**: 1 (this report)
- **Files modified**: 4 (CLAUDE.md, heartbeat.md, decision-log.md, memory file)

## Next task

Queue unchanged from Run 52:
1. **User click-through**: 15 stack PRs + `meta/q-002-stack-recovery` branch (now includes Runs 49-53) per Run 49's URL list.
2. **Post-drain**: create `beta` off cleaned main (first live-state flip for D-026).
3. **EPIC #34 remaining leaves**: #36 SOUL.md runtime directive, #37 auto-merge gate script.

The new concurrency cap (D-030) means after the stack drains, I'll pick EXACTLY ONE of #36 or #37, drive it through `feature/*` → `beta` → `main` before picking the other. No parallel work.

## Open concerns

- Meta branch now carries 5 ticks' worth of workflow updates (D-025, D-026, D-027, D-028, D-029, D-030). Squash-merge into main ships them atomically.
- The `auto-merge:ok` label on Issues remains the gate-5 trigger from D-009; D-030 doesn't change that — it just restricts how many labeled Issues can be in-flight simultaneously.

## Station 14 — End of tick

Not scheduling ScheduleWakeup — user is live.
