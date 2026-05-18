# Phase 0 Coding-Team Pilot Run Definition

**Status:** Spec ready for pilot selection
**Issue:** WEI-834
**Parent:** WEI-573 under WEI-571
**Convention:** Chaos Coding spec-before-code (scope, architecture, acceptance criteria, risks, rollback)

---

## 1. Purpose

Define the Phase 0 pilot run for the coding-team operating model. The pilot proves that one small real ticket can move through the full engineering loop:

1. accepted spec
2. build implementation
3. independent code review
4. QA break-test
5. security/compliance audit
6. progress/KPI tracking
7. Decision Log closeout

This document defines the run only. It does not select the final ticket, execute the pilot, create or reconfigure agents, change runtime code, or waive any Paperclip approval or budget gate.

## 2. Pilot Ticket Selection

The pilot must use one low-risk real ticket, not a fake exercise. The ticket is eligible only when all criteria below are true.

| Criterion | Requirement |
|---|---|
| Scope | One atomic leaf issue, expected size S or small M, no open child issues required to define the work. |
| Risk | No SOUL.md edits, no locked user-intent files, no secrets, no production deploy, no external publish, no new paid service, no Docker/container work. |
| Surface | Prefer docs, test harness, small script behavior, or a bounded backend/helper change. Avoid broad UI redesign, database migration, auth, billing, or connector credential flows. |
| Spec readiness | The issue contains or links the seven `templates/SPEC.md` fields: Goal, Acceptance criteria, Non-goals, Open questions, Evidence plan, Rollback plan, Size. |
| Verification | The expected proof can run locally on Windows with focused commands, or can be verified from Paperclip/GitHub issue evidence without a long-running service. |
| Independence | Builder, reviewer, QA, security, and progress tracking can be performed by distinct roles or explicitly documented dual-hat exceptions. |
| Observability | The issue can produce all artifacts in Section 3 without relying on private external state. |

Preferred first candidates are documentation-plus-harness or small Node script issues because they exercise the gates without forcing the pilot to debug product-scale runtime behavior. A ticket is rejected for Phase 0 if any open question changes user-facing scope, security posture, budget, approval state, or role authority.

## 3. Gate Artifacts

Each gate must leave a durable artifact. Comments are acceptable when the role contract defines comment output; repo files are acceptable when the accepted issue requires them.

| Gate | Owner for Phase 0 | Required artifact | Minimum evidence |
|---|---|---|---|
| Spec gate | CTO acting as temporary R3/spec author, then R2 or CTO-as-R2 stopgap verifier | Spec document or issue SPEC block | SPEC fields present; open questions resolved or blocked; `spec-gate:approved D-YYYYMMDD-### spec=<link>` when a PR exists. |
| Build | Assigned Coder specialist or CTO-as-DevLead fallback only when no specialist matches | Implementation summary or PR/branch handoff | Changed files, acceptance mapping, exact verification command/result, residual risks. |
| Code review | Reviewer specialist, not the builder | Review comment using the Code Reviewer output contract | Verdict, reviewed scope, verification evidence, findings if any, reviewer-author separation stated. |
| Break-test | QA Adversary / R4 QA, not the builder or code reviewer | QA Adversary Report | Scope tested, runtime/command, scenario count, findings, and `qa-gate:approved scenarios=<N>` on pass. |
| Security audit | R5 Security or Security & Compliance Auditor role, not the builder | Security & Compliance Audit or R5 token report | Scope, inputs reviewed, findings, governance checks, and `sec-gate:approved sev=<none|3>` or a live veto token. |
| Progress tracking | Engineering Progress Steward or CTO-as-Steward stopgap | KPI snapshot / progress report | Lead/cycle/review timing, run-report pairing, backlog lookahead, Decision-ID coverage, spec-before-code status, and any `Why:` deviation line. |
| Decision closeout | CTO | `decision-log.md` entry | One `D-YYYYMMDD-###` entry citing the pilot ticket, artifacts, gate outcomes, KPI result, deviations, and follow-up issues. |

If a PR is not used because the pilot is Paperclip-only or docs-only, the same gate evidence must be posted on the Paperclip issue thread and linked from the Decision Log entry. The absence of a PR does not waive review, QA, security, or progress evidence.

## 4. Phase 0 Role Mapping

Phase 0 is allowed to use temporary role mapping because the full team may not yet have every live seat or event hook wired. The mapping must be explicit in the pilot kickoff comment before build work starts.

| Function | Preferred role | Phase 0 fallback | Constraint |
|---|---|---|---|
| Pilot coordinator | CTO | CTO | May select the ticket, assign roles, resolve cross-gate process conflicts, and write the final Decision Log entry. Must not treat coordination as permission to self-approve build work. |
| Spec author | CTO or future R3 | CTO | May author the pilot ticket spec. Must not also be the independent reviewer of code it authored if the CTO also builds. |
| Spec verifier | R2 Tech Lead | CTO only when R2 is unavailable | Must check spec completeness against `templates/SPEC.md` and `docs/specs/org-v1-enforcement-points.md`; verifier role is separate from builder where possible. |
| Builder | Coder-Backend, Coder-Frontend, Tester, or Build Engineer according to ticket scope | CTO only for docs-only or routing-stopgap work | Builder owns implementation and focused verification. Builder cannot issue final code-review, QA, or security pass for its own diff. |
| Code reviewer | Reviewer specialist | Another non-builder engineering agent designated by CTO | Reviewer cannot have authored material parts of the diff. |
| QA break-test | R4 QA / QA Adversary | Non-builder tester role designated by CTO | QA cannot rely only on builder's happy-path test; it must run at least one adversarial scenario when the changed surface supports it. |
| Security audit | R5 Security or Security & Compliance Auditor | CTO may only perform a stopgap docs-only governance check when R5 is unavailable | Security findings Sev1/Sev2 follow `docs/specs/r5-security-veto-protocol.md`; CTO cannot unilaterally override a Sev2 veto. |
| Progress/KPI | Engineering Progress Steward | CTO-as-Steward stopgap | Steward records metrics and deviations; dashboard-green or KPI-green status is evidence, not merge approval. |

CTO dual-hat limits:

- CTO may coordinate plus write the spec.
- CTO may coordinate plus build only when the selected issue is too small or no specialist matches, but then an independent reviewer and independent QA/security pass are mandatory.
- CTO may coordinate plus progress-track, because progress tracking is evidence collection, not implementation approval.
- CTO may not be the sole author, reviewer, QA pass, security pass, and closer for the same code-bearing pilot.
- Any dual-hat exception must be listed in the pilot kickoff and repeated in the final Decision Log entry.

## 5. Run Sequence

1. CTO selects one eligible ticket and posts a kickoff comment naming the selected issue, role mapping, expected artifacts, and any dual-hat exceptions.
2. Spec owner confirms the SPEC fields and resolves or blocks open questions.
3. Spec verifier posts the spec-gate evidence. If the spec is incomplete, the pilot stops at the spec failure path in Section 7.
4. Builder implements the smallest complete change and posts build evidence with focused verification.
5. Reviewer inspects the diff/evidence and returns approve, request_changes, reject, or comment.
6. QA runs break-test scenarios against the reviewed change and posts the QA report.
7. Security audits the change and posts pass, hold, or veto evidence.
8. Progress Steward records the KPI/progress snapshot and any deviations.
9. CTO writes the Decision Log entry and closes the pilot ticket only if all exit criteria in Section 6 are met.

The sequence is intentionally linear for Phase 0. Later phases may parallelize review, QA, security, and progress tracking once the artifact contract has been proven once.

## 6. Exit Criteria

Phase 0 succeeds only when all criteria are true:

1. One eligible real ticket was selected using Section 2 criteria.
2. Every gate in Section 3 fired and left the required artifact.
3. Reviewer-author separation is preserved and documented.
4. QA ran at least one scenario for a behavior-bearing change, or documented why the ticket was docs-only/text-only.
5. Security either passed with `sec-gate:approved` / audit pass or blocked with a resolved hold/veto path before closure.
6. Progress/KPI plumbing was demonstrated end-to-end with a snapshot containing at least: spec lead time status, build cycle status, review turnaround status, run-report pairing, Decision-ID coverage, and spec-before-code status.
7. `decision-log.md` contains one pilot closeout entry citing the pilot ticket, gate artifacts, KPI result, deviations, and follow-up issues.
8. Any gate failure generated a clear owner/action, child issue, or first-class blocker before the pilot was retried or closed.
9. No Paperclip approval, budget, security veto, release, or spec-before-code gate was bypassed.

The pilot remains incomplete if artifacts exist but a gate did not actually make a pass/hold/request-changes/veto decision.

## 7. Failure Handling

Failures are part of the pilot. The run should prove the handoff and blocking behavior, not hide it.

| Failure point | Required action | Owner |
|---|---|---|
| Spec blocks | Mark the pilot or selected ticket blocked with missing SPEC fields, unresolved open question, or approval dependency. Do not start build. | Spec verifier / CTO |
| Build blocks | Builder comments with exact failed command, missing dependency, or implementation blocker; CTO either revises scope through spec path or creates a child issue for the blocker. | Builder / CTO |
| Review requests changes | Builder owns rework or CTO splits follow-up if the finding is out of current scope. Pilot does not advance to QA until review returns approve or accepted non-blocking comment. | Reviewer / Builder |
| QA critical finding | Apply `qa:hold` where available, post reproducer, and route rework to builder. Pilot resumes at build/review after fix. | QA / Builder |
| Security hold or veto | Follow R5/security auditor contract. Sev1 is fix-forward only; Sev2 needs R5 re-review or CTO+CEO override with Decision ID and compensating high-priority follow-up. | Security / CTO+CEO for eligible override |
| Progress tracking miss | Steward records `Why:`, owner, next action, and miss streak. Missing close evidence blocks final closeout until corrected. | Steward / CTO |
| Paperclip budget or approval gate blocks | Stop and use first-class Paperclip blocked status or interaction. Do not treat informal comments as approval when an interaction is required. | CTO |

If the selected ticket proves too large, Phase 0 stops, records the reason, and CTO selects a smaller ticket rather than expanding the pilot. If the same gate fails twice for process reasons, CTO files a process-improvement child issue before retrying.

## 8. Acceptance Mapping

- Low-risk ticket criteria: Section 2.
- Artifact map for spec, review, break-test, security audit, run/progress report, KPI update, and Decision Log entry: Section 3.
- Exit criteria for all gates, artifacts, Decision Log, and KPI plumbing: Section 6.
- Temporary role mapping, CTO dual-hat limits, and specialist participation without reviewer-author violations: Section 4.
- Failure handling across spec, build, review, QA, security, and progress tracking: Section 7.
- Chaos Coding spec-before-code plus Paperclip approval/budget preservation: Sections 3, 5, 6, and 7.

