'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const {
    STORE_SCHEMA_VERSION,
    PROJECTION_SCHEMA_VERSION,
    POLICY_VERSION,
    FINGERPRINT_ALGORITHM_VERSION,
    VALIDATION_REASON_CODES,
    ATTENTION_STATES,
    LIFECYCLE_STATES,
    MEANINGFUL_ACTIVITY_TYPES,
    ContractValidationError,
    normalizeSourceIssueSnapshot,
    normalizeMeaningfulActivityEvent,
    normalizeAttentionLease,
    normalizeIntegrityRecord,
    normalizeIncidentFamily,
    normalizeOccurrence,
    normalizePolicy,
} = require('../lib/long-horizon/contracts.js');

const FIXTURE_DIR = join(__dirname, 'fixtures', 'long-horizon');
const FIXTURE_FILES = [
    'blocked-chain-8d.json',
    'contracts-valid.json',
    'lifecycle-close-gate.json',
    'recurrence-process-lost.json',
    'red-cases.json',
    'store-v0.json',
    'store-v1.json',
];

function readFixture(name) {
    return JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8'));
}

function assertContractError(fn, code, path) {
    assert.throws(fn, (error) => {
        assert.ok(error instanceof ContractValidationError);
        assert.equal(error.code, code);
        assert.equal(error.path, path);
        return true;
    });
}

describe('versioned contract constants', () => {
    test('freezes the approved schema, policy, enum, and reason-code surface', () => {
        assert.equal(STORE_SCHEMA_VERSION, 1);
        assert.equal(PROJECTION_SCHEMA_VERSION, 1);
        assert.equal(POLICY_VERSION, 'issue-integrity-v1');
        assert.equal(FINGERPRINT_ALGORITHM_VERSION, 'fingerprint-v1');
        assert.deepEqual(ATTENTION_STATES, [
            'none',
            'covered',
            'stalled',
            'needs_attention',
        ]);
        assert.deepEqual(LIFECYCLE_STATES, [
            'investigating',
            'fix_applied',
            'pending_data',
            'probation',
            'verified',
            'done',
        ]);
        assert.deepEqual(MEANINGFUL_ACTIVITY_TYPES, [
            'dependency_progress',
            'fix_applied',
            'input_received',
            'lease_renewed',
            'owner_response',
            'root_cause_updated',
            'verification_observation',
        ]);
        assert.deepEqual(VALIDATION_REASON_CODES, [
            'credential_field_forbidden',
            'duplicate_value',
            'evidence_body_forbidden',
            'field_not_allowed',
            'invalid_enum',
            'invalid_issue_key',
            'invalid_timestamp',
            'invalid_type',
            'invalid_value',
            'missing_required_field',
            'mixed_issue_key',
            'unknown_schema_version',
        ]);
    });
});

describe('approved normalizers', () => {
    const fixture = readFixture('contracts-valid.json');

    test('normalizes the deterministic valid fixture without adding source data', () => {
        assert.deepEqual(
            normalizeSourceIssueSnapshot(fixture.sourceSnapshot),
            fixture.sourceSnapshot,
        );
        assert.deepEqual(
            normalizeMeaningfulActivityEvent(fixture.meaningfulActivityEvent),
            fixture.meaningfulActivityEvent,
        );
        assert.deepEqual(
            normalizeAttentionLease(fixture.attentionLease),
            fixture.attentionLease,
        );
        assert.deepEqual(
            normalizeIntegrityRecord(fixture.integrityRecord),
            fixture.integrityRecord,
        );
        assert.deepEqual(
            normalizeIncidentFamily(fixture.incidentFamily),
            fixture.incidentFamily,
        );
        assert.deepEqual(
            normalizeOccurrence(fixture.occurrence),
            fixture.occurrence,
        );
        assert.deepEqual(normalizePolicy(fixture.policy), fixture.policy);
    });

    test('requires an explicit versioned policy instead of inventing a production timeout', () => {
        const policyWithoutTimeout = { ...fixture.policy };
        delete policyWithoutTimeout.staleAfterMs;
        assertContractError(
            () => normalizePolicy(policyWithoutTimeout),
            'missing_required_field',
            'policy.staleAfterMs',
        );
    });
});

describe('fail-closed contract validation', () => {
    const fixture = readFixture('contracts-valid.json');

    test('rejects unknown schema versions with a stable reason code', () => {
        assertContractError(
            () => normalizeSourceIssueSnapshot({
                ...fixture.sourceSnapshot,
                schemaVersion: 2,
            }),
            'unknown_schema_version',
            'sourceSnapshot.schemaVersion',
        );
    });

    test('rejects mixed issue keys in one source snapshot', () => {
        assertContractError(
            () => normalizeSourceIssueSnapshot({
                ...fixture.sourceSnapshot,
                blockerIssueKeys: ['github:demo/repo:7'],
            }),
            'mixed_issue_key',
            'sourceSnapshot.blockerIssueKeys[0]',
        );
    });

    test('rejects mixed issue keys in leases and families', () => {
        assertContractError(
            () => normalizeAttentionLease({
                ...fixture.attentionLease,
                blockerIssueKey: 'github:demo/repo:7',
            }),
            'mixed_issue_key',
            'attentionLease.blockerIssueKey',
        );
        assertContractError(
            () => normalizeIncidentFamily({
                ...fixture.incidentFamily,
                issueKeys: [
                    ...fixture.incidentFamily.issueKeys,
                    'github:demo/repo:42',
                ],
            }),
            'mixed_issue_key',
            'incidentFamily.issueKeys[1]',
        );
    });

    test('rejects non-canonical or invalid timestamps', () => {
        assertContractError(
            () => normalizeSourceIssueSnapshot({
                ...fixture.sourceSnapshot,
                updatedAt: '2026-08-03 00:00:00',
            }),
            'invalid_timestamp',
            'sourceSnapshot.updatedAt',
        );
        assertContractError(
            () => normalizeAttentionLease({
                ...fixture.attentionLease,
                expiresAt: fixture.attentionLease.startsAt,
            }),
            'invalid_value',
            'attentionLease.expiresAt',
        );
    });

    test('rejects credential-like fields before retaining their values', () => {
        for (const field of ['accessToken', 'apiToken', 'clientSecret', 'password']) {
            assertContractError(
                () => normalizeIntegrityRecord({
                    ...fixture.integrityRecord,
                    rootCause: {
                        ...fixture.integrityRecord.rootCause,
                        [field]: 'not-a-real-value',
                    },
                }),
                'credential_field_forbidden',
                `integrityRecord.rootCause.${field}`,
            );
        }
    });

    test('rejects raw evidence bodies even inside an otherwise valid envelope', () => {
        const verificationEvidence = structuredClone(
            fixture.integrityRecord.verificationEvidence,
        );
        verificationEvidence.evidence[0].body = 'sanitized text must still be refused';
        assertContractError(
            () => normalizeIntegrityRecord({
                ...fixture.integrityRecord,
                verificationEvidence,
            }),
            'evidence_body_forbidden',
            'integrityRecord.verificationEvidence.evidence[0].body',
        );
    });

    test('rejects non-allowlisted integrity payloads', () => {
        assertContractError(
            () => normalizeIntegrityRecord({
                ...fixture.integrityRecord,
                internalPayload: { arbitrary: true },
            }),
            'field_not_allowed',
            'integrityRecord.internalPayload',
        );
    });

    test('rejects cosmetic activity types instead of refreshing attention', () => {
        assertContractError(
            () => normalizeMeaningfulActivityEvent({
                ...fixture.meaningfulActivityEvent,
                type: 'comment_added',
            }),
            'invalid_enum',
            'meaningfulActivityEvent.type',
        );
        assertContractError(
            () => normalizePolicy({
                ...fixture.policy,
                meaningfulActivityTypes: [
                    ...fixture.policy.meaningfulActivityTypes,
                    'label_changed',
                ],
            }),
            'invalid_enum',
            'policy.meaningfulActivityTypes[7]',
        );
    });
});

describe('sanitized deterministic fixtures', () => {
    test('all committed fixture files parse and contain no forbidden payload fields', () => {
        const credentialKey = /^(?:api[_-]?key|authorization|cookie|credential|password|private[_-]?key|secret|token)$/i;
        const evidenceBodyKey = /^(?:body|commentBody|content|evidenceBody|raw|rawBody)$/i;
        const secretValue = /(?:-----BEGIN [A-Z ]+PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~-]+)/;

        function inspect(value, path) {
            if (Array.isArray(value)) {
                value.forEach((item, index) => inspect(item, `${path}[${index}]`));
                return;
            }
            if (value && typeof value === 'object') {
                for (const [key, child] of Object.entries(value)) {
                    assert.doesNotMatch(key, credentialKey, `${path}.${key}`);
                    assert.doesNotMatch(key, evidenceBodyKey, `${path}.${key}`);
                    inspect(child, `${path}.${key}`);
                }
                return;
            }
            if (typeof value === 'string') {
                assert.doesNotMatch(value, secretValue, path);
            }
        }

        for (const fixtureFile of FIXTURE_FILES) {
            inspect(readFixture(fixtureFile), fixtureFile);
        }
    });

    test('freezes the fixed clock, watermark, close-gate reasons, and recurrence boundaries', () => {
        const blocked = readFixture('blocked-chain-8d.json');
        const lifecycle = readFixture('lifecycle-close-gate.json');
        const recurrence = readFixture('recurrence-process-lost.json');

        assert.equal(blocked.now, '2026-08-11T00:00:00.000Z');
        assert.equal(blocked.expected.attention.state, 'stalled');
        assert.equal(blocked.expected.attention.staleSinceAt, '2026-08-06T00:00:00.000Z');
        assert.equal(blocked.sourceWatermark.cursor, 'cursor-demo-0001');
        assert.deepEqual(
            lifecycle.cases.map((entry) => entry.expected.reasons),
            [
                ['root_cause_missing'],
                ['fix_identity_missing'],
                ['verification_evidence_missing'],
                ['recurrence_review_required'],
                [],
            ],
        );
        assert.equal(
            recurrence.occurrences[1].expected.recommendedDisposition,
            'review_link',
        );
        assert.equal(
            recurrence.occurrences[2].expected.matchedLayer,
            'component_contract',
        );
        assert.equal(
            recurrence.occurrences[3].expected.recommendedDisposition,
            'suggest',
        );
    });
});

describe('intentionally unimplemented downstream RED cases', () => {
    const redCases = readFixture('red-cases.json').cases;

    test('keeps every RED case visible, owned, and bound to a deterministic fixture', () => {
        assert.deepEqual(
            redCases.map((entry) => entry.id),
            [
                'attention-lease-expiry',
                'root-cause-close-gate',
                'append-only-store-recovery',
                'inverse-and-renamed-recurrence',
                'cross-surface-projection-parity',
            ],
        );
        for (const redCase of redCases) {
            assert.match(redCase.ownerTest, /^tests\/long-horizon-.+\.test\.js$/);
            assert.match(redCase.module, /^lib\/long-horizon\/.+\.js$/);
            assert.ok(FIXTURE_FILES.includes(redCase.fixture));
            assert.ok(redCase.expectedBehavior.length > 40);
        }
    });

    for (const redCase of redCases) {
        test.todo(`RED ${redCase.id}: ${redCase.expectedBehavior}`, () => {
            assert.fail(
                `Intentionally unimplemented by ${redCase.ownerTest}; ` +
                `future implementation must consume ${redCase.fixture} via ${redCase.module}`,
            );
        });
    }
});
