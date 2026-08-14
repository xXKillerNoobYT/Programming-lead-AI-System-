'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = join(__dirname, '..');
const CLI = join(REPO_ROOT, 'scripts', 'devlead-integrity.js');
const FIXTURE = join(__dirname, 'fixtures', 'long-horizon', 'blocked-chain-8d.json');
const CONTRACTS = join(__dirname, 'fixtures', 'long-horizon', 'contracts-valid.json');
const AT = '2026-08-03T00:00:00.000Z';

function run(args, env = {}) {
    return spawnSync(process.execPath, [CLI, ...args], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env: { ...process.env, ...env },
    });
}

describe('devlead-integrity read-only CLI', () => {
    test('evaluates the approved fixture with the canonical list envelope and advisory exit code', () => {
        const result = run([
            '--source', 'paperclip',
            '--issue', 'DEMO-42',
            '--fixture', FIXTURE,
            '--at', AT,
            '--format', 'json',
        ]);

        assert.equal(result.status, 1, result.stderr);
        const envelope = JSON.parse(result.stdout);
        assert.equal(envelope.schemaVersion, 1);
        assert.equal(envelope.policyVersion, 'issue-integrity-v1');
        assert.equal(envelope.evaluatedAt, AT);
        assert.equal(envelope.sourceWatermark.cursor, 'cursor-demo-0001');
        assert.deepEqual(envelope.items.map((item) => item.issue.issueKey), [
            'paperclip:company-demo:issue-42',
        ]);
        assert.equal(envelope.items[0].lifecycle.closeAllowed, false);
    });

    test('returns zero only when the evaluated fixture is allowed', () => {
        const directory = mkdtempSync(join(tmpdir(), 'devlead-integrity-cli-'));
        const fixturePath = join(directory, 'allowed.json');
        try {
            const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));
            const contracts = JSON.parse(readFileSync(CONTRACTS, 'utf8'));
            fixture.localRecord = contracts.integrityRecord;
            fixture.families = [];
            writeFileSync(fixturePath, JSON.stringify(fixture));

            const result = run([
                '--fixture', fixturePath,
                '--at', fixture.now,
                '--mode', 'enforce',
                '--format', 'ndjson',
            ]);

            assert.equal(result.status, 0, result.stderr);
            const items = result.stdout.trimEnd().split('\n').map((line) => JSON.parse(line));
            assert.equal(items.length, 1);
            assert.equal(items[0].lifecycle.closeAllowed, true);
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });

    test('returns zero when close is allowed even if informational recurrence candidates exist', () => {
        const directory = mkdtempSync(join(tmpdir(), 'devlead-integrity-cli-'));
        const fixturePath = join(directory, 'candidate.json');
        try {
            const fixture = JSON.parse(readFileSync(CONTRACTS, 'utf8'));
            const blocked = JSON.parse(readFileSync(FIXTURE, 'utf8'));
            fixture.now = '2026-08-11T00:00:00.000Z';
            fixture.sourceSnapshot.blockerIssueKeys = [];
            fixture.sourceWatermark = blocked.sourceWatermark;
            fixture.localRecord = fixture.integrityRecord;
            fixture.dependencies = [];
            fixture.events = [fixture.meaningfulActivityEvent];
            fixture.leases = [fixture.attentionLease];
            fixture.families = [fixture.incidentFamily];
            writeFileSync(fixturePath, JSON.stringify(fixture));

            const result = run(['--fixture', fixturePath, '--at', fixture.now, '--format', 'json']);

            assert.equal(result.status, 0, result.stderr);
            const envelope = JSON.parse(result.stdout);
            assert.equal(envelope.items[0].lifecycle.closeAllowed, true);
            assert.ok(envelope.items[0].recurrence.candidates.length > 0);
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });

    test('keeps default mode off without touching a source', () => {
        const result = run([]);

        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), { mode: 'off', evaluated: false });
    });

    test('honors explicit off mode even when a fixture is supplied', () => {
        const result = run(['--fixture', FIXTURE, '--mode', 'off']);

        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), { mode: 'off', evaluated: false });
    });

    test('uses exit two for invalid input and forbids at outside fixture mode', () => {
        const invalidFormat = run(['--fixture', FIXTURE, '--format', 'yaml']);
        assert.equal(invalidFormat.status, 2);
        assert.match(invalidFormat.stderr, /format/i);

        const liveAt = run([
            '--source', 'paperclip',
            '--issue', 'issue-42',
            '--mode', 'shadow',
            '--at', AT,
        ]);
        assert.equal(liveAt.status, 2);
        assert.match(liveAt.stderr, /--at.*fixture/i);
    });

    test('rejects empty option values as invalid input', () => {
        for (const option of ['source', 'issue', 'at', 'format', 'mode', 'fixture']) {
            const result = run([`--${option}`, '']);
            assert.equal(result.status, 2, `--${option} accepted an empty value`);
            assert.match(result.stderr, /requires a value/i);
        }
    });

    test('rejects unknown and credential-shaped options without printing their values', () => {
        const secret = 'secret-do-not-echo';
        const result = run(['--token', secret]);

        assert.equal(result.status, 2);
        assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
        assert.match(result.stderr, /unknown option/i);
    });
});
