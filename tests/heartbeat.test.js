'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync, rmSync, mkdtempSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const path = require('node:path');

const {
    parseGitState,
    parseIssueCounts,
    findLatestRunReport,
    summariseRunReport,
    extractRecentDecisions,
    formatTickReport,
    parseIssueListForDelegation,
    runFirstDelegationStep,
    runFirstDelegationStepWithCooldown,
    envFlagEnabled,
    parseHeartbeatOptions,
    runShell,
    collectMcpObservations,
    tick,
} = require('../heartbeat.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOCKFILE_PATH = path.join(REPO_ROOT, '.heartbeat-paused');

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

    test('handles missing gh executable (ENOENT) as empty output, not a throw', () => {
        const fakeSpawn = (cmd) => {
            assert.equal(cmd, 'gh');
            return { status: null, stdout: '', stderr: '', error: new Error('spawn gh ENOENT') };
        };
        assert.doesNotThrow(() => {
            const out = runShell('gh', ['issue', 'list'], { _spawnImpl: fakeSpawn });
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

    test('surfaces mempalace observation errors (vault unreachable path)', () => {
        const out = formatTickReport({
            ...baseState,
            mcpStatus: { connected: ['mempalace'], failed: [], skipped: [] },
            mcpObservations: {
                'mempalace.search(recent)': {
                    error: 'vault unreachable: ECONNREFUSED 127.0.0.1:7777',
                },
            },
        });
        assert.match(out, /### MCP Observations/);
        assert.match(out, /mempalace\.search\(recent\)/);
        assert.match(out, /vault unreachable: ECONNREFUSED/);
    });

    test('renders delegation status when first step is enabled', () => {
        const out = formatTickReport({
            ...baseState,
            delegation: { status: 'posted', detail: 'comment added to #712' },
        });
        assert.match(out, /## Delegation/);
        assert.match(out, /posted — comment added to #712/);
    });
});

describe('collectMcpObservations — failure-mode hardening', () => {
    test('returns a safe error payload when mempalace tool call fails', async () => {
        const clientsByName = {
            mempalace: {
                status: 'connected',
                tools: [{ name: 'mempalace_search' }],
                client: {
                    callTool: async () => {
                        throw new Error('vault unreachable: ECONNREFUSED 127.0.0.1:7777');
                    },
                },
            },
        };

        const observations = await collectMcpObservations(clientsByName);

        assert.deepEqual(observations, {
            'mempalace.search(recent)': {
                error: 'vault unreachable: ECONNREFUSED 127.0.0.1:7777',
            },
        });
    });

    test('skips mempalace observation when server is absent or not connected', async () => {
        assert.deepEqual(await collectMcpObservations({}), {});
        assert.deepEqual(
            await collectMcpObservations({ mempalace: { status: 'failed', error: 'offline' } }),
            {},
        );
    });
});

describe('main — failure-mode startup hardening', () => {
    test('starts and writes a tick report when MCP config is malformed', () => {
        const dir = mkdtempSync(path.join(tmpdir(), 'heartbeat-bad-mcp-'));
        const badMcpPath = path.join(dir, 'bad.mcp.json');
        const reportsDir = path.join(dir, 'reports');
        const decisionLogPath = path.join(dir, 'decision-log.md');
        const pauseLockPath = path.join(dir, '.heartbeat-paused');
        writeFileSync(badMcpPath, '{ not json }', 'utf8');

        try {
            const result = spawnSync(process.execPath, ['heartbeat.js'], {
                cwd: REPO_ROOT,
                encoding: 'utf8',
                timeout: 10_000,
                env: {
                    ...process.env,
                    PATH: '',
                    Path: '',
                    MCP_CONFIG_PATH: badMcpPath,
                    REPORTS_DIR: reportsDir,
                    DECISION_LOG_PATH: decisionLogPath,
                    HEARTBEAT_PAUSE_LOCK_PATH: pauseLockPath,
                },
            });

            assert.equal(result.status, 0, result.stderr);
            assert.match(result.stdout, /connecting MCP servers/);
            assert.match(result.stdout, /wrote /);

            const reports = readdirSync(reportsDir).filter((name) => name.startsWith('heartbeat-tick-'));
            assert.equal(reports.length, 1);
            const report = readFileSync(path.join(reportsDir, reports[0]), 'utf8');
            assert.match(report, /No MCP servers declared in `.mcp\.json`/);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('delegation helper — first implementation slice', () => {
    test('envFlagEnabled accepts explicit truthy values only', () => {
        assert.equal(envFlagEnabled('1'), true);
        assert.equal(envFlagEnabled('true'), true);
        assert.equal(envFlagEnabled('YES'), true);
        assert.equal(envFlagEnabled('on'), true);
        assert.equal(envFlagEnabled('0'), false);
        assert.equal(envFlagEnabled('false'), false);
        assert.equal(envFlagEnabled(undefined), false);
    });

    test('parseHeartbeatOptions keeps first delegation step opt-in', () => {
        assert.deepEqual(parseHeartbeatOptions([], {}), { enableFirstDelegationStep: false });
        assert.deepEqual(
            parseHeartbeatOptions(['--delegate-first-step'], {}),
            { enableFirstDelegationStep: true },
        );
        assert.deepEqual(
            parseHeartbeatOptions([], { HEARTBEAT_ENABLE_FIRST_DELEGATION_STEP: '1' }),
            { enableFirstDelegationStep: true },
        );
    });

    test('parseIssueListForDelegation returns empty list on malformed JSON', () => {
        assert.deepEqual(parseIssueListForDelegation('not json'), []);
    });

    test('runFirstDelegationStep posts to first in-progress issue', () => {
        const calls = [];
        const fakeShell = (cmd, args) => {
            calls.push([cmd, args]);
            if (args[0] === 'issue' && args[1] === 'list') {
                return JSON.stringify([{ number: 712, title: 'heartbeat.js: first delegation step' }]);
            }
            if (args[0] === 'issue' && args[1] === 'comment') {
                return 'https://github.com/org/repo/issues/712#issuecomment-1';
            }
            return '';
        };
        const result = runFirstDelegationStep({ runShellImpl: fakeShell, timestamp: '2026-05-10T00:55:06.124Z' });
        assert.equal(result.status, 'posted');
        assert.match(result.detail, /#712/);
        assert.equal(calls.length, 2);
        assert.equal(calls[1][1][0], 'issue');
        assert.equal(calls[1][1][1], 'comment');
        assert.equal(calls[1][1][2], '712');
    });

    test('runFirstDelegationStep skips when no in-progress issue is available', () => {
        const fakeShell = () => '[]';
        const result = runFirstDelegationStep({ runShellImpl: fakeShell, timestamp: '2026-05-10T00:55:06.124Z' });
        assert.equal(result.status, 'skipped');
        assert.match(result.detail, /no in-progress issue/);
    });

    test('runFirstDelegationStepWithCooldown skips duplicate ping inside cooldown window', () => {
        const statePath = path.join(REPO_ROOT, 'reports', 'tmp-delegation-state-test.json');
        try { rmSync(statePath, { force: true }); } catch {}
        writeFileSync(statePath, JSON.stringify({ '712': '2026-05-10T00:50:00.000Z' }), 'utf8');

        const calls = [];
        const fakeShell = (cmd, args) => {
            calls.push([cmd, args]);
            if (args[0] === 'issue' && args[1] === 'list') {
                return JSON.stringify([{ number: 712, title: 'heartbeat.js: first delegation step' }]);
            }
            if (args[0] === 'issue' && args[1] === 'comment') {
                return 'should-not-run';
            }
            return '';
        };
        const result = runFirstDelegationStepWithCooldown({
            runShellImpl: fakeShell,
            timestamp: '2026-05-10T01:00:00.000Z',
            statePath,
            cooldownMs: 2 * 60 * 60 * 1000,
        });
        assert.equal(result.status, 'skipped');
        assert.match(result.detail, /cooldown active/);
        assert.equal(calls.length, 1);
        try { rmSync(statePath, { force: true }); } catch {}
    });

    test('runFirstDelegationStepWithCooldown posts and persists timestamp when outside cooldown window', () => {
        const statePath = path.join(REPO_ROOT, 'reports', 'tmp-delegation-state-test.json');
        try { rmSync(statePath, { force: true }); } catch {}
        writeFileSync(statePath, JSON.stringify({ '712': '2026-05-10T00:00:00.000Z' }), 'utf8');

        const calls = [];
        const fakeShell = (cmd, args) => {
            calls.push([cmd, args]);
            if (args[0] === 'issue' && args[1] === 'list') {
                return JSON.stringify([{ number: 712, title: 'heartbeat.js: first delegation step' }]);
            }
            if (args[0] === 'issue' && args[1] === 'comment') {
                return 'https://github.com/org/repo/issues/712#issuecomment-2';
            }
            return '';
        };
        const result = runFirstDelegationStepWithCooldown({
            runShellImpl: fakeShell,
            timestamp: '2026-05-10T06:30:00.000Z',
            statePath,
            cooldownMs: 2 * 60 * 60 * 1000,
        });
        assert.equal(result.status, 'posted');
        assert.equal(calls.length, 2);

        const persisted = JSON.parse(readFileSync(statePath, 'utf8'));
        assert.equal(persisted['712'], '2026-05-10T06:30:00.000Z');
        try { rmSync(statePath, { force: true }); } catch {}
    });
});

describe('tick — §C.3 pause-lock (Issue #135)', () => {
    // Hygiene: these tests must NEVER leave `.heartbeat-paused` on the real
    // repo root because a lingering lockfile would silently halt the
    // autonomous heartbeat on the next /loop tick. Defensive cleanup in
    // both beforeEach AND afterEach, plus a try/finally per test.

    const cleanLockfile = () => {
        try {
            if (existsSync(LOCKFILE_PATH)) unlinkSync(LOCKFILE_PATH);
        } catch { /* best-effort */ }
    };

    test('returns {paused:true, …} and writes NO tick report or audit when lockfile is active', async () => {
        cleanLockfile();
        // Snapshot report counts BEFORE so we can verify nothing new is written.
        const reportsDir = path.join(REPO_ROOT, 'reports');
        const auditDir = path.join(REPO_ROOT, 'reports', 'audit');
        const beforeReportCount = existsSync(reportsDir)
            ? readdirSync(reportsDir).filter((f) => f.startsWith('heartbeat-tick-')).length
            : 0;
        const beforeAuditCount = existsSync(auditDir)
            ? readdirSync(auditDir).filter((f) => f.endsWith('.json')).length
            : 0;

        // Active pause lock — use a future pausedUntil so it's NOT stale.
        const pausedAt = new Date().toISOString();
        const pausedUntil = new Date(Date.now() + 60_000).toISOString();
        writeFileSync(
            LOCKFILE_PATH,
            JSON.stringify({ pausedAt, pausedUntil, reason: 'heartbeat test pause' }),
            'utf8',
        );

        try {
            const result = await tick({}, { skipCohesionGate: true });

            // Paused shape: no state, no path, no auditPath.
            assert.equal(result.paused, true, 'tick should report paused:true');
            assert.equal(result.state, null, 'no state when paused');
            assert.equal(result.path, null, 'no tick report path when paused');
            assert.equal(result.auditPath, null, 'no audit path when paused');

            // No new files on disk.
            const afterReportCount = existsSync(reportsDir)
                ? readdirSync(reportsDir).filter((f) => f.startsWith('heartbeat-tick-')).length
                : 0;
            const afterAuditCount = existsSync(auditDir)
                ? readdirSync(auditDir).filter((f) => f.endsWith('.json')).length
                : 0;
            assert.equal(afterReportCount, beforeReportCount, 'must NOT write a tick report when paused');
            assert.equal(afterAuditCount, beforeAuditCount, 'must NOT write an audit record when paused');
        } finally {
            cleanLockfile();
        }
    });

    test('runs normally when lockfile is absent (regression guard for the gate)', async () => {
        cleanLockfile();
        const result = await tick({}, { skipCohesionGate: true });
        assert.ok(!result.paused, 'paused flag should be falsy on normal tick');
        assert.ok(result.path, 'normal tick must return a report path');
        assert.ok(existsSync(result.path), 'normal tick must write the report');
    });
});

describe('tick — first delegation step integration', () => {
    test('invokes first-delegation cooldown flow when enabled and no prior state exists', async () => {
        const calls = [];
        const statePath = path.join(REPO_ROOT, 'reports', 'tmp-tick-delegation-state.json');
        const fakeShell = (cmd, args) => {
            calls.push([cmd, args]);
            if (cmd === 'git' && args[0] === 'branch') return 'main';
            if (cmd === 'git' && args[0] === 'rev-parse') return 'abc1234';
            if (args[0] === 'issue' && args[1] === 'list') {
                if (args.includes('--label')) {
                    return JSON.stringify([{ number: 712, title: 'Heartbeat seed' }]);
                }
                return JSON.stringify([
                    { number: 712, labels: [{ name: 'status:in-progress' }], state: 'OPEN' },
                ]);
            }
            if (args[0] === 'issue' && args[1] === 'comment') return 'https://github.com/org/repo/issues/712#issuecomment-1';
            return '';
        };

        try { writeFileSync(statePath, '{}', 'utf8'); } catch {}
        const result = await tick({}, {
            skipCohesionGate: true,
            enableFirstDelegationStep: true,
            runShellImpl: fakeShell,
            delegationStatePath: statePath,
            delegationCooldownMs: 60 * 60 * 1000,
        });

        assert.equal(result.state.delegation.status, 'posted');
        assert.equal(calls[0][0], 'git');
        assert.equal(calls[1][0], 'git');
        assert.equal(calls.filter((c) => c[0] === 'gh' && c[1][1] === 'comment').length, 1);
        const persisted = readFileSync(statePath, 'utf8');
        assert.ok(persisted.includes('"712"'));
        try { rmSync(statePath, { force: true }); } catch {}
    });

    test('suppresses delegation comment when cooldown is active for the selected issue', async () => {
        const statePath = path.join(REPO_ROOT, 'reports', 'tmp-tick-delegation-state.json');
        const statePayload = { 712: new Date().toISOString() };
        const calls = [];
        const fakeShell = (cmd, args) => {
            calls.push([cmd, args]);
            if (cmd === 'git' && args[0] === 'branch') return 'main';
            if (cmd === 'git' && args[0] === 'rev-parse') return 'abc1234';
            if (args[0] === 'issue' && args[1] === 'list') {
                return JSON.stringify([{ number: 712, title: 'Heartbeat seed' }]);
            }
            return '';
        };
        writeFileSync(statePath, JSON.stringify(statePayload), 'utf8');

        const result = await tick({}, {
            skipCohesionGate: true,
            enableFirstDelegationStep: true,
            runShellImpl: fakeShell,
            delegationStatePath: statePath,
            delegationCooldownMs: 6 * 60 * 60 * 1000,
        });

        assert.equal(result.state.delegation.status, 'skipped');
        assert.equal(result.state.delegation.detail.includes('cooldown active'), true);
        const commentCalls = calls.filter((c) => c[0] === 'gh' && c[1][1] === 'comment');
        assert.equal(commentCalls.length, 0);
        try { rmSync(statePath, { force: true }); } catch {}
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
