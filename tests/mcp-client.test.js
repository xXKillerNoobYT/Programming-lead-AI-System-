'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { writeFileSync, unlinkSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
    loadMcpConfig,
    classifyTransport,
    summariseStatus,
    expandEnvPlaceholders,
    expandStdioConfig,
    safeCallTool,
    withTimeout,
} = require('../lib/mcp-client.js');

/* --------------------------- loadMcpConfig --------------------------- */

describe('loadMcpConfig', () => {
    test('returns empty mcpServers when file is missing', () => {
        const config = loadMcpConfig(join(tmpdir(), 'definitely-not-there.json'));
        assert.deepEqual(config, { mcpServers: {} });
    });

    test('parses a valid config', () => {
        const dir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
        const path = join(dir, 'mcp.json');
        try {
            writeFileSync(path, JSON.stringify({
                mcpServers: {
                    foo: { command: 'echo', args: ['hi'] },
                    bar: { type: 'streamable-http', url: 'https://example.com' },
                },
            }));
            const config = loadMcpConfig(path);
            assert.equal(Object.keys(config.mcpServers).length, 2);
            assert.equal(config.mcpServers.foo.command, 'echo');
            assert.equal(config.mcpServers.bar.type, 'streamable-http');
        } finally {
            try { unlinkSync(path); } catch { /* noop */ }
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('returns empty mcpServers on malformed JSON', () => {
        const dir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
        const path = join(dir, 'mcp.json');
        try {
            writeFileSync(path, '{ not json }');
            const config = loadMcpConfig(path);
            assert.deepEqual(config, { mcpServers: {} });
        } finally {
            try { unlinkSync(path); } catch { /* noop */ }
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('returns empty mcpServers when top-level key is missing', () => {
        const dir = mkdtempSync(join(tmpdir(), 'mcp-test-'));
        const path = join(dir, 'mcp.json');
        try {
            writeFileSync(path, JSON.stringify({ otherField: 1 }));
            const config = loadMcpConfig(path);
            assert.deepEqual(config, { mcpServers: {} });
        } finally {
            try { unlinkSync(path); } catch { /* noop */ }
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

/* -------------------------- classifyTransport -------------------------- */

describe('classifyTransport', () => {
    test('identifies stdio when command is present', () => {
        assert.equal(classifyTransport({ command: 'npx', args: [] }), 'stdio');
    });

    test('returns the declared type for HTTP-family servers', () => {
        assert.equal(classifyTransport({ type: 'streamable-http', url: 'https://x' }), 'streamable-http');
        assert.equal(classifyTransport({ type: 'sse', url: 'https://x' }), 'sse');
        assert.equal(classifyTransport({ type: 'ws', url: 'wss://x' }), 'ws');
    });

    test('returns "unknown" for malformed configs', () => {
        assert.equal(classifyTransport(null), 'unknown');
        assert.equal(classifyTransport({}), 'unknown');
        assert.equal(classifyTransport({ type: 'http' }), 'unknown'); // no url
        assert.equal(classifyTransport({ url: 'https://x' }), 'unknown'); // no type
    });
});

/* ---------------------------- summariseStatus ---------------------------- */

describe('summariseStatus', () => {
    test('buckets records by status', () => {
        const out = summariseStatus({
            a: { status: 'connected' },
            b: { status: 'failed', error: 'timeout' },
            c: { status: 'skipped', reason: 'unsupported transport: ws' },
            d: { status: 'connected' },
        });
        assert.deepEqual(out.connected.sort(), ['a', 'd']);
        assert.deepEqual(out.failed, [{ name: 'b', error: 'timeout' }]);
        assert.deepEqual(out.skipped, [{ name: 'c', reason: 'unsupported transport: ws' }]);
    });

    test('returns empty arrays for empty input', () => {
        const out = summariseStatus({});
        assert.deepEqual(out, { connected: [], failed: [], skipped: [] });
    });
});

/* ---------------------- placeholder expansion ---------------------- */

describe('expandEnvPlaceholders', () => {
    test('expands ${VAR} placeholders from provided env', () => {
        const out = expandEnvPlaceholders('x-${FOO}-y', { FOO: 'bar' });
        assert.deepEqual(out, { ok: true, value: 'x-bar-y' });
    });

    test('reports missing vars for unresolved placeholders', () => {
        const out = expandEnvPlaceholders('${A}-${B}', { A: '1' });
        assert.equal(out.ok, false);
        assert.deepEqual(out.missing, ['B']);
    });
});

describe('expandStdioConfig', () => {
    test('expands placeholders in command/args/env', () => {
        const out = expandStdioConfig({
            command: '${NODE_BIN}',
            args: ['--cwd', '${WORKSPACE_DIR}'],
            env: { TOKEN: '${API_TOKEN}', STATIC: 'ok' },
        }, {
            NODE_BIN: 'node',
            WORKSPACE_DIR: '/repo',
            API_TOKEN: 'secret',
        });
        assert.equal(out.ok, true);
        assert.deepEqual(out.value, {
            command: 'node',
            args: ['--cwd', '/repo'],
            env: { TOKEN: 'secret', STATIC: 'ok' },
        });
    });

    test('returns missing vars when placeholders are unresolved', () => {
        const out = expandStdioConfig({
            command: 'npx',
            args: ['${MISSING_ARG}'],
            env: { TOKEN: '${MISSING_ENV}' },
        }, {});
        assert.equal(out.ok, false);
        assert.deepEqual(out.missing, ['MISSING_ARG', 'MISSING_ENV']);
    });
});

/* ---------------------------- safeCallTool ---------------------------- */

describe('safeCallTool', () => {
    test('refuses when server is not connected', async () => {
        const out = await safeCallTool({ status: 'failed' }, 'foo', {});
        assert.match(out.error, /not connected/);
    });

    test('refuses when record is nullish', async () => {
        const out = await safeCallTool(null, 'foo', {});
        assert.match(out.error, /not connected/);
    });

    test('refuses when tool is not on server', async () => {
        const record = { status: 'connected', client: {}, tools: [{ name: 'bar' }] };
        const out = await safeCallTool(record, 'foo', {});
        assert.match(out.error, /tool "foo" not found/);
    });

    test('returns result from a fake client', async () => {
        const record = {
            status: 'connected',
            tools: [{ name: 'ping' }],
            client: {
                callTool: async ({ name, arguments: args }) => ({ echoed: { name, args } }),
            },
        };
        const out = await safeCallTool(record, 'ping', { msg: 'hi' });
        assert.deepEqual(out.result, { echoed: { name: 'ping', args: { msg: 'hi' } } });
    });

    test('returns error when fake client throws', async () => {
        const record = {
            status: 'connected',
            tools: [{ name: 'ping' }],
            client: { callTool: async () => { throw new Error('boom'); } },
        };
        const out = await safeCallTool(record, 'ping');
        assert.match(out.error, /boom/);
    });
});

/* ------------------------------- withTimeout ------------------------------ */

describe('withTimeout', () => {
    test('resolves when inner promise resolves in time', async () => {
        const v = await withTimeout(Promise.resolve(42), 1000, 'fast');
        assert.equal(v, 42);
    });

    test('rejects with timeout error when inner promise is slow', async () => {
        const slow = new Promise((resolve) => setTimeout(() => resolve('late'), 200));
        await assert.rejects(
            withTimeout(slow, 20, 'tooSlow'),
            /timeout after 20ms: tooSlow/,
        );
    });

    test('propagates inner promise rejection', async () => {
        await assert.rejects(
            withTimeout(Promise.reject(new Error('inner fail')), 1000, 'label'),
            /inner fail/,
        );
    });
});
