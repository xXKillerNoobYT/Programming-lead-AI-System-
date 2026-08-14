'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const {
    deriveLifecycleState,
    evaluateCloseGate,
} = require('../lib/long-horizon/lifecycle.js');

const FIXTURE_DIR = join(__dirname, 'fixtures', 'long-horizon');

function readFixture(name) {
    return JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8'));
}

function removeField(record, field) {
    const copy = structuredClone(record);
    delete copy[field];
    return copy;
}

describe('deriveLifecycleState', () => {
    const complete = readFixture('contracts-valid.json').integrityRecord;

    test('derives deterministic states from the validated integrity envelope', () => {
        assert.equal(deriveLifecycleState(removeField(complete, 'rootCause')), 'investigating');
        assert.equal(deriveLifecycleState(removeField(complete, 'fixIdentity')), 'investigating');
        assert.equal(
            deriveLifecycleState(removeField(complete, 'verificationEvidence')),
            'fix_applied',
        );
        assert.equal(
            deriveLifecycleState({
                ...complete,
                verificationEvidence: {
                    ...complete.verificationEvidence,
                    result: 'pending',
                },
            }),
            'pending_data',
        );
        assert.equal(
            deriveLifecycleState({
                ...complete,
                recurrenceReview: { state: 'required' },
            }),
            'probation',
        );
        assert.equal(deriveLifecycleState(complete), 'verified');
        assert.equal(
            deriveLifecycleState({
                ...complete,
                recurrenceReview: {
                    ...complete.recurrenceReview,
                    state: 'resolved',
                },
            }),
            'done',
        );
    });
});

describe('evaluateCloseGate', () => {
    const complete = readFixture('contracts-valid.json').integrityRecord;
    const fixture = readFixture('lifecycle-close-gate.json');

    test('rejects every missing close-gate element with stable reason codes', () => {
        for (const fixtureCase of fixture.cases) {
            let record = structuredClone(complete);
            if (fixtureCase.remove) delete record[fixtureCase.remove];
            if (fixtureCase.replace) {
                const [, field] = fixtureCase.replace.path.split('.');
                record.recurrenceReview[field] = fixtureCase.replace.value;
            }

            assert.deepEqual(
                evaluateCloseGate({
                    requestedStatus: fixture.requestedStatus,
                    integrityRecord: record,
                    recurrenceState: record.recurrenceReview && record.recurrenceReview.state,
                }),
                fixtureCase.expected,
                fixtureCase.id,
            );
        }
    });

    test('requires passed verification evidence rather than a merely present envelope', () => {
        for (const result of ['pending', 'failed']) {
            const record = {
                ...complete,
                verificationEvidence: {
                    ...complete.verificationEvidence,
                    result,
                },
            };
            assert.deepEqual(
                evaluateCloseGate({
                    requestedStatus: 'done',
                    integrityRecord: record,
                    recurrenceState: 'clear',
                }),
                {
                    allowed: false,
                    reasons: ['verification_evidence_not_passed'],
                },
            );
        }
    });

    test('collects missing reasons in a stable canonical order', () => {
        const record = removeField(
            removeField(
                removeField(complete, 'rootCause'),
                'fixIdentity',
            ),
            'verificationEvidence',
        );
        assert.deepEqual(
            evaluateCloseGate({
                requestedStatus: 'done',
                integrityRecord: record,
                recurrenceState: 'required',
            }),
            {
                allowed: false,
                reasons: [
                    'root_cause_missing',
                    'fix_identity_missing',
                    'verification_evidence_missing',
                    'recurrence_review_required',
                ],
            },
        );
    });

    test('rejects contradictory or missing recurrence clearance', () => {
        const requiredRecord = {
            ...complete,
            recurrenceReview: { state: 'required' },
        };

        for (const [record, recurrenceState] of [
            [requiredRecord, 'clear'],
            [complete, 'required'],
            [complete, undefined],
        ]) {
            assert.deepEqual(
                evaluateCloseGate({
                    requestedStatus: 'done',
                    integrityRecord: record,
                    recurrenceState,
                }),
                {
                    allowed: false,
                    reasons: ['recurrence_review_required'],
                },
            );
        }
    });

    test('does not gate non-done status requests', () => {
        assert.deepEqual(
            evaluateCloseGate({
                requestedStatus: 'in_review',
                integrityRecord: removeField(complete, 'rootCause'),
                recurrenceState: 'required',
            }),
            { allowed: true, reasons: [] },
        );
    });

    test('requires the versioned integrity record and never consults Date.now', () => {
        const originalDateNow = Date.now;
        Date.now = () => {
            throw new Error('Date.now must not be called');
        };
        try {
            assert.throws(
                () => evaluateCloseGate({
                    requestedStatus: 'done',
                    integrityRecord: removeField(complete, 'policyVersion'),
                    recurrenceState: 'clear',
                }),
                (error) => error && error.code === 'missing_required_field',
            );
            assert.doesNotThrow(() => deriveLifecycleState(complete));
            assert.doesNotThrow(() => evaluateCloseGate({
                requestedStatus: 'done',
                integrityRecord: complete,
                recurrenceState: 'clear',
            }));
        } finally {
            Date.now = originalDateNow;
        }
    });
});
