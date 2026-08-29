# Run 251 — Overall Manager authority and Portfolio Control Packet v1

Issue: [#254](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/254)

Activation: [comment 5447497890](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/254#issuecomment-5447497890)

Corrective authority: [comment 5447810220](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/254#issuecomment-5447810220)

Clean-history delivery authority: [comment 5447866228](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/254#issuecomment-5447866228)

Branch: `codex/issue-254-overall-manager-contract-clean`

Verified base: `87305b98a70ef32ca51795d4f49238d114a8112c`

## Scope

This run defines a provider-neutral, recommendation-only Overall Manager authority boundary and Portfolio Control Packet v1. The compatibility repair makes HOLD/disposition, grouping versus executable-leaf context, exact task/host/lease identity, blocker owner/link/state/resume condition, host suitability, evidence freshness, one-overall/one-per-host capacity, and the bounded two-host exception explicit and fail closed. Memory, stored prompts, and reminders remain data with `authority: none` and cannot grant activation or a lease.

The implementation imports only `node:crypto`. It has no filesystem, process, network, provider SDK, dispatch, GitHub, Project, merge, release, or canonical-state mutation capability.

## Test-first evidence

- RED, isolated disposable validation directory: focused suite failed 10 of 41 tests before production changes. The new behavioral cases failed because `HOLD`, `NOT_EXECUTABLE_LEAF`, `HOST_UNSUITABLE`, `CAPACITY_POLICY`, and `UNAUTHORIZED_CONTEXT` were not implemented.
- Reviewer-remediation RED: Ajv failed on the unresolved portable-schema reference, and the hidden second-lease case failed to return `CAPACITY_POLICY`.
- Final reviewer-remediation RED: runtime accepted a malformed disposition reason code and a primary-host label for the second lane; the focused suite failed 2 of 43 tests before the runtime correction. Independent review also identified missing stable-ID validation for gate reviewers.
- GREEN focused: `node --test tests/overall-manager-contract.test.js` — 43/43 passed, including real Ajv compilation, exact top-level schema-property validation, runtime/schema reason-code alignment, stable gate-reviewer identities, and distinct second-lane host identity.
- Full disposable suite: `npm test` — 215/215 passed across 64 suites.
- GH013 corrective verification: GitHub push protection rejected the first ordinary push because three deliberate negative-test fixtures were stored as complete credential-shaped literals. The additive corrective commit assembles those same unsafe values from non-secret fragments at runtime; rejection behavior remains covered without retaining complete scanner-matching signatures in Git content.
- Clean-history delivery: the first push rejected original commit `c0ca17236bbd8ebd879d9ea6ee047da5a608aa32`; the second rejected final additive head `55e708610b32e0af23ec30a2e81891cdd6e360f6` because its preserved parent still contained the scanner-matching literal. Both attempts are historical evidence only. This replacement branch starts directly from verified main and transfers the five clean file contents without cherry-picking or carrying the rejected branch history.
- Bounded signature scan: the five publishable paths contain no complete supported GitHub token, AWS access-key identifier, or Slack token signature.
- Syntax: `node --check lib/overall-manager-contract.js` — exit 0.
- Schema JSON parse: PowerShell `ConvertFrom-Json` — success.
- Dependency tree: `npm ls --all` — exit 0; direct SDK remains `1.29.0`; no package or lockfile change.
- Dependency audit: unchanged baseline, 6 transitive findings (3 high, 2 moderate, 1 low, 0 critical). This Issue changes no dependency and makes no security-clean claim.

The full suite generated heartbeat/audit outputs only in the disposable directory. No test command ran in the preserved worktree.

## Confinement and preserved evidence

Publishable paths are limited to:

- `docs/contracts/overall-manager-authority-v1.md`
- `lib/overall-manager-contract.js`
- `schemas/portfolio-control-packet-v1.schema.json`
- `tests/overall-manager-contract.test.js`
- `reports/run-251-summary.md`

The four pre-existing generated files remain untracked, unchanged, and excluded in the frozen source worktree; they were not transferred into the clean delivery worktree. Their preserved SHA-256 identities are:

- `reports/audit/2026-08-24T07-24-20-156Z.json` — `cfca66b48393abeeaaa94216b13451407730bba1281ef8938f5b174a8270e56e`
- `reports/audit/2026-08-24T07-24-20-724Z.json` — `c46a602e1d3c29d1a4c1bab6c64eba762e551ea078320b05d8d2be3adfe076e6`
- `reports/heartbeat-tick-2026-08-24T07-24-20-156Z.md` — `59b148ff0c500bfa7b5a897c643417f35c502915e5d8bf2e02a54107af6a6035`
- `reports/heartbeat-tick-2026-08-24T07-24-20-724Z.md` — `ad48731f73efd0532631cd00760f77c934e581f33e1a0d9483c6c8f1f5beb8a7`

The bounded privacy and secret-signature scan found no complete supported credential signature, live credential, private absolute path, or secret value in the five publishable paths. Negative tests assemble deliberate unsafe examples from non-secret fragments only at runtime.

## Gates and authority boundary

Fresh exact-head Spec, QA, Security, and Reviewer tokens bind to the single clean-history replacement commit containing this report. All verdicts on the rejected branch are historical only. The fresh tokens are technical evidence and do not grant self-approval, readiness, merge, release, Project mutation, or gate waiver.

Rollback is one ordinary Git revert of the single clean-history replacement commit. No history rewrite or force push is required. Outstanding packets remain invalid unless they pass a fresh canonical identity, generation, freshness, collision, lease, blocker, capacity, and gate readback.
