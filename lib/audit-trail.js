'use strict';

/*
 * lib/audit-trail.js — Phase 3 §C.2 structured audit trail (Issue #131).
 *
 * Every heartbeat tick emits two siblings:
 *   1. Markdown report (heartbeat.js#writeTickReport) — human-readable.
 *   2. JSON audit record (this module)                — machine-readable.
 *
 * The JSON sibling exists so future tooling (cohesion runner, dashboard Log
 * tab, CI) does not have to parse markdown. v1 schema is intentionally
 * minimal — a passthrough of the tick state plus a schemaVersion pin so we
 * can evolve the shape without breaking readers.
 *
 * v1 schema (frozen):
 *   {
 *     schemaVersion: 1,
 *     timestamp:     ISO-8601 string (same value passed by heartbeat),
 *     writer:        { name: 'heartbeat.js', version: 'v1' },
 *     state:         <heartbeat state object, passthrough, no redaction>,
 *     filesTouched:  string[] (absolute paths the tick wrote)
 *   }
 *
 * Never-throws discipline (mirrors lib/guardrails.js#recordGuardrailViolation):
 *   - Any failure — missing projectRoot, disk full, perm denied, parent is
 *     a file — returns `{ path: null, skipped: true, skipReason: <msg> }`.
 *   - Stderr gets a one-line warning so failures are still visible.
 *   - The tick MUST continue even when the audit write fails; the markdown
 *     report is the user-facing artifact, the JSON is best-effort.
 *
 * Filename convention matches heartbeat.js#writeTickReport exactly:
 *   `timestamp.replace(/[:.]/g, '-') + '.json'`
 * so the two siblings share a stem and can be correlated by tooling.
 *
 * projectRoot is a trusted input in v1 — same assumption as
 * recordGuardrailViolation's auditDir. No allowlist / traversal hardening
 * here; callers own path validity.
 */

const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

/**
 * Write the structured JSON audit record for one heartbeat tick.
 *
 * @param {object}   args
 * @param {string}   args.projectRoot    — repo root; reports/audit/ lives under this
 * @param {string}   args.timestamp      — ISO-8601 timestamp of the tick
 * @param {object}   args.state          — heartbeat state object (passthrough)
 * @param {string[]} [args.filesTouched] — absolute paths the tick wrote
 * @returns {{path: string|null, skipped?: true, skipReason?: string}}
 */
function writeAuditRecord(args) {
    try {
        // Defensive destructuring: missing/null args must NOT throw.
        const { projectRoot, timestamp, state, filesTouched } = args || {};

        if (!projectRoot || typeof projectRoot !== 'string') {
            // Stay silent for this specific failure mode: the tick may call us
            // before projectRoot is resolved and we don't want noisy stderr
            // for a predictable no-op. Still returns skipped.
            return { path: null, skipped: true, skipReason: 'projectRoot missing' };
        }

        if (!timestamp || typeof timestamp !== 'string') {
            // Issue #132: prior to this gate, undefined/null/empty/numeric
            // timestamps produced a literal `reports/audit/.json` (or `42.json`)
            // that silently overwrote earlier calls. Short-circuit here so the
            // filename convention (`<stamp>.replace(/[:.]/g,'-') + '.json'`)
            // is never fed a non-string stem. Mirrors the projectRoot gate.
            return { path: null, skipped: true, skipReason: 'timestamp missing' };
        }

        // Match heartbeat.js#writeTickReport's stem convention (colons + dots
        // are filesystem-hostile on Windows) so the two siblings align.
        const safeStamp = timestamp.replace(/[:.]/g, '-');
        const auditDir = path.join(projectRoot, 'reports', 'audit');
        mkdirSync(auditDir, { recursive: true });

        const auditPath = path.join(auditDir, `${safeStamp}.json`);
        const record = {
            schemaVersion: 1,
            timestamp: timestamp,
            writer: { name: 'heartbeat.js', version: 'v1' },
            state: state,
            // Defensive copy — don't hand the caller's array into the JSON
            // serializer if it's the wrong type; empty array is the safe v1
            // default matching the schema contract.
            filesTouched: Array.isArray(filesTouched) ? filesTouched.slice() : [],
        };

        writeFileSync(auditPath, JSON.stringify(record, null, 2) + '\n', 'utf8');
        return { path: auditPath };
    } catch (err) {
        // Best-effort audit: swallow and surface via stderr + return value.
        // The tick caller must keep running so the markdown report (already
        // written by the time we're called) still reaches the user.
        const msg = (err && err.message) || String(err);
        try {
            process.stderr.write(`[audit-trail] skipped: ${msg}\n`);
        } catch {
            // stderr itself blew up — nothing left to do; still return a
            // structured skip so the caller can log it.
        }
        return { path: null, skipped: true, skipReason: msg };
    }
}

module.exports = {
    writeAuditRecord,
};
