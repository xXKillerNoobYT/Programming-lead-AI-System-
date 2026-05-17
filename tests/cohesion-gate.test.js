'use strict';

/**
 * Tests for lib/cohesion-gate.js — Phase 3 §A.3 cohesion gate wiring
 * (Issue #123).
 *
 * The gate wraps dashboard/scripts/cohesion-check.js' `runCheck` primitive,
 * aggregates results into blocking vs flagged, writes a JSON report, and
 * returns a summary that heartbeat.js can surface in its tick report.
 *
 * We inject a fake `runCheck` via `options.runCheck` so tests never spawn
 * npm subprocesses (slow + flaky + side-effecting).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, existsSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const { runCohesionGate } = require('../lib/cohesion-gate.js');

/* ------------------------------ helpers ------------------------------ */

function makeFakeRunCheck(resultByName) {
    return function fakeRunCheck(name) {
        const preset = resultByName[name];
        if (!preset) {
            throw new Error(`fakeRunCheck: no preset for ${name}`);
        }
        return {
            name,
            tier: preset.tier,
            status: preset.status,
            durationMs: preset.durationMs ?? 1,
            stdout: preset.stdout ?? '',
            stderr: preset.stderr ?? '',
        };
    };
}

function freshProjectRoot() {
    return mkdtempSync(join(tmpdir(), 'cohesion-gate-test-'));
}

/* --------------------------- blocking-pass --------------------------- */

describe('runCohesionGate — blocking-pass', () => {
    test('all blocking + flagged checks pass → passed=true, no failures', async () => {
        const root = freshProjectRoot();
        try {
            const runCheck = makeFakeRunCheck({
                'check:tests': { tier: 'blocking', status: 0 },
                'check:types': { tier: 'blocking', status: 0 },
                'check:coverage-threshold': { tier: 'blocking', status: 0 },
                'check:lint': { tier: 'flagged', status: 0 },
                'check:arch': { tier: 'flagged', status: 0 },
                'check:deps': { tier: 'flagged', status: 0 },
            });
            const result = await runCohesionGate({ projectRoot: root, options: { runCheck } });
            assert.equal(result.passed, true);
            assert.deepEqual(result.blockingFailures, []);
            assert.deepEqual(result.flaggedFailures, []);
            assert.ok(result.reportPath, 'expected reportPath to be set');
            assert.ok(existsSync(result.reportPath), 'report file should exist');
            // Report should be valid JSON containing the checks
            const report = JSON.parse(readFileSync(result.reportPath, 'utf8'));
            assert.equal(report.passedBlocking, true);
            assert.ok(Array.isArray(report.blocking));
            assert.ok(Array.isArray(report.flagged));
            assert.equal(report.blocking.length, 3);
            assert.equal(report.flagged.length, 3);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

/* --------------------------- blocking-fail --------------------------- */

describe('runCohesionGate — blocking-fail', () => {
    test('a blocking check non-zero status → passed=false, blockingFailures lists it', async () => {
        const root = freshProjectRoot();
        try {
            const runCheck = makeFakeRunCheck({
                'check:tests': { tier: 'blocking', status: 0 },
                'check:types': { tier: 'blocking', status: 2, stderr: 'type error here' },
                'check:coverage-threshold': { tier: 'blocking', status: 0 },
                'check:lint': { tier: 'flagged', status: 0 },
                'check:arch': { tier: 'flagged', status: 0 },
                'check:deps': { tier: 'flagged', status: 0 },
            });
            const result = await runCohesionGate({ projectRoot: root, options: { runCheck } });
            assert.equal(result.passed, false);
            const failingNames = result.blockingFailures.map((f) => f.name);
            assert.ok(failingNames.includes('check:types'),
                `expected check:types in blockingFailures, got ${JSON.stringify(failingNames)}`);
            assert.equal(result.flaggedFailures.length, 0);
            assert.ok(result.reportPath);
            assert.ok(existsSync(result.reportPath));
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('multiple blocking failures all reported', async () => {
        const root = freshProjectRoot();
        try {
            const runCheck = makeFakeRunCheck({
                'check:tests': { tier: 'blocking', status: 1 },
                'check:types': { tier: 'blocking', status: 1 },
                'check:coverage-threshold': { tier: 'blocking', status: 0 },
                'check:lint': { tier: 'flagged', status: 0 },
                'check:arch': { tier: 'flagged', status: 0 },
                'check:deps': { tier: 'flagged', status: 0 },
            });
            const result = await runCohesionGate({ projectRoot: root, options: { runCheck } });
            assert.equal(result.passed, false);
            const names = result.blockingFailures.map((f) => f.name).sort();
            assert.deepEqual(names, ['check:tests', 'check:types']);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

/* ---------------------- flagged-fail-still-passes ---------------------- */

describe('runCohesionGate — flagged-fail-still-passes', () => {
    test('only flagged checks fail → passed=true, flaggedFailures lists them', async () => {
        const root = freshProjectRoot();
        try {
            const runCheck = makeFakeRunCheck({
                'check:tests': { tier: 'blocking', status: 0 },
                'check:types': { tier: 'blocking', status: 0 },
                'check:coverage-threshold': { tier: 'blocking', status: 0 },
                'check:lint': { tier: 'flagged', status: 1, stderr: 'lint issues' },
                'check:arch': { tier: 'flagged', status: 0 },
                'check:deps': { tier: 'flagged', status: 1, stderr: 'outdated deps' },
            });
            const result = await runCohesionGate({ projectRoot: root, options: { runCheck } });
            assert.equal(result.passed, true, 'gate must pass when only flagged checks fail');
            assert.deepEqual(result.blockingFailures, []);
            const flaggedNames = result.flaggedFailures.map((f) => f.name).sort();
            assert.deepEqual(flaggedNames, ['check:deps', 'check:lint']);
            assert.ok(result.reportPath);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

/* ------------------- gate-runner-missing-graceful-skip ------------------- */

describe('runCohesionGate — gate-runner-missing-graceful-skip', () => {
    test('missing runner module does not crash; returns skipped result', async () => {
        const root = freshProjectRoot();
        try {
            // Simulate a runner that blows up on load/invocation by injecting
            // an options.cohesionCheckModulePath pointing at a non-existent file.
            const result = await runCohesionGate({
                projectRoot: root,
                options: { cohesionCheckModulePath: join(root, 'does-not-exist.js') },
            });
            assert.equal(result.passed, true);
            assert.deepEqual(result.blockingFailures, []);
            assert.deepEqual(result.flaggedFailures, []);
            assert.equal(result.reportPath, null);
            assert.equal(result.skipReason, 'cohesion-check unavailable');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('runner that throws during runCheck is treated as graceful skip', async () => {
        const root = freshProjectRoot();
        try {
            const runCheck = () => {
                throw new Error('boom');
            };
            const result = await runCohesionGate({ projectRoot: root, options: { runCheck } });
            assert.equal(result.passed, true);
            assert.equal(result.reportPath, null);
            assert.equal(result.skipReason, 'cohesion-check unavailable');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

/* --------------------- heartbeat integration ---------------------------- */

describe('heartbeat.js formatTickReport — cohesion gate section', () => {
    const { formatTickReport } = require('../heartbeat.js');

    const baseState = {
        timestamp: '2026-04-17T20:30:00.000Z',
        git: { branch: 'issue-123/cohesion-gate', sha: 'abc1234' },
        issues: { backlog: 3, inProgress: 1, total: 4, parseError: false },
        latestRun: { filename: 'run-207-summary.md', headline: 'Run 207 Summary' },
        recentDecisions: ['D-20260419-007'],
    };

    test('renders "Cohesion gate" section when passed=true', () => {
        const out = formatTickReport({
            ...baseState,
            cohesionGate: {
                passed: true,
                blockingFailures: [],
                flaggedFailures: [],
                reportPath: '/tmp/reports/cohesion/x.json',
            },
        });
        assert.match(out, /## Cohesion gate/);
        assert.match(out, /PASS/);
    });

    test('renders blocking failures when passed=false', () => {
        const out = formatTickReport({
            ...baseState,
            cohesionGate: {
                passed: false,
                blockingFailures: [{ name: 'check:tests', status: 1 }],
                flaggedFailures: [],
                reportPath: '/tmp/reports/cohesion/x.json',
            },
        });
        assert.match(out, /## Cohesion gate/);
        assert.match(out, /FAIL/);
        assert.match(out, /check:tests/);
    });

    test('renders skip reason when gate skipped', () => {
        const out = formatTickReport({
            ...baseState,
            cohesionGate: {
                passed: true,
                blockingFailures: [],
                flaggedFailures: [],
                reportPath: null,
                skipReason: 'cohesion-check unavailable',
            },
        });
        assert.match(out, /## Cohesion gate/);
        assert.match(out, /cohesion-check unavailable/);
    });

    test('omits section gracefully when cohesionGate absent (back-compat)', () => {
        // Existing callers without the new field should still get a valid
        // report. We don't require the section to render, only that
        // formatTickReport doesn't throw.
        const out = formatTickReport({ ...baseState });
        assert.ok(typeof out === 'string' && out.length > 0);
    });
});
