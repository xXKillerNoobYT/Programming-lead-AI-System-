# Verified Complete reconciler

Issue [#249](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/249) defines the repository-owned policy for closing canonically Verified Complete Issues, archiving their Project items after a fixed cooling period, and restoring visibility when completion is rolled back or an Issue is reopened.

This increment is deliberately provider-neutral:

- `lib/verified-complete-reconciler.js` plans from a normalized snapshot and can apply a plan only through an injected adapter.
- `scripts/reconcile-verified-complete.js` reads an offline snapshot and is dry-run only unless a trusted embedding process supplies an adapter, `--apply`, and `--enable-mutation`.
- No live GitHub transport, credential loading, scheduler, Project workflow, or native auto-close/auto-archive capability is enabled here.
- GitHub Issues, comments, native relationships, merged pull requests, and current gate evidence remain canonical. Project fields are projections, never completion authority.

## Operator contract

Run the preview against a freshly normalized snapshot:

```powershell
node scripts/reconcile-verified-complete.js --snapshot .\snapshot.json --now 2026-08-24T00:00:00.000Z
```

Optional `--max-actions 1..100` bounds the deterministic action list. The default is 25. The archival policy is fixed at 14 full elapsed days and has no CLI override.

Exit codes are:

- `0`: the preview is valid and has no blocked items, or an explicitly injected apply completed without an unconfirmed result;
- `1`: the policy blocked at least one item, the plan itself was blocked, or apply failed;
- `2`: arguments, input JSON, or the required injected-apply boundary were invalid.

The command never prompts. Unknown flags, duplicate flags, missing values, policy-changing aliases, and malformed JSON fail closed. Errors go to stderr as one JSON object; plans/results go to stdout as JSON.

## Normalized snapshot

The snapshot producer is a separately reviewed boundary. It must paginate and canonicalize live data immediately before planning and must not infer missing fields.

Top-level fields:

| Field | Required meaning |
| --- | --- |
| `identity.repositoryNodeId` | Stable node ID of the one allowed repository |
| `identity.projectNodeId` | Stable node ID of the one allowed Project |
| `permissions` | Explicit booleans for `readIssues`, `readProject`, `writeIssues`, and `writeProject` |
| `capabilities.restoreProjectItem` | Explicit boolean; false selects recorded manual remediation |
| `capturedAt`, `freshUntil` | RFC 3339 timestamps with a timezone |
| `evidenceKeys` | String idempotency keys already present in canonical completion comments |
| `archiveAuditKeys` | String idempotency keys already present in archive audit evidence |
| `restorationAuditKeys` | String idempotency keys already present in restoration evidence |
| `items` | Complete bounded Project-item/Issue records for this run |

Every item requires stable `projectItemId`, `repositoryNodeId`, `projectNodeId`, and an explicit boolean `archived`. Each Issue requires stable `nodeId`, positive integer `number`, exact `state`, exact canonical `lifecycle`, and the fields used by the gates below. Exact duplicate stable-ID records are suppressed; conflicting duplicate identities or content block the entire plan.

`acceptanceCriteria` and `requiredGates` are non-empty arrays with unique string IDs, exact `passed` status, and evidence containing:

- `subject` equal to `expectedEvidenceSubject`;
- RFC 3339 `recordedAt` no later than the evaluation time;
- RFC 3339 `validUntil` no earlier than the evaluation time.

For code-bearing work, `expectedEvidenceSubject` is `commit:<mergeCommitOid>` and `implementationPr` has a positive integer PR number, exact `MERGED` state, and that merge commit OID. For explicitly non-code work, `codeRequired` is false and the evidence subject names the immutable approved artifact or decision.

Relationship arrays must be explicit. Unknown or malformed relationship state is not treated as resolved.

## Closure policy

An open Issue receives a `close-issue` action only when all of these remain true:

1. Canonical lifecycle is exactly `Verified Complete` and Project Status is exactly `Done`.
2. Every acceptance criterion and required gate is passed, current, and bound to the expected subject.
3. Required code is represented by the current merged implementation PR.
4. There are no unresolved review findings.
5. There is no open child, blocker, dependency, follow-up, hold, or active Sev1/Sev2 incident. An open child cannot be waived by optional metadata.
6. Any owner question is answered, durably incorporated, and its dependent state is reconciled.
7. Issue-write permission is current and unambiguous.

Project Done, labels, inactivity, a branch, a commit, a draft/ready PR, an automation intent, or a completion-looking comment cannot satisfy these gates by itself.

## Archive policy

Only a closed, unarchived, canonically Verified Complete work record can receive `archive-project-item`. Audit, history, security, privacy, incident, active, held, blocked, needs-user, long-term-watch, unknown, and other special records remain visible.

The cooling clock begins at the later of:

- canonical `issue.closedAt`; and
- `archiveEligibleSince`, the start of the current uninterrupted Verified Complete eligibility period.

Both values must be RFC 3339 timestamps. The action becomes eligible at exactly 14 full elapsed days. Missing, future, ambiguous, or younger timestamps block archival. The archive idempotency hash binds the stable identities, current acceptance criteria, current gates, merged implementation evidence, subject, and cooling timestamps.

## Reopen and rollback policy

An archived item is restored when its Issue is reopened or its archival eligibility no longer holds. Restoration never silently resumes execution:

- canonical execution state `Blocked` maps to Project Status `Blocked`;
- canonical execution state `Needs user` maps to Project Status `Needs user`;
- every other or missing execution state maps to `Backlog`.

If the provider supports restoration, both Issue and Project write permission are required. If it does not, the plan emits an idempotent `manual-project-restoration` record naming the exact stable item and target status; it does not pretend the item was restored.

## Apply boundary and sequencing

`applyReconciliationPlan` defaults to dry-run and does not even read the adapter. Mutation requires all of the following:

1. an unblocked, untampered plan with zero blocked items;
2. `enabled: true` from the embedding process;
3. a complete injected adapter with no environment or credential discovery in this module;
4. a current identity/permission/capability probe matching the plan;
5. an exact one-item stable-ID refetch before each action;
6. idempotent evidence/audit creation followed by a refetch proving its key is visible;
7. one final full precondition replan immediately before the primary write;
8. a stable-ID read-back proving the terminal state.

Actions are stable-ID sorted, duplicate-suppressed, and bounded. A mixed plan with any blocked item cannot be applied. Processing stops at the first failure. The result reports completed results, write attempts, and an `uncertainAction` when a primary write may have happened but read-back did not prove its outcome. Operators must reconcile that exact stable ID before retrying; they must not delete evidence or guess.

## Least privilege, disable, and rollback

- Preview needs Issue and Project read access only. The normalized snapshot still records write capability explicitly so the plan can show truthful blockers.
- Close needs Issue write access. Archive and supported restoration need Issue plus Project write access. Manual remediation needs Issue write access only.
- Keep GitHub's broad native Auto-close and Auto-archive workflows disabled. Disabling this reconciler means stopping the external invocation; there is no background service in this increment.
- Run one authoritative writer at a time under the program's normal lease and collision checks. Never use this module to bypass independent review, security, release, or human gates.
- Code rollback is an ordinary revert of the #249 commit. A wrongly closed Issue is reopened with evidence. A wrongly archived Project item is restored to its conservative non-active status, or recorded for exact manual restoration when the provider lacks that capability. Evidence and audit comments are append-only and are never deleted during rollback.

Before enabling any future live adapter, independently review its pagination, stable-ID queries, permission probes, idempotent comment/audit behavior, provider write calls, read-back semantics, secret handling, and single-writer scheduling on the exact adapter commit.
