# Run 16 Summary — Heartbeat Effectiveness Review (D-20260417-014)

## Overview
**Task**: User-requested review of the agent heartbeat's effectiveness + soften the oldest-first pick rule from requirement to recommendation.
**Decision ID**: D-20260417-014
**Status**: COMPLETE
**Trigger**: User message 2026-04-17 — "review the heartbeat and make sure that it's working in the most effective way for proper development I recommend working from the oldest to the newest ones in the github issues but that is not a reqiermint".
**Branch**: `run-11/ui-master-plan`.

## Review Findings

### What's working well (15-run retrospective)
- **Polsia 5-rule contract** enforced every heartbeat; backlog depth has stayed ≥3 since Run 8.
- **One-task rule** held firm: every run closes/advances exactly one Issue, child Issues spawn for scope creep (Runs 13→#15/#16, 14→new Issues, 15→#17, 16→#18).
- **Decision ID discipline**: D-006 → D-014 continuous, one per run, every commit cites a D-ID + Issue #.
- **Verification gate** (added after Run 9's red-baseline discovery) catches false-green claims. Runs 10-16 all include `npm test` output in reports.
- **Report discipline**: 11 of 16 runs have reports; stubs backfilled for 7 (superseded) and 11 (retroactive). No silent skips.
- **Capture-vs-fix** discipline: gaps become Issues, not silent fixes. 25 Copilot comments in Run 15 → triaged and archived cleanly via dedicated Issue #15 + child #17.

### Risks identified
1. **Backbone untouched after 15 runs.** Every heartbeat has been housekeeping, dashboard, or meta-work. `heartbeat.js` (the *product*), the MCP orchestrator skeleton, and branch/agent management have zero recent commits. The user's end-goal memory ("build core backbone one area at a time, done well") is not yet being honored by the heartbeat's pick pattern.
2. **Rigid oldest-first biases toward housekeeping.** Current backlog — #7 phase-3 plan, #8 phase-4 plan, #12 dependabot, #13 stale page.tsx, #16 stash triage, #17 portability — is 100% meta. Oldest-first would starve the backbone indefinitely.
3. **Branch drift.** `run-11/ui-master-plan` has absorbed Runs 11-16 without merging to `main`. PRs #2, #10, #14 all open. Eventual merge conflict risk is growing.
4. **`.vscode/github-issues/*` sync cache** appears in `git status` every heartbeat — low-value noise; could be `.gitignore`d.
5. **`heartbeat.js` is Run-2-stale.** References Roo Code (abandoned D-20260417-006) and hardcoded HTTP MCP URLs that don't match the current stdio `.mcp.json`. Captured as Issue #18.

## Changes Applied
| File | Change |
|---|---|
| `CLAUDE.md` §6 "Heartbeat pick order" | **Softened** from hard rule to recommendation. Added explicit deviation conditions: (a) user redirects, (b) newer Issue blocks older work, (c) newer Issue directly advances **core backbone** while backlog is all housekeeping. Added "record the reason in the run report whenever you deviate". |
| `CLAUDE.md` §3 Step 2 item 2 | Reinforced the same softening inside the step-level pick logic so future orients find it in two places. |
| `reports/run-16-summary.md` | This file. |
| `decision-log.md` | Added D-20260417-014 entry. |
| GH Issue #18 | **Opened** — "Refresh heartbeat.js backbone: align with current Claude-Code/stdio-MCP reality". Atomic Polsia Rule 2 capture from the stale-backbone finding above. |

## What I intentionally did NOT change
- **`.gitignore` for `.vscode/github-issues/`** — low priority; can be captured as its own Issue if it keeps annoying future heartbeats. Not bundled here to keep Run 16 single-purpose.
- **Branch merge** — PRs #10 and #14 need user review/merge decisions. Not autonomous.
- **heartbeat.js edits** — captured as #18 rather than done inline; #18's scope (removing Roo Code delegation, stdio-MCP rewrite) is a multi-AC task that shouldn't be absorbed mid-review.

## Test Results
```
$ npm test (dashboard/)
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```
No code paths affected; doc-only edits. Tests still 12/12 (cheap insurance).

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260417-014 | Soften CLAUDE.md §6 oldest-first rule from requirement to recommendation; add explicit deviation conditions (user override, blocker, core-backbone priority); reinforce in §3 Step 2. Open Issue #18 for `heartbeat.js` backbone refresh (captured gap: stale Roo-Code delegation + HTTP-MCP URLs that don't match stdio `.mcp.json`). | User directive 2026-04-17. Empirical evidence: 15 heartbeats have picked strictly oldest-first and all have landed on housekeeping/meta-work, while the product backbone has zero forward progress. The rule was good discipline against context-switching but has also been a passive bias toward meta-work. Softening + adding "backbone override" unblocks end-goal progress without abandoning the anti-context-switch intent. | Keep oldest-first as hard rule (preserves current behavior but starves backbone); drop oldest-first entirely (loses the anti-context-switch benefit); fix `heartbeat.js` inline during this review (violates finish-before-switching since #18 is a multi-AC task) |

## Metrics
- **Issues closed**: 0 (this run is a meta/review tick — no Issue was in flight)
- **Issues opened**: 1 (#18 — heartbeat.js backbone refresh)
- **Open backlog after this run**: 7 (#7, #8, #12, #13, #16, #17, #18)
- **Queue depth**: 7 (Polsia Rule 4 ≥3 ✓)
- **Commits this run**: 1

## Gaps Captured (Polsia Rule 2)
- **#18** — `heartbeat.js` is Run-2-stale; references Roo Code (abandoned per D-20260417-006) and hardcoded HTTP MCP URLs (don't match current stdio `.mcp.json`). Atomic ACs listed in the Issue.
- (Carried) `.vscode/github-issues/*` cache drift appears every heartbeat in `git status`. Low priority — not filed as an Issue yet; future heartbeat can `.gitignore` or accept as tolerated noise.
- (Carried) PRs #2, #10, #14 all open — branch-drift risk growing. Not autonomous-fixable; requires user merge decisions.

## Next Task (per softened oldest-first)
Open backlog ages (oldest first):
- **#7** (2026-04-18 03:16 UTC) — Write `plans/phase-3-plan.md`
- #8 (2026-04-18 03:16 UTC) — Write `plans/phase-4-plan.md`
- #12 (2026-04-18 ~03:34 UTC) — Dependabot security review
- #13 (2026-04-18 ~03:39 UTC) — Stale page.tsx content
- #16 (2026-04-18 04:24 UTC) — Stash triage
- #17 (2026-04-18 04:30 UTC) — Mempalace path portability
- #18 (this session) — heartbeat.js backbone refresh

**Recommendation under the new rule**: pick **#18** next. Justification under CLAUDE.md §6 deviation condition (c): the remaining backlog is entirely housekeeping, and #18 is the only Issue that directly advances the core backbone. Alternative by strict oldest-first would be #7 (phase-3 plan), but that's more meta-work stacked on meta-work.

If the user disagrees, strict oldest-first → #7.

## Open Concerns (carried forward)
- Core backbone work (`heartbeat.js`, MCP orchestrator, branch/agent management) remains 0% advanced — #18 is the first atomic step toward closing that gap.
- 11 Dependabot alerts still open (#12).
- MemPalace MCP still not loaded despite `.mcp.json` + session restart + approval. Cross-run memory still via files.
- 3 open PRs unmerged (#2 dependabot, #10 Run 8/9 bootstrap, #14 UI master plan).

## Heartbeat cadence
Self-paced. Will proceed to #18 unless user redirects.
