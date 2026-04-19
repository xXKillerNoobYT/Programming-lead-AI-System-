#!/usr/bin/env node
/**
 * Phase 3 §A.4 writer (Issue #52).
 *
 * Reads jest's coverage-summary.json (produced by `npm run test:coverage`)
 * and persists each metric's pct to reports/coverage-floor.json. Called
 * after a green coverage run so the next check:coverage-threshold has a
 * fresh floor to compare against.
 *
 * CLI:
 *   node scripts/write-coverage-floor.js
 *   node scripts/write-coverage-floor.js --help
 *
 * Programmatic:
 *   const { writeFloor } = require('./scripts/write-coverage-floor');
 *   writeFloor(coverageSummaryJson, '/path/to/coverage-floor.json');
 */

'use strict';

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const METRICS = ['statements', 'branches', 'functions', 'lines'];
const DEFAULT_SUMMARY_PATH = path.resolve(__dirname, '..', 'coverage', 'coverage-summary.json');
const DEFAULT_FLOOR_PATH = path.resolve(__dirname, '..', '..', 'reports', 'coverage-floor.json');

function writeFloor(coverageSummary, floorPath) {
    if (!coverageSummary || !coverageSummary.total) {
        throw new Error('coverage summary missing .total — run jest --coverage first');
    }
    const out = { timestamp: new Date().toISOString() };
    for (const metric of METRICS) {
        const m = coverageSummary.total[metric];
        if (!m || typeof m.pct !== 'number') {
            throw new Error(`coverage summary missing .total.${metric}.pct`);
        }
        out[metric] = m.pct;
    }
    mkdirSync(path.dirname(floorPath), { recursive: true });
    writeFileSync(floorPath, JSON.stringify(out, null, 2) + '\n');
    return out;
}

function printHelp() {
    process.stdout.write([
        'write-coverage-floor — Phase 3 §A.4 writer (Issue #52)',
        '',
        'Reads dashboard/coverage/coverage-summary.json and writes its total',
        'pct values to reports/coverage-floor.json. Run after a green',
        '`npm run test:coverage` to update the floor.',
        '',
        'Usage:',
        '  node scripts/write-coverage-floor.js',
        '  node scripts/write-coverage-floor.js --help',
        '',
    ].join('\n'));
}

function main(argv) {
    if (argv.includes('--help') || argv.includes('-h')) {
        printHelp();
        return 0;
    }
    if (!existsSync(DEFAULT_SUMMARY_PATH)) {
        process.stderr.write(`coverage summary not found: ${DEFAULT_SUMMARY_PATH}\n`);
        process.stderr.write('Run `npm run test:coverage` first.\n');
        return 1;
    }
    const summary = JSON.parse(readFileSync(DEFAULT_SUMMARY_PATH, 'utf8'));
    const written = writeFloor(summary, DEFAULT_FLOOR_PATH);
    process.stdout.write(
        `wrote floor: ${DEFAULT_FLOOR_PATH}\n` +
            METRICS.map((m) => `  ${m}: ${written[m]}%`).join('\n') +
            '\n',
    );
    return 0;
}

if (require.main === module) {
    try {
        process.exit(main(process.argv.slice(2)));
    } catch (err) {
        process.stderr.write(`write-coverage-floor crash: ${err.stack || err.message}\n`);
        process.exit(2);
    }
}

module.exports = { writeFloor, METRICS };
