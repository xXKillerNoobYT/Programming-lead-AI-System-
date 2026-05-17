'use strict';
/*
 * Phase 3 §A.3 cohesion gate (Issue #123).
 *
 * Thin wrapper around dashboard/scripts/cohesion-check.js that:
 *   1. Runs each configured check (via an injected `runCheck` for tests, or
 *      the real module at runtime) and classifies results into blocking vs
 *      flagged per D-20260419-007.
 *   2. Writes a JSON report to <projectRoot>/reports/cohesion/<ISO>.json.
 *   3. Returns a structured summary for heartbeat.js to render.
 *
 * Shape:
 *   runCohesionGate({ projectRoot, options })
 *     → { passed, blockingFailures, flaggedFailures, reportPath, skipReason? }
 *
 * Design notes (why DI over import):
 *   - Tests need to avoid spawning npm subprocesses (slow, flaky, I/O).
 *   - heartbeat.js must not crash if cohesion-check is absent/broken.
 *   - So we accept `options.runCheck` for explicit injection, and fall back
 *     to require(options.cohesionCheckModulePath ?? dashboard/scripts/cohesion-check.js).
 *     Any failure to load/execute → graceful skip (passed:true, reportPath:null,
 *     skipReason:'cohesion-check unavailable').
 */

const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_COHESION_MODULE_RELPATH = path.join('dashboard', 'scripts', 'cohesion-check.js');
const SKIP_REASON = 'cohesion-check unavailable';

/**
 * Resolve the runCheck function + BLOCKING/FLAGGED constants.
 *
 * Preference order:
 *   1. `options.runCheck` + optional `options.blocking` + `options.flagged`
 *      (used by tests for dependency injection).
 *   2. require(`options.cohesionCheckModulePath`) if provided.
 *   3. require(`${projectRoot}/dashboard/scripts/cohesion-check.js`).
 *
 * Returns null on any failure — callers treat that as "skip gracefully".
 */
function resolveRunner({ projectRoot, options = {} }) {
    if (typeof options.runCheck === 'function') {
        return {
            runCheck: options.runCheck,
            blocking: options.blocking || ['check:tests', 'check:types', 'check:coverage-threshold'],
            flagged: options.flagged || ['check:lint', 'check:arch', 'check:deps'],
        };
    }

    const modulePath = options.cohesionCheckModulePath
        || path.join(projectRoot, DEFAULT_COHESION_MODULE_RELPATH);

    try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const mod = require(modulePath);
        if (!mod || typeof mod.runCheck !== 'function') return null;
        return {
            runCheck: mod.runCheck,
            blocking: Array.isArray(mod.BLOCKING) ? mod.BLOCKING : [],
            flagged: Array.isArray(mod.FLAGGED) ? mod.FLAGGED : [],
        };
    } catch {
        return null;
    }
}

/**
 * Execute every check (blocking then flagged) and bucket failures.
 *
 * We always run every check (no fail-fast here). The underlying CLI has a
 * fail-fast mode for humans; the gate wants complete signal for the tick
 * report so heartbeats can see the full picture at a glance.
 */
function executeChecks(runner) {
    const blockingFailures = [];
    const flaggedFailures = [];
    const allResults = { blocking: [], flagged: [] };

    for (const name of runner.blocking) {
        const r = runner.runCheck(name);
        allResults.blocking.push(r);
        if (r.status !== 0) blockingFailures.push({ name: r.name, status: r.status });
    }
    for (const name of runner.flagged) {
        const r = runner.runCheck(name);
        allResults.flagged.push(r);
        if (r.status !== 0) flaggedFailures.push({ name: r.name, status: r.status });
    }

    return { blockingFailures, flaggedFailures, allResults };
}

/**
 * Write a JSON report to <projectRoot>/reports/cohesion/<ISO>.json. On any
 * I/O failure, return null — the gate result remains valid.
 */
function writeReport({ projectRoot, allResults, blockingPassed }) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.join(projectRoot, 'reports', 'cohesion');
    try {
        mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, `${ts}.json`);
        writeFileSync(
            outPath,
            JSON.stringify(
                {
                    timestamp: ts,
                    blocking: allResults.blocking,
                    flagged: allResults.flagged,
                    passedBlocking: blockingPassed,
                },
                null,
                2,
            ),
        );
        return outPath;
    } catch {
        return null;
    }
}

/**
 * Public entry point — see module header for shape.
 */
async function runCohesionGate({ projectRoot, options = {} } = {}) {
    if (!projectRoot) {
        // Defensive: without a projectRoot we cannot write a report. Still
        // return a valid-shaped object rather than throwing into heartbeat.
        return {
            passed: true,
            blockingFailures: [],
            flaggedFailures: [],
            reportPath: null,
            skipReason: SKIP_REASON,
        };
    }

    const runner = resolveRunner({ projectRoot, options });
    if (!runner) {
        return {
            passed: true,
            blockingFailures: [],
            flaggedFailures: [],
            reportPath: null,
            skipReason: SKIP_REASON,
        };
    }

    let execution;
    try {
        execution = executeChecks(runner);
    } catch {
        // Injected runCheck throwing, or underlying runner blowing up, is
        // treated as "unavailable" — heartbeat must not crash.
        return {
            passed: true,
            blockingFailures: [],
            flaggedFailures: [],
            reportPath: null,
            skipReason: SKIP_REASON,
        };
    }

    const passed = execution.blockingFailures.length === 0;
    const reportPath = writeReport({
        projectRoot,
        allResults: execution.allResults,
        blockingPassed: passed,
    });

    return {
        passed,
        blockingFailures: execution.blockingFailures,
        flaggedFailures: execution.flaggedFailures,
        reportPath,
    };
}

module.exports = {
    runCohesionGate,
    // exported for testability
    resolveRunner,
    executeChecks,
    writeReport,
    SKIP_REASON,
};
