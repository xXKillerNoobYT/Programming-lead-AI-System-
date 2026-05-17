'use strict';

/**
 * lib/guardrails.js — Phase 3 §C.1.a heartbeat guardrails module (Issue #125).
 *
 * Safe wrappers for the outbound-call categories the heartbeat must control.
 * This module is the GATEWAY; §C.1.b's detector will later enforce that all
 * outbound calls flow through here. heartbeat.js is NOT wired through these
 * yet — that is §C.1.c's sub-leaf.
 *
 * Current scope:
 *   - safeFetch(url, options, { allowHosts, _fetchImpl })
 *   - safeSpawn(cmd, args, { allowCmds, _spawnImpl })
 *   - GuardrailViolation (Error subclass, .kind / .detail)
 *   - recordGuardrailViolation(violation, { auditDir })
 *
 * Passthrough policy: if the caller does NOT pass an allowlist, the call
 * goes through unchanged. Allowlists are opt-in for now; callers tighten
 * themselves as they are adopted.
 *
 * Test-injection seams (used ONLY by tests, never by production callers):
 *   - options._fetchImpl  overrides the fetch implementation.
 *                         Default: globalThis.fetch.
 *   - options._spawnImpl  overrides the spawn implementation.
 *                         Default: require('node:child_process').spawnSync.
 *
 * Production callers must not pass these underscore-prefixed fields.
 */

const { spawnSync } = require('node:child_process');
const { mkdirSync, appendFileSync, statSync } = require('node:fs');
const { join } = require('node:path');

/* ------------------------ GuardrailViolation -------------------------- */

/**
 * Error thrown when a guardrail check rejects an outbound call.
 *
 * @property {'fetch' | 'spawn'} kind  — which guardrail fired
 * @property {object}            detail — structured info about the attempt
 */
class GuardrailViolation extends Error {
    constructor(kind, detail) {
        const summary = buildViolationSummary(kind, detail);
        super(summary);
        this.name = 'GuardrailViolation';
        this.kind = kind;
        this.detail = detail || {};
    }
}

function buildViolationSummary(kind, detail) {
    if (kind === 'fetch') {
        return `guardrail violation (fetch): host "${(detail && detail.host) || '?'}" not allowed`;
    }
    if (kind === 'spawn') {
        return `guardrail violation (spawn): cmd "${(detail && detail.cmd) || '?'}" not allowed`;
    }
    return `guardrail violation (${kind})`;
}

/* ------------------------------ safeFetch ----------------------------- */

/**
 * Wraps a fetch call with an optional host allowlist.
 *
 * @param {string | URL} url
 * @param {object}       [options]    — forwarded to underlying fetch
 * @param {object}       [guard]      — guardrail + test-injection config
 * @param {string[]}     [guard.allowHosts] — if present, URL host must be in this list
 * @param {Function}     [guard._fetchImpl] — test injection; defaults to globalThis.fetch
 * @returns {Promise<Response>}
 * @throws {GuardrailViolation} when host is not in allowHosts
 */
async function safeFetch(url, options, guard) {
    const cfg = guard || {};
    const fetchImpl = cfg._fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
        throw new Error('safeFetch: no fetch implementation available');
    }

    if (Array.isArray(cfg.allowHosts)) {
        const host = extractHost(url);
        if (!cfg.allowHosts.includes(host)) {
            throw new GuardrailViolation('fetch', {
                url: String(url),
                host,
                allowHosts: cfg.allowHosts.slice(),
            });
        }
    }

    return fetchImpl(url, options);
}

function extractHost(url) {
    if (url instanceof URL) return url.host;
    try {
        return new URL(String(url)).host;
    } catch {
        // Invalid URL — return the raw string so the allowlist check fails
        // deterministically instead of us silently letting it through.
        return String(url);
    }
}

/* ------------------------------ safeSpawn ----------------------------- */

/**
 * Wraps child_process.spawnSync with an optional command allowlist and a
 * hard requirement that args be an Array (refuses the string-shell form,
 * which would reintroduce shell-injection risk).
 *
 * @param {string}       cmd
 * @param {string[]}     args         — MUST be an array; strings are refused
 * @param {object}       [guard]      — guardrail + test-injection config
 * @param {string[]}     [guard.allowCmds]  — if present, cmd must be in this list
 * @param {Function}     [guard._spawnImpl] — test injection; defaults to spawnSync
 * @param {object}       [guard.spawnOptions] — options forwarded to spawn
 * @returns {{status: number|null, stdout: any, stderr: any, [k: string]: any}}
 * @throws {TypeError}          when args is not an array
 * @throws {GuardrailViolation} when cmd is not in allowCmds
 */
function safeSpawn(cmd, args, guard) {
    const cfg = guard || {};

    // Anti-shell-injection guard: refuse anything that isn't an Array.
    // This deliberately rejects strings, undefined, objects, etc.
    if (!Array.isArray(args)) {
        throw new TypeError(
            'safeSpawn: args must be an Array (string form refused to prevent shell injection)',
        );
    }

    if (Array.isArray(cfg.allowCmds) && !cfg.allowCmds.includes(cmd)) {
        throw new GuardrailViolation('spawn', {
            cmd,
            args: args.slice(),
            allowCmds: cfg.allowCmds.slice(),
        });
    }

    const spawnImpl = cfg._spawnImpl || spawnSync;
    return spawnImpl(cmd, args, cfg.spawnOptions);
}

/* ----------------------- recordGuardrailViolation --------------------- */

/**
 * Append a JSONL record for a GuardrailViolation to
 * `<auditDir>/guardrail-violations.jsonl`.
 *
 * Never throws. Creates the directory if missing. Returns false on any
 * failure so the caller keeps running — the audit trail is best-effort
 * and must not crash the heartbeat.
 *
 * @param {GuardrailViolation} violation
 * @param {object}             opts
 * @param {string}             opts.auditDir
 * @returns {boolean} — true on success, false on any write/setup failure
 */
function recordGuardrailViolation(violation, opts) {
    try {
        const auditDir = opts && opts.auditDir;
        if (!auditDir || typeof auditDir !== 'string') return false;

        // If the path exists but is not a directory, bail out cleanly.
        try {
            const st = statSync(auditDir);
            if (!st.isDirectory()) return false;
        } catch {
            // Doesn't exist yet — create it.
            try {
                mkdirSync(auditDir, { recursive: true });
            } catch {
                return false;
            }
        }

        const record = {
            timestamp: new Date().toISOString(),
            kind: violation && violation.kind ? violation.kind : 'unknown',
            detail: (violation && violation.detail) || {},
            message: violation && violation.message ? violation.message : '',
        };

        const line = JSON.stringify(record) + '\n';
        const path = join(auditDir, 'guardrail-violations.jsonl');
        appendFileSync(path, line, 'utf8');
        return true;
    } catch {
        return false;
    }
}

/* ------------------------------- exports ------------------------------ */

module.exports = {
    safeFetch,
    safeSpawn,
    GuardrailViolation,
    recordGuardrailViolation,
};
