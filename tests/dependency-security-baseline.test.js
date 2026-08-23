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

function assertDependencyFloor(lockfile, packageName, safeFloor) {
    const packagePathSuffix = `node_modules/${packageName}`;
    const installedCopies = Object.entries(lockfile.packages).filter(([packagePath]) => (
        packagePath === packagePathSuffix || packagePath.endsWith(`/${packagePathSuffix}`)
    ));

    assert.ok(installedCopies.length > 0, `${packageName} must remain present in the root dependency graph`);
    for (const [packagePath, lockedPackage] of installedCopies) {
        assert.ok(
            compareReleases(lockedPackage.version, safeFloor, packageName) >= 0,
            `${packagePath} resolves ${lockedPackage.version}, below the audited safe floor ${safeFloor}`,
        );
    }
}

test('root lockfile keeps audited MCP SDK transitives at patched versions', async (t) => {
    const lockfilePath = join(__dirname, '..', 'package-lock.json');
    const lockfile = JSON.parse(readFileSync(lockfilePath, 'utf8'));

    for (const [packageName, safeFloor] of Object.entries(SAFE_FLOORS)) {
        await t.test(`${packageName} resolves at ${safeFloor} or newer`, () => {
            assertDependencyFloor(lockfile, packageName, safeFloor);
        });
    }
});

test('security floor rejects a vulnerable nested installation', () => {
    const lockfile = {
        lockfileVersion: 3,
        packages: {
            'node_modules/qs': { version: '6.15.3' },
            'node_modules/example/node_modules/qs': { version: '6.15.1' },
        },
    };

    assert.throws(
        () => assertDependencyFloor(lockfile, 'qs', '6.15.2'),
        /node_modules\/example\/node_modules\/qs.*6\.15\.1.*6\.15\.2/,
    );
});
