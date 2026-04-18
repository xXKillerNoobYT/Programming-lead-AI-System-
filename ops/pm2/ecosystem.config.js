// PM2 ecosystem for DevLead MCP heartbeat daemon.
// Phase 4 §A.1 · D-20260418-022 · Issue #28.
//
// Usage:
//   npm run start:pm2   -> pm2 start ops/pm2/ecosystem.config.js
//   npm run stop:pm2    -> pm2 stop devlead-heartbeat
//   npm run logs:pm2    -> pm2 logs devlead-heartbeat --lines 100
//
// First-time setup (per Docs/ops/PM2.md):
//   npm install -g pm2
//   npm run start:pm2
//   pm2 startup                 # cross-platform startup hook
//   pm2 save                    # persist the running set for reboot
//
// heartbeat.js loads `.env` at startup via process.loadEnvFile()
// (D-20260418-021), so PM2 inherits the same env vars the user set in
// their shell / .env file. No extra "env" block needed here — explicit
// inheritance keeps per-machine secrets out of this committed file.

module.exports = {
  apps: [
    {
      name: 'devlead-heartbeat',
      script: 'heartbeat.js',
      args: '--watch',
      // Auto-restart if memory exceeds 512 MB (heartbeat is I/O-bound;
      // this threshold catches a runaway allocation without flapping on
      // normal growth).
      max_memory_restart: '512M',
      // Human-readable timestamp prefix on every log line. PM2 wraps the
      // child process's stdout/stderr; heartbeat.js emits its own
      // structured log lines per Phase 4 §D.1 (future).
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Relative paths resolve against PM2's cwd (== repo root when
      // launched via `npm run start:pm2`).
      out_file: 'logs/pm2-out.log',
      error_file: 'logs/pm2-err.log',
      // Exit-and-restart settings: heartbeat should self-heal on crash
      // but not flap if something is fundamentally wrong. §A.7's
      // crash-loop detector will refine this.
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      // Merge stdout+stderr in the PM2 dashboard view.
      merge_logs: true,
    },
  ],
};
