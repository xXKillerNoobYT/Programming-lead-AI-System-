# Run 247 — Root dependency-security baseline cleanup

**Date:** 2026-08-23
**Governing Issue:** #227
**Canonical GitHub ledger:** [bounded security diagnosis and plan](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/227#issuecomment-5388802840); [original draft evidence](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/227#issuecomment-5389018964); [POLICY-227-1 finding](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/227#issuecomment-5389879013); [exclusive remediation lease](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/227#issuecomment-5389908380)
**Ledger policy:** [GitHub-only active-decision rule](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/208#issuecomment-5384916659)
**Branch:** `codex/issue-227-security-baseline`
**Base:** `origin/main` at `585032f248162965d392ebf58475045c2f276e84`

## Outcome

The root MCP SDK dependency graph now resolves all six previously reported production-transitive findings to patched, semver-compatible releases. The direct manifest and `@modelcontextprotocol/sdk@1.29.0` remain unchanged. No dashboard dependency, PR #206, product source, permission, or release state was modified.

`decision-log.md` remains identical to `origin/main` and is read-only historical evidence. Earlier pushed commit subjects retain their legacy `D-20260823-001` wording because published history is not rewritten; that text is provenance only and does not define active authority.

## Finding classification and remediation

| Package | Prior | Resolved | Classification and current reachability |
|---|---:|---:|---|
| `@hono/node-server` | 1.19.14 | 1.19.17 | Production transitive; current repository code does not invoke the SDK Hono server/static path. |
| `body-parser` | 2.2.2 | 2.3.0 | Production transitive; current repository code does not invoke the SDK Express server/body-parser path. |
| `fast-uri` | 3.1.2 | 3.1.6 | Production transitive and plausibly reachable through SDK/Ajv URI-schema validation. |
| `hono` | 4.12.18 | 4.13.3 | Production transitive; current repository code does not invoke Hono HTTP middleware. |
| `ip-address` | 10.2.0 | 10.5.0 | Production transitive; current repository code does not invoke the SDK Express rate-limit server path. |
| `qs` | 6.15.1 | 6.15.3 | Production transitive; current repository code does not invoke Express query/body parsing. |

The lockfile also records npm's mechanically reified nested dependencies for the patched `body-parser` and `qs` graph, plus peer metadata for the resolved SDK graph. No direct dependency or major/forced upgrade was introduced.

## Test-first evidence

1. Added `tests/dependency-security-baseline.test.js`, which reads the real root lockfile and enforces the audited safe floor for each named package.
2. Before remediation, `node --test tests/dependency-security-baseline.test.js` exited 1: all six package subtests failed on the vulnerable locked versions (0 passed, 7 failed including the parent test).
3. Applied `npm audit fix --package-lock-only --ignore-scripts` without `--force`.
4. After remediation, the focused command exited 0: 7 passed, 0 failed.
5. Independent review found `SEC-227-M1`: the first implementation checked only each deduplicated root package entry, so a later vulnerable nested copy could escape the regression test.
6. Added an adversarial nested-copy case and reproduced the bypass: the focused command exited 1 with `Missing expected exception` (7 passed, 1 failed).
7. Updated the security-floor check to scan every lockfile path ending in `node_modules/<package>`; the focused command then exited 0 with 8/8 passing.

## Verification

| Command | Result |
|---|---|
| `npm ci` | Exit 0; 93 packages installed. |
| `node --test tests/dependency-security-baseline.test.js` | Exit 0; 8/8 passed, including the adversarial nested-copy regression. |
| `npm test` | Exit 0; 180/180 passed after the review fix. |
| `npm ls @modelcontextprotocol/sdk @hono/node-server body-parser fast-uri hono ip-address qs --all` | Exit 0; confirms SDK 1.29.0 and all six resolved versions shown above. |
| `npm audit --json` | Exit 0; 0 info, low, moderate, high, or critical findings across 93 resolved dependencies. |
| `git diff -- package.json` | Empty; direct manifest unchanged. |
| `git diff --exit-code origin/main...HEAD -- decision-log.md` | Exit 0; no active-decision row remains. |
| `git diff --check origin/main...HEAD` | Exit 0. |

## Risk and rollback

- Behavioral risk is low for the current stdio-client path but not zero: six production-installed transitive implementations changed, including a plausibly reachable Ajv URI parser.
- A future SDK HTTP/server path could exercise the remediated Hono, Express, rate-limit, and query/body-parser packages; the regression test prevents any installed copy of those six packages from silently falling below the known safe floors.
- PR #206 overlaps only on the root `qs` lockfile entry. It remains intact; after #227 lands, its root hunk can be rebased away while its dashboard work remains independently reviewable.
- Rollback is a normal revert of this Issue's commit, followed by `npm ci`. That rollback would knowingly restore the six unwaived findings and therefore must not be merged without a new owner-approved risk record.

## Gates

- Independent security/code review at `feaf4ff` reproduced clean install, 8/8 focused tests, 180/180 full tests, the expected dependency tree, zero root-lock audit findings, diff confinement, and no added-line secret matches. It then identified `POLICY-227-1`: the newly appended legacy decision row contradicted the canonical GitHub-only ledger rule.
- This bounded correction removes only that row and binds active authority to the canonical Issue comments above. Fresh exact-head code/security and QA verdicts are recorded on Issue #227 and draft PR #244 so the immutable report does not claim a review performed after its own commit.
- Draft publication remains gated on fresh exact-head review after this correction.
- Merge, ready-for-review promotion, self-approval, release, and Issue closure remain gated on the published PR's normal CI, required review, merge authorization, and canonical Issue evidence.
