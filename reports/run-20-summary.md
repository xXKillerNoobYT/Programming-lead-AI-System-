# Run 20 Summary — Async Dev-Q&A Channel Established (D-20260417-019)

## Overview
**Task**: User directive — *"make sure systome puts design questions in this for the project i'll answer them every now and then and that will unblock tasks. Clean it out of Q&A for tasks that have been completed already. The answer can be stored long term in the decision-log.md."*
**Decision ID**: D-20260417-019
**Status**: COMPLETE
**Trigger**: User message this session; referenced the empty file `Docs/Plans/Dev-Q&A.md` that they created to host the channel.
**Branch**: `run-17/phase-3-plan`.

## Outcome
The heartbeat system now has a **file-based asynchronous design-question channel** at [`Docs/Plans/Dev-Q&A.md`](../Docs/Plans/Dev-Q&A.md). `AskUserQuestion` (synchronous, in-session) is the only tool that existed for user queries before this, but it's useless for a 24/7 heartbeat on cron. The new channel lets any heartbeat (Claude Code or, eventually, `heartbeat.js`) post a design question and keep moving; the user answers at their own pace; the next heartbeat that reads the file transcribes the answer to `decision-log.md` and deletes the question block.

## Changes
| File | Change |
|---|---|
| [`Docs/Plans/Dev-Q&A.md`](../Docs/Plans/Dev-Q&A.md) | **Populated** from empty. Header explains purpose; "How This Works" section defines the 5-step post→answer→cleanup lifecycle; "Entry Format" defines the `Q-YYYYMMDD-###` block schema; "Open Questions" starts empty; "Related" links back to decision-log, CLAUDE.md §4, and §6. |
| `CLAUDE.md` §2 | New row `1a` for `Dev-Q&A.md` as the one writable file under `Docs/Plans/`. Row 1 scope narrowed to *except Dev-Q&A.md*. Row 5 note added: record Q&A answers to `decision-log.md` before removing from Q&A. |
| `CLAUDE.md` §3 Step 1 | Orient checklist adds *"Read Dev-Q&A.md for new user answers"*. Also bumped `gh issue list --limit 20` → `--limit 30` to prevent the kind of silent miss that bit Run 16's review (Issues #19/#20/#21 existed pre-session but didn't show up). |
| `CLAUDE.md` §4 | Split into §4a (synchronous `AskUserQuestion`, in-session only) and §4b (asynchronous `Dev-Q&A.md`, default for /loop and cron). §4b has full **Write protocol** (when posting), **Read/clean protocol** (every Step 1 orient), and the "applies to heartbeat.js too" note. Quotes the user directive verbatim for future audit. |
| `CLAUDE.md` §5 | Guardrail *"Modifying `Docs/Plans/*`"* gets an explicit exception for `Dev-Q&A.md`. |
| `CLAUDE.md` §6 | New short-form bullet **Async design questions via Dev-Q&A.md** with Q-ID format, two cleanup triggers, both-sides applicability. |
| `decision-log.md` | D-20260417-019 entry. |
| `reports/run-20-summary.md` | This file. |

## What I intentionally did NOT do
- **Did not seed the Open Questions section.** The right time to post is when a question actually arises. Pre-seeding with speculative questions would make the file noisy. Current open concerns (MemPalace MCP load failure, parallel-session rebase protocol, unmerged PRs) are either investigable (not design questions) or operational (not blocking).
- **Did not touch `heartbeat.js`** to give it the ability to post Q&A entries. That's a later backbone step — naturally a child of #21 (MCP wiring) or a new Phase 3 §C heartbeat-hardening Issue. Rule-first, implementation-later.
- **Did not backfill questions** from old run-report "open concerns" sections. Those concerns are tracking items, not design decisions. Different semantics.

## Test Results
```
$ npm test (repo root)
ℹ tests 24
ℹ pass 24
ℹ fail 0
```
Doc-only edits — pure insurance check.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260417-019 | Establish `Docs/Plans/Dev-Q&A.md` as the async design-question channel. Carve it as the only writable file under `Docs/Plans/`. Update CLAUDE.md §2/§3/§4/§5/§6 with matching rules and protocols. Codify two cleanup triggers: answered → record D-ID + remove; task-moot → remove + note in run report. Applies to both Claude Code and `heartbeat.js`. | User directive verbatim; `AskUserQuestion` doesn't work for cron heartbeats because no live user is present — file-based is the only way. Scoping to the one file preserves the locked-intent integrity of the rest of `Docs/Plans/`. Two cleanup triggers prevent the file from silently becoming a graveyard of stale questions. Both-sides applicability matches the user's prior cross-cutting directive for Claude Code + the product runtime. | Put the Q&A section inside `memory.md` or `decision-log.md` (wrong semantics); block the heartbeat on any open question (defeats async purpose); apply only to Claude Code and not the product (user explicitly said both sides) |

## Metrics
- **Issues closed**: 0 (this run is a workflow-rule amendment, not Issue-driven)
- **Issues opened**: 0
- **Q&A questions posted**: 0 (empty start; no open question warranted posting this run)
- **Open backlog after this run**: unchanged — 10 open (#8, #12, #13, #16, #17, #19 epic, #21, #22, #23, #24); ≥3 per Polsia Rule 4 ✓
- **Commits this run**: 1 (upcoming)

## Gaps Captured (Polsia Rule 2)
- **`heartbeat.js` can't post to Dev-Q&A.md yet.** Current tick loop is read-only. Worth a future Issue: *"Teach heartbeat.js to post Q entries when a decomposition/delegation step hits a design decision."* Likely a child of #21 (MCP wiring) once the product can actually make design decisions — today it just reads state.
- **No Q-ID registry yet.** The `Q-YYYYMMDD-###` format is documented but there's no auto-increment helper. Future heartbeats will pick the next `###` manually by reading the file. Not a bug, just a note.
- **Orient `gh issue list --limit 30` change** may expose scenarios where the pre-`--limit 30` oldest-first ranking was off. Worth a spot-check in the next heartbeat.

## Next Task
Under the updated rule set:
1. No Issue currently `status:in-progress`.
2. **Leaf check**: no open Issue has open GH sub-issues yet (the sub-issue feature is rule-codified but not applied retroactively — per Run 19 decision). So leaf-first doesn't force a pick.
3. **Oldest-first on backlog** (softened): oldest open is **#8** (phase-4-plan writing), then #12, #13, #16, #17, #21, #22, #23, #24.
4. **Backbone override (D-014)**: #22/#23/#24 are the first wave of Phase 3 implementation and directly continue core-backbone momentum. Under D-014's backbone-override clause, these beat pure housekeeping (#12, #13, #16, #17).
5. **Recommended pick**: **#22** (Phase 3 §A.1 `check:*` scripts — smallest, most atomic of the three wave-1 Issues).
6. Strict oldest-first alternative: **#8** (phase-4-plan).

## Open Concerns (carried forward)
- Two concurrent Claude Code sessions observed this session — decision-log absorbed both streams. Still no rebase-first protocol codified; may want to file an Issue if it recurs.
- MemPalace MCP still not loaded.
- 3+ open PRs unmerged.
- Branch `run-17/phase-3-plan` is now accumulating Runs 17–20 without merging to `main`.

## Heartbeat cadence
Self-paced. Next heartbeat to pick from Phase 3 wave 1 (recommended: #22) unless user redirects.
