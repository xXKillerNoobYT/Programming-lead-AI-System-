'use strict';

/*
 * lib/mcp-client.js — thin wrapper around @modelcontextprotocol/sdk for
 * heartbeat.js. Connects to stdio MCP servers declared in .mcp.json,
 * collects their tool lists, and exposes a safe-call helper.
 *
 * Design goals:
 *   - Graceful degradation. A single misbehaving server never crashes the
 *     heartbeat tick.
 *   - Transparent status. Every server's outcome (connected / failed /
 *     skipped) is surfaced to the caller for inclusion in the tick report.
 *   - Transport-aware. This v0 only handles the stdio transport (command +
 *     args + env). Remote transports (streamable-http, sse, ws) are marked
 *     `skipped` with a reason.
 *
 * Per Issue #21 + D-20260417-020.
 */

const { readFileSync, existsSync } = require('node:fs');

// The SDK is ESM-first but exposes CJS-compatible paths via the package
// `exports` map. Import paths below resolve to the dist/cjs build.
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const CONNECT_TIMEOUT_MS = Number(process.env.MCP_CONNECT_TIMEOUT_MS) || 30_000;
const CLIENT_NAME = 'devlead-heartbeat';
const CLIENT_VERSION = '0.1.0';

/* --------------------------- pure helpers --------------------------- */

/**
 * Load and parse `.mcp.json`. Returns `{mcpServers: {...}}` on success or
 * an empty object on any failure (missing file, bad JSON).
 */
function loadMcpConfig(configPath) {
    if (!existsSync(configPath)) return { mcpServers: {} };
    try {
        const raw = readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return { mcpServers: {} };
        const mcpServers = parsed.mcpServers;
        if (!mcpServers || typeof mcpServers !== 'object' || Array.isArray(mcpServers)) {
            return { mcpServers: {} };
        }
        return { mcpServers };
    } catch {
        return { mcpServers: {} };
    }
}

/**
 * Classify a server config by transport type. stdio servers have `command`;
 * remote servers have `type` + `url`. Anything else is `unknown` and gets
 * skipped.
 */
function classifyTransport(serverConfig) {
    if (!serverConfig || typeof serverConfig !== 'object') return 'unknown';
    if (serverConfig.command) return 'stdio';
    if (serverConfig.type && serverConfig.url) return serverConfig.type; // streamable-http, sse, ws
    return 'unknown';
}

/**
 * Build a status summary from the {name → record} map returned by
 * connectServers. Pure — used for tick reporting.
 */
function summariseStatus(clientsByName) {
    const connected = [];
    const failed = [];
    const skipped = [];
    for (const [name, record] of Object.entries(clientsByName)) {
        if (record.status === 'connected') connected.push(name);
        else if (record.status === 'failed') failed.push({ name, error: record.error });
        else skipped.push({ name, reason: record.reason });
    }
    return { connected, failed, skipped };
}

/* ---------------------- side-effectful wrappers ---------------------- */

/**
 * Connect to a single stdio MCP server. Returns a record; never throws.
 * The record always has a `status`; on success it also has `client` and
 * `tools`.
 */
async function connectStdioServer(name, serverConfig) {
    const transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: { ...process.env, ...(serverConfig.env || {}) },
        stderr: 'pipe', // keep child stderr off the heartbeat's own stderr
    });
    const client = new Client(
        { name: CLIENT_NAME, version: CLIENT_VERSION },
        { capabilities: {} },
    );

    try {
        await withTimeout(client.connect(transport), CONNECT_TIMEOUT_MS, `connect ${name}`);
        const toolsResp = await withTimeout(client.listTools(), CONNECT_TIMEOUT_MS, `listTools ${name}`);
        const tools = (toolsResp && toolsResp.tools) || [];
        return { status: 'connected', client, tools };
    } catch (err) {
        try { await client.close(); } catch { /* swallow */ }
        return { status: 'failed', error: err.message || String(err) };
    }
}

/**
 * Connect to every server declared in an mcp-config object. Returns a map
 * from server name to a status record. Never throws.
 */
async function connectServers(config) {
    const entries = Object.entries(config.mcpServers || {});
    const records = await Promise.all(
        entries.map(async ([name, serverConfig]) => {
            const transportKind = classifyTransport(serverConfig);
            if (transportKind !== 'stdio') {
                return [name, { status: 'skipped', reason: `unsupported transport: ${transportKind}` }];
            }
            const record = await connectStdioServer(name, serverConfig);
            return [name, record];
        }),
    );
    return Object.fromEntries(records);
}

/**
 * Safely call a named tool on a connected client. Returns the tool result
 * on success or `{ error: string }` on any failure. Never throws.
 */
async function safeCallTool(record, toolName, args = {}) {
    if (!record || record.status !== 'connected' || !record.client) {
        return { error: 'server not connected' };
    }
    if (!record.tools.some((t) => t.name === toolName)) {
        return { error: `tool "${toolName}" not found on this server` };
    }
    try {
        const result = await withTimeout(
            record.client.callTool({ name: toolName, arguments: args }),
            CONNECT_TIMEOUT_MS,
            `callTool ${toolName}`,
        );
        return { result };
    } catch (err) {
        return { error: err.message || String(err) };
    }
}

/**
 * Close every client in a {name → record} map. Never throws.
 */
async function disconnectAll(clientsByName) {
    await Promise.all(
        Object.values(clientsByName).map(async (record) => {
            if (record && record.status === 'connected' && record.client) {
                try { await record.client.close(); } catch { /* swallow */ }
            }
        }),
    );
}

/* --------------------------- internal --------------------------- */

function withTimeout(promise, ms, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms: ${label}`)), ms);
    });
    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        timeout,
    ]);
}

module.exports = {
    // pure
    loadMcpConfig,
    classifyTransport,
    summariseStatus,
    // side-effectful
    connectStdioServer,
    connectServers,
    safeCallTool,
    disconnectAll,
    // internal (exported for testing)
    withTimeout,
};
