# Run 50 Summary — Branching Strategy + Grace Retune (D-20260418-026, D-20260418-027)

## Overview
**Task**: Two user directives received mid-session:
1. *"we should have our main branch our beta branch … branches closed when we can and if not pulled back into at least the beta branch. This is something I want to get enforced all the way across in all the branches."* → establish git-flow-lite.
2. *"forget about the three day wait thing … make it 6 hours"* → retune PR supersession grace.
**Decision IDs**: D-20260418-026 (branching), D-20260418-027 (grace). Closes **Issue #57**.
**Status**: COMPLETE (docs + memory + heartbeat command updated; `beta` branch creation deferred to post-stack-drain).
**Trigger**: Two user messages in live session during meta-tick.
**Branch**: `meta/q-002-stack-recovery` (same branch as the Q-002 meta-tick — continues the meta/* tag pattern per D-025).
**TDD**: EXEMPT — docs-only (CLAUDE.md, `.claude/commands/heartbeat.md`, memory files, run report).

## The branching model (D-20260418-026)

| Branch | Purpose | Receives PRs from |
|---|---|---|
| `main` | Production-quality, always-green, user-approved | `beta` (periodic sync) + rare `hotfix/*` |
| `beta` | Integration buffer; passes tests but may have edge-case bugs | `feature/*`, `bugfix/*` |
| `feature/issue-<N>-<slug>` | New feature work | N/A (source branch) |
| `bugfix/issue-<N>-<slug>` | Bug fixes | N/A |
| `hotfix/issue-<N>-<slug>` | Critical production fix (rare, user-authorized) | N/A |
| `meta/<slug>` | Doc-only / branch-tag ticks | N/A (may or may not open PR) |

**Flow**: feature/bugfix → PR to `beta` (gated auto-merge) → `beta → main` sync on user-initiated cadence. Hotfix → PR direct to `main`.

**Stale branches**: no commit in ≥ 7 days → must close (merge to beta or abandon). No decaying PRs.

## The grace retune (D-20260418-027)

| Was | Now | Why |
|---|---|---|
| 3-day grace (D-20260418-012, when cadence was 15–60 min) | **6-hour grace** (matches the new 1–4.5-min self-pacing cadence from D-014) | At ≥15 ticks/hour, 6h = ~90 ticks. Ample for a PR owner to react; not so long the queue stagnates. |

Applied to `.claude/commands/heartbeat.md` Station 11b.c. CLAUDE.md §6 gets a new dedicated bullet citing D-027 superseding D-012.

## Files changed

| File | Change |
|---|---|
| `CLAUDE.md` §6 | Added **Branching strategy — git-flow-lite** bullet + **PR supersession grace period — 6 hours** bullet |
| `.claude/commands/heartbeat.md` Station 4 | Branch target `beta` (with `main` fallback until `beta` exists) + `<type>/issue-<N>-<slug>` prefix convention |
| `.claude/commands/heartbeat.md` Station 11 | Merge target `beta` (same fallback) |
| `.claude/commands/heartbeat.md` Station 11b.c | Grace `3-day` → `6-hour`; D-027 citation |
| `decision-log.md` | Appended D-20260418-026 + D-20260418-027 |
| `~/.claude/projects/…/memory/feedback_branching_strategy_git_flow_lite.md` (new) | Durable user-preference capture |
| `~/.claude/projects/…/memory/MEMORY.md` | Added index entry for the new memory file |
| `reports/run-50-summary.md` | This file |

## Live-state vs forward-policy

- **Forward-policy NOW**: CLAUDE.md + /heartbeat both document the target model. Any future heartbeat reading these files learns the new rules.
- **Live state deferred**: the `beta` branch does NOT exist yet. Creating it now would require re-rebasing all 15 open PRs onto `beta`, which would undo the Q-002 click-through resolution.
- **Transition plan**: (a) user completes the Q-002 click-through (15 PRs + this meta branch → main); (b) main is clean; (c) next tick creates `beta` off cleaned main and pushes it; (d) future work branches off `beta` per the new rule.

## Heritage preserved

- `decision-log.md` D-20260418-012 (original 3-day grace decision) kept verbatim — NOT rewritten. D-027 is a superseding entry, not a replacement. Audit trail intact.
- `reports/run-34/run-35/run-39-summary.md` references to "3-day grace" kept as historical snapshots. Those are the state at their authoring time; rewriting them would falsify timeline.

## Tests

Not run — docs-only / prompt-doc / memory edits. Root tests 24/24 (Run 35), dashboard tests 17/17 (Run 33) unchanged.

## Decisions

| ID | Decision | Why |
|---|---|---|
| D-20260418-026 | git-flow-lite with `main`/`beta`/`feature|bugfix|hotfix|meta`; heartbeat defaults to `beta` | Staging buffer prevents bad code leak to main; forces stale-branch closure; matches user's exact phrasing |
| D-20260418-027 | PR supersession grace: 3 days → 6 hours | At the new 1–4.5-min cadence, 3 days is ~1000 ticks; 6h aligns with loop pace |

## Metrics

- **Issues closed**: 1 (#57 branching strategy)
- **Issues opened**: 1 (#57 — closed by this same commit)
- **Files added**: 2 (memory file + this report)
- **Files modified**: 4 (CLAUDE.md, heartbeat.md, decision-log.md, MEMORY.md index)

## Next task

User's live focus: click through the 15-PR stack + this meta branch (16 total) per D-025's Option A plan. Then:
1. Once main is clean: create `beta` off main, push it, note the live-state flip.
2. Resume EPIC #34 leaves: #36 (SOUL.md runtime), #37 (auto-merge gate script), #40 (TDD-scope revisit).
3. Phase 3/4 wave-1: #24 (shell + routing).

## Open Concerns

- The `beta` branch creation is the first task after main stabilizes — it's a meta-tick in its own right (creates branch, pushes, documents activation in a new D-ID).
- Any currently open PRs (10, 14, 25, 29, 32, 43, 46, 47, 48, 49, 50, 51, 53, 55, 56) still target `main` — they can't be retargeted to `beta` mid-stack-resolution. They merge as-is; the new rule applies only to PRs opened AFTER `beta` exists.

## Station 14 — End of tick

Not scheduling ScheduleWakeup — user is live handling the merge click-through.
