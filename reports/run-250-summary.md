# Run 250 — Issue #249 Verified Complete reconciler

## Governing work

- Issue: [#249 — Implement Verified Complete closure and 14-day Project archival reconciler](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/249)
- Canonical lease: [Issue comment 5390563071](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/249#issuecomment-5390563071)
- Accepted path map: [Issue comment 5390749947](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/249#issuecomment-5390749947)
- Remediation reactivation: [Issue comment 5392014940](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/249#issuecomment-5392014940)
- Base: `origin/main` at `585032f248162965d392ebf58475045c2f276e84`
- Branch: `codex/issue-249-verified-complete-reconciler`
- Implementation commit: `c44c8b45615fc5ec1cd5b10dab56cc0e90f19704`
- Prior reviewed head: `9628a029b9ab3101e8724df39721f9834daa3a42`; its review tokens became stale when the capability-integrity remediation began.
- Worktree: isolated Windows worktree `C:\Users\weird\AppData\Local\Temp\devlead-issue-249-verified-complete`

No Project field, queue, Issue lifecycle, native workflow, release, or production state was mutated during implementation or testing.

## Delivered scope

The six-path increment provides:

- a pure deterministic planner for canonical Issue closure, fixed 14-day archival, reopen restoration, and exact manual remediation;
- a fail-closed injected-adapter apply boundary with stable-node-ID refetch, identity/permission/capability probes, idempotent evidence read-back, final precondition replan, terminal read-back, and conservative partial-write reporting;
- a non-interactive offline CLI that defaults to dry-run and requires both explicit mutation flags plus a separately injected adapter before apply;
- adversarial planner and process-level CLI tests;
- operator documentation covering schema, authority, cooling, least privilege, disable, rollback, and future live-adapter gates.

No live GitHub adapter, scheduler, credential loader, package change, dashboard change, product behavior, or broad native automation was added.

## Test-first evidence

Representative failing signals observed before the corresponding fixes included:

- module-not-found and then `0 !== 1` before the planner emitted its first eligible close action;
- `unknown-argument:--help`, missing bounded options, and apply-gate failures before the CLI contract existed;
- date-only values accepted by permissive `Date.parse`;
- missing/wrong/extra stable-ID refetches reaching generic precondition or read-back paths;
- no-op evidence/audit writers still allowing primary mutations;
- one-day retention, `required:false` open children, and gate-insensitive archive hashes bypassing policy;
- a successful close followed by missing read-back reported as not applied;
- tampered plans and incomplete adapters reaching adapter access;
- both supported-to-unsupported and unsupported-to-supported `restoreProjectItem` capability tampering reached adapter refetch because the canonical plan hash omitted the apply-trusted capability field.

Each failure was converted into a regression before its source fix. Current focused result:

```text
node --test tests\verified-complete-reconciler.test.js tests\reconcile-verified-complete-cli.test.js
112 tests, 112 passed, 0 failed
```

The two new capability-tampering subtests first failed on the prior implementation with `unexpected-refetch-after-capability-tamper` instead of `plan-integrity-mismatch`. After the source fix, tampered plans fail before any adapter access, while untampered live capability drift fails after identity probe and before refetch, audit, restoration, or manual-remediation writes in both directions.

## Verification

Environment: Windows, Node `v24.12.0`, npm `11.6.2`.

| Check | Result |
| --- | --- |
| focused planner + CLI suite | exit 0; 112/112 passed |
| `npm test` | exit 0; 284/284 passed across 59 suites |
| `node --check` on planner and CLI | exit 0 |
| `npm ls --all` | exit 0; SDK remains `@modelcontextprotocol/sdk@1.29.0` |
| bounded secret-pattern scan across all six paths | exit 0; no matches |
| generated full-suite heartbeat artifacts | four exact test-local files removed after verification; not part of the six-path diff |

The full suite executed heartbeat tests that intentionally generate local reports. Only the four exact files named by this run were removed afterward; no pre-existing or canonical evidence was deleted. No canonical Issue, Project, provider, release, or live-adapter mutation occurred.

## Dependency-security evidence

Live root `npm audit --json` exits 1 on this exact main-based worktree with the unchanged six transitive findings: 3 high, 2 moderate, 1 low, 0 critical. Affected transitive packages are `fast-uri`, `hono`, `ip-address`, `@hono/node-server`, `qs`, and `body-parser` through SDK 1.29.0.

This branch changes neither `package.json` nor `package-lock.json`. The remediation exists on still-draft PR #244 at reviewed head `770e89b9df5f6cfde4d9e2b5163465647f43a04c`; because that PR is not merged into this branch's exact `origin/main` base, the findings remain current and unwaived here. Canonical status is [#227 comment 5390139683](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/227#issuecomment-5390139683). This run makes no security-clean claim.

## Independent early review

Read-only independent QA and security/code passes found the following before publication:

1. evidence/audit persistence was not proven before a primary write;
2. primary writes could be underreported after read-back failure;
3. a configurable cooling window could weaken the required 14 days;
4. optional metadata could let an open child bypass closure;
5. archive audit identity omitted current acceptance/gate/PR evidence.

All five findings were reproduced, fixed at source, and covered by passing regressions. Final independent QA and code/security review must be bound to the exact committed head before draft publication; the early passes do not self-approve or clear merge.

A later whole-diff review found that apply trusted `plan.capabilities.restoreProjectItem` for restoration decisions and live drift detection while the canonical plan hash did not bind it. The remediation hashes the explicit apply-trusted field and adds bidirectional tampering plus live-drift tests. All prior exact-head review tokens are stale; fresh code/security and QA review must bind the remediation commit.

## Risks and rollback

- The normalized snapshot producer and live provider adapter are intentionally not included. Before either can be enabled, its pagination, stable IDs, allowlist, permissions, idempotent evidence writes, provider calls, read-back, secrets, and single-writer behavior require separate implementation and independent review.
- Stable refetch minimizes stale decisions but cannot make separate provider APIs transactional. Any failed read-back after a primary write is reported with the exact `uncertainAction`; operators must reconcile that stable ID before retrying.
- Native broad Auto-close and Auto-archive workflows must remain disabled. Project Done is never treated as canonical completion.
- The fixed cooling clock uses the later of canonical `issue.closedAt` and uninterrupted `archiveEligibleSince`, preventing a newly closed Issue from inheriting an older eligibility date.

Code rollback is an ordinary revert of the #249 commit. A wrongly closed Issue is reopened with append-only evidence. A wrongly archived Project item is restored to Backlog, Blocked, or Needs user as canonical state requires, or receives exact manual restoration evidence if the provider cannot restore it. Evidence is never deleted.

## Remaining gates

- record the exact remediation commit after the ordinary commit is created; its merge base must remain the recorded `origin/main` SHA and its diff must remain exactly the six accepted paths with `git diff --check` passing;
- obtain independent exact-head QA plus code/security review;
- push normally to the existing branch and update existing draft PR #253 only;
- record exact-head evidence on #249 and its parent without changing Project/lifecycle state;
- keep all readiness, human review, merge, closure, and release gates closed.
