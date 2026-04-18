# Running DevLead heartbeat under PM2

**Goal**: `heartbeat.js --watch` survives crashes, survives reboots, and emits rotating logs. PM2 is the cross-platform supervisor we use; OS-native schedulers (Windows Task Scheduler §A.2, systemd §A.3, launchd §A.4) wrap the same heartbeat as future Phase-4 Issues.

Phase 4 §A.1 · D-20260418-022 · Issue #28.

---

## First-time setup

```bash
# 1. Install PM2 globally (NOT added to package.json — keeps the repo
#    free of a heavy ops dep).
npm install -g pm2

# 2. From the repo root, start the heartbeat under PM2's ecosystem.
npm run start:pm2
#   → pm2 start ops/pm2/ecosystem.config.js

# 3. Set up the boot-time startup hook so PM2 restores the running set
#    after a reboot. PM2 generates a platform-specific command that
#    enables itself as a system service; copy-paste the output and run.
pm2 startup

# 4. Save the currently-running PM2 set so `pm2 startup` restores it.
pm2 save
```

## Daily operations

```bash
npm run logs:pm2     # tail -f the last 100 lines
npm run stop:pm2     # stop without removing the app from PM2's list
pm2 restart devlead-heartbeat   # force-restart (useful after config changes)
pm2 status           # list all PM2-managed apps
pm2 list             # alias of status
pm2 show devlead-heartbeat      # full runtime details for one app
```

## Environment variables

`heartbeat.js` loads `.env` at startup via `process.loadEnvFile()`. PM2 inherits the env vars present in the shell that ran `npm run start:pm2` — so run it from a shell where you've already set:

- `WORKSPACE_DIR` (required for filesystem MCP)
- `MEMPALACE_PALACE_PATH` (required for MemPalace MCP)
- `GITHUB_PERSONAL_ACCESS_TOKEN` (required for GitHub MCP)
- ...plus anything else from `.env.example`

Alternative: keep values in `.env` at repo root — heartbeat re-reads it on each start.

## Uninstall

```bash
pm2 stop devlead-heartbeat
pm2 delete devlead-heartbeat    # remove from PM2's list
pm2 unstartup                   # reverse the OS-level startup hook
pm2 save                        # clobber the saved set
npm uninstall -g pm2            # remove PM2 itself
```

## Log rotation

PM2 ≥ 6 ships a `pm2-logrotate` module that rotates log files by size or age. Install once:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14     # matches LOG_RETENTION_DAYS default
pm2 set pm2-logrotate:compress true
```

Phase 4 §A.5 will consume these settings — for now, rotation is opt-in.

## Health check

```bash
pm2 status devlead-heartbeat
# Expect: status `online`, uptime increasing, restarts < 10
```

`reports/heartbeat-tick-*.md` getting newer files is the end-to-end signal that the daemon is actually producing work. No tick reports after 2× `HEARTBEAT_INTERVAL_MS` = something is wrong — `pm2 logs` is the first place to look.

## What's NOT in this Issue (by design)

- **Crash-loop detection** — Phase 4 §A.7. PM2's `max_restarts: 10` + `min_uptime: '30s'` is the interim guardrail; a proper detector will pause the scheduler and file a `type:bug` Issue when it trips.
- **Structured JSON logs** — Phase 4 §D.1. PM2's plain-text log lines are fine for v1.
- **OS-native supervision** (Windows Task Scheduler, systemd user unit, launchd) — Phase 4 §A.2 / §A.3 / §A.4. PM2 is cross-platform and good enough for v1; the OS-native wrappers are for users who don't want a Node-based supervisor.
- **CI job that runs heartbeat under PM2** — not meaningful; CI exercises single-tick behaviour (the cohesion runner), not daemon lifecycle.
