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

*No open questions.*

---

## Related
- `decision-log.md` — long-term home for answers once the user decides
- `CLAUDE.md` §4 — Ask-Question Protocol (in-session blocking; this file is the async cousin)
- `CLAUDE.md` §6 — project conventions, including when to post here vs call `AskUserQuestion`
