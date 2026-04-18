# Dev Q&A — Design Questions Awaiting User Answer

**Purpose.** This is the asynchronous, file-based channel for design questions from the heartbeat system (Claude Code in a session today; `heartbeat.js` once it can decompose plans itself) to the user. The user answers periodically — not synchronously — and answers unblock tasks.

This file is the *only* writable file under `Docs/Plans/`. All other files in that folder are locked user intent (see `CLAUDE.md` §2).

## Cross-Plan Compatibility
- Canonical map: `Docs/Plans/Plan Compatibility Index.md`
- Q&A answers must reconcile with: `Part 1.md`, `Part 3.md`, `Part 6 LLM Usage Strategy.md`, `Part 7 Polsia-Style Autonomous SDLC Lifecycle.md`, and `Part 7 UI Master Plan.md`.
- If an answer conflicts with existing locked intent, record the conflict in `decision-log.md` and route as a design-change decision before implementation.

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

### Q-20260418-003 — Idle-tick cadence: what should I do when there's no pickable work?
**Posted**: 2026-04-18 by Claude Code Run 60
**Blocks**: Tracking Issue #83 (`status:needs-user`). Not strictly blocking, but rate-limiting — each no-op tick commits ~30 lines to the meta PR (#63) to prove the tick ran.
**Context**: 3 consecutive no-op sweep ticks (Runs 58, 59, 60) since Run 57 closed Issue #65 for merged PR #10. No additional PRs have merged; 16 `status:needs-user` Issues still pending your click-through of the stack. Starting new `feature/*` work would extend the PR stack and violate D-030's "drive one home before next." Writing plan-only updates (no new GH Issues) is one of the few productive options during the wait, but every commit bloats the meta PR.
**Options considered**:
- **A. Keep current behavior** — terse no-op D-ID + run-report per tick. Maintains audit trail but piles up commits (~30 lines/tick) on the meta PR.
- **B. Skip commits on pure no-op ticks** — just `ScheduleWakeup` + end. Per-tick proof-of-life lives in the ScheduleWakeup telemetry; small loss of tick-level audit in repo.
- **C. Pause `ScheduleWakeup` after N consecutive no-ops** — require user to invoke `/heartbeat` manually when ready. Overrides D-032 (mandatory schedule); would need its own Decision.
- **D. Pivot idle ticks to `plans/*.md` decomposition** — refine the UI plan (Part 7) or Phase 3/4 plan into sharper next-tick-pickable chunks, committed to meta branch. No new GH Issues created (avoids stack extension), but real forward progress on planning.
- **E. Combo B + D** — skip commits on pure no-ops, but when plans have a fuzzy area to refine, pivot to decomposition work (which IS a commit-worthy outcome).
**Recommendation (non-binding)**: **E**. B alone loses some audit trail and leaves the loop purely reactive; D alone keeps committing every tick. Combo gives the minimum-noise + forward-motion balance.
**Hard-to-reverse?**: no

**User answer**: _(empty — awaiting)_

---

## Related
- `decision-log.md` — long-term home for answers once the user decides
- `CLAUDE.md` §4 — Ask-Question Protocol (in-session blocking; this file is the async cousin)
- `CLAUDE.md` §6 — project conventions, including when to post here vs call `AskUserQuestion`
