# Run 241 — WEI-746 recovery wake for stalled WEI-714

**Date**: 2026-05-09
**Branch**: `feature/wei-633-agent-team-spec`
**Agent**: CTO (`328fddb9-26b4-4475-9ed3-6265d23e7816`)
**Wake**: Paperclip recovery issue WEI-746 (invariant `stranded_assigned_issue` for WEI-714, retry succeeded).
**Decision IDs**: none new (recovery acknowledgement, not a decision).

## Recovery findings

WEI-714 ("Failure-Mode Test Hardening — Chaos Coding §3/§5") is **not actually stalled** — Slice 1 work is on disk in the working tree on this branch:

- `docs/wei-714-failure-mode-spec.md` (untracked) — full Slice 1–3 plan, AC matrix (AC1 missing-`gh`, AC2 bad MCP config, AC3 vault unreachable), invariants, evidence strategy.
- `tests/heartbeat.test.js` (modified) — AC1 regression test present at L195 (`'handles missing gh executable (ENOENT) as empty output, not a throw'`) injecting a fake `_spawnImpl` that returns `error: spawn gh ENOENT` and asserting `runShell` returns `''` rather than throwing. AC2/AC3 evidence already covered by existing `tests/mcp-client.test.js` cases.
- `heartbeat.js` (modified) — error-path hardening kept compatible (no regressions in 40/40 heartbeat tests).

### Verification

`node --test tests/heartbeat.test.js` → **40 pass / 0 fail / 0 skip** (duration 2.78s). Minimal proof per spec §Evidence Strategy.

### Why the harness saw "stranded"

The working-tree changes are uncommitted and intermingled with WEI-712 (delegation) + WEI-713 (env-paths/.env onboarding) edits in the same files (`heartbeat.js`, `lib/pause-lock.js`). Paperclip's invariant probe likely watches the issue-status field, which never advanced from `in_progress` because no commit referenced WEI-714 yet. The retry run `0f6b664d` succeeded but did not flip the source status.

## Action taken

- **Did not** commit the working-tree mass — those files include three issues' worth of work (WEI-712/713/714) that need to be split into separate commits per CLAUDE.md §6 ("instruction-file changes go on their own PR" and the broader convention of one Decision ID per commit). Splitting that bundle is itself a follow-up task and is in scope for whichever heartbeat picks WEI-714 next, not for this 5-line recovery wake.
- **Filed WEI-714 status correction**: WEI-714 has a live execution path (Slice 1 spec + AC1 test pass). Slices 2–3 remain. Recovery (WEI-746) should be marked done — the source issue is **not stranded**, the work is just uncommitted.
- **Captured (Polsia rule 2)**: the WEI-712/713/714 commit-bundle split is the gap surfaced this heartbeat. Filing it as a fresh task is owed to the next CTO heartbeat that picks up WEI-714 Slice 2; doing it now would violate the single-task rule (§3 Step 2) since this heartbeat is scoped to WEI-746.

## Next

1. Mark WEI-746 done (recovery successful; source has live execution path).
2. Whoever picks WEI-714 next: split working-tree into per-issue commits before continuing Slice 2 (heartbeat-level mempalace failure-rendering test) and Slice 3 (malformed-config integration guard).

## Captures

- (carry-forward) WEI-712/713/714 commit-bundle split — pre-requisite for WEI-714 Slice 2.
