'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const { evaluateAttention } = require('../lib/long-horizon/attention.js');

const FIXTURE_DIR = join(__dirname, 'fixtures', 'long-horizon');

function readFixture(name) {
    return JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8'));
}

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
}

function buildInput(overrides = {}) {
    const fixture = readFixture('blocked-chain-8d.json');
    return {
        issue: fixture.issue,
        dependencies: fixture.dependencies,
        events: fixture.events,
        leases: fixture.leases,
        policy: fixture.policy,
        now: fixture.now,
        sourceWatermark: fixture.sourceWatermark,
        ...overrides,
    };
}

describe('evaluateAttention', () => {
    test('changes covered to stalled at the exact lease boundary without input writes', () => {
        const lease = readFixture('contracts-valid.json').attentionLease;
        const shared = deepFreeze(buildInput({ leases: [lease] }));
        const before = evaluateAttention({
            ...shared,
            now: '2026-08-05T23:59:59.999Z',
        });
        const atBoundary = evaluateAttention({
            ...shared,
            now: '2026-08-06T00:00:00.000Z',
        });

        assert.equal(before.state, 'covered');
        assert.equal(before.coveredBlockerCount, 1);
        assert.equal(atBoundary.state, 'stalled');
        assert.equal(atBoundary.stalledBlockerCount, 1);
        assert.equal(atBoundary.staleSinceAt, '2026-08-06T00:00:00.000Z');
        assert.equal(atBoundary.sourceWatermark, shared.sourceWatermark);
    });

    test('ignores comments, labels, formatting, and assignment churn', () => {
        const cosmeticTypes = [
            'comment_added',
            'label_changed',
            'formatting_changed',
            'assignment_changed',
        ];
        const cosmeticEvents = cosmeticTypes.map((type, index) => ({
            issueKey: 'paperclip:company-demo:issue-7',
            eventId: `cosmetic-${index}`,
            type,
            occurredAt: '2026-08-10T23:59:59.999Z',
        }));

        const result = evaluateAttention(buildInput({
            events: [
                ...readFixture('blocked-chain-8d.json').events,
                ...cosmeticEvents,
            ],
        }));

        assert.equal(result.state, 'stalled');
        assert.equal(result.staleSinceAt, '2026-08-06T00:00:00.000Z');
    });

    test('keeps a healthy named external wait covered until its lease expires', () => {
        const lease = {
            ...readFixture('contracts-valid.json').attentionLease,
            kind: 'external_input',
            expiresAt: '2026-08-12T00:00:00.000Z',
            nextExpectedActivityAt: '2026-08-12T00:00:00.000Z',
        };

        const result = evaluateAttention(buildInput({
            events: [],
            leases: [lease],
        }));

        assert.equal(result.state, 'covered');
        assert.equal(result.reason, 'covered_dependency');
    });

    test('keeps missing dependency input and unnamed external waits as hard attention blockers', () => {
        const fixture = readFixture('blocked-chain-8d.json');
        const missingDependency = evaluateAttention(buildInput({ dependencies: [] }));
        const unnamedLease = {
            ...readFixture('contracts-valid.json').attentionLease,
            kind: 'external_input',
            expiresAt: '2026-08-12T00:00:00.000Z',
            nextExpectedActivityAt: '2026-08-12T00:00:00.000Z',
        };
        delete unnamedLease.ownerRef;
        const missingOwner = evaluateAttention(buildInput({
            dependencies: fixture.dependencies,
            events: [],
            leases: [unnamedLease],
        }));

        assert.equal(missingDependency.state, 'needs_attention');
        assert.equal(missingDependency.attentionBlockerCount, 1);
        assert.equal(missingOwner.state, 'needs_attention');
        assert.equal(missingOwner.attentionBlockerCount, 1);
    });

    test('returns none when the source issue has no unresolved blockers', () => {
        const fixture = readFixture('blocked-chain-8d.json');
        const result = evaluateAttention(buildInput({
            issue: { ...fixture.issue, blockerIssueKeys: [] },
            dependencies: [],
            events: [],
        }));

        assert.deepEqual(result, {
            state: 'none',
            reason: 'no_unresolved_blockers',
            unresolvedBlockerCount: 0,
            coveredBlockerCount: 0,
            stalledBlockerCount: 0,
            attentionBlockerCount: 0,
            sampleBlockerIdentifier: null,
            sampleStalledBlockerIdentifier: null,
            evaluatedAt: fixture.now,
            staleSinceAt: null,
            policyVersion: fixture.policy.policyVersion,
            sourceWatermark: fixture.sourceWatermark,
        });
    });

    test('requires injected time, policy, and source watermark without consulting Date.now', () => {
        const originalDateNow = Date.now;
        Date.now = () => {
            throw new Error('Date.now must not be called');
        };
        try {
            assert.throws(
                () => evaluateAttention(buildInput({ now: undefined })),
                /now is required/,
            );
            assert.throws(
                () => evaluateAttention(buildInput({ policy: undefined })),
                /policy is required/,
            );
            assert.throws(
                () => evaluateAttention(buildInput({ sourceWatermark: undefined })),
                /sourceWatermark is required/,
            );
            assert.doesNotThrow(() => evaluateAttention(buildInput()));
        } finally {
            Date.now = originalDateNow;
        }
    });

    test('rejects malformed or credential-bearing source watermarks', () => {
        const invalidWatermarks = [
            {
                sourceKind: 'github',
                scopeKey: 'company-demo',
                cursor: 'cursor-demo-0001',
                observedAt: '2026-08-11T00:00:00.000Z',
                snapshotDigest: 'sha256:' + 'b'.repeat(64),
            },
            {
                sourceKind: 'paperclip',
                scopeKey: 'different-company',
                cursor: 'cursor-demo-0001',
                observedAt: '2026-08-11T00:00:00.000Z',
                snapshotDigest: 'sha256:' + 'b'.repeat(64),
            },
            {
                sourceKind: 'paperclip',
                scopeKey: 'company-demo',
                cursor: 'cursor-demo-0001',
                observedAt: 'not-a-timestamp',
                snapshotDigest: 'sha256:' + 'b'.repeat(64),
            },
            {
                sourceKind: 'paperclip',
                scopeKey: 'company-demo',
                cursor: 'cursor-demo-0001',
                observedAt: '2026-08-11T00:00:00.000Z',
                snapshotDigest: 'not-a-digest',
            },
            {
                sourceKind: 'paperclip',
                scopeKey: 'company-demo',
                cursor: 'cursor-demo-0001',
                observedAt: '2026-08-11T00:00:00.000Z',
                snapshotDigest: 'sha256:' + 'b'.repeat(64),
                authorization: 'sanitized-probe',
            },
        ];

        for (const sourceWatermark of invalidWatermarks) {
            assert.throws(
                () => evaluateAttention(buildInput({ sourceWatermark })),
                /sourceWatermark/,
            );
        }
    });
});
