# Run 10 Summary — Infra/Build Green Baseline Restored (D-20260417-008)

## Overview
**Task**: Issue #9 — Restore working dashboard baseline (tests runnable + build succeeds).
**Decision ID**: D-20260417-008
**Status**: COMPLETE (baseline is now reproducibly green for infrastructure; 9 test-implementation failures captured as new Issue #11)
**Trigger**: User-initiated heartbeat, pivoted from subagent-driven-development to standard Polsia heartbeat loop.
**Branch**: `run-9/red-baseline` (will be renamed or merged in a follow-up).

## Outcome
Dashboard infrastructure is runnable and buildable on `HEAD`. All four gaps surfaced by Run 9's red baseline are resolved. Remaining work (9 failing tests, all in `preferences.test.tsx`) is **test-implementation** problems, not infrastructure, and has been captured as a new Issue per Polsia Rule 2.

## Changes
| File | Change |
|---|---|
| `dashboard/package.json` | Added `"test": "jest"` and `"test:coverage": "jest --coverage"` scripts |
| `dashboard/jest.setup.js` | **Created**: `require('@testing-library/jest-dom')` — pattern the test file expects |
| `dashboard/__mocks__/fileMock.js` | **Created**: `module.exports = 'test-file-stub'` — for Jest image import mapping |
| `dashboard/.next/` | Deleted stale cache that caused `_document` PageNotFoundError |
| `decision-log.md` | Added D-20260417-008 entry |
| `reports/run-10-summary.md` | This file |

## Test Results (real, command-verified)
```
$ npm test (dashboard/)
Test Suites: 1 failed, 1 total
Tests:       9 failed, 2 passed, 11 total
Snapshots:   0 total
Time:        6.715 s
```
**What passes**: 2/11 tests (infrastructure + basic render).
**What fails**: 9/11 tests — all in `__tests__/preferences.test.tsx`. Root cause is the test mocks `React.useState` / `React.useEffect` at module level via `jest.mock('react', ...)`, and the rendered DOM contains stale Run-2 skeleton content ("Run 2: Phase 1 MVP") rather than the current guidance UI. The mocking strategy is incompatible with how `app/page.tsx` now renders preferences.

## Build Results (real, command-verified)
```
$ npm run build (dashboard/)
▲ Next.js 15.0.0-rc.0
✓ Compiled successfully
Linting and checking validity of types ...
Collecting page data ...
✓ Generating static pages (4/4)

Route (app)                              Size     First Load JS
┌ ○ /                                    3.16 kB          92 kB
└ ○ /_not-found                          897 B          89.7 kB
+ First Load JS shared by all            88.8 kB
```
**Production build succeeds**. `/_document` PageNotFoundError was cache-induced; pure App Router is fine.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260417-008 | Restore green baseline by adding test scripts + missing test-infra files + wiping stale `.next/` cache; capture the 9 failing tests as separate Issue #11 rather than fixing inline | Issue #9 AC was "infrastructure runnable + build succeeds + report real numbers" — all met. The 9 failures are test-implementation issues (mocking strategy mismatch), distinct enough from baseline restoration that they deserve their own Issue per Polsia Rule 2 (capture > fix). Keeps heartbeat atomic. |

## Metrics
- **Issues closed**: 1 (#9)
- **Issues opened**: 1 (#11, test-implementation failures in preferences.test.tsx)
- **Open backlog after this run**: 5 (#4, #5, #7, #8, #11) + 1 stale (#3)
- **Queue depth**: 5 (Polsia Rule 4 ≥3 ✓)
- **Commits this run**: 1 (this report + decision-log + fixes)

## Gaps Captured (Polsia Rule 2)
- **#11** (new) — 9 test failures in `preferences.test.tsx` are all mocking-strategy problems. The test `jest.mock('react', ...)` overrides `useState`/`useEffect` in a way that's fragile against any UI restructuring. Candidate fix: refactor tests to use real React + React Testing Library's `rerender` / `user-event`, remove the React module mock. Not in scope for #9.

## Next Tasks (priority order)
1. **#11** Fix preferences.test.tsx mocking (makes tests pass) — now that infra is green, this unblocks coverage claims
2. **#4** Run-numbering reconciliation (housekeeping; smaller scope now that Run 9 + Run 10 legitimize the numbering)
3. **#5** Reconcile stale Issue #3
4. **#7** Draft `plans/phase-3-plan.md`
5. **#8** Draft `plans/phase-4-plan.md`

## Open Concerns (for user visibility)
- **Dashboard Dockerfile exists** (`dashboard/Dockerfile`) contradicting the no-Docker preference in CLAUDE.md §6. Not captured as Issue yet — flagging for user decision: delete, or is it kept intentionally for some out-of-tree scenario?
- **React 19 RC + Next 15 RC** still in `package.json`. Stable releases of both have been out for months; upgrading would reduce surprise bugs like the stale-cache `_document` ghost.
- **MemPalace MCP still not loaded** in this session despite `.mcp.json` approval + user-level config cleanup. Cross-run memory falls back to `memory.md` + `decision-log.md` + this report. Worth debugging in a later heartbeat.

## Plans folder checked
No changes to `plans/` this run. Phase 3/4 planning still queued in #7/#8. `plans/run-6-ui-plan.md` remains in the session-0 stash — not revived, not deleted; Issue #4 (run-numbering) still owns its fate.

## Heartbeat cadence
Self-paced. User has control. No `/loop` scheduled.
