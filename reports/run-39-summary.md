# Run 39 Summary — /heartbeat Skill-Chain Wiring (D-20260418-017)

## Overview
**Task**: Close sub-issue #39 §E under EPIC #34. Wire the full 14-station intelligent-pipeline spec from D-20260418-009 into `.claude/commands/heartbeat.md` with explicit skill/subagent invocations at each station.
**Decision ID**: D-20260418-017.
**Status**: COMPLETE.
**Trigger**: Live-session continuation after #38 closed.
**Branch**: `run-36/phase-3-cohesion-runner`.
**TDD**: EXEMPT — prompt-doc rewrite (no production code). Root tests 24/24 + dashboard 17/17 unchanged.

## What changed

`.claude/commands/heartbeat.md` rewritten from an 11-station ad-hoc list into a 14-station pipeline matching D-009's spec, each station naming exactly which skill/subagent to invoke:

| # | Station | Skill / Subagent |
|---|---|---|
| 1 | Orient | native (git/gh/fs reads) |
| 2 | Pick | `issue-triage-picker` subagent |
| 3 | Plan (conditional) | `superpowers:brainstorming` + `superpowers:writing-plans` |
| 4 | Branch | native `git checkout -b issue-N/slug` off main |
| 5 | Build | `superpowers:test-driven-development` |
| 5b | Debug (conditional) | `superpowers:systematic-debugging` |
| 6 | Capture (always) | native `gh issue create` |
| 7 | Verify | `superpowers:verification-before-completion` |
| 8 | Commit | `commit-commands:commit` |
| 9 | PR | `commit-commands:commit-push-pr` |
| 10 | Review | `pr-review-toolkit:review-pr` panel |
| 11 | Merge (gated) | `gh pr merge --squash --delete-branch` if all 5 gates pass |
| 11b | Merge + Security Audit (conditional) | cross-tick sweep; preserved from prior content |
| 12 | Record | native + optional `run-report-validator` subagent |
| 13 | Plan ahead | `superpowers:writing-plans` if plans fuzzy |
| 14 | Schedule | `ScheduleWakeup(clamp(60, 270))` with 3-bucket heuristic |
| — | Escape hatch | `post-dev-qa` skill for blocking design-questions |

## Key design choices

- **Station 11 vs 11b distinction preserved**: Station 11 is "auto-merge MY PR from this tick, gated by 5 conditions + `auto-merge:ok` label." Station 11b is "cross-tick sweep of OTHER stale PRs + Dependabot triage." Collapsing them would lose the tick-scope vs cross-tick-scope distinction and make the 5-gate rule ambiguous.
- **Preserved D-012's 3-day supersession grace-period** in 11b (parallel session's prior work — kept as-is since it's a good rule).
- **Station 12 optionally dispatches `run-report-validator` subagent** to catch false-green reports before commit — matches D-023's harness-automation intent.
- **SOUL + memory reference block preserved at top** (per D-013 Singular-Heartbeat). The Singular-Heartbeat rule is restated in the "One tick, one task" section at the bottom.
- **Escape hatch documented once, applies at any station**: if a design question blocks a tick and no live user is present, file via `post-dev-qa` and pick a different Issue.

## Files changed

| File | Change |
|---|---|
| `.claude/commands/heartbeat.md` | Full rewrite — 14 stations with explicit skills, preserved Singular-Heartbeat + both-surfaces notes |
| `decision-log.md` | Appended D-20260418-017 |
| `reports/run-39-summary.md` | This file |

## Tests

Not run — prompt-doc-only change. Root `node --test` 24/24 green (from Run 35). Dashboard `npm test` 17/17 green (from Run 33). No code-path touched.

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-20260418-017 | Full /heartbeat rewrite to match D-009's 14-station pipeline; Station 11 (my PR merge) and 11b (cross-tick sweep) kept distinct; Station 14 (ScheduleWakeup) preserved from D-016 | Issue #39 AC requires the full skill map per station; distinguishing tick-scope from cross-tick scope preserves rule clarity; collapsing would muddy the 5-gate auto-merge rule |

## Metrics

- **Issues closed**: 1 (#39 §E /heartbeat skill-chain)
- **Issues opened**: 0
- **Files added**: 1 (this report)
- **Files modified**: 2 (`.claude/commands/heartbeat.md`, `decision-log.md`)
- **EPIC #34 progress**: 4 of 6 sub-issues closed (#35 #38 #39 + #42 external + #45 external; remaining: #36 SOUL.md runtime directive, #37 auto-merge gate script, #40 TDD-scope revisit TODO)

## Next task

Per `issue-triage-picker` priority tree:
1. No `status:in-progress` after closing #39.
2. Open leaf sub-issues of open parent #34: **#36, #37, #40**.
3. Best next pick: **#36 §B SOUL.md runtime directive** — mirrors the TDD + delegated-task-contract onto `heartbeat.js`. Guardrail-locked (CLAUDE.md §5), needs tracked Issue (#36 exists). User's broad approval this session covers the TDD-directive-only change per the original pipeline directive.
4. Alternative: **#37 §C auto-merge gate implementation** — would unblock the Station 11 auto-merge for real (currently the gate criteria are documented; the script that evaluates them doesn't exist yet).

## Open concerns

- Branch `run-36/phase-3-cohesion-runner` still accumulating commits from multiple agents; consolidation-merge needed at some point.
- `heartbeat.js` product runtime doesn't yet know about the 14-station pipeline — next iteration of the runtime (post-#36) should mirror the station structure.
- Parallel-session chaos continues; 6+ D-ID collisions so far today. The singular-heartbeat rule is encoded but depends on sessions reading the SOUL before starting.
