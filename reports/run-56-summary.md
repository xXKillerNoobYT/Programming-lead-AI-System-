# Run 56 Summary — `status:needs-user` Label as the User's Visible Queue (D-20260418-033)

## Overview
**Task**: User directive 2026-04-18 — *"And I'm saying that the tasks aren't getting completed for each of the branches. What's happening there? … Better yet on an issue and tag it user answer this queue please."* User observed that the 17 merge-tracking Issues sit as `status:backlog` indistinguishable from work I could pick up myself.
**Decision ID**: D-20260418-033.
**Status**: COMPLETE.
**Branch**: `meta/q-002-stack-recovery`.
**TDD**: EXEMPT — label creation + docs.

## The fix

New label **`status:needs-user`** (yellow `FBCA04`) marks any Issue blocked on user action. Applied to all 17 merge-tracking Issues (#65–#81) immediately. The label serves as the user's visible queue: `gh issue list --label status:needs-user` surfaces everything on their plate.

Heartbeat pick rules updated to **skip** `status:needs-user` Issues — they're not mine to pick. If the only open Issues are all `status:needs-user`, the loop idles at 270s (per D-032 bucket 4) and re-checks on the next tick.

## Bidirectional visibility

| Who | Benefit |
|---|---|
| **User** | `gh issue list --label status:needs-user` → exactly what's waiting on them |
| **Heartbeat** | Station 2 picker skips them → doesn't confuse "waiting on user" with "claimable work" |
| **Dev-Q&A** | New flow: file a Q-block in `Docs/Plans/Dev-Q&A.md` AND open a tracking Issue with `status:needs-user` so the question appears in the user's normal Issue view |

## Files changed

| File | Change |
|---|---|
| GitHub (label) | New `status:needs-user` label created |
| GitHub (Issues #65–#81) | All 17 labeled `status:needs-user` |
| `CLAUDE.md` §6 | New bullet: `status:needs-user` label semantics + Dev-Q&A cross-link pattern |
| `.claude/commands/heartbeat.md` Station 2 | Added `status:needs-user` filter: excluded from picker ranking; all-awaiting-user → 270s idle |
| `decision-log.md` | D-20260418-033 appended |
| `reports/run-56-summary.md` | This file |

## Label lifecycle

- **Apply** when opening or editing an Issue that needs the user: manual PR merge, design-question answer, approval, go/no-go decision
- **Surface** via `gh issue list --label status:needs-user` (user's natural queue view)
- **Heartbeat skips** these in Station 2 picker
- **Remove** in the tick that captures the user's answer/action, before or during Issue close

## Answering the user's underlying question

> *"I'm saying that the tasks aren't getting completed for each of the branches. What's happening there?"*

Honest answer: nothing was "happening" on #65–#81 because they were always user-action Issues — the click-through IS the task. My role was to create the tracker and surface the click-through URL + recipe, not to merge the PRs (the permission hook blocks `gh pr merge` on CONFLICTING PRs, and the UI conflict-resolution is manual by design). With the new label in place, the distinction is visible: the Issues now CLEARLY belong to you until you merge + close them.

## Tests

Not run — label + docs. Last behavior verification unchanged (24/24 root, 17/17 dashboard).

## Decision

| ID | Decision | Why |
|---|---|---|
| D-20260418-033 | `status:needs-user` label + heartbeat skip rule + Dev-Q&A Issue-crosslink pattern | User needs a visible queue of "your turn" Issues distinct from "Claude working on it" Issues; label is minimal mechanism; tying Dev-Q&A to the same label unifies the surfaces |

## Metrics

- **Issues closed**: 0
- **Issues opened**: 0 (only labeled)
- **Labels created**: 1 (`status:needs-user`)
- **Issues relabeled**: 17 (#65–#81)
- **Files added**: 1 (this report)
- **Files modified**: 3 (CLAUDE.md, heartbeat.md, decision-log.md)

## Next task

Queue is now clearly bifurcated:
- **On user** (17 Issues under EPIC #64): click-through the PR stack.
- **On me** (once stack drains): create `beta`, then pick EPIC #34's remaining leaves.

## Station 14 — End of tick

**Calling `ScheduleWakeup(270s, "<<autonomous-loop-dynamic>>")`** per D-032 (mandatory) — bucket 4 (live user + all-backlog-awaiting-user). User can interrupt any time by typing.
