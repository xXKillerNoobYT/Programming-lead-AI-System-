# Run 36 Summary — Faster Heartbeat Cadence (D-20260418-014)

## Overview
**Task**: Per user directive 2026-04-18 *"we can make the heartbeat happen faster."*
**Decision ID**: D-20260418-014.
**Status**: COMPLETE.
**Trigger**: Live user directive.
**Branch**: `run-30/phase-3-check-scripts`.
**TDD**: EXEMPT — docs-only tuning (two number changes + rationale).

## Change

`ScheduleWakeup(delaySeconds = clamp(ideal, 900, 3600))` → `clamp(ideal, 60, 270)`.

- **Old**: 15 min min, 60 min max (defensive; user rejected as too slow).
- **New**: 60s min (ScheduleWakeup's hard floor), 270s (≈4.5 min) max.
- **Key property**: 270s is the prompt-cache TTL boundary (5 min). Every tick under this threshold resumes cache-warm — no re-orient tax on the cheap Claude API cache. Effective cadence 1–4.5 min.

## Files changed

| File | Change |
|---|---|
| `CLAUDE.md` §6 Self-pacing cadence | New range cited + rationale (cache-warm threshold); cites D-014 retune on top of D-009 original |
| `.claude/loops/heartbeat/SOUL.md` Output Contract | Mirror the new range; cites D-014 |
| `decision-log.md` | Appended D-20260418-014 |
| `reports/run-36-summary.md` | This file |

## Why not <60s or >270s?

- **<60s**: `ScheduleWakeup` clamps to 60s floor; can't go lower.
- **>270s**: crosses the 5-min prompt-cache TTL. The tick would pay a cache-miss on re-entry, defeating the purpose of tight cadence.

The Singular-Heartbeat rule (D-013) still enforces one-tick-at-a-time, so faster cadence doesn't compromise atomicity — one tick must fully finish (commit + close Issue + write report) before the next scheduled wakeup fires.

## Tests

Not run this tick — two number changes, no code path affected. Dashboard tests + root node:test unchanged from Run 33 (17/17) / Run 35 (24/24).

## Next task

Queue unchanged from Run 35:
1. **#38 §D ScheduleWakeup wiring** — still the next pick; now uses the tighter clamp range by default.
2. **#36 §B SOUL.md runtime directive**.
3. **#39 §E /heartbeat skill-chain wiring**.
