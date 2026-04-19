'use strict';

/*
 * lib/pause-lock.js — Phase 3 §C.3 human-override pause lockfile (Issue #135).
 *
 * A lockfile at `<projectRoot>/.heartbeat-paused` that halts the autonomous
 * heartbeat without touching code. The human (today) or a future dashboard
 * "Pause heartbeat" button (§C.3.d) writes the file; `heartbeat.js#tick()`
 * reads it on every tick and returns early if paused.
 *
 * Lockfile JSON schema:
 *   {
 *     pausedAt:    ISO-8601 string (when the pause began),
 *     pausedUntil: ISO-8601 string (optional — when the pause auto-expires),
 *     reason:      string (optional — shown in the heartbeat status line)
 *   }
 *
 * Design decisions (locked in by the Issue; do NOT re-litigate):
 *
 *   1. Fail-OPEN on malformed JSON.
 *      A corrupt lockfile returns {paused:false, rawError} — NOT {paused:true}.
 *      Rationale: a broken file MUST NOT silently halt the heartbeat. The user
 *      can always write a valid file to really pause; a corrupt file is
 *      probably a partial write / disk error / hand-edit typo, and the safe
 *      fallback is "keep running."
 *
 *   2. Stale lockfiles stay on disk.
 *      When pausedUntil is in the past, readPauseLock returns {paused:false}
 *      but leaves the file untouched. Auto-cleanup is §C.3.d future work.
 *      Rationale: the user sets the pause, the user confirms resume by
 *      removing the file. Auto-deletion hides intent.
 *
 *   3. Never-throws contract on all three public functions.
 *      Mirrors lib/guardrails.js#recordGuardrailViolation and
 *      lib/audit-trail.js#writeAuditRecord. Bad input (null projectRoot,
 *      missing args, perm-denied, disk full) returns a structured object and
 *      logs a one-line warning to stderr. Heartbeat MUST continue running on
 *      any pause-lock failure.
 *
 *   4. writePauseLock's return shape always includes `path`; `pausedUntil`
 *      is present only when `durationMs` was passed.
 */

const { existsSync, readFileSync, writeFileSync, unlinkSync } = require('node:fs');
const path = require('node:path');

const LOCKFILE_NAME = '.heartbeat-paused';

function lockfilePathFor(projectRoot) {
    return path.join(projectRoot, LOCKFILE_NAME);
}

/**
 * Read the pause-lock state from `<projectRoot>/.heartbeat-paused`.
 *
 * @param {string} projectRoot — repo root where the lockfile lives.
 * @returns {{
 *   paused: boolean,
 *   reason?: string,
 *   pausedAt?: string,
 *   pausedUntil?: string,
 *   rawError?: string,
 * }}
 *
 * Contract:
 *   - Returns {paused:false} if the lockfile is missing.
 *   - Returns {paused:false, rawError} if the file is corrupt (fail-OPEN).
 *   - Returns {paused:false} if `pausedUntil` is in the past (stale — file
 *     is left on disk; caller/user must delete).
 *   - Returns {paused:true, ...fields} if valid and not expired.
 *   - NEVER throws.
 */
function readPauseLock(projectRoot) {
    try {
        if (!projectRoot || typeof projectRoot !== 'string') {
            return { paused: false, rawError: 'projectRoot missing' };
        }
        const lockPath = lockfilePathFor(projectRoot);
        if (!existsSync(lockPath)) {
            return { paused: false };
        }

        const raw = readFileSync(lockPath, 'utf8');
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (parseErr) {
            // Fail-OPEN: corrupt lockfile does NOT halt the heartbeat. Surface
            // the parse message so the caller (or a future dashboard) can show
            // the user what's wrong with their file.
            const msg = (parseErr && parseErr.message) || String(parseErr);
            try {
                process.stderr.write(`[pause-lock] malformed JSON — treating as NOT paused: ${msg}\n`);
            } catch { /* swallow stderr failures */ }
            return { paused: false, rawError: msg };
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            // JSON parsed but isn't an object (e.g. "42" or `[1,2]`) — same
            // fail-OPEN posture as malformed JSON.
            const msg = 'lockfile JSON is not an object';
            try {
                process.stderr.write(`[pause-lock] ${msg} — treating as NOT paused\n`);
            } catch { /* swallow */ }
            return { paused: false, rawError: msg };
        }

        const { pausedAt, pausedUntil, reason } = parsed;

        // Stale check: if pausedUntil was set and is in the past, the pause
        // has expired. Leave the file in place per design decision #2 — the
        // user confirms resume by deleting.
        if (pausedUntil && typeof pausedUntil === 'string') {
            const untilMs = Date.parse(pausedUntil);
            // An unparseable pausedUntil (NaN) falls through to paused:true
            // so a hand-edited garbage expiry doesn't silently unlock the
            // heartbeat — user must fix the file or delete it.
            if (Number.isFinite(untilMs) && untilMs <= Date.now()) {
                return { paused: false };
            }
        }

        const result = { paused: true };
        if (typeof pausedAt === 'string') result.pausedAt = pausedAt;
        if (typeof pausedUntil === 'string') result.pausedUntil = pausedUntil;
        if (typeof reason === 'string') result.reason = reason;
        return result;
    } catch (err) {
        // Catch-all for anything the above branches didn't handle (perm
        // denied, unexpected fs errors, …). Fail-OPEN.
        const msg = (err && err.message) || String(err);
        try {
            process.stderr.write(`[pause-lock] readPauseLock failed: ${msg}\n`);
        } catch { /* swallow */ }
        return { paused: false, rawError: msg };
    }
}

/**
 * Write the pause-lock at `<projectRoot>/.heartbeat-paused`.
 *
 * @param {object}  args
 * @param {string}  args.projectRoot — repo root
 * @param {string}  [args.reason]    — human-readable reason string. Non-string
 *                                      values are forwarded to JSON.stringify;
 *                                      circular refs fail-OPEN to {path:null}
 *                                      (via the outer never-throws catch).
 * @param {number}  [args.durationMs] — if set AND > 0, pausedUntil = now + durationMs.
 *                                      0 or negative values are coerced to an
 *                                      indefinite pause (no pausedUntil field)
 *                                      with a stderr warning.
 * @returns {{ path: string|null, pausedUntil?: string }}
 *
 * Contract:
 *   - `path` is always populated on success.
 *   - `pausedUntil` is populated iff `durationMs` was passed AND > 0.
 *   - Returns {path:null} on failure (bad input, write error). NEVER throws.
 */
function writePauseLock(args) {
    try {
        const { projectRoot, reason, durationMs } = args || {};
        if (!projectRoot || typeof projectRoot !== 'string') {
            return { path: null };
        }

        const pausedAt = new Date().toISOString();
        const contents = { pausedAt };
        if (typeof reason === 'string' && reason.length > 0) {
            contents.reason = reason;
        } else if (reason !== undefined && reason !== null && typeof reason !== 'string') {
            // Non-string truthy reason (unusual; the docstring declares
            // `reason?: string`). Include it so JSON.stringify below can
            // reject circular refs via the outer try/catch → {path:null}.
            // This keeps the never-throws contract honest for misuse like
            // `reason: circularObj` without silently dropping data.
            contents.reason = reason;
        }
        let pausedUntil;
        if (durationMs !== undefined) {
            // Issue #136 AC#1: only positive, finite durations produce a
            // bounded pause. 0 or negative durations would write an
            // immediately-stale lockfile — surprising even if harmless — so
            // coerce to an indefinite pause and warn on stderr.
            if (typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0) {
                pausedUntil = new Date(Date.now() + durationMs).toISOString();
                contents.pausedUntil = pausedUntil;
            } else if (typeof durationMs === 'number' && Number.isFinite(durationMs)) {
                try {
                    process.stderr.write('[pause-lock] durationMs <= 0, writing indefinite pause\n');
                } catch { /* swallow */ }
            }
        }

        const lockPath = lockfilePathFor(projectRoot);
        writeFileSync(lockPath, JSON.stringify(contents, null, 2) + '\n', 'utf8');

        const result = { path: lockPath };
        if (pausedUntil) result.pausedUntil = pausedUntil;
        return result;
    } catch (err) {
        const msg = (err && err.message) || String(err);
        try {
            process.stderr.write(`[pause-lock] writePauseLock failed: ${msg}\n`);
        } catch { /* swallow */ }
        return { path: null };
    }
}

/**
 * Delete the pause-lock at `<projectRoot>/.heartbeat-paused`.
 *
 * @param {object} args
 * @param {string} args.projectRoot
 * @returns {{ cleared: boolean }}
 *
 * Contract:
 *   - {cleared:true} iff the file existed and was removed.
 *   - {cleared:false} iff the file was already absent OR removal failed.
 *   - NEVER throws.
 */
function clearPauseLock(args) {
    try {
        const { projectRoot } = args || {};
        if (!projectRoot || typeof projectRoot !== 'string') {
            return { cleared: false };
        }
        const lockPath = lockfilePathFor(projectRoot);
        if (!existsSync(lockPath)) {
            return { cleared: false };
        }
        unlinkSync(lockPath);
        return { cleared: true };
    } catch (err) {
        const msg = (err && err.message) || String(err);
        try {
            process.stderr.write(`[pause-lock] clearPauseLock failed: ${msg}\n`);
        } catch { /* swallow */ }
        return { cleared: false };
    }
}

module.exports = {
    readPauseLock,
    writePauseLock,
    clearPauseLock,
    // Exposed for testing / future callers that want the canonical path.
    LOCKFILE_NAME,
};
