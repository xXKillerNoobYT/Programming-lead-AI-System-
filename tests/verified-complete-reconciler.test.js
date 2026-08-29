'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function eligibleItem(overrides = {}) {
    const item = {
        projectItemId: 'PVTI_item_249',
        repositoryNodeId: 'R_repo',
        projectNodeId: 'P_project_6',
        projectStatus: 'Done',
        archived: false,
        archiveEligibleSince: '2026-08-01T00:00:00.000Z',
        issue: {
            nodeId: 'I_issue_249',
            number: 249,
            state: 'OPEN',
            closedAt: null,
            updatedAt: '2026-08-23T23:00:00.000Z',
            lifecycle: 'Verified Complete',
            recordKind: 'work',
            expectedEvidenceSubject: 'commit:abc123',
            acceptanceCriteria: [{
                id: 'ac-1',
                status: 'passed',
                evidence: {
                    subject: 'commit:abc123',
                    recordedAt: '2026-08-23T22:00:00.000Z',
                    validUntil: '2026-08-25T22:00:00.000Z',
                },
            }],
            requiredGates: [{
                id: 'qa',
                status: 'passed',
                evidence: {
                    subject: 'commit:abc123',
                    recordedAt: '2026-08-23T22:30:00.000Z',
                    validUntil: '2026-08-25T22:30:00.000Z',
                },
            }],
            codeRequired: true,
            implementationPr: {
                number: 300,
                state: 'MERGED',
                mergeCommitOid: 'abc123',
            },
            unresolvedFindings: [],
            children: [],
            blockers: [],
            dependencies: [],
            followUps: [],
            holds: [],
            incidents: [],
            question: null,
        },
    };

    const merged = {
        ...item,
        ...overrides,
        issue: {
            ...item.issue,
            ...(overrides.issue || {}),
        },
    };
    if (merged.issue.state === 'CLOSED'
        && !Object.prototype.hasOwnProperty.call(overrides.issue || {}, 'closedAt')) {
        merged.issue.closedAt = '2026-08-01T00:00:00.000Z';
    }
    return merged;
}

function snapshotFor(items, overrides = {}) {
    return {
        identity: {
            repositoryNodeId: 'R_repo',
            projectNodeId: 'P_project_6',
            ...(overrides.identity || {}),
        },
        permissions: {
            readIssues: true,
            readProject: true,
            writeIssues: true,
            writeProject: true,
            ...(overrides.permissions || {}),
        },
        capabilities: {
            restoreProjectItem: true,
            ...(overrides.capabilities || {}),
        },
        capturedAt: '2026-08-23T23:59:00.000Z',
        freshUntil: '2026-08-24T00:05:00.000Z',
        evidenceKeys: [],
        archiveAuditKeys: [],
        restorationAuditKeys: [],
        items,
        ...overrides,
        identity: {
            repositoryNodeId: 'R_repo',
            projectNodeId: 'P_project_6',
            ...(overrides.identity || {}),
        },
        permissions: {
            readIssues: true,
            readProject: true,
            writeIssues: true,
            writeProject: true,
            ...(overrides.permissions || {}),
        },
        capabilities: {
            restoreProjectItem: true,
            ...(overrides.capabilities || {}),
        },
    };
}

test('plans one canonical close action for a fully eligible open Issue', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const result = planReconciliationBatch(snapshotFor([eligibleItem()]), {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.blocked, false);
    assert.equal(result.actions.length, 1);
    assert.equal(result.actions[0].type, 'close-issue');
    assert.equal(result.actions[0].issueNodeId, 'I_issue_249');
    assert.match(result.actions[0].idempotencyKey, /^close:I_issue_249:[a-f0-9]{64}$/);
});

test('fails the whole plan closed when stable snapshot identity is missing', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const snapshot = snapshotFor([eligibleItem()]);
    delete snapshot.identity.repositoryNodeId;

    const result = planReconciliationBatch(snapshot, {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.blocked, true);
    assert.deepEqual(result.actions, []);
    assert.deepEqual(result.errors, ['missing-repository-node-id']);
});

test('fails the whole plan closed on ambiguous global identity, permission, capability, or freshness', async (t) => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const cases = [
        {
            name: 'missing Project node ID',
            prepare(snapshot) { delete snapshot.identity.projectNodeId; },
            error: 'missing-project-node-id',
        },
        {
            name: 'unknown Issue-read permission',
            prepare(snapshot) { delete snapshot.permissions.readIssues; },
            error: 'ambiguous-permission:readIssues',
        },
        {
            name: 'denied Project-read permission',
            prepare(snapshot) { snapshot.permissions.readProject = false; },
            error: 'denied-permission:readProject',
        },
        {
            name: 'unknown restore capability',
            prepare(snapshot) { delete snapshot.capabilities.restoreProjectItem; },
            error: 'ambiguous-capability:restoreProjectItem',
        },
        {
            name: 'expired snapshot',
            prepare(snapshot) { snapshot.freshUntil = '2026-08-23T23:59:59.999Z'; },
            error: 'stale-snapshot',
        },
        {
            name: 'snapshot from the future',
            prepare(snapshot) { snapshot.capturedAt = '2026-08-24T00:00:00.001Z'; },
            error: 'future-snapshot',
        },
        {
            name: 'missing item collection',
            prepare(snapshot) { snapshot.items = null; },
            error: 'invalid-items',
        },
        {
            name: 'completion evidence registry is ambiguous',
            prepare(snapshot) { snapshot.evidenceKeys = 'close:key'; },
            error: 'invalid-evidence-keys',
        },
        {
            name: 'archive audit registry is ambiguous',
            prepare(snapshot) { snapshot.archiveAuditKeys = [null]; },
            error: 'invalid-archive-audit-keys',
        },
        {
            name: 'restoration audit registry is ambiguous',
            prepare(snapshot) { delete snapshot.restorationAuditKeys; },
            error: 'invalid-restoration-audit-keys',
        },
    ];

    for (const entry of cases) {
        await t.test(entry.name, () => {
            const snapshot = snapshotFor([eligibleItem()]);
            entry.prepare(snapshot);
            const result = planReconciliationBatch(snapshot, {
                now: '2026-08-24T00:00:00.000Z',
            });

            assert.equal(result.blocked, true);
            assert.deepEqual(result.actions, []);
            assert.deepEqual(result.errors, [entry.error]);
        });
    }
});

test('blocks closure for every canonical exclusion instead of inferring from Project Done', async (t) => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const cases = [
        {
            name: 'canonical lifecycle is not Verified Complete',
            mutate(item) { item.issue.lifecycle = 'Done'; },
            reason: 'canonical-lifecycle-not-verified-complete',
        },
        {
            name: 'Project projection is still active',
            mutate(item) { item.projectStatus = 'In progress'; },
            reason: 'project-status-excluded:In progress',
        },
        {
            name: 'acceptance criteria are missing',
            mutate(item) { item.issue.acceptanceCriteria = []; },
            reason: 'missing-acceptance-criteria',
        },
        {
            name: 'an acceptance criterion has not passed',
            mutate(item) { item.issue.acceptanceCriteria[0].status = 'pending'; },
            reason: 'acceptance-criterion-not-passed:ac-1',
        },
        {
            name: 'acceptance evidence is stale',
            mutate(item) { item.issue.acceptanceCriteria[0].evidence.validUntil = '2026-08-23T23:59:59.999Z'; },
            reason: 'stale-evidence:acceptance-criterion:ac-1',
        },
        {
            name: 'acceptance evidence is bound to the wrong subject',
            mutate(item) { item.issue.acceptanceCriteria[0].evidence.subject = 'commit:old'; },
            reason: 'evidence-subject-mismatch:acceptance-criterion:ac-1',
        },
        {
            name: 'a required gate has not passed',
            mutate(item) { item.issue.requiredGates[0].status = 'pending'; },
            reason: 'required-gate-not-passed:qa',
        },
        {
            name: 'code-required implementation PR is not merged',
            mutate(item) { item.issue.implementationPr.state = 'OPEN'; },
            reason: 'implementation-pr-not-merged',
        },
        {
            name: 'merged implementation PR identity is missing',
            mutate(item) { delete item.issue.implementationPr.number; },
            reason: 'implementation-pr-identity-ambiguous',
        },
        {
            name: 'required gate identity is duplicated',
            mutate(item) {
                item.issue.requiredGates.push(JSON.parse(JSON.stringify(item.issue.requiredGates[0])));
            },
            reason: 'duplicate-required-gate-id:qa',
        },
        {
            name: 'review findings remain unresolved',
            mutate(item) { item.issue.unresolvedFindings = [{ id: 'F-1', severity: 'high' }]; },
            reason: 'unresolved-findings',
        },
        {
            name: 'required child remains open',
            mutate(item) { item.issue.children = [{ nodeId: 'I_child', state: 'OPEN', required: true }]; },
            reason: 'open-child:I_child',
        },
        {
            name: 'an open child cannot be waived by optional metadata',
            mutate(item) { item.issue.children = [{ nodeId: 'I_child', state: 'OPEN', required: false }]; },
            reason: 'open-child:I_child',
        },
        {
            name: 'native blocker remains open',
            mutate(item) { item.issue.blockers = [{ nodeId: 'I_blocker', state: 'OPEN' }]; },
            reason: 'open-blocker:I_blocker',
        },
        {
            name: 'dependency remains open',
            mutate(item) { item.issue.dependencies = [{ nodeId: 'I_dependency', state: 'OPEN' }]; },
            reason: 'open-dependency:I_dependency',
        },
        {
            name: 'follow-up remains unresolved',
            mutate(item) { item.issue.followUps = [{ nodeId: 'I_followup', resolved: false }]; },
            reason: 'unresolved-follow-up:I_followup',
        },
        {
            name: 'release or rollback hold remains active',
            mutate(item) { item.issue.holds = [{ id: 'release', status: 'active' }]; },
            reason: 'active-hold:release',
        },
        {
            name: 'Sev1 or Sev2 condition remains active',
            mutate(item) { item.issue.incidents = [{ id: 'INC-1', severity: 'Sev1', status: 'open' }]; },
            reason: 'active-severity:Sev1',
        },
        {
            name: 'incident severity is ambiguous',
            mutate(item) { item.issue.incidents = [{ id: 'INC-1', severity: 'unknown', status: 'open' }]; },
            reason: 'ambiguous-incident:INC-1',
        },
        {
            name: 'answered question was not durably incorporated',
            mutate(item) {
                item.issue.question = {
                    answered: true,
                    incorporated: false,
                    dependentsReconciled: true,
                };
            },
            reason: 'question-not-incorporated',
        },
        {
            name: 'dependent state was not reconciled after an answer',
            mutate(item) {
                item.issue.question = {
                    answered: true,
                    incorporated: true,
                    dependentsReconciled: false,
                };
            },
            reason: 'question-dependents-not-reconciled',
        },
        {
            name: 'Issue write permission is denied',
            mutate() {},
            snapshotOverrides: { permissions: { writeIssues: false } },
            reason: 'denied-permission:writeIssues',
        },
    ];

    for (const entry of cases) {
        await t.test(entry.name, () => {
            const item = eligibleItem();
            entry.mutate(item);
            const result = planReconciliationBatch(
                snapshotFor([item], entry.snapshotOverrides || {}),
                { now: '2026-08-24T00:00:00.000Z' },
            );

            assert.equal(result.blocked, false);
            assert.deepEqual(result.actions, []);
            assert.deepEqual(result.blockedItems, [{
                issueNodeId: 'I_issue_249',
                projectItemId: 'PVTI_item_249',
                reasons: [entry.reason],
            }]);
        });
    }
});

test('fails the whole plan closed on missing, mismatched, or conflicting stable item identities', async (t) => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const cases = [
        {
            name: 'missing Project item ID',
            items() {
                const item = eligibleItem();
                delete item.projectItemId;
                return [item];
            },
            error: 'missing-project-item-id:249',
        },
        {
            name: 'missing Issue node ID',
            items() {
                const item = eligibleItem();
                delete item.issue.nodeId;
                return [item];
            },
            error: 'missing-issue-node-id:249',
        },
        {
            name: 'repository identity mismatch',
            items: () => [eligibleItem({ repositoryNodeId: 'R_other' })],
            error: 'repository-identity-mismatch:I_issue_249',
        },
        {
            name: 'Project identity mismatch',
            items: () => [eligibleItem({ projectNodeId: 'P_other' })],
            error: 'project-identity-mismatch:I_issue_249',
        },
        {
            name: 'archive state is ambiguous',
            items() {
                const item = eligibleItem();
                delete item.archived;
                return [item];
            },
            error: 'ambiguous-archive-state:I_issue_249',
        },
        {
            name: 'one Issue appears under conflicting Project item IDs',
            items: () => [
                eligibleItem(),
                eligibleItem({ projectItemId: 'PVTI_conflict' }),
            ],
            error: 'duplicate-issue-identity:I_issue_249',
        },
        {
            name: 'one Project item points at conflicting Issue node IDs',
            items: () => [
                eligibleItem(),
                eligibleItem({
                    issue: {
                        nodeId: 'I_issue_250',
                        number: 250,
                    },
                }),
            ],
            error: 'duplicate-project-item-identity:PVTI_item_249',
        },
    ];

    for (const entry of cases) {
        await t.test(entry.name, () => {
            const result = planReconciliationBatch(snapshotFor(entry.items()), {
                now: '2026-08-24T00:00:00.000Z',
            });

            assert.equal(result.blocked, true);
            assert.deepEqual(result.actions, []);
            assert.deepEqual(result.errors, [entry.error]);
        });
    }
});

test('suppresses exact duplicate discoveries by stable IDs', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const result = planReconciliationBatch(snapshotFor([
        eligibleItem(),
        eligibleItem(),
    ]), {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.blocked, false);
    assert.equal(result.actions.length, 1);
    assert.equal(result.duplicatesSuppressed, 1);
});

test('sorts actions and hashes them canonically across discovery and gate ordering', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const extraCriterion = {
        id: 'ac-2',
        status: 'passed',
        evidence: {
            subject: 'commit:abc123',
            recordedAt: '2026-08-23T22:05:00.000Z',
            validUntil: '2026-08-25T22:05:00.000Z',
        },
    };
    const extraGate = {
        id: 'security',
        status: 'passed',
        evidence: {
            subject: 'commit:abc123',
            recordedAt: '2026-08-23T22:35:00.000Z',
            validUntil: '2026-08-25T22:35:00.000Z',
        },
    };
    const issue249 = eligibleItem();
    issue249.issue.acceptanceCriteria.push(extraCriterion);
    issue249.issue.requiredGates.push(extraGate);
    const issue250 = eligibleItem({
        projectItemId: 'PVTI_item_250',
        issue: { nodeId: 'I_issue_250', number: 250 },
    });

    const first = planReconciliationBatch(snapshotFor([issue250, issue249]), {
        now: '2026-08-24T00:00:00.000Z',
    });

    const reordered249 = eligibleItem();
    reordered249.issue.acceptanceCriteria = [extraCriterion, ...reordered249.issue.acceptanceCriteria];
    reordered249.issue.requiredGates = [extraGate, ...reordered249.issue.requiredGates];
    const second = planReconciliationBatch(snapshotFor([reordered249, issue250]), {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.deepEqual(first.actions.map((action) => action.issueNodeId), [
        'I_issue_249',
        'I_issue_250',
    ]);
    assert.deepEqual(first.actions, second.actions);
    assert.equal(first.planHash, second.planHash);
    assert.match(first.planHash, /^[a-f0-9]{64}$/);
});

test('applies a deterministic bounded action limit and reports truncation', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const items = [251, 249, 250].map((number) => eligibleItem({
        projectItemId: `PVTI_item_${number}`,
        issue: { nodeId: `I_issue_${number}`, number },
    }));

    const result = planReconciliationBatch(snapshotFor(items), {
        now: '2026-08-24T00:00:00.000Z',
        maxActions: 2,
    });

    assert.deepEqual(result.actions.map((action) => action.issueNodeId), [
        'I_issue_249',
        'I_issue_250',
    ]);
    assert.equal(result.totalActions, 3);
    assert.equal(result.truncated, true);
    assert.equal(result.remainingActions, 1);
});

test('fails closed on invalid bounds or any attempt to weaken the fixed 14-day policy', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const invalidBatch = planReconciliationBatch(snapshotFor([eligibleItem()]), {
        now: '2026-08-24T00:00:00.000Z',
        maxActions: 0,
    });
    const weakenedRetention = planReconciliationBatch(snapshotFor([eligibleItem({
        issue: { state: 'CLOSED' },
    })]), {
        now: '2026-08-24T00:00:00.000Z',
        retentionDays: 1,
    });

    assert.equal(invalidBatch.blocked, true);
    assert.deepEqual(invalidBatch.actions, []);
    assert.deepEqual(invalidBatch.errors, ['invalid-max-actions']);
    assert.equal(weakenedRetention.blocked, true);
    assert.deepEqual(weakenedRetention.actions, []);
    assert.deepEqual(weakenedRetention.errors, ['fixed-retention-policy:14']);
});

test('archives only at the exact 14-day cooling boundary and treats archived items as no-ops', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const beforeBoundary = eligibleItem({
        archiveEligibleSince: '2026-08-10T00:00:00.001Z',
        issue: { state: 'CLOSED' },
    });
    const atBoundary = eligibleItem({
        archiveEligibleSince: '2026-08-10T00:00:00.000Z',
        issue: { state: 'CLOSED' },
    });
    const alreadyArchived = eligibleItem({
        archived: true,
        archiveEligibleSince: '2026-08-01T00:00:00.000Z',
        issue: { state: 'CLOSED' },
    });

    const tooYoung = planReconciliationBatch(snapshotFor([beforeBoundary]), {
        now: '2026-08-24T00:00:00.000Z',
    });
    const eligible = planReconciliationBatch(snapshotFor([atBoundary]), {
        now: '2026-08-24T00:00:00.000Z',
    });
    const noOp = planReconciliationBatch(snapshotFor([alreadyArchived]), {
        now: '2026-08-24T00:00:00.000Z',
    });
    const recentlyClosed = planReconciliationBatch(snapshotFor([eligibleItem({
        archiveEligibleSince: '2026-08-01T00:00:00.000Z',
        issue: {
            state: 'CLOSED',
            closedAt: '2026-08-10T00:00:00.001Z',
        },
    })]), {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.deepEqual(tooYoung.actions, []);
    assert.deepEqual(tooYoung.blockedItems[0].reasons, ['archive-cooling-period']);
    assert.equal(eligible.actions.length, 1);
    assert.equal(eligible.actions[0].type, 'archive-project-item');
    assert.equal(eligible.actions[0].archiveEligibleSince, '2026-08-10T00:00:00.000Z');
    assert.match(eligible.actions[0].idempotencyKey, /^archive:PVTI_item_249:[a-f0-9]{64}$/);
    assert.deepEqual(noOp.actions, []);
    assert.deepEqual(noOp.blockedItems, []);
    assert.deepEqual(recentlyClosed.actions, []);
    assert.deepEqual(recentlyClosed.blockedItems[0].reasons, ['archive-cooling-period']);
});

test('blocks archival for canonical exclusions, invalid cooling evidence, or missing Project write access', async (t) => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const cases = [
        {
            name: 'canonical lifecycle rolled back',
            mutate(item) { item.issue.lifecycle = 'Review'; },
            reason: 'canonical-lifecycle-not-verified-complete',
        },
        {
            name: 'Project status is Long-term watch',
            mutate(item) { item.projectStatus = 'Long-term watch'; },
            reason: 'project-status-excluded:Long-term watch',
        },
        {
            name: 'active audit record must remain visible',
            mutate(item) { item.issue.recordKind = 'audit'; },
            reason: 'archive-record-excluded:audit',
        },
        {
            name: 'cooling start is invalid',
            mutate(item) { item.archiveEligibleSince = 'not-a-time'; },
            reason: 'invalid-archive-eligibility-time',
        },
        {
            name: 'canonical Issue closure time is missing',
            mutate(item) { item.issue.closedAt = null; },
            reason: 'invalid-issue-closed-time',
        },
        {
            name: 'Project write access is denied',
            mutate() {},
            snapshotOverrides: { permissions: { writeProject: false } },
            reason: 'denied-permission:writeProject',
        },
    ];

    for (const entry of cases) {
        await t.test(entry.name, () => {
            const item = eligibleItem({
                archiveEligibleSince: '2026-08-01T00:00:00.000Z',
                issue: { state: 'CLOSED' },
            });
            entry.mutate(item);
            const result = planReconciliationBatch(
                snapshotFor([item], entry.snapshotOverrides || {}),
                { now: '2026-08-24T00:00:00.000Z' },
            );

            assert.equal(result.blocked, false);
            assert.deepEqual(result.actions, []);
            assert.deepEqual(result.blockedItems[0].reasons, [entry.reason]);
        });
    }
});

test('restores reopened archived items to conservative non-active statuses', async (t) => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const cases = [
        { executionState: 'Blocked', targetStatus: 'Blocked' },
        { executionState: 'Needs user', targetStatus: 'Needs user' },
        { executionState: 'In progress', targetStatus: 'Backlog' },
        { executionState: undefined, targetStatus: 'Backlog' },
    ];

    for (const entry of cases) {
        await t.test(entry.executionState || 'missing execution state', () => {
            const item = eligibleItem({
                archived: true,
                issue: {
                    state: 'OPEN',
                    executionState: entry.executionState,
                },
            });
            const result = planReconciliationBatch(snapshotFor([item]), {
                now: '2026-08-24T00:00:00.000Z',
            });

            assert.equal(result.actions.length, 1);
            assert.equal(result.actions[0].type, 'restore-project-item');
            assert.equal(result.actions[0].targetStatus, entry.targetStatus);
            assert.notEqual(result.actions[0].targetStatus, 'In progress');
            assert.deepEqual(result.actions[0].triggerReasons, ['canonical-issue-reopened']);
            assert.match(result.actions[0].idempotencyKey, /^restore:PVTI_item_249:[a-f0-9]{64}$/);
        });
    }
});

test('emits exact manual remediation when Project item restoration is unsupported', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const item = eligibleItem({
        archived: true,
        issue: {
            state: 'OPEN',
            executionState: 'Blocked',
        },
    });
    const result = planReconciliationBatch(snapshotFor([item], {
        capabilities: { restoreProjectItem: false },
    }), {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.actions.length, 1);
    assert.deepEqual(result.actions[0], {
        type: 'manual-project-restoration',
        issueNodeId: 'I_issue_249',
        issueNumber: 249,
        projectItemId: 'PVTI_item_249',
        targetStatus: 'Blocked',
        triggerReasons: ['canonical-issue-reopened'],
        requiredAction: 'Unarchive Project item PVTI_item_249 and set Status to Blocked; do not claim execution.',
        evidenceHash: result.actions[0].evidenceHash,
        idempotencyKey: result.actions[0].idempotencyKey,
        auditPresent: false,
    });
});

test('restores an archived item when canonical Verified Complete eligibility rolls back', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const item = eligibleItem({
        archived: true,
        issue: {
            state: 'CLOSED',
            lifecycle: 'Review',
        },
    });
    const result = planReconciliationBatch(snapshotFor([item]), {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.actions.length, 1);
    assert.equal(result.actions[0].type, 'restore-project-item');
    assert.equal(result.actions[0].targetStatus, 'Backlog');
    assert.ok(result.actions[0].triggerReasons.includes('canonical-lifecycle-not-verified-complete'));
});

test('blocks supported restoration when Project write access is denied', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const item = eligibleItem({ archived: true, issue: { state: 'OPEN' } });
    const result = planReconciliationBatch(snapshotFor([item], {
        permissions: { writeProject: false },
    }), {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.deepEqual(result.actions, []);
    assert.deepEqual(result.blockedItems[0].reasons, ['denied-permission:writeProject']);
});

test('blocks supported restoration when Issue evidence write access is denied', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const item = eligibleItem({ archived: true, issue: { state: 'OPEN' } });
    const result = planReconciliationBatch(snapshotFor([item], {
        permissions: { writeIssues: false },
    }), {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.deepEqual(result.actions, []);
    assert.deepEqual(result.blockedItems[0].reasons, ['denied-permission:writeIssues']);
});

test('applies a close only after stable-ID refetch, idempotent evidence, final recheck, and read-back', async () => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const current = snapshotFor([eligibleItem()]);
    const plan = planReconciliationBatch(current, {
        now: '2026-08-24T00:00:00.000Z',
    });
    const calls = [];
    const adapter = {
        async probeIdentity() {
            calls.push('probe-identity');
            return {
                identity: current.identity,
                permissions: current.permissions,
                capabilities: current.capabilities,
            };
        },
        async refetchByStableIds(identity) {
            calls.push(`refetch:${identity.issueNodeId}:${identity.projectItemId}`);
            return JSON.parse(JSON.stringify(current));
        },
        async ensureCompletionEvidence(action) {
            calls.push(`ensure-completion-evidence:${action.idempotencyKey}`);
            current.evidenceKeys.push(action.idempotencyKey);
            return { status: 'created' };
        },
        async closeIssue(action) {
            calls.push(`close:${action.issueNodeId}`);
            current.items[0].issue.state = 'CLOSED';
            current.items[0].issue.closedAt = '2026-08-24T00:00:00.000Z';
            return { state: 'CLOSED' };
        },
    };

    const result = await applyReconciliationPlan(plan, adapter, {
        enabled: true,
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.ok, true);
    assert.equal(result.applied, true);
    assert.deepEqual(result.results, [{
        type: 'close-issue',
        issueNodeId: 'I_issue_249',
        projectItemId: 'PVTI_item_249',
        idempotencyKey: plan.actions[0].idempotencyKey,
        status: 'applied',
    }]);
    assert.deepEqual(calls, [
        'probe-identity',
        'refetch:I_issue_249:PVTI_item_249',
        `ensure-completion-evidence:${plan.actions[0].idempotencyKey}`,
        'refetch:I_issue_249:PVTI_item_249',
        'close:I_issue_249',
        'refetch:I_issue_249:PVTI_item_249',
    ]);
});

test('keeps dry-run as the default and never touches the adapter', async () => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const plan = planReconciliationBatch(snapshotFor([eligibleItem()]), {
        now: '2026-08-24T00:00:00.000Z',
    });
    const adapter = new Proxy({}, {
        get() {
            throw new Error('adapter must not be read during dry-run');
        },
    });

    const result = await applyReconciliationPlan(plan, adapter);

    assert.equal(result.ok, true);
    assert.equal(result.applied, false);
    assert.equal(result.dryRun, true);
    assert.deepEqual(result.actions, plan.actions);
});

test('stops before refetch or mutation on identity and permission drift', async (t) => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const snapshot = snapshotFor([eligibleItem()]);
    const plan = planReconciliationBatch(snapshot, {
        now: '2026-08-24T00:00:00.000Z',
    });
    const cases = [
        {
            name: 'identity drift',
            probe: {
                identity: { repositoryNodeId: 'R_other', projectNodeId: 'P_project_6' },
                permissions: snapshot.permissions,
                capabilities: snapshot.capabilities,
            },
            error: 'identity-drift',
        },
        {
            name: 'Issue write permission drift',
            probe: {
                identity: snapshot.identity,
                permissions: { ...snapshot.permissions, writeIssues: false },
                capabilities: snapshot.capabilities,
            },
            error: 'permission-drift:writeIssues',
        },
    ];

    for (const entry of cases) {
        await t.test(entry.name, async () => {
            let refetched = false;
            const result = await applyReconciliationPlan(plan, {
                async probeIdentity() { return entry.probe; },
                async refetchByStableIds() {
                    refetched = true;
                    return snapshot;
                },
                async ensureCompletionEvidence() {},
                async closeIssue() {},
            }, {
                enabled: true,
                now: '2026-08-24T00:00:00.000Z',
            });

            assert.equal(result.ok, false);
            assert.equal(result.error, entry.error);
            assert.equal(refetched, false);
            assert.deepEqual(result.results, []);
        });
    }
});

test('rechecks all closure preconditions after evidence and stops on drift', async () => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const current = snapshotFor([eligibleItem()]);
    const plan = planReconciliationBatch(current, {
        now: '2026-08-24T00:00:00.000Z',
    });
    const calls = [];
    const result = await applyReconciliationPlan(plan, {
        async probeIdentity() {
            return {
                identity: current.identity,
                permissions: current.permissions,
                capabilities: current.capabilities,
            };
        },
        async refetchByStableIds() {
            calls.push('refetch');
            return JSON.parse(JSON.stringify(current));
        },
        async ensureCompletionEvidence() {
            calls.push('ensure-completion-evidence');
            current.items[0].issue.requiredGates[0].status = 'pending';
        },
        async closeIssue() {
            calls.push('close');
        },
    }, {
        enabled: true,
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'precondition-drift');
    assert.equal(result.partial, true);
    assert.deepEqual(calls, ['refetch', 'ensure-completion-evidence', 'refetch']);
});

test('stops a bounded batch on partial write failure without starting later actions', async () => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const current = snapshotFor([249, 250, 251].map((number) => eligibleItem({
        projectItemId: `PVTI_item_${number}`,
        issue: { nodeId: `I_issue_${number}`, number },
    })));
    const plan = planReconciliationBatch(current, {
        now: '2026-08-24T00:00:00.000Z',
        maxActions: 3,
    });
    const calls = [];
    const result = await applyReconciliationPlan(plan, {
        async probeIdentity() {
            return {
                identity: current.identity,
                permissions: current.permissions,
                capabilities: current.capabilities,
            };
        },
        async refetchByStableIds(identity) {
            const item = current.items.find((candidate) => (
                candidate.issue.nodeId === identity.issueNodeId
                && candidate.projectItemId === identity.projectItemId
            ));
            return snapshotFor(item ? [JSON.parse(JSON.stringify(item))] : [], {
                evidenceKeys: [...current.evidenceKeys],
            });
        },
        async ensureCompletionEvidence(action) {
            calls.push(`evidence:${action.issueNumber}`);
            if (!current.evidenceKeys.includes(action.idempotencyKey)) {
                current.evidenceKeys.push(action.idempotencyKey);
            }
        },
        async closeIssue(action) {
            calls.push(`close:${action.issueNumber}`);
            if (action.issueNumber === 250) throw new Error('simulated-close-failure');
            const item = current.items.find((candidate) => candidate.issue.number === action.issueNumber);
            item.issue.state = 'CLOSED';
            item.issue.closedAt = '2026-08-24T00:00:00.000Z';
        },
    }, {
        enabled: true,
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.ok, false);
    assert.equal(result.applied, true);
    assert.equal(result.partial, true);
    assert.equal(result.error, 'simulated-close-failure');
    assert.deepEqual(result.results.map((entry) => entry.issueNodeId), ['I_issue_249']);
    assert.deepEqual(calls, [
        'evidence:249',
        'close:249',
        'evidence:250',
        'close:250',
    ]);
});

test('applies archive and restoration actions through audited refetch and read-back sequences', async (t) => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');

    await t.test('archive', async () => {
        const current = snapshotFor([eligibleItem({
            issue: { state: 'CLOSED' },
            archiveEligibleSince: '2026-08-01T00:00:00.000Z',
        })]);
        const plan = planReconciliationBatch(current, {
            now: '2026-08-24T00:00:00.000Z',
        });
        const calls = [];
        const adapter = {
            async probeIdentity() {
                calls.push('probe-identity');
                return {
                    identity: current.identity,
                    permissions: current.permissions,
                    capabilities: current.capabilities,
                };
            },
            async refetchByStableIds() {
                calls.push('refetch');
                return JSON.parse(JSON.stringify(current));
            },
            async ensureArchiveAudit(action) {
                calls.push('ensure-archive-audit');
                current.archiveAuditKeys.push(action.idempotencyKey);
            },
            async archiveProjectItem() {
                calls.push('archive-project-item');
                current.items[0].archived = true;
            },
        };

        const result = await applyReconciliationPlan(plan, adapter, {
            enabled: true,
            now: '2026-08-24T00:00:00.000Z',
        });

        assert.equal(result.ok, true);
        assert.equal(result.results[0].type, 'archive-project-item');
        assert.deepEqual(calls, [
            'probe-identity',
            'refetch',
            'ensure-archive-audit',
            'refetch',
            'archive-project-item',
            'refetch',
        ]);
    });

    await t.test('restore', async () => {
        const current = snapshotFor([eligibleItem({
            archived: true,
            issue: { state: 'OPEN', executionState: 'Blocked' },
        })]);
        const plan = planReconciliationBatch(current, {
            now: '2026-08-24T00:00:00.000Z',
        });
        const calls = [];
        const adapter = {
            async probeIdentity() {
                calls.push('probe-identity');
                return {
                    identity: current.identity,
                    permissions: current.permissions,
                    capabilities: current.capabilities,
                };
            },
            async refetchByStableIds() {
                calls.push('refetch');
                return JSON.parse(JSON.stringify(current));
            },
            async ensureRestorationAudit(action) {
                calls.push('ensure-restoration-audit');
                current.restorationAuditKeys.push(action.idempotencyKey);
            },
            async restoreProjectItem(action) {
                calls.push(`restore-project-item:${action.targetStatus}`);
                current.items[0].archived = false;
                current.items[0].projectStatus = action.targetStatus;
            },
        };

        const result = await applyReconciliationPlan(plan, adapter, {
            enabled: true,
            now: '2026-08-24T00:00:00.000Z',
        });

        assert.equal(result.ok, true);
        assert.equal(result.results[0].type, 'restore-project-item');
        assert.deepEqual(calls, [
            'probe-identity',
            'refetch',
            'ensure-restoration-audit',
            'refetch',
            'restore-project-item:Blocked',
            'refetch',
        ]);
    });
});

test('emits manual restoration evidence without attempting a Project write', async () => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const current = snapshotFor([eligibleItem({
        archived: true,
        issue: { state: 'OPEN' },
    })], {
        capabilities: { restoreProjectItem: false },
    });
    const plan = planReconciliationBatch(current, {
        now: '2026-08-24T00:00:00.000Z',
    });
    const calls = [];
    const result = await applyReconciliationPlan(plan, {
        async probeIdentity() {
            return {
                identity: current.identity,
                permissions: current.permissions,
                capabilities: current.capabilities,
            };
        },
        async refetchByStableIds() {
            calls.push('refetch');
            return JSON.parse(JSON.stringify(current));
        },
        async ensureRestorationAudit(action) {
            calls.push('ensure-restoration-audit');
            current.restorationAuditKeys.push(action.idempotencyKey);
        },
        async emitManualRemediation(action) {
            calls.push(`manual-remediation:${action.targetStatus}`);
            return { recorded: true, idempotencyKey: action.idempotencyKey };
        },
        async restoreProjectItem() {
            calls.push('unexpected-project-write');
        },
    }, {
        enabled: true,
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.ok, true);
    assert.equal(result.results[0].status, 'manual-remediation-emitted');
    assert.deepEqual(calls, [
        'refetch',
        'ensure-restoration-audit',
        'refetch',
        'manual-remediation:Backlog',
    ]);
});

test('keeps action keys stable while marking existing evidence and audit records', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');

    const closeSnapshot = snapshotFor([eligibleItem()]);
    const closeFirst = planReconciliationBatch(closeSnapshot, {
        now: '2026-08-24T00:00:00.000Z',
    });
    closeSnapshot.evidenceKeys.push(closeFirst.actions[0].idempotencyKey);
    const closeAgain = planReconciliationBatch(closeSnapshot, {
        now: '2026-08-24T00:00:00.000Z',
    });
    assert.equal(closeAgain.actions[0].idempotencyKey, closeFirst.actions[0].idempotencyKey);
    assert.equal(closeAgain.actions[0].evidencePresent, true);

    const archiveSnapshot = snapshotFor([eligibleItem({
        issue: { state: 'CLOSED' },
        archiveEligibleSince: '2026-08-01T00:00:00.000Z',
    })]);
    const archiveFirst = planReconciliationBatch(archiveSnapshot, {
        now: '2026-08-24T00:00:00.000Z',
    });
    archiveSnapshot.archiveAuditKeys.push(archiveFirst.actions[0].idempotencyKey);
    const archiveAgain = planReconciliationBatch(archiveSnapshot, {
        now: '2026-08-24T00:00:00.000Z',
    });
    assert.equal(archiveAgain.actions[0].idempotencyKey, archiveFirst.actions[0].idempotencyKey);
    assert.equal(archiveAgain.actions[0].auditPresent, true);

    const restoreSnapshot = snapshotFor([eligibleItem({
        archived: true,
        issue: { state: 'OPEN' },
    })]);
    const restoreFirst = planReconciliationBatch(restoreSnapshot, {
        now: '2026-08-24T00:00:00.000Z',
    });
    restoreSnapshot.restorationAuditKeys.push(restoreFirst.actions[0].idempotencyKey);
    const restoreAgain = planReconciliationBatch(restoreSnapshot, {
        now: '2026-08-24T00:00:00.000Z',
    });
    assert.equal(restoreAgain.actions[0].idempotencyKey, restoreFirst.actions[0].idempotencyKey);
    assert.equal(restoreAgain.actions[0].auditPresent, true);
});

test('does not require a merged implementation PR when code is explicitly not required', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const item = eligibleItem({
        issue: {
            codeRequired: false,
            implementationPr: null,
            expectedEvidenceSubject: 'artifact:design-v1',
        },
    });
    item.issue.acceptanceCriteria[0].evidence.subject = 'artifact:design-v1';
    item.issue.requiredGates[0].evidence.subject = 'artifact:design-v1';

    const result = planReconciliationBatch(snapshotFor([item]), {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(result.actions.length, 1);
    assert.equal(result.actions[0].type, 'close-issue');
});

test('rejects timezone-ambiguous timestamps instead of relying on permissive Date parsing', async (t) => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');

    await t.test('evaluation time must be RFC3339', () => {
        const result = planReconciliationBatch(snapshotFor([eligibleItem()]), {
            now: '2026-08-24',
        });
        assert.equal(result.blocked, true);
        assert.deepEqual(result.errors, ['invalid-now']);
    });

    await t.test('snapshot freshness timestamps must be RFC3339', () => {
        const snapshot = snapshotFor([eligibleItem()], { capturedAt: '2026-08-23' });
        const result = planReconciliationBatch(snapshot, { now: '2026-08-24T00:00:00.000Z' });
        assert.equal(result.blocked, true);
        assert.deepEqual(result.errors, ['invalid-snapshot-timestamp']);
    });

    await t.test('gate evidence timestamps must be RFC3339', () => {
        const item = eligibleItem();
        item.issue.requiredGates[0].evidence.recordedAt = '2026-08-23';
        const result = planReconciliationBatch(snapshotFor([item]), {
            now: '2026-08-24T00:00:00.000Z',
        });
        assert.deepEqual(result.actions, []);
        assert.deepEqual(result.blockedItems[0].reasons, [
            'invalid-evidence-time:required-gate:qa',
        ]);
    });

    await t.test('archive eligibility time must be RFC3339', () => {
        const item = eligibleItem({
            issue: { state: 'CLOSED' },
            archiveEligibleSince: '2026-08-01',
        });
        const result = planReconciliationBatch(snapshotFor([item]), {
            now: '2026-08-24T00:00:00.000Z',
        });
        assert.deepEqual(result.actions, []);
        assert.ok(result.blockedItems[0].reasons.includes('invalid-archive-eligibility-time'));
    });
});

test('fails closed when a stable-ID refetch returns missing, wrong, or extra items', async (t) => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const original = snapshotFor([eligibleItem()]);
    const plan = planReconciliationBatch(original, {
        now: '2026-08-24T00:00:00.000Z',
    });
    const cases = [
        {
            name: 'missing item',
            snapshot: snapshotFor([]),
            error: 'stable-refetch-cardinality',
        },
        {
            name: 'wrong item identity',
            snapshot: snapshotFor([eligibleItem({
                projectItemId: 'PVTI_item_250',
                issue: { nodeId: 'I_issue_250', number: 250 },
            })]),
            error: 'stable-refetch-identity-mismatch',
        },
        {
            name: 'extra item',
            snapshot: snapshotFor([
                eligibleItem(),
                eligibleItem({
                    projectItemId: 'PVTI_item_250',
                    issue: { nodeId: 'I_issue_250', number: 250 },
                }),
            ]),
            error: 'stable-refetch-cardinality',
        },
    ];

    for (const entry of cases) {
        await t.test(entry.name, async () => {
            const calls = [];
            const result = await applyReconciliationPlan(plan, {
                async probeIdentity() {
                    return {
                        identity: original.identity,
                        permissions: original.permissions,
                        capabilities: original.capabilities,
                    };
                },
                async refetchByStableIds() {
                    calls.push('refetch');
                    return entry.snapshot;
                },
                async ensureCompletionEvidence() { calls.push('unexpected-evidence-write'); },
                async closeIssue() { calls.push('unexpected-close'); },
            }, {
                enabled: true,
                now: '2026-08-24T00:00:00.000Z',
            });

            assert.equal(result.ok, false);
            assert.equal(result.error, entry.error);
            assert.deepEqual(calls, ['refetch']);
        });
    }
});

test('rejects capability tampering in both directions before adapter access', async (t) => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const cases = [
        {
            name: 'planned supported to tampered unsupported',
            plannedSupport: true,
            tamperedSupport: false,
            expectedAction: 'restore-project-item',
        },
        {
            name: 'planned unsupported to tampered supported',
            plannedSupport: false,
            tamperedSupport: true,
            expectedAction: 'manual-project-restoration',
        },
    ];

    for (const entry of cases) {
        await t.test(entry.name, async () => {
            const snapshot = snapshotFor([eligibleItem({
                archived: true,
                issue: { state: 'OPEN' },
            })], {
                capabilities: { restoreProjectItem: entry.plannedSupport },
            });
            const plan = planReconciliationBatch(snapshot, {
                now: '2026-08-24T00:00:00.000Z',
            });
            assert.equal(plan.actions[0].type, entry.expectedAction);

            const tampered = JSON.parse(JSON.stringify(plan));
            tampered.capabilities.restoreProjectItem = entry.tamperedSupport;
            const calls = [];
            const adapter = new Proxy({
                async probeIdentity() {
                    calls.push('probe-identity');
                    return {
                        identity: snapshot.identity,
                        permissions: snapshot.permissions,
                        capabilities: tampered.capabilities,
                    };
                },
                async refetchByStableIds() {
                    calls.push('refetch');
                    throw new Error('unexpected-refetch-after-capability-tamper');
                },
                async ensureRestorationAudit() { calls.push('mutation:audit'); },
                async restoreProjectItem() { calls.push('mutation:restore'); },
                async emitManualRemediation() { calls.push('mutation:manual-remediation'); },
            }, {
                get(target, property, receiver) {
                    calls.push(`get:${String(property)}`);
                    return Reflect.get(target, property, receiver);
                },
            });
            const result = await applyReconciliationPlan(tampered, adapter, {
                enabled: true,
                now: '2026-08-24T00:00:00.000Z',
            });

            assert.equal(result.ok, false);
            assert.equal(result.error, 'plan-integrity-mismatch');
            assert.deepEqual(calls, []);
        });
    }
});

test('fails restoration before refetch when capability support drifts in either direction', async (t) => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const cases = [
        {
            name: 'planned supported to probed unsupported',
            plannedSupport: true,
            probedSupport: false,
        },
        {
            name: 'planned unsupported to probed supported',
            plannedSupport: false,
            probedSupport: true,
        },
    ];

    for (const entry of cases) {
        await t.test(entry.name, async () => {
            const snapshot = snapshotFor([eligibleItem({
                archived: true,
                issue: { state: 'OPEN' },
            })], {
                capabilities: { restoreProjectItem: entry.plannedSupport },
            });
            const plan = planReconciliationBatch(snapshot, {
                now: '2026-08-24T00:00:00.000Z',
            });
            const calls = [];
            const result = await applyReconciliationPlan(plan, {
                async probeIdentity() {
                    calls.push('probe-identity');
                    return {
                        identity: snapshot.identity,
                        permissions: snapshot.permissions,
                        capabilities: { restoreProjectItem: entry.probedSupport },
                    };
                },
                async refetchByStableIds() {
                    calls.push('refetch');
                    return snapshot;
                },
                async ensureRestorationAudit() { calls.push('mutation:audit'); },
                async restoreProjectItem() { calls.push('mutation:restore'); },
                async emitManualRemediation() { calls.push('mutation:manual-remediation'); },
            }, {
                enabled: true,
                now: '2026-08-24T00:00:00.000Z',
            });

            assert.equal(result.ok, false);
            assert.equal(result.error, 'capability-drift:restoreProjectItem');
            assert.deepEqual(calls, ['probe-identity']);
        });
    }
});

test('archive action identity is bound to current acceptance, gate, and implementation evidence', () => {
    const { planReconciliationBatch } = require('../lib/verified-complete-reconciler.js');
    const original = snapshotFor([eligibleItem({ issue: { state: 'CLOSED' } })]);
    const changed = JSON.parse(JSON.stringify(original));
    changed.items[0].issue.requiredGates[0].id = 'security';
    const first = planReconciliationBatch(original, {
        now: '2026-08-24T00:00:00.000Z',
    });
    const second = planReconciliationBatch(changed, {
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.notEqual(first.actions[0].idempotencyKey, second.actions[0].idempotencyKey);
    assert.notEqual(first.planHash, second.planHash);
});

test('never performs a primary mutation until idempotent evidence is visible on refetch', async (t) => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const cases = [
        {
            name: 'completion evidence before close',
            current: snapshotFor([eligibleItem()]),
            ensureMethod: 'ensureCompletionEvidence',
            forbiddenMethod: 'closeIssue',
            error: 'completion-evidence-readback-mismatch',
        },
        {
            name: 'archive audit before archive',
            current: snapshotFor([eligibleItem({
                issue: { state: 'CLOSED' },
                archiveEligibleSince: '2026-08-01T00:00:00.000Z',
            })]),
            ensureMethod: 'ensureArchiveAudit',
            forbiddenMethod: 'archiveProjectItem',
            error: 'archive-audit-readback-mismatch',
        },
        {
            name: 'restoration audit before restoration',
            current: snapshotFor([eligibleItem({
                archived: true,
                issue: { state: 'OPEN' },
            })]),
            ensureMethod: 'ensureRestorationAudit',
            forbiddenMethod: 'restoreProjectItem',
            error: 'restoration-audit-readback-mismatch',
        },
        {
            name: 'restoration audit before manual remediation',
            current: snapshotFor([eligibleItem({
                archived: true,
                issue: { state: 'OPEN' },
            })], {
                capabilities: { restoreProjectItem: false },
            }),
            ensureMethod: 'ensureRestorationAudit',
            forbiddenMethod: 'emitManualRemediation',
            error: 'restoration-audit-readback-mismatch',
        },
    ];

    for (const entry of cases) {
        await t.test(entry.name, async () => {
            const plan = planReconciliationBatch(entry.current, {
                now: '2026-08-24T00:00:00.000Z',
            });
            const calls = [];
            const adapter = {
                async probeIdentity() {
                    return {
                        identity: entry.current.identity,
                        permissions: entry.current.permissions,
                        capabilities: entry.current.capabilities,
                    };
                },
                async refetchByStableIds() {
                    calls.push('refetch');
                    return JSON.parse(JSON.stringify(entry.current));
                },
                async [entry.ensureMethod]() {
                    calls.push(entry.ensureMethod);
                },
                async [entry.forbiddenMethod]() {
                    calls.push(`forbidden:${entry.forbiddenMethod}`);
                },
            };

            const result = await applyReconciliationPlan(plan, adapter, {
                enabled: true,
                now: '2026-08-24T00:00:00.000Z',
            });

            assert.equal(result.ok, false);
            assert.equal(result.applied, false);
            assert.equal(result.partial, true);
            assert.equal(result.error, entry.error);
            assert.deepEqual(calls, ['refetch', entry.ensureMethod, 'refetch']);
        });
    }
});

test('refuses to apply a mixed plan containing any canonically blocked item', async () => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const blocked = eligibleItem({
        projectItemId: 'PVTI_item_250',
        issue: {
            nodeId: 'I_issue_250',
            number: 250,
            lifecycle: 'Review',
        },
    });
    const plan = planReconciliationBatch(snapshotFor([eligibleItem(), blocked]), {
        now: '2026-08-24T00:00:00.000Z',
    });
    const adapter = new Proxy({}, {
        get() { throw new Error('adapter must not be touched for a mixed blocked plan'); },
    });

    assert.equal(plan.actions.length, 1);
    assert.equal(plan.blockedItems.length, 1);
    const result = await applyReconciliationPlan(plan, adapter, { enabled: true });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'plan-blocked-or-missing');
});

test('reports an attempted primary write as partial when canonical read-back fails', async () => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const current = snapshotFor([eligibleItem()]);
    const plan = planReconciliationBatch(current, {
        now: '2026-08-24T00:00:00.000Z',
    });
    let refetchCount = 0;
    const result = await applyReconciliationPlan(plan, {
        async probeIdentity() {
            return {
                identity: current.identity,
                permissions: current.permissions,
                capabilities: current.capabilities,
            };
        },
        async refetchByStableIds() {
            refetchCount += 1;
            if (refetchCount === 3) return snapshotFor([]);
            return JSON.parse(JSON.stringify(current));
        },
        async ensureCompletionEvidence(action) {
            current.evidenceKeys.push(action.idempotencyKey);
        },
        async closeIssue() {
            current.items[0].issue.state = 'CLOSED';
            current.items[0].issue.closedAt = '2026-08-24T00:00:00.000Z';
        },
    }, {
        enabled: true,
        now: '2026-08-24T00:00:00.000Z',
    });

    assert.equal(current.items[0].issue.state, 'CLOSED');
    assert.equal(result.ok, false);
    assert.equal(result.applied, true);
    assert.equal(result.partial, true);
    assert.equal(result.error, 'stable-refetch-cardinality');
    assert.deepEqual(result.uncertainAction, {
        type: 'close-issue',
        issueNodeId: 'I_issue_249',
        projectItemId: 'PVTI_item_249',
        idempotencyKey: plan.actions[0].idempotencyKey,
    });
});

test('rejects a tampered plan, invalid apply time, or incomplete adapter before any adapter access', async (t) => {
    const {
        planReconciliationBatch,
        applyReconciliationPlan,
    } = require('../lib/verified-complete-reconciler.js');
    const snapshot = snapshotFor([eligibleItem()]);
    const plan = planReconciliationBatch(snapshot, {
        now: '2026-08-24T00:00:00.000Z',
    });

    await t.test('tampered plan', async () => {
        const tampered = JSON.parse(JSON.stringify(plan));
        tampered.actions[0].issueNumber = 999;
        const adapter = new Proxy({}, {
            get() { throw new Error('adapter must not be touched'); },
        });
        const result = await applyReconciliationPlan(tampered, adapter, { enabled: true });
        assert.equal(result.ok, false);
        assert.equal(result.error, 'plan-integrity-mismatch');
    });

    await t.test('invalid apply time', async () => {
        const adapter = new Proxy({}, {
            get() { throw new Error('adapter must not be touched'); },
        });
        const result = await applyReconciliationPlan(plan, adapter, {
            enabled: true,
            now: '2026-08-24',
        });
        assert.equal(result.ok, false);
        assert.equal(result.error, 'invalid-now');
    });

    await t.test('missing action method', async () => {
        let probed = false;
        const result = await applyReconciliationPlan(plan, {
            async probeIdentity() { probed = true; },
            async refetchByStableIds() {},
            async ensureCompletionEvidence() {},
        }, { enabled: true });
        assert.equal(result.ok, false);
        assert.equal(result.error, 'missing-adapter-method:closeIssue');
        assert.equal(probed, false);
    });
});
