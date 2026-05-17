/**
 * Issue #52 — Phase 3 §A.4: coverage-threshold enforcement.
 *
 * Per vault `AI plans/phase-3-plan.md` §A.4: "write last-green coverage to
 * reports/coverage-floor.json on green; check:coverage-threshold reads
 * it and fails if the current run drops below it by > 1 pp."
 *
 * Two pieces:
 *   1. write-coverage-floor.js  — called after a green coverage run,
 *      writes statements/branches/functions/lines % to floor file
 *   2. check-coverage-threshold.js — reads floor, compares against the
 *      latest jest coverage-summary.json, exits 1 if any metric is below
 *      floor by more than 1 percentage point
 */

const { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');

const DASHBOARD_ROOT = path.resolve(__dirname, '..');
const WRITER = path.join(DASHBOARD_ROOT, 'scripts', 'write-coverage-floor.js');
const CHECKER = path.join(DASHBOARD_ROOT, 'scripts', 'check-coverage-threshold.js');

const METRICS = ['statements', 'branches', 'functions', 'lines'];

function mkSandbox() {
    return mkdtempSync(path.join(os.tmpdir(), 'cov-floor-'));
}

describe('Issue #52 §A.4 — write-coverage-floor.js', () => {
    it('the writer file exists at the documented path', () => {
        expect(existsSync(WRITER)).toBe(true);
    });

    it('exports writeFloor(coverageSummary, floorPath) for programmatic use', () => {
        jest.resetModules();
        const mod = require(WRITER);
        expect(typeof mod.writeFloor).toBe('function');
    });

    it('writeFloor() persists statements/branches/functions/lines pct to JSON', () => {
        const mod = require(WRITER);
        const sandbox = mkSandbox();
        try {
            const floorPath = path.join(sandbox, 'coverage-floor.json');
            const summary = {
                total: {
                    statements: { pct: 95.5 },
                    branches: { pct: 87.2 },
                    functions: { pct: 90.0 },
                    lines: { pct: 96.1 },
                },
            };
            mod.writeFloor(summary, floorPath);
            const written = JSON.parse(readFileSync(floorPath, 'utf8'));
            expect(written.statements).toBe(95.5);
            expect(written.branches).toBe(87.2);
            expect(written.functions).toBe(90.0);
            expect(written.lines).toBe(96.1);
            expect(typeof written.timestamp).toBe('string');
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('--help prints usage and exits 0', () => {
        const result = spawnSync(process.execPath, [WRITER, '--help'], {
            encoding: 'utf8',
            timeout: 5000,
        });
        expect(result.status).toBe(0);
        expect(`${result.stdout}${result.stderr}`).toMatch(/coverage-floor|usage/i);
    });
});

describe('Issue #52 §A.4 — check-coverage-threshold.js', () => {
    it('the checker file exists at the documented path', () => {
        expect(existsSync(CHECKER)).toBe(true);
    });

    it('exports compareToFloor(currentSummary, floor, slackPp) for programmatic use', () => {
        jest.resetModules();
        const mod = require(CHECKER);
        expect(typeof mod.compareToFloor).toBe('function');
    });

    it('compareToFloor() passes when every metric is at or above floor', () => {
        const mod = require(CHECKER);
        const current = {
            total: {
                statements: { pct: 95 },
                branches: { pct: 88 },
                functions: { pct: 92 },
                lines: { pct: 96 },
            },
        };
        const floor = { statements: 95, branches: 88, functions: 92, lines: 96 };
        const result = mod.compareToFloor(current, floor, 1);
        expect(result.passed).toBe(true);
        expect(result.failures).toEqual([]);
    });

    it('compareToFloor() passes when current is within slackPp of floor', () => {
        const mod = require(CHECKER);
        const current = {
            total: {
                statements: { pct: 94.2 },
                branches: { pct: 88 },
                functions: { pct: 92 },
                lines: { pct: 96 },
            },
        };
        const floor = { statements: 95, branches: 88, functions: 92, lines: 96 };
        // 95 - 94.2 = 0.8 pp drop, slack = 1pp → still passes
        const result = mod.compareToFloor(current, floor, 1);
        expect(result.passed).toBe(true);
    });

    it('compareToFloor() fails when any metric drops more than slackPp', () => {
        const mod = require(CHECKER);
        const current = {
            total: {
                statements: { pct: 92 }, // 95 - 92 = 3pp drop, slack = 1pp → fails
                branches: { pct: 88 },
                functions: { pct: 92 },
                lines: { pct: 96 },
            },
        };
        const floor = { statements: 95, branches: 88, functions: 92, lines: 96 };
        const result = mod.compareToFloor(current, floor, 1);
        expect(result.passed).toBe(false);
        expect(result.failures).toHaveLength(1);
        expect(result.failures[0].metric).toBe('statements');
        expect(result.failures[0].current).toBe(92);
        expect(result.failures[0].floor).toBe(95);
    });

    it('compareToFloor() flags every failing metric, not just the first', () => {
        const mod = require(CHECKER);
        const current = {
            total: {
                statements: { pct: 80 },
                branches: { pct: 80 },
                functions: { pct: 92 },
                lines: { pct: 80 },
            },
        };
        const floor = { statements: 95, branches: 88, functions: 92, lines: 96 };
        const result = mod.compareToFloor(current, floor, 1);
        expect(result.passed).toBe(false);
        expect(new Set(result.failures.map((f) => f.metric))).toEqual(
            new Set(['statements', 'branches', 'lines']),
        );
    });

    it('--help prints usage and exits 0', () => {
        const result = spawnSync(process.execPath, [CHECKER, '--help'], {
            encoding: 'utf8',
            timeout: 5000,
        });
        expect(result.status).toBe(0);
        expect(`${result.stdout}${result.stderr}`).toMatch(/coverage-threshold|usage/i);
    });

    it('uses default 1pp slack when not overridden', () => {
        const mod = require(CHECKER);
        expect(mod.DEFAULT_SLACK_PP).toBe(1);
    });
});
