'use strict';

/*
 * Phase 3 §C.2 audit trail (Issue #131).
 *
 * Contract tests for lib/audit-trail.js#writeAuditRecord — the structured
 * JSON sibling written alongside every markdown heartbeat tick report.
 *
 * Design rationale (why these cases):
 *   - Future tools (cohesion runner, dashboard Log tab, CI) must be able to
 *     parse heartbeat output without walking markdown. So the v1 schema is
 *     locked: schemaVersion=1, timestamp, writer, state passthrough,
 *     filesTouched array.
 *   - Follows lib/guardrails.js#recordGuardrailViolation's never-throws
 *     discipline: disk-full / perm-denied / missing projectRoot MUST NOT
 *     crash the tick. Returns {skipped:true, skipReason}.
 *   - Filename convention matches heartbeat.js#writeTickReport (colons +
 *     dots replaced with dashes) so the .md and .json stems correlate.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { writeAuditRecord } = require('../lib/audit-trail.js');

function mkTmpRoot() {
    return mkdtempSync(path.join(os.tmpdir(), 'audit-trail-test-'));
}

describe('writeAuditRecord — happy path', () => {
    test('writes valid JSON at reports/audit/<timestamp>.json', () => {
        const root = mkTmpRoot();
        try {
            const timestamp = '2026-04-19T12:34:56.789Z';
            const state = { git: { branch: 'main', sha: 'abc' }, issues: { backlog: 3 } };
            const filesTouched = [path.join(root, 'reports', 'heartbeat-tick-x.md')];

            const result = writeAuditRecord({ projectRoot: root, timestamp, state, filesTouched });

            assert.ok(result.path, 'should return path');
            assert.equal(result.skipped, undefined, 'should not be skipped on happy path');
            assert.ok(existsSync(result.path), 'file should exist at returned path');

            const parsed = JSON.parse(readFileSync(result.path, 'utf8'));
            assert.equal(parsed.schemaVersion, 1);
            assert.equal(parsed.timestamp, timestamp);
            assert.deepEqual(parsed.state, state);
            assert.deepEqual(parsed.filesTouched, filesTouched);
            assert.deepEqual(parsed.writer, { name: 'heartbeat.js', version: 'v1' });
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('nested state passthrough preserves cohesionGate fields', () => {
        const root = mkTmpRoot();
        try {
            const timestamp = '2026-04-19T00:00:00.000Z';
            const state = {
                cohesionGate: {
                    passed: false,
                    blockingFailures: [{ name: 'check:tests', status: 1 }],
                    flaggedFailures: [],
                    reportPath: '/tmp/cohesion.json',
                },
                mcpStatus: { connected: ['mempalace'], failed: [], skipped: [] },
            };
            const result = writeAuditRecord({ projectRoot: root, timestamp, state, filesTouched: [] });
            const parsed = JSON.parse(readFileSync(result.path, 'utf8'));
            // deepEqual ensures nothing was flattened/stripped.
            assert.deepEqual(parsed.state.cohesionGate, state.cohesionGate);
            assert.deepEqual(parsed.state.mcpStatus, state.mcpStatus);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('missing reports/audit/ directory is created automatically', () => {
        const root = mkTmpRoot();
        try {
            // No reports/ at all — writer must mkdir -p.
            assert.ok(!existsSync(path.join(root, 'reports')), 'precondition: no reports dir');
            const result = writeAuditRecord({
                projectRoot: root,
                timestamp: '2026-04-19T01:02:03.004Z',
                state: {},
                filesTouched: [],
            });
            assert.ok(result.path);
            assert.ok(existsSync(path.join(root, 'reports', 'audit')));
            assert.ok(existsSync(result.path));
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('timestamp colons and dots are replaced with dashes in filename', () => {
        const root = mkTmpRoot();
        try {
            const timestamp = '2026-04-19T12:34:56.789Z';
            const result = writeAuditRecord({
                projectRoot: root,
                timestamp,
                state: {},
                filesTouched: [],
            });
            const base = path.basename(result.path);
            // Same convention as heartbeat.js#writeTickReport: /[:.]/g → '-'.
            assert.equal(base, '2026-04-19T12-34-56-789Z.json');
            // Sanity: no raw colons or dots in the basename (except the .json ext).
            const stem = base.replace(/\.json$/, '');
            assert.ok(!stem.includes(':'));
            assert.ok(!stem.includes('.'));
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('filesTouched defaults to [] when not an array', () => {
        const root = mkTmpRoot();
        try {
            const result = writeAuditRecord({
                projectRoot: root,
                timestamp: '2026-04-19T00:00:00.000Z',
                state: {},
                // intentionally wrong type — writer should not crash
                filesTouched: null,
            });
            const parsed = JSON.parse(readFileSync(result.path, 'utf8'));
            assert.deepEqual(parsed.filesTouched, []);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('writeAuditRecord — never-throws on failure', () => {
    test('returns {skipped:true} when parent path is a file, does NOT throw', () => {
        const root = mkTmpRoot();
        try {
            // Create `reports` as a FILE so mkdirSync fails when trying to
            // create `reports/audit/` inside it. This is the same kind of
            // failure recordGuardrailViolation swallows.
            const bogusReportsPath = path.join(root, 'reports');
            writeFileSync(bogusReportsPath, 'not a dir', 'utf8');

            let caught = null;
            let result;
            try {
                result = writeAuditRecord({
                    projectRoot: root,
                    timestamp: '2026-04-19T00:00:00.000Z',
                    state: {},
                    filesTouched: [],
                });
            } catch (err) {
                caught = err;
            }
            assert.equal(caught, null, 'must never throw');
            assert.equal(result.path, null);
            assert.equal(result.skipped, true);
            assert.ok(result.skipReason, 'skipReason must be populated');
            assert.equal(typeof result.skipReason, 'string');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('returns {skipped:true} when projectRoot is missing / null', () => {
        let result;
        let caught = null;
        try {
            result = writeAuditRecord({
                projectRoot: null,
                timestamp: '2026-04-19T00:00:00.000Z',
                state: {},
                filesTouched: [],
            });
        } catch (err) {
            caught = err;
        }
        assert.equal(caught, null, 'must never throw on null projectRoot');
        assert.equal(result.path, null);
        assert.equal(result.skipped, true);
    });

    test('returns {skipped:true} when argument object is entirely missing', () => {
        let result;
        let caught = null;
        try {
            result = writeAuditRecord();
        } catch (err) {
            caught = err;
        }
        assert.equal(caught, null, 'must never throw even on zero args');
        assert.equal(result.skipped, true);
    });
});

describe('writeAuditRecord — timestamp validation gate (Issue #132)', () => {
    // Background: PR #133 review of §C.2 found that missing/non-string
    // `timestamp` silently produced a literal `.json` filename (empty stem +
    // extension) and consecutive undefined-timestamp calls overwrote the same
    // file. Production heartbeat.js#tick always passes a valid ISO string, so
    // no live bug — but a future caller could trip it without warning. Gate
    // must short-circuit to the skip branch mirroring the projectRoot gate.
    //
    // Same tmp-dir discipline as the "never-throws on failure" block above:
    // even though these calls should reject before mkdir/write, the cleanup
    // runs in `finally` so a regressing gate doesn't leak an `.json` file.

    test('returns {skipped:true, skipReason:"timestamp missing"} when timestamp is undefined', () => {
        const root = mkTmpRoot();
        try {
            const result = writeAuditRecord({
                projectRoot: root,
                timestamp: undefined,
                state: {},
                filesTouched: [],
            });
            assert.equal(result.path, null);
            assert.equal(result.skipped, true);
            assert.equal(result.skipReason, 'timestamp missing');
            // Verify no stray `.json` file was written into reports/audit/.
            assert.equal(
                existsSync(path.join(root, 'reports', 'audit', '.json')),
                false,
                'must not create reports/audit/.json on undefined timestamp',
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('returns {skipped:true, skipReason:"timestamp missing"} when timestamp is null', () => {
        const root = mkTmpRoot();
        try {
            const result = writeAuditRecord({
                projectRoot: root,
                timestamp: null,
                state: {},
                filesTouched: [],
            });
            assert.equal(result.path, null);
            assert.equal(result.skipped, true);
            assert.equal(result.skipReason, 'timestamp missing');
            assert.equal(
                existsSync(path.join(root, 'reports', 'audit', '.json')),
                false,
                'must not create reports/audit/.json on null timestamp',
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('returns {skipped:true, skipReason:"timestamp missing"} when timestamp is empty string', () => {
        const root = mkTmpRoot();
        try {
            const result = writeAuditRecord({
                projectRoot: root,
                timestamp: '',
                state: {},
                filesTouched: [],
            });
            assert.equal(result.path, null);
            assert.equal(result.skipped, true);
            assert.equal(result.skipReason, 'timestamp missing');
            assert.equal(
                existsSync(path.join(root, 'reports', 'audit', '.json')),
                false,
                'must not create reports/audit/.json on empty-string timestamp',
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('returns {skipped:true, skipReason:"timestamp missing"} when timestamp is a number', () => {
        const root = mkTmpRoot();
        try {
            const result = writeAuditRecord({
                projectRoot: root,
                timestamp: 42,
                state: {},
                filesTouched: [],
            });
            assert.equal(result.path, null);
            assert.equal(result.skipped, true);
            assert.equal(result.skipReason, 'timestamp missing');
            assert.equal(
                existsSync(path.join(root, 'reports', 'audit', '.json')),
                false,
                'must not create reports/audit/.json on numeric timestamp',
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});
