# Run 247 — Root dependency-security baseline cleanup

**Date:** 2026-08-23
**Governing Issue:** #227
**Decision:** D-20260823-001
**Branch:** `codex/issue-227-security-baseline`
**Base:** `origin/main` at `585032f248162965d392ebf58475045c2f276e84`

## Outcome

The root MCP SDK dependency graph now resolves all six previously reported production-transitive findings to patched, semver-compatible releases. The direct manifest and `@modelcontextprotocol/sdk@1.29.0` remain unchanged. No dashboard dependency, PR #206, product source, permission, or release state was modified.

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

## Verification

| Command | Result |
|---|---|
| `npm ci` | Exit 0; 93 packages installed. |
| `node --test tests/dependency-security-baseline.test.js` | Exit 0; 7/7 passed. |
| `npm test` | Exit 0; 179/179 passed. |
| `npm ls @modelcontextprotocol/sdk @hono/node-server body-parser fast-uri hono ip-address qs --all` | Exit 0; confirms SDK 1.29.0 and all six resolved versions shown above. |
| `npm audit --json` | Exit 0; 0 info, low, moderate, high, or critical findings across 93 resolved dependencies. |
| `git diff -- package.json` | Empty; direct manifest unchanged. |
| `git diff --check` | Exit 0 before review. |

## Risk and rollback

- Behavioral risk is low for the current stdio-client path but not zero: six production-installed transitive implementations changed, including a plausibly reachable Ajv URI parser.
- A future SDK HTTP/server path could exercise the remediated Hono, Express, rate-limit, and query/body-parser packages; the regression test prevents those six versions from silently falling below the known safe floors.
- PR #206 overlaps only on the root `qs` lockfile entry. It remains intact; after #227 lands, its root hunk can be rebased away while its dashboard work remains independently reviewable.
- Rollback is a normal revert of this Issue's commit, followed by `npm ci`. That rollback would knowingly restore the six unwaived findings and therefore must not be merged without a new owner-approved risk record.

## Gates

- Independent security/code review: pending.
- Draft publication: pending review.
- Merge, ready-for-review promotion, self-approval, release, and Issue closure: not authorized by this run.
