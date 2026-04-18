# Dashboard Cohesion Checks

One npm script per check. Each runs standalone, exits non-zero on failure, and is composable into the `check:all` pipeline (until `scripts/cohesion-check.js` supersedes it per Phase 3 §A.2).

Ref: [`plans/phase-3-plan.md`](../plans/phase-3-plan.md) §A.1 · D-20260418-008.

## One-liner per check
| Script | Command | Purpose |
|---|---|---|
| `check:lint` | `next lint` | ESLint via Next.js, fails on lint error |
| `check:types` | `tsc --noEmit` | TypeScript type-check, no JS emit |
| `check:tests` | `jest` | Full test suite, no coverage |
| `check:coverage-threshold` | `node scripts/check-coverage-threshold.js` | Jest with `--coverageThreshold` from `reports/coverage-floor.json` (defaults to 90% until §A.4 writes the floor) |
| `check:arch` | `node scripts/check-arch.js` | Architecture-lint placeholder (fills in at §A.5) |
| `check:deps` | `npm audit --audit-level=high --omit=dev` | Non-zero on high/critical runtime vulns |
| `check:all` | sequential `&&` chain | Runs all of the above in order, fails fast at first non-zero |

## Invocation
From `dashboard/`:
```bash
npm run check:all          # full gate
npm run check:lint         # individual
npm run check:coverage-threshold
# …etc
```

## Current baseline
Captured in the Run 31 summary (`reports/run-31-summary.md`). Individual check results are recorded there; failures are triaged as their own Issues per Polsia Rule 2.

## Next
- **§A.2 (#23)** replaces `check:all` with `scripts/cohesion-check.js` — better per-check output capture + JSON report.
- **§A.4** writes `reports/coverage-floor.json` after a green run; this script reads it automatically.
- **§A.5** fills in real architecture invariants inside `scripts/check-arch.js`.
- **§B.1 (#26)** wires the full check suite into GitHub Actions CI.
