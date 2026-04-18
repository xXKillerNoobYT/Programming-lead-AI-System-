# Run 41 Summary — Dependabot Transitive-Dep Fixes (D-20260418-019)

## Overview
**Tasks**: Issues #30 (minimatch ReDoS) + #31 (glob CLI command injection) — both high-severity Dependabot alerts in the devDep chain.
**Decision ID**: D-20260418-019
**Status**: COMPLETE — `npm audit fix` resolved both; cohesion battery 6/6 green post-fix.
**Trigger**: Heartbeat tick 11, self-scheduled from Run 40 via `/loop`. Oldest-first non-epic picks after #26 closed; picked #30/#31 together as atomic verification pair because `check:deps --omit=dev` was already green and the Dependabot tab still showed them open — contradiction worth resolving.
**Branch**: `run-41/dependabot-transitive-fix`.

## Root cause
Both vulns lived in the **devDependency chain**, not production:

```
@typescript-eslint/parser 6.16.0-7.5.0
  → @typescript-eslint/typescript-estree
      → node_modules/…/minimatch 9.0.0-9.0.6  (3 ReDoS advisories)
      → glob                                    (CLI cmd-injection advisory)
```

`check:deps` uses `npm audit --audit-level=high --omit=dev`, so it correctly showed 0 production vulns. Dependabot's surface shows all vulns, including devDeps — hence the gap.

## Fix applied
```
$ cd dashboard && npm audit fix
added 2 packages, removed 27 packages, changed 8 packages, audited 704
found 0 vulnerabilities
```

Non-force mode. Stayed within stated dependency ranges.

## Verification (evidence-before-assertion)
```
$ node scripts/cohesion-check.js --all
▶ check:lint                ✓ (7135ms)   no warnings/errors
▶ check:types               ✓ (4046ms)   tsc --noEmit clean
▶ check:tests               ✓ (8082ms)   17/17 pass
▶ check:coverage-threshold  ✓ (7471ms)   95.45% / 91.66% / 92% / 94.59% (floor 90%)
▶ check:arch                ✓  (844ms)   placeholder
▶ check:deps                ✓ (2902ms)   found 0 vulnerabilities

[cohesion-check] ✓ ALL PASSED  (total ~30s — cached deps kept it fast)
```

Run 37 baseline preserved: same coverage, same test count, same pass rate. No regression from the upgrade.

## Changes
| File | Change |
|---|---|
| `dashboard/package-lock.json` | -421 / +30 lines (net -391) — stale `@typescript-eslint` 6.x dep chain removed; upgraded to a newer minor in the 6.x range |
| `dashboard/next-env.d.ts` | Next.js regenerated on build — included because it's auto-generated and its drift is part of the same dependency move |
| `decision-log.md` | D-20260418-019 entry |
| `reports/run-41-summary.md` | This file |

## Metrics
- **Issues closed this run**: **2** (#30 minimatch, #31 glob)
- **Dependabot alerts resolved**: 2 (advisory #19 minimatch, advisory #11 glob — will auto-close on next Dependabot sweep)
- **Runtime deps added**: 0 (devDep transitive only)
- **Test coverage delta**: 0 — same baseline preserved
- **Commits this run**: 1 expected

## GitHub Notes
- Closing #30 and #31 together, each with the same D-ID citation. GitHub's Dependabot will see 0 high+ alerts on next sweep and the repo's "11 vulnerabilities" banner (first seen during Run 10) disappears completely.
- PR #2 (next bump) + this PR (transitive) together close the security triage that Issue #12 opened back in Run 25.

## Gaps Captured (Polsia Rule 2)
- **Dependabot vs `npm audit --omit=dev` gap** — these tools disagree on the runtime / dev boundary for transitive risk. Dependabot is strictly right for "shipping code + CI"; `--omit=dev` is a reasonable runtime-only lens. The right fix is wiring a second `check:deps:all` script without `--omit=dev` for CI to surface devDep drift earlier. Captured here, not opened as a new Issue — a 1-line script addition can land in a future small heartbeat.
- **Run-report hygiene** — I ran the cohesion check with the new deps from the freshly-installed state, not from a clean clone. First CI exercise will validate `npm ci` with the new lockfile actually installs the same tree on Ubuntu.

## Plans folder checked
- `plans/phase-3-plan.md` — no changes needed. §A subtree (cohesion layer) gets stronger because the gate now catches the devDep gap the first time `check:deps:all` gets wired.
- `plans/phase-4-plan.md` §B.1 — CI (landed D-018) will pick up this fix on its first-PR exercise.

## Next Tasks (priority order)
1. **#24** Phase 3 §D.1 — UI shell + routing (still the largest single unblock; deserves a dedicated session).
2. **#27** Phase 4 §C.2 — `.env.example` + dotenv (may already be closed by subagent; re-verify on next orient).
3. **#28** Phase 4 §A.1 — PM2 ecosystem.
4. **#41** — filesystem MCP path portability (mirror of #17).
5. Dashboard root lockfile warning (not an Issue) — Next complains about two `package-lock.json`s; minor but worth cleanup.

**Heartbeat cadence**: self-paced via `/loop`. Next wake scheduled post-commit.
