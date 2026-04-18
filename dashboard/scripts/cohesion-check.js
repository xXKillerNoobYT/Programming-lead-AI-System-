#!/usr/bin/env node
// Phase 3 §A.2 cohesion-check runner (D-20260418-015).
// Spawns each check:* npm script in sequence, captures per-check output +
// duration + exit code, stops at first failure by default, writes
// reports/cohesion/<ISO-ts>.json.
//
// --all flag runs every check even after a failure (useful for capturing
// a complete baseline even when one check is known-red).
//
// Invocation (from dashboard/):
//   node scripts/cohesion-check.js          # fail-fast
//   node scripts/cohesion-check.js --all    # run everything, aggregate
//   npm run check:all                       # wrapper → runs this script
//
// Safety: spawns with args as an Array (never as a shell-interpolated
// string). Windows needs shell:true to launch npm.cmd from node, but the
// args are hardcoded check-script names with no user input, so there is
// no injection surface. This satisfies the "execFile-style, no shell
// string interpolation" AC in Issue #23.

const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const CHECKS = [
  'check:lint',
  'check:types',
  'check:tests',
  'check:coverage-threshold',
  'check:arch',
  'check:deps',
];

const DASHBOARD_ROOT = path.join(__dirname, '..');
const REPORTS_DIR = path.join(__dirname, '..', '..', 'reports', 'cohesion');

function runSingle(check) {
  const start = Date.now();
  const res = spawnSync(
    'npm',
    ['run', '--silent', check],
    {
      cwd: DASHBOARD_ROOT,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    }
  );
  const durationMs = Date.now() - start;
  const spawnError = res.error ? `\n[spawn-error] ${res.error.message}` : '';
  const signalInfo = res.signal ? `\n[signal] ${res.signal}` : '';
  const output = (res.stdout ?? '') + (res.stderr ?? '') + spawnError + signalInfo;
  const exitCode = Number.isInteger(res.status) ? res.status : 1;
  return {
    name: check,
    passed: exitCode === 0,
    durationMs,
    exitCode,
    output,
  };
}

function runAll(failFast) {
  const results = [];
  for (const check of CHECKS) {
    console.log(`\n▶ ${check}`);
    const result = runSingle(check);
    results.push(result);
    if (result.output) process.stdout.write(result.output);
    console.log(
      result.passed
        ? `✓ ${check} (${result.durationMs}ms)`
        : `✗ ${check} (exit ${result.exitCode}, ${result.durationMs}ms)`
    );
    if (!result.passed && failFast) break;
  }
  return results;
}

function writeReport(results, decisionId) {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const ts = new Date().toISOString();
  const safeTs = ts.replace(/:/g, '-');
  const overallPassed = results.every((r) => r.passed);
  const report = {
    ts,
    decisionId,
    passed: overallPassed,
    checks: results.map((r) => ({
      name: r.name,
      passed: r.passed,
      durationMs: r.durationMs,
      exitCode: r.exitCode,
      output: r.output,
    })),
  };
  const outPath = path.join(REPORTS_DIR, `${safeTs}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

function main() {
  const failFast = !process.argv.includes('--all');
  const decisionId = process.env.COHESION_DECISION_ID || 'UNSPECIFIED';

  console.log(
    failFast
      ? '[cohesion-check] fail-fast mode (use --all to run every check)'
      : '[cohesion-check] --all mode — runs every check and aggregates'
  );

  const results = runAll(failFast);
  const outPath = writeReport(results, decisionId);
  const overallPassed = results.every((r) => r.passed);

  console.log(`\n[cohesion-check] report → ${path.relative(process.cwd(), outPath)}`);
  console.log(overallPassed ? '[cohesion-check] ✓ ALL PASSED' : '[cohesion-check] ✗ FAILED');

  // Summary table for humans
  console.log('\nSummary:');
  for (const r of results) {
    const status = r.passed ? '✓' : '✗';
    const dur = `${r.durationMs}ms`.padStart(8);
    console.log(`  ${status} ${r.name.padEnd(30)} ${dur}  (exit ${r.exitCode})`);
  }

  process.exit(overallPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { CHECKS, runSingle, runAll, writeReport };
