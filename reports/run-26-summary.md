# Run 26 Summary — Issue #13 Stale UI Content Fixed (D-20260418-003)

## Overview
**Task**: Issue #13 — `dashboard/app/page.tsx` contains stale Run-2 content + Docker/Ollama refs violating no-Docker preference.
**Decision ID**: D-20260418-003
**Status**: COMPLETE
**Trigger**: First tick of the self-pacing `/loop /heartbeat` the user just started this session. Also the user had loaded `superpowers:test-driven-development` as the surrounding skill, so TDD discipline applied throughout.
**Branch**: `run-22/phase-4-plan`.

## Outcome
The dashboard's 4 stale hardcoded strings are gone. Header subtitle, Coding Relay placeholder, hardcoded model text, and footer now reflect current SOUL.md identity and the no-Docker preference (D-20260417-005). 5 new regression tests guard against re-introduction. 24/24 root tests + 17/17 dashboard tests + clean `next build`.

## Changes
| File | Lines | Before → After |
|---|---|---|
| `dashboard/app/page.tsx` | 117 | `Run 2: Phase 1 MVP` → `Autonomous Programming Lead` |
| `dashboard/app/page.tsx` | 126 | `Chat interface with Roo Code delegation (MCP connected)` → `Chat relay from the delegating coding agent (MCP streaming)` |
| `dashboard/app/page.tsx` | 128 | `WebSocket connected to MCP delegation server • Model: Qwen3.5-32B via Ollama` → `WebSocket connected to MCP delegation server • Model: configured via Preferences` |
| `dashboard/app/page.tsx` | 260 | `Infrastructure for Run 2 Phase 1 MVP • Docker + Ollama + MCP + Next.js 15 • See plans/main-plan.md and GitHub #2` → `Local-Node infrastructure • MCP + Next.js 15 • See plans/main-plan.md` |
| `dashboard/__tests__/preferences.test.tsx` | +53 | New `describe('Dashboard content freshness (Issue #13)', …)` block with 5 regression assertions |
| `decision-log.md` | +1 row | D-20260418-003 |
| `reports/run-26-summary.md` | new | This file |

## TDD cycle (per the loaded `superpowers:test-driven-development` skill)

### RED
Added 5 tests asserting absence of the stale strings. Ran `npm test` (from dashboard/):
```
Test Suites: 1 failed, 1 total
Tests:       5 failed, 12 passed, 17 total
```
Expected fail reason on each: `Received string: "…Run 2: Phase 1 MVP…Roo Code…Qwen3.5-32B via Ollama…Docker + Ollama…"` — matches exactly what #13 described.

### GREEN
Applied 4 string replacements in `page.tsx`. Re-ran tests:
```
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
```

Root suite also clean (backbone untouched):
```
$ npm test (repo root)
ℹ tests 24
ℹ pass 24
ℹ fail 0
```

### Static build verification
```
$ npm run build (dashboard/)
✓ Generating static pages (4/4)
Route (app)                              Size     First Load JS
┌ ○ /                                    3.19 kB          92 kB
└ ○ /_not-found                          897 B          89.7 kB
```

## AC walkthrough (Issue #13)
- [x] Header subtitle replaced — `Autonomous Programming Lead` (matches SOUL.md core identity)
- [x] Coding Relay placeholder — `Roo Code` removed (D-006 directive)
- [x] Hardcoded model text removed — `Qwen3.5-32B via Ollama` replaced with `configured via Preferences`, so the real source of truth (`preferences.modelMappings`) drives the displayed model
- [x] Footer — no more `Docker + Ollama` wording; replaced with `Local-Node infrastructure` consistent with no-Docker preference (D-005)
- [x] Rebuild + tests clean — confirmed with command output above
- [x] Issue #11 test expectations — not affected; Run 12 rewrote `preferences.test.tsx` with no assertions on any of these strings, so no cross-fix needed

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260418-003 | Fix #13's 4 stale strings with TDD-first regression tests. Use generic "configured via Preferences" instead of hardcoding a new default model. | #13's AC already itemised the 4 lines; scope was atomic. TDD required by the loaded skill — catches future reintroduction. Generic text defers to the real source of truth (`preferences.modelMappings`) so it can't rot the same way. | Leave as-is (carries drift); test-after (Run 12 proved that's fragile); hardcode a new model string (same rot pattern); delete footer entirely (loses plans/main-plan.md back-ref) |

## Metrics
- **Issues closed**: 1 (#13)
- **Issues opened**: 0
- **Tests added**: 5
- **Test count delta**: 12 → 17 dashboard; 24 root unchanged
- **Open backlog after this run**: unchanged minus #13 — ~11 (#16, #17, #19 epic, #22, #23, #24, #26, #27, #28, #30, #31); ≥3 ✓
- **Commits this run**: 1 (upcoming)

## Gaps Captured (Polsia Rule 2)
_(none this run — clean single-purpose work)_

## Next Task (under the updated /loop)
Open atomic backlog ordered by creation time:
- #16 (2026-04-18, earlier) — stash triage
- #17 (2026-04-18) — mempalace path portability
- #22 (2026-04-18) — Phase 3 §A.1 check scripts ← **backbone**
- #23 (2026-04-18) — Phase 3 §A.2 cohesion runner ← **backbone**
- #24 (2026-04-18) — Phase 3 §D.1 UI shell + routing ← **backbone**
- #26 (2026-04-18) — Phase 4 §B.1 CI workflow ← **backbone**
- #27, #28 — other Phase 4 wave-1
- #30, #31 — security (Dependabot ReDoS + command-injection)

Recommended under softened-oldest-first + backbone-override: **#26** (Phase 4 §B.1 GitHub Actions CI workflow). CI is load-bearing for every future heartbeat — adds the regression-catch layer that the new `run-report-validator` subagent and #30/#31 security scans ultimately depend on.

Strict oldest-first alternative: **#16** (stash triage) — smaller and truly oldest.

## Heartbeat cadence
Self-paced. ScheduleWakeup fired for ~1500s (25 min) fallback before the next tick — enough for a fresh cache window after this heartbeat's context fills in.
