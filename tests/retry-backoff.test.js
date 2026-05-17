'use strict';

/*
 * Phase 3 §C.4.a retry-with-backoff (Issue #139).
 *
 * Contract tests for lib/retry-backoff.js — a 6th backbone utility providing
 * retry-with-exponential-backoff semantics for any async task. Unlike the prior
 * `lib/` modules (audit-trail, pause-lock, guardrails#recordGuardrailViolation)
 * which are never-throws, retryWithBackoff is a STANDARD retry primitive that
 * THROWS on final failure so callers can distinguish "succeeded on retry N"
 * from "failed all N retries."
 *
 * Design rationale (why these cases):
 *   - Injected `_clock` seam keeps every test synchronous-fast: zero real
 *     setTimeout waits. Matches the `_fetchImpl` / `_spawnImpl` DI pattern from
 *     lib/guardrails.js. Running all 12 cases end-to-end MUST stay under 1s.
 *   - `onRetry` fires BEFORE the sleep so callers can log "retrying in Xms…"
 *     before the wait — we assert call ordering + payload shape explicitly.
 *   - `onEscalate` fires ONCE, synchronously, AFTER the final rejection and
 *     BEFORE the throw. Test #11 proves order matters: if the throw happened
 *     first, the caller's catch block couldn't rely on onEscalate having run.
 *   - `delaysMs` shorter than `maxAttempts-1` reuses the LAST element; longer
 *     silently ignores extras. The spec choice (not modular, not linear) is
 *     locked — these tests pin it.
 *
 * Harness: node:test + node:assert/strict (matches every other test in this
 * repo; NOT Jest — Jest is dashboard-only).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
    retryWithBackoff,
    DEFAULT_DELAYS_MS,
    DEFAULT_MAX_ATTEMPTS,
} = require('../lib/retry-backoff.js');

/**
 * Fake clock injected via `_clock`: records every sleep request without
 * actually waiting so the full suite stays under half a second.
 */
function mkFakeClock() {
    const sleeps = [];
    return {
        sleeps,
        sleep: async (ms) => {
            sleeps.push(ms);
            // no real wait — return immediately so tests are deterministic
        },
    };
}

/**
 * Build a task fn that resolves with `resolveValue` on the (1-indexed) call
 * number specified by `succeedOnAttempt`. Every prior call rejects with a
 * distinct Error whose message encodes the attempt number so tests can assert
 * which error instance `onRetry` / `onEscalate` received.
 *
 * If succeedOnAttempt is null/Infinity, the task always rejects.
 */
function mkTask({ succeedOnAttempt = Infinity, resolveValue = 'ok' } = {}) {
    let callCount = 0;
    const task = async () => {
        callCount += 1;
        if (callCount >= succeedOnAttempt) {
            return resolveValue;
        }
        throw new Error(`boom-${callCount}`);
    };
    return {
        task,
        get callCount() { return callCount; },
    };
}

describe('retryWithBackoff — first-try success', () => {
    test('returns task value; onRetry/onEscalate/sleep never called', async () => {
        const clock = mkFakeClock();
        const onRetryCalls = [];
        const onEscalateCalls = [];
        const { task, } = mkTask({ succeedOnAttempt: 1, resolveValue: 42 });

        const result = await retryWithBackoff({
            task,
            onRetry: (info) => onRetryCalls.push(info),
            onEscalate: (info) => onEscalateCalls.push(info),
            _clock: clock,
        });

        assert.equal(result, 42);
        assert.equal(onRetryCalls.length, 0, 'onRetry must not fire on first-try success');
        assert.equal(onEscalateCalls.length, 0, 'onEscalate must not fire on success');
        assert.equal(clock.sleeps.length, 0, '_clock.sleep must not fire on success');
    });
});

describe('retryWithBackoff — fails once then succeeds', () => {
    test('returns value; onRetry fires exactly once; one sleep of 2000ms; no escalate', async () => {
        const clock = mkFakeClock();
        const onRetryCalls = [];
        const onEscalateCalls = [];
        const { task } = mkTask({ succeedOnAttempt: 2, resolveValue: 'yay' });

        const result = await retryWithBackoff({
            task,
            onRetry: (info) => onRetryCalls.push(info),
            onEscalate: (info) => onEscalateCalls.push(info),
            _clock: clock,
        });

        assert.equal(result, 'yay');
        assert.equal(onRetryCalls.length, 1);
        assert.equal(onRetryCalls[0].attempt, 1, 'attempt is 1-indexed = the attempt that just failed');
        assert.ok(onRetryCalls[0].error instanceof Error);
        assert.equal(onRetryCalls[0].error.message, 'boom-1');
        assert.equal(onRetryCalls[0].nextDelayMs, 2000, 'default first delay');
        assert.equal(onEscalateCalls.length, 0);
        assert.deepEqual(clock.sleeps, [2000]);
    });
});

describe('retryWithBackoff — exhausts all retries (default maxAttempts=3)', () => {
    test('onEscalate fires once with attempts=4; last error is thrown; 3 onRetry calls; 3 sleeps', async () => {
        const clock = mkFakeClock();
        const onRetryCalls = [];
        const onEscalateCalls = [];
        const { task } = mkTask({ succeedOnAttempt: Infinity });

        await assert.rejects(
            () => retryWithBackoff({
                task,
                onRetry: (info) => onRetryCalls.push(info),
                onEscalate: (info) => onEscalateCalls.push(info),
                _clock: clock,
            }),
            (err) => {
                // The *last* error is thrown: after maxAttempts=3 retries +
                // the initial, the task ran 4 times, so the last rejection
                // message is 'boom-4'.
                assert.ok(err instanceof Error);
                assert.equal(err.message, 'boom-4');
                return true;
            },
        );

        assert.equal(onEscalateCalls.length, 1, 'onEscalate called exactly once');
        assert.equal(onEscalateCalls[0].attempts, 4, 'attempts = maxAttempts + 1 = total call count');
        assert.ok(onEscalateCalls[0].lastError instanceof Error);
        assert.equal(onEscalateCalls[0].lastError.message, 'boom-4');

        assert.equal(onRetryCalls.length, 3, 'onRetry fires after attempts 1, 2, 3');
        assert.deepEqual(clock.sleeps, [2000, 8000, 30000], 'default delays used in order');
    });
});

describe('retryWithBackoff — onRetry payload ordering', () => {
    test('attempts are 1, 2, 3 and errors match the per-call rejection', async () => {
        const clock = mkFakeClock();
        const onRetryCalls = [];
        const { task } = mkTask({ succeedOnAttempt: Infinity });

        await assert.rejects(
            () => retryWithBackoff({
                task,
                onRetry: (info) => onRetryCalls.push(info),
                _clock: clock,
            }),
        );

        assert.equal(onRetryCalls.length, 3);
        assert.equal(onRetryCalls[0].attempt, 1);
        assert.equal(onRetryCalls[0].error.message, 'boom-1');
        assert.equal(onRetryCalls[1].attempt, 2);
        assert.equal(onRetryCalls[1].error.message, 'boom-2');
        assert.equal(onRetryCalls[2].attempt, 3);
        assert.equal(onRetryCalls[2].error.message, 'boom-3');
        assert.equal(onRetryCalls[0].nextDelayMs, 2000);
        assert.equal(onRetryCalls[1].nextDelayMs, 8000);
        assert.equal(onRetryCalls[2].nextDelayMs, 30000);
    });
});

describe('retryWithBackoff — exported defaults', () => {
    test('DEFAULT_DELAYS_MS is [2000, 8000, 30000]', () => {
        assert.deepEqual(DEFAULT_DELAYS_MS, [2000, 8000, 30000]);
    });

    test('DEFAULT_MAX_ATTEMPTS is 3', () => {
        assert.equal(DEFAULT_MAX_ATTEMPTS, 3);
    });
});

describe('retryWithBackoff — custom delaysMs honored in order', () => {
    test('delaysMs [100, 200, 300] produces sleeps [100, 200, 300]', async () => {
        const clock = mkFakeClock();
        const { task } = mkTask({ succeedOnAttempt: Infinity });

        await assert.rejects(
            () => retryWithBackoff({
                task,
                delaysMs: [100, 200, 300],
                _clock: clock,
            }),
        );

        assert.deepEqual(clock.sleeps, [100, 200, 300]);
    });
});

describe('retryWithBackoff — delaysMs shorter than maxAttempts-1 reuses last', () => {
    test('delaysMs=[500], maxAttempts=3 → sleeps [500, 500, 500]', async () => {
        const clock = mkFakeClock();
        const { task } = mkTask({ succeedOnAttempt: Infinity });

        await assert.rejects(
            () => retryWithBackoff({
                task,
                delaysMs: [500],
                maxAttempts: 3,
                _clock: clock,
            }),
        );

        assert.deepEqual(clock.sleeps, [500, 500, 500]);
    });
});

describe('retryWithBackoff — delaysMs longer than maxAttempts-1 ignores extras', () => {
    test('delaysMs=[100,200,300,400,500], maxAttempts=3 → sleeps [100, 200, 300]', async () => {
        const clock = mkFakeClock();
        const { task } = mkTask({ succeedOnAttempt: Infinity });

        await assert.rejects(
            () => retryWithBackoff({
                task,
                delaysMs: [100, 200, 300, 400, 500],
                maxAttempts: 3,
                _clock: clock,
            }),
        );

        assert.deepEqual(clock.sleeps, [100, 200, 300]);
    });
});

describe('retryWithBackoff — no sleep before the initial attempt', () => {
    test('first recorded sleep corresponds to the gap AFTER attempt 1, not before it', async () => {
        const clock = mkFakeClock();
        const { task } = mkTask({ succeedOnAttempt: 2, resolveValue: 'ok' });

        await retryWithBackoff({
            task,
            delaysMs: [9999],
            _clock: clock,
        });

        // If a sleep happened BEFORE attempt 1, we'd see a sleep entry even
        // when the task succeeded on the first try. That's covered by test #1;
        // here we pin that the single sleep recorded corresponds to the
        // post-attempt-1 backoff window, not a pre-attempt warm-up.
        assert.equal(clock.sleeps.length, 1, 'exactly one sleep — between attempt 1 and attempt 2');
        assert.equal(clock.sleeps[0], 9999, 'recorded sleep is the post-fail delay, not a pre-call delay');
    });
});

describe('retryWithBackoff — no sleep after final failure', () => {
    test('sleeps.length equals maxAttempts, never maxAttempts+1', async () => {
        const clock = mkFakeClock();
        const { task } = mkTask({ succeedOnAttempt: Infinity });

        await assert.rejects(
            () => retryWithBackoff({
                task,
                maxAttempts: 3,
                delaysMs: [10, 20, 30],
                _clock: clock,
            }),
        );

        assert.equal(clock.sleeps.length, 3, 'no extra sleep after the final rejection');
    });
});

describe('retryWithBackoff — onEscalate fires BEFORE the throw', () => {
    test('order: onEscalate call is observed before the catch block', async () => {
        const clock = mkFakeClock();
        const order = [];
        const { task } = mkTask({ succeedOnAttempt: Infinity });

        try {
            await retryWithBackoff({
                task,
                onEscalate: () => order.push('onEscalate'),
                _clock: clock,
            });
            order.push('resolved'); // unreachable — test fails if hit
        } catch (err) {
            order.push('catch');
            assert.ok(err instanceof Error);
        }

        assert.deepEqual(order, ['onEscalate', 'catch'],
            'onEscalate must run synchronously before the throw propagates to caller catch');
    });
});
