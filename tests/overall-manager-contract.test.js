'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const {
    AUTHORITY_CONTRACT_VERSION,
    PORTFOLIO_PACKET_VERSION,
    OVERALL_MANAGER_AUTHORITY,
    ROLE_AUTHORITY,
    AUTHORITY_LIFECYCLE,
    validatePortfolioControlPacket,
    canonicalizePortfolioControlPacket,
    hashPortfolioControlPacket,
    buildPortfolioControlPacket,
} = require('../lib/overall-manager-contract.js');

const NOW = '2026-08-24T06:45:00.000Z';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);

function validPacket() {
    return {
        schemaVersion: PORTFOLIO_PACKET_VERSION,
        packetId: 'packet:portfolio-devlead:20260824-001',
        generatedAt: '2026-08-24T06:44:45.000Z',
        expiresAt: '2026-08-24T07:00:00.000Z',
        producer: {
            role: 'overall-manager',
            actorId: 'agent:overall-manager-01',
            authorityGeneration: 7,
            policyVersion: AUTHORITY_CONTRACT_VERSION,
            mode: 'propose',
        },
        scope: {
            portfolioId: 'portfolio:devlead',
            programId: 'program:programming-lead-ai-system',
            repositoryId: 'repo:xXKillerNoobYT/Programming-lead-AI-System-',
            canonicalRootId: 'issue:210',
        },
        disposition: {
            status: 'ready',
            reasonCode: 'eligible-leaf',
            evidenceRefs: ['evidence:priority'],
        },
        executionContext: {
            classification: 'executable-leaf',
            activeParentId: 'issue:211',
            taskId: 'issue:254',
            hostId: 'host:windows-01',
            leaseId: 'lease:issue-254:windows',
            hostSuitability: 'suitable',
            evidenceRefs: ['evidence:priority', 'evidence:lease'],
        },
        executionCapacity: {
            requestedOverall: 1,
            defaultMaxOverall: 1,
            maxPerHost: 1,
            secondLane: {
                enabled: false,
                nonOverlapEvidenceRefs: [],
            },
        },
        priority: {
            rank: 1,
            rationale: 'Dependency-ready contract work.',
            evidenceRefs: ['evidence:priority'],
        },
        capacity: {
            unit: 'execution-slot',
            available: 1,
            requested: 1,
        },
        budget: {
            unit: 'usd',
            available: 25,
            requested: 5,
        },
        dependencies: [
            {
                dependencyId: 'issue:230',
                programId: 'program:programming-lead-ai-system',
                status: 'satisfied',
                evidenceRefs: ['evidence:dependency'],
            },
        ],
        blocker: {
            classification: 'none',
            reasonCode: 'none',
            summary: 'No canonical blocker is open.',
            ownerId: 'agent:programming-lead-01',
            canonicalLink: 'https://github.example.invalid/program/issues/254',
            state: 'cleared',
            resumeCondition: 'No resume condition is required.',
            evidenceRefs: ['evidence:blocker'],
        },
        gates: [
            gate('spec', 'evidence:spec'),
            gate('qa', 'evidence:qa'),
            gate('security', 'evidence:security'),
            gate('reviewer', 'evidence:reviewer'),
        ],
        provenance: [
            evidence('evidence:priority', 'priority-comment', HASH_A),
            evidence('evidence:dependency', 'dependency-readback', HASH_B),
            evidence('evidence:blocker', 'blocker-audit', HASH_C),
            evidence('evidence:spec', 'spec-gate', HASH_A),
            evidence('evidence:qa', 'qa-gate', HASH_B),
            evidence('evidence:security', 'security-gate', HASH_C),
            evidence('evidence:reviewer', 'reviewer-gate', HASH_A),
            evidence('evidence:lease', 'lease-claim', HASH_B),
        ],
        contextInputs: [
            {
                inputId: 'context:prompt-01',
                kind: 'prompt',
                authority: 'none',
                summary: 'Bounded operator context only.',
                evidenceRefs: ['evidence:priority'],
            },
        ],
        leaseSnapshot: {
            observedAt: '2026-08-24T06:44:30.000Z',
            snapshotHash: HASH_A,
            leases: [
                {
                    leaseId: 'lease:issue-254:windows',
                    resourceId: 'issue:254',
                    actorId: 'agent:windows-executor',
                    hostId: 'host:windows-01',
                    mode: 'exclusive',
                    generation: 3,
                    expiresAt: '2026-08-24T07:00:00.000Z',
                    evidenceRef: 'evidence:lease',
                },
            ],
        },
        collisionSnapshot: {
            observedAt: '2026-08-24T06:44:30.000Z',
            snapshotHash: HASH_B,
            conflicts: [],
        },
        nextAction: {
            kind: 'recommend-program-priority',
            actionId: 'action:issue-254:contract',
            programId: 'program:programming-lead-ai-system',
            repositoryId: 'repo:xXKillerNoobYT/Programming-lead-AI-System-',
            programmingLeadId: 'agent:programming-lead-01',
            targetId: 'issue:254',
            summary: 'Recommend the contract leaf to the Programming Lead.',
            evidenceRefs: ['evidence:priority', 'evidence:lease'],
        },
    };
}

function gate(kind, evidenceRef) {
    return {
        kind,
        status: 'pass',
        reviewerId: `agent:${kind}-reviewer`,
        observedAt: '2026-08-24T06:43:00.000Z',
        evidenceRef,
    };
}

function evidence(evidenceId, stableId, sha256) {
    return {
        evidenceId,
        sourceKind: 'canonical-ledger',
        stableId: `comment:${stableId}`,
        permalink: `https://github.example.invalid/program/issues/254#${stableId}`,
        observedAt: '2026-08-24T06:43:00.000Z',
        sha256,
    };
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function errorCodes(result) {
    return new Set(result.errors.map((error) => error.code));
}

function noActionPacket(reasonCode = 'authority-disabled') {
    const packet = validPacket();
    packet.producer.mode = 'disabled';
    delete packet.nextAction;
    packet.noAction = {
        reasonCode,
        summary: 'Authority is disabled; no recommendation is emitted.',
        evidenceRefs: ['evidence:priority'],
        recheckAt: '2026-08-24T07:00:00.000Z',
    };
    return packet;
}

describe('Overall Manager authority contract', () => {
    test('publishes a versioned provider-neutral role boundary', () => {
        assert.equal(
            AUTHORITY_CONTRACT_VERSION,
            'devlead.overall-manager-authority/v1',
        );
        assert.equal(
            PORTFOLIO_PACKET_VERSION,
            'devlead.portfolio-control-packet/v1',
        );
        assert.deepEqual(OVERALL_MANAGER_AUTHORITY.may, [
            'summarize-portfolios',
            'recommend-portfolio-priority',
            'recommend-capacity-and-budget',
            'surface-cross-program-dependencies',
            'escalate-canonical-blockers',
        ]);
        assert.deepEqual(OVERALL_MANAGER_AUTHORITY.mustNot, [
            'order-program-local-work',
            'dispatch-execution',
            'waive-independent-gates',
            'mutate-project-or-issue-state',
            'consume-raw-private-program-context',
        ]);
    });

    test('separates owner, coordination, program, review, support, and execution roles', () => {
        assert.deepEqual(Object.keys(ROLE_AUTHORITY), [
            'owner',
            'layer0',
            'devManager',
            'overallManager',
            'programmingLead',
            'reviewer',
            'support',
            'executor',
        ]);
        assert.equal(ROLE_AUTHORITY.overallManager.dispatches, false);
        assert.equal(ROLE_AUTHORITY.programmingLead.ordersProgramWork, true);
        assert.equal(ROLE_AUTHORITY.reviewer.maySelfWaive, false);
        assert.equal(ROLE_AUTHORITY.support.mayMutateCanonicalState, false);
        assert.equal(ROLE_AUTHORITY.executor.requiresExactLease, true);
        assert.equal(AUTHORITY_LIFECYCLE.initial, 'disabled');
        assert.deepEqual(AUTHORITY_LIFECYCLE.states, [
            'disabled',
            'read-only',
            'propose',
            'manual-approval',
            'bounded-automatic',
            'superseded',
        ]);
        assert.deepEqual(AUTHORITY_LIFECYCLE.transitions['bounded-automatic'], [
            'manual-approval',
            'read-only',
            'disabled',
            'superseded',
        ]);
        assert.deepEqual(AUTHORITY_LIFECYCLE.rollback, {
            target: 'disabled',
            incrementAuthorityGeneration: true,
            invalidateOutstandingPackets: true,
            preserveCanonicalEvidence: true,
        });
    });
});

describe('Portfolio Control Packet v1 happy path', () => {
    test('accepts a fresh, closed, internally consistent recommendation', () => {
        const result = validatePortfolioControlPacket(validPacket(), { now: NOW });

        assert.equal(result.ok, true);
        assert.deepEqual(result.errors, []);
        assert.equal(result.state, 'next-action');
    });

    test('canonical JSON and SHA-256 are deterministic across object key order', () => {
        const packet = validPacket();
        const reordered = Object.fromEntries(Object.entries(packet).reverse());

        assert.equal(
            canonicalizePortfolioControlPacket(packet),
            canonicalizePortfolioControlPacket(reordered),
        );
        assert.match(hashPortfolioControlPacket(packet), /^[a-f0-9]{64}$/);
        assert.equal(
            hashPortfolioControlPacket(packet),
            hashPortfolioControlPacket(reordered),
        );
    });

    test('canonical hash treats packet collections as identity-keyed sets', () => {
        const packet = validPacket();
        const reordered = clone(packet);
        reordered.gates.reverse();
        reordered.provenance.reverse();
        reordered.dependencies.reverse();
        reordered.leaseSnapshot.leases.reverse();
        reordered.collisionSnapshot.conflicts.reverse();

        assert.equal(
            hashPortfolioControlPacket(packet),
            hashPortfolioControlPacket(reordered),
        );
    });

    test('canonical collection ordering uses locale-independent code-unit order', () => {
        const packet = validPacket();
        packet.priority.evidenceRefs = ['evidence:ä', 'evidence:z', 'evidence:A'];

        assert.match(
            canonicalizePortfolioControlPacket(packet),
            /"evidenceRefs":\["evidence:A","evidence:z","evidence:ä"\]/,
        );
    });

    test('canonicalization and hashing return null for cyclic input', () => {
        const cyclic = { packetId: 'packet:cycle' };
        cyclic.self = cyclic;
        let canonical;
        let hash;

        assert.doesNotThrow(() => {
            canonical = canonicalizePortfolioControlPacket(cyclic);
            hash = hashPortfolioControlPacket(cyclic);
        });
        assert.equal(canonical, null);
        assert.equal(hash, null);
    });

    test('canonicalization rejects oversized collections before hashing', () => {
        assert.equal(canonicalizePortfolioControlPacket(Array(129).fill('x')), null);
        assert.equal(hashPortfolioControlPacket(Array(129).fill('x')), null);
    });

    test('accepts an explicit no-action packet and never infers an action', () => {
        const result = validatePortfolioControlPacket(noActionPacket(), { now: NOW });

        assert.equal(result.ok, true);
        assert.equal(result.state, 'no-action');
        assert.equal(result.action, null);
    });
});

describe('Portfolio Control Packet v1 closed input boundary', () => {
    test('fails closed on unknown top-level or nested fields', () => {
        const topLevel = validPacket();
        topLevel.providerPayload = { opaque: true };
        const nested = validPacket();
        nested.scope.unexpectedFlag = true;

        assert.ok(errorCodes(validatePortfolioControlPacket(topLevel, { now: NOW })).has('UNKNOWN_FIELD'));
        assert.ok(errorCodes(validatePortfolioControlPacket(nested, { now: NOW })).has('UNKNOWN_FIELD'));
    });

    test('fails closed on missing required fields and ambiguous action state', () => {
        const malformed = validPacket();
        delete malformed.scope.repositoryId;
        malformed.noAction = {
            reasonCode: 'operator-hold',
            summary: 'Explicit hold.',
            evidenceRefs: ['evidence:priority'],
            recheckAt: '2026-08-24T07:00:00.000Z',
        };

        const result = validatePortfolioControlPacket(malformed, { now: NOW });
        const codes = errorCodes(result);
        assert.equal(result.ok, false);
        assert.ok(codes.has('MISSING_FIELD'));
        assert.ok(codes.has('AMBIGUOUS_ACTION_STATE'));
    });

    test('rejects raw/private fields and secret-like detail in allowed summaries', () => {
        const raw = validPacket();
        raw.rawIssueBody = 'private issue content';
        const secret = validPacket();
        secret.nextAction.summary = `Use token ${['gh', 'p_123456789012345678901234567890123456'].join('')}`;

        assert.ok(errorCodes(validatePortfolioControlPacket(raw, { now: NOW })).has('UNAUTHORIZED_CONTEXT'));
        assert.ok(errorCodes(validatePortfolioControlPacket(secret, { now: NOW })).has('PRIVATE_DETAIL'));
    });

    test('rejects common credential and personal-detail forms without echoing them', () => {
        const unsafeValues = [
            'password=hunter2-long-value',
            'api_key: abcdefghijklmnopqrstuvwxyz',
            `AWS key ${['AK', 'IAABCDEFGHIJKLMNOP'].join('')}`,
            'contact private.person@example.com',
            `Slack ${['xo', 'xb-123456789012-abcdefghijklmnop'].join('')}`,
        ];

        for (const unsafeValue of unsafeValues) {
            const packet = validPacket();
            packet.nextAction.summary = unsafeValue;
            const result = validatePortfolioControlPacket(packet, { now: NOW });
            assert.ok(errorCodes(result).has('PRIVATE_DETAIL'));
            assert.equal(JSON.stringify(result).includes(unsafeValue), false);
        }
    });

    test('malformed cyclic input fails closed instead of throwing', () => {
        const packet = validPacket();
        packet.scope = packet;

        let result;
        assert.doesNotThrow(() => {
            result = validatePortfolioControlPacket(packet, { now: NOW });
        });
        assert.equal(result.ok, false);
        assert.ok(errorCodes(result).has('CYCLIC_INPUT'));

        let built;
        assert.doesNotThrow(() => {
            built = buildPortfolioControlPacket(packet, { now: NOW });
        });
        assert.equal(built.ok, false);
        assert.equal(JSON.stringify(built).includes('agent:overall-manager-01'), true);
    });

    test('allowlist builder never returns a secret scalar in an object-shaped field', () => {
        const input = validPacket();
        const unsafeValue = 'Bearer abcdefghijklmnopqrstuvwxyz012345';
        input.producer = unsafeValue;

        const result = buildPortfolioControlPacket(input, { now: NOW });

        assert.equal(result.ok, false);
        assert.equal(result.packet.producer, '[redacted]');
        assert.equal(JSON.stringify(result).includes(unsafeValue), false);
        assert.ok(errorCodes(result).has('REDACTION_REQUIRED'));
    });

    test('deep unknown provider input is rejected without recursive traversal or throw', () => {
        const packet = validPacket();
        let nested = { leaf: 'safe' };
        for (let index = 0; index < 20000; index += 1) {
            nested = { next: nested };
        }
        packet.providerPayload = nested;

        let result;
        assert.doesNotThrow(() => {
            result = validatePortfolioControlPacket(packet, { now: NOW });
        });
        assert.equal(result.ok, false);
        assert.ok(errorCodes(result).has('UNKNOWN_FIELD'));
    });

    test('throwing accessors fail closed without exposing provider exceptions', () => {
        const packet = validPacket();
        Object.defineProperty(packet, 'providerPayload', {
            enumerable: true,
            get() {
                throw new Error('private provider exception detail');
            },
        });

        let validated;
        let built;
        assert.doesNotThrow(() => {
            validated = validatePortfolioControlPacket(packet, { now: NOW });
            built = buildPortfolioControlPacket(packet, { now: NOW });
        });
        assert.equal(validated.ok, false);
        assert.ok(errorCodes(validated).has('MALFORMED_PACKET'));
        assert.equal(built.ok, false);
        assert.equal(built.packet, null);
        assert.equal(JSON.stringify({ validated, built }).includes('private provider exception detail'), false);
    });

    test('oversized packet collections fail closed and the builder truncates safely', () => {
        const packet = validPacket();
        packet.dependencies = Array.from({ length: 65 }, (_, index) => ({
            dependencyId: `issue:${300 + index}`,
            programId: packet.scope.programId,
            status: 'satisfied',
            evidenceRefs: ['evidence:dependency'],
        }));

        const validated = validatePortfolioControlPacket(packet, { now: NOW });
        const built = buildPortfolioControlPacket(packet, { now: NOW });

        assert.ok(errorCodes(validated).has('COLLECTION_TOO_LARGE'));
        assert.equal(built.ok, false);
        assert.equal(built.packet.dependencies.length, 64);
        assert.ok(built.redactions.some((entry) => entry.reason === 'collection-limit'));
    });

    test('allowlist builder drops unknown/private input and marks the result non-actionable', () => {
        const input = validPacket();
        input.rawIssueBody = 'must never enter the packet';
        input.nextAction.summary = 'Bearer abcdefghijklmnopqrstuvwxyz012345';

        const result = buildPortfolioControlPacket(input, { now: NOW });

        assert.equal(result.ok, false);
        assert.equal(Object.hasOwn(result.packet, 'rawIssueBody'), false);
        assert.equal(result.packet.nextAction.summary, '[redacted]');
        assert.deepEqual(
            result.redactions.map((entry) => entry.path),
            ['$.nextAction.summary', '$.rawIssueBody'],
        );
        assert.ok(errorCodes(result).has('REDACTION_REQUIRED'));
        assert.equal(JSON.stringify(result).includes('private issue content'), false);
        assert.equal(JSON.stringify(result).includes('abcdefghijklmnopqrstuvwxyz012345'), false);
    });

    test('allowlist builder preserves a clean packet and its deterministic identity', () => {
        const input = validPacket();
        const result = buildPortfolioControlPacket(input, { now: NOW });

        assert.equal(result.ok, true);
        assert.deepEqual(result.redactions, []);
        assert.equal(
            hashPortfolioControlPacket(result.packet),
            hashPortfolioControlPacket(input),
        );
    });

    test('validation and redaction diagnostics are deterministic across key order and locale', () => {
        const first = validPacket();
        first.zeta = true;
        first.alpha = true;
        const second = validPacket();
        second.alpha = true;
        second.zeta = true;

        assert.deepEqual(
            validatePortfolioControlPacket(first, { now: NOW }).errors,
            validatePortfolioControlPacket(second, { now: NOW }).errors,
        );

        const redacted = validPacket();
        redacted['äPrivate'] = true;
        redacted.zeta = true;
        redacted.alpha = true;
        assert.deepEqual(
            buildPortfolioControlPacket(redacted, { now: NOW }).redactions.map((entry) => entry.path),
            ['$.alpha', '$.zeta', '$.äPrivate'],
        );
    });
});

describe('Portfolio Control Packet v1 fail-closed semantics', () => {
    test('requires READY executable-leaf context to match the exact task host and lease', () => {
        const hold = validPacket();
        hold.disposition.status = 'hold';
        const grouping = validPacket();
        grouping.executionContext.classification = 'grouping';
        const taskDrift = validPacket();
        taskDrift.executionContext.taskId = 'issue:255';
        const hostDrift = validPacket();
        hostDrift.executionContext.hostId = 'host:windows-02';
        const leaseDrift = validPacket();
        leaseDrift.executionContext.leaseId = 'lease:issue-254:other';
        const unsuitable = validPacket();
        unsuitable.executionContext.hostSuitability = 'unknown';

        assert.ok(errorCodes(validatePortfolioControlPacket(hold, { now: NOW })).has('HOLD'));
        assert.ok(errorCodes(validatePortfolioControlPacket(grouping, { now: NOW })).has('NOT_EXECUTABLE_LEAF'));
        assert.ok(errorCodes(validatePortfolioControlPacket(taskDrift, { now: NOW })).has('IDENTITY_DRIFT'));
        assert.ok(errorCodes(validatePortfolioControlPacket(hostDrift, { now: NOW })).has('HOST_UNSUITABLE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(leaseDrift, { now: NOW })).has('IDENTITY_DRIFT'));
        assert.ok(errorCodes(validatePortfolioControlPacket(unsuitable, { now: NOW })).has('HOST_UNSUITABLE'));
    });

    test('keeps runtime identity and reason-code validation aligned with the schema', () => {
        const malformedDisposition = validPacket();
        malformedDisposition.disposition.reasonCode = 'Not Valid';
        const unstableReviewer = validPacket();
        unstableReviewer.gates[0].reviewerId = 'reviewer without namespace';

        assert.ok(errorCodes(validatePortfolioControlPacket(malformedDisposition, { now: NOW })).has('INVALID_CODE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(unstableReviewer, { now: NOW })).has('UNSTABLE_ID'));
    });

    test('requires blocker ownership link state and resume condition and fails closed on unknown state', () => {
        const missingOwner = validPacket();
        delete missingOwner.blocker.ownerId;
        const unsafeLink = validPacket();
        unsafeLink.blocker.canonicalLink = 'http://example.invalid/blocker';
        const unknown = validPacket();
        unknown.blocker.state = 'unknown';

        assert.equal(validatePortfolioControlPacket(missingOwner, { now: NOW }).ok, false);
        assert.ok(errorCodes(validatePortfolioControlPacket(unsafeLink, { now: NOW })).has('MALFORMED_EVIDENCE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(unknown, { now: NOW })).has('BLOCKED'));
    });

    test('enforces one executable overall and per host unless a fresh beneficial non-overlapping second lane is explicit', () => {
        const hiddenSecondLease = validPacket();
        hiddenSecondLease.leaseSnapshot.leases.push({
            leaseId: 'lease:issue-255:mac',
            resourceId: 'issue:255',
            actorId: 'agent:other-executor',
            hostId: 'host:mac-01',
            mode: 'exclusive',
            generation: 1,
            expiresAt: '2026-08-24T07:00:00.000Z',
            evidenceRef: 'evidence:lease',
        });
        const tooMany = validPacket();
        tooMany.executionCapacity.requestedOverall = 2;
        const wrongDefaults = validPacket();
        wrongDefaults.executionCapacity.defaultMaxOverall = 2;
        const sameHost = validPacket();
        sameHost.executionCapacity.requestedOverall = 2;
        sameHost.leaseSnapshot.leases.push({
            leaseId: 'lease:issue-255:windows',
            resourceId: 'issue:255',
            actorId: 'agent:other-executor',
            hostId: 'host:windows-01',
            mode: 'exclusive',
            generation: 1,
            expiresAt: '2026-08-24T07:00:00.000Z',
            evidenceRef: 'evidence:lease',
        });
        sameHost.executionCapacity.secondLane = {
            enabled: true,
            hostId: 'host:windows-01',
            delayReductionSummary: 'Reduces the critical-path wait by one review cycle.',
            nonOverlapEvidenceRefs: ['evidence:lease'],
        };
        const validSecondLane = clone(sameHost);
        validSecondLane.executionCapacity.secondLane.hostId = 'host:mac-01';
        validSecondLane.leaseSnapshot.leases[1].hostId = 'host:mac-01';
        validSecondLane.provenance.push({
            evidenceId: 'evidence:exact-non-overlap',
            sourceKind: 'verified-system-readback',
            stableId: 'collision-audit:issue-254-255',
            permalink: 'https://github.example.invalid/program/issues/254#non-overlap',
            observedAt: '2026-08-24T06:43:00.000Z',
            sha256: HASH_C,
            claimKind: 'exact-non-overlap',
        });
        validSecondLane.executionCapacity.secondLane.nonOverlapEvidenceRefs = ['evidence:exact-non-overlap'];
        const mislabeledSecondLane = clone(validSecondLane);
        mislabeledSecondLane.executionCapacity.secondLane.hostId = mislabeledSecondLane.executionContext.hostId;

        assert.ok(errorCodes(validatePortfolioControlPacket(hiddenSecondLease, { now: NOW })).has('CAPACITY_POLICY'));
        assert.ok(errorCodes(validatePortfolioControlPacket(tooMany, { now: NOW })).has('CAPACITY_POLICY'));
        assert.ok(errorCodes(validatePortfolioControlPacket(wrongDefaults, { now: NOW })).has('CAPACITY_POLICY'));
        assert.ok(errorCodes(validatePortfolioControlPacket(sameHost, { now: NOW })).has('HOST_CAPACITY'));
        assert.ok(errorCodes(validatePortfolioControlPacket(mislabeledSecondLane, { now: NOW })).has('CAPACITY_POLICY'));
        assert.equal(validatePortfolioControlPacket(validSecondLane, { now: NOW }).ok, true);
    });

    test('treats memory prompts and reminders as data that can never grant authority or leases', () => {
        const reminderAuthority = validPacket();
        reminderAuthority.contextInputs[0] = {
            inputId: 'context:reminder-01',
            kind: 'reminder',
            authority: 'lease',
            summary: 'Start work now.',
            evidenceRefs: ['evidence:priority'],
        };
        const promptLease = validPacket();
        promptLease.leaseSnapshot.leases[0].evidenceRef = 'context:prompt-01';

        assert.ok(errorCodes(validatePortfolioControlPacket(reminderAuthority, { now: NOW })).has('UNAUTHORIZED_CONTEXT'));
        assert.ok(errorCodes(validatePortfolioControlPacket(promptLease, { now: NOW })).has('MISSING_EVIDENCE'));
    });

    test('rejects expired packets, future observations, and stale evidence', () => {
        const expired = validPacket();
        expired.expiresAt = '2026-08-24T06:45:00.000Z';
        const future = validPacket();
        future.provenance[0].observedAt = '2026-08-24T06:50:00.000Z';
        const stale = validPacket();
        stale.provenance[0].observedAt = '2026-08-24T05:00:00.000Z';

        assert.ok(errorCodes(validatePortfolioControlPacket(expired, { now: NOW })).has('STALE_PACKET'));
        assert.ok(errorCodes(validatePortfolioControlPacket(future, { now: NOW })).has('CLOCK_CONFLICT'));
        assert.ok(errorCodes(validatePortfolioControlPacket(stale, { now: NOW })).has('STALE_EVIDENCE'));
    });

    test('rejects an unauthorized producer, policy drift, and disabled action output', () => {
        const producer = validPacket();
        producer.producer.role = 'programming-lead';
        const policy = validPacket();
        policy.producer.policyVersion = 'devlead.overall-manager-authority/v0';
        const disabled = validPacket();
        disabled.producer.mode = 'disabled';

        assert.ok(errorCodes(validatePortfolioControlPacket(producer, { now: NOW })).has('UNAUTHORIZED_PRODUCER'));
        assert.ok(errorCodes(validatePortfolioControlPacket(policy, { now: NOW })).has('IDENTITY_DRIFT'));
        assert.ok(errorCodes(validatePortfolioControlPacket(disabled, { now: NOW })).has('AUTHORITY_DISABLED'));
    });

    test('rejects cross-program or dispatch-shaped actions', () => {
        const crossProgram = validPacket();
        crossProgram.nextAction.programId = 'program:other';
        const crossRepository = validPacket();
        crossRepository.nextAction.repositoryId = 'repo:other/project';
        const dispatch = validPacket();
        dispatch.nextAction.kind = 'dispatch-executor';

        assert.ok(errorCodes(validatePortfolioControlPacket(crossProgram, { now: NOW })).has('CROSS_PROGRAM'));
        assert.ok(errorCodes(validatePortfolioControlPacket(crossRepository, { now: NOW })).has('CROSS_PROGRAM'));
        assert.ok(errorCodes(validatePortfolioControlPacket(dispatch, { now: NOW })).has('UNAUTHORIZED_ACTION'));
    });

    test('rejects over-budget, over-capacity, negative, or non-finite allocations', () => {
        const budget = validPacket();
        budget.budget.requested = 26;
        const capacity = validPacket();
        capacity.capacity.requested = 2;
        const negative = validPacket();
        negative.budget.available = -1;
        const infinite = validPacket();
        infinite.capacity.available = Number.POSITIVE_INFINITY;

        assert.ok(errorCodes(validatePortfolioControlPacket(budget, { now: NOW })).has('OVER_BUDGET'));
        assert.ok(errorCodes(validatePortfolioControlPacket(capacity, { now: NOW })).has('OVER_CAPACITY'));
        assert.ok(errorCodes(validatePortfolioControlPacket(negative, { now: NOW })).has('INVALID_ALLOCATION'));
        assert.ok(errorCodes(validatePortfolioControlPacket(infinite, { now: NOW })).has('INVALID_TYPE'));
    });

    test('rejects unresolved dependencies, active/unknown blockers, and collisions', () => {
        const dependency = validPacket();
        dependency.dependencies[0].status = 'blocked';
        const blocker = validPacket();
        blocker.blocker.classification = 'unknown-conflicting';
        blocker.blocker.reasonCode = 'ledger-drift';
        const collision = validPacket();
        collision.collisionSnapshot.conflicts.push({
            conflictId: 'conflict:worktree-01',
            resourceId: 'issue:254',
            summary: 'A competing write lease exists.',
            evidenceRefs: ['evidence:lease'],
        });

        assert.ok(errorCodes(validatePortfolioControlPacket(dependency, { now: NOW })).has('DEPENDENCY_BLOCKED'));
        assert.ok(errorCodes(validatePortfolioControlPacket(blocker, { now: NOW })).has('BLOCKED'));
        assert.ok(errorCodes(validatePortfolioControlPacket(collision, { now: NOW })).has('COLLISION_DETECTED'));
    });

    test('requires every independent gate exactly once and forbids self-review', () => {
        const missing = validPacket();
        missing.gates = missing.gates.filter((entry) => entry.kind !== 'security');
        const hold = validPacket();
        hold.gates.find((entry) => entry.kind === 'qa').status = 'hold';
        const duplicate = validPacket();
        duplicate.gates.push(clone(duplicate.gates[0]));
        const selfReview = validPacket();
        selfReview.gates[0].reviewerId = selfReview.producer.actorId;
        const sharedReviewer = validPacket();
        sharedReviewer.gates[1].reviewerId = sharedReviewer.gates[0].reviewerId;

        assert.ok(errorCodes(validatePortfolioControlPacket(missing, { now: NOW })).has('MISSING_GATE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(hold, { now: NOW })).has('GATE_NOT_PASS'));
        assert.ok(errorCodes(validatePortfolioControlPacket(duplicate, { now: NOW })).has('DUPLICATE_GATE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(selfReview, { now: NOW })).has('SELF_REVIEW'));
        assert.ok(errorCodes(validatePortfolioControlPacket(sharedReviewer, { now: NOW })).has('DUPLICATE_REVIEWER'));
    });

    test('requires unique, fresh provenance for every evidence reference', () => {
        const missingRef = validPacket();
        missingRef.nextAction.evidenceRefs.push('evidence:missing');
        const duplicate = validPacket();
        duplicate.provenance.push(clone(duplicate.provenance[0]));
        const malformed = validPacket();
        malformed.provenance[0].sha256 = 'not-a-hash';
        const conflictingIdentity = validPacket();
        conflictingIdentity.provenance[1].stableId = conflictingIdentity.provenance[0].stableId;

        assert.ok(errorCodes(validatePortfolioControlPacket(missingRef, { now: NOW })).has('MISSING_EVIDENCE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(duplicate, { now: NOW })).has('DUPLICATE_EVIDENCE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(malformed, { now: NOW })).has('MALFORMED_EVIDENCE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(conflictingIdentity, { now: NOW })).has('DUPLICATE_EVIDENCE'));
    });

    test('rejects duplicate, stale, or conflicting exclusive leases', () => {
        const duplicateId = validPacket();
        duplicateId.leaseSnapshot.leases.push(clone(duplicateId.leaseSnapshot.leases[0]));
        const stale = validPacket();
        stale.leaseSnapshot.leases[0].expiresAt = '2026-08-24T06:45:00.000Z';
        const conflicting = validPacket();
        const second = clone(conflicting.leaseSnapshot.leases[0]);
        second.leaseId = 'lease:issue-254:other';
        second.actorId = 'agent:other-executor';
        conflicting.leaseSnapshot.leases.push(second);

        assert.ok(errorCodes(validatePortfolioControlPacket(duplicateId, { now: NOW })).has('DUPLICATE_LEASE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(stale, { now: NOW })).has('STALE_LEASE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(conflicting, { now: NOW })).has('DUPLICATE_LEASE'));
    });

    test('rejects cross-program dependencies and identity fields without stable namespaces', () => {
        const dependency = validPacket();
        dependency.dependencies[0].programId = 'program:other';
        const unstable = validPacket();
        unstable.packetId = 'plain text identifier';

        assert.ok(errorCodes(validatePortfolioControlPacket(dependency, { now: NOW })).has('CROSS_PROGRAM'));
        assert.ok(errorCodes(validatePortfolioControlPacket(unstable, { now: NOW })).has('UNSTABLE_ID'));
    });

    test('compares live expected identity and authority generation without provider coupling', () => {
        const packet = validPacket();
        const result = validatePortfolioControlPacket(packet, {
            now: NOW,
            expected: {
                portfolioId: packet.scope.portfolioId,
                programId: packet.scope.programId,
                repositoryId: 'repo:other/project',
                canonicalRootId: packet.scope.canonicalRootId,
                authorityGeneration: packet.producer.authorityGeneration + 1,
            },
        });

        assert.equal(result.ok, false);
        assert.equal(
            result.errors.filter((error) => error.code === 'IDENTITY_DRIFT').length,
            2,
        );
    });

    test('no-action can truthfully carry blocked, held, and collision evidence', () => {
        const packet = noActionPacket('waiting-external');
        packet.dependencies[0].status = 'blocked';
        packet.blocker.classification = 'waiting-external';
        packet.blocker.reasonCode = 'human-gate';
        packet.gates.find((entry) => entry.kind === 'qa').status = 'hold';
        packet.collisionSnapshot.conflicts.push({
            conflictId: 'conflict:existing-lease',
            resourceId: 'issue:254',
            summary: 'Existing work is preserved.',
            evidenceRefs: ['evidence:lease'],
        });

        const result = validatePortfolioControlPacket(packet, { now: NOW });
        assert.equal(result.ok, true);
        assert.equal(result.state, 'no-action');
        assert.equal(result.action, null);
    });

    test('rejects duplicate dependency IDs and evidence references', () => {
        const dependencies = validPacket();
        dependencies.dependencies.push(clone(dependencies.dependencies[0]));
        const references = validPacket();
        references.priority.evidenceRefs.push(references.priority.evidenceRefs[0]);
        const conflicts = noActionPacket('collision');
        conflicts.collisionSnapshot.conflicts = [
            {
                conflictId: 'conflict:same',
                resourceId: 'issue:254',
                summary: 'First conflict.',
                evidenceRefs: ['evidence:lease'],
            },
            {
                conflictId: 'conflict:same',
                resourceId: 'issue:other',
                summary: 'Second conflict.',
                evidenceRefs: ['evidence:lease'],
            },
        ];

        assert.ok(errorCodes(validatePortfolioControlPacket(dependencies, { now: NOW })).has('DUPLICATE_ID'));
        assert.ok(errorCodes(validatePortfolioControlPacket(references, { now: NOW })).has('DUPLICATE_REFERENCE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(conflicts, { now: NOW })).has('DUPLICATE_ID'));
    });

    test('enforces schema-aligned safe text, codes, and allocation units', () => {
        const multiline = validPacket();
        multiline.nextAction.summary = 'line one\nline two';
        const overlong = validPacket();
        overlong.priority.rationale = 'x'.repeat(241);
        const reason = noActionPacket('Not Valid');
        const unit = validPacket();
        unit.budget.unit = 'US Dollars';

        assert.ok(errorCodes(validatePortfolioControlPacket(multiline, { now: NOW })).has('INVALID_TEXT'));
        assert.ok(errorCodes(validatePortfolioControlPacket(overlong, { now: NOW })).has('INVALID_TEXT'));
        assert.ok(errorCodes(validatePortfolioControlPacket(reason, { now: NOW })).has('INVALID_CODE'));
        assert.ok(errorCodes(validatePortfolioControlPacket(unit, { now: NOW })).has('INVALID_CODE'));
    });

    test('rejects impossible timestamps and credential-bearing evidence URLs', () => {
        const timestamp = validPacket();
        timestamp.generatedAt = '2026-02-30T06:44:45.000Z';
        const permalink = validPacket();
        permalink.provenance[0].permalink = 'https://token@example.invalid/evidence';

        assert.ok(errorCodes(validatePortfolioControlPacket(timestamp, { now: NOW })).has('INVALID_TIMESTAMP'));
        assert.ok(errorCodes(validatePortfolioControlPacket(permalink, { now: NOW })).has('MALFORMED_EVIDENCE'));
    });

    test('validates optional blocker recheck time with the same freshness rules', () => {
        const malformed = noActionPacket('waiting-external');
        malformed.blocker.classification = 'waiting-external';
        malformed.blocker.reasonCode = 'external-owner';
        malformed.blocker.recheckAt = 'not-a-date';
        const stale = clone(malformed);
        stale.blocker.recheckAt = '2026-08-24T06:44:00.000Z';

        assert.ok(errorCodes(validatePortfolioControlPacket(malformed, { now: NOW })).has('INVALID_TIMESTAMP'));
        assert.ok(errorCodes(validatePortfolioControlPacket(stale, { now: NOW })).has('STALE_BLOCKER'));
    });
});

describe('Portfolio Control Packet v1 JSON Schema', () => {
    test('compiles with Ajv and exposes only the closed packet properties', () => {
        const schema = JSON.parse(readFileSync(join(
            __dirname,
            '..',
            'schemas',
            'portfolio-control-packet-v1.schema.json',
        ), 'utf8'));
        const ajv = new Ajv2020({ strict: true, strictRequired: false });
        addFormats(ajv);

        assert.doesNotThrow(() => ajv.compile(schema));
        assert.deepEqual(Object.keys(schema.properties).sort(), [
            'blocker',
            'budget',
            'capacity',
            'collisionSnapshot',
            'contextInputs',
            'dependencies',
            'disposition',
            'executionCapacity',
            'executionContext',
            'expiresAt',
            'gates',
            'generatedAt',
            'leaseSnapshot',
            'nextAction',
            'noAction',
            'packetId',
            'priority',
            'producer',
            'provenance',
            'schemaVersion',
            'scope',
        ]);
    });

    test('matches module versions and closes every object boundary', () => {
        const schemaPath = join(
            __dirname,
            '..',
            'schemas',
            'portfolio-control-packet-v1.schema.json',
        );
        const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

        assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
        assert.equal(schema.properties.schemaVersion.const, PORTFOLIO_PACKET_VERSION);
        assert.deepEqual(
            schema.$defs.producer.properties.mode.enum,
            AUTHORITY_LIFECYCLE.states,
        );
        assert.deepEqual(schema.oneOf, [
            { required: ['nextAction'], not: { required: ['noAction'] } },
            { required: ['noAction'], not: { required: ['nextAction'] } },
        ]);
        assert.equal(schema.properties.dependencies.maxItems, 64);
        assert.equal(schema.properties.provenance.maxItems, 128);
        assert.equal(schema.$defs.leaseSnapshot.properties.leases.maxItems, 32);
        assert.equal(schema.$defs.collisionSnapshot.properties.conflicts.maxItems, 32);
        assert.equal(schema.$defs.evidenceRefs.maxItems, 32);

        const openObjects = [];
        visitSchema(schema, '$', (node, path) => {
            if (node.type === 'object' && node.additionalProperties !== false) {
                openObjects.push(path);
            }
        });
        assert.deepEqual(openObjects, []);
        assert.equal(
            JSON.stringify(schema).match(/rawIssueBody|secretToken|providerPayload/g),
            null,
        );
    });
});

function visitSchema(node, path, visitor) {
    if (!node || typeof node !== 'object') return;
    visitor(node, path);
    if (Array.isArray(node)) {
        node.forEach((entry, index) => visitSchema(entry, `${path}[${index}]`, visitor));
        return;
    }
    Object.entries(node).forEach(([key, value]) => {
        visitSchema(value, `${path}.${key}`, visitor);
    });
}
