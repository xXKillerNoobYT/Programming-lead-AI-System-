---
name: post-dev-qa
description: Post a new design question to Docs/Plans/Dev-Q&A.md when a design decision blocks work but the heartbeat can keep moving on other Issues. Use whenever a heartbeat hits a blocking design decision that cannot be safely auto-resolved and no live user session is active. Writes a correctly-formatted Q-YYYYMMDD-### block into the "Open Questions" section and updates the run report.
---

# post-dev-qa

Post an async design question to `Docs/Plans/Dev-Q&A.md` per CLAUDE.md §4b.

## When to use

Use when ALL of the following are true:
- A design decision is blocking at least one Issue
- The answer is not in `Docs/Plans/Part *.md`, `decision-log.md`, `architecture.md`, `memory.md`, or the code
- Two or more reasonable defaults exist AND the choice is hard to reverse
- No live user session is available right now (if one is, prefer `AskUserQuestion` per CLAUDE.md §4a)

Do NOT use for:
- Reversible choices — pick the lowest-risk default and log a D-ID instead
- Questions the user has already answered — check `decision-log.md` first
- Operational/tracking items — those belong in run-report "Open Concerns", not Q&A

## How to use

1. **Pick the next Q-ID.** Read `Docs/Plans/Dev-Q&A.md`. Scan all existing `Q-YYYYMMDD-###` headers; pick the next free `###` for today's date. Reset to 001 each new day. Q-IDs are independent of D-IDs — don't try to align.

2. **Write the entry** at the bottom of the "Open Questions" section, using this exact template:

   ```markdown
   ### Q-YYYYMMDD-### — Short Title (≤70 chars)
   **Posted**: YYYY-MM-DD by [Claude Code Run N | heartbeat.js tick TT]
   **Blocks**: Issue #XX[, Issue #YY, …]
   **Context**: 1–3 sentences. Why did this come up? What does the decision gate?
   **Options considered**:
   - A. Option A — one-liner
   - B. Option B — one-liner
   - C. Option C — one-liner (if applicable)
   **Recommendation (non-binding)**: Which option I'd pick if I had to decide alone, and why in one sentence.
   **Hard-to-reverse?**: yes / no

   **User answer**: _(empty — awaiting)_
   ```

3. **If "Open Questions" still says `_(none at this time)_`**, replace that placeholder — don't leave it above the new entry.

4. **Do not block the heartbeat.** Post the question, note it in the current run report's "Gaps Captured" section, and pick the next unblocked Issue per CLAUDE.md §3 Step 2. A running heartbeat that cannot proceed on ANY Issue because ALL of them are blocked on open Q&A entries is the only case in which you may end the tick early — include the full Q&A list in the run report and stop.

5. **Do NOT touch any other question's block.** Only append. Editing someone else's question is an error.

## Cleanup (the other half — every Step 1 orient)

This skill only posts. Cleanup happens automatically during Step 1 orient per CLAUDE.md §4b read/clean protocol:

- For each question with a non-empty **User answer** → record a new `D-YYYYMMDD-###` entry in `decision-log.md` citing the Q-ID, then remove the question block.
- For each question whose blocking task got completed a different way or became moot → remove the block, note the removal in the current run report.

## Example

Suppose the heartbeat is working Issue #45 (implement caching layer) and discovers that the choice between Redis, in-process LRU, and file-system cache is load-bearing but no decision exists. Post:

```markdown
### Q-20260417-001 — Caching layer: Redis vs in-process LRU vs fs
**Posted**: 2026-04-17 by Claude Code Run 24
**Blocks**: Issue #45
**Context**: #45 adds a response cache in front of the MemPalace read path. Expected hit rate ~70%, tick cadence 30-90s. Choice of backend dictates deployment complexity (Redis = new process) and the memory/durability trade-off.
**Options considered**:
- A. Redis via a 7th MCP server — best durability + cross-process sharing, adds a runtime dep and a port conflict risk
- B. In-process LRU (e.g., `lru-cache`) — simplest, zero ops, lost on restart
- C. Filesystem cache under `.cache/` — durable, cross-process, needs manual eviction
**Recommendation (non-binding)**: B (LRU) — matches local-only preference and 30-90s tick cadence doesn't need durability
**Hard-to-reverse?**: no — can switch by changing the cache module

**User answer**: _(empty — awaiting)_
```
