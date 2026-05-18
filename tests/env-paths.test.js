'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { pickPath, resolveRepoPaths } = require('../lib/env-paths.js');

const originalEnv = { ...process.env };

beforeEach(() => {
    process.env = { ...originalEnv };
});

afterEach(() => {
    process.env = { ...originalEnv };
});

describe('pickPath', () => {
    test('uses fallback when env var is unset', () => {
        delete process.env.REPORTS_DIR;
        assert.equal(pickPath('REPORTS_DIR', 'C:\\tmp\\reports'), 'C:\\tmp\\reports');
    });

    test('resolves env var path when set', () => {
        process.env.REPORTS_DIR = '.\\reports-alt';
        assert.equal(
            pickPath('REPORTS_DIR', 'C:\\tmp\\reports'),
            path.resolve('.\\reports-alt'),
        );
    });

    test('resolves relative env var path against supplied base directory', () => {
        process.env.REPORTS_DIR = '.\\reports-alt';
        const baseDir = path.resolve('C:\\repo\\app');
        assert.equal(
            pickPath('REPORTS_DIR', 'C:\\tmp\\reports', baseDir),
            path.resolve(baseDir, '.\\reports-alt'),
        );
    });
});

describe('resolveRepoPaths', () => {
    test('returns default repo-local paths', () => {
        const repoRoot = path.resolve('C:\\repo\\app');
        delete process.env.REPORTS_DIR;
        delete process.env.DECISION_LOG_PATH;
        delete process.env.MCP_CONFIG_PATH;
        delete process.env.HEARTBEAT_PAUSE_LOCK_PATH;

        const out = resolveRepoPaths(repoRoot);
        assert.equal(out.reportsDir, path.join(repoRoot, 'reports'));
        assert.equal(out.decisionLogPath, path.join(repoRoot, 'decision-log.md'));
        assert.equal(out.mcpConfigPath, path.join(repoRoot, '.mcp.json'));
        assert.equal(out.pauseLockPath, path.join(repoRoot, '.heartbeat-paused'));
    });

    test('honors override env vars', () => {
        const repoRoot = path.resolve('C:\\repo\\app');
        process.env.REPORTS_DIR = '.\\custom-reports';
        process.env.DECISION_LOG_PATH = '.\\logs\\decision-log.md';
        process.env.MCP_CONFIG_PATH = '.\\cfg\\.mcp.local.json';
        process.env.HEARTBEAT_PAUSE_LOCK_PATH = '.\\state\\.paused';

        const out = resolveRepoPaths(repoRoot);
        assert.equal(out.reportsDir, path.resolve(repoRoot, '.\\custom-reports'));
        assert.equal(out.decisionLogPath, path.resolve(repoRoot, '.\\logs\\decision-log.md'));
        assert.equal(out.mcpConfigPath, path.resolve(repoRoot, '.\\cfg\\.mcp.local.json'));
        assert.equal(out.pauseLockPath, path.resolve(repoRoot, '.\\state\\.paused'));
    });
});
