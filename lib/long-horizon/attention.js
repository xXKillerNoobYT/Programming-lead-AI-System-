'use strict';

const {
    normalizeSourceIssueSnapshot,
    normalizeMeaningfulActivityEvent,
    normalizeAttentionLease,
    normalizePolicy,
} = require('./contracts.js');

const RESOLVED_OPERATIONAL_STATUSES = new Set(['cancelled', 'closed', 'done']);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;
const SOURCE_WATERMARK_KEYS = new Set([
    'sourceKind',
    'scopeKey',
    'cursor',
    'observedAt',
    'snapshotDigest',
]);

function requireObject(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${name} is required and must be an object`);
    }
    return value;
}

function requireArray(value, name) {
    if (!Array.isArray(value)) {
        throw new TypeError(`${name} is required and must be an array`);
    }
    return value;
}

function requireTimestamp(value, name) {
    if (typeof value !== 'string' || !ISO_TIMESTAMP.test(value)) {
        throw new TypeError(`${name} is required and must be a canonical UTC ISO timestamp`);
    }
    const instant = new Date(value);
    if (Number.isNaN(instant.getTime()) || instant.toISOString() !== value) {
        throw new TypeError(`${name} is required and must be a canonical UTC ISO timestamp`);
    }
    return { value, milliseconds: instant.getTime() };
}

function requireNonEmptyString(value, name) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new TypeError(`${name} is required and must be a non-empty string`);
    }
    return value;
}

function validateSourceWatermark(value, issue) {
    const watermark = requireObject(value, 'sourceWatermark');
    for (const key of Object.keys(watermark)) {
        if (!SOURCE_WATERMARK_KEYS.has(key)) {
            throw new TypeError(`sourceWatermark.${key} is not allowed`);
        }
    }
    const sourceKind = requireNonEmptyString(
        watermark.sourceKind,
        'sourceWatermark.sourceKind',
    );
    const scopeKey = requireNonEmptyString(
        watermark.scopeKey,
        'sourceWatermark.scopeKey',
    );
    requireNonEmptyString(watermark.cursor, 'sourceWatermark.cursor');
    requireTimestamp(watermark.observedAt, 'sourceWatermark.observedAt');
    if (
        typeof watermark.snapshotDigest !== 'string' ||
        !SHA256_DIGEST.test(watermark.snapshotDigest)
    ) {
        throw new TypeError(
            'sourceWatermark.snapshotDigest is required and must be a lowercase SHA-256 digest',
        );
    }
    if (sourceKind !== issue.sourceKind || scopeKey !== issue.scopeKey) {
        throw new TypeError('sourceWatermark sourceKind and scopeKey must match issue');
    }
    return watermark;
}

function latestQualifyingActivity(events, blockerIssueKey, policy, nowMs) {
    let latest = null;
    for (const event of events) {
        if (!event || !policy.meaningfulActivityTypes.includes(event.type)) continue;
        const normalized = normalizeMeaningfulActivityEvent(event);
        const occurredAtMs = new Date(normalized.occurredAt).getTime();
        if (normalized.issueKey !== blockerIssueKey || occurredAtMs > nowMs) continue;
        if (!latest || normalized.occurredAt > latest) latest = normalized.occurredAt;
    }
    return latest;
}

function activeLeases(leases, issueKey, blockerIssueKey, nowMs) {
    return leases
        .map((lease) => normalizeAttentionLease(lease))
        .filter((lease) => (
            lease.issueKey === issueKey &&
            lease.blockerIssueKey === blockerIssueKey &&
            new Date(lease.startsAt).getTime() <= nowMs &&
            nowMs < new Date(lease.expiresAt).getTime()
        ));
}

function evaluateAttention({
    issue,
    dependencies,
    events,
    leases,
    policy,
    now,
    sourceWatermark,
} = {}) {
    const evaluatedAt = requireTimestamp(now, 'now');
    const normalizedPolicy = normalizePolicy(requireObject(policy, 'policy'));
    const normalizedIssue = normalizeSourceIssueSnapshot(requireObject(issue, 'issue'));
    const watermark = validateSourceWatermark(sourceWatermark, normalizedIssue);
    const normalizedDependencies = requireArray(dependencies, 'dependencies')
        .map((dependency) => normalizeSourceIssueSnapshot(dependency));
    const inputEvents = requireArray(events, 'events');
    const inputLeases = requireArray(leases, 'leases');
    const dependenciesByKey = new Map(
        normalizedDependencies.map((dependency) => [dependency.issueKey, dependency]),
    );

    const blockers = [];
    for (const blockerIssueKey of normalizedIssue.blockerIssueKeys) {
        const dependency = dependenciesByKey.get(blockerIssueKey);
        if (dependency && RESOLVED_OPERATIONAL_STATUSES.has(dependency.operationalStatus)) {
            continue;
        }

        if (!dependency) {
            blockers.push({
                kind: 'needs_attention',
                identifier: blockerIssueKey,
                staleSinceAt: null,
            });
            continue;
        }

        const coveringLeases = activeLeases(
            inputLeases,
            normalizedIssue.issueKey,
            blockerIssueKey,
            evaluatedAt.milliseconds,
        );
        const unnamedExternalWait = coveringLeases.some(
            (lease) => lease.kind === 'external_input' && !lease.ownerRef,
        );
        if (unnamedExternalWait) {
            blockers.push({
                kind: 'needs_attention',
                identifier: dependency.identifier,
                staleSinceAt: null,
            });
            continue;
        }
        if (coveringLeases.length > 0) {
            blockers.push({
                kind: 'covered',
                identifier: dependency.identifier,
                staleSinceAt: null,
            });
            continue;
        }

        const activityAt = latestQualifyingActivity(
            inputEvents,
            blockerIssueKey,
            normalizedPolicy,
            evaluatedAt.milliseconds,
        ) || dependency.createdAt;
        const staleAtMs = new Date(activityAt).getTime() + normalizedPolicy.staleAfterMs;
        const staleSinceAt = new Date(staleAtMs).toISOString();
        blockers.push({
            kind: evaluatedAt.milliseconds < staleAtMs ? 'covered' : 'stalled',
            identifier: dependency.identifier,
            staleSinceAt,
        });
    }

    const stalled = blockers.filter((blocker) => blocker.kind === 'stalled');
    const attention = blockers.filter((blocker) => blocker.kind === 'needs_attention');
    const covered = blockers.filter((blocker) => blocker.kind === 'covered');
    let state = 'none';
    let reason = 'no_unresolved_blockers';
    if (attention.length > 0) {
        state = 'needs_attention';
        reason = 'hard_blocker';
    } else if (stalled.length > 0) {
        state = 'stalled';
        reason = 'stale_dependency';
    } else if (covered.length > 0) {
        state = 'covered';
        reason = 'covered_dependency';
    }

    return {
        state,
        reason,
        unresolvedBlockerCount: blockers.length,
        coveredBlockerCount: covered.length,
        stalledBlockerCount: stalled.length,
        attentionBlockerCount: attention.length,
        sampleBlockerIdentifier: blockers.length > 0 ? blockers[0].identifier : null,
        sampleStalledBlockerIdentifier: stalled.length > 0 ? stalled[0].identifier : null,
        evaluatedAt: evaluatedAt.value,
        staleSinceAt: stalled.length > 0
            ? stalled.map((blocker) => blocker.staleSinceAt).sort()[0]
            : null,
        policyVersion: normalizedPolicy.policyVersion,
        sourceWatermark: watermark,
    };
}

module.exports = {
    evaluateAttention,
};
