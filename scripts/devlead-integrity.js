#!/usr/bin/env node
'use strict';

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const {
    evaluateIssueIntegrity,
    serializeProjectionList,
    serializeProjectionNdjson,
} = require('../lib/long-horizon/index.js');

const ALLOWED_OPTIONS = new Set(['source', 'issue', 'at', 'format', 'mode', 'fixture']);
const SOURCE_KINDS = new Set(['paperclip', 'github']);
const FORMATS = new Set(['json', 'ndjson']);
const MODES = new Set(['off', 'shadow', 'enforce']);

class CliInputError extends Error {}

function parseArgs(argv) {
    const options = {};
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith('--')) throw new CliInputError('unexpected positional argument');
        const name = token.slice(2);
        if (!ALLOWED_OPTIONS.has(name)) throw new CliInputError('unknown option');
        if (Object.prototype.hasOwnProperty.call(options, name)) {
            throw new CliInputError(`--${name} may be supplied only once`);
        }
        const value = argv[index + 1];
        if (value == null || !value.trim() || value.startsWith('--')) {
            throw new CliInputError(`--${name} requires a value`);
        }
        options[name] = value;
        index += 1;
    }
    return options;
}

function requireEnum(value, allowed, name, fallback) {
    const resolved = value == null ? fallback : value;
    if (!allowed.has(resolved)) throw new CliInputError(`--${name} is invalid`);
    return resolved;
}

function readFixture(path) {
    let text;
    try {
        text = readFileSync(resolve(path), 'utf8');
    } catch {
        throw new CliInputError('fixture could not be read');
    }
    try {
        const fixture = JSON.parse(text);
        if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
            throw new Error('not an object');
        }
        return fixture;
    } catch {
        throw new CliInputError('fixture is not valid JSON');
    }
}

function defaultLocalRecord(fixture, now) {
    const issue = fixture.issue || fixture.sourceSnapshot;
    const policy = fixture.policy;
    if (!issue || !policy) throw new CliInputError('fixture is missing issue or policy input');
    return {
        schemaVersion: 1,
        issueKey: issue.issueKey,
        policyVersion: policy.policyVersion,
        createdAt: issue.createdAt,
        updatedAt: now,
    };
}

function projectionFromFixture(fixture, options) {
    const sourceSnapshot = fixture.issue || fixture.sourceSnapshot;
    if (!sourceSnapshot) throw new CliInputError('fixture is missing an issue snapshot');
    if (options.source && options.source !== sourceSnapshot.sourceKind) {
        throw new CliInputError('--source does not match fixture source');
    }
    if (
        options.issue &&
        options.issue !== sourceSnapshot.sourceIssueId &&
        options.issue !== sourceSnapshot.identifier
    ) {
        throw new CliInputError('--issue does not match fixture issue');
    }
    const now = options.at || fixture.now;
    if (!now) throw new CliInputError('fixture is missing an evaluated time');
    return evaluateIssueIntegrity({
        sourceSnapshot,
        localRecord: fixture.localRecord || defaultLocalRecord(fixture, now),
        dependencies: fixture.dependencies || [],
        events: fixture.events || [],
        leases: fixture.leases || [],
        families: fixture.families || [],
        policy: fixture.policy,
        now,
        sourceWatermark: fixture.sourceWatermark,
    });
}

function main(argv) {
    const options = parseArgs(argv);
    const format = requireEnum(options.format, FORMATS, 'format', 'json');
    if (options.source != null) requireEnum(options.source, SOURCE_KINDS, 'source');
    const configuredMode = requireEnum(options.mode, MODES, 'mode', 'off');
    const fixtureMode = Boolean(options.fixture);
    const mode = fixtureMode && options.mode == null ? 'shadow' : configuredMode;

    if (options.at && !fixtureMode) {
        throw new CliInputError('--at is accepted only with --fixture');
    }
    if (mode === 'off') {
        process.stdout.write(`${JSON.stringify({ mode: 'off', evaluated: false })}\n`);
        return 0;
    }
    if (!fixtureMode) {
        throw new CliInputError('live source evaluation is not configured; use an approved fixture');
    }

    const projection = projectionFromFixture(readFixture(options.fixture), options);
    const output = format === 'ndjson'
        ? serializeProjectionNdjson([projection])
        : `${serializeProjectionList([projection])}\n`;
    process.stdout.write(output);

    return projection.lifecycle.closeAllowed ? 0 : 1;
}

if (require.main === module) {
    try {
        process.exitCode = main(process.argv.slice(2));
    } catch (error) {
        const message = error instanceof CliInputError
            ? error.message
            : 'source evaluation failed';
        process.stderr.write(`devlead-integrity: ${message}\n`);
        process.exitCode = 2;
    }
}

module.exports = { CliInputError, main, parseArgs, projectionFromFixture };
