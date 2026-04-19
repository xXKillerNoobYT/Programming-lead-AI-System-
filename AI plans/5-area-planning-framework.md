# 5-Area Parallel Planning Framework

**Status**: Draft v1.0 · Owner: Claude Code · Decision ID: D-20260419-003 · Date: 2026-04-19
**Directive source**: user 2026-04-18: *"focase on an aria or 5 in the plaing at the same time that way we can loop 'Plan <===> ask' in the difrint aria and get things planed out in the futer … by tasks i mean Featers/uppgrades/Desings/ How this works/ overall gole?/ endgole for ____?"*

## Why 5 areas

Phase 3's workstream clusters (§A–§G) cover seven specialties but overlap: A+G both touch checks; D splits across 21 subtasks; E feeds D. Condensing to **5 coherent themes** makes the `Plan ↔ Ask` loop manageable:

- Any more → attention dilutes, each area stalls for questions
- Any fewer → lose breadth, backlog refill shallow

The 5 themes mirror the subsystems a **non-coder designer** actually thinks about: *what I see · what it does · how safe it is · how it scales · how smart it is*.

## The 5 areas

| # | Theme | Short name | Plan → Ask loop Q-ID (this cycle) | AI plan files |
|---|---|---|---|---|
| 1 | What I see — UI Shell, tabs, visualizations, in-app Q&A/task/plan surfaces | **UI-SURFACE** | `Q-20260419-001` | `AI plans/phase-3-plan.md` §D + §E |
| 2 | What it does — Heartbeat runtime (`heartbeat.js` evolution from read-only tick → full decompose-delegate-review) | **HEARTBEAT-CORE** | `Q-20260419-002` | `AI plans/phase-3-plan.md` §C, `AI plans/phase-4-plan.md` §A |
| 3 | How safe it is — Cohesion checks, auto-revert, CI gating, guardrails, audit trail | **COHESION-CI** | `Q-20260419-003` | `AI plans/phase-3-plan.md` §A + §C.1-§C.5, `AI plans/phase-4-plan.md` §B |
| 4 | How it scales — Multi-project isolation, SQLite state, per-project dashboard routes, concurrency cap | **MULTI-PROJECT** | `Q-20260419-004` | `AI plans/phase-3-plan.md` §B, `AI plans/phase-4-plan.md` §C |
| 5 | How smart it is — Context Intelligence, Q&A flow, self-analysis, uncertainty protocol, coding-ready packets | **CONTEXT-IQ** | `Q-20260419-005` | `AI plans/phase-3-plan.md` §D.17–§D.21 + §G |

## The per-area Plan ↔ Ask cycle

Each area cycles through six prompts (user's own list, normalized):

1. **Feature / Upgrade** — what concrete thing changes
2. **Design** — what it looks like / how it's wired
3. **How it works** — mechanism / data flow
4. **Overall goal** — why this area exists
5. **End goal** — what "done" looks like for this area
6. **Next 3 tasks** — what lands in the backlog next

The heartbeat iterates: pick an area → draft answers to prompts 1–3 using existing docs/code → ask the user prompts 4–5 via Dev-Q&A → decompose prompt 6 into GH Issues → rotate to next area.

### Which area next?

Round-robin by default: area 1 → 2 → 3 → 4 → 5 → 1. Override when (a) user explicitly redirects, (b) an unblocked area has ≥3 ready Issues already (skip — no refill needed), (c) a blocker for core backbone pops (jump to HEARTBEAT-CORE regardless of position).

### How many Qs open at once?

Cap at **5 open Qs** in Dev-Q&A (one per area). When one gets answered, advance that area and post the next Q for it. Keeps the user's answer-load predictable: ≤5 at any moment.

## Current cycle snapshot (2026-04-19 tick)

Areas 1–5 each get one Q (`Q-20260419-001` through `Q-20260419-005`) posted in this tick. Heartbeat continues on Issue #24 (UI-SURFACE leaf) while user answers asynchronously.

When Q-001 (UI-SURFACE) is answered → decompose Issue #24 children per answer, advance UI-SURFACE to prompt-2-3 area.
When Q-002 (HEARTBEAT-CORE) is answered → open Issues for heartbeat.js v2 decomposition.
Etc.

## Provenance

- **Decision ID**: D-20260419-003.
- **Directive**: user message 2026-04-18 (quoted top of file).
- **Anchors**: `AI plans/main-plan.md` Roadmap + Non-Negotiable Product Visibility; `AI plans/phase-3-plan.md` §A–§G; `Docs/Plans/Part 6 UI Master Plan.md` §20; `CLAUDE.md` §4b Ask-Question Protocol.
- **Update rule**: same as `phase-3-plan.md` — refine before producing more decomposed Issues in any area.
