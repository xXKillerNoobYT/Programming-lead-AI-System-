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
4. **The next heartbeat that sees the answer** (per D-20260418-154 user directive *"once a Q is answered … clean up the page and log the answer in the proper locations updating the plan or whatever is best"*):
   - Records the decision as a new `D-YYYYMMDD-###` entry in `decision-log.md` (long-term home)
   - **Removes** the question block from this file (no archive comment; full delete)
   - **Updates the relevant plan file** in `plans/*.md` if the answer affects plan scope (e.g., Q-006 answer "SQLite" updates `plans/phase-3-plan.md` §1.3)
   - Strips `status:needs-user` + closes the cross-linked GH Issue per D-20260418-033/039 protocol
   - Acts on the answer this heartbeat if it unblocks the current pick; else files/updates the relevant Issue
5. **Cleanup triggers** — remove an entry from this file when any of these happen:
   - a. User has answered it (record in `decision-log.md` + update plan if applicable, first)
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

*No open questions.*

---

## Related
- `decision-log.md` — long-term home for answers once the user decides
- `CLAUDE.md` §4 — Ask-Question Protocol (in-session blocking; this file is the async cousin)
- `CLAUDE.md` §6 — project conventions, including when to post here vs call `AskUserQuestion`
