#!/usr/bin/env node
// Phase 3 §A.2 cohesion-check runner (D-20260418-014).
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
const { mkdirSync, writeFileSync, readFileSync, existsSync } = require('node:fs');
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
  const output = (res.stdout ?? '') + (res.stderr ?? '');
  return {
    name: check,
    passed: res.status === 0,
    durationMs,
    exitCode: res.status,
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
    decisionId: decisionId ?? null,
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

// Phase 3 §A.4 (D-20260418-023): on a fully green run, persist the
// current coverage percentages to reports/coverage-floor.json so future
// runs enforce "don't drop below last-green." Only ratchets up — a red
// run never writes the floor.
const COVERAGE_SUMMARY_PATH = path.join(DASHBOARD_ROOT, 'coverage', 'coverage-summary.json');
const COVERAGE_FLOOR_PATH = path.join(__dirname, '..', '..', 'reports', 'coverage-floor.json');

function writeCoverageFloorIfGreen(results, decisionId, ts) {
  const overallPassed = results.every((r) => r.passed);
  if (!overallPassed) return null;
  if (!existsSync(COVERAGE_SUMMARY_PATH)) return null;

  let summary;
  try {
    summary = JSON.parse(readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
  } catch (err) {
    console.warn(`[cohesion-check] coverage-summary.json parse failed: ${err.message}`);
    return null;
  }

  const total = summary?.total;
  if (!total || typeof total.statements?.pct !== 'number') return null;

  const floor = {
    ts,
    decisionId: decisionId ?? null,
    statements: total.statements.pct,
    branches: total.branches.pct,
    functions: total.functions.pct,
    lines: total.lines.pct,
  };
  writeFileSync(COVERAGE_FLOOR_PATH, JSON.stringify(floor, null, 2) + '\n');
  return { path: COVERAGE_FLOOR_PATH, floor };
}

function main() {
  const failFast = !process.argv.includes('--all');
  const decisionId = process.env.COHESION_DECISION_ID ?? null;

  console.log(
    failFast
      ? '[cohesion-check] fail-fast mode (use --all to run every check)'
      : '[cohesion-check] --all mode — runs every check and aggregates'
  );

  const results = runAll(failFast);
  const ts = new Date().toISOString();
  const outPath = writeReport(results, decisionId);
  const overallPassed = results.every((r) => r.passed);

  console.log(`\n[cohesion-check] report → ${path.relative(process.cwd(), outPath)}`);
  console.log(overallPassed ? '[cohesion-check] ✓ ALL PASSED' : '[cohesion-check] ✗ FAILED');

  // §A.4: persist coverage floor on green runs only.
  const floorResult = writeCoverageFloorIfGreen(results, decisionId, ts);
  if (floorResult) {
    const { floor } = floorResult;
    console.log(
      `[cohesion-check] coverage floor updated → stmts ${floor.statements}% / branches ${floor.branches}% / funcs ${floor.functions}% / lines ${floor.lines}%`
    );
  }

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

module.exports = { CHECKS, runSingle, runAll, writeReport, writeCoverageFloorIfGreen };
