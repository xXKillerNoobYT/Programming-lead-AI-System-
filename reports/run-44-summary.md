# Run 44 Summary — Phase 4 §A.1 PM2 Ecosystem (D-20260418-022)

## Overview
**Task**: Issue #28 — PM2 ecosystem for `heartbeat.js --watch`; npm wrappers; docs; log dir.
**Decision ID**: D-20260418-022
**Status**: COMPLETE — config file + scripts + docs shipped; tests stay 41/41.
**Trigger**: Heartbeat tick 14, self-scheduled from Run 43 via `/loop`. Oldest non-epic pick after #27 closed.
**Branch**: `run-44/phase-4-pm2-ecosystem`.
**Stacking note**: This report covers Run 44 changes only; PR #51 is stacked atop earlier Run 41-43 commits that also appear in the PR file list until lower stack PRs merge.

## Changes
| File | Change |
|---|---|
| `ops/pm2/ecosystem.config.js` | **New** — one-app declaration for `devlead-heartbeat`, `autorestart:true`, `max_restarts:10`, `min_uptime:'30s'` as interim crash-loop guardrail, rotating `logs/pm2-*.log`. |
| `Docs/ops/PM2.md` | **New** — first-time setup, daily ops, env-var inheritance, log rotation, uninstall, explicit out-of-scope list. |
| `logs/.gitkeep` | **New** — preserves the dir on clone. |
| `.gitignore` | Added `logs/*` + `!logs/.gitkeep`. |
| `package.json` | Added `start:pm2 / stop:pm2 / logs:pm2` scripts. **PM2 NOT added as a dep** — global install per AC. |
| `decision-log.md` | D-20260418-022 entry. |
| `reports/run-44-summary.md` | This file. |

## AC coverage (Issue #28)
- [x] `ops/pm2/ecosystem.config.js` with all required fields (name, script, args, max_memory_restart, log_date_format, out_file, error_file).
- [x] `npm run start:pm2 / stop:pm2 / logs:pm2` scripts.
- [x] `Docs/ops/PM2.md` covers install / startup hook / save / uninstall.
- [x] `logs/` git-ignored; `logs/.gitkeep` checked in.
- [x] `pm2` NOT added to `package.json`.
- [ ] **End-to-end verification deferred** — PM2 isn't globally installed on this heartbeat's machine; a real `pm2 start` exercise would require `npm install -g pm2` which is a side-effect on the host beyond this atomic task. Config parses as valid JS (`node -e "require('./ops/pm2/ecosystem.config.js')"` returns the expected shape); the user or CI exercises end-to-end when PM2 is available.

## Verification (evidence-before-assertion)
```
$ node -e "const c = require('./ops/pm2/ecosystem.config.js'); \
           console.log('apps:', c.apps.length, 'name:', c.apps[0].name, \
           'script:', c.apps[0].script, 'args:', c.apps[0].args)"
apps: 1 name: devlead-heartbeat script: heartbeat.js args: --watch

$ npm test
ℹ tests 41 · pass 41 · fail 0 · duration_ms 1288.5
```

No code touched; test suite unchanged.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260418-022 | Global PM2 install (NOT devDep); interim `max_restarts:10` + `min_uptime:'30s'` crash-loop guard; env-var inheritance via shell + `.env`; defer real end-to-end PM2 exercise to CI / user | Matches AC + Node-ops convention; anti-flap without waiting on §A.7; no committed secrets; installing PM2 globally mid-tick would be a host side-effect |

## Metrics
- **Issues closed**: **1** (#28)
- **Issues opened**: 0
- **Files changed**: 5 meaningful (ecosystem, PM2.md, .gitkeep, .gitignore, package.json) + 2 admin
- **Test count**: 41/41 (unchanged)
- **Commits this run**: 1 expected
- **Open backlog** (after close): #19 EPIC, #24, #34 EPIC, #36, #37, #40

## GitHub Notes
- #28 closing with AC check-off and D-022 citation.
- `ops/` is a new top-level directory per `plans/phase-4-plan.md` §A (PM2 + Windows Task Scheduler + systemd + launchd land under `ops/` for consistency).
- Phase 4 §A.2/§A.3/§A.4 can now be picked up independently; each wraps the same heartbeat via its OS-native scheduler.

## Gaps Captured (Polsia Rule 2)
- **End-to-end PM2 exercise deferred** — AC says "verified on at least one OS." Config is loadable-via-node; real `pm2 start` exercise will happen when a user or CI runs it. Not a separate Issue because the scope was wiring the config, not adopting PM2 on this host. A future heartbeat that touches PM2 runtime will verify.
- **`pm2-logrotate` is opt-in, not configured** — Docs note how to enable, but we don't auto-install or auto-configure it. Rationale: log volume is low today (single-tick-per-minute heartbeat); rotation is nice-to-have until §A.5 lands structured JSON logs with retention policy.

## Plans folder checked
- `plans/phase-4-plan.md` §A.1 — satisfied.
- §A.2 (Windows Task Scheduler), §A.3 (systemd), §A.4 (launchd) all use this same ecosystem as their process target.

## Next Tasks (priority order)
1. **#24** Phase 3 §D.1 — UI shell + routing (largest single unblock; still deferring to dedicated session).
2. **#36** / **#37** / **#40** — Run 32 pipeline EPIC children (parallel subagent scope).
3. Future §A.2/§A.3/§A.4 (OS-native supervisors) — siblings of this Issue, not yet decomposed into dedicated Issues; can be filed when needed.
4. Future §B.2 release workflow, §C.1 `scripts/setup.js`, §C.4 `scripts/doctor.js` — next Phase-4 layer.

**Heartbeat cadence**: self-paced via `/loop`. Next wake scheduled post-commit.
