'use strict';

/*
 * Phase 3 §C.3 pause-lock (Issue #135).
 *
 * Contract tests for lib/pause-lock.js — the `.heartbeat-paused` lockfile
 * the human (or, later, a dashboard button) writes to halt the autonomous
 * heartbeat without touching code.
 *
 * Design rationale (why these cases):
 *   - Fail-OPEN on corrupt JSON: a malformed lockfile MUST NOT silently halt
 *     the heartbeat. The user wrote a broken file — we surface rawError and
 *     keep running. They can always write a valid file to really pause.
 *   - Stale lockfile (pausedUntil in the past) → treat as NOT paused but do
 *     NOT auto-delete. §C.3.d covers cleanup. The user's intent is "pause
 *     for N seconds" then "let me re-confirm by removing it."
 *   - Never-throws mirrors lib/guardrails.js#recordGuardrailViolation and
 *     lib/audit-trail.js#writeAuditRecord: structured return + stderr log.
 *
 * Convention matches audit-trail.js exactly: node:test + node:assert/strict,
 * mkdtempSync fixture + `try/finally rmSync` for isolation so a regressing
 * implementation doesn't leak files into the real repo root.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { readPauseLock, writePauseLock, clearPauseLock } = require('../lib/pause-lock.js');

function mkTmpRoot() {
    return mkdtempSync(path.join(os.tmpdir(), 'pause-lock-test-'));
}

function lockfilePath(root) {
    return path.join(root, '.heartbeat-paused');
}

describe('readPauseLock — file missing', () => {
    test('returns {paused:false} when .heartbeat-paused does not exist', () => {
        const root = mkTmpRoot();
        try {
            assert.equal(existsSync(lockfilePath(root)), false, 'precondition: no lockfile');
            const result = readPauseLock(root);
            assert.equal(result.paused, false);
            // No rawError on the happy missing-file path.
            assert.equal(result.rawError, undefined);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('readPauseLock — valid lockfile, not expired', () => {
    test('returns {paused:true} with all fields when pausedUntil is in the future', () => {
        const root = mkTmpRoot();
        try {
            const pausedAt = new Date().toISOString();
            const pausedUntil = new Date(Date.now() + 60_000).toISOString();
            const contents = { pausedAt, pausedUntil, reason: 'manual test pause' };
            writeFileSync(lockfilePath(root), JSON.stringify(contents), 'utf8');

            const result = readPauseLock(root);
            assert.equal(result.paused, true);
            assert.equal(result.pausedAt, pausedAt);
            assert.equal(result.pausedUntil, pausedUntil);
            assert.equal(result.reason, 'manual test pause');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('returns {paused:true} with no pausedUntil when field is absent (indefinite pause)', () => {
        const root = mkTmpRoot();
        try {
            const pausedAt = new Date().toISOString();
            const contents = { pausedAt, reason: 'halt for investigation' };
            writeFileSync(lockfilePath(root), JSON.stringify(contents), 'utf8');

            const result = readPauseLock(root);
            assert.equal(result.paused, true);
            assert.equal(result.pausedAt, pausedAt);
            assert.equal(result.pausedUntil, undefined);
            assert.equal(result.reason, 'halt for investigation');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    // Documents the NaN-fallthrough behaviour at lib/pause-lock.js:113-121: a
    // hand-edited garbage pausedUntil (not parseable by Date.parse) MUST NOT
    // silently unlock the heartbeat. User must fix or delete the file. This
    // test locks that contract in so a future refactor can't regress it into
    // "garbage expiry == no expiry == unpaused".
    test('keeps paused when pausedUntil is garbage (NaN fallthrough)', () => {
        const root = mkTmpRoot();
        try {
            writeFileSync(lockfilePath(root), JSON.stringify({
                pausedAt: '2026-04-19T00:00:00.000Z',
                pausedUntil: 'not a date',
                reason: 'test-garbage-expiry',
            }), 'utf8');
            const result = readPauseLock(root);
            assert.equal(result.paused, true);
            assert.equal(result.reason, 'test-garbage-expiry');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('readPauseLock — stale lockfile (pausedUntil in the past)', () => {
    test('returns {paused:false} and leaves the file in place', () => {
        const root = mkTmpRoot();
        try {
            const pausedAt = new Date(Date.now() - 120_000).toISOString();
            const pausedUntil = new Date(Date.now() - 60_000).toISOString();
            const contents = { pausedAt, pausedUntil, reason: 'already elapsed' };
            writeFileSync(lockfilePath(root), JSON.stringify(contents), 'utf8');

            const result = readPauseLock(root);
            assert.equal(result.paused, false);
            // Intentional: user confirms resume by deleting. §C.3.d covers cleanup.
            assert.equal(existsSync(lockfilePath(root)), true, 'stale lockfile must NOT be auto-deleted');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('readPauseLock — malformed JSON (fail-OPEN)', () => {
    test('returns {paused:false, rawError:string} on corrupt JSON — does NOT throw', () => {
        const root = mkTmpRoot();
        try {
            writeFileSync(lockfilePath(root), '{not valid json at all', 'utf8');

            let caught = null;
            let result;
            try {
                result = readPauseLock(root);
            } catch (err) {
                caught = err;
            }
            assert.equal(caught, null, 'must never throw on malformed JSON');
            // Fail-OPEN: corrupt file does NOT halt the heartbeat.
            assert.equal(result.paused, false);
            assert.equal(typeof result.rawError, 'string');
            assert.ok(result.rawError.length > 0, 'rawError should be populated');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    // Wrong-shape guard at lib/pause-lock.js:98-106: valid JSON but not an
    // object (scalar or array) must fall back to the same fail-OPEN posture as
    // malformed JSON. These two tests lock the scalar + array branches so a
    // future tightening of the shape check cannot accidentally flip to
    // paused:true on a hand-edited oddball file.
    test('returns {paused:false, rawError} on valid-JSON scalar (e.g. "42")', () => {
        const root = mkTmpRoot();
        try {
            writeFileSync(lockfilePath(root), '42', 'utf8');
            const result = readPauseLock(root);
            assert.equal(result.paused, false);
            assert.equal(typeof result.rawError, 'string');
            assert.ok(result.rawError.length > 0, 'rawError should be populated');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('returns {paused:false, rawError} on valid-JSON array (e.g. "[1,2,3]")', () => {
        const root = mkTmpRoot();
        try {
            writeFileSync(lockfilePath(root), '[1, 2, 3]', 'utf8');
            const result = readPauseLock(root);
            assert.equal(result.paused, false);
            assert.equal(typeof result.rawError, 'string');
            assert.ok(result.rawError.length > 0, 'rawError should be populated');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('writePauseLock — indefinite pause', () => {
    test('writes lockfile WITHOUT pausedUntil when durationMs is omitted', () => {
        const root = mkTmpRoot();
        try {
            const result = writePauseLock({ projectRoot: root, reason: 'indefinite halt' });
            assert.equal(result.path, lockfilePath(root));
            assert.equal(result.pausedUntil, undefined, 'no pausedUntil when duration is omitted');
            assert.ok(existsSync(result.path));

            const parsed = JSON.parse(readFileSync(result.path, 'utf8'));
            assert.equal(typeof parsed.pausedAt, 'string');
            assert.equal(parsed.reason, 'indefinite halt');
            assert.equal(parsed.pausedUntil, undefined);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    // Circular-reason guard: JSON.stringify on a circular object throws
    // TypeError. The outer try/catch in writePauseLock must catch it and
    // return {path:null} rather than letting the exception escape into the
    // heartbeat loop. Locks the never-throws contract for reason payloads.
    test('never throws on circular reason (returns {path: null})', () => {
        const root = mkTmpRoot();
        try {
            const circular = {};
            circular.self = circular;
            let caught = null;
            let result;
            try {
                result = writePauseLock({ projectRoot: root, reason: circular });
            } catch (err) {
                caught = err;
            }
            assert.equal(caught, null, 'must not throw');
            assert.equal(result.path, null);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('writePauseLock — bounded pause', () => {
    test('writes pausedUntil = now + durationMs and returns it', () => {
        const root = mkTmpRoot();
        try {
            const before = Date.now();
            const result = writePauseLock({
                projectRoot: root,
                reason: 'one minute cooldown',
                durationMs: 60_000,
            });
            const after = Date.now();

            assert.equal(typeof result.pausedUntil, 'string');
            const untilMs = Date.parse(result.pausedUntil);
            assert.ok(untilMs >= before + 60_000, 'pausedUntil must be at least now+duration');
            assert.ok(untilMs <= after + 60_000 + 10, 'pausedUntil must be close to now+duration');

            const parsed = JSON.parse(readFileSync(result.path, 'utf8'));
            assert.equal(parsed.pausedUntil, result.pausedUntil);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    // durationMs > 0 guard (Issue #136 AC#1): reviewer flagged that
    // Number.isFinite(durationMs) alone accepts 0 and negatives, producing an
    // immediately-stale lockfile. Contract: coerce to indefinite pause +
    // stderr one-liner. Two tests lock the zero and negative branches.
    test('coerces durationMs=0 to indefinite pause (no pausedUntil)', () => {
        const root = mkTmpRoot();
        try {
            const result = writePauseLock({
                projectRoot: root,
                reason: 'zero duration coerced',
                durationMs: 0,
            });
            assert.equal(result.path, lockfilePath(root));
            assert.equal(result.pausedUntil, undefined, 'return must omit pausedUntil on coercion');

            const parsed = JSON.parse(readFileSync(result.path, 'utf8'));
            assert.equal(parsed.pausedUntil, undefined, 'on-disk file must omit pausedUntil on coercion');
            assert.equal(parsed.reason, 'zero duration coerced');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('coerces negative durationMs to indefinite pause (no pausedUntil)', () => {
        const root = mkTmpRoot();
        try {
            const result = writePauseLock({
                projectRoot: root,
                reason: 'negative duration coerced',
                durationMs: -5_000,
            });
            assert.equal(result.path, lockfilePath(root));
            assert.equal(result.pausedUntil, undefined, 'return must omit pausedUntil on coercion');

            const parsed = JSON.parse(readFileSync(result.path, 'utf8'));
            assert.equal(parsed.pausedUntil, undefined, 'on-disk file must omit pausedUntil on coercion');
            assert.equal(parsed.reason, 'negative duration coerced');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('clearPauseLock', () => {
    test('deletes the lockfile when present and returns {cleared:true}', () => {
        const root = mkTmpRoot();
        try {
            writeFileSync(lockfilePath(root), JSON.stringify({ pausedAt: new Date().toISOString() }), 'utf8');
            assert.ok(existsSync(lockfilePath(root)));

            const result = clearPauseLock({ projectRoot: root });
            assert.equal(result.cleared, true);
            assert.equal(existsSync(lockfilePath(root)), false);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    test('returns {cleared:false} when no lockfile is present — never throws', () => {
        const root = mkTmpRoot();
        try {
            assert.equal(existsSync(lockfilePath(root)), false, 'precondition: no lockfile');
            let caught = null;
            let result;
            try {
                result = clearPauseLock({ projectRoot: root });
            } catch (err) {
                caught = err;
            }
            assert.equal(caught, null, 'must never throw when lockfile is absent');
            assert.equal(result.cleared, false);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe('never-throws contract — all three functions tolerate bad input', () => {
    test('readPauseLock returns {paused:false, rawError} on missing/null projectRoot — does NOT throw', () => {
        let caught = null;
        let result;
        try {
            result = readPauseLock(null);
        } catch (err) {
            caught = err;
        }
        assert.equal(caught, null);
        assert.equal(result.paused, false);
        // rawError populated so the caller can diagnose.
        assert.equal(typeof result.rawError, 'string');
    });

    test('writePauseLock returns a structured object with no path on bad input — does NOT throw', () => {
        let caught = null;
        let result;
        try {
            result = writePauseLock({ projectRoot: null });
        } catch (err) {
            caught = err;
        }
        assert.equal(caught, null);
        // Structured object returned; path must be null on bad input so
        // callers can branch on it the same way they do for audit-trail.
        assert.equal(result.path, null);
    });

    test('clearPauseLock returns {cleared:false} on bad input — does NOT throw', () => {
        let caught = null;
        let result;
        try {
            result = clearPauseLock({ projectRoot: null });
        } catch (err) {
            caught = err;
        }
        assert.equal(caught, null);
        assert.equal(result.cleared, false);
    });
});
