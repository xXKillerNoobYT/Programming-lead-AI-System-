'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const {
    parseGitState,
    parseIssueCounts,
    findLatestRunReport,
    summariseRunReport,
    extractRecentDecisions,
    formatTickReport,
    runShell,
    tick,
} = require('../heartbeat.js');

describe('parseGitState', () => {
    test('trims branch and SHA output', () => {
        const s = parseGitState('  main\n', '  abc1234\n');
        assert.equal(s.branch, 'main');
        assert.equal(s.sha, 'abc1234');
    });

    test('empty branch becomes "(detached)"', () => {
        const s = parseGitState('', 'deadbee');
        assert.equal(s.branch, '(detached)');
    });

    test('empty sha becomes "unknown"', () => {
        const s = parseGitState('main', '');
        assert.equal(s.sha, 'unknown');
    });

    test('handles completely empty input', () => {
        const s = parseGitState('', '');
        assert.equal(s.branch, '(detached)');
        assert.equal(s.sha, 'unknown');
    });
});

describe('parseIssueCounts', () => {
    test('counts backlog and in-progress by label', () => {
        const json = JSON.stringify([
            { number: 1, state: 'OPEN', labels: [{ name: 'status:backlog' }, { name: 'type:bug' }] },
            { number: 2, state: 'OPEN', labels: [{ name: 'status:in-progress' }] },
            { number: 3, state: 'OPEN', labels: [{ name: 'status:backlog' }] },
            { number: 4, state: 'OPEN', labels: [] },
        ]);
        const c = parseIssueCounts(json);
        assert.equal(c.backlog, 2);
        assert.equal(c.inProgress, 1);
        assert.equal(c.total, 4);
        assert.equal(c.parseError, false);
    });

    test('in-progress label wins over backlog when both present', () => {
        const json = JSON.stringify([
            { number: 1, labels: [{ name: 'status:backlog' }, { name: 'status:in-progress' }] },
        ]);
        const c = parseIssueCounts(json);
        assert.equal(c.inProgress, 1);
        assert.equal(c.backlog, 0);
    });

    test('returns parseError:true on malformed JSON', () => {
        const c = parseIssueCounts('not json');
        assert.equal(c.parseError, true);
        assert.equal(c.total, 0);
    });

    test('returns parseError:true when input is not an array', () => {
        const c = parseIssueCounts('{"ok":1}');
        assert.equal(c.parseError, true);
    });

    test('empty array yields all-zero counts', () => {
        const c = parseIssueCounts('[]');
        assert.deepEqual(c, { backlog: 0, inProgress: 0, total: 0, parseError: false });
    });
});

describe('findLatestRunReport', () => {
    test('picks the highest run number', () => {
        const names = [
            'run-1-summary.md',
            'run-10-summary.md',
            'run-2-summary.md',
            'run-8-summary.md',
            'README.md',
        ];
        assert.equal(findLatestRunReport(names), 'run-10-summary.md');
    });

    test('ignores non-matching filenames', () => {
        assert.equal(findLatestRunReport(['foo.md', 'run-x-summary.md']), null);
    });

    test('returns null on empty input', () => {
        assert.equal(findLatestRunReport([]), null);
    });

    test('handles heartbeat-tick-*.md without mis-matching as run-*', () => {
        const names = [
            'heartbeat-tick-2026-04-17T20-00-00.md',
            'run-5-summary.md',
        ];
        assert.equal(findLatestRunReport(names), 'run-5-summary.md');
    });
});

describe('summariseRunReport', () => {
    test('returns the first H1 without the leading hash', () => {
        const md = '# Run 14 Summary — foo bar\n\n## Overview\n...';
        assert.equal(summariseRunReport(md), 'Run 14 Summary — foo bar');
    });

    test('returns a fallback when no H1 is present', () => {
        assert.equal(summariseRunReport('no heading here\njust text'), '(no H1 found)');
    });

    test('handles CRLF line endings', () => {
        const md = '# Title line\r\n\r\nBody';
        assert.equal(summariseRunReport(md), 'Title line');
    });
});

describe('extractRecentDecisions', () => {
    test('returns last N unique IDs newest-first (by file order)', () => {
        const md = `
| D-20260417-001 | ... |
| D-20260417-002 | ... |
| D-20260417-003 | ... |
| D-20260417-004 | ... |
| D-20260417-005 | ... |
`;
        const got = extractRecentDecisions(md, 3);
        assert.deepEqual(got, ['D-20260417-005', 'D-20260417-004', 'D-20260417-003']);
    });

    test('dedupes repeated IDs within the file', () => {
        const md = 'D-20260417-001 foo D-20260417-001 bar D-20260417-002 baz';
        const got = extractRecentDecisions(md, 5);
        assert.deepEqual(got, ['D-20260417-002', 'D-20260417-001']);
    });

    test('returns [] when no IDs match', () => {
        assert.deepEqual(extractRecentDecisions('no ids here', 3), []);
    });

    test('respects the N parameter', () => {
        const md = 'D-20260101-001 D-20260101-002 D-20260101-003 D-20260101-004';
        assert.equal(extractRecentDecisions(md, 2).length, 2);
    });
});

describe('runShell (safeSpawn migration, Issue #129)', () => {
    test('returns stdout string on success', () => {
        const fakeSpawn = () => ({ status: 0, stdout: 'hello\n', stderr: '' });
        const out = runShell('git', ['status'], { _spawnImpl: fakeSpawn });
        assert.equal(out, 'hello\n');
    });

    test('returns empty string on non-zero exit (never throws)', () => {
        const fakeSpawn = () => ({ status: 1, stdout: '', stderr: 'oops' });
        assert.doesNotThrow(() => {
            const out = runShell('git', ['bogus'], { _spawnImpl: fakeSpawn });
            assert.equal(out, '');
        });
    });

    test('returns best-available stdout even when exit is non-zero', () => {
        // Parity with previous execFileSync+catch behavior: when the process
        // errored but still produced partial stdout, we surface the partial.
        const fakeSpawn = () => ({ status: 1, stdout: 'partial output', stderr: 'then failed' });
        const out = runShell('gh', ['something'], { _spawnImpl: fakeSpawn });
        assert.equal(out, 'partial output');
    });

    test('returns empty string when spawn result has no stdout (never throws)', () => {
        const fakeSpawn = () => ({ status: null, stdout: undefined, error: new Error('ENOENT') });
        assert.doesNotThrow(() => {
            const out = runShell('nope', [], { _spawnImpl: fakeSpawn });
            assert.equal(out, '');
        });
    });

    test('forwards cmd and args unchanged to the spawn implementation', () => {
        let seen = null;
        const fakeSpawn = (cmd, args) => {
            seen = { cmd, args };
            return { status: 0, stdout: 'ok' };
        };
        runShell('git', ['rev-parse', '--short', 'HEAD'], { _spawnImpl: fakeSpawn });
        assert.equal(seen.cmd, 'git');
        assert.deepEqual(seen.args, ['rev-parse', '--short', 'HEAD']);
    });
});

describe('formatTickReport', () => {
    const baseState = {
        timestamp: '2026-04-17T20:30:00.000Z',
        git: { branch: 'run-11/ui-master-plan', sha: 'abc1234' },
        issues: { backlog: 5, inProgress: 0, total: 6, parseError: false },
        latestRun: { filename: 'run-15-summary.md', headline: 'Run 15 Summary — Copilot triage' },
        recentDecisions: ['D-20260417-013', 'D-20260417-012', 'D-20260417-011'],
    };

    test('renders all four state blocks', () => {
        const out = formatTickReport(baseState);
        assert.match(out, /# Heartbeat Tick — 2026-04-17T20:30:00\.000Z/);
        assert.match(out, /## Git/);
        assert.match(out, /Branch: `run-11\/ui-master-plan`/);
        assert.match(out, /HEAD:   `abc1234`/);
        assert.match(out, /5 backlog · 0 in-progress · 6 total/);
        assert.match(out, /\*\*run-15-summary\.md\*\*/);
        assert.match(out, /D-20260417-013 · D-20260417-012 · D-20260417-011/);
    });

    test('shows warning line when gh output failed to parse', () => {
        const out = formatTickReport({
            ...baseState,
            issues: { backlog: 0, inProgress: 0, total: 0, parseError: true },
        });
        assert.match(out, /⚠️ gh output did not parse/);
    });

    test('handles missing run report', () => {
        const out = formatTickReport({ ...baseState, latestRun: null });
        assert.match(out, /no run-\*-summary\.md found/);
    });

    test('handles empty recent-decisions list', () => {
        const out = formatTickReport({ ...baseState, recentDecisions: [] });
        assert.match(out, /\(none found\)/);
    });
});

describe('tick — §C.2 audit trail (Issue #131)', () => {
    test('produces BOTH a markdown tick report AND a JSON audit record per invocation', async () => {
        // No MCP clients, skip cohesion gate — keeps the test fast + deterministic.
        // Writes to the real REPO_ROOT/reports since tick() uses a module-level
        // constant; both artifacts are timestamped so they don't collide across runs.
        const result = await tick({}, { skipCohesionGate: true });

        assert.ok(result.path, 'tick() should return the markdown report path');
        assert.ok(existsSync(result.path), 'markdown tick report should exist on disk');
        assert.ok(/\.md$/.test(result.path), 'markdown report should have .md extension');

        assert.ok(result.auditPath, 'tick() should return the audit JSON path');
        assert.ok(existsSync(result.auditPath), 'audit JSON should exist on disk');
        assert.ok(/\.json$/.test(result.auditPath), 'audit record should have .json extension');

        // Sibling convention: .md and .json share the same timestamp stem, so
        // tooling can correlate them by filename.
        const mdStem = path.basename(result.path).replace(/^heartbeat-tick-/, '').replace(/\.md$/, '');
        const jsonStem = path.basename(result.auditPath).replace(/\.json$/, '');
        assert.equal(mdStem, jsonStem, 'md and json siblings should share a timestamp stem');

        // Audit record must parse + contain v1 schema fields.
        const parsed = JSON.parse(readFileSync(result.auditPath, 'utf8'));
        assert.equal(parsed.schemaVersion, 1);
        assert.equal(typeof parsed.timestamp, 'string');
        assert.deepEqual(parsed.writer, { name: 'heartbeat.js', version: 'v1' });
        assert.ok(parsed.state, 'state passthrough must be present');
        assert.ok(Array.isArray(parsed.filesTouched), 'filesTouched must be an array');
        // The markdown report path is one of the files the tick wrote this call.
        assert.ok(
            parsed.filesTouched.includes(result.path),
            'filesTouched should include the markdown tick report path',
        );
    });
});
