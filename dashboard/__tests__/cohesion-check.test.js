/**
 * Issue #23 — Phase 3 §A.1 + §A.2: cohesion check infrastructure.
 *
 * §A.1: package.json exposes check:* scripts so each gate runs standalone.
 * §A.2: scripts/cohesion-check.js orchestrates them in sequence, captures
 *       per-check stdout/stderr + duration + exit code, exits 0 only if
 *       every blocking check passes, writes reports/cohesion/<ts>.json.
 *
 * Blocking vs flagged threshold per D-20260419-007 (Q-20260419-003 = B):
 *   blocking  = check:tests + check:types + check:coverage-threshold
 *   flagged   = check:lint + check:arch + check:deps (non-blocking in Phase 3)
 */

const { readFileSync, existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PKG = JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'cohesion-check.js');

describe('Issue #23 §A.1 — package.json exposes the check:* scripts', () => {
    const EXPECTED = [
        'check:lint',
        'check:types',
        'check:tests',
        'check:coverage-threshold',
        'check:arch',
        'check:deps',
        'check:all',
    ];

    it.each(EXPECTED)('has the %s npm script', (name) => {
        expect(PKG.scripts).toHaveProperty(name);
        expect(typeof PKG.scripts[name]).toBe('string');
        expect(PKG.scripts[name].length).toBeGreaterThan(0);
    });

    it('check:all invokes scripts/cohesion-check.js', () => {
        expect(PKG.scripts['check:all']).toMatch(/cohesion-check\.js/);
    });
});

describe('Issue #23 §A.2 — scripts/cohesion-check.js runner', () => {
    it('the runner file exists at the documented path', () => {
        expect(existsSync(SCRIPT_PATH)).toBe(true);
    });

    it('the runner declares both the blocking + flagged sets per D-20260419-007', () => {
        const src = readFileSync(SCRIPT_PATH, 'utf8');
        for (const name of [
            'check:tests',
            'check:types',
            'check:coverage-threshold',
            'check:lint',
            'check:arch',
            'check:deps',
        ]) {
            expect(src).toContain(name);
        }
    });

    it('--help flag prints usage and exits 0 without running any check', () => {
        const result = spawnSync(process.execPath, [SCRIPT_PATH, '--help'], {
            cwd: PROJECT_ROOT,
            encoding: 'utf8',
            timeout: 5000,
        });
        expect(result.status).toBe(0);
        const out = `${result.stdout || ''}${result.stderr || ''}`;
        expect(out).toMatch(/cohesion-check/i);
        expect(out).toMatch(/--all|--help/);
    });

    it('--list flag prints every check name without running them', () => {
        const result = spawnSync(process.execPath, [SCRIPT_PATH, '--list'], {
            cwd: PROJECT_ROOT,
            encoding: 'utf8',
            timeout: 5000,
        });
        expect(result.status).toBe(0);
        const out = result.stdout || '';
        for (const name of [
            'check:tests',
            'check:types',
            'check:coverage-threshold',
            'check:lint',
            'check:arch',
            'check:deps',
        ]) {
            expect(out).toContain(name);
        }
    });

    it('exports CHECKS + BLOCKING + FLAGGED arrays for programmatic use', () => {
        jest.resetModules();
        const mod = require(SCRIPT_PATH);
        expect(Array.isArray(mod.CHECKS)).toBe(true);
        expect(Array.isArray(mod.BLOCKING)).toBe(true);
        expect(Array.isArray(mod.FLAGGED)).toBe(true);
        expect(new Set(mod.BLOCKING)).toEqual(
            new Set(['check:tests', 'check:types', 'check:coverage-threshold']),
        );
        expect(new Set(mod.FLAGGED)).toEqual(
            new Set(['check:lint', 'check:arch', 'check:deps']),
        );
        expect(new Set(mod.CHECKS)).toEqual(
            new Set([...mod.BLOCKING, ...mod.FLAGGED]),
        );
    });
});
