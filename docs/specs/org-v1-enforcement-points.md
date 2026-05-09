# Org v1 Phase 1 — Authority Boundary Enforcement Points

Source of authority: WEI-572 → WEI-576 (org-v1 proposal accepted) → WEI-715 (Phase 1 activation).
Charters: WEI-576 comment `9e1d0941`. Org map + handoff diagram: WEI-576 comment `cb728a63` §2–§3.

This doc is the **mechanical enforcement contract** for the three gates standing up in Phase 1. It is referenced by the R2/R4/R6 agent profiles in `.paperclip/agents/`.

## The three independent gates

A code-bearing change reaches production only by clearing all three, **in this order, but each is independent — none of the three can override another**. CTO is the only role with cross-gate tie-break authority, exercised via a decision-log entry.

| # | Gate | Owner | Token in PR/commit | Hold semantics |
|---|------|-------|-------------------|----------------|
| 1 | **Spec gate** | R2 Tech Lead — Execution | `spec-gate:approved D-YYYYMMDD-### spec=<link>` (in PR review body) | R2 may block; cleared by R2 or CTO |
| 2 | **QA gate** | R4 QA — Break-Testing | `qa-gate:approved scenarios=<N>` (in PR review body) | R4 may block via `qa:hold` label; cleared by R4 or CTO |
| 3 | **Release gate** | R6 DevOps / Release | `release-gate:cut tag=<vX.Y.Z> ci=<run-url>` (in release commit/tag message) | R6 may hold any tag; cleared by R6 or CTO |

### Why three independent gates (not a chain)

- **Spec gate** asks "is this the right change?" — R3 authored the spec, R2 mechanically checks the PR matches.
- **QA gate** asks "does it break under hostile use?" — independent of spec compliance; a spec-correct PR can still ship a vulnerability.
- **Release gate** asks "is the surrounding system healthy enough to deploy?" — independent of the PR itself; CI green, branch hygiene, instruction-file canonical sync (CLAUDE.md §6).

Subordinating any of these to another collapses the org back into the single-thread risk Phase 1 exists to remove.

## Mechanical enforcement (Phase 1 — before WEI-611 spec-gate harness lands)

The Reviewer specialist (existing, `.paperclip/agents/reviewer/`) inspects the **token text** of each gate when it reviews a PR:

1. If the PR body lacks `spec-gate:approved …` from R2 → Reviewer leaves a `request-changes` review citing this doc.
2. If the PR body lacks `qa-gate:approved …` from R4 → Reviewer leaves a `request-changes` review.
3. If a release commit lacks `release-gate:cut …` from R6 → R6's own release-runbook script (R6-001 first queued work) refuses to push the tag.

When WEI-611's spec-gate bot lands, items 1–2 become a CI check rather than human-read tokens. The token format is forward-compatible with that bot's parser.

## Cross-gate escalation

Conflicts between gate-holders go to the CTO. The CTO writes a decision-log entry (`D-YYYYMMDD-###`) with:
- Which gates conflicted.
- Which gate prevails for this case.
- Which precedent (if any) is established.

Repeated overrides of the same gate are themselves a Sev2 process bug — the offended gate-holder files an Issue against the org structure.

## What is **not** enforced in Phase 1

- **R5 Security/Reliability gate** — not yet activated (Founding-Steward gated decision DP-2 per WEI-576 §6). Until R5 lands, R6 forwards security-flavored CI failures to CTO; no separate security gate.
- **R7/R8 ownership rules** — Phase 1 does not yet enforce file-area ownership; coder-backend / coder-frontend specialists currently both reach the spec gate as ICs.
- **Token-budget weekly cap** — referenced in WEI-576 §8 as a CEO-input blocker; tracked separately, not gated here.

## How this doc evolves

- Every Phase 1 gate change → PR with conventional commit `docs(org-v1): …` and a `D-` ID.
- When R5 activates → add a Section "Gate 4: Security gate" with the same shape as 1–3.
- When the spec-gate bot from WEI-611 ships → mark items 1–2 of "Mechanical enforcement" as bot-checked.

## Provenance

- WEI-572 — parent ("the CTO needs a proper team").
- WEI-576 — org-v1 proposal + acceptance interaction `579d4c3d`.
- WEI-715 — Phase 1 activation (this doc fulfills AC #2).
- Authored: 2026-05-09 by CTO under Paperclip run `d2937953`.
