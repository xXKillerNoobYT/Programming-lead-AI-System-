# Run 38 Summary — ScheduleWakeup Wiring + Permission Allowlist (D-20260418-016)

## Overview
**Task**: Two-part atomic pick per user directive 2026-04-18 *"make sure that you have yours auto run turned on that way you're actually taking care of things. Then let's continue."*
**Decision ID**: D-20260418-016 (D-015 claimed by parallel session for Phase 3 §A.2 cohesion-check runner).
**Status**: COMPLETE. Closes **Issue #38** (sub-issue §D under EPIC #34).
**Trigger**: Live user directive.
**Branch**: `run-36/phase-3-cohesion-runner` (parallel-session branch — meta-bootstrap caveat; next tick should branch proper per-issue).
**TDD**: EXEMPT — prompt-doc edits and settings-file edits only; no production code touched.

## Part 1 — Permission allowlist (`fewer-permission-prompts` skill)

Scanned the 50 most-recent `.jsonl` transcripts across `~/.claude/projects/`. Filtered per skill rules (drop auto-allowed; drop interpreters; drop mutations).

**Added** to `.claude/settings.json` `permissions.allow`:

| # | Pattern | Count | Notes |
|---|---------|-------|-------|
| 1 | `Bash(npm test)` | 13 | Exact form; jest/node:test — read-only |
| 2 | `mcp__scheduled-tasks__list_scheduled_tasks` | 3 | Read-only cron listing |

**Dropped and why**:
- `grep`/`ls`/`cat`/`cd`/`sleep`/`echo`/`tail`/`sed`/`find`/`wc`/`git status|diff|log` (auto-allowed by Claude Code's built-in list — zero benefit from adding)
- `python3`/`node`/`curl`/`npm run` wildcard (arbitrary-code-execution risk per skill)
- `git add|commit|push|stash`/`gh issue create|edit|close`/`gh label create`/`gh api graphql`/`mcp__scheduled-tasks__create|update` (mutations — safer to prompt each time)

Existing `permissions.deny` entries (`Edit|Write(.vscode/github-issues/**)`) preserved. Hook config preserved.

**Auto-run mode note**: the terminal-side auto-accept toggle is user-controlled (`shift+tab` in Claude Code CLI). The allowlist minimizes prompts in every mode.

## Part 2 — ScheduleWakeup wiring (Issue #38 §D)

Added **Station 12 — Schedule the next tick (always — last station before end)** to `.claude/commands/heartbeat.md`.

### Tool-call form

```
ScheduleWakeup({
  delaySeconds: clamp(ideal, 60, 270),
  prompt: "<<autonomous-loop-dynamic>>",
  reason: "tick N complete, next tick in Xm (backlog: N open | plan: healthy/fuzzy | PRs: N pending merge-audit)"
})
```

### Ideal-delay heuristic (pass/fail bucket, small-LLM-friendly)

| Condition | Delay | Rationale |
|---|---|---|
| Backlog empty AND no PRs pending AND no `status:in-progress` | **270s** (≈4.5 min) | Idle ceiling; cache-warm |
| Something queued (backlog ≥ 1, PR pending, leaf sub-issue) | **60s** | Go fast — ScheduleWakeup floor |
| Ended on unresolved Singular-Heartbeat collision | **270s** | Let other session finish first |

### Clamp is mandatory

`60s` = ScheduleWakeup's hard floor; `270s` stays under the 5-min prompt-cache TTL so re-entry is always cache-warm. Don't exceed 270s without a new Decision updating the clamp (per D-014).

## Changes

| File | Change |
|---|---|
| `.claude/settings.json` | Added `permissions.allow` array with 2 entries |
| `.claude/commands/heartbeat.md` | Added Station 12 with tool-call form, heuristic, clamp note |
| `decision-log.md` | Appended D-20260418-016 |
| `reports/run-38-summary.md` | This file |

## Tests

Not run — settings + prompt-doc edits only. Root `node --test` still 24/24 green (unchanged from Run 35). Dashboard `npm test` still 17/17 green (unchanged from Run 33).

## Parallel-session collision count

D-015 and run-37-summary.md were claimed by the parallel cohesion-check-runner work before I could land them. This is the 6th D-ID collision this session. The singular-heartbeat rule (D-013) is encoded but not yet enforced — each session still sees the rule and proceeds. Going forward, sessions that read `/heartbeat` SOUL first will self-terminate on collision signals.

## Metrics

- **Issues closed**: 1 (#38 §D ScheduleWakeup wiring)
- **Issues opened**: 0
- **Files added**: 1 (this report)
- **Files modified**: 3 (.claude/settings.json, .claude/commands/heartbeat.md, decision-log.md)
- **Open backlog after this run**: EPIC #34 leaves remaining = #36 #37 #39 #40; wave-1 #22 #24 #26 #27 #28; security #30 #31; portability #17/#41

## Next task

Per the `issue-triage-picker` priority tree:
1. No `status:in-progress` after closing #38.
2. Open child sub-issues of open parent EPIC #34: **#36** (SOUL.md runtime directive), **#37** (auto-merge gate script), **#39** (/heartbeat skill-chain wiring), **#40** (TDD-scope revisit TODO).
3. Best next pick: **#39 §E /heartbeat skill-chain wiring** — folds the 10 pipeline stations into the command file, which is natural follow-up to Station 12 we just added.
4. Alternative: **#36 §B SOUL.md runtime directive** — mirrors the TDD+task-contract to the `heartbeat.js` product runtime.

With Station 12 now wired, the loop **can** self-pace — but a tick must actually call `ScheduleWakeup` at end. The first tick that does this will transition the project into continuous autonomous operation (subject to user's terminal-side auto-accept toggle).
