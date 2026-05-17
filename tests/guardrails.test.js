'use strict';

/**
 * Tests for lib/guardrails.js — Phase 3 §C.1.a heartbeat guardrails module
 * (Issue #125).
 *
 * The guardrails module provides safe wrappers for outbound-call categories
 * the heartbeat must control: HTTP fetch and child-process spawn. It also
 * exposes a custom error type (GuardrailViolation) and a JSONL audit
 * recorder (recordGuardrailViolation) for §C.1.b's detector to consume.
 *
 * Tests inject fake fetch / spawn implementations via the `_fetchImpl` /
 * `_spawnImpl` options so no real network or subprocess calls happen.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    mkdtempSync,
    rmSync,
    existsSync,
    readFileSync,
    writeFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
    safeFetch,
    safeSpawn,
    GuardrailViolation,
    recordGuardrailViolation,
} = require('../lib/guardrails.js');

/* ------------------------------ helpers ------------------------------ */

function freshTmpDir(prefix) {
    return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

/* ------------------------- GuardrailViolation ------------------------- */

describe('GuardrailViolation', () => {
    test('is an Error subclass with .kind and .detail', () => {
        const v = new GuardrailViolation('fetch', {
            url: 'https://example.com',
            host: 'example.com',
        });
        assert.ok(v instanceof Error, 'should be Error subclass');
        assert.ok(v instanceof GuardrailViolation);
        assert.equal(v.kind, 'fetch');
        assert.equal(v.detail.host, 'example.com');
        assert.equal(v.name, 'GuardrailViolation');
    });

    test('spawn-kind violation carries command detail', () => {
        const v = new GuardrailViolation('spawn', { cmd: 'rm', args: ['-rf', '/'] });
        assert.equal(v.kind, 'spawn');
        assert.equal(v.detail.cmd, 'rm');
        assert.deepEqual(v.detail.args, ['-rf', '/']);
    });
});

/* ------------------------------ safeFetch ----------------------------- */

describe('safeFetch', () => {
    test('passthrough when allowHosts is undefined', async () => {
        let called = false;
        const fakeFetch = async (url, options) => {
            called = true;
            return { ok: true, url, options };
        };
        const result = await safeFetch(
            'https://example.com/path',
            { method: 'GET' },
            { _fetchImpl: fakeFetch },
        );
        assert.equal(called, true);
        assert.equal(result.ok, true);
        assert.equal(result.url, 'https://example.com/path');
    });

    test('passes when host IS in allowHosts', async () => {
        let called = false;
        const fakeFetch = async () => {
            called = true;
            return { ok: true };
        };
        const result = await safeFetch(
            'https://api.github.com/repos/foo/bar',
            {},
            { allowHosts: ['api.github.com'], _fetchImpl: fakeFetch },
        );
        assert.equal(called, true);
        assert.equal(result.ok, true);
    });

    test('throws GuardrailViolation when host not in allowHosts', async () => {
        const fakeFetch = async () => {
            throw new Error('fetch should NOT have been called');
        };
        await assert.rejects(
            () =>
                safeFetch(
                    'https://evil.example.com/leak',
                    {},
                    { allowHosts: ['api.github.com'], _fetchImpl: fakeFetch },
                ),
            (err) => {
                assert.ok(err instanceof GuardrailViolation, 'must be GuardrailViolation');
                assert.equal(err.kind, 'fetch');
                assert.equal(err.detail.host, 'evil.example.com');
                return true;
            },
        );
    });

    test('empty allowHosts array blocks all hosts', async () => {
        const fakeFetch = async () => {
            throw new Error('fetch should NOT have been called');
        };
        await assert.rejects(
            () =>
                safeFetch(
                    'https://api.github.com/anything',
                    {},
                    { allowHosts: [], _fetchImpl: fakeFetch },
                ),
            (err) => err instanceof GuardrailViolation,
        );
    });
});

/* ------------------------------ safeSpawn ----------------------------- */

describe('safeSpawn', () => {
    test('passthrough when allowCmds is undefined', () => {
        let called = false;
        const fakeSpawn = (cmd, args, opts) => {
            called = true;
            return { status: 0, stdout: '', stderr: '', cmd, args, opts };
        };
        const result = safeSpawn(
            'echo',
            ['hello'],
            { _spawnImpl: fakeSpawn },
        );
        assert.equal(called, true);
        assert.equal(result.status, 0);
        assert.equal(result.cmd, 'echo');
        assert.deepEqual(result.args, ['hello']);
    });

    test('passes when cmd IS in allowCmds', () => {
        let called = false;
        const fakeSpawn = () => {
            called = true;
            return { status: 0, stdout: '', stderr: '' };
        };
        const result = safeSpawn(
            'git',
            ['status'],
            { allowCmds: ['git', 'node'], _spawnImpl: fakeSpawn },
        );
        assert.equal(called, true);
        assert.equal(result.status, 0);
    });

    test('throws GuardrailViolation when cmd not in allowCmds', () => {
        const fakeSpawn = () => {
            throw new Error('spawn should NOT have been called');
        };
        assert.throws(
            () =>
                safeSpawn(
                    'rm',
                    ['-rf', '/'],
                    { allowCmds: ['git'], _spawnImpl: fakeSpawn },
                ),
            (err) => {
                assert.ok(err instanceof GuardrailViolation);
                assert.equal(err.kind, 'spawn');
                assert.equal(err.detail.cmd, 'rm');
                return true;
            },
        );
    });

    test('refuses string-form args (anti-shell-injection guard)', () => {
        const fakeSpawn = () => {
            throw new Error('spawn should NOT have been called');
        };
        assert.throws(
            () =>
                safeSpawn(
                    'echo',
                    'hello && rm -rf /',
                    { _spawnImpl: fakeSpawn },
                ),
            (err) =>
                err instanceof TypeError || err instanceof GuardrailViolation,
        );
    });

    test('refuses undefined args (must be an array)', () => {
        const fakeSpawn = () => {
            throw new Error('spawn should NOT have been called');
        };
        assert.throws(
            () => safeSpawn('echo', undefined, { _spawnImpl: fakeSpawn }),
            (err) =>
                err instanceof TypeError || err instanceof GuardrailViolation,
        );
    });

    test('empty allowCmds array blocks all commands', () => {
        const fakeSpawn = () => {
            throw new Error('spawn should NOT have been called');
        };
        assert.throws(
            () =>
                safeSpawn('git', ['status'], {
                    allowCmds: [],
                    _spawnImpl: fakeSpawn,
                }),
            (err) => err instanceof GuardrailViolation,
        );
    });
});

/* ----------------------- recordGuardrailViolation ---------------------- */

describe('recordGuardrailViolation', () => {
    test('appends valid JSONL to existing tmp dir', () => {
        const dir = freshTmpDir('guardrails-rec');
        try {
            const v1 = new GuardrailViolation('fetch', {
                url: 'https://x.test/path',
                host: 'x.test',
            });
            const v2 = new GuardrailViolation('spawn', {
                cmd: 'curl',
                args: ['-o', '/tmp/out'],
            });
            const ok1 = recordGuardrailViolation(v1, { auditDir: dir });
            const ok2 = recordGuardrailViolation(v2, { auditDir: dir });
            assert.equal(ok1, true);
            assert.equal(ok2, true);

            const path = join(dir, 'guardrail-violations.jsonl');
            assert.ok(existsSync(path), 'audit file should exist');

            const lines = readFileSync(path, 'utf8')
                .split('\n')
                .filter((l) => l.length > 0);
            assert.equal(lines.length, 2, 'should have two JSONL lines');
            const rec1 = JSON.parse(lines[0]);
            const rec2 = JSON.parse(lines[1]);
            assert.equal(rec1.kind, 'fetch');
            assert.equal(rec1.detail.host, 'x.test');
            assert.ok(rec1.timestamp, 'should have a timestamp');
            assert.equal(rec2.kind, 'spawn');
            assert.equal(rec2.detail.cmd, 'curl');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('creates auditDir if missing', () => {
        const root = freshTmpDir('guardrails-mkdir');
        try {
            const nestedDir = join(root, 'nested', 'audit');
            assert.equal(existsSync(nestedDir), false, 'dir must not exist yet');

            const v = new GuardrailViolation('fetch', { host: 'x.test' });
            const ok = recordGuardrailViolation(v, { auditDir: nestedDir });
            assert.equal(ok, true);
            assert.ok(existsSync(nestedDir), 'nested dir should be created');
            assert.ok(existsSync(join(nestedDir, 'guardrail-violations.jsonl')));
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('returns false on write failure (auditDir is a file) — does not throw', () => {
        const root = freshTmpDir('guardrails-fail');
        try {
            // Create a FILE where we'll then ask the recorder to treat as a dir.
            const fakeDir = join(root, 'not-a-dir');
            writeFileSync(fakeDir, 'blocker', 'utf8');

            const v = new GuardrailViolation('fetch', { host: 'x.test' });
            // Must not throw; must return false.
            let threw = null;
            let result;
            try {
                result = recordGuardrailViolation(v, { auditDir: fakeDir });
            } catch (err) {
                threw = err;
            }
            assert.equal(threw, null, 'must not throw');
            assert.equal(result, false, 'must return false on failure');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});
