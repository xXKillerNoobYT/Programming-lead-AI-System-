#!/usr/bin/env node
/**
 * Phase 3 §C.1.b — static detector for raw outbound-call patterns (Issue #127).
 *
 * Flags raw outbound-call patterns that should flow through `safeFetch` /
 * `safeSpawn` from `lib/guardrails.js`:
 *   - fetch(...)                             -> kind: 'fetch'
 *   - http.request / https.request           -> kind: 'http-request'
 *   - require('node:https') / require('https') etc. -> kind: 'https'
 *   - spawn(), spawnSync()                   -> kind: 'spawn'
 *   - exec variants (regular / File / Sync)  -> kind: 'exec'
 *
 * v1 is regex-level — no scope analysis. False positives are addressable via
 * the inline escape hatch `// guardrail-coverage: allow <reason>`.
 *
 * Exemptions:
 *   - `lib/guardrails.js`                              (wrappers)
 *   - `dashboard/scripts/check-guardrail-coverage.js`  (regex source)
 *   - Files under root `tests/` whose basename starts with `guardrails`
 *   - Any line containing the case-sensitive annotation
 *     `// guardrail-coverage: allow` (reason text after is free-form)
 *
 * Scan roots (relative to repoRoot):
 *   - heartbeat.js
 *   - lib/ (recursively; .js / .mjs / .cjs)
 *   - tests/ (recursively; .js / .mjs / .cjs)
 *
 * NOTE on regex construction: the forbidden identifiers ("spawn", the
 * exec family, "fetch") are assembled from fragments at runtime so that
 * this source file itself does not contain bare call-like literals, which
 * keeps the self-exemption honest even if extra tooling scans it.
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

const SCAN_EXTS = new Set(['.js', '.mjs', '.cjs']);

const SCAN_ROOTS = [
    'heartbeat.js',
    'lib',
    'tests',
];

// -----------------------------------------------------------------------------
// Regex patterns. Each entry is {kind, regex}. Matching is line-by-line so
// the regex does not need to span newlines. Leading non-identifier boundary
// `(?:^|[^a-zA-Z0-9_$])` prevents matching inside identifiers — so
// `safeFetch(` / `safeSpawn(` etc. will NOT match.
// -----------------------------------------------------------------------------

// Runtime-built identifier fragments — see NOTE at top of file.
const ID_FETCH = 'f' + 'etch';
const ID_SPAWN = 's' + 'pawn';
const ID_EXEC = 'e' + 'xec';

const PATTERN_FETCH = new RegExp(
    `(?:^|[^a-zA-Z0-9_$])${ID_FETCH}\\s*\\(|globalThis\\s*\\.\\s*${ID_FETCH}\\s*\\(`,
);
const PATTERN_HTTP_REQUEST = /\bhttps?\s*\.\s*request\s*\(/;
const PATTERN_HTTPS_REQUIRE = /require\s*\(\s*['"](?:node:)?https?['"]\s*\)/;
const PATTERN_SPAWN = new RegExp(
    `(?:^|[^a-zA-Z0-9_$])${ID_SPAWN}(?:Sync)?\\s*\\(`,
);
const PATTERN_EXEC = new RegExp(
    `(?:^|[^a-zA-Z0-9_$])${ID_EXEC}(?:File)?(?:Sync)?\\s*\\(`,
);

const PATTERNS = [
    { kind: 'fetch', regex: PATTERN_FETCH },
    { kind: 'http-request', regex: PATTERN_HTTP_REQUEST },
    { kind: 'https', regex: PATTERN_HTTPS_REQUIRE },
    { kind: 'spawn', regex: PATTERN_SPAWN },
    { kind: 'exec', regex: PATTERN_EXEC },
];

// Case-sensitive per AC #6.
const ALLOW_ANNOTATION = '// guardrail-coverage: allow';

// -----------------------------------------------------------------------------
// Exemptions
// -----------------------------------------------------------------------------

function selfExemptFiles(repoRoot) {
    return new Set([
        path.join(repoRoot, 'lib', 'guardrails.js'),
        path.join(repoRoot, 'dashboard', 'scripts', 'check-guardrail-coverage.js'),
    ]);
}

function isExemptTestFile(filePath, repoRoot) {
    const testsDir = path.join(repoRoot, 'tests') + path.sep;
    if (!filePath.startsWith(testsDir)) return false;
    return path.basename(filePath).startsWith('guardrails');
}

// -----------------------------------------------------------------------------
// Filesystem walk
// -----------------------------------------------------------------------------

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
            if (SCAN_EXTS.has(path.extname(name))) out.push(full);
        }
    }
    return out;
}

function collectFiles(repoRoot) {
    const files = [];
    for (const rel of SCAN_ROOTS) {
        const abs = path.join(repoRoot, rel);
        if (!existsSync(abs)) continue;
        let st;
        try {
            st = statSync(abs);
        } catch {
            continue;
        }
        if (st.isFile()) {
            if (SCAN_EXTS.has(path.extname(abs))) files.push(abs);
        } else if (st.isDirectory()) {
            files.push(...walkSync(abs));
        }
    }
    return files;
}

// -----------------------------------------------------------------------------
// Scan one file
// -----------------------------------------------------------------------------

function scanFile(filePath) {
    let content;
    try {
        content = readFileSync(filePath, 'utf8');
    } catch {
        return [];
    }
    const lines = content.split(/\r?\n/);
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Inline annotation: case-sensitive substring — skip the whole line.
        if (line.includes(ALLOW_ANNOTATION)) continue;
        for (const { kind, regex } of PATTERNS) {
            if (regex.test(line)) {
                hits.push({
                    file: filePath,
                    line: i + 1,
                    snippet: line.trim().slice(0, 200),
                    kind,
                });
            }
        }
    }
    return hits;
}

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------

function runGuardrailCoverage(repoRoot) {
    const exempt = selfExemptFiles(repoRoot);
    const files = collectFiles(repoRoot);
    const violations = [];
    for (const f of files) {
        if (exempt.has(f)) continue;
        if (isExemptTestFile(f, repoRoot)) continue;
        violations.push(...scanFile(f));
    }
    return { passed: violations.length === 0, violations };
}

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

function printHelp() {
    process.stdout.write([
        'check-guardrail-coverage - Phase 3 sec C.1.b static detector (Issue #127)',
        '',
        'Scans heartbeat.js + lib/ + tests/ for raw outbound-call patterns',
        'that should flow through safeFetch / safeSpawn in lib/guardrails.js.',
        '',
        'Detected kinds:',
        '  fetch         bare call / globalThis.<same>',
        '  http-request  http.request(...) / https.request(...)',
        '  https         require("node:https") / require("https") (and http variants)',
        '  spawn         spawn / spawnSync',
        '  exec          exec / execSync / execFile / execFileSync',
        '',
        'Usage:',
        '  node scripts/check-guardrail-coverage.js           exit 0 if clean, 1 on violations',
        '  node scripts/check-guardrail-coverage.js --help    show this help, exit 0',
        '  node scripts/check-guardrail-coverage.js --list    print scan roots, exit 0',
        '',
        'Inline escape hatch: append `// guardrail-coverage: allow <reason>` on a line',
        'to suppress its violation (case-sensitive).',
    ].join('\n') + '\n');
}

function printList() {
    process.stdout.write(SCAN_ROOTS.join('\n') + '\n');
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
    const repoRoot = path.resolve(__dirname, '..', '..');
    const { passed, violations } = runGuardrailCoverage(repoRoot);
    for (const v of violations) {
        process.stdout.write(
            `${path.relative(repoRoot, v.file)}:${v.line}  [${v.kind}]  ${v.snippet}\n`,
        );
    }
    if (!passed) {
        process.stderr.write(`\n${violations.length} guardrail violation(s)\n`);
        return 1;
    }
    return 0;
}

if (require.main === module) {
    try {
        process.exit(main(process.argv.slice(2)));
    } catch (err) {
        process.stderr.write(`check-guardrail-coverage crash: ${err.stack || err.message}\n`);
        process.exit(2);
    }
}

module.exports = { runGuardrailCoverage, PATTERNS, SCAN_ROOTS, walkSync };
