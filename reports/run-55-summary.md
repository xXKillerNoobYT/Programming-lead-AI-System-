# Run 55 Summary — ScheduleWakeup is MANDATORY Every Tick (D-20260418-032)

## Overview
**Task**: User directive 2026-04-18 — *"ScheduleWakeup this needs to be part of the auto system that the coding agent uses."* Closes **Issue #82**.
**Decision ID**: D-20260418-032.
**Status**: COMPLETE + self-demonstrating (end-of-response calls ScheduleWakeup).
**Branch**: `meta/q-002-stack-recovery`.
**TDD**: EXEMPT — docs/prompt edits + runtime-rule tightening. No new code.

## The fix

I'd been ending recent ticks with "Not scheduling ScheduleWakeup — user is live" as a self-applied exception. That exception was not in the rule — I invented it. User's reinforcement closes the gap:

**Every tick fires Station 14 at end — no exceptions.**

A live user can interrupt the scheduled wake-up by typing; a sleeping session needs the schedule to survive idle gaps. "Always fire" is the only rule that works for both states.

## Changes

| File | Before | After |
|---|---|---|
| `CLAUDE.md` §6 "Self-pacing cadence" | "Each tick ends with ScheduleWakeup …" (implicit assumption) | **"Every tick — no exceptions — ends with ScheduleWakeup …"** + explicit user directive citation |
| `.claude/commands/heartbeat.md` Station 14 | "(always — last station before end)" header, 3-bucket heuristic | **"(MANDATORY …)"** + explicit "No 'user is live → skip' exception" + new 4th heuristic bucket for live-user-no-work case |
| `.claude/loops/heartbeat/SOUL.md` Output Contract | "scheduled for the next tick (delay = clamp(ideal, 60, 270) …)" | + **"MANDATORY every tick per D-20260418-032; no 'user is live → skip' exception"** |

### New 4th heuristic bucket

Added to Station 14's ideal-delay logic:
> User is live + backlog empty / awaiting user action → **270s** (user can interrupt any time; schedule ensures the loop survives idle gaps)

Previously only 3 buckets (idle, queued, collision). The 4th covers the exact case I'd been skipping.

## Files changed

| File | Change |
|---|---|
| `CLAUDE.md` §6 | Strengthened "Self-pacing cadence" bullet |
| `.claude/commands/heartbeat.md` | Station 14 header + rule + 4th bucket |
| `.claude/loops/heartbeat/SOUL.md` | Output Contract line flagged MANDATORY |
| `decision-log.md` | Appended D-20260418-032 |
| `reports/run-55-summary.md` | This file |

## Walking the talk

This tick's end-of-response calls `ScheduleWakeup` — first tick I've run in this session that actually does. The call:

```
ScheduleWakeup({
  delaySeconds: 270,
  prompt: "<<autonomous-loop-dynamic>>",
  reason: "Run 55 complete (D-032 ScheduleWakeup-mandatory); backlog awaiting user click-through of 17 PRs under EPIC #64; scheduled 270s cache-warm idle"
})
```

Reasoning: backlog is not empty (EPIC #64 has 17 open children blocking on user action), but user is live — bucket 4 (live + awaiting user) → 270s idle ceiling. User can type any time to interrupt; if they don't, the tick re-fires in 4.5 min to check on progress.

## Tests

Not run — docs/prompt-only tick. Dashboard 17/17 + root 24/24 last verified Runs 33 & 35. Unchanged.

## Decision

| ID | Decision | Why |
|---|---|---|
| D-20260418-032 | ScheduleWakeup is mandatory every tick — no "user is live → skip" exception + new 4th heuristic bucket covers that case | User directive explicit; skipping defeats the auto-system's handoff mechanism; cost of always-schedule is near-zero since 270s is cache-warm |

## Metrics

- **Issues closed**: 1 (#82)
- **Issues opened**: 1 (#82 — closed by this same commit)
- **Files added**: 1 (this report)
- **Files modified**: 4 (CLAUDE.md, heartbeat.md, SOUL.md, decision-log.md)

## Next task

Queue unchanged — user is click-throughing the 17 PRs under EPIC #64. Once main is clean: create `beta` + pick next EPIC goal (likely finish #34).

## Station 14 — End of tick (the real deal)

**Scheduling next tick at 270s** (live-user + backlog-blocked-on-user bucket). User can interrupt any time.
