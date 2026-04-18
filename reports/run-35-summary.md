# Run 35 Summary — Loop SOULs + Singular-Heartbeat Rule (D-20260418-013)

## Overview
**Task**: Per user directive 2026-04-18 *"the loops need a sole and memory files"* + Option D answer to Issue #42 *"disallow concurrent heartbeats."* Extends D-20260418-005's subagent SOUL+memory pattern to command-invoked loops. Closes **Issue #45** and **Issue #42**.
**Decision ID**: D-20260418-013 (fifth collision this session — D-006, D-007×2, D-008, D-011, D-012 all claimed by parallel sessions before I could land mine).
**Status**: COMPLETE.
**Trigger**: Live user directives (two in sequence).
**Branch**: `run-30/phase-3-check-scripts`.
**TDD**: EXEMPT — docs/config only (4 SOUL/memory Markdown files + 2 command-file references + 2 CLAUDE.md bullets). Behavior-level tests unchanged.

## Changes

| File | Change |
|---|---|
| `.claude/loops/heartbeat/SOUL.md` (**new**) | Identity, mission, **Singular-Heartbeat rule** (load-bearing; closes #42), 4 numbered priority rules, pipeline-stations reference, output contract, safety guardrails, small-LLM note |
| `.claude/loops/heartbeat/memory.md` (**new**) | Append-only observation log; seeded with 3 facts/patterns/contradictions from today's session |
| `.claude/loops/weekly-agent-update/SOUL.md` (**new**) | Identity, 7-step protocol distilled as SOUL rules, safety guardrails (≤5-line-delta cap), small-LLM note |
| `.claude/loops/weekly-agent-update/memory.md` (**new**) | Append-only log; seeded with 1 observation |
| `.claude/commands/heartbeat.md` | Added "Read these BEFORE you execute" block pointing at SOUL + memory |
| `.claude/commands/weekly-agent-update.md` | Same "Read these BEFORE" block; extended scope note to enumerate `.claude/loops/*/SOUL.md` alongside `.claude/agents/*.md` |
| `CLAUDE.md` §6 | **Singular heartbeat — no concurrent peer** bullet (closes #42); **Loop SOULs + memory** bullet documenting the `.claude/loops/<name>/` layout |
| `decision-log.md` | Appended D-20260418-013 |
| `reports/run-35-summary.md` | This file |

## Why `.claude/loops/` (not `.claude/commands/<name>/`)

Initial placement was `.claude/commands/<name>/SOUL.md` — direct parallel to D-005's `.claude/agents/<name>/SOUL.md`. But a system-reminder revealed Claude Code's harness auto-discovers command-subfolders as namespaced plugin skills (`heartbeat:SOUL`, `heartbeat:memory`, `weekly-agent-update:SOUL`, `weekly-agent-update:memory` all appeared in the skill list — context-list pollution). Subagent subfolders do NOT auto-discover; asymmetric.

Moved to `.claude/loops/<name>/` — not auto-scanned, clean separation. The skill-list noise disappeared in the same turn.

## Singular-Heartbeat rule (anchor for closing #42)

Baked in three places:
1. /heartbeat SOUL's **Core Identity** ("no parallel peer") — the first two sentences, load-bearing per weekly-maintenance guardrail.
2. /heartbeat SOUL's dedicated **Singular-Heartbeat Rule** section.
3. CLAUDE.md §6 as project-policy bullet.

If a tick sees parallel-session signals (D-ID collisions, Run-N title thrashing, unattributed commits, `decision-log.md` gaining unrelated entries), it commits what it has, notes the collision in its run report, and ends the tick — no racing.

## Tests

```
$ node --test (repo root)
ℹ tests 24
ℹ pass 24
ℹ fail 0
```

Dashboard tests unaffected (loop SOULs don't touch dashboard code; last Run-33 verified 17/17).

## Parallel-session collision count this session

**Five D-ID collisions** in one session:

| My intended D-ID | Claimed by | Their run |
|---|---|---|
| D-006 | weekly-agent-update (parallel) | Run 29 |
| D-007 | mempalace portability (parallel) | Run 30a |
| D-007 (dup) | Part-7 rename (parallel) | Run 30b |
| D-008 | Phase-3 check scripts (parallel) | (committed behind my back, no entry matches) |
| D-011 | Merge + security audit (parallel) | Run 31 |
| D-012 | 3-day grace for superseded PRs (parallel) | Run 34 |
| **D-013** | **Me (this run)** | **Run 35 (this)** |

D-009 = Run 32 (CLAUDE.md pipeline spec, mine), D-010 = Run 33 (my npm baseline fix). But the parallel session ALSO wrote its own reports/run-33-summary.md + reports/run-34-summary.md for its D-011 and D-012 scopes. Run numbers and D-IDs are now completely desynchronized — which is exactly what the singular-heartbeat rule prevents going forward.

## Decision

| ID | Decision | Rationale |
|---|---|---|
| D-20260418-013 | Loop SOULs under `.claude/loops/<name>/`; concurrent-heartbeat-ban baked into /heartbeat SOUL + CLAUDE.md §6; extended /weekly-agent-update's scope to enumerate command-loops as well as subagents. | User directives 2026-04-18; evidence-based placement choice (auto-discovery side-effect observed and corrected); three-surface anchoring for the ban so it can't drift. |

## Metrics

- **Issues closed**: 2 (#42 concurrent-ban; #45 loop SOULs)
- **Issues opened**: 0 new this run
- **Files added**: 5 (4 SOUL/memory files + this report)
- **Files modified**: 4 (CLAUDE.md, 2 command .md files, decision-log.md)
- **Open backlog after this run**: #34 EPIC leaves (#36 #37 #38 #39 #40); wave-1 #22 #23 #24 #26 #27 #28; security #30 #31; portability #17/#41

## Next task

**Ending this session here.** Per the singular-heartbeat rule I just encoded, five D-ID collisions in a single session is exactly the "thrashing" signal that should terminate a tick. Good time to hand back.

Queued for next session (strict single-heartbeat operation):
1. **#38 §D ScheduleWakeup wiring** — user explicitly chose this as next ("do #38 first so the loop truly self-paces").
2. **#36 §B SOUL.md runtime directive** — mirror the TDD + delegated-task-contract onto heartbeat.js.
3. **#39 §E /heartbeat skill-chain wiring** — fold the 10 pipeline stations into `.claude/commands/heartbeat.md`.

## Open Concerns

- **Dev-Q&A** — verified no new user answers awaiting transcription.
- **MemPalace MCP** still not loaded this session — cross-session memory not persisted beyond the project-level `memory.md` + decision-log.
- **Branch `run-30/phase-3-check-scripts`** now has 6+ commits from 3+ sessions. When it eventually merges, the PR will be dense. Consider asking user whether to cherry-pick into topic branches next session.
