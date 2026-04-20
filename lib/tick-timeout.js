'use strict';

/*
 * lib/tick-timeout.js — Phase 3 §C.5.a tick-timeout primitive (Issue #141).
 *
 * 7th backbone utility. Races a caller-provided async task against a timeout
 * window; if the timer fires first, a synchronous `onTimeout` hook runs and
 * a TickTimeoutError is thrown.
 *
 * =============================================================================
 *                       !! DIFFERENT FROM OTHER lib/ MODULES !!
 *
 * Unlike `lib/audit-trail.js` / `lib/pause-lock.js` /
 * `lib/guardrails.js#recordGuardrailViolation`, runWithTimeout THROWS on
 * timeout. Precedent: `lib/retry-backoff.js` (§C.4.a, Issue #139) is the first
 * control-flow primitive in lib/ that intentionally breaks the never-throws
 * convention. This module follows the same pattern for the same reason —
 * callers must be able to distinguish "task completed" from "deadline blown,"
 * and the cleanest way is a dedicated Error subclass.
 *
 * Future authors pattern-matching sibling modules: DO NOT "fix" this to
 * never-throws. Swallowing the timeout would force every caller to stuff a
 * sentinel into the return channel and re-check it. Standard JS timeout-
 * primitive semantics: caller wraps in try/catch and branches on
 * `err instanceof TickTimeoutError`.
 * =============================================================================
 *
 * Call order:
 *
 *   runWithTimeout({task, timeoutMs}) called
 *     │
 *     ├─ startedAt = Date.now()
 *     ├─ _timer.setTimeout(fireTimeout, timeoutMs)   ← handle captured
 *     ├─ Promise.race([task(), timerPromise])
 *     │
 *     ├─ task() resolves first:
 *     │     _timer.clearTimeout(handle)              ← no leak
 *     │     return task's value
 *     │
 *     ├─ task() rejects first:
 *     │     _timer.clearTimeout(handle)              ← no leak
 *     │     throw the task's error (unchanged)
 *     │
 *     └─ timer fires first:
 *           onTimeout({timeoutMs, startedAt})        ← fires BEFORE throw, sync
 *           throw new TickTimeoutError(...)          ← after onTimeout returns
 *           (task's eventual settlement is DISCARDED — documented below)
 *
 * DI seam: `_timer` mirrors the `_clock` / `_fetchImpl` / `_spawnImpl` DI
 * pattern used elsewhere. Tests inject a manual-tick fake whose `fire()` lets
 * the test advance the clock deterministically — no real setTimeout waits —
 * so the full suite stays under half a second.
 *
 * Behavior the JSDoc pins that the Issue #141 spec locked:
 *   - Task's eventual settlement AFTER a timeout is DISCARDED. We do not bubble
 *     the late resolution or rejection anywhere. If the caller needs to cancel
 *     the underlying work, they must arrange that themselves (AbortController
 *     or similar); this primitive only races the race.
 *   - `TickTimeoutError.message` format: `'tick exceeded <N>ms'` where N is the
 *     configured timeoutMs. Exact literal "tick exceeded" so callers can match.
 *   - `startedAt` in the onTimeout payload is `Date.now()` captured at the top
 *     of runWithTimeout, enabling callers to log `Date.now() - startedAt` as
 *     the observed duration.
 *   - Default `_timer` timers are NOT `.unref()`d — intentional for long-
 *     running daemons like heartbeat.js. Short-lived CLIs that must exit
 *     quickly should inject a custom `_timer`.
 */

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Error raised when runWithTimeout's deadline expires before the task settles.
 *
 * @property {number} timeoutMs — the configured timeoutMs value
 */
class TickTimeoutError extends Error {
    constructor(timeoutMs) {
        super(`tick exceeded ${timeoutMs}ms`);
        this.name = 'TickTimeoutError';
        this.timeoutMs = timeoutMs;
    }
}

function defaultTimer() {
    return {
        setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
        clearTimeout: (id) => globalThis.clearTimeout(id),
    };
}

/**
 * Run an async task with a timeout deadline.
 *
 * THROWS a TickTimeoutError when the deadline expires before the task
 * settles (NOT never-throws). See module header for why this mirrors
 * `lib/retry-backoff.js` (§C.4.a) rather than the never-throws siblings.
 *
 * @template T
 * @param {object}                                args
 * @param {() => Promise<T>}                      args.task         — async work to race; invoked exactly once
 * @param {number}                                [args.timeoutMs=DEFAULT_TIMEOUT_MS] — deadline window in ms
 * @param {(info: {timeoutMs:number, startedAt:number}) => void}
 *                                                [args.onTimeout]  — fires ONCE, synchronously, BEFORE the throw on timeout. Hooks MUST NOT throw — an exception here will mask the timeout and propagate uncaught. No-op default.
 * @param {{setTimeout: (fn:Function, ms:number) => any, clearTimeout: (id:any) => void}}
 *                                                [args._timer]     — DI seam (test-only by convention; mirrors `_clock`/`_fetchImpl`/`_spawnImpl` elsewhere). Defaults to globalThis.setTimeout + globalThis.clearTimeout.
 * @returns {Promise<T>} the task's resolved value if it settles before the timeout
 * @throws {Error} the task's rejection, unchanged, if it rejects before the timeout
 * @throws {TickTimeoutError} when the timer fires before the task settles (after onTimeout has run)
 */
function runWithTimeout(args) {
    const {
        task,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        onTimeout,
        _timer,
    } = args || {};

    // Caller-contract guard (Issue #142 AC #1): fail-fast SYNCHRONOUSLY before
    // the timer is started so a missing/non-function `task` surfaces at the
    // call site, not as a confusing async "task is not a function" rejection.
    // Style-matched to lib/pause-lock.js (`typeof projectRoot !== 'string'`).
    // Throws (not rejects) — see header for why this mirrors the
    // lib/retry-backoff.js precedent.
    if (typeof task !== 'function') {
        throw new TypeError('runWithTimeout: task must be a function');
    }

    // Guard the hot-path defaults. We don't validate aggressively (callers
    // own correctness of the option-object) — just make a missing hook a
    // no-op and pick a real timer when one wasn't injected.
    const noop = () => {};
    const timeoutHook = typeof onTimeout === 'function' ? onTimeout : noop;
    const timer = _timer
        && typeof _timer.setTimeout === 'function'
        && typeof _timer.clearTimeout === 'function'
        ? _timer
        : defaultTimer();

    const startedAt = Date.now();

    // Race the task against a timer promise. Whichever settles first wins;
    // the loser's later settlement is discarded per spec (see header).
    return new Promise((resolve, reject) => {
        let settled = false;

        const timerHandle = timer.setTimeout(() => {
            if (settled) return;
            settled = true;
            // onTimeout fires BEFORE the throw so callers that wrap
            // runWithTimeout in try/catch observe onTimeout first. Payload
            // shape is pinned by test #3 / #10. A misbehaving hook must not
            // hang the returned promise — wrap the call in try/catch so we
            // still reject with TickTimeoutError even if the hook throws.
            // The hook's error is written to stderr so it isn't silent.
            try {
                timeoutHook({ timeoutMs, startedAt });
            } catch (hookErr) {
                try {
                    process.stderr.write(
                        `[tick-timeout] onTimeout hook threw: ${hookErr && hookErr.message ? hookErr.message : hookErr}\n`,
                    );
                } catch {
                    // stderr unavailable — swallow; we must still reject below.
                }
            }
            reject(new TickTimeoutError(timeoutMs));
        }, timeoutMs);

        // task() is invoked exactly once. We don't await with try/catch here
        // so the promise chain stays flat and the `settled` guard covers all
        // three paths (task-resolve, task-reject, timer-fire).
        Promise.resolve()
            .then(() => task())
            .then(
                (value) => {
                    if (settled) return;
                    settled = true;
                    timer.clearTimeout(timerHandle);
                    resolve(value);
                },
                (err) => {
                    if (settled) return;
                    settled = true;
                    timer.clearTimeout(timerHandle);
                    reject(err);
                },
            );
    });
}

module.exports = {
    runWithTimeout,
    TickTimeoutError,
    DEFAULT_TIMEOUT_MS,
};
