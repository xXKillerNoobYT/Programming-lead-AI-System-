'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const SAFE_FLOORS = Object.freeze({
    '@hono/node-server': '1.19.15',
    'body-parser': '2.3.0',
    'fast-uri': '3.1.5',
    'hono': '4.12.34',
    'ip-address': '10.3.1',
    'qs': '6.15.2',
});

function releaseTuple(version, packageName) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    assert.ok(match, `${packageName} must resolve to a stable semantic version; got ${version}`);
    return match.slice(1).map(Number);
}

function compareReleases(actual, minimum, packageName) {
    const actualParts = releaseTuple(actual, packageName);
    const minimumParts = releaseTuple(minimum, packageName);

    for (let index = 0; index < actualParts.length; index += 1) {
        if (actualParts[index] !== minimumParts[index]) {
            return actualParts[index] - minimumParts[index];
        }
    }
    return 0;
}

test('root lockfile keeps audited MCP SDK transitives at patched versions', async (t) => {
    const lockfilePath = join(__dirname, '..', 'package-lock.json');
    const lockfile = JSON.parse(readFileSync(lockfilePath, 'utf8'));

    for (const [packageName, safeFloor] of Object.entries(SAFE_FLOORS)) {
        await t.test(`${packageName} resolves at ${safeFloor} or newer`, () => {
            const lockedPackage = lockfile.packages[`node_modules/${packageName}`];
            assert.ok(lockedPackage, `${packageName} must remain present in the root dependency graph`);
            assert.ok(
                compareReleases(lockedPackage.version, safeFloor, packageName) >= 0,
                `${packageName} ${lockedPackage.version} is below the audited safe floor ${safeFloor}`,
            );
        });
    }
});
