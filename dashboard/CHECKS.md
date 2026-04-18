# Dashboard Cohesion Checks

One npm script per check. Each runs standalone, exits non-zero on failure, and is composed by `scripts/cohesion-check.js`.

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
| `check:all` | `node scripts/cohesion-check.js` | Cohesion runner that executes each check in order and fails fast on first non-zero |

## Invocation
From `dashboard/`:
```bash
npm run check:all          # full gate
npm run check:lint         # individual
npm run check:coverage-threshold
# …etc
```

## Current baseline
Captured in the Run 30 summary (`reports/run-30-summary.md`). Individual check results are recorded there; failures are triaged as their own Issues per Polsia Rule 2.

## Next
- **§A.4** writes `reports/coverage-floor.json` after a green run; this script reads it automatically.
- **§A.5** fills in real architecture invariants inside `scripts/check-arch.js`.
- **§B.1 (#26)** wires the full check suite into GitHub Actions CI.
