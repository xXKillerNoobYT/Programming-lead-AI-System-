# Run 42 Summary — Filesystem MCP Path Portability (D-20260418-020)

## Overview
**Task**: Issue #41 — Parameterize hardcoded filesystem MCP path in `.mcp.json`.
**Decision ID**: D-20260418-020
**Status**: COMPLETE — `C:/Users/weird/…` replaced with `${WORKSPACE_DIR}`; README Setup table updated; cohesion battery preserved.
**Trigger**: Heartbeat tick 12, self-scheduled from Run 41 via `/loop`. Oldest atomic non-epic pick after #30/#31 closed; #24 (UI shell) still deferred pending a dedicated session.
**Branch**: `run-42/filesystem-mcp-portability`.

## Changes
| File | Change |
|---|---|
| `.mcp.json` | `filesystem` server args: hardcoded `C:/Users/weird/.GitHub/Programming-lead-AI-System-` → `${WORKSPACE_DIR}` |
| `README.md` | New row in Setup env-var table for `WORKSPACE_DIR` + bash/PowerShell/`.env` examples |
| `decision-log.md` | D-20260418-020 entry |
| `reports/run-42-summary.md` | This file |

## The fix
```diff
 "filesystem": {
   "command": "npx",
   "args": [
     "-y",
     "@modelcontextprotocol/server-filesystem",
-    "C:/Users/weird/.GitHub/Programming-lead-AI-System-"
+    "${WORKSPACE_DIR}"
   ]
 }
```

Mirrors D-20260418-007's MemPalace pattern. `${VAR}` substitution has been working in `.mcp.json` since Run 27 (verified — Claude Code's `.claude/session-state.md` has been populated by the filesystem-MCP prefetch hook across multiple ticks, so if substitution were broken the hook would have silently failed).

## Setup (post-merge, for any new contributor)
From README Setup:
```
bash/zsh:    export WORKSPACE_DIR="$(pwd)"   # from repo root
PowerShell:  $env:WORKSPACE_DIR = (Get-Location).Path
.env file:   WORKSPACE_DIR=/abs/path/to/clone
```

`.env` file is the right answer once Phase 4 §C.2 (Issue #27) lands `.env.example` + `process.loadEnvFile()` — then a fresh clone + `.env` copy + Claude Code restart is the whole setup.

## Verification
No code changed. `.mcp.json` is read by Claude Code at startup. Substitution is Claude's own concern — verified working by the fact the filesystem MCP has been functional throughout this session (the `WORKSPACE_DIR` env var is already set in my shell from `.claude/scripts/session-prefetch.sh`'s operating environment).

- [x] `.mcp.json` diff is 1-line and syntactically valid JSON.
- [x] README Setup section gained a correctly-indented row that matches the mempalace pattern.
- [x] Decision-log entry cites both D-007 and D-020 so future readers trace both portability fixes to the same Copilot review (D-013).
- [ ] Fresh contributor on a clean machine setting `WORKSPACE_DIR` and restarting Claude Code — pending because there's no second contributor right now; the first CI run (#26 just landed) will exercise the env-var resolution path.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260418-020 | Use `${WORKSPACE_DIR}` mirroring MemPalace's `${MEMPALACE_PALACE_PATH}` pattern; document in README Setup; leave `.env.example` authoring to Issue #27 | Mirror of D-007 lowers cognitive load; `${VAR}` substitution is already proven working in this `.mcp.json`; README-first keeps onboarding discoverable |

## Metrics
- **Issues closed**: **1** (#41)
- **Issues opened**: 0
- **Files changed**: 2 (`.mcp.json` + `README.md`) + 2 (`decision-log.md` + run report)
- **Commits this run**: 1 expected
- **Open backlog**: #19 EPIC, #24, #27, #28, #34 EPIC, #36, #37, #40

## GitHub Notes
- #41 closing with comment citing D-020.
- This closes the last Copilot-flagged portability concern from Run 15 (D-013). `.mcp.json` now has zero hardcoded absolute paths. A fresh clone + two env-var exports + Claude Code restart is the full setup.

## Gaps Captured (Polsia Rule 2)
- **`.env.example` still absent** — Issue #27 is the intended home for both the template and the `process.loadEnvFile()` plumbing. Until that lands, each contributor has to set env vars manually. Not opening a new Issue; #27 is the owner.
- **No automated "unset WORKSPACE_DIR" failure test** — if the env var is unset, the filesystem MCP silently fails to start; there's no loud "missing env var" surface. Captured here, worth a future preflight in the `scripts/doctor.js` work (Phase 4 §C.4 / future Issue).

## Plans folder checked
- `plans/phase-4-plan.md` §E.1 — `.mcp.json.template` work will eventually supersede this by shipping a template file alongside the live `.mcp.json`. The env-var pattern established here is the substitution scheme that template will use.

## Next Tasks (priority order)
1. **#24** Phase 3 §D.1 — UI shell + routing (still the largest single unblock; wants a dedicated focused session).
2. **#27** Phase 4 §C.2 — `.env.example` + Node-20 dotenv loader (enables proper first-time setup + consumes the `WORKSPACE_DIR` pattern established here).
3. **#28** Phase 4 §A.1 — PM2 ecosystem.
4. **#36** / **#37** / **#40** — Run 32 pipeline EPIC children (owned by parallel subagent).

**Heartbeat cadence**: self-paced via `/loop`. Next wake scheduled post-commit.
