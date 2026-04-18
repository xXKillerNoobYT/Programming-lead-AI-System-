# Run 43 Summary — Phase 4 §C.2 `.env.example` + Dotenv (D-20260418-021)

## Overview
**Task**: Issue #27 — `.env.example` at repo root, Node-20 `process.loadEnvFile()` in heartbeat, `.mcp.json.template`, README "First-Time Setup" section.
**Decision ID**: D-20260418-021
**Status**: COMPLETE — all 6 AC items met + sidefix to the root `npm test` script.
**Trigger**: Heartbeat tick 13, self-scheduled from Run 42 via `/loop`. Oldest non-epic pick after #41 closed; natural follow-up to Run 42's `WORKSPACE_DIR` work.
**Branch**: `run-43/phase-4-env-dotenv`.

## Changes
| File | Change |
|---|---|
| `.env.example` | **New** — 5-section template covering MCP paths, Heartbeat runtime, Grok budget, Logs, Cohesion/CI. 11 vars documented with inline comments + defaults. |
| `heartbeat.js` | Added `process.loadEnvFile()` call at module top (lines 22–31). Silent ENOENT fallback; warns-once on other errors. Zero new deps. |
| `.mcp.json.template` | **New** — literal copy of `.mcp.json`. Both already use `${VAR}` placeholders so they're the same shape today; `scripts/setup.js` (§C.1) will later render one from the other. |
| `README.md` | New "First-Time Setup (30 sec)" 5-step checklist subsection + prose update to point at `.env.example`. |
| `package.json` | **Sidefix**: `test` script was running only `tests/heartbeat.test.js` (24/24); corrected to explicit file list so all 41 tests run. |
| `decision-log.md` | D-20260418-021 entry. |
| `reports/run-43-summary.md` | This file. |

## AC coverage (Issue #27)
- [x] `.env.example` exists at repo root with every required env var, grouped by area, each with comment + default.
- [x] `.env` is `.gitignore`'d (verified line 14 of `.gitignore`).
- [x] `heartbeat.js` calls `process.loadEnvFile()` at startup with no-op fallback when `.env` absent.
- [x] `dashboard/app/…` reads env via `process.env` (Next's built-in `.env.local` loading path — no change needed).
- [x] `.mcp.json.template` introduced alongside `.mcp.json`.
- [x] README.md gained "First-Time Setup" subsection.
- [x] `npm test` green at root — 41/41 pass after the sidefix (matches D-20260417-020's baseline).

## Sidefix — root `npm test` covered only half the tests
D-20260417-020 (Run 21) shipped 41/41 tests. `npm test` today reports 24/24 — spec regression. Root cause: `package.json` had `"test": "node --test tests/heartbeat.test.js"` — explicit single file. Fixed to explicit two-file list `"node --test tests/heartbeat.test.js tests/mcp-client.test.js"`. Tried directory-arg `node --test tests/` first; fails on Node 24 with `MODULE_NOT_FOUND` (Node 20 discovers, Node 24 doesn't — explicit list is portable).

```
$ npm test
ℹ tests 41 · suites 11 · pass 41 · fail 0 · duration_ms 927
```

Evidence-before-assertion (D-20260417-007) caught this. Without running the command, the "tests green" claim would have been true (24/24 all pass) but the coverage was half what it should have been.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260418-021 | Node-20 `process.loadEnvFile()` over `dotenv` npm; `.mcp.json.template` as literal copy of live file; sidefix `npm test` to explicit file list; README checklist-first | Zero new deps; silent ENOENT for first-clone UX; template/live convergence works today because both use `${VAR}` placeholders; explicit file list survives Node version drift; checklist scan-friendlier than prose for onboarding |

## Metrics
- **Issues closed**: **1** (#27)
- **Issues opened**: 0
- **Tests now reported by `npm test`**: 41/41 (was 24/24 pre-sidefix)
- **Files changed**: 5 meaningful (`.env.example`, `heartbeat.js`, `.mcp.json.template`, `README.md`, `package.json`) + 2 admin (`decision-log.md`, run-43 report)
- **Commits this run**: 1 expected
- **Open backlog**: #19 EPIC, #24, #28, #34 EPIC, #36, #37, #40

## GitHub Notes
- #27 closing with AC check-off and D-021 citation.
- `WORKSPACE_DIR` setup is now documented three places: README First-Time Setup (the 30-sec path), README Setup env-var table (reference), and `.env.example` section 1 (copy-paste target). Intentional redundancy for onboarding.

## Gaps Captured (Polsia Rule 2)
- **Silent `npm test` regression from 41 → 24** — caught this tick via sidefix. Pattern lesson: any change to `tests/` directory structure or `package.json` scripts needs a `test` script audit. Captured here; no separate Issue because the fix is in this PR.
- **`.env.example` Section 3 (Grok) references vars that don't consume code yet** — `GROK_API_KEY` and budget caps are documented for Phase 4 §G.1 (#8's plan); actual consumers land when §G.1 is picked up. That's fine — early documentation is cheaper than late.
- **`.mcp.json.template` duplicates `.mcp.json`** — because both hold the same placeholders. Once `scripts/setup.js` lands (§C.1), the template becomes the source; `.mcp.json` becomes per-machine output. Not a problem today; flagged for §C.1 to resolve.

## Plans folder checked
- `plans/phase-4-plan.md` §C.2 — satisfied.
- Next: §C.1 (`scripts/setup.js` will consume `.env.example` + `.mcp.json.template`), §A.1 (#28 PM2).

## Next Tasks (priority order)
1. **#24** Phase 3 §D.1 — UI shell + routing (still large, still deferring to dedicated session).
2. **#28** Phase 4 §A.1 — PM2 ecosystem file + startup hook.
3. **#36** / **#37** / **#40** — Run 32 pipeline EPIC children (parallel subagent).
4. Future §C.1 `scripts/setup.js` — renders `.mcp.json` from `.mcp.json.template` + `.env`; consumes the template this run landed.

**Heartbeat cadence**: self-paced via `/loop`. Next wake scheduled post-commit.
