# Run 34 Summary — 3-Day Grace Period for Superseded-PR Auto-Close (D-20260418-012)

## Overview
**Task**: User directive — *"Close them after three days if they're not ending up being used again"* (answering the question I surfaced at end of Run 33 about the 5 CONFLICTING+DIRTY PRs).
**Decision ID**: D-20260418-012
**Status**: COMPLETE
**Trigger**: User message during active `/loop /heartbeat`.
**Branch**: `run-30/phase-3-check-scripts` (already pushed; this commit will go on top).

## Outcome
The supersession-sweep sub-step of `/heartbeat` Step 11 now has an explicit 3-day grace period — first detection posts an aging-marker comment, subsequent qualifying ticks auto-close only if the scheduled date has passed AND no new commits have landed since. Rule applied to the 5 stale PRs right now: each has a comment scheduling auto-close for **2026-04-21**.

## Changes
| File | Change |
|---|---|
| [`.claude/commands/heartbeat.md`](.claude/commands/heartbeat.md) Step 11c | Rewrote "Supersession sweep" with first-detection + subsequent-tick two-phase protocol, explicit comment format, and three never-close conditions (unique commits, grace period still active, external reopen) |
| `decision-log.md` | D-20260418-012 entry |
| `reports/run-34-summary.md` | This file |
| GH PR #32 | **Commented** — auto-close scheduled 2026-04-21 |
| GH PR #29 | Same |
| GH PR #25 | Same |
| GH PR #14 | Same |
| GH PR #10 | Same |

## How the 3-day grace works (machine-readable flow)

**First-detection tick (this one):**
1. Qualifying condition met (≥2 clean PRs OR high-severity alert OR unmerged-PR concern).
2. Step 11a merges what's safe.
3. Step 11c detects CONFLICTING+DIRTY PRs whose commits are all in main.
4. For each, post:
   ```
   Superseded by #<N> merge at <SHA> on <YYYY-MM-DD>. Auto-close scheduled for <+3 days> if no new activity.
   ```
5. Do NOT close. End tick.

**Subsequent qualifying tick:**
1. For each CONFLICTING+DIRTY PR, read its comments.
2. If a `Superseded by … Auto-close scheduled for <date>` comment exists:
   - If `<date>` is past AND no new commits since that comment → `gh pr close N --comment "Grace period elapsed; closing per D-20260418-012."`
   - Else leave open, move on.
3. If no supersession comment exists → it's a first-detection (go back to first-detection flow).

**Override by user:**
- Reopen the PR, push a commit, or comment anything → the grace comment becomes stale, future ticks will not auto-close.

## Why comments, not labels or external state
- **Comments are durable + visible on the PR page** — no separate file to drift from reality.
- **GH API returns comments in a deterministic order** — timestamp parsing is reliable.
- **The aging marker IS the explanation** — anyone reading the PR sees both the supersession reason and the deadline in one place.
- A dedicated label like `superseded-since:2026-04-18` would work but requires creating a new label per PR or using dynamic values that clutter the label list.

## Test Results
```
$ npm test (repo root)
ℹ tests 24 / ℹ pass 24 / ℹ fail 0
```
Doc-only + GH-comment changes this run.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260418-012 | 3-day grace period for superseded-PR auto-close. Aging marker lives in the PR comment. Two-phase protocol (first-detect posts, subsequent auto-closes). User override via any new activity. | User's explicit 3-day rule. Comment-as-state avoids drift and is visible. Two-phase protocol cleanly separates "first detection" from "grace elapsed" so heartbeats don't need external memory. | Close immediately (violates user's "three days"); label-based aging (clutters labels); external JSON file (drift + not visible); 1-day grace (too tight for human review); 1-week (accumulates drift) |

## Metrics
- **Issues closed**: 0
- **Issues opened**: 0
- **PRs commented**: 5 (first-detection aging markers on #32/#29/#25/#14/#10)
- **PRs closed**: 0 (all in grace period until 2026-04-21)
- **Commits this run**: 1 (upcoming)

## Gaps Captured (Polsia Rule 2)
- **The heartbeat auto-close flow is untested in practice** — the first real test happens on the first qualifying tick ≥ 2026-04-21. If any of the 5 PRs has a comment added before then (stopping the auto-close), I need to verify the "any new activity" detection works.
- **`gh pr close N --comment` with a body is the current API**; the subsequent-tick flow should NOT add a second aging-marker comment on PRs already marked — the rule says "if no comment exists, post one; else read the existing one."
- **Weekly self-updater (D-006) runs 2026-04-20** — one day before auto-close trigger. That trigger doesn't run the merge+security station (it only touches subagent SOUL+memory), so no conflict.

## Next Task
The /loop is still armed (~15 min until next wake). Next organic tick picks per Step 2 priority tree. Since I just re-ran the merge+security station this tick, the next tick's qualifier check will probably be:
- Merge+security: backlog now has 2 high Dependabot alerts still open (#30 minimatch, #31 glob CLI) — station qualifies.
- Step 2: pick an atomic Issue from the open backlog.

Likely picks: **#41** (filesystem MCP portability — trivial follow-up), **#26** (Phase 4 §B.1 CI workflow), or an EPIC #34 leaf if the parallel agent has moved off.

## Open Concerns (carried forward)
- 5 superseded PRs now in 3-day grace (#32/#29/#25/#14/#10, auto-close 2026-04-21).
- 2 Dependabot alerts still open (#30, #31) — both transitive, tracked separately.
- My branch `run-30/phase-3-check-scripts` pushed; PR not yet opened. Will be picked up by Step 11 on a future qualifying tick once opened.
- Parallel-session D-ID collisions (D-006, D-007) still recurring without a codified resolution protocol.

## Heartbeat cadence
Self-paced. Existing /loop wake remains armed.
