'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cpSync, mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');

const SAFE_FLOORS = Object.freeze({
    '@hono/node-server': '1.19.15',
    'body-parser': '2.3.0',
    'fast-uri': '3.1.5',
    'hono': '4.12.34',
    'ip-address': '10.3.1',
    'qs': '6.15.2',
});
const APPROVED_REGISTRY_ORIGINS = new Set(['https://registry.npmjs.org']);

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
        const resolvedUrl = new URL(lockedPackage.resolved);
        const packageBasename = packageName.split('/').at(-1);
        const expectedArtifactPath = `/${packageName}/-/${packageBasename}-${lockedPackage.version}.tgz`;
        assert.ok(
            APPROVED_REGISTRY_ORIGINS.has(resolvedUrl.origin) && resolvedUrl.pathname === expectedArtifactPath,
            `${packagePath} must resolve from an approved npm registry source; got ${lockedPackage.resolved}`,
        );
        const integrityMatch = /^sha512-([A-Za-z0-9+/]+={0,2})$/.exec(lockedPackage.integrity || '');
        assert.ok(
            integrityMatch && Buffer.from(integrityMatch[1], 'base64').length === 64,
            `${packagePath} must include valid sha512 integrity`,
        );
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
            'node_modules/qs': {
                version: '6.15.3',
                resolved: 'https://registry.npmjs.org/qs/-/qs-6.15.3.tgz',
                integrity: 'sha512-O9gl3zCl5h5blw1KGUzQKhA5oUXSl8rwUIM5o0S3nCXMliSvy5Dzx7/DJcI+SwgICv+IneSZwhBh1oSyEHA71A==',
            },
            'node_modules/example/node_modules/qs': {
                version: '6.15.1',
                resolved: 'https://registry.npmjs.org/qs/-/qs-6.15.1.tgz',
                integrity: 'sha512-6YHEFRL9mfgcAvql/XhwTvf5jKcOiiupt2FiJxHkiX1z4j7WL8J/jRHYLluORvc1XxB5rV20KoeK00gVJamspg==',
            },
        },
    };

    assert.throws(
        () => assertDependencyFloor(lockfile, 'qs', '6.15.2'),
        /node_modules\/example\/node_modules\/qs.*6\.15\.1.*6\.15\.2/,
    );
});

test('security floor rejects an audited package from an unapproved source', () => {
    const lockfile = {
        lockfileVersion: 3,
        packages: {
            'node_modules/qs': {
                version: '6.15.3',
                resolved: 'https://packages.example.invalid/qs-6.15.3.tgz',
                integrity: 'sha512-O9gl3zCl5h5blw1KGUzQKhA5oUXSl8rwUIM5o0S3nCXMliSvy5Dzx7/DJcI+SwgICv+IneSZwhBh1oSyEHA71A==',
            },
        },
    };

    assert.throws(
        () => assertDependencyFloor(lockfile, 'qs', '6.15.2'),
        /node_modules\/qs.*approved npm registry source/,
    );
});

test('security floor rejects an audited package without sha512 integrity', () => {
    const lockfile = {
        lockfileVersion: 3,
        packages: {
            'node_modules/qs': {
                version: '6.15.3',
                resolved: 'https://registry.npmjs.org/qs/-/qs-6.15.3.tgz',
            },
        },
    };

    assert.throws(
        () => assertDependencyFloor(lockfile, 'qs', '6.15.2'),
        /node_modules\/qs.*valid sha512 integrity/,
    );
});

test('peer-omitting runtime install can import the MCP client', () => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), 'issue-227-omit-peer-'));
    try {
        cpSync(join(__dirname, '..', 'package.json'), join(fixtureDirectory, 'package.json'));
        cpSync(join(__dirname, '..', 'package-lock.json'), join(fixtureDirectory, 'package-lock.json'));
        const npmCommand = process.platform === 'win32' ? process.env.ComSpec : 'npm';
        const npmArguments = process.platform === 'win32'
            ? ['/d', '/s', '/c', 'npm', 'ci', '--ignore-scripts', '--omit=peer', '--offline']
            : ['ci', '--ignore-scripts', '--omit=peer', '--offline'];
        execFileSync(
            npmCommand,
            npmArguments,
            { cwd: fixtureDirectory, encoding: 'utf8', stdio: 'pipe' },
        );
        execFileSync(
            process.execPath,
            ['-e', "require('@modelcontextprotocol/sdk/client/index.js')"],
            { cwd: fixtureDirectory, encoding: 'utf8', stdio: 'pipe' },
        );
    } finally {
        rmSync(fixtureDirectory, { recursive: true, force: true });
    }
});
