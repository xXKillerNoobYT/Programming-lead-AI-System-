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

const { execFileSync } = require('node:child_process');
const { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');

const {
    loadMcpConfig,
    connectServers,
    disconnectAll,
    safeCallTool,
    summariseStatus,
} = require('./lib/mcp-client.js');

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
    const recent = [];
    for (let idx = hits.length - 1; idx >= 0; idx -= 1) {
        const id = hits[idx];
        if (seen.has(id)) continue;
        seen.add(id);
        recent.push(id);
        if (recent.length === n) break;
    }
    return recent;
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

function formatTickReport(state) {
    const { timestamp, git, issues, latestRun, recentDecisions, mcpStatus, mcpObservations } = state;
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
        '---',
        '_Generated by `heartbeat.js` v1 (per Issue #21, D-20260417-020)._',
        '',
    ].join('\n');
}

/* ---------------------- side-effectful wrappers ---------------------- */

function runShell(cmd, args, options = {}) {
    try {
        return execFileSync(cmd, args, {
            encoding: 'utf8',
            cwd: REPO_ROOT,
            stdio: ['ignore', 'pipe', 'pipe'],
            ...options,
        });
    } catch (err) {
        return err.stdout || '';
    }
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

async function tick(clientsByName = {}) {
    const timestamp = new Date().toISOString();
    const git = readGitState();
    const issues = readIssueCounts();
    const latestRun = readLatestRunReport();
    const recentDecisions = readRecentDecisions(3);
    const mcpStatus = summariseStatus(clientsByName);
    const mcpObservations = await collectMcpObservations(clientsByName);

    const state = { timestamp, git, issues, latestRun, recentDecisions, mcpStatus, mcpObservations };
    const report = formatTickReport(state);
    const path = writeTickReport(timestamp, report);

    console.log(
        `[heartbeat] ${timestamp} — ${git.branch}@${git.sha} — ` +
        `mcp ${mcpStatus.connected.length}c/${mcpStatus.failed.length}f/${mcpStatus.skipped.length}s — ` +
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
    formatTickReport,
    // side-effectful
    collectMcpObservations,
    tick,
    main,
};
