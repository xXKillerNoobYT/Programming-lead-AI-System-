'use strict';

const { normalizeIntegrityRecord } = require('./contracts.js');

const CLOSE_REASON_ORDER = Object.freeze([
    'root_cause_missing',
    'fix_identity_missing',
    'verification_evidence_missing',
    'verification_evidence_not_passed',
    'recurrence_review_required',
]);
const RECURRENCE_STATES = new Set(['clear', 'required', 'resolved']);

function normalizeRecurrenceState(value) {
    if (!RECURRENCE_STATES.has(value)) return 'required';
    return value;
}

function deriveLifecycleState(record) {
    const integrityRecord = normalizeIntegrityRecord(record);
    if (!integrityRecord.rootCause || !integrityRecord.fixIdentity) {
        return 'investigating';
    }
    if (!integrityRecord.verificationEvidence) return 'fix_applied';
    if (integrityRecord.verificationEvidence.result === 'pending') return 'pending_data';
    if (integrityRecord.verificationEvidence.result !== 'passed') return 'investigating';

    const recurrenceState = normalizeRecurrenceState(
        integrityRecord.recurrenceReview && integrityRecord.recurrenceReview.state,
    );
    if (recurrenceState === 'required') return 'probation';
    if (recurrenceState === 'resolved') return 'done';
    return 'verified';
}

function evaluateCloseGate({ requestedStatus, integrityRecord, recurrenceState } = {}) {
    if (requestedStatus !== 'done') return { allowed: true, reasons: [] };

    const record = normalizeIntegrityRecord(integrityRecord);
    const reasons = [];
    if (!record.rootCause) reasons.push('root_cause_missing');
    if (!record.fixIdentity) reasons.push('fix_identity_missing');
    if (!record.verificationEvidence) {
        reasons.push('verification_evidence_missing');
    } else if (record.verificationEvidence.result !== 'passed') {
        reasons.push('verification_evidence_not_passed');
    }
    const recordRecurrenceState = record.recurrenceReview && record.recurrenceReview.state;
    const recurrenceCleared = (
        RECURRENCE_STATES.has(recordRecurrenceState) &&
        RECURRENCE_STATES.has(recurrenceState) &&
        recordRecurrenceState !== 'required' &&
        recurrenceState !== 'required' &&
        recordRecurrenceState === recurrenceState
    );
    if (!recurrenceCleared) {
        reasons.push('recurrence_review_required');
    }

    reasons.sort((left, right) => (
        CLOSE_REASON_ORDER.indexOf(left) - CLOSE_REASON_ORDER.indexOf(right)
    ));
    return {
        allowed: reasons.length === 0,
        reasons,
    };
}

module.exports = {
    deriveLifecycleState,
    evaluateCloseGate,
};
