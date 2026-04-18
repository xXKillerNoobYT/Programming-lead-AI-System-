# Run 45 Summary — Phase 3 §A.4 Coverage-Floor Writer (D-20260418-023)

## Overview
**Task**: Issue #52 (opened this tick, closed same tick) — Phase 3 §A.4 coverage-floor writer.
**Decision ID**: D-20260418-023
**Status**: COMPLETE — round-trip verified, cohesion 6/6 green with real floor active.
**Trigger**: Heartbeat tick 15. Backlog was thinning (only #24 non-epic non-collision left); Polsia Rule 3 refill by decomposing the next §A piece from the Phase 3 plan.
**Branch**: `run-45/phase-3-coverage-floor`.

## Changes
| File | Change |
|---|---|
| `dashboard/jest.config.js` | Added `coverageReporters: ['text', 'lcov', 'json-summary']` so `coverage/coverage-summary.json` is produced on every `--coverage` run. |
| `dashboard/scripts/cohesion-check.js` | New `writeCoverageFloorIfGreen(results, decisionId, ts)` — on green runs, reads summary and writes `reports/coverage-floor.json` with per-metric percentages. Exported from module for future testability. |
| `dashboard/scripts/check-coverage-threshold.js` | Now reads **per-metric** floors (`statements`, `branches`, `functions`, `lines`) instead of using `statements` as a global floor for all four metrics — prior behaviour broke when real data landed because branch coverage is naturally lower than statement coverage. |
| `reports/coverage-floor.json` | **New, committed** — first real floor: `{ statements: 95.45, branches: 91.66, functions: 92, lines: 94.59 }`. |
| `decision-log.md` | D-20260418-023 entry. |
| `reports/run-45-summary.md` | This file. |

## Round-trip verified
```
# Setup: delete the floor to force the default-90 path
$ rm reports/coverage-floor.json

# Green run writes the floor
$ node scripts/cohesion-check.js --all
[cohesion-check] ✓ ALL PASSED
[cohesion-check] coverage floor updated → stmts 95.45% / branches 91.66% / funcs 92% / lines 94.59%

# Re-read: threshold check consumes the written floor
$ npm run check:coverage-threshold
[check:coverage-threshold] Reading floor from reports/coverage-floor.json:
  statements 95.45% · branches 91.66% · functions 92% · lines 94.59%.
[check:coverage-threshold] PASS.
```

Final full cohesion:
```
✓ check:lint                       6624ms
✓ check:types                      4429ms
✓ check:tests                      7908ms  (17/17)
✓ check:coverage-threshold         7491ms  (real floor active)
✓ check:arch                        881ms
✓ check:deps                       3276ms  (0 vulns)
[cohesion-check] ✓ ALL PASSED
```

Root `npm test` stays 41/41 (no code touched outside dashboard/).

## Design note — why per-metric floors
Run 31's `check-coverage-threshold.js` used `parsed.statements` as the single floor applied to all four metrics. That was fine while the floor was the hardcoded default 90% (all metrics were above 90%), but as soon as §A.4 wrote the first real floor (95.45 for statements, which is higher than branches 91.66), the check tripped — branches couldn't meet 95.45 because it's never been that high.

Fix: `readFloor()` now returns an object with per-metric numbers; jest's `coverageThreshold.global` accepts that shape directly. Default path still applies 90 to every metric (safe for bootstrap).

Caught via evidence-before-assertion (D-20260417-007) — ran the round-trip, saw the check fail, diagnosed, fixed, re-ran.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260418-023 | Per-metric floors in both writer and reader; ratchet-up-only; commit the floor file for diffable history | Only-green writes preserves the gate's intent; committing the file turns every green commit into an auditable coverage-trend signal; per-metric floors match reality where branch coverage < statement coverage |

## Metrics
- **Issues closed**: 1 (#52 — opened and closed same heartbeat per Polsia Rule 3 refill)
- **Issues opened**: 1 (#52)
- **Commits this run**: 1 expected
- **Tests**: 41/41 root + 6/6 cohesion
- **Open backlog**: #19 EPIC, #24, #34 EPIC, #36, #37, #40

## GitHub Notes
- #52 opened + closed same tick is legitimate per Polsia Rule 3: backlog was < 3 non-epic non-collision items, and §A.4 is the canonical next §A piece from `plans/phase-3-plan.md`. Filing-then-closing gives the audit trail a full Issue record of the work.
- Future Phase 3 §A pieces (§A.3 wire-to-heartbeat, §A.5 real arch lint, §A.6 chaos harness, §A.7 rollback-on-failure) remain unopened as Issues; each can file-then-close the same way when picked.

## Gaps Captured (Polsia Rule 2)
- **Run 31's `check-coverage-threshold.js` had a latent bug** — used `parsed.statements` as global floor; would have bitten as soon as a real floor landed. Caught in this tick, fixed inline. Pattern lesson: when a helper reads a multi-field JSON, the reader should preserve the field shape, not collapse to a single value.
- **`reports/coverage-floor.json` will conflict in parallel branches** — any two PRs that both trigger a green cohesion-check locally will both try to write the file with the ts from their local run. CI-side the situation is cleaner (one canonical main). Locally, the latter-to-commit overwrites — that's the intended behaviour (most-recent-green wins). Flag for future ops if branch coverage starts drifting.

## Plans folder checked
- `plans/phase-3-plan.md` §A.4 — satisfied.
- Next §A pieces (§A.3 heartbeat wiring, §A.5 arch lint, §A.6 chaos, §A.7 auto-revert) remain unopened; each natural next pick when backlog refills.

## Next Tasks (priority order)
1. **#24** Phase 3 §D.1 — UI shell + routing (still the largest single unblock; deserves a dedicated session).
2. Phase 3 §A.3 — wire cohesion-check into `heartbeat.js` tick as the gate between agent-report and decision-log.
3. Phase 3 §A.5 — replace placeholder `check-arch.js` with real architecture invariants.
4. **#36** / **#37** / **#40** — Run 32 pipeline EPIC children (parallel subagent scope).

**Heartbeat cadence**: self-paced via `/loop`. Next wake scheduled post-commit.
