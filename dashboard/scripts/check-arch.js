#!/usr/bin/env node
/**
 * Phase 3 §A.5 — architecture invariants for the cohesion gate (Issue #54).
 *
 * Three invariants:
 *   1. UI must not import backbone — nothing under dashboard/app/ or
 *      dashboard/__tests__/ may reference heartbeat.js, lib/, or root tests/.
 *   2. Backbone tests must not reference dashboard/ — root tests/ must not
 *      import from dashboard/.
 *   3. No Docker strings in source — no literal "docker-compose",
 *      "Dockerfile", or "docker run" under dashboard/, heartbeat.js, lib/,
 *      or root tests/. Docs/, AI plans/, decision-log.md, reports/ are
 *      exempt (historical mentions OK).
 *
 * v1 is grep-level: walkSync + readFileSync + regex. Richer AST checks can
 * land later as §A.5.x sub-leaves.
 *
 * CLI:
 *   node scripts/check-arch.js
 *   node scripts/check-arch.js --help
 *
 * Programmatic:
 *   const { runInvariants } = require('./scripts/check-arch');
 *   const results = runInvariants(repoRoot);
 *   // results = [{name, passed, violations: [{file, line, snippet}, ...]}, ...]
 */

'use strict';

const { readdirSync, readFileSync, statSync, existsSync } = require('node:fs');
const path = require('node:path');

const IGNORE_DIRS = new Set([
    'node_modules',
    '.next',
    '.git',
    'coverage',
    'dist',
    'build',
    '.claude',
]);

const SOURCE_EXTS = new Set([
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.mjs',
    '.cjs',
    '.json',
    '.md',
]);

// The rule-definer must mention the banned patterns literally (regex
// source + test fixtures). All invariants honor this set.
function selfExemptFiles(repoRoot) {
    return new Set([
        path.join(repoRoot, 'dashboard', 'scripts', 'check-arch.js'),
        path.join(repoRoot, 'dashboard', '__tests__', 'check-arch.test.js'),
    ]);
}

function walkSync(dir) {
    const out = [];
    if (!existsSync(dir)) return out;
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return out;
    }
    for (const name of entries) {
        if (IGNORE_DIRS.has(name)) continue;
        const full = path.join(dir, name);
        let st;
        try {
            st = statSync(full);
        } catch {
            continue;
        }
        if (st.isDirectory()) {
            out.push(...walkSync(full));
        } else if (st.isFile()) {
            if (SOURCE_EXTS.has(path.extname(name)) || !path.extname(name)) {
                out.push(full);
            }
        }
    }
    return out;
}

function findInFile(filePath, regex) {
    let content;
    try {
        content = readFileSync(filePath, 'utf8');
    } catch {
        return [];
    }
    const lines = content.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
            out.push({ file: filePath, line: i + 1, snippet: lines[i].trim().slice(0, 200) });
        }
    }
    return out;
}

// -----------------------------------------------------------------------------
// Invariant 1: UI must not import backbone
// -----------------------------------------------------------------------------

function checkUiNoBackboneImports(repoRoot) {
    const uiRoots = [
        path.join(repoRoot, 'dashboard', 'app'),
        path.join(repoRoot, 'dashboard', '__tests__'),
    ];
    const exempt = selfExemptFiles(repoRoot);
    const violations = [];
    const re = /(from|require\s*\()\s*['"`][^'"`]*\b(heartbeat(\.js)?|lib\/mcp-client|tests\/)/;
    for (const root of uiRoots) {
        for (const f of walkSync(root)) {
            if (exempt.has(f)) continue;
            const ext = path.extname(f);
            if (!['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) continue;
            violations.push(...findInFile(f, re));
        }
    }
    return { name: 'UI must not import backbone', passed: violations.length === 0, violations };
}

// -----------------------------------------------------------------------------
// Invariant 2: backbone tests must not reference dashboard/
// -----------------------------------------------------------------------------

function checkBackboneTestsNoDashboard(repoRoot) {
    const root = path.join(repoRoot, 'tests');
    const violations = [];
    const re = /(from|require\s*\()\s*['"`][^'"`]*\bdashboard\//;
    for (const f of walkSync(root)) {
        const ext = path.extname(f);
        if (!['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) continue;
        violations.push(...findInFile(f, re));
    }
    return {
        name: 'backbone tests must not reference dashboard/ (UI cross-import)',
        passed: violations.length === 0,
        violations,
    };
}

// -----------------------------------------------------------------------------
// Invariant 3: no Docker strings in source
// -----------------------------------------------------------------------------

function checkNoDockerStrings(repoRoot) {
    const sourceRoots = [
        path.join(repoRoot, 'dashboard'),
        path.join(repoRoot, 'lib'),
        path.join(repoRoot, 'tests'),
    ];
    // Also include heartbeat.js if present at root.
    const explicitFiles = [path.join(repoRoot, 'heartbeat.js')];

    const exemptPrefixes = [
        path.join(repoRoot, 'reports') + path.sep,
    ];
    const selfExempt = selfExemptFiles(repoRoot);
    const exemptFiles = new Set([path.join(repoRoot, 'decision-log.md'), ...selfExempt]);

    const re = /docker-compose|Dockerfile|docker\s+run/;
    const violations = [];

    function checkPath(p) {
        if (!existsSync(p)) return;
        if (exemptFiles.has(p)) return;
        for (const ex of exemptPrefixes) {
            if (p.startsWith(ex)) return;
        }
        violations.push(...findInFile(p, re));
    }

    for (const root of sourceRoots) {
        for (const f of walkSync(root)) checkPath(f);
    }
    for (const f of explicitFiles) checkPath(f);

    return {
        name: 'no Docker strings in source (decision-log/reports exempt)',
        passed: violations.length === 0,
        violations,
    };
}

const INVARIANTS = [
    { name: 'UI must not import backbone', check: checkUiNoBackboneImports },
    {
        name: 'backbone tests must not reference dashboard/ (UI cross-import)',
        check: checkBackboneTestsNoDashboard,
    },
    {
        name: 'no Docker strings in source (decision-log/reports exempt)',
        check: checkNoDockerStrings,
    },
];

function runInvariants(repoRoot) {
    return INVARIANTS.map((inv) => inv.check(repoRoot));
}

function printHelp() {
    process.stdout.write([
        'check-arch — Phase 3 §A.5 architecture invariants (Issue #54)',
        '',
        'Three invariants enforced:',
        '  1. UI must not import backbone (heartbeat.js / lib/ / root tests/)',
        '  2. Root tests must not reference dashboard/ paths',
        '  3. No Docker strings in source (decision-log.md, reports/ exempt)',
        '',
        'Usage:',
        '  node scripts/check-arch.js',
        '  node scripts/check-arch.js --help',
        '',
        'Exit 0 if all invariants pass; 1 if any violations found.',
    ].join('\n'));
}

function main(argv) {
    if (argv.includes('--help') || argv.includes('-h')) {
        printHelp();
        return 0;
    }
    const repoRoot = path.resolve(__dirname, '..', '..');
    const results = runInvariants(repoRoot);
    let totalViolations = 0;
    for (const r of results) {
        const marker = r.passed ? 'PASS' : 'FAIL';
        process.stdout.write(`[${marker}] ${r.name}\n`);
        for (const v of r.violations) {
            process.stdout.write(`        ${path.relative(repoRoot, v.file)}:${v.line}  ${v.snippet}\n`);
            totalViolations++;
        }
    }
    if (totalViolations > 0) {
        process.stderr.write(`\n${totalViolations} violation(s) found across ${results.filter((r) => !r.passed).length} invariant(s)\n`);
        return 1;
    }
    return 0;
}

if (require.main === module) {
    try {
        process.exit(main(process.argv.slice(2)));
    } catch (err) {
        process.stderr.write(`check-arch crash: ${err.stack || err.message}\n`);
        process.exit(2);
    }
}

module.exports = { INVARIANTS, runInvariants, walkSync };
