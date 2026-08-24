'use strict';

const { createHash } = require('node:crypto');

const EXCLUDED_PROJECT_STATUSES = new Set([
    'Backlog',
    'Ready',
    'In progress',
    'Review',
    'Needs user',
    'Blocked',
    'Long-term watch',
]);
const EXCLUDED_ARCHIVE_RECORD_KINDS = new Set([
    'audit',
    'history',
    'security',
    'privacy',
    'incident',
]);

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
}

function parseRfc3339(value) {
    if (typeof value !== 'string') return Number.NaN;
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) return Number.NaN;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);
    const offset = match[8];
    if (month < 1 || month > 12
        || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()
        || hour > 23 || minute > 59 || second > 59) {
        return Number.NaN;
    }
    if (offset !== 'Z') {
        const offsetHour = Number(offset.slice(1, 3));
        const offsetMinute = Number(offset.slice(4, 6));
        if (offsetHour > 23 || offsetMinute > 59) return Number.NaN;
    }
    return Date.parse(value);
}

function blockedPlan(error) {
    return {
        blocked: true,
        actions: [],
        errors: [error],
    };
}

function validateSnapshot(snapshot, nowMs) {
    if (!snapshot?.identity?.repositoryNodeId) {
        return 'missing-repository-node-id';
    }
    if (!snapshot.identity.projectNodeId) {
        return 'missing-project-node-id';
    }

    for (const permission of ['readIssues', 'readProject', 'writeIssues', 'writeProject']) {
        if (typeof snapshot.permissions?.[permission] !== 'boolean') {
            return `ambiguous-permission:${permission}`;
        }
    }
    for (const permission of ['readIssues', 'readProject']) {
        if (snapshot.permissions[permission] !== true) {
            return `denied-permission:${permission}`;
        }
    }

    if (typeof snapshot.capabilities?.restoreProjectItem !== 'boolean') {
        return 'ambiguous-capability:restoreProjectItem';
    }
    if (!Array.isArray(snapshot.items)) {
        return 'invalid-items';
    }
    for (const [field, error] of [
        ['evidenceKeys', 'invalid-evidence-keys'],
        ['archiveAuditKeys', 'invalid-archive-audit-keys'],
        ['restorationAuditKeys', 'invalid-restoration-audit-keys'],
    ]) {
        if (!Array.isArray(snapshot[field])
            || snapshot[field].some((key) => typeof key !== 'string' || key.length === 0)) {
            return error;
        }
    }

    const capturedAtMs = parseRfc3339(snapshot.capturedAt);
    const freshUntilMs = parseRfc3339(snapshot.freshUntil);
    if (!Number.isFinite(capturedAtMs) || !Number.isFinite(freshUntilMs)) {
        return 'invalid-snapshot-timestamp';
    }
    if (capturedAtMs > nowMs) {
        return 'future-snapshot';
    }
    if (freshUntilMs < nowMs) {
        return 'stale-snapshot';
    }

    return null;
}

function normalizeItems(snapshot) {
    const issueToProjectItem = new Map();
    const projectItemToIssue = new Map();
    const uniqueItems = new Map();
    let duplicatesSuppressed = 0;

    for (const item of snapshot.items) {
        const issueNumber = item?.issue?.number ?? 'unknown';
        if (!item?.projectItemId) {
            return { error: `missing-project-item-id:${issueNumber}` };
        }
        if (!item?.issue?.nodeId) {
            return { error: `missing-issue-node-id:${issueNumber}` };
        }
        if (!Number.isInteger(item.issue.number) || item.issue.number <= 0) {
            return { error: `invalid-issue-number:${item.issue.nodeId}` };
        }
        if (typeof item.archived !== 'boolean') {
            return { error: `ambiguous-archive-state:${item.issue.nodeId}` };
        }
        if (item.repositoryNodeId !== snapshot.identity.repositoryNodeId) {
            return { error: `repository-identity-mismatch:${item.issue.nodeId}` };
        }
        if (item.projectNodeId !== snapshot.identity.projectNodeId) {
            return { error: `project-identity-mismatch:${item.issue.nodeId}` };
        }

        const mappedProjectItem = issueToProjectItem.get(item.issue.nodeId);
        if (mappedProjectItem && mappedProjectItem !== item.projectItemId) {
            return { error: `duplicate-issue-identity:${item.issue.nodeId}` };
        }
        const mappedIssue = projectItemToIssue.get(item.projectItemId);
        if (mappedIssue && mappedIssue !== item.issue.nodeId) {
            return { error: `duplicate-project-item-identity:${item.projectItemId}` };
        }

        issueToProjectItem.set(item.issue.nodeId, item.projectItemId);
        projectItemToIssue.set(item.projectItemId, item.issue.nodeId);
        const pairKey = `${item.issue.nodeId}\u0000${item.projectItemId}`;
        if (uniqueItems.has(pairKey)) {
            if (stableStringify(uniqueItems.get(pairKey)) !== stableStringify(item)) {
                return { error: `duplicate-item-content-conflict:${item.issue.nodeId}` };
            }
            duplicatesSuppressed += 1;
        } else {
            uniqueItems.set(pairKey, item);
        }
    }

    return {
        items: [...uniqueItems.values()].sort((left, right) => (
            left.issue.number - right.issue.number
            || left.issue.nodeId.localeCompare(right.issue.nodeId)
        )),
        duplicatesSuppressed,
    };
}

function evidenceReasons(kind, records, expectedSubject, nowMs) {
    const reasons = [];
    const seenIds = new Set();

    for (const record of records) {
        const id = record?.id;
        if (typeof id !== 'string' || id.length === 0) {
            reasons.push(`invalid-${kind}-id:unknown`);
            continue;
        }
        if (seenIds.has(id)) {
            reasons.push(`duplicate-${kind}-id:${id}`);
            continue;
        }
        seenIds.add(id);
        const label = `${kind}:${id}`;
        if (record?.status !== 'passed') {
            reasons.push(`${kind}-not-passed:${id}`);
            continue;
        }

        const evidence = record.evidence;
        if (!evidence || typeof evidence.subject !== 'string') {
            reasons.push(`missing-evidence:${label}`);
            continue;
        }
        if (evidence.subject !== expectedSubject) {
            reasons.push(`evidence-subject-mismatch:${label}`);
            continue;
        }

        const recordedAtMs = parseRfc3339(evidence.recordedAt);
        const validUntilMs = parseRfc3339(evidence.validUntil);
        if (!Number.isFinite(recordedAtMs) || !Number.isFinite(validUntilMs)) {
            reasons.push(`invalid-evidence-time:${label}`);
        } else if (recordedAtMs > nowMs) {
            reasons.push(`future-evidence:${label}`);
        } else if (validUntilMs < nowMs) {
            reasons.push(`stale-evidence:${label}`);
        }
    }

    return reasons;
}

function unresolvedRelationReasons(prefix, relations) {
    if (!Array.isArray(relations)) return [`ambiguous-${prefix}-relations`];
    return relations
        .filter((relation) => relation?.state !== 'CLOSED')
        .map((relation) => `open-${prefix}:${relation?.nodeId || 'unknown'}`);
}

function closureReasons(item, snapshot, nowMs) {
    const issue = item.issue || {};
    const reasons = [];

    if (issue.lifecycle !== 'Verified Complete') {
        reasons.push('canonical-lifecycle-not-verified-complete');
    }
    if (EXCLUDED_PROJECT_STATUSES.has(item.projectStatus)) {
        reasons.push(`project-status-excluded:${item.projectStatus}`);
    } else if (item.projectStatus !== 'Done') {
        reasons.push(`project-status-ambiguous:${item.projectStatus || 'missing'}`);
    }
    if (snapshot.permissions.writeIssues !== true) {
        reasons.push('denied-permission:writeIssues');
    }

    if (!issue.expectedEvidenceSubject) {
        reasons.push('missing-expected-evidence-subject');
    }
    if (!Array.isArray(issue.acceptanceCriteria) || issue.acceptanceCriteria.length === 0) {
        reasons.push('missing-acceptance-criteria');
    } else {
        reasons.push(...evidenceReasons(
            'acceptance-criterion',
            issue.acceptanceCriteria,
            issue.expectedEvidenceSubject,
            nowMs,
        ));
    }
    if (!Array.isArray(issue.requiredGates) || issue.requiredGates.length === 0) {
        reasons.push('missing-required-gates');
    } else {
        reasons.push(...evidenceReasons(
            'required-gate',
            issue.requiredGates,
            issue.expectedEvidenceSubject,
            nowMs,
        ));
    }

    if (issue.codeRequired === true) {
        if (issue.implementationPr?.state !== 'MERGED') {
            reasons.push('implementation-pr-not-merged');
        } else if (!Number.isInteger(issue.implementationPr.number)
            || issue.implementationPr.number <= 0) {
            reasons.push('implementation-pr-identity-ambiguous');
        } else if (!issue.implementationPr.mergeCommitOid) {
            reasons.push('implementation-pr-missing-merge-commit');
        } else if (issue.expectedEvidenceSubject !== `commit:${issue.implementationPr.mergeCommitOid}`) {
            reasons.push('implementation-subject-mismatch');
        }
    } else if (issue.codeRequired !== false) {
        reasons.push('ambiguous-code-requirement');
    }

    if (!Array.isArray(issue.unresolvedFindings)) {
        reasons.push('ambiguous-review-findings');
    } else if (issue.unresolvedFindings.length > 0) {
        reasons.push('unresolved-findings');
    }

    if (!Array.isArray(issue.children)) {
        reasons.push('ambiguous-child-relations');
    } else {
        reasons.push(...issue.children
            .filter((child) => child?.state !== 'CLOSED')
            .map((child) => `open-child:${child?.nodeId || 'unknown'}`));
    }
    reasons.push(...unresolvedRelationReasons('blocker', issue.blockers));
    reasons.push(...unresolvedRelationReasons('dependency', issue.dependencies));

    if (!Array.isArray(issue.followUps)) {
        reasons.push('ambiguous-follow-up-relations');
    } else {
        reasons.push(...issue.followUps
            .filter((followUp) => followUp?.resolved !== true)
            .map((followUp) => `unresolved-follow-up:${followUp?.nodeId || 'unknown'}`));
    }

    if (!Array.isArray(issue.holds)) {
        reasons.push('ambiguous-holds');
    } else {
        reasons.push(...issue.holds
            .filter((hold) => !['resolved', 'released'].includes(hold?.status))
            .map((hold) => `active-hold:${hold?.id || 'unknown'}`));
    }

    if (!Array.isArray(issue.incidents)) {
        reasons.push('ambiguous-incidents');
    } else {
        reasons.push(...issue.incidents
            .filter((incident) => !['Sev1', 'Sev2', 'Sev3', 'Sev4'].includes(incident?.severity))
            .map((incident) => `ambiguous-incident:${incident?.id || 'unknown'}`));
        reasons.push(...issue.incidents
            .filter((incident) => ['Sev1', 'Sev2'].includes(incident?.severity)
                && !['resolved', 'closed'].includes(incident?.status))
            .map((incident) => `active-severity:${incident.severity}`));
    }

    if (issue.question) {
        if (issue.question.answered !== true) {
            reasons.push('unanswered-question');
        } else if (issue.question.incorporated !== true) {
            reasons.push('question-not-incorporated');
        } else if (issue.question.dependentsReconciled !== true) {
            reasons.push('question-dependents-not-reconciled');
        }
    }

    return reasons;
}

function closeAction(item, snapshot) {
    const issue = item.issue;
    const acceptanceCriteria = [...issue.acceptanceCriteria]
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const requiredGates = [...issue.requiredGates]
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const digest = sha256(stableStringify({
        action: 'close-issue',
        repositoryNodeId: snapshot.identity.repositoryNodeId,
        projectNodeId: snapshot.identity.projectNodeId,
        issueNodeId: issue.nodeId,
        expectedEvidenceSubject: issue.expectedEvidenceSubject,
        acceptanceCriteria,
        requiredGates,
        implementationPr: issue.implementationPr,
    }));
    const idempotencyKey = `close:${issue.nodeId}:${digest}`;

    return {
        type: 'close-issue',
        issueNodeId: issue.nodeId,
        issueNumber: issue.number,
        projectItemId: item.projectItemId,
        evidenceHash: digest,
        idempotencyKey,
        evidencePresent: (snapshot.evidenceKeys || []).includes(idempotencyKey),
        completionEvidence: {
            idempotencyKey,
            evidenceHash: digest,
            subject: issue.expectedEvidenceSubject,
            acceptanceCriterionIds: acceptanceCriteria.map((criterion) => criterion.id),
            requiredGateIds: requiredGates.map((gate) => gate.id),
        },
    };
}

function archiveEligibilityReasons(item, snapshot, nowMs, retentionMs) {
    const reasons = closureReasons(item, snapshot, nowMs)
        .filter((reason) => !reason.startsWith('denied-permission:'));
    const recordKind = item.issue?.recordKind;
    if (EXCLUDED_ARCHIVE_RECORD_KINDS.has(recordKind)) {
        reasons.push(`archive-record-excluded:${recordKind}`);
    } else if (recordKind !== 'work') {
        reasons.push(`archive-record-kind-ambiguous:${recordKind || 'missing'}`);
    }

    const eligibleSinceMs = parseRfc3339(item.archiveEligibleSince);
    const closedAtMs = parseRfc3339(item.issue?.closedAt);
    if (!Number.isFinite(eligibleSinceMs) || eligibleSinceMs > nowMs) {
        reasons.push('invalid-archive-eligibility-time');
    }
    if (!Number.isFinite(closedAtMs) || closedAtMs > nowMs) {
        reasons.push('invalid-issue-closed-time');
    }
    if (Number.isFinite(eligibleSinceMs)
        && eligibleSinceMs <= nowMs
        && Number.isFinite(closedAtMs)
        && closedAtMs <= nowMs
        && (nowMs - Math.max(eligibleSinceMs, closedAtMs)) < retentionMs) {
        reasons.push('archive-cooling-period');
    }

    return reasons;
}

function archiveReasons(item, snapshot, nowMs, retentionMs) {
    const reasons = archiveEligibilityReasons(item, snapshot, nowMs, retentionMs);
    if (snapshot.permissions.writeIssues !== true) {
        reasons.push('denied-permission:writeIssues');
    }
    if (snapshot.permissions.writeProject !== true) {
        reasons.push('denied-permission:writeProject');
    }
    return reasons;
}

function archiveAction(item, snapshot) {
    const issue = item.issue;
    const acceptanceCriteria = [...issue.acceptanceCriteria]
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const requiredGates = [...issue.requiredGates]
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const coolingStartedAt = new Date(Math.max(
        parseRfc3339(item.archiveEligibleSince),
        parseRfc3339(issue.closedAt),
    )).toISOString();
    const evidenceHash = sha256(stableStringify({
        action: 'archive-project-item',
        repositoryNodeId: snapshot.identity.repositoryNodeId,
        projectNodeId: snapshot.identity.projectNodeId,
        projectItemId: item.projectItemId,
        issueNodeId: issue.nodeId,
        expectedEvidenceSubject: issue.expectedEvidenceSubject,
        acceptanceCriteria,
        requiredGates,
        implementationPr: issue.implementationPr,
        archiveEligibleSince: item.archiveEligibleSince,
        issueClosedAt: issue.closedAt,
        coolingStartedAt,
    }));
    const idempotencyKey = `archive:${item.projectItemId}:${evidenceHash}`;

    return {
        type: 'archive-project-item',
        issueNodeId: issue.nodeId,
        issueNumber: issue.number,
        projectItemId: item.projectItemId,
        archiveEligibleSince: item.archiveEligibleSince,
        issueClosedAt: issue.closedAt,
        coolingStartedAt,
        archiveReason: 'closed-verified-complete-after-cooling-period',
        evidenceHash,
        idempotencyKey,
        auditPresent: (snapshot.archiveAuditKeys || []).includes(idempotencyKey),
    };
}

function conservativeRestorationStatus(issue) {
    if (issue.executionState === 'Blocked') return 'Blocked';
    if (issue.executionState === 'Needs user') return 'Needs user';
    return 'Backlog';
}

function restorationAction(item, snapshot, triggerReasons) {
    const targetStatus = conservativeRestorationStatus(item.issue);
    const evidenceHash = sha256(stableStringify({
        action: 'restore-project-item',
        repositoryNodeId: snapshot.identity.repositoryNodeId,
        projectNodeId: snapshot.identity.projectNodeId,
        projectItemId: item.projectItemId,
        issueNodeId: item.issue.nodeId,
        targetStatus,
        triggerReasons: [...triggerReasons].sort(),
    }));
    const idempotencyKey = `restore:${item.projectItemId}:${evidenceHash}`;
    const common = {
        issueNodeId: item.issue.nodeId,
        issueNumber: item.issue.number,
        projectItemId: item.projectItemId,
        targetStatus,
        triggerReasons,
        evidenceHash,
        idempotencyKey,
        auditPresent: (snapshot.restorationAuditKeys || []).includes(idempotencyKey),
    };

    if (snapshot.capabilities.restoreProjectItem === true) {
        return {
            type: 'restore-project-item',
            ...common,
        };
    }

    return {
        type: 'manual-project-restoration',
        ...common,
        requiredAction: `Unarchive Project item ${item.projectItemId} and set Status to ${targetStatus}; do not claim execution.`,
    };
}

function computePlanHash(plan) {
    return sha256(stableStringify({
        identity: plan.identity,
        actions: plan.actions,
        blockedItems: plan.blockedItems,
        duplicatesSuppressed: plan.duplicatesSuppressed,
        maxActions: plan.maxActions,
        retentionDays: plan.retentionDays,
        totalActions: plan.totalActions,
    }));
}

function planReconciliationBatch(snapshot, options = {}) {
    const nowValue = options.now || new Date().toISOString();
    const nowMs = parseRfc3339(nowValue);
    if (!Number.isFinite(nowMs)) {
        return blockedPlan('invalid-now');
    }
    const maxActions = options.maxActions === undefined ? 25 : options.maxActions;
    if (!Number.isInteger(maxActions) || maxActions < 1 || maxActions > 100) {
        return blockedPlan('invalid-max-actions');
    }
    const retentionDays = options.retentionDays === undefined ? 14 : options.retentionDays;
    if (retentionDays !== 14) return blockedPlan('fixed-retention-policy:14');
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

    const snapshotError = validateSnapshot(snapshot, nowMs);
    if (snapshotError) return blockedPlan(snapshotError);

    const normalized = normalizeItems(snapshot);
    if (normalized.error) return blockedPlan(normalized.error);

    const candidateActions = [];
    const blockedItems = [];

    for (const item of normalized.items) {
        if (item.archived === true) {
            let triggerReasons;
            if (item.issue.state === 'OPEN') {
                triggerReasons = ['canonical-issue-reopened'];
            } else if (item.issue.state === 'CLOSED') {
                triggerReasons = archiveEligibilityReasons(item, snapshot, nowMs, retentionMs);
            } else {
                blockedItems.push({
                    issueNodeId: item.issue.nodeId,
                    projectItemId: item.projectItemId,
                    reasons: [`ambiguous-issue-state:${item.issue.state || 'missing'}`],
                });
                continue;
            }

            if (triggerReasons.length === 0) continue;
            if (snapshot.permissions.writeIssues !== true) {
                blockedItems.push({
                    issueNodeId: item.issue.nodeId,
                    projectItemId: item.projectItemId,
                    reasons: ['denied-permission:writeIssues'],
                });
            } else if (snapshot.capabilities.restoreProjectItem === true
                && snapshot.permissions.writeProject !== true) {
                blockedItems.push({
                    issueNodeId: item.issue.nodeId,
                    projectItemId: item.projectItemId,
                    reasons: ['denied-permission:writeProject'],
                });
            } else if (snapshot.capabilities.restoreProjectItem === false
                && snapshot.permissions.writeIssues !== true) {
                blockedItems.push({
                    issueNodeId: item.issue.nodeId,
                    projectItemId: item.projectItemId,
                    reasons: ['denied-permission:writeIssues'],
                });
            } else {
                candidateActions.push(restorationAction(item, snapshot, triggerReasons));
            }
        } else if (item.issue.state === 'OPEN') {
            const reasons = closureReasons(item, snapshot, nowMs);
            if (reasons.length > 0) {
                blockedItems.push({
                    issueNodeId: item.issue.nodeId,
                    projectItemId: item.projectItemId,
                    reasons,
                });
            } else {
                candidateActions.push(closeAction(item, snapshot));
            }
        } else if (item.issue.state === 'CLOSED' && item.archived !== true) {
            const reasons = archiveReasons(item, snapshot, nowMs, retentionMs);
            if (reasons.length > 0) {
                blockedItems.push({
                    issueNodeId: item.issue.nodeId,
                    projectItemId: item.projectItemId,
                    reasons,
                });
            } else {
                candidateActions.push(archiveAction(item, snapshot));
            }
        } else if (item.issue.state !== 'CLOSED') {
            blockedItems.push({
                issueNodeId: item.issue.nodeId,
                projectItemId: item.projectItemId,
                reasons: [`ambiguous-issue-state:${item.issue.state || 'missing'}`],
            });
        }
    }

    const totalActions = candidateActions.length;
    const actions = candidateActions.slice(0, maxActions);
    const remainingActions = totalActions - actions.length;
    const planHash = computePlanHash({
        identity: snapshot.identity,
        actions,
        blockedItems,
        duplicatesSuppressed: normalized.duplicatesSuppressed,
        maxActions,
        retentionDays,
        totalActions,
    });

    return {
        blocked: false,
        identity: { ...snapshot.identity },
        permissions: { ...snapshot.permissions },
        capabilities: { ...snapshot.capabilities },
        generatedAt: new Date(nowMs).toISOString(),
        retentionDays,
        maxActions,
        actions,
        blockedItems,
        duplicatesSuppressed: normalized.duplicatesSuppressed,
        totalActions,
        truncated: remainingActions > 0,
        remainingActions,
        planHash,
    };
}

function sameIdentity(left, right) {
    return left?.repositoryNodeId === right?.repositoryNodeId
        && left?.projectNodeId === right?.projectNodeId;
}

function actionIdentity(plan, action) {
    return {
        repositoryNodeId: plan.identity.repositoryNodeId,
        projectNodeId: plan.identity.projectNodeId,
        issueNodeId: action.issueNodeId,
        projectItemId: action.projectItemId,
    };
}

function stableRefetchItem(snapshot, plan, action) {
    if (!sameIdentity(snapshot?.identity, plan.identity)) {
        return { error: 'stable-refetch-identity-mismatch' };
    }
    if (!Array.isArray(snapshot.items) || snapshot.items.length !== 1) {
        return { error: 'stable-refetch-cardinality' };
    }
    const [item] = snapshot.items;
    if (item?.issue?.nodeId !== action.issueNodeId
        || item?.projectItemId !== action.projectItemId
        || item?.repositoryNodeId !== plan.identity.repositoryNodeId
        || item?.projectNodeId !== plan.identity.projectNodeId) {
        return { error: 'stable-refetch-identity-mismatch' };
    }
    return { item };
}

function findLiveAction(snapshot, plan, action, now) {
    const refetch = stableRefetchItem(snapshot, plan, action);
    if (refetch.error) return refetch;
    const livePlan = planReconciliationBatch(snapshot, {
        now,
        retentionDays: plan.retentionDays,
        maxActions: 100,
    });
    if (livePlan.blocked) {
        return { error: `live-plan-blocked:${livePlan.errors.join(',')}` };
    }
    const matchingAction = livePlan.actions.find((candidate) => (
        candidate.type === action.type
        && candidate.issueNodeId === action.issueNodeId
        && candidate.projectItemId === action.projectItemId
        && candidate.idempotencyKey === action.idempotencyKey
    ));
    if (!matchingAction) return { error: 'precondition-drift' };
    return { action: matchingAction };
}

function appliedResult(action, status = 'applied') {
    return {
        type: action.type,
        issueNodeId: action.issueNodeId,
        projectItemId: action.projectItemId,
        idempotencyKey: action.idempotencyKey,
        status,
    };
}

function requiredPermissions(actionType) {
    if (actionType === 'close-issue') return ['writeIssues'];
    if (actionType === 'archive-project-item') return ['writeIssues', 'writeProject'];
    if (actionType === 'restore-project-item') return ['writeIssues', 'writeProject'];
    if (actionType === 'manual-project-restoration') return ['writeIssues'];
    return null;
}

function adapterMethodsForPlan(plan) {
    const methods = new Set(['probeIdentity', 'refetchByStableIds']);
    for (const action of plan.actions) {
        if (action.type === 'close-issue') {
            methods.add('ensureCompletionEvidence');
            methods.add('closeIssue');
        } else if (action.type === 'archive-project-item') {
            methods.add('ensureArchiveAudit');
            methods.add('archiveProjectItem');
        } else if (action.type === 'restore-project-item') {
            methods.add('ensureRestorationAudit');
            methods.add('restoreProjectItem');
        } else if (action.type === 'manual-project-restoration') {
            methods.add('ensureRestorationAudit');
            methods.add('emitManualRemediation');
        } else {
            return { error: `unsupported-action:${action.type}` };
        }
    }
    return { methods: [...methods] };
}

async function applyReconciliationPlan(plan, adapter, options = {}) {
    if (options.enabled !== true) {
        return {
            ok: true,
            applied: false,
            dryRun: true,
            planHash: plan?.planHash || null,
            actions: plan?.actions || [],
            results: [],
        };
    }
    if (!plan || plan.blocked === true || (plan.blockedItems?.length || 0) > 0) {
        return {
            ok: false,
            applied: false,
            error: 'plan-blocked-or-missing',
            results: [],
        };
    }

    const now = options.now || new Date().toISOString();
    if (!Number.isFinite(parseRfc3339(now))) {
        return { ok: false, applied: false, error: 'invalid-now', results: [] };
    }
    if (!Array.isArray(plan.actions)
        || typeof plan.planHash !== 'string'
        || computePlanHash(plan) !== plan.planHash) {
        return { ok: false, applied: false, error: 'plan-integrity-mismatch', results: [] };
    }
    const adapterContract = adapterMethodsForPlan(plan);
    if (adapterContract.error) {
        return { ok: false, applied: false, error: adapterContract.error, results: [] };
    }
    for (const method of adapterContract.methods) {
        if (typeof adapter?.[method] !== 'function') {
            return {
                ok: false,
                applied: false,
                error: `missing-adapter-method:${method}`,
                results: [],
            };
        }
    }
    const results = [];
    let writeAttempts = 0;
    let uncertainAction = null;
    try {
        const probe = await adapter.probeIdentity();
        if (!sameIdentity(probe?.identity, plan.identity)) {
            return {
                ok: false,
                applied: false,
                error: 'identity-drift',
                results,
            };
        }

        for (const action of plan.actions) {
            uncertainAction = null;
            const permissions = requiredPermissions(action.type);
            if (!permissions) {
                throw new Error(`unsupported-action:${action.type}`);
            }
            for (const permission of permissions) {
                if (probe.permissions?.[permission] !== true) {
                    throw new Error(`permission-drift:${permission}`);
                }
            }
            if (['restore-project-item', 'manual-project-restoration'].includes(action.type)
                && probe.capabilities?.restoreProjectItem !== plan.capabilities.restoreProjectItem) {
                throw new Error('capability-drift:restoreProjectItem');
            }

            const identity = actionIdentity(plan, action);
            const firstSnapshot = await adapter.refetchByStableIds(identity);
            const firstCheck = findLiveAction(firstSnapshot, plan, action, now);
            if (firstCheck.error) throw new Error(firstCheck.error);

            if (action.type === 'close-issue') {
                writeAttempts += 1;
                await adapter.ensureCompletionEvidence(action);
                const finalSnapshot = await adapter.refetchByStableIds(identity);
                const finalCheck = findLiveAction(finalSnapshot, plan, action, now);
                if (finalCheck.error) throw new Error(finalCheck.error);
                if (finalCheck.action.evidencePresent !== true) {
                    throw new Error('completion-evidence-readback-mismatch');
                }

                writeAttempts += 1;
                uncertainAction = appliedResult(action, 'write-outcome-unconfirmed');
                await adapter.closeIssue(action);
                const readBack = await adapter.refetchByStableIds(identity);
                const stableReadBack = stableRefetchItem(readBack, plan, action);
                if (stableReadBack.error) throw new Error(stableReadBack.error);
                const closedItem = stableReadBack.item;
                if (closedItem?.issue?.state !== 'CLOSED') {
                    throw new Error('close-readback-mismatch');
                }
                if (!Number.isFinite(parseRfc3339(closedItem.issue.closedAt))) {
                    throw new Error('close-time-readback-mismatch');
                }
                results.push(appliedResult(action));
                uncertainAction = null;
            } else if (action.type === 'archive-project-item') {
                writeAttempts += 1;
                await adapter.ensureArchiveAudit(action);
                const finalSnapshot = await adapter.refetchByStableIds(identity);
                const finalCheck = findLiveAction(finalSnapshot, plan, action, now);
                if (finalCheck.error) throw new Error(finalCheck.error);
                if (finalCheck.action.auditPresent !== true) {
                    throw new Error('archive-audit-readback-mismatch');
                }

                writeAttempts += 1;
                uncertainAction = appliedResult(action, 'write-outcome-unconfirmed');
                await adapter.archiveProjectItem(action);
                const readBack = await adapter.refetchByStableIds(identity);
                const stableReadBack = stableRefetchItem(readBack, plan, action);
                if (stableReadBack.error) throw new Error(stableReadBack.error);
                const archivedItem = stableReadBack.item;
                if (archivedItem?.archived !== true) {
                    throw new Error('archive-readback-mismatch');
                }
                results.push(appliedResult(action));
                uncertainAction = null;
            } else if (action.type === 'restore-project-item') {
                writeAttempts += 1;
                await adapter.ensureRestorationAudit(action);
                const finalSnapshot = await adapter.refetchByStableIds(identity);
                const finalCheck = findLiveAction(finalSnapshot, plan, action, now);
                if (finalCheck.error) throw new Error(finalCheck.error);
                if (finalCheck.action.auditPresent !== true) {
                    throw new Error('restoration-audit-readback-mismatch');
                }

                writeAttempts += 1;
                uncertainAction = appliedResult(action, 'write-outcome-unconfirmed');
                await adapter.restoreProjectItem(action);
                const readBack = await adapter.refetchByStableIds(identity);
                const stableReadBack = stableRefetchItem(readBack, plan, action);
                if (stableReadBack.error) throw new Error(stableReadBack.error);
                const restoredItem = stableReadBack.item;
                if (restoredItem?.archived !== false
                    || restoredItem?.projectStatus !== action.targetStatus) {
                    throw new Error('restoration-readback-mismatch');
                }
                results.push(appliedResult(action));
                uncertainAction = null;
            } else {
                writeAttempts += 1;
                await adapter.ensureRestorationAudit(action);
                const finalSnapshot = await adapter.refetchByStableIds(identity);
                const finalCheck = findLiveAction(finalSnapshot, plan, action, now);
                if (finalCheck.error) throw new Error(finalCheck.error);
                if (finalCheck.action.auditPresent !== true) {
                    throw new Error('restoration-audit-readback-mismatch');
                }

                writeAttempts += 1;
                uncertainAction = appliedResult(action, 'write-outcome-unconfirmed');
                const emitted = await adapter.emitManualRemediation(action);
                if (emitted?.recorded !== true
                    || emitted.idempotencyKey !== action.idempotencyKey) {
                    throw new Error('manual-remediation-readback-mismatch');
                }
                results.push(appliedResult(action, 'manual-remediation-emitted'));
                uncertainAction = null;
            }
        }
    } catch (error) {
        return {
            ok: false,
            applied: results.length > 0 || uncertainAction !== null,
            partial: results.length > 0 || writeAttempts > 0,
            writeAttempts,
            error: error instanceof Error ? error.message : String(error),
            results,
            ...(uncertainAction ? {
                uncertainAction: {
                    type: uncertainAction.type,
                    issueNodeId: uncertainAction.issueNodeId,
                    projectItemId: uncertainAction.projectItemId,
                    idempotencyKey: uncertainAction.idempotencyKey,
                },
            } : {}),
        };
    }

    return {
        ok: true,
        applied: results.length > 0,
        partial: false,
        writeAttempts,
        results,
    };
}

module.exports = {
    planReconciliationBatch,
    applyReconciliationPlan,
};
