#!/usr/bin/env node
/*
 * DevLead MCP — heartbeat.js v1
 *
 * Read-only tick loop: reads repo state (git, GitHub Issues, last run
 * report, recent Decision IDs) + queries MCP servers declared in
 * `.mcp.json` for live observations. Writes a tick report to
 * `reports/heartbeat-tick-*.md`.
 *
 * v0 (D-20260417-015): shell + fs read-paths only.
 * v1 (D-20260417-020): add MCP client layer per Issue #21.
 *
 * Future versions will add task decomposition, agent delegation, and Grok
 * escalation — all out of scope here.
 *
 * Usage:
 *   node heartbeat.js              # one-shot tick
 *   node heartbeat.js --watch      # loop, default 60_000 ms between ticks
 *   HEARTBEAT_INTERVAL_MS=30000 node heartbeat.js --watch
 */

'use strict';

const { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');

const {
    loadMcpConfig,
    connectServers,
    disconnectAll,
    safeCallTool,
    summariseStatus,
} = require('./lib/mcp-client.js');

const { runCohesionGate } = require('./lib/cohesion-gate.js');
const { safeSpawn } = require('./lib/guardrails.js');

const REPO_ROOT = resolve(__dirname);
const REPORTS_DIR = join(REPO_ROOT, 'reports');
const DECISION_LOG = join(REPO_ROOT, 'decision-log.md');
const MCP_CONFIG = join(REPO_ROOT, '.mcp.json');
const DEFAULT_INTERVAL_MS = 60_000;

/* --------------------------- pure helpers --------------------------- */

function parseGitState(branchOut, shaOut) {
    return {
        branch: (branchOut || '').trim() || '(detached)',
        sha: (shaOut || '').trim() || 'unknown',
    };
}

function parseIssueCounts(ghJson) {
    let issues;
    try {
        issues = JSON.parse(ghJson);
    } catch {
        return { backlog: 0, inProgress: 0, total: 0, parseError: true };
    }
    if (!Array.isArray(issues)) return { backlog: 0, inProgress: 0, total: 0, parseError: true };

    let backlog = 0;
    let inProgress = 0;
    for (const issue of issues) {
        const names = (issue.labels || []).map((l) => l.name);
        if (names.includes('status:in-progress')) inProgress += 1;
        else if (names.includes('status:backlog')) backlog += 1;
    }
    return { backlog, inProgress, total: issues.length, parseError: false };
}

function findLatestRunReport(filenames) {
    const runRe = /^run-(\d+)-summary\.md$/;
    let best = null;
    let bestNum = -1;
    for (const name of filenames) {
        const m = name.match(runRe);
        if (!m) continue;
        const n = Number(m[1]);
        if (n > bestNum) {
            bestNum = n;
            best = name;
        }
    }
    return best;
}

function summariseRunReport(contents) {
    const lines = contents.split(/\r?\n/);
    const h1Index = lines.findIndex((l) => /^#\s+/.test(l));
    if (h1Index === -1) return '(no H1 found)';
    const h1 = lines[h1Index].replace(/^#\s+/, '').trim();
    return h1;
}

function extractRecentDecisions(contents, n = 3) {
    const idRe = /D-\d{8}-\d{3}/g;
    const hits = contents.match(idRe) || [];
    const seen = new Set();
    const ordered = [];
    for (const id of hits) {
        if (!seen.has(id)) {
            seen.add(id);
            ordered.push(id);
        }
    }
    return ordered.slice(-n).reverse();
}

/**
 * Format the MCP section of the tick report. Pure — takes
 * {connected, failed, skipped} (from summariseStatus) + a map of MCP
 * observations {toolName → {result | error}}, returns markdown lines.
 */
function formatMcpBlock(status, observations = {}) {
    const lines = [];
    const totalDeclared = status.connected.length + status.failed.length + status.skipped.length;

    if (totalDeclared === 0) {
        lines.push('- No MCP servers declared in `.mcp.json`.');
        return lines;
    }

    if (status.connected.length) {
        lines.push(`- **Connected** (${status.connected.length}): ${status.connected.map((n) => `\`${n}\``).join(', ')}`);
    }
    if (status.failed.length) {
        const detail = status.failed.map((f) => `\`${f.name}\` (${f.error})`).join(', ');
        lines.push(`- **Failed** (${status.failed.length}): ${detail}`);
    }
    if (status.skipped.length) {
        const detail = status.skipped.map((s) => `\`${s.name}\` — ${s.reason}`).join(', ');
        lines.push(`- **Skipped** (${status.skipped.length}): ${detail}`);
    }

    const obsEntries = Object.entries(observations);
    if (obsEntries.length) {
        lines.push('');
        lines.push('### MCP Observations');
        for (const [label, obs] of obsEntries) {
            if (obs.error) {
                lines.push(`- \`${label}\`: ⚠️ ${obs.error}`);
            } else {
                const preview = JSON.stringify(obs.result).slice(0, 240);
                lines.push(`- \`${label}\`: ${preview}${JSON.stringify(obs.result).length > 240 ? '…' : ''}`);
            }
        }
    }

    return lines;
}

/**
 * Format the Cohesion gate section of the tick report. Pure — takes a
 * cohesionGate result ({passed, blockingFailures, flaggedFailures,
 * reportPath, skipReason?}) and returns an array of markdown lines.
 *
 * When the gate was skipped (reportPath === null), the skipReason is shown
 * instead of a PASS/FAIL verdict — callers treat skipped as non-blocking.
 */
function formatCohesionGateBlock(gate) {
    if (!gate) return ['- (gate did not run this tick)'];
    const lines = [];
    if (gate.reportPath === null && gate.skipReason) {
        lines.push(`- **SKIPPED** — ${gate.skipReason}`);
        return lines;
    }
    const verdict = gate.passed ? 'PASS' : 'FAIL';
    lines.push(`- **${verdict}**`);
    if (gate.reportPath) {
        lines.push(`- Report: \`${gate.reportPath}\``);
    }
    if (gate.blockingFailures && gate.blockingFailures.length) {
        lines.push('- Blocking failures:');
        for (const f of gate.blockingFailures) {
            lines.push(`  - \`${f.name}\` (status ${f.status})`);
        }
    }
    if (gate.flaggedFailures && gate.flaggedFailures.length) {
        lines.push('- Flagged failures (non-blocking):');
        for (const f of gate.flaggedFailures) {
            lines.push(`  - \`${f.name}\` (status ${f.status})`);
        }
    }
    return lines;
}

function formatTickReport(state) {
    const { timestamp, git, issues, latestRun, recentDecisions, mcpStatus, mcpObservations, cohesionGate } = state;
    const issueLine = issues.parseError
        ? '⚠️ gh output did not parse; check authentication.'
        : `${issues.backlog} backlog · ${issues.inProgress} in-progress · ${issues.total} total`;
    const decisionLine = recentDecisions.length
        ? recentDecisions.join(' · ')
        : '(none found)';
    const runLine = latestRun
        ? `**${latestRun.filename}** — ${latestRun.headline}`
        : '(no run-*-summary.md found)';

    const mcpLines = formatMcpBlock(mcpStatus || { connected: [], failed: [], skipped: [] }, mcpObservations || {});
    const cohesionLines = formatCohesionGateBlock(cohesionGate);

    return [
        `# Heartbeat Tick — ${timestamp}`,
        '',
        '## Git',
        `- Branch: \`${git.branch}\``,
        `- HEAD:   \`${git.sha}\``,
        '',
        '## GitHub Issues',
        `- ${issueLine}`,
        '',
        '## Latest Run Report',
        `- ${runLine}`,
        '',
        '## Recent Decision IDs',
        `- ${decisionLine}`,
        '',
        '## MCP Servers',
        ...mcpLines,
        '',
        '## Cohesion gate',
        ...cohesionLines,
        '',
        '---',
        '_Generated by `heartbeat.js` v1 (per Issue #21, D-20260417-020; §A.3 gate per Issue #123)._',
        '',
    ].join('\n');
}

/* ---------------------- side-effectful wrappers ---------------------- */

/**
 * Thin wrapper around lib/guardrails.js#safeSpawn that preserves the legacy
 * stdout-or-empty-string contract used across this file: on success returns
 * the child's stdout; on any non-zero exit, spawn error, or missing stdout,
 * returns ''. NEVER throws for the no-allowlist call path (Issue #129).
 *
 * `options._spawnImpl` is a test-only injection seam threaded through to
 * safeSpawn's guard config — production callers MUST NOT pass it. All other
 * keys in `options` are forwarded as spawnOptions (cwd, encoding, stdio, …).
 *
 * Migrated from execFileSync + catch per Issue #129 / Phase 3 §C.1.c.
 */
function runShell(cmd, args, options = {}) {
    const { _spawnImpl, ...spawnOptions } = options;
    const result = safeSpawn(cmd, args, {
        spawnOptions: {
            encoding: 'utf8',
            cwd: REPO_ROOT,
            stdio: ['ignore', 'pipe', 'pipe'],
            ...spawnOptions,
        },
        _spawnImpl,
    });
    // spawnSync returns {status, stdout, stderr, error, signal, pid}. Parity
    // with the prior execFileSync+catch: return stdout-or-empty regardless of
    // exit code or spawn error. safeSpawn itself does not throw on this path
    // because (a) args is an Array and (b) no allowCmds is supplied.
    return (result && result.stdout) || '';
}

function readGitState() {
    const branch = runShell('git', ['branch', '--show-current']);
    const sha = runShell('git', ['rev-parse', '--short', 'HEAD']);
    return parseGitState(branch, sha);
}

function readIssueCounts() {
    const json = runShell('gh', ['issue', 'list', '--state', 'open', '--limit', '100', '--json', 'number,state,labels']);
    if (!json.trim()) return { backlog: 0, inProgress: 0, total: 0, parseError: true };
    return parseIssueCounts(json);
}

function readLatestRunReport() {
    if (!existsSync(REPORTS_DIR)) return null;
    const files = readdirSync(REPORTS_DIR);
    const filename = findLatestRunReport(files);
    if (!filename) return null;
    const contents = readFileSync(join(REPORTS_DIR, filename), 'utf8');
    return { filename, headline: summariseRunReport(contents) };
}

function readRecentDecisions(n = 3) {
    if (!existsSync(DECISION_LOG)) return [];
    const contents = readFileSync(DECISION_LOG, 'utf8');
    return extractRecentDecisions(contents, n);
}

function writeTickReport(timestamp, report) {
    if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
    const safeStamp = timestamp.replace(/[:.]/g, '-');
    const path = join(REPORTS_DIR, `heartbeat-tick-${safeStamp}.md`);
    writeFileSync(path, report, 'utf8');
    return path;
}

/**
 * Collect a few MCP-derived observations. v1 tries mempalace first; if it
 * isn't connected, the observations block is empty. Never throws.
 */
async function collectMcpObservations(clientsByName) {
    const observations = {};
    const mempalace = clientsByName.mempalace;
    if (mempalace && mempalace.status === 'connected') {
        const probe = await safeCallTool(mempalace, 'mempalace_search', { query: 'recent observations', limit: 3 });
        observations['mempalace.search(recent)'] = probe.error ? { error: probe.error } : { result: probe.result };
    }
    return observations;
}

/* --------------------------- main tick --------------------------- */

/**
 * Run the §A.3 cohesion gate. Never throws — the gate module itself
 * handles internal failures by returning a skip result. Any error from the
 * gate wiring (e.g. require() exploding on something odd) is caught here
 * so the heartbeat tick always completes.
 */
async function runCohesionGateSafely(projectRoot = REPO_ROOT, options = {}) {
    try {
        return await runCohesionGate({ projectRoot, options });
    } catch (err) {
        return {
            passed: true,
            blockingFailures: [],
            flaggedFailures: [],
            reportPath: null,
            skipReason: `cohesion-check unavailable (${err.message})`,
        };
    }
}

async function tick(clientsByName = {}, options = {}) {
    const timestamp = new Date().toISOString();
    const git = readGitState();
    const issues = readIssueCounts();
    const latestRun = readLatestRunReport();
    const recentDecisions = readRecentDecisions(3);
    const mcpStatus = summariseStatus(clientsByName);
    const mcpObservations = await collectMcpObservations(clientsByName);
    const cohesionGate = options.skipCohesionGate
        ? null
        : await runCohesionGateSafely(REPO_ROOT, options.cohesionGateOptions || {});

    const state = {
        timestamp,
        git,
        issues,
        latestRun,
        recentDecisions,
        mcpStatus,
        mcpObservations,
        cohesionGate,
    };
    const report = formatTickReport(state);
    const path = writeTickReport(timestamp, report);

    const gateMarker = cohesionGate
        ? (cohesionGate.reportPath === null && cohesionGate.skipReason
            ? 'skip'
            : (cohesionGate.passed ? 'pass' : 'fail'))
        : 'off';
    console.log(
        `[heartbeat] ${timestamp} — ${git.branch}@${git.sha} — ` +
        `mcp ${mcpStatus.connected.length}c/${mcpStatus.failed.length}f/${mcpStatus.skipped.length}s — ` +
        `gate ${gateMarker} — ` +
        `wrote ${path}`,
    );
    return { state, path };
}

async function main(argv = process.argv.slice(2)) {
    const watch = argv.includes('--watch');
    const intervalMs = Number(process.env.HEARTBEAT_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

    console.log('[heartbeat] connecting MCP servers from .mcp.json …');
    const clients = await connectServers(loadMcpConfig(MCP_CONFIG));

    const cleanup = async () => {
        console.log('[heartbeat] disconnecting MCP servers …');
        await disconnectAll(clients);
    };

    try {
        await tick(clients);
    } catch (err) {
        console.error('[heartbeat] tick failed:', err.message);
    }

    if (!watch) {
        await cleanup();
        return;
    }

    console.log(`[heartbeat] watch mode — ticking every ${intervalMs}ms. Ctrl+C to stop.`);
    const timer = setInterval(async () => {
        try { await tick(clients); }
        catch (err) { console.error('[heartbeat] tick failed:', err.message); }
    }, intervalMs);

    process.on('SIGINT', async () => {
        clearInterval(timer);
        await cleanup();
        process.exit(0);
    });
}

if (require.main === module) {
    main().catch((err) => {
        console.error('[heartbeat] fatal:', err);
        process.exit(1);
    });
}

module.exports = {
    // pure helpers
    parseGitState,
    parseIssueCounts,
    findLatestRunReport,
    summariseRunReport,
    extractRecentDecisions,
    formatMcpBlock,
    formatCohesionGateBlock,
    formatTickReport,
    // side-effectful
    runShell,
    collectMcpObservations,
    runCohesionGateSafely,
    tick,
    main,
};
