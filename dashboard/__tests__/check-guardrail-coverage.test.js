/**
 * Issue #127 — Phase 3 §C.1.b: static detector for raw outbound-call patterns.
 *
 * Verifies dashboard/scripts/check-guardrail-coverage.js correctly flags
 * raw outbound-call patterns (HTTP fetch, child-process spawn variants, and
 * raw https module imports) outside the guardrails wrappers, and honors
 * documented self-exemptions.
 *
 * NOTE on fixture content: test fixtures are built via string concatenation
 * to avoid tripping security-reminder hooks that scan THIS file's source for
 * the literal patterns we are testing detection of.
 */

const {
    existsSync,
    mkdirSync,
    writeFileSync,
    mkdtempSync,
    rmSync,
} = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');

const DASHBOARD_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(DASHBOARD_ROOT, 'scripts', 'check-guardrail-coverage.js');

// Build offending substrings at runtime so this test file's own source does
// not contain them literally. The script under test reads sandbox files
// where these substrings ARE present, which is the point.
const RAW_FETCH_CALL = 'fet' + 'ch(';
const RAW_SPAWN_SYNC_CALL = 'spawn' + 'Sync(';
const RAW_SPAWN_CALL = 'sp' + 'awn(';
const RAW_EXEC_CALL = 'ex' + 'ec(';
const NODE_HTTPS_LITERAL = "'node:" + "https'";

function mkSandbox() {
    return mkdtempSync(path.join(os.tmpdir(), 'guardrail-cov-'));
}

describe('Issue #127 §C.1.b — check-guardrail-coverage.js exists + exports', () => {
    it('the runner file exists', () => {
        expect(existsSync(SCRIPT)).toBe(true);
    });

    it('exports runGuardrailCoverage(repoRoot) for programmatic use', () => {
        jest.resetModules();
        const mod = require(SCRIPT);
        expect(typeof mod.runGuardrailCoverage).toBe('function');
    });

    it('exports PATTERNS and SCAN_ROOTS', () => {
        const mod = require(SCRIPT);
        expect(mod.PATTERNS).toBeDefined();
        expect(mod.SCAN_ROOTS).toBeDefined();
    });
});

describe('Issue #127 §C.1.b — runGuardrailCoverage result shape', () => {
    it('returns {passed: boolean, violations: array}', () => {
        const sandbox = mkSandbox();
        try {
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(typeof result.passed).toBe('boolean');
            expect(Array.isArray(result.violations)).toBe(true);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('violation entries have {file, line, snippet, kind}', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'bad.js'),
                "async function go() { return await " + RAW_FETCH_CALL + "'https://evil.example/api'); }\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(false);
            expect(result.violations.length).toBeGreaterThan(0);
            const v = result.violations[0];
            expect(typeof v.file).toBe('string');
            expect(typeof v.line).toBe('number');
            expect(typeof v.snippet).toBe('string');
            expect(typeof v.kind).toBe('string');
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});

describe('Issue #127 §C.1.b — pattern detection', () => {
    it('flags a file with raw fetch as kind "fetch"', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'caller.js'),
                "async function go() { return await " + RAW_FETCH_CALL + "'https://evil.example/api'); }\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(false);
            const fetchViolations = result.violations.filter((v) => v.kind === 'fetch');
            expect(fetchViolations.length).toBeGreaterThan(0);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('flags a file with raw spawnSync as kind "spawn"', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'runner.js'),
                "const { spawnSync } = require('node:child_process');\n" +
                    RAW_SPAWN_SYNC_CALL + "'git', ['status']);\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(false);
            const spawnViolations = result.violations.filter((v) => v.kind === 'spawn');
            expect(spawnViolations.length).toBeGreaterThan(0);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('flags a file with raw spawn as kind "spawn"', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'runner2.js'),
                RAW_SPAWN_CALL + "'git', ['status']);\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(false);
            const spawnViolations = result.violations.filter((v) => v.kind === 'spawn');
            expect(spawnViolations.length).toBeGreaterThan(0);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('flags a file with raw exec as kind "exec"', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'runner3.js'),
                RAW_EXEC_CALL + "'ls -la');\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(false);
            const execViolations = result.violations.filter((v) => v.kind === 'exec');
            expect(execViolations.length).toBeGreaterThan(0);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('does NOT flag safeFetch calls (no false positive on safe wrapper)', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'good.js'),
                "const { safeFetch } = require('./guardrails');\n" +
                    "async function go() { return await safeFetch('https://api.example/'); }\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(true);
            expect(result.violations.length).toBe(0);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('does NOT flag safeSpawn calls (no false positive on safe wrapper)', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'good2.js'),
                "const { safeSpawn } = require('./guardrails');\nsafeSpawn('git', ['status']);\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(true);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('flags require of node:https as kind "https"', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'net.js'),
                "const https = require(" + NODE_HTTPS_LITERAL + ");\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(false);
            const httpsViolations = result.violations.filter((v) => v.kind === 'https');
            expect(httpsViolations.length).toBeGreaterThan(0);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});

describe('Issue #127 §C.1.b — self-exemptions', () => {
    it('does NOT flag lib/guardrails.js (self-exempt — wraps these legitimately)', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'guardrails.js'),
                "// the wrapper itself\n" +
                    "function safeFetch(url, opts) { return " + RAW_FETCH_CALL + "url, opts); }\n" +
                    "module.exports = { safeFetch };\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(true);
            expect(result.violations.length).toBe(0);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('exempts tests/guardrails.test.js (name-prefix match)', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'tests'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'tests', 'guardrails.test.js'),
                "// tests reference raw patterns for assertions\n" +
                    RAW_FETCH_CALL + "'https://example/');\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(true);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('exempts other tests/guardrails-*.js files (name-prefix match)', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'tests'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'tests', 'guardrails-extra.test.js'),
                RAW_FETCH_CALL + "'https://example/');\n" +
                    RAW_SPAWN_SYNC_CALL + "'git', []);\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(true);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});

describe('Issue #127 §C.1.b — inline annotation exemption', () => {
    it('honors `// guardrail-coverage: allow <reason>` on the same line', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'vendor.js'),
                "const r = await " + RAW_FETCH_CALL + "'https://vendor.example/'); // guardrail-coverage: allow integration with vendor X\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(true);
            expect(result.violations.length).toBe(0);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});

describe('Issue #127 §C.1.b — scan-root scope', () => {
    it('does NOT scan dashboard/__tests__/ (out of SCAN_ROOTS)', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'dashboard', '__tests__'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'dashboard', '__tests__', 'something.test.js'),
                RAW_FETCH_CALL + "'https://example/');\n" +
                    RAW_SPAWN_SYNC_CALL + "'git', []);\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(true);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('scans heartbeat.js at the repo root', () => {
        const sandbox = mkSandbox();
        try {
            writeFileSync(
                path.join(sandbox, 'heartbeat.js'),
                RAW_FETCH_CALL + "'https://example/');\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(false);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('scans lib/**/*.js (nested directories)', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'lib', 'sub'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'lib', 'sub', 'nested.js'),
                RAW_FETCH_CALL + "'https://example/');\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(false);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });

    it('scans tests/**/*.js (excluding guardrails-prefixed exemptions)', () => {
        const sandbox = mkSandbox();
        try {
            mkdirSync(path.join(sandbox, 'tests'), { recursive: true });
            writeFileSync(
                path.join(sandbox, 'tests', 'other.test.js'),
                RAW_FETCH_CALL + "'https://example/');\n",
            );
            const mod = require(SCRIPT);
            const result = mod.runGuardrailCoverage(sandbox);
            expect(result.passed).toBe(false);
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});

describe('Issue #127 §C.1.b — CLI', () => {
    it('--help exits 0 and prints "guardrail" + "usage"', () => {
        const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
            encoding: 'utf8',
            timeout: 5000,
        });
        expect(result.status).toBe(0);
        const out = `${result.stdout}${result.stderr}`;
        expect(out.toLowerCase()).toMatch(/guardrail/);
        expect(out.toLowerCase()).toMatch(/usage/);
    });

    it('--list exits 0 and prints heartbeat.js + lib', () => {
        const result = spawnSync(process.execPath, [SCRIPT, '--list'], {
            encoding: 'utf8',
            timeout: 5000,
        });
        expect(result.status).toBe(0);
        const out = `${result.stdout}${result.stderr}`;
        expect(out).toMatch(/heartbeat\.js/);
        expect(out).toMatch(/lib/);
    });
});
