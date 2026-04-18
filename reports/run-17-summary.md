# Run 17 Summary — heartbeat.js v0 Backbone Bootstrapped (D-20260417-015)

## Overview
**Task**: Bootstrap `heartbeat.js` v0 — the first atomic piece of the product backbone — per Issues **#18** (opened in Run 16) + **#20** (opened earlier this session; now closed as duplicate of #18).
**Decision ID**: D-20260417-015
**Status**: COMPLETE
**Trigger**: User chose option 2 at Run 15 handoff: "pivot to core backbone".
**Branch**: `run-11/ui-master-plan`.

## Outcome
The product's core-backbone scheduler now has a working minimal implementation. It runs as either a one-shot or watch-mode process, reads four state blocks (git · GH Issues · latest run report · recent Decision IDs), and writes a timestamped tick report under `reports/`. Twenty-four unit tests pass via Node's built-in `node:test` runner — zero new test-framework deps at repo root. The old Run-2-era `heartbeat.js` (Roo Code delegation, hardcoded HTTP MCP URLs, Ollama calls to a non-existent server) is preserved as `heartbeat.legacy.js` for historical diff reference, not imported anywhere.

## Changes
| File | Change |
|---|---|
| `heartbeat.js` | **Rewritten from scratch.** Read-only v0: pure helpers (`parseGitState`, `parseIssueCounts`, `findLatestRunReport`, `summariseRunReport`, `extractRecentDecisions`, `formatTickReport`) + thin side-effectful wrappers. Handles missing files, failed shell-outs, and non-JSON `gh` output without crashing. Supports `--watch` with `HEARTBEAT_INTERVAL_MS` env (default 60_000). |
| `heartbeat.legacy.js` | **Renamed** from old `heartbeat.js` via `git mv` — preserved for history; references Roo Code (abandoned per D-20260417-006), HTTP MCP URLs (never existed), Ollama (not running). |
| `tests/heartbeat.test.js` | **Created.** 24 tests across 6 suites; uses `node:test` + `node:assert` (zero deps). |
| `package.json` (repo root) | **Created.** 3 scripts: `heartbeat`, `heartbeat:watch`, `test`. Engines: `node >= 18`. |
| `architecture.md` | **Rewritten** with a "Current state (v0)" section that describes what actually runs today, a components present/absent table, and the target-state diagram kept for aspirational reference. |
| `reports/heartbeat-tick-2026-04-18T04-39-52-601Z.md` | First real tick output — branch `run-11/ui-master-plan@c8cab88`, 9 backlog / 0 in-progress, picked up `run-16-summary.md` + `D-20260417-014`. |
| `reports/run-17-summary.md` | This file. |
| `decision-log.md` | D-20260417-015 entry. |

## Test Results (real, command-verified)
```
$ npm test (repo root)
▶ parseGitState                  ✔ 4/4
▶ parseIssueCounts               ✔ 5/5
▶ findLatestRunReport            ✔ 4/4
▶ summariseRunReport             ✔ 3/3
▶ extractRecentDecisions         ✔ 4/4
▶ formatTickReport               ✔ 4/4
ℹ tests 24
ℹ pass 24
ℹ fail 0
```

```
$ npm run heartbeat
[heartbeat] 2026-04-18T04:39:52.601Z — run-11/ui-master-plan@c8cab88 — wrote …/reports/heartbeat-tick-2026-04-18T04-39-52-601Z.md
```

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260417-015 | Rewrite `heartbeat.js` as a minimal read-only v0; preserve the old Run-2 version as `heartbeat.legacy.js`; use Node's built-in `node:test` runner instead of pulling Jest into the repo root; create root `package.json` with 3 scripts; defer MCP client layer to follow-up Issue #21 | The prior `heartbeat.js` referenced Roo Code (abandoned D-006), HTTP MCP URLs that never existed, and Ollama on localhost (not running). Deleting it outright would lose the historical diff; preserving as `.legacy.js` keeps it visible without wiring. `node:test` needs zero deps and satisfies the user's "local-only, no new infra" preference. The v0 scope is deliberately "core backbone first, one area at a time, done well" per the user's iteration philosophy memory — wiring MCP is a separate well-scoped follow-up. | Keep old heartbeat.js (non-functional mis-targets); pull Jest to root (unnecessary dep tax); wire MCP inline (violates one-atomic-area rule); delete legacy outright (loses audit trail) |

## Metrics
- **Issues closed**: 2 (#18 primary, #20 as dup)
- **Issues opened**: 1 (#21 — MCP client wiring follow-up)
- **Open backlog after this run**: 8 (#7, #8, #12, #13, #16, #17, #19 epic, #21)
- **Queue depth**: 8 (Polsia Rule 4 ≥3 ✓)
- **Commits this run**: 1 (upcoming)

## Gaps Captured (Polsia Rule 2)
- **#21** — heartbeat.js has no MCP client layer. AC: add stdio MCP client wiring, connect to `.mcp.json`-declared servers, migrate one read-path (MemPalace) to MCP as proof-of-concept, update architecture.md.
- One Issue-#18 AC item not directly satisfied: startup sanity check for MCP connectivity. Documented in #21 as an AC item there.

## Next Task (per softened oldest-first + backbone-bias from D-20260417-014)
Backbone bias says favor core work when backlog is all housekeeping. Current backlog housekeeping/meta: #7, #8 (phase plans); #12 (Dependabot); #13 (stale UI text); #16 (stash triage); #17 (mempalace path portability); #19 (UI epic — future); #21 (MCP wiring — backbone).

**Recommended next pick: #21** (MCP wiring — this continues core backbone momentum).
**Strict oldest-first next pick: #7** (Phase 3 plan writing).

Surfaces the tension D-20260417-014 softened the rule for: oldest-first would pick a housekeeping task, backbone-bias picks #21. I lean #21; user to confirm.

## Open Concerns (carried forward)
- MemPalace MCP still not loaded in this session — will be verified at next restart.
- `dashboard/Dockerfile` still present (contradicts no-Docker).
- React 19 RC + Next 15 RC (overlaps with #12).
- Decision-log ordering non-monotonic (D-013 above D-012 per file lines) — noise but not breaking.
- Issue #18 marks `phase:2` as a label needed but absent — file a housekeeping Issue if/when it matters.

## Heartbeat cadence
Self-paced. Will proceed to #21 or #7 pending user direction.
