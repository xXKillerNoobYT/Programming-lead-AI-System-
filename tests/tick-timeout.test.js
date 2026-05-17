'use strict';

/*
 * Phase 3 §C.5.a tick-timeout (Issue #141).
 *
 * Contract tests for lib/tick-timeout.js — a 7th backbone utility providing
 * timeout-racing semantics for any async task. Like lib/retry-backoff.js
 * (§C.4.a, the first precedent), runWithTimeout is a control-flow primitive
 * that THROWS on failure — specifically a TickTimeoutError when the injected
 * timer fires before the task settles.
 *
 * Design rationale (why these cases):
 *   - Injected `_timer` seam keeps every test synchronous-fast: zero real
 *     setTimeout waits. A manual-tick fake records setTimeout/clearTimeout
 *     requests and lets the test drive `fire()` explicitly so ordering is
 *     deterministic and wall-clock for this file stays <500ms.
 *   - Timer-handle hygiene is the most common class of bug in timeout
 *     primitives. We assert `timer.pending === 0` on every non-timeout path
 *     (success + task-rejection) to prove no handle ever leaks.
 *   - `onTimeout` fires synchronously BEFORE the throw. Test #10 uses the
 *     order-observation technique (push-to-shared-array inside hook + catch)
 *     to pin that ordering contract.
 *   - The task's eventual settlement AFTER a timeout is discarded by design
 *     (documented in the module JSDoc); once the timer wins, the caller gets
 *     TickTimeoutError and the task is on its own.
 *
 * Harness: node:test + node:assert/strict (matches every other root test;
 * NOT Jest — Jest is dashboard-only).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
    runWithTimeout,
    TickTimeoutError,
    DEFAULT_TIMEOUT_MS,
} = require('../lib/tick-timeout.js');

/**
 * Manual-tick fake timer injected via `_timer`. Records every setTimeout
 * request as an entry, lets tests fire them explicitly, and tracks cancellation
 * so leaked handles are detectable via the `pending` getter.
 *
 * Mirrors the mkFakeClock pattern from tests/retry-backoff.test.js; the shape
 * differs (setTimeout/clearTimeout vs sleep) because runWithTimeout races
 * against a timer handle, not a sleep promise.
 */
function mkFakeTimer() {
    const fires = [];
    return {
        fires,
        setTimeout: (fn, ms) => {
            const entry = { fn, ms, cancelled: false };
            fires.push(entry);
            return entry;
        },
        clearTimeout: (entry) => {
            if (entry) entry.cancelled = true;
        },
        /** Manually trigger the Nth registered setTimeout's callback. */
        fire: (idx = 0) => {
            const e = fires[idx];
            if (!e) throw new Error(`fakeTimer: no setTimeout at index ${idx}`);
            if (!e.cancelled) e.fn();
        },
        get pending() {
            return fires.filter((e) => !e.cancelled).length;
        },
    };
}

describe('runWithTimeout — task resolves before timeout', () => {
    test('returns task value; no onTimeout; timer cleared (pending === 0)', async () => {
        const timer = mkFakeTimer();
        const onTimeoutCalls = [];

        const result = await runWithTimeout({
            task: async () => 'finished',
            timeoutMs: 500,
            onTimeout: (info) => onTimeoutCalls.push(info),
            _timer: timer,
        });

        assert.equal(result, 'finished');
        assert.equal(onTimeoutCalls.length, 0, 'onTimeout must not fire on success');
        assert.equal(timer.pending, 0, 'timer must be cleared on success (no leak)');
    });
});

describe('runWithTimeout — task rejects before timeout', () => {
    test('propagates task rejection; no onTimeout; timer cleared', async () => {
        const timer = mkFakeTimer();
        const onTimeoutCalls = [];
        const boom = new Error('task-failed');

        await assert.rejects(
            () => runWithTimeout({
                task: async () => { throw boom; },
                timeoutMs: 500,
                onTimeout: (info) => onTimeoutCalls.push(info),
                _timer: timer,
            }),
            (err) => {
                assert.equal(err, boom, 'task rejection propagates unchanged');
                assert.ok(!(err instanceof TickTimeoutError),
                    'task rejections are NOT wrapped in TickTimeoutError');
                return true;
            },
        );

        assert.equal(onTimeoutCalls.length, 0, 'onTimeout must not fire when task rejects');
        assert.equal(timer.pending, 0, 'timer must be cleared on task-rejection path (no leak)');
    });
});

describe('runWithTimeout — timer fires before task settles', () => {
    test('onTimeout called with {timeoutMs, startedAt}; rejects with TickTimeoutError whose message includes "tick exceeded 500ms"', async () => {
        const timer = mkFakeTimer();
        const onTimeoutCalls = [];

        // A task that never resolves on its own — only the timer will end the race.
        const neverSettles = new Promise(() => {});

        const runPromise = runWithTimeout({
            task: () => neverSettles,
            timeoutMs: 500,
            onTimeout: (info) => onTimeoutCalls.push(info),
            _timer: timer,
        });

        // Fire the timer manually — this is what simulates 500ms elapsing.
        // Must happen on a microtask tick so runWithTimeout has registered
        // the setTimeout entry first.
        await Promise.resolve();
        assert.equal(timer.fires.length, 1, 'runWithTimeout registered exactly one setTimeout');
        timer.fire(0);

        await assert.rejects(
            runPromise,
            (err) => {
                assert.ok(err instanceof TickTimeoutError, 'error is TickTimeoutError');
                assert.ok(err.message.includes('tick exceeded 500ms'),
                    `message must include "tick exceeded 500ms" — got ${JSON.stringify(err.message)}`);
                return true;
            },
        );

        assert.equal(onTimeoutCalls.length, 1, 'onTimeout fires exactly once');
        assert.equal(onTimeoutCalls[0].timeoutMs, 500, 'onTimeout payload has timeoutMs');
        assert.equal(typeof onTimeoutCalls[0].startedAt, 'number',
            'onTimeout payload has startedAt:number (set at runWithTimeout entry)');
    });
});

describe('runWithTimeout — TickTimeoutError.timeoutMs matches configured', () => {
    test('error.timeoutMs equals the timeoutMs passed in', async () => {
        const timer = mkFakeTimer();
        const neverSettles = new Promise(() => {});

        const runPromise = runWithTimeout({
            task: () => neverSettles,
            timeoutMs: 1234,
            _timer: timer,
        });

        await Promise.resolve();
        timer.fire(0);

        await assert.rejects(
            runPromise,
            (err) => {
                assert.ok(err instanceof TickTimeoutError);
                assert.equal(err.timeoutMs, 1234,
                    'TickTimeoutError.timeoutMs records the configured timeout');
                return true;
            },
        );
    });
});

describe('runWithTimeout — TickTimeoutError is a proper Error subclass', () => {
    test('instanceof Error AND instanceof TickTimeoutError AND name === "TickTimeoutError"', async () => {
        const timer = mkFakeTimer();
        const neverSettles = new Promise(() => {});

        const runPromise = runWithTimeout({
            task: () => neverSettles,
            timeoutMs: 100,
            _timer: timer,
        });

        await Promise.resolve();
        timer.fire(0);

        await assert.rejects(
            runPromise,
            (err) => {
                assert.ok(err instanceof Error, 'instanceof Error');
                assert.ok(err instanceof TickTimeoutError, 'instanceof TickTimeoutError');
                assert.equal(err.name, 'TickTimeoutError', '.name === "TickTimeoutError"');
                return true;
            },
        );
    });
});

describe('runWithTimeout — exported DEFAULT_TIMEOUT_MS', () => {
    test('DEFAULT_TIMEOUT_MS === 5 * 60 * 1000 (5 minutes per §C.5)', () => {
        assert.equal(DEFAULT_TIMEOUT_MS, 5 * 60 * 1000);
    });
});

describe('runWithTimeout — custom timeoutMs honored by _timer.setTimeout', () => {
    test('fake _timer.setTimeout is invoked with the caller-provided ms', async () => {
        const timer = mkFakeTimer();

        // Task resolves immediately so we can await without racing.
        await runWithTimeout({
            task: async () => 'ok',
            timeoutMs: 777,
            _timer: timer,
        });

        assert.equal(timer.fires.length, 1, 'one setTimeout registered');
        assert.equal(timer.fires[0].ms, 777,
            'setTimeout invoked with the caller-provided timeoutMs');
    });
});

describe('runWithTimeout — timer cleared on task success', () => {
    test('pending === 0 after task resolves', async () => {
        const timer = mkFakeTimer();

        await runWithTimeout({
            task: async () => 'ok',
            timeoutMs: 500,
            _timer: timer,
        });

        assert.equal(timer.pending, 0,
            'success path must clearTimeout so the handle is not leaked');
    });
});

describe('runWithTimeout — timer cleared on task rejection', () => {
    test('pending === 0 after task rejects', async () => {
        const timer = mkFakeTimer();

        await assert.rejects(
            () => runWithTimeout({
                task: async () => { throw new Error('x'); },
                timeoutMs: 500,
                _timer: timer,
            }),
        );

        assert.equal(timer.pending, 0,
            'task-rejection path must clearTimeout so the handle is not leaked');
    });
});

describe('runWithTimeout — onTimeout fires BEFORE the throw', () => {
    test('order: onTimeout call is observed before the caller catch block', async () => {
        const timer = mkFakeTimer();
        const order = [];
        const neverSettles = new Promise(() => {});

        const runPromise = runWithTimeout({
            task: () => neverSettles,
            timeoutMs: 500,
            onTimeout: () => order.push('onTimeout'),
            _timer: timer,
        });

        // Fire the manual timer to trigger the timeout path.
        await Promise.resolve();
        timer.fire(0);

        try {
            await runPromise;
            order.push('resolved'); // unreachable — test fails if hit
        } catch (err) {
            order.push('catch');
            assert.ok(err instanceof TickTimeoutError);
        }

        assert.deepEqual(order, ['onTimeout', 'catch'],
            'onTimeout must run synchronously before the throw propagates to caller catch');
    });
});

/*
 * =============================================================================
 * Issue #142 — polish leaf follow-up tests (2 task-type-guard + 4 edge-value).
 *
 * 1) task-type guard (AC #1): before Issue #142 the module would let a missing
 *    or non-function `task` slip through to `Promise.resolve().then(() => task())`
 *    and reject asynchronously with a confusing TypeError: "task is not a function".
 *    We now fail-fast SYNCHRONOUSLY at the top of runWithTimeout so the error
 *    surfaces at the call site — matches the fs.readFile / URL(...) style of
 *    caller-contract violation. Style-matched against lib/pause-lock.js line 75
 *    (`if (!projectRoot || typeof projectRoot !== 'string') { ... }`).
 *
 *    These two tests use `assert.throws(() => runWithTimeout(...))` NOT
 *    `assert.rejects` — synchronous throw is part of the contract.
 *
 * 2) edge-value timeoutMs (AC #2): test-lock CURRENT pass-through behavior so
 *    that callers passing `NaN` / `-5` / `'100'` / `0` see the exact shape we
 *    have today. Rationale per spec: don't add a guard — the caller owns
 *    correctness. These tests capture what was PASSED to the fake timer (not
 *    what Node would coerce) so the assertions are independent of Node's
 *    setTimeout coercion rules. If a future refactor decides to coerce or
 *    guard timeoutMs, these tests will fail loudly and the author has to make
 *    the decision explicitly instead of silently changing the contract.
 * =============================================================================
 */

describe('runWithTimeout — task-type guard (Issue #142 AC #1)', () => {
    test('throws TypeError SYNCHRONOUSLY when task is missing (runWithTimeout({}))', () => {
        assert.throws(
            () => runWithTimeout({}),
            (err) => {
                assert.ok(err instanceof TypeError,
                    'missing task must throw TypeError (not a plain Error)');
                assert.equal(err.message, 'runWithTimeout: task must be a function',
                    'message must be the exact contract-violation string');
                return true;
            },
        );
    });

    test('throws TypeError SYNCHRONOUSLY when task is a non-function (e.g. 42)', () => {
        assert.throws(
            () => runWithTimeout({ task: 42 }),
            (err) => {
                assert.ok(err instanceof TypeError,
                    'non-function task must throw TypeError');
                assert.equal(err.message, 'runWithTimeout: task must be a function');
                return true;
            },
        );
    });
});

describe('runWithTimeout — edge-value timeoutMs (Issue #142 AC #2, test-lock pass-through)', () => {
    test('timeoutMs: 0 — timer registered with ms === 0; firing it rejects with TickTimeoutError', async () => {
        const timer = mkFakeTimer();
        const neverSettles = new Promise(() => {});

        const runPromise = runWithTimeout({
            task: () => neverSettles,
            timeoutMs: 0,
            _timer: timer,
        });

        await Promise.resolve();
        assert.equal(timer.fires.length, 1, 'one setTimeout registered');
        assert.equal(timer.fires[0].ms, 0,
            'ms passed to the timer is exactly 0 (no coercion)');
        timer.fire(0);

        await assert.rejects(
            runPromise,
            (err) => {
                assert.ok(err instanceof TickTimeoutError);
                assert.equal(err.timeoutMs, 0,
                    'TickTimeoutError.timeoutMs preserves the 0 value');
                return true;
            },
        );
    });

    test('timeoutMs: NaN — pass-through unchanged (runWithTimeout does NOT coerce; we record what was passed, independent of Node setTimeout coercion)', async () => {
        const timer = mkFakeTimer();

        // Task resolves immediately so we can await without racing the fake timer.
        await runWithTimeout({
            task: async () => 'ok',
            timeoutMs: NaN,
            _timer: timer,
        });

        assert.equal(timer.fires.length, 1, 'one setTimeout registered');
        // Note: Number.isNaN, not === NaN (NaN !== NaN).
        assert.ok(Number.isNaN(timer.fires[0].ms),
            'ms passed to the fake timer is NaN, unchanged — proves runWithTimeout does not coerce. Node\'s real setTimeout would coerce NaN→1ms, but that\'s outside this module\'s contract.');
    });

    test('timeoutMs: -5 — pass-through unchanged (we record what was passed; Node would coerce to 1ms but that is the platform\'s concern)', async () => {
        const timer = mkFakeTimer();

        await runWithTimeout({
            task: async () => 'ok',
            timeoutMs: -5,
            _timer: timer,
        });

        assert.equal(timer.fires.length, 1, 'one setTimeout registered');
        assert.equal(timer.fires[0].ms, -5,
            'ms passed is exactly -5 — runWithTimeout does not normalize negative values');
    });

    test('timeoutMs: "100" (string) — pass-through unchanged (the fake records the string as-is; again, Node\'s real setTimeout would coerce to 100ms but this module does not)', async () => {
        const timer = mkFakeTimer();

        await runWithTimeout({
            task: async () => 'ok',
            timeoutMs: '100',
            _timer: timer,
        });

        assert.equal(timer.fires.length, 1, 'one setTimeout registered');
        assert.equal(timer.fires[0].ms, '100',
            'ms passed is the literal string "100" — no Number() coercion in runWithTimeout');
        // And strict-equal on type as well to pin that the string did not become a number.
        assert.equal(typeof timer.fires[0].ms, 'string',
            'typeof remains "string" — confirms zero coercion');
    });
});
