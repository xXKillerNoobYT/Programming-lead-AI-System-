#!/usr/bin/env node
/**
 * Phase 3 §A.2 cohesion-check runner (Issue #23).
 *
 * Runs each `check:*` npm script in sequence, captures per-check output +
 * duration + exit code, aggregates into a single pass/fail verdict, and
 * writes a JSON report to reports/cohesion/<ISO-timestamp>.json.
 *
 * Blocking vs flagged per D-20260419-007 (user answer Q-20260419-003 = B):
 *   blocking = check:tests + check:types + check:coverage-threshold
 *   flagged  = check:lint  + check:arch  + check:deps  (non-blocking)
 *
 * Exit codes:
 *   0  — every blocking check passed (flagged may fail; noted in report)
 *   1  — at least one blocking check failed
 *   2  — internal error
 *
 * CLI:
 *   node scripts/cohesion-check.js           fail-fast on first blocking failure
 *   node scripts/cohesion-check.js --all     run every check even after a failure
 *   node scripts/cohesion-check.js --list    list check names + tier, exit 0
 *   node scripts/cohesion-check.js --help    usage, exit 0
 *
 * Safety: spawnSync with args array (no shell-string interpolation of user
 * input). Check names are hardcoded constants; no injection surface.
 */

'use strict';

const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const BLOCKING = ['check:tests', 'check:types', 'check:coverage-threshold'];
const FLAGGED = ['check:lint', 'check:arch', 'check:deps'];
const CHECKS = [...BLOCKING, ...FLAGGED];

function printHelp() {
    const msg = [
        'cohesion-check — Phase 3 §A.2 runner',
        '',
        'Usage:',
        '  node scripts/cohesion-check.js           fail-fast on first blocking failure',
        '  node scripts/cohesion-check.js --all     run every check even after a failure',
        '  node scripts/cohesion-check.js --list    list check names + tier, exit 0',
        '  node scripts/cohesion-check.js --help    show this help, exit 0',
        '',
        'Tiers (D-20260419-007):',
        '  blocking  tests / types / coverage-threshold',
        '  flagged   lint / arch / deps (non-blocking in Phase 3)',
    ].join('\n');
    process.stdout.write(msg + '\n');
}

function printList() {
    const lines = [];
    for (const name of BLOCKING) lines.push(`[blocking] ${name}`);
    for (const name of FLAGGED) lines.push(`[flagged]  ${name}`);
    process.stdout.write(lines.join('\n') + '\n');
}

function runCheck(name) {
    const start = Date.now();
    const result = spawnSync('npm', ['run', name, '--silent'], {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
        shell: true,
        timeout: 5 * 60 * 1000,
    });
    return {
        name,
        tier: BLOCKING.includes(name) ? 'blocking' : 'flagged',
        status: result.status ?? -1,
        durationMs: Date.now() - start,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
    };
}

function main(argv) {
    if (argv.includes('--help') || argv.includes('-h')) {
        printHelp();
        return 0;
    }
    if (argv.includes('--list')) {
        printList();
        return 0;
    }

    const runAll = argv.includes('--all');
    const results = [];
    let sawBlockingFailure = false;

    for (const name of CHECKS) {
        const isBlocking = BLOCKING.includes(name);
        if (sawBlockingFailure && isBlocking && !runAll) {
            results.push({ name, tier: 'blocking', status: null, durationMs: 0, stdout: '', stderr: '', skipped: true });
            continue;
        }
        const r = runCheck(name);
        results.push(r);
        if (r.status !== 0 && isBlocking) sawBlockingFailure = true;
    }

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.resolve(__dirname, '..', '..', 'reports', 'cohesion');
    try {
        mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, `${ts}.json`);
        writeFileSync(
            outPath,
            JSON.stringify(
                {
                    timestamp: ts,
                    blocking: results.filter((r) => r.tier === 'blocking'),
                    flagged: results.filter((r) => r.tier === 'flagged'),
                    passedBlocking: !sawBlockingFailure,
                },
                null,
                2,
            ),
        );
        process.stdout.write(`cohesion report: ${outPath}\n`);
    } catch (err) {
        process.stderr.write(`warning: could not write cohesion report: ${err.message}\n`);
    }

    for (const r of results) {
        const marker = r.skipped ? 'SKIP' : r.status === 0 ? 'PASS' : 'FAIL';
        process.stdout.write(`[${r.tier}] ${marker}  ${r.name}  (${r.durationMs}ms)\n`);
    }

    return sawBlockingFailure ? 1 : 0;
}

if (require.main === module) {
    try {
        process.exit(main(process.argv.slice(2)));
    } catch (err) {
        process.stderr.write(`cohesion-check crash: ${err.stack || err.message}\n`);
        process.exit(2);
    }
}

module.exports = { CHECKS, BLOCKING, FLAGGED, main, runCheck };
