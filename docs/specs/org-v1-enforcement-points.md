# Org v1 Phase 1 — Authority Boundary Enforcement Points

Source of authority: WEI-572 → WEI-576 (org-v1 proposal accepted) → WEI-715 (Phase 1 activation).
Charters: WEI-576 comment `9e1d0941`. Org map + handoff diagram: WEI-576 comment `cb728a63` §2–§3.

This doc is the **mechanical enforcement contract** for the three gates standing up in Phase 1. It is referenced by the R2/R4/R6 agent profiles in `.paperclip/agents/`.

WEI-633's executor-layer replacement spec lives at `docs/specs/agent-team-replacement.md`. That spec defines how DevLead routes work to Coder-Frontend, Coder-Backend, Tester, and Reviewer specialists; this document remains the gate-layer contract those executor agents must clear before merge or release.

## The four independent gates

A code-bearing change reaches production only by clearing all four (1–3 for merge; 4 spans merge + release; release additionally requires gate 3 cleanly), **each independent — none can override another**. CTO is the cross-gate tie-break for gates 1–3 via decision-log entry. Gate 4 (R5 security) is special: a Sev≥2 veto on gate 4 can be cleared only by R5 re-review **or** the CTO+CEO joint override path defined in `docs/specs/r5-security-veto-protocol.md` §5. Sev1 findings have **no** override path — fix-forward only.

| # | Gate | Owner | Token in PR/commit | Hold semantics |
|---|------|-------|-------------------|----------------|
| 1 | **Spec gate** | R2 Tech Lead — Execution | `spec-gate:approved D-YYYYMMDD-### spec=<link>` (in PR review body) | R2 may block; cleared by R2 or CTO |
| 2 | **QA gate** | R4 QA — Break-Testing | `qa-gate:approved scenarios=<N>` (in PR review body) | R4 may block via `qa:hold` label; cleared by R4 or CTO |
| 3 | **Release gate** | R6 DevOps / Release | `release-gate:cut tag=<vX.Y.Z> ci=<run-url>` (in release commit/tag message) | R6 may hold any tag; cleared by R6 or CTO |
| 4 | **Security gate** | R5 Security / Reliability | `sec-gate:approved sev=<none\|3> …` or `sec-veto:hold sev=<1\|2> finding=<id> evidence=<link>` (in PR review body) + `sec-gate:cleared tag=…` on release | R5 standing veto on Sev≥2; cleared by R5 re-review or CTO+CEO joint override (Sev2 only — Sev1 fix-forward only). See `docs/specs/r5-security-veto-protocol.md`. |

### Why four independent gates (not a chain)

- **Spec gate** asks "is this the right change?" — R3 authored the spec, R2 mechanically checks the PR matches.
- **QA gate** asks "does it break under hostile use?" — independent of spec compliance; a spec-correct PR can still ship a vulnerability.
- **Release gate** asks "is the surrounding system healthy enough to deploy?" — independent of the PR itself; CI green, branch hygiene, instruction-file canonical sync (CLAUDE.md §6).
- **Security gate** asks "does this introduce or fail to remediate a Sev1/Sev2 security or reliability defect under the threat model?" — independent of all three above; a spec-correct, QA-passed, CI-green PR can still leak a secret, ship an injection path, or violate a SOUL.md guardrail.

Subordinating any of these to another collapses the org back into the single-thread risk Phase 1 exists to remove.

## Mechanical enforcement

The Reviewer specialist (existing, `.paperclip/agents/reviewer/`) inspects the **token text** of each gate when it reviews a PR:

1. If the PR body lacks `spec-gate:approved …` from R2 → Reviewer leaves a `request-changes` review citing this doc.
2. If the PR body lacks `qa-gate:approved …` from R4 → Reviewer leaves a `request-changes` review.
3. If a release commit lacks `release-gate:cut …` from R6 → R6's own release-runbook script (R6-001 first queued work) refuses to push the tag.
4. If the PR body lacks either `sec-gate:approved …` or `sec-veto:hold …` from R5 (≥ 2 hours after PR open, to allow R5's wakeOnDemand cadence) → Reviewer leaves a `request-changes` review citing `docs/specs/r5-security-veto-protocol.md`. A live `sec-veto:hold sev=<1|2>` blocks merge unless an accompanying `sec-veto:override-cto+ceo decision=D-… compensating=#…` is present (Sev2 only) and resolves to a real `decision-log.md` entry.

### Spec-gate harness check

`scripts/spec-gate-bot.js` is the lightweight harness for the Chaos Coding spec-before-code check. It is checked at the issue boundary before Coder agents begin or continue coding work:

- **Targets:** `in_progress` issues by default; `--issue WEI-123` narrows the check to one issue; `--include-blocked` lets reviewers audit blocked work without changing the normal coding gate.
- **Evidence required:** the issue description must include the seven SPEC fields from `templates/SPEC.md` (`Goal`, `Acceptance criteria`, `Non-goals`, `Open questions`, `Evidence plan`, `Rollback plan`, `Size`) and the acceptance-criteria section must include at least one numbered or checkbox/list item.
- **Blocking mode:** `node scripts/spec-gate-bot.js --dry-run --strict --issue WEI-123` exits nonzero when required SPEC evidence is missing. Non-strict cron mode preserves the existing behavior: comment once with missing fields and deduplicate by marker.
- **Interfaces:** R2 Tech Lead Execution owns the `spec-gate:approved D-… spec=…` token after reviewing the spec; Coder agents must not treat an issue as coding-ready when the strict harness fails; Reviewer checks for both the R2 token and the harness evidence when reviewing a PR; R4 QA consumes the acceptance criteria and evidence plan as the input to adversarial scenarios.

Items 2 and 4 remain token-text checks until their own harnesses land. The token format is forward-compatible with parser-backed CI checks.

## Cross-gate escalation

Conflicts between gate-holders 1–3 go to the CTO. The CTO writes a decision-log entry (`D-YYYYMMDD-###`) with:
- Which gates conflicted.
- Which gate prevails for this case.
- Which precedent (if any) is established.

Conflicts involving gate 4 (R5 security) follow `docs/specs/r5-security-veto-protocol.md`: Sev1 findings are fix-forward only (no override path); Sev2 findings can be overridden only by a CTO+CEO joint decision-log entry naming a compensating control; Sev3 findings are advisory and do not block merge.

Repeated overrides of the same gate are themselves a Sev2 process bug — the offended gate-holder files an Issue against the org structure.

## What is **not** enforced in Phase 1

- **R5 Security/Reliability gate** — **activated 2026-05-09 under WEI-716** (Founding-Steward acceptance comment `9eb40fff`). Operating protocol: `docs/specs/r5-security-veto-protocol.md`. Tokens enforced as gate 4 above. R6 now forwards security-flavored CI failures to R5 (replacing the CTO-forwarding stopgap; tracked by child Issue R5-002).
- **R7/R8 ownership rules** — Phase 1 does not yet enforce file-area ownership; coder-backend / coder-frontend specialists currently both reach the spec gate as ICs.
- **Token-budget weekly cap** — **accepted 2026-05-10 under WEI-717 / D-20260511-001**: Safe **$50/week**, Stretch **$75/week**, Redline **$100/week**. Effective next heartbeat after CEO acceptance; advisory until mechanical metering/pause support lands, then enforceable. First re-baseline is due 2 weeks after mechanical metering lands.

## How this doc evolves

- Every Phase 1 gate change → PR with conventional commit `docs(org-v1): …` and a `D-` ID.
- ~~When R5 activates → add a Section "Gate 4: Security gate" with the same shape as 1–3.~~ **Done 2026-05-09 (WEI-716).** Future R5 token-grammar evolution → PR `docs(r5): …`.
- ~~When the spec-gate bot from WEI-611 ships → mark the spec-gate item of "Mechanical enforcement" as bot-checked.~~ **Done 2026-05-10 (WEI-811):** `scripts/spec-gate-bot.js --dry-run --strict --issue WEI-123` is the strict harness check.
- When the QA/security harness siblings ship → mark items 2 and 4 of "Mechanical enforcement" as bot-checked.

## Provenance

- WEI-572 — parent ("the CTO needs a proper team").
- WEI-576 — org-v1 proposal + acceptance interaction `579d4c3d`.
- WEI-715 — Phase 1 activation (this doc fulfills AC #2).
- Authored: 2026-05-09 by CTO under Paperclip run `d2937953`.
