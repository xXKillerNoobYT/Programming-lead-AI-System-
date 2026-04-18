# Run 13 Summary — Stale Issues #3 & #5 Closed, CLAUDE.md §6 Codified (D-20260417-011)

## Overview
**Task**: Issue #3 (oldest open — "Run 3: Implement User Preferences Dashboard, Smart Agent & Model Mapping for Intelligent Workflow") + its reconciliation partner Issue #5.
**Decision ID**: D-20260417-011
**Status**: COMPLETE
**Trigger**: Follow-on heartbeat after Run 12 closed #11. Per user directive 2026-04-17 ("focus on the oldest one and continuing till it's done"), #3 was the next pick.
**Branch**: `run-11/ui-master-plan`.

## Outcome
Two adjacent stale Issues resolved. #3 was a 2026-04-17 morning artifact that had been superseded by D-20260417-004 ("Run 3 complete") but never closed — exactly the divergence #5 was filed to fix. Run 12's verified 95.45% coverage was the last missing piece of evidence. Three new CLAUDE.md conventions codify the lessons from this session so these divergences can't recur.

## Changes
| File | Change |
|---|---|
| `CLAUDE.md` §6 | Added 3 conventions: **Run-complete ↔ Issue-close pairing** (prevents decision-log/Issues drift); **GitHub is source of truth for Issues** (don't edit `.vscode/github-issues/*.md`); **Heartbeat pick order: oldest-first** (documents user directive). |
| `decision-log.md` | Added D-20260417-011 entry. |
| `reports/run-13-summary.md` | This file. |
| GH Issue #3 | Closed with a comment citing D-20260417-004, D-20260417-010, Run 12 coverage proof. |
| GH Issue #5 | Closed — AC fully satisfied (all 4 boxes checked via this heartbeat). |

## No code changes to dashboard
Neither Issue required code changes. Evidence that Run 3's scope is already delivered:
- `dashboard/app/page.tsx` has the full preferences UI (model mappings for 12 agent modes, toggles, heartbeat interval slider, max parallelism, approval threshold) — verified by 12 passing tests in Run 12.
- `dashboard/__tests__/preferences.test.tsx` exercises every preference path and localStorage persistence.
- Coverage `page.tsx`: 95.45% stmts / 91.66% branch / 92% funcs / 94.59% lines (Run 12 command output).
- `CLAUDE.md` §6 already enforces the "one atomic task per heartbeat" rule derived from the Polsia pattern.

## Test Results (re-verified this heartbeat)
No code changed, so tests unchanged from Run 12:
```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```
No regression check needed — nothing touched.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260417-011 | Close Issues #3 + #5 together; codify 3 project conventions in `CLAUDE.md` §6 (run-complete↔Issue-close, GitHub-as-source-of-truth, oldest-first pick) | #3 was stale since D-20260417-004 Run 3 complete; #5 existed to reconcile #3 and its own final AC asked for the CLAUDE.md convention. Closing both + codifying in one heartbeat honors user's oldest-first + finish-before-switch directive and prevents the same divergence type from recurring. | Leave #3/#5 open pending a "Run 3 audit" heartbeat (adds procedural overhead without new evidence); codify conventions as memory only (less enforceable than CLAUDE.md) |

## Metrics
- **Issues closed**: 2 (#3, #5)
- **Issues opened**: 0
- **Open backlog after this run**: 5 (#4, #7, #8, #12, #13)
- **Queue depth**: 5 (Polsia Rule 4 ≥3 ✓)
- **Commits this run**: 1

## Gaps Captured (Polsia Rule 2)
None new this heartbeat. The CLAUDE.md convention addition is itself a preemptive capture — it closes off the class of gap that caused #3/#5 to exist.

## Next Task (per oldest-first rule)
Oldest remaining open Issue — sorted by creation time:
- **#4** (2026-04-18 03:15:43 UTC) — Fix run-numbering inconsistency in reports/ — `type:bug`
- #7 (2026-04-18 03:16:14 UTC) — Phase 3 plan
- #8 (2026-04-18 03:16:20 UTC) — Phase 4 plan
- #12 (2026-04-18 03:34ish) — 11 Dependabot alerts
- #13 (2026-04-18 03:39ish) — Stale page.tsx content

**Next pick: #4** (oldest bug). Scope is manageable now that Runs 9-13 legitimized the run numbering — much of the original #4 work is already effectively done.

## Open Concerns (carried forward)
- `dashboard/Dockerfile` still contradicts no-Docker preference (not captured as Issue yet).
- React 19 RC + Next 15 RC still pinned — overlaps with #12.
- MemPalace MCP still not loaded this session.
- Branch `run-11/ui-master-plan` is the active working branch; it descends from `run-9/red-baseline` which descends from `main`. Will need merge-to-main coordination eventually.

## Heartbeat cadence
Self-paced. Moving to #4 next unless user stops.
