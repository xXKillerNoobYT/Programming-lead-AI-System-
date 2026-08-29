'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const {
    parseArgs,
    runCli,
} = require('../scripts/reconcile-verified-complete.js');

const SCRIPT = join(__dirname, '..', 'scripts', 'reconcile-verified-complete.js');
const NOW = '2026-08-24T00:00:00.000Z';

function eligibleSnapshot() {
    return {
        identity: {
            repositoryNodeId: 'R_repo',
            projectNodeId: 'P_project_6',
        },
        permissions: {
            readIssues: true,
            readProject: true,
            writeIssues: true,
            writeProject: true,
        },
        capabilities: { restoreProjectItem: true },
        capturedAt: '2026-08-23T23:59:00.000Z',
        freshUntil: '2026-08-24T00:05:00.000Z',
        evidenceKeys: [],
        archiveAuditKeys: [],
        restorationAuditKeys: [],
        items: [{
            projectItemId: 'PVTI_item_249',
            repositoryNodeId: 'R_repo',
            projectNodeId: 'P_project_6',
            projectStatus: 'Done',
            archived: false,
            archiveEligibleSince: '2026-08-01T00:00:00.000Z',
            issue: {
                nodeId: 'I_issue_249',
                number: 249,
                state: 'OPEN',
                lifecycle: 'Verified Complete',
                recordKind: 'work',
                expectedEvidenceSubject: 'commit:abc123',
                acceptanceCriteria: [{
                    id: 'ac-1',
                    status: 'passed',
                    evidence: {
                        subject: 'commit:abc123',
                        recordedAt: '2026-08-23T22:00:00.000Z',
                        validUntil: '2026-08-25T22:00:00.000Z',
                    },
                }],
                requiredGates: [{
                    id: 'qa',
                    status: 'passed',
                    evidence: {
                        subject: 'commit:abc123',
                        recordedAt: '2026-08-23T22:30:00.000Z',
                        validUntil: '2026-08-25T22:30:00.000Z',
                    },
                }],
                codeRequired: true,
                implementationPr: {
                    number: 300,
                    state: 'MERGED',
                    mergeCommitOid: 'abc123',
                },
                unresolvedFindings: [],
                children: [],
                blockers: [],
                dependencies: [],
                followUps: [],
                holds: [],
                incidents: [],
                question: null,
            },
        }],
    };
}

test('CLI reads an offline snapshot and emits a deterministic dry-run plan by default', (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'devlead-249-cli-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const snapshotPath = join(dir, 'snapshot.json');
    writeFileSync(snapshotPath, `${JSON.stringify(eligibleSnapshot())}\n`, 'utf8');

    const result = spawnSync(process.execPath, [
        SCRIPT,
        '--snapshot', snapshotPath,
        '--now', NOW,
    ], {
        encoding: 'utf8',
        windowsHide: true,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, 'dry-run');
    assert.equal(output.applied, false);
    assert.equal(output.plan.actions.length, 1);
    assert.equal(output.plan.actions[0].type, 'close-issue');
});

test('CLI help is non-interactive and does not require a snapshot', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
        encoding: 'utf8',
        windowsHide: true,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /dry-run/i);
    assert.equal(result.stderr, '');
});

test('CLI rejects unknown mutating aliases and malformed input without stdout', (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'devlead-249-cli-invalid-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const invalidPath = join(dir, 'invalid.json');
    writeFileSync(invalidPath, '{not-json}\n', 'utf8');

    for (const args of [
        ['--snapshot', invalidPath],
        ['--snapshot', invalidPath, '--execute'],
        ['--snapshot'],
    ]) {
        const result = spawnSync(process.execPath, [SCRIPT, ...args], {
            encoding: 'utf8',
            windowsHide: true,
        });
        assert.equal(result.status, 2);
        assert.equal(result.stdout, '');
        assert.doesNotThrow(() => JSON.parse(result.stderr));
    }
});

test('CLI returns one for a fail-closed plan and still emits the dry-run evidence', (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'devlead-249-cli-blocked-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const snapshotPath = join(dir, 'snapshot.json');
    const snapshot = eligibleSnapshot();
    snapshot.items[0].issue.lifecycle = 'Done';
    writeFileSync(snapshotPath, `${JSON.stringify(snapshot)}\n`, 'utf8');

    const result = spawnSync(process.execPath, [
        SCRIPT,
        '--snapshot', snapshotPath,
        '--now', NOW,
    ], {
        encoding: 'utf8',
        windowsHide: true,
    });

    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stderr, '');
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, 'dry-run');
    assert.equal(output.plan.actions.length, 0);
    assert.deepEqual(output.plan.blockedItems[0].reasons, [
        'canonical-lifecycle-not-verified-complete',
    ]);
});

test('parseArgs forwards bounded planning options and rejects policy-changing or duplicate flags', () => {
    assert.deepEqual(parseArgs([
        '--snapshot', 'snapshot.json',
        '--now', NOW,
        '--max-actions', '7',
    ]), {
        snapshotPath: 'snapshot.json',
        now: NOW,
        maxActions: 7,
        apply: false,
        enableMutation: false,
        help: false,
    });

    assert.throws(
        () => parseArgs(['--snapshot', 'one.json', '--snapshot', 'two.json']),
        /duplicate-argument:--snapshot/,
    );
    assert.throws(
        () => parseArgs(['--snapshot', 'one.json', '--max-actions', '0']),
        /invalid-integer:--max-actions/,
    );
    assert.throws(
        () => parseArgs(['--snapshot', 'one.json', '--retention-days', '1']),
        /unknown-argument:--retention-days/,
    );
});

test('apply requires both the explicit mutation enable and an injected adapter', async () => {
    const snapshot = eligibleSnapshot();
    let reads = 0;
    const common = {
        readSnapshot: async () => {
            reads += 1;
            return snapshot;
        },
        stdout: () => {},
        stderr: () => {},
    };

    assert.equal(await runCli([
        '--snapshot', 'unused.json', '--now', NOW, '--apply',
    ], common), 2);
    assert.equal(reads, 0);

    assert.equal(await runCli([
        '--snapshot', 'unused.json', '--now', NOW,
        '--apply', '--enable-mutation',
    ], common), 2);
    assert.equal(reads, 0);
});

test('explicit apply delegates only through an injected adapter and reports its result', async () => {
    const stdout = [];
    const stderr = [];
    const calls = [];
    const adapter = { name: 'injected-test-adapter' };
    const exitCode = await runCli([
        '--snapshot', 'unused.json',
        '--now', NOW,
        '--max-actions', '3',
        '--apply',
        '--enable-mutation',
    ], {
        readSnapshot: async () => eligibleSnapshot(),
        adapter,
        applyPlan: async (plan, receivedAdapter, options) => {
            calls.push({ plan, receivedAdapter, options });
            return {
                ok: true,
                applied: true,
                partial: false,
                results: [{ status: 'applied' }],
            };
        },
        stdout: (value) => stdout.push(value),
        stderr: (value) => stderr.push(value),
    });

    assert.equal(exitCode, 0);
    assert.equal(stderr.join(''), '');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].receivedAdapter, adapter);
    assert.deepEqual(calls[0].options, { enabled: true, now: NOW });
    assert.equal(calls[0].plan.maxActions, 3);
    const output = JSON.parse(stdout.join(''));
    assert.equal(output.mode, 'apply');
    assert.equal(output.applied, true);
    assert.equal(output.result.ok, true);
});
