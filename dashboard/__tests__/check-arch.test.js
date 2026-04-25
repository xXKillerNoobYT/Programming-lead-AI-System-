/**
 * Issue #54 — Phase 3 §A.5: architecture invariants for the cohesion gate.
 *
 * Three invariants:
 *   1. No UI → backbone imports
 *      Nothing under dashboard/app/ or dashboard/__tests__/ imports
 *      heartbeat.js, lib/mcp-client.js, or root tests/.
 *   2. No root-tests → UI cross-imports
 *      Nothing under root tests/ references dashboard/ paths.
 *   3. No Docker strings sneaking back
 *      No literal "docker-compose", "Dockerfile", or "docker run" under
 *      dashboard/, heartbeat.js, lib/, or root tests/.
 *      decision-log.md, reports/ are exempt (historical mentions OK).
 */

const { existsSync, readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');

const DASHBOARD_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(DASHBOARD_ROOT, 'scripts', 'check-arch.js');

function mkSandbox() {
    return mkdtempSync(path.join(os.tmpdir(), 'arch-inv-'));
}

describe('Issue #54 §A.5 — check-arch.js exists + exports', () => {
    it('the runner file exists', () => {
        expect(existsSync(SCRIPT)).toBe(true);
    });

    it('exports an INVARIANTS array of {name, check} objects', () => {
        jest.resetModules();
        const mod = require(SCRIPT);
        expect(Array.isArray(mod.INVARIANTS)).toBe(true);
        expect(mod.INVARIANTS.length).toBeGreaterThanOrEqual(3);
        for (const inv of mod.INVARIANTS) {
            expect(typeof inv.name).toBe('string');
            expect(typeof inv.check).toBe('function');
        }
    });

    it('exports runInvariants(repoRoot) for programmatic use', () => {
        const mod = require(SCRIPT);
        expect(typeof mod.runInvariants).toBe('function');
    });

    it('--help prints usage and exits 0', () => {
        const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
            encoding: 'utf8',
            timeout: 5000,
        });
        expect(result.status).toBe(0);
        expect(`${result.stdout}${result.stderr}`).toMatch(/check-arch|usage|invariants/i);
    });
});

describe('Issue #54 §A.5 — invariant 1: UI must not import backbone', () => {
    it('passes when dashboard/app/ has no backbone references', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'dashboard', 'app'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'dashboard', 'app', 'page.tsx'),
                "import React from 'react';\nexport default function P() { return <div/>; }\n",
            );
            const mod = require(SCRIPT);
            const results = mod.runInvariants(sandbox);
            const ui2bb = results.find((r) => r.name.match(/UI.*backbone/i));
            expect(ui2bb.passed).toBe(true);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('fails when a UI file imports heartbeat.js', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'dashboard', 'app'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'dashboard', 'app', 'page.tsx'),
                "import { tick } from '../../heartbeat';\n",
            );
            const mod = require(SCRIPT);
            const results = mod.runInvariants(sandbox);
            const ui2bb = results.find((r) => r.name.match(/UI.*backbone/i));
            expect(ui2bb.passed).toBe(false);
            expect(ui2bb.violations.length).toBeGreaterThan(0);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});

describe('Issue #54 §A.5 — invariant 2: backbone tests must not reference dashboard/', () => {
    it('passes when root tests/ has no dashboard imports', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'tests'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'tests', 'foo.test.js'),
                "const { test } = require('node:test');\ntest('ok', () => {});\n",
            );
            const mod = require(SCRIPT);
            const results = mod.runInvariants(sandbox);
            const inv = results.find((r) => r.name.match(/backbone.*UI|tests.*dashboard/i));
            expect(inv.passed).toBe(true);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('fails when a root test imports from dashboard/', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'tests'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'tests', 'foo.test.js'),
                "const { x } = require('../dashboard/lib/utils');\n",
            );
            const mod = require(SCRIPT);
            const results = mod.runInvariants(sandbox);
            const inv = results.find((r) => r.name.match(/backbone.*UI|tests.*dashboard/i));
            expect(inv.passed).toBe(false);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});

describe('Issue #54 §A.5 — invariant 3: no Docker strings in source', () => {
    it('passes when no source file mentions Docker', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'dashboard'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'heartbeat.js'),
                "// pure node runtime, no containers\nmodule.exports = {};\n",
            );
            const mod = require(SCRIPT);
            const results = mod.runInvariants(sandbox);
            const inv = results.find((r) => r.name.match(/docker/i));
            expect(inv.passed).toBe(true);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('fails when a source file mentions Dockerfile', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'dashboard'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'heartbeat.js'),
                "// see Dockerfile for image build\n",
            );
            const mod = require(SCRIPT);
            const results = mod.runInvariants(sandbox);
            const inv = results.find((r) => r.name.match(/docker/i));
            expect(inv.passed).toBe(false);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('exempts decision-log.md, reports/ from the Docker check', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'reports'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'decision-log.md'),
                '| D-X | docker-compose deletion |',
            );
            writeFileSync(
                path.join(sandbox, 'reports', 'run-1.md'),
                'mentions Dockerfile cleanup',
            );
            const mod = require(SCRIPT);
            const results = mod.runInvariants(sandbox);
            const inv = results.find((r) => r.name.match(/docker/i));
            expect(inv.passed).toBe(true);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});

describe('Issue #54 §A.5 — runInvariants result shape', () => {
    it('returns an array of {name, passed, violations[]} for each invariant', () => {
        const sandbox = mkSandbox();
        try {
            const mod = require(SCRIPT);
            const results = mod.runInvariants(sandbox);
            expect(Array.isArray(results)).toBe(true);
            for (const r of results) {
                expect(typeof r.name).toBe('string');
                expect(typeof r.passed).toBe('boolean');
                expect(Array.isArray(r.violations)).toBe(true);
            }
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});
