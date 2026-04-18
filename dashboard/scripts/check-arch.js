#!/usr/bin/env node
// Architecture invariants for the cohesion gate. Phase 3 §A.5 · D-20260418-024.
// Supersedes the Run 31 placeholder shipped in #22.
//
// Invocation: `npm run check:arch` (from dashboard/).
//
// Invariants (v1):
//   1. No UI → backbone imports
//        - Nothing under dashboard/app/ or dashboard/__tests__/ imports
//          heartbeat.js, lib/mcp-client.js, or root tests/.
//   2. No root-tests → UI cross-imports
//        - Nothing under root tests/ references dashboard/ paths.
//   3. No Docker strings sneaking back
//        - No literal "docker-compose", "Dockerfile", or "docker run" under
//          dashboard/, heartbeat.js, lib/, or tests/. (Docs/, plans/,
//          decision-log.md are exempt — historical docs may mention the
//          pre-D-005 state.)
//
// v1 is grep-level (readdirSync + readFileSync + regex). Richer checks
// (AST-level dep cycles, layer boundaries) can land as §A.5.1+ if
// surfaced by future heartbeats.

const { readdirSync, readFileSync, statSync } = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'dist',
  'build',
  '.claude',
]);

function walkFiles(root, filter = () => true) {
  const out = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && filter(full)) {
        out.push(full);
      }
    }
  }
  walk(root);
  return out;
}

function readText(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function pathExists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

function rel(p) {
  return path.relative(REPO_ROOT, p).replace(/\\/g, '/');
}

// -----------------------------------------------------------------------------
// Invariants
// -----------------------------------------------------------------------------

function invariantNoUiToBackboneImports() {
  const uiRoot = path.join(REPO_ROOT, 'dashboard');
  if (!pathExists(uiRoot)) {
    return { name: 'no UI → backbone imports', passed: true, skipped: 'dashboard/ missing' };
  }
  const uiFiles = walkFiles(uiRoot, (f) => {
    const r = rel(f);
    return (
      (/\.(ts|tsx|js|jsx|mjs)$/.test(r)) &&
      (r.startsWith('dashboard/app/') || r.startsWith('dashboard/__tests__/'))
    );
  });

  const forbidden = [
    /from\s+['"].*heartbeat(\.js)?['"]/,
    /from\s+['"].*\/lib\/mcp-client(\.js)?['"]/,
    /from\s+['"](\.\.\/)+tests(\/|['"])/,
    /require\(\s*['"].*heartbeat(\.js)?['"]\s*\)/,
    /require\(\s*['"].*\/lib\/mcp-client(\.js)?['"]\s*\)/,
    /require\(\s*['"](\.\.\/)+tests(\/|['"])/,
  ];

  const violations = [];
  for (const file of uiFiles) {
    const text = readText(file);
    for (const pattern of forbidden) {
      const match = text.match(pattern);
      if (match) violations.push({ file: rel(file), match: match[0] });
    }
  }
  return {
    name: 'no UI → backbone imports',
    passed: violations.length === 0,
    violations,
  };
}

function invariantNoRootTestsIntoUi() {
  const testsRoot = path.join(REPO_ROOT, 'tests');
  if (!pathExists(testsRoot)) {
    return { name: 'no root-tests → UI cross-imports', passed: true, skipped: 'tests/ missing' };
  }
  const testFiles = walkFiles(testsRoot, (f) => /\.(test\.)?(mjs|js|cjs)$/.test(f));

  const forbidden = [/\bdashboard[\\/]/, /path\.join\([^)]*['"`]dashboard['"`]\s*,/];

  const violations = [];
  for (const file of testFiles) {
    const text = readText(file);
    for (const pattern of forbidden) {
      const match = text.match(pattern);
      if (match) violations.push({ file: rel(file), match: match[0] });
    }
  }
  return {
    name: 'no root-tests → UI cross-imports',
    passed: violations.length === 0,
    violations,
  };
}

function invariantNoDockerReintroduction() {
  // Scan heartbeat.js, lib/, tests/, dashboard/ source (not package-lock, not .next).
  const targets = [];
  const heartbeatPath = path.join(REPO_ROOT, 'heartbeat.js');
  if (pathExists(heartbeatPath)) targets.push(heartbeatPath);
  // Skip this script itself — it necessarily contains the forbidden strings
  // as detection patterns.
  const selfPath = path.resolve(__filename);
  for (const dir of ['lib', 'tests', 'dashboard']) {
    const abs = path.join(REPO_ROOT, dir);
    if (pathExists(abs)) {
      for (const f of walkFiles(abs)) {
        if (path.resolve(f) === selfPath) continue;
        const r = rel(f);
        // Skip lockfiles (contains upstream names we can't control) and
        // transitive dependency sources.
        if (/package-lock\.json$/.test(r)) continue;
        if (r.includes('/node_modules/')) continue;
        if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|yaml|yml)$/.test(r)) {
          targets.push(f);
        }
      }
    }
  }

  const forbidden = [
    /\bdocker-compose\b/,
    /\bDockerfile\b/,
    /\bdocker\s+run\b/,
  ];

  const violations = [];
  for (const file of targets) {
    const text = readText(file);
    for (const pattern of forbidden) {
      const match = text.match(pattern);
      if (match) violations.push({ file: rel(file), match: match[0] });
    }
  }
  return {
    name: 'no Docker reintroduction in source/tests',
    passed: violations.length === 0,
    violations,
  };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main() {
  console.log('[check:arch] Running architecture invariants...\n');
  const checks = [
    invariantNoUiToBackboneImports(),
    invariantNoRootTestsIntoUi(),
    invariantNoDockerReintroduction(),
  ];

  let failed = 0;
  for (const check of checks) {
    if (check.skipped) {
      console.log(`  ⏭  ${check.name} — skipped (${check.skipped})`);
      continue;
    }
    if (check.passed) {
      console.log(`  ✓ ${check.name}`);
    } else {
      failed++;
      console.log(`  ✗ ${check.name} — ${check.violations.length} violation(s):`);
      for (const v of check.violations) {
        console.log(`      ${v.file}: ${v.match}`);
      }
    }
  }

  if (failed === 0) {
    console.log('\n[check:arch] ✓ all architecture invariants hold');
    process.exit(0);
  } else {
    console.log(`\n[check:arch] ✗ ${failed} invariant(s) violated`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  invariantNoUiToBackboneImports,
  invariantNoRootTestsIntoUi,
  invariantNoDockerReintroduction,
};
