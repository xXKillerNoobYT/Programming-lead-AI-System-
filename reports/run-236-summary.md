# Run 236 — Superpowers research sprint (5 heartbeats in one session)

**Date**: 2026-04-20 (condensed in-session sprint, not cron-fired)
**Branch**: `docs/part-8-intelligent-routing` (off `origin/main`)
**Decision**: D-20260420-007 (to be appended)
**Tick type**: research + synthesis + docs — no code change

---

## Why this sprint

User directive 2026-04-20:
> "And you got yours anthrax superpowers Feel free to use them look up the documentation and see where each one But you got the goal you got the end target [courses / skills / build-with-claude / blog URLs] ... fine tune how your coding and making sure you're using the right superpowers the right tools and the right other stuff at the right time. The other reason is to get it built into the program so that it triggers stuff intelligently and used smartly."

+ "once those 5 heartbeats are done go back to 3 hours a hartbeat" (implying: dedicate ~5 ticks to the work, then revert).

Interpreted as: 5-phase research + synthesis sprint, done back-to-back in one session to preserve the 3h cron for post-sprint backbone work. Credit-conservative: 1 session's wake overhead instead of 5 cron-fires.

---

## The 5 phases + deliverables

| H# | Phase | Output |
|----|-------|--------|
| H1 | **Research** — WebFetch the 4 Anthropic URLs | Raw survey of 18+ named capabilities + 16 courses + 12 recent blog posts |
| H2 | **Self-workflow synthesis** — map each capability to a heartbeat station | NEW `memory/feedback_superpower_triggers.md` (7-station mapping table with triggers + anti-patterns) |
| H3 | **Product-integration synthesis** — how DevLead MCP should intelligently route Lead calls | NEW `Docs/Plans/Part 8 Intelligent Capability Triggering.md` (8 sections: decision surface + router spec + rule engine + observability + eval framework) |
| H4 | **Atomic implementation Issues** | Filed **#173** (JSON-Schema return contracts), **#174** (Prompt Caching wrapper), **#175** (Router v1 deterministic), **#176** (Evaluations framework) — all `priority:medium` `phase:4` |
| H5 | **This commit + merge + report** | PR for the 2 new docs + this summary; decision-log append; schedule next wake at natural 3h cron (no change needed — cron `5c736eb3` already armed) |

---

## H1 — Research findings highlights

**From `claude.com/resources/courses` (16 courses total)**:
- 4 directly relevant: Claude Code 101, Claude Code in Action, Introduction to Subagents, Introduction to Agent Skills.
- 2 MCP deep-dives: Intro + Advanced.
- 1 comprehensive API reference: "Building with the Claude API" (8.1 hrs, 84 lectures).
- **Notable curriculum gaps** (my innovation surface): autonomous loops / heartbeats, error-handling in autonomous systems, evaluation frameworks. DevLead MCP is pioneering all three.

**From `claude.com/skills`**:
- Skills stack automatically — no manual selection. Claude picks from available set.
- `SKILL.md`-folder model.
- Built-in workflows (Excel, PowerPoint, data-viz, format conversion) + pre-built domain skills (finance DCF / comparables).

**From `anthropic.com/learn/build-with-claude` (18 named capabilities)**:
- Messages / Tool Use / Extended Thinking / Computer Use / Vision / Prompt Caching / Message Batches / Embeddings / Files / PDF / JSON Mode / RAG / Skills / Subagents / MCP / Claude Code / Prompt Engineering / Evaluations.
- Each with concrete decision criteria documented at the URL.

**From `claude.com/blog` (April 2026)**:
- "Multi-agent coordination patterns: Five approaches" — directly informs Part 8 §2.3.
- "The advisor strategy" — matches our existing 3-stage reviewer pattern (validated).
- "Introducing routines in Claude Code" — worth evaluating in a future tick.
- "Claude Managed Agents: get to production 10x faster" — Phase 4/5 product spec.
- "Redesigning Claude Code on desktop for parallel agents" — parallel subagent dispatch idiom.

---

## H2 deliverable — self-workflow memory

New file `memory/feedback_superpower_triggers.md` (10-section). Each row specifies a Claude capability (Prompt Caching / Extended Thinking / Subagents / Skills / MCP / Evaluations / Routines / Managed Agents / Batches / JSON Mode / advisor-strategy / parallel-Agent-calls), which heartbeat station triggers it, and what the anti-pattern is.

**Stations mapped**: Orient (1), Pick (2), Consult decisions (3), Decompose+Execute (4 — heaviest section, covers subagent-driven-development + Extended Thinking gradation + Skills + Routines), Verify (5 — includes adding Evaluations as a station-5 capability we haven't adopted yet), Record (6), Commit+Merge (7), Cross-station (handles Message Batches + JSON Mode + Managed Agents + MCP + parallel subagents).

**Novel contributions** DevLead MCP is pioneering beyond Anthropic's curriculum:
1. Autonomous heartbeat loops.
2. Priority-first oldest-within-band pick order.
3. Close-the-review-loop pattern (10 applications this session).
4. Dev-Q&A async question board.
5. Decision-log as first-class artifact.
6. `!== undefined` dual-mode discriminator for React controlled props (4 components now).
7. Subagent-driven-development 3-stage pipeline (predates Anthropic's "advisor strategy" blog post; validated as a case study).

Memory added to `MEMORY.md` index.

---

## H3 deliverable — product spec

New file `Docs/Plans/Part 8 Intelligent Capability Triggering.md` (8 sections). The product-runtime equivalent of H2's memory — specifies how the Lead Agent inside `heartbeat.js` picks capabilities per call.

**Part 8 headline concept**: every Lead API call passes through a **Router** that takes a `RouterInput` (taskType + complexity + stakes + context size + credit state + user-live flag) and returns a `RouterDecision` (model + thinking level + cache strategy + delivery mode + output format + delegation target + allowed skills).

**9 v1 deterministic rules** in priority order — covers credit-hard-limit reroute, architectural-decomposition-with-Grok-high-thinking, trivial-impl-to-local-7b, review-via-subagent-pipeline, triage-as-async-batch, docs-as-local-32b-no-thinking, urgent-production-bug-always-high-thinking, + default fallthrough.

**Cross-reference table** to Part 1 / Part 6 / Part 7 / CLAUDE.md shows how Part 8 integrates without modifying other plans.

**3 open questions** for the designer in §7 (router as MCP server vs in-process; include userLive in input vector; which 9 rules are non-negotiable).

---

## H4 deliverable — 4 atomic Issues

| Issue | Title | Priority | Phase |
|-------|-------|----------|-------|
| **#173** | JSON-Schema return contracts on subagent/tool-call responses | medium | 4 |
| **#174** | Prompt Caching wrapper around Lead's Anthropic API calls | medium | 4 |
| **#175** | Router v1 deterministic rule engine + evaluations | medium | 4 |
| **#176** | Evaluations framework scaffold + triage fixture suite | medium | 4 |

All at `priority:medium` because they're Phase-4 work (ahead of current Phase 3 backbone). Queue refreshed; no dash on the Phase 3 §D.4 Guidance-tab work.

---

## Impact on Claude Code's own workflow (immediate)

Already applying H2 memory in THIS tick:
- **`ToolSearch` for WebFetch** — loaded on-demand rather than pre-loading (matches the "load deferred tools only when needed" idiom).
- **Parallel Agent calls** — 4 WebFetches dispatched as one tool call per Anthropic blog guidance.
- **Structured outputs** — subagent prompts in this session increasingly specify the exact verdict-string format + output sections, approaching JSON-Schema rigor.
- **Advisor strategy** — acknowledged as already-in-use via 3-stage review pipeline.

Next-tick expected changes (from H2 memory rows not yet applied):
- **Evaluations** — Issue #176 adds this as a product-side feature. For Claude Code's OWN workflow, eval suites for pick order + triage accuracy are a future memory update.
- **Routines** — evaluate when next a repetitive workflow pattern emerges (the brain-sync+PR+merge+cleanup sequence is a candidate).

---

## Next natural work after this PR lands

Cron `5c736eb3` still armed at `17 */3 * * *`. Next wake = ~3h from this merge. Natural pick:

- `priority:urgent` — #158 (compliance confirmed; closes 2026-04-27), #161 (collision protocol — bumped AC list last tick, ready for implementation).
- `priority:high` — #171 (Shiki multi-line token bug — from Run 235 code-quality reviewer).
- Phase 3 §D.4 (Guidance tab skeleton per Part 6 §7.2) — next backbone area after §D.3 closed this session.

Recommended: **#171 Shiki multi-line token fix** — it's a USER-VISIBLE bug (any TS/Python diff with template literal or block comment renders wrong), `priority:high`, `type:bug`, and closes the only known active bug from the Coding tab. Should go before §D.4.

## Gate status — unchanged

No code changes this sprint (docs + memory only). Current backbone state:
- Dashboard tests: 178/178 (from Run 235).
- Backbone: unchanged.
- Decision-log: 80 entries (D-006 appended in this run's commit).
- Open Issues: 37 (priorities: 2 urgent / 1 high / 13 medium / 15 low / 6 open epics — will settle after this tick's Issues are triaged).

---

## Pattern milestones

- **First research-sprint tick** — 5 phases executed back-to-back in one session to preserve cron capacity.
- **First Part N addition since Part 7** (Linear Parity added 2026-04-20 earlier today). Parts now 1-8.
- **First explicit adoption of multi-agent coordination patterns** from Anthropic's April blog (5 patterns catalogued in Part 8 §2.3).
- **First published self-improvement via memory + plans in same tick** — Claude Code's workflow improvements (H2) parallel DevLead MCP's product spec (H3).
