#!/usr/bin/env node
/**
 * Phase 3 §A.4 checker (Issue #52).
 *
 * Compares dashboard/coverage/coverage-summary.json against
 * reports/coverage-floor.json. Fails (exit 1) if any of statements/
 * branches/functions/lines is more than DEFAULT_SLACK_PP percentage points
 * below the floor — preventing a silent coverage regression.
 *
 * If the floor file doesn't exist yet, treats every metric as having a
 * floor of DEFAULT_FLOOR (90) so the first run still has a meaningful gate.
 *
 * CLI:
 *   node scripts/check-coverage-threshold.js
 *   node scripts/check-coverage-threshold.js --slack 0.5
 *   node scripts/check-coverage-threshold.js --help
 *
 * Programmatic:
 *   const { compareToFloor } = require('./scripts/check-coverage-threshold');
 *   const result = compareToFloor(currentSummary, floor, slackPp);
 *   // result = { passed: boolean, failures: [{metric, current, floor}, ...] }
 */

'use strict';

const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const METRICS = ['statements', 'branches', 'functions', 'lines'];
const DEFAULT_SLACK_PP = 1;
const DEFAULT_FLOOR = 90;
const DEFAULT_SUMMARY_PATH = path.resolve(__dirname, '..', 'coverage', 'coverage-summary.json');
const DEFAULT_FLOOR_PATH = path.resolve(__dirname, '..', '..', 'reports', 'coverage-floor.json');

function compareToFloor(currentSummary, floor, slackPp) {
    if (!currentSummary || !currentSummary.total) {
        throw new Error('current coverage summary missing .total');
    }
    const slack = typeof slackPp === 'number' ? slackPp : DEFAULT_SLACK_PP;
    const failures = [];
    for (const metric of METRICS) {
        const m = currentSummary.total[metric];
        if (!m || typeof m.pct !== 'number') {
            throw new Error(`coverage summary missing .total.${metric}.pct`);
        }
        const current = m.pct;
        const floorPct = typeof floor[metric] === 'number' ? floor[metric] : DEFAULT_FLOOR;
        if (current < floorPct - slack) {
            failures.push({ metric, current, floor: floorPct });
        }
    }
    return { passed: failures.length === 0, failures };
}

function readFloorOrDefault() {
    if (!existsSync(DEFAULT_FLOOR_PATH)) {
        const f = {};
        for (const m of METRICS) f[m] = DEFAULT_FLOOR;
        return { floor: f, source: `default ${DEFAULT_FLOOR}%` };
    }
    const parsed = JSON.parse(readFileSync(DEFAULT_FLOOR_PATH, 'utf8'));
    const f = {};
    for (const m of METRICS) {
        f[m] = typeof parsed[m] === 'number' ? parsed[m] : DEFAULT_FLOOR;
    }
    return { floor: f, source: DEFAULT_FLOOR_PATH };
}

function printHelp() {
    process.stdout.write([
        'check-coverage-threshold — Phase 3 §A.4 checker (Issue #52)',
        '',
        'Compares dashboard/coverage/coverage-summary.json against',
        'reports/coverage-floor.json. Exits 1 if any metric drops more than',
        `${DEFAULT_SLACK_PP} percentage point below the floor.`,
        '',
        'Usage:',
        '  node scripts/check-coverage-threshold.js',
        '  node scripts/check-coverage-threshold.js --slack 0.5',
        '  node scripts/check-coverage-threshold.js --help',
        '',
    ].join('\n'));
}

function parseSlackArg(argv) {
    const idx = argv.indexOf('--slack');
    if (idx === -1) return DEFAULT_SLACK_PP;
    const raw = argv[idx + 1];
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
        throw new Error(`--slack expects a non-negative number, got: ${raw}`);
    }
    return n;
}

function main(argv) {
    if (argv.includes('--help') || argv.includes('-h')) {
        printHelp();
        return 0;
    }
    const slack = parseSlackArg(argv);
    if (!existsSync(DEFAULT_SUMMARY_PATH)) {
        process.stderr.write(`coverage summary not found: ${DEFAULT_SUMMARY_PATH}\n`);
        process.stderr.write('Run `npm run test:coverage` first.\n');
        return 1;
    }
    const summary = JSON.parse(readFileSync(DEFAULT_SUMMARY_PATH, 'utf8'));
    const { floor, source } = readFloorOrDefault();
    const result = compareToFloor(summary, floor, slack);
    process.stdout.write(`floor source: ${source} (slack ${slack}pp)\n`);
    for (const m of METRICS) {
        const cur = summary.total[m].pct;
        const fl = floor[m];
        const marker = cur < fl - slack ? 'FAIL' : 'OK  ';
        process.stdout.write(`  ${marker}  ${m}: ${cur}% (floor ${fl}%)\n`);
    }
    if (!result.passed) {
        process.stderr.write(`\ncoverage regression: ${result.failures.length} metric(s) below floor by >${slack}pp\n`);
        return 1;
    }
    return 0;
}

if (require.main === module) {
    try {
        process.exit(main(process.argv.slice(2)));
    } catch (err) {
        process.stderr.write(`check-coverage-threshold crash: ${err.stack || err.message}\n`);
        process.exit(2);
    }
}

module.exports = { compareToFloor, METRICS, DEFAULT_SLACK_PP, DEFAULT_FLOOR };
