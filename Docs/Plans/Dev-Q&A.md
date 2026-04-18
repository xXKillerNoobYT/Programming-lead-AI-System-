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

### Q-20260418-001 — Two "Part 6" files — naming decision?
**Posted**: 2026-04-18 by Claude Code Run 27
**Blocks**: None (both files coexist functionally), but cosmetic/semantic choice affects future plan citations.
**Context**: During Issue #16 stash triage, Claude Code rescued a user-authored 290-line locked-intent document titled "Plans / LLM_Usage_Local_First_Strategy.md" (Document Version 1.1, April 17, 2026) that had been untracked in `Docs/User Plans/Part 6.md` and stashed since the early-session WIP. It was committed as `Docs/Plans/Part 6 LLM Usage Strategy.md`. The existing committed `Docs/Plans/Part 6 UI Master Plan.md` (D-20260417-009, from Run 11) is a distinct document authored by Claude Code per your directive. Both files legitimately carry the "Part 6" prefix.
**Options considered**:
- A. Keep both as "Part 6 <suffix>.md" — works, but two files share the numbering slot. Filesystem + references already distinguish them.
- B. Rename Claude Code's UI Master Plan to "Part 7 UI Master Plan.md" — restores a clean single-Part-6 slot for your original LLM strategy. Updates needed in decision-log (D-009 references) and any README/CLAUDE links.
- C. Rename the rescued file to something that removes the "Part 6" conflict (e.g., "LLM Usage Strategy.md" without a Part number) — disrespects original user-authored numbering.
**Recommendation (non-binding)**: **B** — rename Claude's UI plan to Part 7. Your original numbering predates mine, and Part 6 as "LLM Usage Strategy" reflects your design evolution across Parts 1–6. The UI plan came later and fits Part 7 naturally.
**Hard-to-reverse?**: no (simple git mv + reference updates)

**User answer**: _(empty — awaiting)_

---

## Related
- `decision-log.md` — long-term home for answers once the user decides
- `CLAUDE.md` §4 — Ask-Question Protocol (in-session blocking; this file is the async cousin)
- `CLAUDE.md` §6 — project conventions, including when to post here vs call `AskUserQuestion`
