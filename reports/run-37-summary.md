# Run 37 Summary — Phase 3 §A.2 Cohesion-Check Runner (D-20260418-015)

## Overview
**Task**: Issue #23 — Create `dashboard/scripts/cohesion-check.js` — single entry point that runs every `check:*` script, captures per-check output + duration + exit code, writes machine-readable JSON report.
**Decision ID**: D-20260418-015 (D-014 + Run 36 both taken by parallel subagent for "Faster Heartbeat Cadence" — bumped to Run 37 / D-015 cleanly).
**Status**: COMPLETE — runner ships, baseline verified **all 6 checks green**.
**Trigger**: Heartbeat tick 9, self-scheduled from Run 31 via `/loop`. Oldest-first pick of non-epic leaf; skipped EPIC #19 and active EPIC #34 children.
**Branch**: `run-36/phase-3-cohesion-runner` (name kept; the actual run is 37 due to collision).

## Changes
| File | Change |
|---|---|
| `dashboard/scripts/cohesion-check.js` | **New** — 115-line runner. Spawns each check via `spawnSync` with args-as-array (Windows-safe), captures output + timing, writes JSON report. `--all` flag to aggregate past failures. `module.exports` exposes `{CHECKS, runSingle, runAll, writeReport}` for future unit tests. |
| `dashboard/package.json` | `check:all` now calls the runner; shell chain preserved as `check:all:shell` for rollback. |
| `reports/cohesion/.gitkeep` | New — preserves the report directory on clone. |
| `.gitignore` | Added `reports/cohesion/*.json` so tick artifacts don't inflate git history. |
| `decision-log.md` | D-20260418-015 entry. |
| `reports/run-37-summary.md` | This file. |

## Baseline — first full green in project history

```
$ node scripts/cohesion-check.js --all   (from dashboard/)

▶ check:lint                ✓ (13688ms, exit 0)   no warnings/errors
▶ check:types               ✓ (18178ms, exit 0)   tsc --noEmit clean
▶ check:tests               ✓ (15906ms, exit 0)   17/17 pass
▶ check:coverage-threshold  ✓ (14388ms, exit 0)   95.45%/91.66%/92%/94.59% (floor 90%)
▶ check:arch                ✓ ( 1430ms, exit 0)   placeholder (§A.5 fills it in)
▶ check:deps                ✓ ( 4133ms, exit 0)   0 vulnerabilities

[cohesion-check] ✓ ALL PASSED
[cohesion-check] report → ..\reports\cohesion\2026-04-18T07-34-25.981Z.json
Total: ~67.6s end-to-end
```

The `check:deps` red that Run 31 captured was resolved by Dependabot PR #2 (next 15.0.0-rc.0 → 15.5.15) merging during my scheduled sleep. No action from this heartbeat beyond running the runner.

## Design notes (AC compliance evidence)

### "execFile-style, no shell string interpolation" (AC bullet)
`spawnSync('npm', ['run', '--silent', checkName], { shell: process.platform === 'win32' })` meets both spirit and letter:
- Args are an **Array**, not a composed string — cmd.exe / sh never parses `checkName` as a sub-command.
- `shell: true` on Windows is required only to launch `.cmd` files (npm's Windows entry); we don't compose a shell string, so there is no injection surface.
- Inline comment in the script so future reviewers can re-verify without reading the runner from scratch.

### Fail-fast vs `--all`
Default is fail-fast — matches the AC "Stops at first failure with a readable report" and is what CI wants (stop early, surface the error). `--all` is for explicit baseline captures.

### JSON report shape
Matches AC exactly. `decisionId` reads from env `COHESION_DECISION_ID`; future heartbeat tooling will set it so each tick's report links to its decision.

### Report directory hygiene
`reports/cohesion/.gitkeep` preserves the dir on clone; `reports/cohesion/*.json` is git-ignored so tick artifacts don't bloat the repo. Future heartbeat can add rotation (keep last N) if the dir grows unwieldy.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260418-015 | Ship the runner; rewrite `check:all` to call it; keep shell chain as `check:all:shell` fallback | AC's 8 items all satisfied; `spawnSync + args-array` is the cleanest cross-platform "execFile-style" path; fail-fast default matches CI; `--all` for explicit baselines; fallback script gives rollback if runner regresses |

## Metrics
- **Issues closed**: **1** (#23)
- **Issues opened**: 0
- **Checks captured**: 6/6 green — first full green in project history
- **Commits this run**: 1 expected
- **Open backlog**: #19 EPIC, #24, #26, #27, #28, #30, #31, #34 EPIC, #36–#40, #41

## GitHub Notes
- #23 closing with comment citing AC check-off + D-20260418-015.
- Dependabot PR #2 merged during my sleep (visible in current `package.json`: `next @ 15.5.15`). No action this tick beyond consuming the improvement.
- Transitive-dep issues #30 (minimatch) + #31 (glob) remain open but `check:deps` reports **0 vulnerabilities** after the `next` bump. A follow-up heartbeat should verify at low/medium audit levels and close if truly cleared.

## Gaps Captured (Polsia Rule 2)
- **Sixth parallel-subagent D-ID + Run-number collision** (D-014 + Run 36 both taken for "Faster Heartbeat Cadence"). Bumped cleanly to D-015 / Run 37. Pattern is now well-characterised: the only robust fix is a pre-commit hook that scans `decision-log.md` + `reports/run-*-summary.md` before claiming an ID. Capturing here, not as a separate Issue — if a seventh happens, opening one.
- **`check:tests` runs twice when `check:all:shell` is invoked** (once via `check:tests`, once inside `check:coverage-threshold`). The new runner fails-fast by default so you'd rarely hit the shell fallback, but the duplication is ~5s and a future consolidation is possible.
- **`dashboard/package-lock.json` + root `package-lock.json`** triggers Next's "additional lockfiles" warning. Cosmetic. Flag for a root-vs-dashboard hygiene heartbeat.

## Plans folder checked
- `plans/phase-3-plan.md` §A.2 — satisfied.
- Next: §A.3 (wire cohesion-check into heartbeat tick), §A.4 (write coverage-floor.json on green), §A.5 (real architecture lint).

## Next Tasks (priority order)
1. **#24** Phase 3 §D.1 — UI shell + routing (largest single-issue unblock; opens every other §D issue).
2. **#26** Phase 4 §B.1 — GitHub Actions CI wraps the now-existing `check:all`.
3. **#30** / **#31** — verify Dependabot transitive-dep fixes cleanly resolved and close if so.
4. **#27** Phase 4 §C.2 — `.env.example` + dotenv (may already be closed by subagent; verify on next orient).
5. **#28** Phase 4 §A.1 — PM2 ecosystem.
6. **#41** — filesystem MCP path portability (same pattern as #17).

**Heartbeat cadence**: self-paced via `/loop`. Next wake scheduled post-commit.
