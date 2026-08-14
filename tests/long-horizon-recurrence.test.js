'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
    buildFingerprints,
    rankRecurrenceCandidates,
    explainCandidateMatch,
} = require('../lib/long-horizon/fingerprint.js');
const {
    migrateStore,
    openStore,
} = require('../lib/long-horizon/store.js');
const FIXTURE = require('./fixtures/long-horizon/recurrence-process-lost.json');

const ORIGINAL = FIXTURE.occurrences[0];
const INVERSE = FIXTURE.occurrences[1];
const RENAMED = FIXTURE.occurrences[2];
const ADJACENT = FIXTURE.occurrences[3];

function familyCandidate() {
    return {
        family: structuredClone(FIXTURE.family),
        representativeOccurrence: structuredClone(ORIGINAL),
        fingerprints: buildFingerprints(ORIGINAL.failure, {
            algorithmVersion: FIXTURE.algorithmVersion,
        }),
    };
}

function withTemporaryStore(run) {
    const parent = mkdtempSync(join(tmpdir(), 'devlead-recurrence-test-'));
    const storePath = join(parent, 'v1');
    try {
        return run(storePath);
    } finally {
        rmSync(parent, { recursive: true, force: true });
    }
}

describe('versioned deterministic fingerprints', () => {
    test('builds stable SHA-256 keys from normalized allowlisted dimensions', () => {
        const first = buildFingerprints(ORIGINAL.failure, {
            algorithmVersion: 'fingerprint-v1',
        });
        const equivalent = buildFingerprints({
            ...ORIGINAL.failure,
            operation: '  TERMINATE child  ',
            component: 'PROCESS_SUPERVISOR',
        }, {
            algorithmVersion: 'fingerprint-v1',
        });

        assert.deepEqual(equivalent, first);
        assert.equal(first.algorithmVersion, 'fingerprint-v1');
        for (const layer of ['exact', 'structural', 'component_contract', 'causal_family']) {
            assert.match(
                first[layer],
                new RegExp(`^fingerprint-v1:${layer}:sha256:[a-f0-9]{64}$`),
            );
        }
        const serialized = JSON.stringify(first);
        assert.doesNotMatch(serialized, /terminate_child|process-supervisor|process_identity_mismatch/);
    });

    test('fails before hashing unsupported versions or forbidden failure fields', () => {
        for (const algorithmVersion of ['fingerprint-v2', '', 0, false]) {
            assert.throws(
                () => buildFingerprints(ORIGINAL.failure, { algorithmVersion }),
                (error) => error.code === 'unsupported_algorithm_version',
            );
        }
        assert.throws(
            () => buildFingerprints(ORIGINAL.failure, null),
            (error) => error.code === 'invalid_failure',
        );
        assert.throws(
            () => buildFingerprints({
                ...ORIGINAL.failure,
                accessToken: 'not-a-real-secret',
            }),
            (error) => error.code === 'failure_field_forbidden',
        );
        assert.throws(
            () => buildFingerprints({
                ...ORIGINAL.failure,
                evidenceBody: 'raw evidence must not be retained',
            }),
            (error) => error.code === 'failure_field_forbidden',
        );
        assert.throws(
            () => buildFingerprints({
                ...ORIGINAL.failure,
                errorCode: 'Bearer not-a-real-token',
            }),
            (error) => error.code === 'secret_value_forbidden',
        );
        for (const credentialLikeValue of [
            ['gh', 'p_', 'a'.repeat(36)].join(''),
            ['AK', 'IA', 'A'.repeat(16)].join(''),
            ['ey', 'J', 'a'.repeat(12), '.', 'b'.repeat(12), '.', 'c'.repeat(12)].join(''),
            ...['b', 'a', 'p', 'r', 's'].map(
                (kind) => ['xo', 'x', kind, '-', 'a'.repeat(32)].join(''),
            ),
        ]) {
            assert.throws(
                () => buildFingerprints({
                    ...ORIGINAL.failure,
                    errorCode: credentialLikeValue,
                }),
                (error) => error.code === 'secret_value_forbidden',
            );
        }
    });

    test('rejects Slack-shaped values regardless of underscore placement', () => {
        for (const kind of ['b', 'a', 'p', 'r', 's']) {
            const slackShapedValue = ['xo', 'x', kind, '-', 'a'.repeat(32)].join('');
            for (const credentialLikeValue of [
                `_${slackShapedValue}`,
                `${slackShapedValue}_`,
                `prefix_${slackShapedValue}_suffix`,
            ]) {
                assert.throws(
                    () => buildFingerprints({
                        ...ORIGINAL.failure,
                        errorCode: credentialLikeValue,
                    }),
                    (error) => error.code === 'secret_value_forbidden',
                );
            }
        }
    });
});

describe('deterministic recurrence ranking and explanations', () => {
    test('recommends attach only for exact or structural matches', () => {
        const candidate = familyCandidate();
        const exact = explainCandidateMatch(ORIGINAL, candidate);
        const structuralOccurrence = {
            ...structuredClone(ORIGINAL),
            id: 'same-shape-new-error-code',
            failure: {
                ...ORIGINAL.failure,
                errorCode: 'renamed_process_identity_mismatch',
            },
        };
        const structural = explainCandidateMatch(structuralOccurrence, candidate);

        assert.equal(exact.matchedLayer, 'exact');
        assert.equal(exact.recommendedDisposition, 'attach');
        assert.deepEqual(exact.differences, []);
        assert.equal(structural.matchedLayer, 'structural');
        assert.equal(structural.recommendedDisposition, 'attach');
        assert.deepEqual(
            structural.differences.map((difference) => difference.dimension),
            ['errorCode'],
        );
    });

    test('maps the inverse supervisor/child identity failure to one causal family', () => {
        const candidate = familyCandidate();
        const before = structuredClone({ occurrence: INVERSE, candidate });
        const explanation = explainCandidateMatch(INVERSE, candidate);

        assert.equal(explanation.familyId, FIXTURE.family.familyId);
        assert.equal(explanation.matchedLayer, INVERSE.expected.matchedLayer);
        assert.equal(
            explanation.recommendedDisposition,
            INVERSE.expected.recommendedDisposition,
        );
        assert.ok(
            explanation.differences.some(
                (difference) => difference.dimension === INVERSE.expected.preserveDifference,
            ),
        );
        assert.deepEqual({ occurrence: INVERSE, candidate }, before);
        assert.equal(explanation.sourceAction, 'none');
    });

    test('labels same-direction causal matches by their causal key before the broader contract key', () => {
        const sameCause = {
            ...structuredClone(ORIGINAL),
            id: 'same-cause-new-operation',
            failure: {
                ...ORIGINAL.failure,
                operation: 'reconcile_identity',
                errorCode: 'identity_reconciliation_failed',
            },
        };

        const explanation = explainCandidateMatch(sameCause, familyCandidate());

        assert.equal(explanation.matchedLayer, 'causal_family');
        assert.equal(explanation.recommendedDisposition, 'review_link');
    });

    test('retrieves the 90-day renamed/refactored occurrence by stable contract/invariant keys', () => {
        const ranked = rankRecurrenceCandidates(RENAMED, [familyCandidate()]);

        assert.equal(ranked.length, 1);
        assert.equal(ranked[0].familyId, RENAMED.expected.familyId);
        assert.equal(ranked[0].matchedLayer, RENAMED.expected.matchedLayer);
        assert.equal(
            ranked[0].recommendedDisposition,
            RENAMED.expected.recommendedDisposition,
        );
        assert.ok(
            ranked[0].matchingDimensions.includes('contract') &&
            ranked[0].matchingDimensions.includes('invariant'),
        );
    });

    test('keeps adjacent failures as suggestions with explicit differences', () => {
        const [ranked] = rankRecurrenceCandidates(ADJACENT, [familyCandidate()]);
        const differingDimensions = ranked.differences.map(
            (difference) => difference.dimension,
        );

        assert.equal(
            ranked.recommendedDisposition,
            ADJACENT.expected.recommendedDisposition,
        );
        assert.equal(ranked.matchedLayer, null);
        for (const dimension of ADJACENT.expected.mustDifferOn) {
            assert.ok(differingDimensions.includes(dimension));
        }
    });

    test('uses stable family-id ordering to break equal candidate scores', () => {
        const candidateB = familyCandidate();
        candidateB.family.familyId = 'family-z';
        const candidateA = familyCandidate();
        candidateA.family.familyId = 'family-a';

        assert.deepEqual(
            rankRecurrenceCandidates(INVERSE, [candidateB, candidateA]).map(
                (candidate) => candidate.familyId,
            ),
            ['family-a', 'family-z'],
        );
    });
});

describe('append-only recurrence persistence', () => {
    test('persists family, fingerprint, and occurrence records through the store contract', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: '2026-08-11T00:00:00.000Z',
                storeId: 'recurrence-store-demo',
            });
            const store = openStore(storePath, {
                clock: () => '2026-08-11T00:01:00.000Z',
            });
            const fingerprints = buildFingerprints(ORIGINAL.failure, {
                algorithmVersion: FIXTURE.algorithmVersion,
            });
            const issueKey = FIXTURE.family.canonicalIssueKey;
            const common = {
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey,
                policyVersion: 'issue-integrity-v1',
            };

            store.append({
                ...common,
                operationId: 'record-family-1',
                eventType: 'family_recorded',
                sourceEventIdOrDigest: FIXTURE.family.familyId,
                payload: {
                    familyId: FIXTURE.family.familyId,
                    family: FIXTURE.family,
                    fingerprints,
                },
            });
            store.append({
                ...common,
                operationId: 'record-fingerprints-1',
                eventType: 'fingerprint_recorded',
                sourceEventIdOrDigest: fingerprints.exact,
                payload: {
                    familyId: FIXTURE.family.familyId,
                    algorithmVersion: fingerprints.algorithmVersion,
                    fingerprints,
                },
            });
            store.append({
                ...common,
                operationId: 'record-occurrence-1',
                eventType: 'occurrence_recorded',
                sourceEventIdOrDigest: INVERSE.id,
                payload: {
                    familyId: FIXTURE.family.familyId,
                    occurrenceId: INVERSE.id,
                    observedAt: INVERSE.observedAt,
                    failure: INVERSE.failure,
                    fingerprints: buildFingerprints(INVERSE.failure, {
                        algorithmVersion: FIXTURE.algorithmVersion,
                    }),
                },
            });

            const verification = store.verify();
            assert.equal(verification.valid, true);
            assert.equal(verification.recordCount, 3);

            const journal = readFileSync(join(storePath, 'journal.ndjson'), 'utf8')
                .trimEnd()
                .split('\n')
                .map((line) => JSON.parse(line));
            assert.deepEqual(
                journal.map((record) => record.eventType),
                ['family_recorded', 'fingerprint_recorded', 'occurrence_recorded'],
            );
            const index = JSON.parse(readFileSync(join(storePath, 'index.json'), 'utf8'));
            assert.equal(index.families[FIXTURE.family.familyId], 3);
            for (const key of Object.values(fingerprints).filter(
                (value) => typeof value === 'string' && value.startsWith('fingerprint-v1:'),
            )) {
                assert.equal(index.fingerprints[key], FIXTURE.family.familyId);
            }
        });
    });
});
