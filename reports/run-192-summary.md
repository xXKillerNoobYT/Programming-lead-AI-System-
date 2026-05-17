# Run 192 — process 5 Q answers + absorb into phase-3-plan

**Date**: 2026-04-19
**Branch**: `issue-24/shell-routing` (continuing from Run 191)
**Decision IDs**: D-20260419-005, -006, -007, -008, -009

## Overview

User answered **all 5** of the Run-191 planning Qs within ~4 minutes of posting them. This tick processed each answer per the Dev-Q&A protocol (record D-ID, remove Q block, update plan), absorbed the consequences into `AI plans/phase-3-plan.md`, and formalized a new CLAUDE.md §4b rule: every new Dev-Q&A posting now also files a companion GH Issue with `type:question` + `status:needs-user`.

## Outcome

**5 design decisions locked** (D-005..D-009):

| D-ID | Q | User answer | Plan impact |
|---|---|---|---|
| D-005 | Q-001 UI-SURFACE | A+B hybrid (Operator console + Conversational panel) | `phase-3-plan.md` §1.3a + §D.1 retuned to two-pane |
| D-006 | Q-002 HEARTBEAT-CORE | Required A/B per recommendation; wanted C-lite (status surface in dashboard) | New §E.6 heartbeat status panel; §C unchanged |
| D-007 | Q-003 COHESION-CI | B for Phase 3 (tests+types+coverage blocking; lint/arch/deps flagged), C-tiered for Phase 4 | §A gains Phase-3 threshold preamble |
| D-008 | Q-004 MULTI-PROJECT | C (fake multi-project — scaffold routes only) | §B reduced to §B.1'; §B.1-§B.7 moved to Phase 4 |
| D-009 | Q-005 CONTEXT-IQ | C (reversibility classifier: strict for irreversible, pragmatic for reversible) | §G.5 + §D.21 consume a `classify(field)` oracle |

**Governance updates**:
- CLAUDE.md §4b: every Dev-Q&A posting now MUST file a companion GH Issue (`type:question` + `status:needs-user`). Read/clean protocol covers both surfaces. Per user directive 2026-04-19.

**Dev-Q&A.md**: all 5 Qs removed; file now lists *"No open questions"*.

## Commits

- `204943c` feat(plans): resolve 5 design Qs + absorb answers

## Changes table

| File | Action | Why |
|---|---|---|
| `decision-log.md` | Append D-005..D-009 | Audit trail |
| `Docs/Plans/Dev-Q&A.md` | Remove all 5 Q blocks, update Related links | Protocol cleanup |
| `AI plans/phase-3-plan.md` | §1.3, §1.3a (new), §A preamble (new), §B (reduced), §D.1 (retuned), §E.6 (new) | Absorb 5 answers |
| `CLAUDE.md` | §4b read/write protocol now covers companion GH Issues | User directive Run 192 |

## Tests with output

*(docs-only tick — no code changes)*

## Next task recommendation

Issue #24 (shell + routing) is now fully unblocked with concrete layout decision (two-pane hybrid) and scope (hard-coded `devlead-mcp` project id). Next tick should:

1. **Decompose Issue #24 into 3-4 sub-issues** per CLAUDE.md §6 multi-layer rule:
   - #24.a: Install Zustand + scaffold routes `/projects/[projectId]/[tab]/page.tsx` (hard-coded `devlead-mcp`)
   - #24.b: Two-pane shell: left pane (operator) + right pane (conversational placeholder)
   - #24.c: Top bar + left rail (stub buttons)
   - #24.d: Zustand WebSocket store (`dashboard/lib/ws-store.ts`) + mock in-process emitter
2. Pick leaf #24.a, implement via TDD (failing route test → minimal page component → pass).
3. Keep PR #99 (docs) open awaiting user review; it's orthogonal to the code work.

Issue #100 (branch doc-sync) is next after #99 merges.

## Open concerns

- **Main still 7 months behind** most feature work due to the 17-branch drift. PR #99 merge will be the first substantial plan-doc update to main since April 2026. Issue #100 tracks the follow-on sync.
- **No companion GH Issues exist for Q-20260419-001..005** because they were all answered before the new CLAUDE.md §4b rule was codified. Not backfilling — Qs are resolved. Rule applies to future postings.
- **User's recommendation for Q-002 has a `want` separate from `required`**: I encoded the "want" (status surface in dashboard) as §E.6 rather than conflating with the required (CLI-invoked heartbeat in Phase 3). If the user intended the wider embed-in-Next.js reading, Q-20260419-002 may need a follow-up Q in the next cycle.
