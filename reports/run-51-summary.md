# Run 51 Summary — TDD Reinforced as THE Development Method (D-20260418-028)

## Overview
**Task**: User directive 2026-04-18 *"test-driven-development is how we want to make new parts of the program and updates."* Closes **Issue #40** (Run 32 §F: Revisit TDD scope at tick 30 TODO).
**Decision ID**: D-20260418-028.
**Status**: COMPLETE.
**Trigger**: User invoked `/superpowers:test-driven-development` slash-command with explicit argument affirming TDD as default development method.
**Branch**: `meta/q-002-stack-recovery` (same meta branch — still doc-only).
**TDD**: EXEMPT — docs/config-only edits (the rule being tightened here doesn't apply to the rule itself).

## What changed — scope tightening

| Rule | Before (D-009) | After (D-028) |
|---|---|---|
| Framing | "TDD mandatory for code-producing Issues — *pragmatic default*" | "TDD is **THE** development method" |
| Scope | "Required for `heartbeat.js`, `dashboard/`, `lib/`, `scripts/` that ship to production, and MCP-server code" | **All** new program parts and updates |
| Exempt list | "one-off diagnostic scripts, fixtures, generated files, docs/config-only edits" (loose) | Four named categories: docs (`.md`, `.txt`), config (`.json`, `.yml`, `.toml`, `.npmrc`, `.env*`), generated files, throwaway diagnostics (tight; if you can't name the category, you're in scope) |
| Revisit | "on tick 30 per Issue #40" | **Closed — user answered directly** |

## Files changed

| File | Change |
|---|---|
| `CLAUDE.md` §6 | TDD bullet rewritten: "THE development method" + tightened exempt list + D-028 citation |
| `.claude/commands/heartbeat.md` Station 5 | Same framing; emphasizes "not just backbone" |
| `decision-log.md` | Appended D-20260418-028 |
| `~/.claude/projects/…/memory/feedback_tdd_is_the_development_method.md` (new) | Durable user-preference capture |
| `~/.claude/projects/…/memory/MEMORY.md` | Index entry added |
| `reports/run-51-summary.md` | This file |

## Closes Issue #40 (TDD scope revisit TODO)

Original AC: data-driven revisit at tick 30 (count correct/incorrect scope calls, tighten if >20% miscalls). User answered directly before tick 30 with a philosophical statement that removes the need for data: "**TDD is how we make new parts and updates.**" Fast-path close is valid because this is a policy decision, not an empirical one.

## Integration with other rules

| Rule | How TDD-as-method interacts |
|---|---|
| Station 4 Branch (D-026) | Feature/bugfix branches targeting beta must pass Station 11 gate 1 (green suite) — which implies Station 5's TDD cycle produced the tests in the first place. |
| Station 11 Auto-merge gates (D-009) | Gate 1 "full suite green" includes the red-first test that was written for this change — removes the "tests added later" loophole. |
| Station 12 Record (D-009) | Run report must include "verbatim red-run output + verbatim green-run output." Exempt changes declare the exempt category in one line. |
| Singular-Heartbeat rule (D-013) | Unaffected; TDD is per-tick, rule about cross-tick concurrency. |
| `heartbeat.js` runtime side (Issue #36) | When that lands, the delegated-task contract will require red+green logs from the downstream agent, mirroring this rule. |

## Tests

Not run — this tick edits docs (`CLAUDE.md`, `heartbeat.md`, `MEMORY.md`) + memory file + decision-log. All in the exempt categories. Root `node --test` 24/24 + dashboard `npm test` 17/17 last verified Runs 35 & 33, unchanged.

## Decision

| ID | Decision | Why |
|---|---|---|
| D-20260418-028 | TDD is THE development method (not "a method"); exempt list tightened to 4 named categories | User's explicit reinforcement; previous framing allowed too much "pragmatic" wiggle; tight named categories make exemptions auditable |

## Metrics

- **Issues closed**: 1 (#40 TDD scope revisit TODO)
- **Issues opened**: 0
- **Files added**: 2 (memory file + this report)
- **Files modified**: 4 (CLAUDE.md, heartbeat.md, decision-log.md, MEMORY.md index)

## Next task

Queue unchanged from Run 50:

1. **User click-through**: 15 stack PRs + meta/q-002-stack-recovery branch per Run 49's URL list.
2. **Post-drain**: create `beta` off cleaned main (first live-state flip for D-026).
3. **EPIC #34 remaining leaves**: #36 SOUL.md runtime directive, #37 auto-merge gate script. (Both now required to be TDD'd per this run's tightening — the auto-merge gate script especially; SOUL.md edit is docs/config-exempt.)

## Open concerns

- 16 open PRs still targeting `main` pending Option-A click-through.
- `beta` branch doesn't exist yet (waiting for stack drain).
- `heartbeat.js` runtime-side TDD contract (Issue #36) needs SOUL.md edit + task-schema update; runtime-side enforcement doesn't activate until #36 lands.

## Station 14 — End of tick

Not scheduling ScheduleWakeup — user is live.
