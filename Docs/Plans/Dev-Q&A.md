# Dev Q&A — Design Questions Awaiting User Answer

**Purpose.** This is the asynchronous, file-based channel for design questions from the heartbeat system (Claude Code in a session today; `heartbeat.js` once it can decompose plans itself) to the user. The user answers periodically — not synchronously — and answers unblock tasks.

This file is the *only* writable file under `Docs/Plans/`. All other files in that folder are locked user intent (see `CLAUDE.md` §2).

## How This Works
1. **The system posts a question** here when a design decision is required AND one or more of these apply:
   - It blocks an Issue or the work on an Issue
   - Two or more reasonable defaults exist AND the choice is hard to reverse
   - The answer is not already in `Docs/Plans/Part *.md`, `decision-log.md`, `architecture.md`, `memory.md`, or the code
   - A `/loop` or cron heartbeat can't afford to block (no interactive user right now) but the question must be raised before work continues
2. **The system keeps working** on unblocked Issues while the question is open. Do not stall the heartbeat on an open Q&A.
3. **The user answers** when convenient. Just append your answer to the entry (or reply in-line).
4. **The next heartbeat that sees the answer**:
   - Records the decision as a new `D-YYYYMMDD-###` entry in `decision-log.md` (long-term home)
   - Removes the question from this file
   - Acts on the answer in the same heartbeat if feasible; otherwise files a new Issue
5. **Cleanup triggers** — remove an entry from this file when any of these happen:
   - a. User has answered it (record in `decision-log.md` first)
   - b. The task the question was blocking has already been completed a different way (note the removal in the next run report)
   - c. The question is no longer relevant (project scope changed, rule changed, etc. — again note in run report)

## Entry Format
Each open question is a level-3 heading block:

```markdown
### Q-YYYYMMDD-### — Short Title
**Posted**: YYYY-MM-DD by [Claude Code Run N | heartbeat.js tick TT]
**Blocks**: Issue #XX (and optionally: other Issues, other work)
**Context**: 1–3 sentences of why this came up.
**Options considered**:
- A. …
- B. …
- C. …
**Recommendation (non-binding)**: …
**Hard-to-reverse?**: yes/no

**User answer**: _(empty — awaiting)_
```

Q-IDs mirror the D-ID format but with `Q-` prefix. Reserve the same number for the matching D-ID when answered (e.g., Q-20260417-003 → D-20260417-019 if that's the next free D-slot; the mapping is 1-to-many in practice, so don't force parity).

## Open Questions

### Q-20260418-002 — 14-PR stack is all CONFLICTING — pick a recovery path
**Posted**: 2026-04-18 by Claude Code Run 48
**Blocks**: Further atomic work that touches `decision-log.md` or `reports/` (every new heartbeat PR conflicts until the stack resolves).
**Context**: `origin/main` has advanced via two merged PRs (`#33` Part 6 LLM rescue, `#2` next bump). The 14 open PRs (#10, #14, #25, #29, #32, #43, #46, #47, #48, #49, #50, #51, #53, #55) all branched off the pre-advance main and now show `mergeStateStatus: DIRTY` with `mergeable: CONFLICTING`. Conflicts are almost entirely in `decision-log.md` (each PR appends a row) and `reports/` (each PR adds a `run-N-summary.md`). Actual code-file conflicts are near-zero because each PR touched different feature files. Audit is in Run 47's inline status; Run 47 chose not to commit an audit report to avoid adding #15th PR to the pile.
**Options considered**:
- **A. Merge bottom-up via GitHub's "Resolve conflicts" UI.** Click through each PR in #10 → #14 → ... → #55 order, accept both sides where conflicts arise (`decision-log.md` lines + `reports/run-*.md` files are additive). ~15–30 min wall-clock. Simplest; ships all the work as-is.
- **B. Local rebase + force-push.** `git rebase origin/main` each stack branch, resolve, `git push --force-with-lease`. Cleaner history. Blocked by the current permission hook denying `git push --force*`; would need you to run locally.
- **C. Flatten the stack.** Close all 14 without merging; cherry-pick commits onto fresh branches off current `origin/main` as 1 or 2 logical PRs; re-open. Most work, best end-state, loses individual PR review surface.
**Recommendation (non-binding)**: **A**. The stack-bottom PRs are tiny and trivially mergeable; GitHub's UI resolver is built exactly for the additive-conflict case here. B and C are nicer on paper but cost more wall-clock and B is hook-blocked.
**Hard-to-reverse?**: no (A merges incrementally; each merge is revertable)

**User answer**: _(empty — awaiting)_

---

## Related
- `decision-log.md` — long-term home for answers once the user decides
- `CLAUDE.md` §4 — Ask-Question Protocol (in-session blocking; this file is the async cousin)
- `CLAUDE.md` §6 — project conventions, including when to post here vs call `AskUserQuestion`
