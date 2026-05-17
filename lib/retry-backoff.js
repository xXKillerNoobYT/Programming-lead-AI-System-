'use strict';

/*
 * lib/retry-backoff.js — Phase 3 §C.4.a retry-with-backoff primitive (Issue #139).
 *
 * 6th backbone utility. Wraps an async task with exponential-backoff retry
 * semantics and a caller-provided escalation hook.
 *
 * =============================================================================
 *                       !! DIFFERENT FROM OTHER lib/ MODULES !!
 *
 * Unlike `lib/audit-trail.js` / `lib/pause-lock.js` /
 * `lib/guardrails.js#recordGuardrailViolation`, retryWithBackoff THROWS on
 * final failure.
 *
 * This is INTENTIONAL — callers must be able to distinguish "succeeded on
 * retry N" (task's resolved value is returned) from "failed all N retries"
 * (last error is thrown after onEscalate fires). Swallowing the final error
 * would force every caller to stuff sentinel values into the return channel.
 *
 * Standard JS retry-primitive semantics: caller wraps in try/catch.
 * =============================================================================
 *
 * Call order on a failing task:
 *
 *   task()  →  reject
 *     │
 *     ├─ if not-last attempt:
 *     │     onRetry({attempt, error, nextDelayMs})    ← fires BEFORE the sleep
 *     │     _clock.sleep(nextDelayMs)                 ← so callers can log
 *     │     task()  →  ...                               "retrying in Xms..."
 *     │                                                  before the wait.
 *     └─ if last attempt:
 *           onEscalate({attempts, lastError})         ← fires ONCE, sync,
 *           throw lastError                              BEFORE the throw.
 *
 * DI seam: `_clock` mirrors `_fetchImpl` / `_spawnImpl` in lib/guardrails.js.
 * Tests inject a fake clock whose `sleep` returns immediately so the full
 * suite stays under half a second with zero real setTimeout waits.
 *
 * `delaysMs` sizing rules (locked by Issue #139 acceptance criteria):
 *   - Shorter than maxAttempts-1 → reuse the LAST element for every remaining
 *     retry (NOT modular, NOT linear; explicit spec choice).
 *   - Longer than maxAttempts-1  → silently ignore extras (never index past
 *     the last delay actually needed).
 *
 * maxAttempts semantics (locked):
 *   `maxAttempts=3` means up to 3 RETRIES AFTER the initial attempt. So at
 *   most 4 total task() calls before escalation. The onEscalate payload
 *   reflects the total call count: `attempts = maxAttempts + 1`.
 */

const DEFAULT_DELAYS_MS = [2000, 8000, 30000];
const DEFAULT_MAX_ATTEMPTS = 3;

function defaultClock() {
    return {
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    };
}

/**
 * Retry an async task with exponential backoff.
 *
 * THROWS on final failure after exhausting retries (NOT never-throws).
 * See module header for why this differs from sibling `lib/` modules.
 *
 * @template T
 * @param {object}                                args
 * @param {() => Promise<T>}                      args.task         — async work to attempt
 * @param {number}                                [args.maxAttempts=3] — retries AFTER the initial attempt; MUST be >= 0; total calls = maxAttempts + 1. `maxAttempts:0` is a valid single-shot mode (fail → escalate → throw, no retries).
 * @param {number[]}                              [args.delaysMs=[2000,8000,30000]] — backoff windows BETWEEN attempts
 * @param {(info: {attempt:number, error:Error, nextDelayMs:number}) => void}
 *                                                [args.onRetry]    — fires BEFORE each backoff sleep; `attempt` is 1-indexed (the attempt that just failed). Hooks MUST NOT throw — an exception here will mask the retry error and propagate uncaught.
 * @param {(info: {attempts:number, lastError:Error}) => void}
 *                                                [args.onEscalate] — fires ONCE, synchronously, BEFORE the throw on final failure. Same MUST-NOT-throw rule as onRetry.
 * @param {{sleep: (ms:number) => Promise<void>}} [args._clock]     — DI seam (test-only by convention; matches `_fetchImpl`/`_spawnImpl` in `lib/guardrails.js`). Defaults to setTimeout-based clock. Default timers are NOT `.unref()`d — intentional for long-running daemons like heartbeat.js. Short-lived CLIs that must exit quickly should inject a custom `_clock`.
 * @returns {Promise<T>} the task's resolved value on any successful attempt
 * @throws {Error} the last rejection when all attempts are exhausted (after onEscalate has run)
 */
async function retryWithBackoff(args) {
    const {
        task,
        maxAttempts = DEFAULT_MAX_ATTEMPTS,
        delaysMs = DEFAULT_DELAYS_MS,
        onRetry,
        onEscalate,
        _clock,
    } = args || {};

    // Guard the hot-path defaults. We don't validate aggressively (callers
    // own correctness of the option-object) — just make missing hooks no-ops
    // and pick a real clock when one wasn't injected.
    const noop = () => {};
    const retryHook = typeof onRetry === 'function' ? onRetry : noop;
    const escalateHook = typeof onEscalate === 'function' ? onEscalate : noop;
    const clock = _clock && typeof _clock.sleep === 'function' ? _clock : defaultClock();

    // `attempt` is 1-indexed: the Nth call to task(). Total calls allowed =
    // maxAttempts + 1 (initial + N retries).
    let attempt = 0;
    const totalCalls = maxAttempts + 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        attempt += 1;
        try {
            return await task();
        } catch (err) {
            if (attempt >= totalCalls) {
                // Final failure. onEscalate fires synchronously BEFORE the
                // throw so callers that wrap retryWithBackoff in try/catch
                // observe onEscalate first (see test #11). `attempts` is the
                // total call count, matching maxAttempts + 1 by construction.
                escalateHook({ attempts: totalCalls, lastError: err });
                throw err;
            }

            // Select the next delay:
            //   - `attempt` is 1-indexed, so after the 1st failure we want
            //     delaysMs[0].
            //   - If delaysMs is shorter than needed, reuse the LAST element
            //     (spec choice — not modular, not linear).
            //   - If delaysMs is empty (degenerate input), default to 0ms so
            //     retries still progress. This is a reasonable fallback; the
            //     contract doesn't prescribe empty-array behavior.
            let nextDelayMs;
            if (!Array.isArray(delaysMs) || delaysMs.length === 0) {
                nextDelayMs = 0;
            } else if (attempt - 1 < delaysMs.length) {
                nextDelayMs = delaysMs[attempt - 1];
            } else {
                nextDelayMs = delaysMs[delaysMs.length - 1];
            }

            // onRetry fires BEFORE the sleep so callers can log
            // "retrying in Xms..." before the wait. Payload shape and
            // 1-indexed `attempt` value are pinned by tests #2 and #4.
            retryHook({ attempt, error: err, nextDelayMs });
            await clock.sleep(nextDelayMs);
        }
    }
}

module.exports = {
    retryWithBackoff,
    DEFAULT_DELAYS_MS,
    DEFAULT_MAX_ATTEMPTS,
};
