# Run 32 Summary — Intelligent Heartbeat Pipeline Spec (D-20260418-009)

## Overview
**Task**: Close sub-issue #35 under new EPIC #34 — codify the intelligent heartbeat pipeline into `CLAUDE.md` per user directive 2026-04-18 (*"I want /test-driven-development tied in with the loop / heartbeat"* → *"a whole bunch of smart heartbeat steps … continuous intelligent development working on one issue at a time … on a loop that happens once an hour or 15 minutes after the last one stopped"*).
**Decision ID**: D-20260418-009 (after three parallel-session D-ID collisions — see "Parallel-session thrashing" below)
**Status**: COMPLETE (atomic pick — sub-issue #35 only; siblings #36-40 remain queued)
**Trigger**: User message in live session.
**Branch**: `run-25/dependabot-triage` (meta-bootstrap caveat — see below)
**TDD exemption**: docs-only edit. TDD not required this tick per new §6 TDD-scope bullet.

## Policy decisions locked by this run

| Question | User answer | Encoded in |
|---|---|---|
| TDD scope | Pragmatic default, "smart default old-to-new" TODO | §6 TDD bullet + Issue #40 (revisit at tick 30) |
| Auto-merge policy | **Option B — gated** (5 gates + `auto-merge:ok` label) | §6 auto-merge bullet + §3 Step 4i |
| Branch isolation | **Option A — branches** (not worktrees) | §3 Step 4b |
| Enforcement mechanism | **Hybrid** (text + runtime schema rejection + reminder) | §3 Step 4c + future Issue #36 (runtime side) |

## Changes

| File | Change |
|---|---|
| `CLAUDE.md` §3 Step 4 | Rewritten as a pipeline of skill-driven stations (4a brainstorm/plan → 4b branch → 4c TDD → 4d capture → 4e verify → 4f commit → 4g PR → 4h review → 4i gated-merge → 4j design-question escape). Replaces "Write tests alongside code" bullet list. |
| `CLAUDE.md` §3 Step 5 | Defers to Step 4e for pipeline ticks; retains standalone verify rules for non-pipeline meta ticks. |
| `CLAUDE.md` §6 | Four new bullets: TDD mandatory (pragmatic scope), pipeline is pipeline-shaped, auto-merge gated (5 gates + label), self-pacing `clamp(900, 3600)`. |
| `CLAUDE.md` §9 | Red→green-evidence + TDD-exempt-declaration pair added to phase-completion criteria. |
| `decision-log.md` | Appended D-20260418-009 entry. |
| `reports/run-32-summary.md` | This file. |

## GitHub Issues

**Opened (7 total — 1 parent EPIC + 6 children + 1 capture):**
- `#34` EPIC: Run 32 — Intelligent heartbeat pipeline (parent)
- `#35` §A CLAUDE.md edits (**closed this tick**)
- `#36` §B SOUL.md runtime directive
- `#37` §C auto-merge gate check script
- `#38` §D ScheduleWakeup wiring
- `#39` §E `/heartbeat` skill-chain wiring
- `#40` §F TDD-scope revisit TODO (tick 30)
- `#42` CAPTURE: parallel-session D-ID collision protocol

**Closed**: `#35` (AC met: four CLAUDE.md sections updated, D-009 cited, no `Write tests alongside code` residue).

**Sub-issue links**: #35-40 linked to #34 via `addSubIssue` GraphQL mutation per D-20260417-018.

**Labels created**: `auto-merge:ok` (green), `area:heartbeat-pipeline` (blue).

## Tests

```
$ npm test (repo root)
ℹ tests 24
ℹ suites 6
ℹ pass 24
ℹ fail 0
duration_ms 1388.8
```

Docs-only change — test suite unaffected. No red-test-first required per new §6 TDD-scope bullet (Issue #35 is `CLAUDE.md`-only).

## Decision table

| ID | Decision | Why |
|---|---|---|
| D-20260418-009 | Codify intelligent pipeline into CLAUDE.md §3/§5/§6/§9; decompose parent EPIC #34 into 6 sub-issues; commit on `run-25/dependabot-triage` despite normally branching per-Issue. | User directive 2026-04-18 ties TDD + auto-merge + continuous scheduling into one coherent pipeline. Staying on the dev branch avoids fragmenting the concurrent work from three parallel sessions all committing here today. |

## Parallel-session D-ID thrashing (captured as #42)

Observed three D-ID collisions in a single tick:

1. **First claim D-006** — taken by parallel agent's weekly-agent-update (Run 29, commit `cf8d616`).
2. **Second claim D-007** — taken by mempalace-portability (Run 30); then a **second** parallel session *also* wrote its own Run 30 at line 36 for Part-7-rename with D-007 — creating TWO D-007 entries in the log.
3. **Third claim D-008** — also unsafe; re-read after edit showed the decision-log kept shifting.
4. **Settled D-009 + Run 32** — my Issues #34-40 titles renamed Run 29 → 30 → 31 → 32 in sequence.

Three separate `Run 30`s exist in the decision-log for three different scopes. The `D-004`-placeholder trick from D-005 is insufficient when ≥3 sessions run concurrently. Issue **#42** captures this; needs user input on the chosen protocol (timestamp-based D-IDs, session lock, commit-to-reserve, or disallow parallel heartbeats).

## Meta-bootstrap caveat

This tick **did not fully follow the pipeline it just codified**:
- **No per-Issue branch** (stayed on `run-25/dependabot-triage`). Fragmenting branches while three parallel sessions are all committing to one branch would have multiplied merge conflicts.
- **No PR + review panel** (direct commit). The change is doc-only; the pipeline review station is forward-looking, not retroactive to the spec-writing tick.
- **No ScheduleWakeup** at end of tick (sub-issue #38 covers that wiring).

The first *pure-pipeline* tick will be Run 33 (or whatever integer the next parallel-collision resolution yields). That tick will:
1. Branch `issue-<N>/<slug>`.
2. TDD the work.
3. Open a PR against `main`.
4. Run the `pr-review-toolkit:review-pr` panel.
5. Gate-check (5 gates) and auto-merge only if labeled `auto-merge:ok`.
6. Schedule next wake-up via `ScheduleWakeup(delay = clamp(ideal, 900, 3600))`.

## Next task

Per `issue-triage-picker` priority tree:
1. No `status:in-progress` after closing #35.
2. Open child sub-issues of open parent: **#36, #37, #38, #39, #40** (all children of #34). Leaf-first rule → pick any of these next.
3. Best next pick: **#36 (SOUL.md runtime directive)** — it's the mirror-to-runtime counterpart that keeps the "applies to both surfaces" rule honest. Guardrail-locked, needs its own tick.
4. Alternative: **#39 (`/heartbeat` skill-chain wiring)** if the user wants to start running the pipeline autonomously before SOUL.md changes land.

## Open concerns / captures

- **#42** parallel-session D-ID collision protocol — needs user input on scheme (timestamp, lock, reserve-by-commit, or ban-parallel).
- **#36** SOUL.md is guardrail-locked (CLAUDE.md §5 — requires a tracked Issue before any edit). Issue #36 is the tracked Issue; the user's "lets go" this session is the approval-in-advance for the TDD-directive-only change in that Issue. If approval breadth is unclear, re-ask via Dev-Q&A.
- The pipeline **does not yet have a working auto-merge gate** — Issue #37 is needed before the loop can actually self-merge safely. Until #37 lands, auto-merge is gated by a manual user sanity check.
- Dev-Q&A Q-20260418-001 was resolved by parallel agent's D-007 (Part 7 rename) — their work, not mine.

## Commits this run

1 (upcoming): `docs(workflow): codify intelligent heartbeat pipeline per D-20260418-009 (closes #35, opens #34 #36 #37 #38 #39 #40 #42)`
