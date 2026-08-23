# Org v1 Phase 1 — Authority Boundary Enforcement Points

Source of authority: WEI-572 → WEI-576 (org-v1 proposal accepted) → WEI-715 (Phase 1 activation).
Charters: WEI-576 comment `9e1d0941`. Org map + handoff diagram: WEI-576 comment `cb728a63` §2–§3.

This doc is the **mechanical enforcement contract** for the four active lifecycle gates. It is referenced by the R2/R4/R5/R6 and Reviewer profiles in `.paperclip/agents/`.

## The four independent gates

A code-bearing change reaches production only by clearing all four across the lifecycle, **each independent — none can override another**. Merge requires gates 1 (Spec), 2 (QA), and 4 (Security) plus Reviewer approval. After merge, release requires gate 3 (Release) and the R5 release-time security restamp. CTO is the cross-gate tie-break for gates 1–3 through a GitHub `Decision:` comment. A Sev≥2 R5 veto clears only through R5 re-review or the CTO+CEO Sev2 override path; Sev1 is fix-forward only.

| # | Gate | Owner | Token in PR/commit | Hold semantics |
|---|------|-------|-------------------|----------------|
| 1 | **Spec gate** | R2 Tech Lead — Execution | `spec-gate:approved decision=<github-comment-url> spec=<link>` (in PR review body) | R2 may block; cleared by R2 or CTO |
| 2 | **QA gate** | R4 QA — Break-Testing | `qa-gate:approved scenarios=<N>` (in PR review body) | R4 may block via `qa:hold` label; cleared by R4 or CTO |
| 3 | **Release gate** | R6 DevOps / Release | `release-gate:cut tag=<vX.Y.Z> ci=<run-url>` (in release commit/tag message) | R6 may hold any tag; cleared by R6 or CTO |
| 4 | **Security gate** | R5 Security / Reliability | `sec-gate:approved sev=<none\|3> …` or `sec-veto:hold sev=<1\|2> finding=<id> evidence=<link>` (in PR review body) + `sec-gate:cleared tag=…` on release | R5 standing veto on Sev≥2; cleared by R5 re-review or CTO+CEO joint override (Sev2 only — Sev1 fix-forward only). See `docs/specs/r5-security-veto-protocol.md`. |

### Why four independent gates (not a chain)

- **Spec gate** asks "is this the right change?" — R3 authored the spec, R2 mechanically checks the PR matches.
- **QA gate** asks "does it break under hostile use?" — independent of spec compliance; a spec-correct PR can still ship a vulnerability.
- **Release gate** asks "is the surrounding system healthy enough to deploy?" — independent of the PR itself; CI green, branch hygiene, instruction-file canonical sync (CLAUDE.md §6).
- **Security gate** asks "does this introduce or fail to remediate a Sev1/Sev2 security or reliability defect under the threat model?" — independent of all three above; a spec-correct, QA-passed, CI-green PR can still leak a secret, ship an injection path, or violate a SOUL.md guardrail.

Subordinating any of these to another collapses the org back into the single-thread risk Phase 1 exists to remove.

## Mechanical enforcement (Phase 1 — before WEI-611 spec-gate harness lands)

The Reviewer specialist (existing, `.paperclip/agents/reviewer/`) inspects the **token text** of each gate when it reviews a PR:

1. If PR review bodies lack a valid `spec-gate:approved …` token authored by R2 → Reviewer leaves a `request-changes` review citing this doc.
2. If PR review bodies lack a valid `qa-gate:approved …` token authored by R4 → Reviewer leaves a `request-changes` review.
3. If a release commit lacks `release-gate:cut …` from R6 → R6's own release-runbook script (R6-001 first queued work) refuses to push the tag.
4. If PR review bodies lack a valid `sec-gate:approved …` or `sec-veto:hold …` token authored by R5 (≥ 2 hours after PR open) → Reviewer leaves `request-changes`. A live `sec-veto:hold sev=<1|2>` blocks merge unless the Sev2-only override token includes a GitHub decision URL, body SHA-256, `updatedAt`, and compensating Issue that validate per the R5 protocol.

When WEI-611's spec-gate bot (and its R5 sibling) lands, items 1–2 and 4 become CI checks rather than human-read tokens. The token format is forward-compatible with the bot's parser.

## Cross-gate escalation

Conflicts between gate-holders 1–3 go to the CTO. The CTO posts a structured `Decision:` comment on the governing GitHub Issue with:
- Which gates conflicted.
- Which gate prevails for this case.
- Which precedent (if any) is established.

Conflicts involving gate 4 (R5 security) follow `docs/specs/r5-security-veto-protocol.md`: Sev1 findings are fix-forward only; Sev2 findings require a CTO decision comment, CEO co-sign comment, and compensating-control Issue; Sev3 findings are advisory.

Repeated overrides of the same gate are themselves a Sev2 process bug — the offended gate-holder files an Issue against the org structure.

## What is **not** enforced in Phase 1

- **R7/R8 ownership rules** — Phase 1 does not yet enforce file-area ownership; coder-backend / coder-frontend specialists currently both reach the spec gate as ICs.
- **Token-budget weekly cap** — referenced in WEI-576 §8 as a CEO-input blocker; tracked separately, not gated here.

## How this doc evolves

- Every Phase 1 gate change → PR with conventional commit `docs(org-v1): …` tied to a GitHub Issue and decision-comment permalink.
- ~~When R5 activates → add a Section "Gate 4: Security gate" with the same shape as 1–3.~~ **Done 2026-05-09 (WEI-716).** Future R5 token-grammar evolution → PR `docs(r5): …`.
- When the spec-gate bot from WEI-611 (and R5 sibling) ships → mark items 1–2 and 4 of "Mechanical enforcement" as bot-checked.

## Provenance

- WEI-572 — parent ("the CTO needs a proper team").
- WEI-576 — org-v1 proposal + acceptance interaction `579d4c3d`.
- WEI-715 — Phase 1 activation (this doc fulfills AC #2).
- Authored: 2026-05-09 by CTO under Paperclip run `d2937953`.
