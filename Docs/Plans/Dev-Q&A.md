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
4. **The next heartbeat that sees the answer** (per D-20260418-154 user directive *"once a Q is answered … clean up the page and log the answer in the proper locations updating the plan or whatever is best"*):
   - Records the decision as a new `D-YYYYMMDD-###` entry in `decision-log.md` (long-term home)
   - **Removes** the question block from this file (no archive comment; full delete)
   - **Updates the relevant plan file** in `AI plans/*.md` if the answer affects plan scope
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

### Q-20260419-001 — UI-SURFACE: what does the three-tab dashboard's *end goal* look like for you?
**Posted**: 2026-04-19 by Claude Code heartbeat (5-area planning tick, Run 191)
**Blocks**: Issue #24 (shell + routing) and the ~20 UI-related Phase-3 §D subtasks.
**Context**: Part 6 UI Master Plan (`Docs/Plans/Part 6 UI Master Plan.md`) defines 22 sections of design tokens, tabs, and views. `AI plans/phase-3-plan.md` §D has 21 subtasks. Before I keep decomposing, I want your answer for prompts 4–5 of the 5-area cycle (see `AI plans/5-area-planning-framework.md`). This is area 1 of 5 in the new parallel planning framework (D-20260419-003).
**Options considered** — pick A/B/C or write your own:
- **A. "Operator console"** — tight, dense, Linear/Raycast-style. Every pixel signals state; you monitor and intervene. Priority: latency, keyboard shortcuts, command palette. (Matches Part 6 §2 "benchmark against best-in-class".)
- **B. "Living document"** — ChatGPT-style chat surface + sidebars. You talk to the lead, it shows plans/Q&A/logs inline. Priority: conversational, low-keyboard, scrollable history.
- **C. "Workbench"** — VS Code-style docked panels (Coding relay · Guidance · Log · Q&A · Task Queue · Plans) you can rearrange. Priority: power-user flexibility, many simultaneous views.
**Recommendation (non-binding)**: **A** — matches Part 6's bench-against-best-in-class aim and keeps scope finite (Phase 3 §D.1-§D.11 already assumes this shape).
**Hard-to-reverse?**: yes (Phase 3 §D.2 commits to design tokens + shadcn; redoing shape costs weeks)

**User answer**: _(empty — awaiting)_

---

### Q-20260419-002 — HEARTBEAT-CORE: what's the end-state for `heartbeat.js` as a *product* (not the /loop tick)?
**Posted**: 2026-04-19 by Claude Code heartbeat (5-area planning tick, Run 191)
**Blocks**: Issue #18 (heartbeat.js refresh), Phase-3 §C hardening, Phase-4 §A supervision wiring.
**Context**: Today `heartbeat.js` is a read-only tick logger (v1 — D-20260417-020). The plan roadmap says it eventually does full decompose → delegate → review autonomously. I want your vision for the *shape* of that runtime before I plan §C. This is area 2 of 5.
**Options considered** — pick A/B/C or mix:
- **A. "Pure daemon"** — one long-running process, PM2-supervised, ticks every N seconds. All decisions in-process. (Phase-4 §A.1 defaults to this.)
- **B. "CLI you invoke"** — `heartbeat once` / `heartbeat watch` commands, user starts/stops as needed. Same logic, different lifecycle. (Easier on no-Docker laptops; matches CLAUDE.md §8 distinction.)
- **C. "Embedded in dashboard"** — the Next.js app runs the heartbeat as a server-side job on a timer. One process. No PM2 at all.
**Recommendation (non-binding)**: **A** for Phase 4, **B** for Phase 3. Gives you a local-friendly dev loop now and a production shape later.
**Hard-to-reverse?**: yes (Phase 4 §A.1 PM2 ecosystem file + §C.2 audit trail shape depend on this)

**User answer**: _(empty — awaiting)_

---

### Q-20260419-003 — COHESION-CI: what's a "passing" merge to you — strict or pragmatic?
**Posted**: 2026-04-19 by Claude Code heartbeat (5-area planning tick, Run 191)
**Blocks**: Phase-3 §A.3 (cohesion gate in heartbeat), §A.4 (coverage floor), Phase-4 §B (CI workflow).
**Context**: The auto-merge gate today requires: tests green, no blocker review finding, no silent-failure-hunter finding, no merge conflicts, `auto-merge:ok` label (CLAUDE.md §6). Before Phase 4 locks CI, I want to know your tolerance. This is area 3 of 5.
**Options considered**:
- **A. Strict** — zero warnings allowed (lint + types + tests + 90% coverage + arch-lint + security scan). Any failure blocks merge. Merges feel slow, but main is pristine.
- **B. Pragmatic** — tests green + types green + coverage-no-regression. Lint/arch/security flagged but non-blocking. Merges fast, occasional cleanup ticks.
- **C. Tiered** — `main` strict, `beta` pragmatic. Feature branches flow to beta first, promoted to main on weekly review.
**Recommendation (non-binding)**: **B** for now (Phase 3), move to **C** in Phase 4 once `beta` branch exists.
**Hard-to-reverse?**: no (policy tweaks weekly if needed)

**User answer**: _(empty — awaiting)_

---

### Q-20260419-004 — MULTI-PROJECT: should multi-project land in Phase 3, or defer to Phase 4?
**Posted**: 2026-04-19 by Claude Code heartbeat (5-area planning tick, Run 191)
**Blocks**: Phase-3 §B.1-§B.7, any dashboard routes like `/projects/<id>/*`.
**Context**: Phase 3 plan §1.2 currently scopes multi-project in, using SQLite per project (`Q-006`=C, D-20260418-152). But §B has 7 subtasks — the heaviest workstream in Phase 3. Your time-to-value is quicker if we ship single-project solid first. This is area 4 of 5.
**Options considered**:
- **A. In Phase 3 as planned** — SQLite, 7 subtasks, dashboard `/projects/<id>/*` routes. Full isolation before Phase 4.
- **B. Single project locked for Phase 3** — one repo (this one). Multi-project moves to a dedicated Phase 3.5 *or* Phase 4 §D. Phase 3 ships UI + cohesion + heartbeat hardening only.
- **C. "Fake" multi-project** — scaffold the routes (`/projects/devlead-mcp/*`) but hard-code a single project ID. Real isolation arrives in Phase 4.
**Recommendation (non-binding)**: **C** — lets Issue #24 land the route shape without the SQLite + migration complexity. Revisit after Phase 3 §D closes.
**Hard-to-reverse?**: no (routes can absorb real isolation later)

**User answer**: _(empty — awaiting)_

---

### Q-20260419-005 — CONTEXT-IQ: should the orchestrator *block* on unknowns, or *flag + proceed with default*?
**Posted**: 2026-04-19 by Claude Code heartbeat (5-area planning tick, Run 191)
**Blocks**: Phase-3 §D.17-§D.21 (pre-delegation gate, uncertainty protocol), §G.1-§G.5 (coding-ready packets).
**Context**: main-plan's Non-Negotiable Requirements #9 "Self-Analysis" + #10 "Uncertainty" say the system must explicitly label unknown fields and refuse to proceed without evidence. But "refuse to proceed" is a strong guarantee — it can stall the heartbeat. I want to know your tolerance for stall-on-uncertainty. This is area 5 of 5.
**Options considered**:
- **A. Strict "I don't know"** — any unknown critical field ⇒ block delegation ⇒ auto-post Dev-Q&A ⇒ pick different Issue. Safety first, slower.
- **B. Pragmatic "flag and default"** — unknown field ⇒ apply lowest-risk default ⇒ flag in the decision log ⇒ proceed. Faster, user catches up via run reports.
- **C. Hybrid** — strict for *irreversible* decisions (destructive ops, external calls, schema changes); pragmatic for *reversible* ones (naming, ordering, defaults). Requires a "reversibility classifier" per field.
**Recommendation (non-binding)**: **C** — it matches CLAUDE.md §4's existing test ("two reasonable defaults AND hard to reverse"). Lets the heartbeat keep moving on low-stakes choices while genuinely stopping on high-stakes ones.
**Hard-to-reverse?**: yes (policy baked into §G.5 "Missing-info guard" and §D.21 uncertainty engine)

**User answer**: _(empty — awaiting)_

---

## Related
- `decision-log.md` — long-term home for answers once the user decides
- `AI plans/5-area-planning-framework.md` — the parallel planning framework these Qs feed (D-20260419-003)
- `CLAUDE.md` §4 — Ask-Question Protocol (in-session blocking; this file is the async cousin)
- `CLAUDE.md` §6 — project conventions, including when to post here vs call `AskUserQuestion`
