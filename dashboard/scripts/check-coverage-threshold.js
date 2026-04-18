#!/usr/bin/env node
// Coverage-threshold check for Phase 3 §A.1 (D-20260418-008).
// Reads floor from ../reports/coverage-floor.json when §A.4 writes it;
// hardcodes 90 until then. Uses jest's programmatic API so the threshold
// JSON never has to survive a cross-platform shell (Windows cmd.exe eats
// `{` — hence this script instead of `jest --coverageThreshold=...`).
//
// Invocation: `npm run check:coverage-threshold`

const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const FLOOR_PATH = path.join(__dirname, '..', '..', 'reports', 'coverage-floor.json');
const DEFAULT_FLOOR = 90;
const METRICS = ['statements', 'branches', 'functions', 'lines'];

function readFloor() {
  const defaults = Object.fromEntries(METRICS.map((m) => [m, DEFAULT_FLOOR]));
  if (!existsSync(FLOOR_PATH)) {
    console.log(`[check:coverage-threshold] No ${FLOOR_PATH} yet — using default floor ${DEFAULT_FLOOR}% for all metrics (Phase 3 §A.4 will write a real floor on next green run).`);
    return defaults;
  }
  try {
    const parsed = JSON.parse(readFileSync(FLOOR_PATH, 'utf8'));
    const floor = {};
    for (const metric of METRICS) {
      floor[metric] = typeof parsed[metric] === 'number' ? parsed[metric] : DEFAULT_FLOOR;
    }
    const summary = METRICS.map((m) => `${m} ${floor[m]}%`).join(' · ');
    console.log(`[check:coverage-threshold] Reading floor from ${FLOOR_PATH}: ${summary}.`);
    return floor;
  } catch (err) {
    console.error(`[check:coverage-threshold] Failed to parse ${FLOOR_PATH}: ${err.message}. Falling back to default floor ${DEFAULT_FLOOR}%.`);
    return defaults;
  }
}

(async () => {
  const floor = readFloor();
  const threshold = { global: floor };
  console.log(`[check:coverage-threshold] Running jest programmatically with per-metric threshold.`);

  const dashboardRoot = path.join(__dirname, '..');
  let runCLI;
  try {
    ({ runCLI } = require('@jest/core'));
  } catch (err) {
    console.error(`[check:coverage-threshold] Could not load @jest/core from ${dashboardRoot}: ${err.message}`);
    process.exit(1);
  }

  try {
    const { results } = await runCLI(
      { coverage: true, coverageThreshold: JSON.stringify(threshold), _: [], $0: 'jest' },
      [dashboardRoot]
    );
    if (!results.success) {
      console.error('[check:coverage-threshold] Jest reported failure — coverage below threshold or tests failed.');
      process.exit(1);
    }
    console.log('[check:coverage-threshold] PASS.');
    process.exit(0);
  } catch (err) {
    console.error(`[check:coverage-threshold] Jest run failed: ${err.message}`);
    process.exit(1);
  }
})();
