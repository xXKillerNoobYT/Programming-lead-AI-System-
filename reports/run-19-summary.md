# Run 19 Summary — Multi-Layer Decomposition Rule Codified (D-20260417-018)

## Overview
**Task**: Apply user directive *"issues need to be broken down into small tasks … using the child task feature … I don't care how many layers … but it needs to be smart about it"* to CLAUDE.md.
**Decision ID**: D-20260417-018
**Status**: COMPLETE
**Trigger**: User message this session. Follows user's earlier clarification that the heartbeat rules apply to both Claude Code AND the product (`heartbeat.js`) — *"this is for you claude code & the program that i want this applyed to — taking care of sub-task is allowed."*
**Branch**: `run-17/phase-3-plan` (note: the branch name reflects Run 18's ongoing phase-3 decomposition, not this run's topic).

## Outcome
CLAUDE.md now carries an explicit **multi-layer decomposition via GH sub-issues** rule in §6 and a matching priority-slot update in §3 Step 2. Future heartbeats — whether Claude Code in a session or the product runtime — must prefer leaf sub-issues before picking any Issue with open children, and must use GitHub's native `addSubIssue` graphql mutation (not text references) when decomposing.

## Changes
| File | Change |
|---|---|
| `CLAUDE.md` §3 Step 2 | New priority slot #2: *"open child sub-issue whose parent is also open."* Before picking any top-level Issue, check for leaves first. Prior slots renumbered. |
| `CLAUDE.md` §6 | New bullet **Multi-layer decomposition via GH sub-issues** with 6 sub-rules: (1) use `gh api graphql`'s `addSubIssue` mutation — not text refs; (2) children close before parent; (3) nesting depth unbounded; (4) ≤6 siblings before regrouping under a sub-epic; (5) parent body links its children; (6) rule applies to both Claude Code and `heartbeat.js` product runtime. Quotes the user directive verbatim for future audit. |
| `decision-log.md` | D-20260417-018 entry. |
| `reports/run-19-summary.md` | This file. |

## What I intentionally did NOT do
- **Did not retro-link existing informal-child Issues** (#15→#4, #16→#4, #17→#15, #18→Run-16-review) as real sub-issues. That's a housekeeping task worth filing as its own Issue if it matters; the rule applies to *new* decompositions from here forward.
- **Did not touch `heartbeat.js`** to implement sub-issue traversal — that's a downstream implementation task (probably a child of Issue #21 MCP wiring or a new Issue under Phase 3 §A). Rule-first, implementation-later honors the user's "one area at a time, done well" philosophy.
- **Did not open a separate Issue for this directive.** It was a direct rule-application ask, not an implementation feature. Applied immediately in the spirit of "auto mode — execute immediately, minimize interruptions."

## Test Results
```
$ npm test (repo root)
ℹ tests 24
ℹ pass 24
ℹ fail 0
```
(Doc-only edits this run — pure insurance check.)

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260417-018 | Codify the user's multi-layer-decomposition directive. Add sub-issue-leaf priority to §3 Step 2 (new slot #2). Add a 6-rule **Multi-layer decomposition via GH sub-issues** bullet to §6. Quote the user directive verbatim. Apply the rule to both Claude Code (orchestrator) and `heartbeat.js` (product runtime). | User directive this session; informal text-reference children (the current practice) don't surface in GH's parent/child graph, so future automated heartbeats can't traverse them. Using native sub-issues fixes that and lets `heartbeat.js` eventually pick leaves itself. Applying to both sides closes the loop: the product eventually decomposes without Claude-in-session, honoring the end-goal of 100% autonomous programming. | Keep informal text references (no machine-readable graph); cap nesting depth (user explicitly said *any* number of layers); apply only to Claude Code and not the product (user explicitly said both) |

## Metrics
- **Issues closed**: 0 (this run is a rule/workflow amendment, not Issue-driven)
- **Issues opened**: 0
- **Open backlog after this run**: unchanged from Run 18 end state (#8, #12, #13, #16, #17, #19 epic, #21, #22, #23, #24) — 10 open, ≥3 per Polsia Rule 4 ✓
- **Commits this run**: 1 (upcoming)

## Gaps Captured (Polsia Rule 2)
- **Existing informal-child Issues are not real sub-issues.** #15/#16/#17 (children of #4); #18 (child of Run 16 review); #22/#23/#24 (children of #7's phase-3-plan). These are still linked only via text. Worth filing as a retro-conversion Issue: *"Backfill existing informal child Issues as real GH sub-issues for graph-traversability."* Not done this run to keep Run 19 atomic.
- **`heartbeat.js` has no sub-issue traversal yet.** Its current `readIssueCounts()` just counts by status label; it can't pick leaves. This is a natural child of Issue #21 (MCP client layer) or a standalone Issue under Phase 3 §C (heartbeat hardening). Not filed this run.
- **Parallel-session coordination**: two Claude Code sessions appear to have been working the repo concurrently during this session (commits `0559cf8` and `bad61ba` landed during my Run 17 execution and superseded my pending edits). Worth noting the pattern: when multiple sessions run, each should `git pull --rebase` before committing, and decision IDs + Issue picks should be fetched fresh. Not a rule change this run, just an observation.

## Next Task (under the new rule)
Applying the updated Step 2 priority order:

1. No Issue is currently `status:in-progress`.
2. **Leaf check**: #22, #23, #24 are children of #7 (closed) — the phase-3-plan parent is already closed, so they're effectively root-level children of a closed epic. They are eligible as "leaves with no open parent." Similarly #15/#16/#17/#18 are children of closed parents. None of the *currently-open* Issues have registered sub-issues, so the leaf-first rule doesn't currently force a pick.
3. **Oldest-first on backlog** (softened): oldest open are #8 (phase-4-plan), then #12, #13, #16, #17, then the new wave-1 Issues #22/#23/#24, then #19 (epic — skip for atomic pick), #21.

**Recommended pick**: **#22** or **#23** or **#24** — these are the first wave of Phase 3 implementation and directly continue core-backbone momentum. Under D-20260417-014's backbone-override clause, these are the right choice over pure housekeeping like #12/#13/#16/#17.

If the user prefers strict oldest-first: **#8** (phase-4-plan writing).

## Open Concerns (carried forward)
- Two concurrent Claude Code sessions observed this session — decision-log has absorbed both streams but potentially fragile. If this repeats, document a rebase-first protocol.
- MemPalace MCP still not loaded.
- 3+ open PRs unmerged (#2 dependabot, #10 Run 8/9 bootstrap, #14 UI master plan).
- Branch `run-17/phase-3-plan` is accumulating Runs 17-19 without merging to `main`.

## Heartbeat cadence
Self-paced. Next heartbeat to pick from Phase 3 wave 1 (#22/#23/#24) unless user redirects.
