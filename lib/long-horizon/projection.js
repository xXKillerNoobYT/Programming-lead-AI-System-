'use strict';

const {
    PROJECTION_SCHEMA_VERSION,
    normalizeAttentionLease,
    normalizeIncidentFamily,
    normalizeIntegrityRecord,
    normalizeMeaningfulActivityEvent,
    normalizePolicy,
    normalizeSourceIssueSnapshot,
} = require('./contracts.js');
const { evaluateAttention } = require('./attention.js');
const { deriveLifecycleState, evaluateCloseGate } = require('./lifecycle.js');

const PROJECTION_KEYS = Object.freeze([
    'schemaVersion',
    'policyVersion',
    'issue',
    'lifecycle',
    'attention',
    'recurrence',
    'evaluatedAt',
    'sourceWatermark',
]);

function requireArray(value, name) {
    if (!Array.isArray(value)) {
        throw new TypeError(`${name} is required and must be an array`);
    }
    return value;
}

function requireObject(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${name} is required and must be an object`);
    }
    return value;
}

function assertProjectionShape(value) {
    const projection = requireObject(value, 'projection');
    for (const key of PROJECTION_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(projection, key)) {
            throw new TypeError(`projection.${key} is required`);
        }
    }
    for (const key of Object.keys(projection)) {
        if (!PROJECTION_KEYS.includes(key)) {
            throw new TypeError(`projection.${key} is not allowed`);
        }
    }
    if (projection.schemaVersion !== PROJECTION_SCHEMA_VERSION) {
        throw new TypeError(`projection.schemaVersion must be ${PROJECTION_SCHEMA_VERSION}`);
    }
    requireObject(projection.issue, 'projection.issue');
    requireObject(projection.lifecycle, 'projection.lifecycle');
    requireObject(projection.attention, 'projection.attention');
    requireObject(projection.recurrence, 'projection.recurrence');
    requireObject(projection.sourceWatermark, 'projection.sourceWatermark');
    if (
        projection.issue.sourceKind !== projection.sourceWatermark.sourceKind ||
        projection.issue.scopeKey !== projection.sourceWatermark.scopeKey ||
        !projection.issue.issueKey.startsWith(
            `${projection.issue.sourceKind}:${projection.issue.scopeKey}:`,
        )
    ) {
        throw new TypeError('projection source identity must match its watermark');
    }
    if (
        projection.attention.sourceWatermark !== projection.sourceWatermark &&
        JSON.stringify(projection.attention.sourceWatermark) !== JSON.stringify(
            projection.sourceWatermark,
        )
    ) {
        throw new TypeError('projection attention watermark must match its canonical watermark');
    }
    if (
        projection.policyVersion !== projection.attention.policyVersion ||
        projection.evaluatedAt !== projection.attention.evaluatedAt
    ) {
        throw new TypeError('projection attention metadata must match its canonical envelope');
    }
    return projection;
}

function assertIssueScope(issueKey, issue, name) {
    if (!issueKey.startsWith(`${issue.sourceKind}:${issue.scopeKey}:`)) {
        throw new TypeError(`${name} source kind and scope must match sourceSnapshot`);
    }
}

function recurrenceProjection(issue, localRecord, families) {
    const normalizedFamilies = requireArray(families, 'families')
        .map((family) => normalizeIncidentFamily(family));
    for (const family of normalizedFamilies) {
        const prefix = `${issue.sourceKind}:${issue.scopeKey}:`;
        if (
            !family.canonicalIssueKey.startsWith(prefix) ||
            family.issueKeys.some((issueKey) => !issueKey.startsWith(prefix))
        ) {
            throw new TypeError('family source kind and scope must match sourceSnapshot');
        }
    }

    const familyId = localRecord.recurrenceReview && localRecord.recurrenceReview.familyId
        ? localRecord.recurrenceReview.familyId
        : null;
    if (familyId && !normalizedFamilies.some((family) => family.familyId === familyId)) {
        throw new TypeError('localRecord recurrence familyId must reference a supplied family');
    }

    const candidates = normalizedFamilies
        .filter((family) => family.issueKeys.includes(issue.issueKey))
        .map((family) => ({
            familyId: family.familyId,
            canonicalIssueKey: family.canonicalIssueKey,
            component: family.component,
            contract: family.contract,
            invariant: family.invariant,
            causalFamily: family.causalFamily,
            algorithmVersion: family.algorithmVersion,
        }))
        .sort((left, right) => left.familyId.localeCompare(right.familyId));

    return { familyId, candidates };
}

function evaluateIssueIntegrity({
    sourceSnapshot,
    localRecord,
    dependencies,
    events,
    leases,
    families,
    policy,
    now,
    sourceWatermark,
} = {}) {
    const issue = normalizeSourceIssueSnapshot(requireObject(sourceSnapshot, 'sourceSnapshot'));
    const record = normalizeIntegrityRecord(requireObject(localRecord, 'localRecord'));
    const normalizedPolicy = normalizePolicy(requireObject(policy, 'policy'));

    if (record.issueKey !== issue.issueKey) {
        throw new TypeError('localRecord issueKey must match sourceSnapshot issueKey');
    }
    if (record.policyVersion !== normalizedPolicy.policyVersion) {
        throw new TypeError('localRecord policyVersion must match policy.policyVersion');
    }

    const normalizedDependencies = requireArray(dependencies, 'dependencies')
        .map((dependency, index) => {
            const normalized = normalizeSourceIssueSnapshot(dependency);
            assertIssueScope(normalized.issueKey, issue, `dependencies[${index}]`);
            return normalized;
        });
    const normalizedEvents = requireArray(events, 'events')
        .map((event, index) => {
            const normalized = normalizeMeaningfulActivityEvent(event);
            assertIssueScope(normalized.issueKey, issue, `events[${index}]`);
            return normalized;
        });
    const normalizedLeases = requireArray(leases, 'leases')
        .map((lease, index) => {
            const normalized = normalizeAttentionLease(lease);
            assertIssueScope(normalized.issueKey, issue, `leases[${index}]`);
            return normalized;
        });

    const attention = evaluateAttention({
        issue,
        dependencies: normalizedDependencies,
        events: normalizedEvents,
        leases: normalizedLeases,
        policy: normalizedPolicy,
        now,
        sourceWatermark,
    });
    const recurrence = recurrenceProjection(issue, record, families);
    const closeGate = evaluateCloseGate({
        requestedStatus: 'done',
        integrityRecord: record,
        recurrenceState: record.recurrenceReview && record.recurrenceReview.state,
    });

    return {
        schemaVersion: PROJECTION_SCHEMA_VERSION,
        policyVersion: normalizedPolicy.policyVersion,
        issue: {
            issueKey: issue.issueKey,
            sourceKind: issue.sourceKind,
            scopeKey: issue.scopeKey,
            sourceIssueId: issue.sourceIssueId,
            identifier: issue.identifier,
            title: issue.title,
            operationalStatus: issue.operationalStatus,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
        },
        lifecycle: {
            state: deriveLifecycleState(record),
            closeAllowed: closeGate.allowed,
            reasons: closeGate.reasons,
        },
        attention,
        recurrence,
        evaluatedAt: attention.evaluatedAt,
        sourceWatermark: attention.sourceWatermark,
    };
}

function serializeProjection(projection) {
    return JSON.stringify(assertProjectionShape(projection));
}

function canonicalProjectionList(projections) {
    const items = requireArray(projections, 'projections')
        .map((projection) => assertProjectionShape(projection))
        .slice()
        .sort((left, right) => left.issue.issueKey.localeCompare(right.issue.issueKey));
    if (items.length === 0) {
        throw new TypeError('projections must contain at least one canonical item');
    }

    const first = items[0];
    const envelope = JSON.stringify({
        schemaVersion: first.schemaVersion,
        policyVersion: first.policyVersion,
        evaluatedAt: first.evaluatedAt,
        sourceWatermark: first.sourceWatermark,
    });
    for (const item of items.slice(1)) {
        const candidate = JSON.stringify({
            schemaVersion: item.schemaVersion,
            policyVersion: item.policyVersion,
            evaluatedAt: item.evaluatedAt,
            sourceWatermark: item.sourceWatermark,
        });
        if (candidate !== envelope) {
            throw new TypeError('all projections in a list must share one canonical envelope');
        }
    }
    return {
        schemaVersion: first.schemaVersion,
        policyVersion: first.policyVersion,
        evaluatedAt: first.evaluatedAt,
        sourceWatermark: first.sourceWatermark,
        items,
    };
}

function serializeProjectionList(projections) {
    return JSON.stringify(canonicalProjectionList(projections));
}

function serializeProjectionNdjson(projections) {
    return `${canonicalProjectionList(projections).items.map((item) => JSON.stringify(item)).join('\n')}\n`;
}

module.exports = {
    evaluateIssueIntegrity,
    serializeProjection,
    serializeProjectionList,
    serializeProjectionNdjson,
};
