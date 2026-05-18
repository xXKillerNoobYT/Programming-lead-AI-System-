'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const { parseEnvText, loadEnvFile } = require('../lib/env-file.js');

describe('parseEnvText', () => {
    test('parses simple key/value lines and ignores comments', () => {
        const parsed = parseEnvText(`
# comment
FOO=bar
BAR = baz
INVALID-KEY=skip
`);
        assert.equal(parsed.FOO, 'bar');
        assert.equal(parsed.BAR, 'baz');
        assert.equal(parsed['INVALID-KEY'], undefined);
    });
});

describe('loadEnvFile', () => {
    test('loads values without overriding existing env by default', () => {
        const dir = mkdtempSync(join(tmpdir(), 'env-file-test-'));
        const file = join(dir, '.env');
        try {
            writeFileSync(file, 'E2E_ONE=one\nE2E_TWO=two\n', 'utf8');
            process.env.E2E_TWO = 'existing';
            const result = loadEnvFile(file);
            assert.equal(result.loaded, true);
            assert.equal(process.env.E2E_ONE, 'one');
            assert.equal(process.env.E2E_TWO, 'existing');
        } finally {
            delete process.env.E2E_ONE;
            delete process.env.E2E_TWO;
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('can override existing env vars when requested', () => {
        const dir = mkdtempSync(join(tmpdir(), 'env-file-test-'));
        const file = join(dir, '.env');
        try {
            writeFileSync(file, 'E2E_THREE=from_file\n', 'utf8');
            process.env.E2E_THREE = 'existing';
            loadEnvFile(file, { override: true });
            assert.equal(process.env.E2E_THREE, 'from_file');
        } finally {
            delete process.env.E2E_THREE;
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
