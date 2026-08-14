'use strict';

const STORE_SCHEMA_VERSION = 1;
const PROJECTION_SCHEMA_VERSION = 1;
const POLICY_VERSION = 'issue-integrity-v1';
const FINGERPRINT_ALGORITHM_VERSION = 'fingerprint-v1';

const SOURCE_KINDS = freeze(['github', 'paperclip']);
const SOURCE_OPERATIONAL_STATUSES = freeze([
    'backlog',
    'blocked',
    'cancelled',
    'closed',
    'done',
    'in_progress',
    'in_review',
    'open',
    'todo',
]);
const ATTENTION_STATES = freeze(['none', 'covered', 'stalled', 'needs_attention']);
const LIFECYCLE_STATES = freeze([
    'investigating',
    'fix_applied',
    'pending_data',
    'probation',
    'verified',
    'done',
]);
const MEANINGFUL_ACTIVITY_TYPES = freeze([
    'dependency_progress',
    'fix_applied',
    'input_received',
    'lease_renewed',
    'owner_response',
    'root_cause_updated',
    'verification_observation',
]);
const HARD_BLOCKER_KINDS = freeze(['missing_input', 'missing_owner']);
const EVIDENCE_KINDS = freeze([
    'artifact',
    'commit',
    'config',
    'data',
    'issue',
    'log',
    'metric',
    'test',
    'window',
    'workflow',
]);
const VALIDATION_REASON_CODES = freeze([
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

const CREDENTIAL_FIELD = /^(?:(?:api|access|client|refresh)[_-]?(?:key|secret|token)|authorization|cookie|credential|password|private[_-]?key|secret|token)$/i;
const EVIDENCE_BODY_FIELD = /^(?:body|commentBody|content|evidenceBody|raw|rawBody)$/i;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;

class ContractValidationError extends TypeError {
    constructor(code, path, message) {
        super(`${code} at ${path}: ${message}`);
        this.name = 'ContractValidationError';
        this.code = code;
        this.path = path;
    }
}

function freeze(values) {
    return Object.freeze(values);
}

function fail(code, path, message) {
    throw new ContractValidationError(code, path, message);
}

function scanForbiddenFields(value, path) {
    if (Array.isArray(value)) {
        value.forEach((entry, index) => scanForbiddenFields(entry, `${path}[${index}]`));
        return;
    }
    if (!value || typeof value !== 'object') return;

    for (const [key, child] of Object.entries(value)) {
        const childPath = `${path}.${key}`;
        if (CREDENTIAL_FIELD.test(key)) {
            fail(
                'credential_field_forbidden',
                childPath,
                'credential-like fields are never part of the integrity contract',
            );
        }
        if (EVIDENCE_BODY_FIELD.test(key)) {
            fail(
                'evidence_body_forbidden',
                childPath,
                'raw evidence bodies are forbidden; retain references and digests only',
            );
        }
        scanForbiddenFields(child, childPath);
    }
}

function expectObject(value, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        fail('invalid_type', path, 'expected an object');
    }
    scanForbiddenFields(value, path);
    return value;
}

function assertAllowedKeys(value, allowedKeys, path) {
    const allowed = new Set(allowedKeys);
    for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
            fail('field_not_allowed', `${path}.${key}`, 'field is not allowlisted');
        }
    }
}

function requireField(value, key, path) {
    if (!Object.prototype.hasOwnProperty.call(value, key) || value[key] == null) {
        fail('missing_required_field', `${path}.${key}`, 'field is required');
    }
    return value[key];
}

function normalizeSchemaVersion(value, path) {
    if (value !== STORE_SCHEMA_VERSION) {
        fail(
            'unknown_schema_version',
            path,
            `only schema version ${STORE_SCHEMA_VERSION} is supported`,
        );
    }
    return STORE_SCHEMA_VERSION;
}

function normalizeString(value, path) {
    if (typeof value !== 'string') fail('invalid_type', path, 'expected a string');
    const normalized = value.trim();
    if (!normalized) fail('invalid_value', path, 'must not be empty');
    if (/\p{Cc}/u.test(normalized)) {
        fail('invalid_value', path, 'control characters are not allowed');
    }
    return normalized;
}

function optionalString(value, path) {
    return value == null ? undefined : normalizeString(value, path);
}

function normalizeEnum(value, allowedValues, path) {
    const normalized = normalizeString(value, path);
    if (!allowedValues.includes(normalized)) {
        fail(
            'invalid_enum',
            path,
            `expected one of: ${allowedValues.join(', ')}`,
        );
    }
    return normalized;
}

function normalizeTimestamp(value, path) {
    if (typeof value !== 'string' || !ISO_TIMESTAMP.test(value)) {
        fail('invalid_timestamp', path, 'expected canonical UTC ISO timestamp');
    }
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== value) {
        fail('invalid_timestamp', path, 'timestamp is not a real canonical UTC instant');
    }
    return value;
}

function optionalTimestamp(value, path) {
    return value == null ? undefined : normalizeTimestamp(value, path);
}

function normalizeStringArray(value, path, options) {
    if (!Array.isArray(value)) fail('invalid_type', path, 'expected an array');
    const allowedValues = options && options.allowedValues;
    const normalizeItem = options && options.normalizeItem;
    const items = value.map((entry, index) => {
        const itemPath = `${path}[${index}]`;
        if (normalizeItem) return normalizeItem(entry, itemPath);
        if (allowedValues) return normalizeEnum(entry, allowedValues, itemPath);
        return normalizeString(entry, itemPath);
    });
    const seen = new Set();
    for (let index = 0; index < items.length; index += 1) {
        if (seen.has(items[index])) {
            fail('duplicate_value', `${path}[${index}]`, 'duplicate values are forbidden');
        }
        seen.add(items[index]);
    }
    return items.slice().sort();
}

function parseIssueKey(value, path) {
    const issueKey = normalizeString(value, path);
    const parts = issueKey.split(':');
    if (parts.length !== 3 || parts.some((part) => !part || part.trim() !== part)) {
        fail(
            'invalid_issue_key',
            path,
            'expected sourceKind:scopeKey:sourceIssueId',
        );
    }
    const [sourceKind, scopeKey, sourceIssueId] = parts;
    if (!SOURCE_KINDS.includes(sourceKind)) {
        fail('invalid_issue_key', path, `unsupported source kind: ${sourceKind}`);
    }
    return { issueKey, sourceKind, scopeKey, sourceIssueId };
}

function assertIssueScope(issueKey, expected, path) {
    const parsed = parseIssueKey(issueKey, path);
    if (
        parsed.sourceKind !== expected.sourceKind ||
        parsed.scopeKey !== expected.scopeKey
    ) {
        fail(
            'mixed_issue_key',
            path,
            `expected ${expected.sourceKind}:${expected.scopeKey}:*`,
        );
    }
    return parsed.issueKey;
}

function normalizeEvidenceReference(value, path) {
    const input = expectObject(value, path);
    assertAllowedKeys(input, ['kind', 'ref', 'digest', 'observedAt'], path);
    const result = {
        kind: normalizeEnum(requireField(input, 'kind', path), EVIDENCE_KINDS, `${path}.kind`),
        ref: normalizeString(requireField(input, 'ref', path), `${path}.ref`),
    };
    if (input.digest != null) {
        const digest = normalizeString(input.digest, `${path}.digest`);
        if (!SHA256_DIGEST.test(digest)) {
            fail('invalid_value', `${path}.digest`, 'expected a lowercase SHA-256 digest');
        }
        result.digest = digest;
    }
    result.observedAt = normalizeTimestamp(
        requireField(input, 'observedAt', path),
        `${path}.observedAt`,
    );
    return result;
}

function normalizeEvidenceArray(value, path) {
    if (!Array.isArray(value)) fail('invalid_type', path, 'expected an array');
    if (value.length === 0) fail('invalid_value', path, 'at least one evidence reference is required');
    return value.map((entry, index) => normalizeEvidenceReference(entry, `${path}[${index}]`));
}

function normalizeSourceIssueSnapshot(value) {
    const path = 'sourceSnapshot';
    const input = expectObject(value, path);
    assertAllowedKeys(input, [
        'schemaVersion',
        'issueKey',
        'sourceKind',
        'scopeKey',
        'sourceIssueId',
        'identifier',
        'title',
        'operationalStatus',
        'createdAt',
        'updatedAt',
        'blockerIssueKeys',
    ], path);
    const schemaVersion = normalizeSchemaVersion(
        requireField(input, 'schemaVersion', path),
        `${path}.schemaVersion`,
    );
    const parsed = parseIssueKey(requireField(input, 'issueKey', path), `${path}.issueKey`);
    const sourceKind = normalizeEnum(
        requireField(input, 'sourceKind', path),
        SOURCE_KINDS,
        `${path}.sourceKind`,
    );
    const scopeKey = normalizeString(requireField(input, 'scopeKey', path), `${path}.scopeKey`);
    const sourceIssueId = normalizeString(
        requireField(input, 'sourceIssueId', path),
        `${path}.sourceIssueId`,
    );
    if (
        parsed.sourceKind !== sourceKind ||
        parsed.scopeKey !== scopeKey ||
        parsed.sourceIssueId !== sourceIssueId
    ) {
        fail('invalid_issue_key', `${path}.issueKey`, 'issue key does not match source fields');
    }
    const createdAt = normalizeTimestamp(
        requireField(input, 'createdAt', path),
        `${path}.createdAt`,
    );
    const updatedAt = normalizeTimestamp(
        requireField(input, 'updatedAt', path),
        `${path}.updatedAt`,
    );
    if (updatedAt < createdAt) {
        fail('invalid_value', `${path}.updatedAt`, 'must not precede createdAt');
    }
    return {
        schemaVersion,
        issueKey: parsed.issueKey,
        sourceKind,
        scopeKey,
        sourceIssueId,
        identifier: normalizeString(requireField(input, 'identifier', path), `${path}.identifier`),
        title: normalizeString(requireField(input, 'title', path), `${path}.title`),
        operationalStatus: normalizeEnum(
            requireField(input, 'operationalStatus', path),
            SOURCE_OPERATIONAL_STATUSES,
            `${path}.operationalStatus`,
        ),
        createdAt,
        updatedAt,
        blockerIssueKeys: normalizeStringArray(
            requireField(input, 'blockerIssueKeys', path),
            `${path}.blockerIssueKeys`,
            {
                normalizeItem: (entry, itemPath) => assertIssueScope(entry, parsed, itemPath),
            },
        ),
    };
}

function normalizeMeaningfulActivityEvent(value) {
    const path = 'meaningfulActivityEvent';
    const input = expectObject(value, path);
    assertAllowedKeys(input, [
        'schemaVersion',
        'issueKey',
        'eventId',
        'type',
        'occurredAt',
        'actorKind',
        'sourceRef',
    ], path);
    const result = {
        schemaVersion: normalizeSchemaVersion(
            requireField(input, 'schemaVersion', path),
            `${path}.schemaVersion`,
        ),
        issueKey: parseIssueKey(requireField(input, 'issueKey', path), `${path}.issueKey`).issueKey,
        eventId: normalizeString(requireField(input, 'eventId', path), `${path}.eventId`),
        type: normalizeEnum(
            requireField(input, 'type', path),
            MEANINGFUL_ACTIVITY_TYPES,
            `${path}.type`,
        ),
        occurredAt: normalizeTimestamp(
            requireField(input, 'occurredAt', path),
            `${path}.occurredAt`,
        ),
    };
    if (input.actorKind != null) {
        result.actorKind = normalizeEnum(
            input.actorKind,
            ['agent', 'source', 'system', 'user'],
            `${path}.actorKind`,
        );
    }
    if (input.sourceRef != null) {
        result.sourceRef = normalizeString(input.sourceRef, `${path}.sourceRef`);
    }
    return result;
}

function normalizeAttentionLease(value) {
    const path = 'attentionLease';
    const input = expectObject(value, path);
    assertAllowedKeys(input, [
        'schemaVersion',
        'issueKey',
        'leaseId',
        'blockerIssueKey',
        'kind',
        'startsAt',
        'expiresAt',
        'nextExpectedActivityAt',
        'ownerRef',
    ], path);
    const parsed = parseIssueKey(requireField(input, 'issueKey', path), `${path}.issueKey`);
    const startsAt = normalizeTimestamp(
        requireField(input, 'startsAt', path),
        `${path}.startsAt`,
    );
    const expiresAt = normalizeTimestamp(
        requireField(input, 'expiresAt', path),
        `${path}.expiresAt`,
    );
    if (expiresAt <= startsAt) {
        fail('invalid_value', `${path}.expiresAt`, 'must be later than startsAt');
    }
    const result = {
        schemaVersion: normalizeSchemaVersion(
            requireField(input, 'schemaVersion', path),
            `${path}.schemaVersion`,
        ),
        issueKey: parsed.issueKey,
        leaseId: normalizeString(requireField(input, 'leaseId', path), `${path}.leaseId`),
        blockerIssueKey: assertIssueScope(
            requireField(input, 'blockerIssueKey', path),
            parsed,
            `${path}.blockerIssueKey`,
        ),
        kind: normalizeEnum(
            requireField(input, 'kind', path),
            ['dependency_wait', 'external_input', 'verification_window'],
            `${path}.kind`,
        ),
        startsAt,
        expiresAt,
    };
    if (input.nextExpectedActivityAt != null) {
        const nextExpectedActivityAt = normalizeTimestamp(
            input.nextExpectedActivityAt,
            `${path}.nextExpectedActivityAt`,
        );
        if (nextExpectedActivityAt < startsAt || nextExpectedActivityAt > expiresAt) {
            fail(
                'invalid_value',
                `${path}.nextExpectedActivityAt`,
                'must fall within the lease interval',
            );
        }
        result.nextExpectedActivityAt = nextExpectedActivityAt;
    }
    if (input.ownerRef != null) {
        result.ownerRef = normalizeString(input.ownerRef, `${path}.ownerRef`);
    }
    return result;
}

function normalizeRootCause(value, path) {
    const input = expectObject(value, path);
    assertAllowedKeys(
        input,
        ['statement', 'invariant', 'component', 'confidence', 'evidence'],
        path,
    );
    return {
        statement: normalizeString(requireField(input, 'statement', path), `${path}.statement`),
        invariant: normalizeString(requireField(input, 'invariant', path), `${path}.invariant`),
        component: normalizeString(requireField(input, 'component', path), `${path}.component`),
        confidence: normalizeEnum(
            requireField(input, 'confidence', path),
            ['low', 'medium', 'high'],
            `${path}.confidence`,
        ),
        evidence: normalizeEvidenceArray(requireField(input, 'evidence', path), `${path}.evidence`),
    };
}

function normalizeFixIdentity(value, path) {
    const input = expectObject(value, path);
    assertAllowedKeys(input, ['kind', 'ref', 'rollbackRef', 'appliedAt'], path);
    const result = {
        kind: normalizeEnum(
            requireField(input, 'kind', path),
            ['commit', 'config', 'data', 'workflow'],
            `${path}.kind`,
        ),
        ref: normalizeString(requireField(input, 'ref', path), `${path}.ref`),
    };
    if (input.rollbackRef != null) {
        result.rollbackRef = normalizeString(input.rollbackRef, `${path}.rollbackRef`);
    }
    result.appliedAt = normalizeTimestamp(
        requireField(input, 'appliedAt', path),
        `${path}.appliedAt`,
    );
    return result;
}

function normalizeVerificationEvidence(value, path) {
    const input = expectObject(value, path);
    assertAllowedKeys(input, ['result', 'policyVersion', 'evidence'], path);
    return {
        result: normalizeEnum(
            requireField(input, 'result', path),
            ['failed', 'passed', 'pending'],
            `${path}.result`,
        ),
        policyVersion: normalizeString(
            requireField(input, 'policyVersion', path),
            `${path}.policyVersion`,
        ),
        evidence: normalizeEvidenceArray(requireField(input, 'evidence', path), `${path}.evidence`),
    };
}

function normalizeRecurrenceReview(value, path) {
    const input = expectObject(value, path);
    assertAllowedKeys(input, ['state', 'reviewedAt', 'familyId'], path);
    const result = {
        state: normalizeEnum(
            requireField(input, 'state', path),
            ['clear', 'required', 'resolved'],
            `${path}.state`,
        ),
    };
    const reviewedAt = optionalTimestamp(input.reviewedAt, `${path}.reviewedAt`);
    const familyId = optionalString(input.familyId, `${path}.familyId`);
    if (reviewedAt !== undefined) result.reviewedAt = reviewedAt;
    if (familyId !== undefined) result.familyId = familyId;
    return result;
}

function normalizeIntegrityRecord(value) {
    const path = 'integrityRecord';
    const input = expectObject(value, path);
    assertAllowedKeys(input, [
        'schemaVersion',
        'issueKey',
        'policyVersion',
        'rootCause',
        'fixIdentity',
        'verificationEvidence',
        'recurrenceReview',
        'meaningfulActivityAt',
        'nextExpectedActivityAt',
        'createdAt',
        'updatedAt',
    ], path);
    const createdAt = normalizeTimestamp(
        requireField(input, 'createdAt', path),
        `${path}.createdAt`,
    );
    const updatedAt = normalizeTimestamp(
        requireField(input, 'updatedAt', path),
        `${path}.updatedAt`,
    );
    if (updatedAt < createdAt) {
        fail('invalid_value', `${path}.updatedAt`, 'must not precede createdAt');
    }
    const result = {
        schemaVersion: normalizeSchemaVersion(
            requireField(input, 'schemaVersion', path),
            `${path}.schemaVersion`,
        ),
        issueKey: parseIssueKey(requireField(input, 'issueKey', path), `${path}.issueKey`).issueKey,
        policyVersion: normalizeString(
            requireField(input, 'policyVersion', path),
            `${path}.policyVersion`,
        ),
    };
    if (input.rootCause != null) {
        result.rootCause = normalizeRootCause(input.rootCause, `${path}.rootCause`);
    }
    if (input.fixIdentity != null) {
        result.fixIdentity = normalizeFixIdentity(input.fixIdentity, `${path}.fixIdentity`);
    }
    if (input.verificationEvidence != null) {
        result.verificationEvidence = normalizeVerificationEvidence(
            input.verificationEvidence,
            `${path}.verificationEvidence`,
        );
    }
    if (input.recurrenceReview != null) {
        result.recurrenceReview = normalizeRecurrenceReview(
            input.recurrenceReview,
            `${path}.recurrenceReview`,
        );
    }
    const meaningfulActivityAt = optionalTimestamp(
        input.meaningfulActivityAt,
        `${path}.meaningfulActivityAt`,
    );
    const nextExpectedActivityAt = optionalTimestamp(
        input.nextExpectedActivityAt,
        `${path}.nextExpectedActivityAt`,
    );
    if (meaningfulActivityAt !== undefined) result.meaningfulActivityAt = meaningfulActivityAt;
    if (nextExpectedActivityAt !== undefined) result.nextExpectedActivityAt = nextExpectedActivityAt;
    result.createdAt = createdAt;
    result.updatedAt = updatedAt;
    return result;
}

function normalizeIncidentFamily(value) {
    const path = 'incidentFamily';
    const input = expectObject(value, path);
    assertAllowedKeys(input, [
        'schemaVersion',
        'familyId',
        'canonicalIssueKey',
        'issueKeys',
        'component',
        'contract',
        'invariant',
        'causalFamily',
        'algorithmVersion',
        'createdAt',
        'updatedAt',
    ], path);
    const canonical = parseIssueKey(
        requireField(input, 'canonicalIssueKey', path),
        `${path}.canonicalIssueKey`,
    );
    const issueKeys = normalizeStringArray(
        requireField(input, 'issueKeys', path),
        `${path}.issueKeys`,
        {
            normalizeItem: (entry, itemPath) => assertIssueScope(entry, canonical, itemPath),
        },
    );
    if (!issueKeys.includes(canonical.issueKey)) {
        fail(
            'invalid_value',
            `${path}.issueKeys`,
            'must include canonicalIssueKey',
        );
    }
    const createdAt = normalizeTimestamp(
        requireField(input, 'createdAt', path),
        `${path}.createdAt`,
    );
    const updatedAt = normalizeTimestamp(
        requireField(input, 'updatedAt', path),
        `${path}.updatedAt`,
    );
    if (updatedAt < createdAt) {
        fail('invalid_value', `${path}.updatedAt`, 'must not precede createdAt');
    }
    return {
        schemaVersion: normalizeSchemaVersion(
            requireField(input, 'schemaVersion', path),
            `${path}.schemaVersion`,
        ),
        familyId: normalizeString(requireField(input, 'familyId', path), `${path}.familyId`),
        canonicalIssueKey: canonical.issueKey,
        issueKeys,
        component: normalizeString(requireField(input, 'component', path), `${path}.component`),
        contract: normalizeString(requireField(input, 'contract', path), `${path}.contract`),
        invariant: normalizeString(requireField(input, 'invariant', path), `${path}.invariant`),
        causalFamily: normalizeString(
            requireField(input, 'causalFamily', path),
            `${path}.causalFamily`,
        ),
        algorithmVersion: normalizeEnum(
            requireField(input, 'algorithmVersion', path),
            [FINGERPRINT_ALGORITHM_VERSION],
            `${path}.algorithmVersion`,
        ),
        createdAt,
        updatedAt,
    };
}

function normalizeFailure(value, path) {
    const input = expectObject(value, path);
    assertAllowedKeys(input, [
        'operation',
        'actor',
        'resource',
        'direction',
        'invariant',
        'component',
        'contract',
        'errorCode',
    ], path);
    const result = {
        operation: normalizeString(requireField(input, 'operation', path), `${path}.operation`),
        actor: normalizeString(requireField(input, 'actor', path), `${path}.actor`),
        resource: normalizeString(requireField(input, 'resource', path), `${path}.resource`),
        direction: normalizeString(requireField(input, 'direction', path), `${path}.direction`),
        invariant: normalizeString(requireField(input, 'invariant', path), `${path}.invariant`),
        component: normalizeString(requireField(input, 'component', path), `${path}.component`),
        contract: normalizeString(requireField(input, 'contract', path), `${path}.contract`),
    };
    if (input.errorCode != null) {
        result.errorCode = normalizeString(input.errorCode, `${path}.errorCode`);
    }
    return result;
}

function normalizeOccurrence(value) {
    const path = 'occurrence';
    const input = expectObject(value, path);
    assertAllowedKeys(input, [
        'schemaVersion',
        'occurrenceId',
        'familyId',
        'issueKey',
        'observedAt',
        'failure',
        'evidence',
        'disposition',
    ], path);
    const result = {
        schemaVersion: normalizeSchemaVersion(
            requireField(input, 'schemaVersion', path),
            `${path}.schemaVersion`,
        ),
        occurrenceId: normalizeString(
            requireField(input, 'occurrenceId', path),
            `${path}.occurrenceId`,
        ),
    };
    if (input.familyId != null) {
        result.familyId = normalizeString(input.familyId, `${path}.familyId`);
    }
    result.issueKey = parseIssueKey(
        requireField(input, 'issueKey', path),
        `${path}.issueKey`,
    ).issueKey;
    result.observedAt = normalizeTimestamp(
        requireField(input, 'observedAt', path),
        `${path}.observedAt`,
    );
    result.failure = normalizeFailure(requireField(input, 'failure', path), `${path}.failure`);
    result.evidence = normalizeEvidenceArray(
        requireField(input, 'evidence', path),
        `${path}.evidence`,
    );
    result.disposition = normalizeEnum(
        requireField(input, 'disposition', path),
        ['attached', 'dismissed', 'linked', 'unreviewed'],
        `${path}.disposition`,
    );
    return result;
}

function normalizePolicy(value) {
    const path = 'policy';
    const input = expectObject(value, path);
    assertAllowedKeys(input, [
        'schemaVersion',
        'policyVersion',
        'staleAfterMs',
        'hardBlockerKinds',
        'meaningfulActivityTypes',
        'fingerprintAlgorithmVersion',
    ], path);
    const staleAfterMs = requireField(input, 'staleAfterMs', path);
    if (!Number.isSafeInteger(staleAfterMs) || staleAfterMs <= 0) {
        fail('invalid_value', `${path}.staleAfterMs`, 'must be a positive safe integer');
    }
    return {
        schemaVersion: normalizeSchemaVersion(
            requireField(input, 'schemaVersion', path),
            `${path}.schemaVersion`,
        ),
        policyVersion: normalizeEnum(
            requireField(input, 'policyVersion', path),
            [POLICY_VERSION],
            `${path}.policyVersion`,
        ),
        staleAfterMs,
        hardBlockerKinds: normalizeStringArray(
            requireField(input, 'hardBlockerKinds', path),
            `${path}.hardBlockerKinds`,
            { allowedValues: HARD_BLOCKER_KINDS },
        ),
        meaningfulActivityTypes: normalizeStringArray(
            requireField(input, 'meaningfulActivityTypes', path),
            `${path}.meaningfulActivityTypes`,
            { allowedValues: MEANINGFUL_ACTIVITY_TYPES },
        ),
        fingerprintAlgorithmVersion: normalizeEnum(
            requireField(input, 'fingerprintAlgorithmVersion', path),
            [FINGERPRINT_ALGORITHM_VERSION],
            `${path}.fingerprintAlgorithmVersion`,
        ),
    };
}

module.exports = {
    STORE_SCHEMA_VERSION,
    PROJECTION_SCHEMA_VERSION,
    POLICY_VERSION,
    FINGERPRINT_ALGORITHM_VERSION,
    SOURCE_KINDS,
    SOURCE_OPERATIONAL_STATUSES,
    ATTENTION_STATES,
    LIFECYCLE_STATES,
    MEANINGFUL_ACTIVITY_TYPES,
    HARD_BLOCKER_KINDS,
    EVIDENCE_KINDS,
    VALIDATION_REASON_CODES,
    ContractValidationError,
    normalizeSourceIssueSnapshot,
    normalizeMeaningfulActivityEvent,
    normalizeAttentionLease,
    normalizeIntegrityRecord,
    normalizeIncidentFamily,
    normalizeOccurrence,
    normalizePolicy,
};
