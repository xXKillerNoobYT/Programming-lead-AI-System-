# Run 204 — cleanup tick (close obsolete + queue next leaf)

**Date**: 2026-04-19
**Branch**: `issue-24/shell-routing`
**Decision IDs**: none (housekeeping)

## Overview

Issue #24 AC is 8/8 satisfied but PR #99 hasn't merged yet — user has auto-merge off. Rather than re-pick #24 (would build on uncommitted-to-main work), this tick did two housekeeping actions:

1. **Closed Issue #66** — "Merge PR #14" was a tracker that landed 2026-04-19 via merge commit `c63aae1`. Obsolete.
2. **Filed Issue #104** — Phase 3 §D.2 (design tokens + shadcn install). The natural next-leaf after #24 merges; queued now so the backlog is coherent.

## Outcome

- Issue #66 → closed with a comment citing merge commit + Run 191
- Issue #104 → created with explicit dependencies on PR #99 + PR #103

## Backlog state
Open `status:backlog`: #24 (pending PR #99 merge), #34 (EPIC with children), #36/#37 (leaves of #34), #62, #67/#68 (merge trackers for CONFLICTING PRs #25/#29), #89/#90/#92/#93/#96-98, #100 (branch-sync), #102 (SOUL.md rename — needs user approval), #104 (new §D.2). Depth >> 3.

## Why not pick a new code leaf this tick
- #37 (auto-merge gate) has an open PR #60 CONFLICTING — that's a rebase/cleanup job, not a fresh TDD task
- #36 (SOUL.md runtime directive) requires editing SOUL.md, which is §5-guarded
- #62 remote-gh is complex multi-step
- #104 waits on PR #99 + PR #103 merging first
- #100 branch-doc-sync also waits on PR #99 merge to avoid conflict cascade

Highest-value action this tick = backlog hygiene + documentation, not net-new code.

## Next tick
If PR #99 or PR #103 has merged: rebase the other and start #104 (shadcn install).
Else: another cleanup pass — close any other obsolete tracker Issues (#67, #68 if the tracked PRs aren't mergeable), or rebase PR #60 for #37.

## Open concerns
- **PR #99 sitting open with all of #24's work** — user's merge call. Ready whenever.
- **PR #103 sitting open with React 19 stable** — same situation.
- Merging #99 first means #103 conflict-resolves to a 0-change rebase (same diff already on main). Same other direction. Order doesn't matter.
