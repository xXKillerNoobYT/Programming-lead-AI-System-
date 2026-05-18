'use strict';

const path = require('node:path');

function pickPath(envName, fallbackAbsPath, baseDir = process.cwd()) {
    const raw = process.env[envName];
    if (!raw || !raw.trim()) return fallbackAbsPath;
    return path.resolve(baseDir, raw.trim());
}

function resolveRepoPaths(repoRoot) {
    return {
        reportsDir: pickPath('REPORTS_DIR', path.join(repoRoot, 'reports'), repoRoot),
        decisionLogPath: pickPath('DECISION_LOG_PATH', path.join(repoRoot, 'decision-log.md'), repoRoot),
        mcpConfigPath: pickPath('MCP_CONFIG_PATH', path.join(repoRoot, '.mcp.json'), repoRoot),
        pauseLockPath: pickPath('HEARTBEAT_PAUSE_LOCK_PATH', path.join(repoRoot, '.heartbeat-paused'), repoRoot),
    };
}

module.exports = {
    pickPath,
    resolveRepoPaths,
};
