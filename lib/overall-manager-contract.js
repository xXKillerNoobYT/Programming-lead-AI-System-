'use strict';

/**
 * Issue #254: provider-neutral Overall Manager authority and Portfolio Control
 * Packet v1. This module is intentionally pure. It can validate, redact,
 * canonicalize, and hash packet data, but it has no provider, network,
 * filesystem, process, scheduler, dispatch, or canonical-state mutation API.
 */

const { createHash } = require('node:crypto');

const AUTHORITY_CONTRACT_VERSION = 'devlead.overall-manager-authority/v1';
const PORTFOLIO_PACKET_VERSION = 'devlead.portfolio-control-packet/v1';

const ROLE_AUTHORITY = Object.freeze({
    owner: Object.freeze({
        approvesPolicy: true,
        answersSubjectiveDesign: true,
        mayDelegate: true,
    }),
    layer0: Object.freeze({
        isOwnerInterface: true,
        expandsAuthority: false,
        dispatches: false,
    }),
    devManager: Object.freeze({
        coordinatesPrograms: true,
        consolidatesEvidence: true,
        maySelfApprove: false,
    }),
    overallManager: Object.freeze({
        allocatesPortfolioPriorityCapacityBudget: true,
        ordersProgramWork: false,
        dispatches: false,
    }),
    programmingLead: Object.freeze({
        ownsOneProgramGraph: true,
        ordersProgramWork: true,
        dispatchesWithinExactLease: true,
    }),
    reviewer: Object.freeze({
        independent: true,
        maySelfWaive: false,
        dispatches: false,
    }),
    support: Object.freeze({
        readOnlyByDefault: true,
        mayMutateCanonicalState: false,
        dispatches: false,
    }),
    executor: Object.freeze({
        requiresExactLease: true,
        expandsScope: false,
        maySelfApprove: false,
    }),
});

const AUTHORITY_LIFECYCLE = Object.freeze({
    initial: 'disabled',
    states: Object.freeze([
        'disabled',
        'read-only',
        'propose',
        'manual-approval',
        'bounded-automatic',
        'superseded',
    ]),
    terminal: 'superseded',
    disableIsFailClosed: true,
    producesPacketsOnly: true,
    transitions: Object.freeze({
        disabled: Object.freeze(['read-only', 'superseded']),
        'read-only': Object.freeze(['propose', 'disabled', 'superseded']),
        propose: Object.freeze(['manual-approval', 'read-only', 'disabled', 'superseded']),
        'manual-approval': Object.freeze([
            'bounded-automatic',
            'propose',
            'read-only',
            'disabled',
            'superseded',
        ]),
        'bounded-automatic': Object.freeze([
            'manual-approval',
            'read-only',
            'disabled',
            'superseded',
        ]),
        superseded: Object.freeze([]),
    }),
    rollback: Object.freeze({
        target: 'disabled',
        incrementAuthorityGeneration: true,
        invalidateOutstandingPackets: true,
        preserveCanonicalEvidence: true,
    }),
});

const MAX_PACKET_LIFETIME_MS = 30 * 60 * 1000;
const MAX_EVIDENCE_AGE_MS = 15 * 60 * 1000;
const MAX_CANONICAL_DEPTH = 64;
const REQUIRED_GATES = Object.freeze(['spec', 'qa', 'security', 'reviewer']);
const ALLOWED_ACTIONS = Object.freeze([
    'recommend-program-priority',
    'recommend-capacity-budget',
    'surface-cross-program-dependency',
    'escalate-canonical-blocker',
]);

const OVERALL_MANAGER_AUTHORITY = Object.freeze({
    may: Object.freeze([
        'summarize-portfolios',
        'recommend-portfolio-priority',
        'recommend-capacity-and-budget',
        'surface-cross-program-dependencies',
        'escalate-canonical-blockers',
    ]),
    mustNot: Object.freeze([
        'order-program-local-work',
        'dispatch-execution',
        'waive-independent-gates',
        'mutate-project-or-issue-state',
        'consume-raw-private-program-context',
    ]),
});

const SHAPES = Object.freeze({
    packet: shape(
        [
            'schemaVersion',
            'packetId',
            'generatedAt',
            'expiresAt',
            'producer',
            'scope',
            'disposition',
            'executionContext',
            'executionCapacity',
            'priority',
            'capacity',
            'budget',
            'dependencies',
            'blocker',
            'gates',
            'provenance',
            'contextInputs',
            'leaseSnapshot',
            'collisionSnapshot',
        ],
        {
            schemaVersion: primitive('string'),
            packetId: primitive('string'),
            generatedAt: primitive('string'),
            expiresAt: primitive('string'),
            producer: objectOf('producer'),
            scope: objectOf('scope'),
            disposition: objectOf('disposition'),
            executionContext: objectOf('executionContext'),
            executionCapacity: objectOf('executionCapacity'),
            priority: objectOf('priority'),
            capacity: objectOf('capacity'),
            budget: objectOf('budget'),
            dependencies: arrayOf('dependency', 64),
            blocker: objectOf('blocker'),
            gates: arrayOf('gate', 4),
            provenance: arrayOf('evidence', 128),
            contextInputs: arrayOf('contextInput', 32),
            leaseSnapshot: objectOf('leaseSnapshot'),
            collisionSnapshot: objectOf('collisionSnapshot'),
            nextAction: objectOf('nextAction'),
            noAction: objectOf('noAction'),
        },
    ),
    producer: shape(
        ['role', 'actorId', 'authorityGeneration', 'policyVersion', 'mode'],
        {
            role: primitive('string'),
            actorId: primitive('string'),
            authorityGeneration: primitive('integer'),
            policyVersion: primitive('string'),
            mode: primitive('string'),
        },
    ),
    scope: shape(
        ['portfolioId', 'programId', 'repositoryId', 'canonicalRootId'],
        {
            portfolioId: primitive('string'),
            programId: primitive('string'),
            repositoryId: primitive('string'),
            canonicalRootId: primitive('string'),
        },
    ),
    disposition: shape(['status', 'reasonCode', 'evidenceRefs'], {
        status: primitive('string'),
        reasonCode: primitive('string'),
        evidenceRefs: arrayOfPrimitive('string'),
    }),
    executionContext: shape(
        [
            'classification',
            'activeParentId',
            'taskId',
            'hostId',
            'leaseId',
            'hostSuitability',
            'evidenceRefs',
        ],
        {
            classification: primitive('string'),
            activeParentId: primitive('string'),
            taskId: primitive('string'),
            hostId: primitive('string'),
            leaseId: primitive('string'),
            hostSuitability: primitive('string'),
            evidenceRefs: arrayOfPrimitive('string'),
        },
    ),
    executionCapacity: shape(
        ['requestedOverall', 'defaultMaxOverall', 'maxPerHost', 'secondLane'],
        {
            requestedOverall: primitive('integer'),
            defaultMaxOverall: primitive('integer'),
            maxPerHost: primitive('integer'),
            secondLane: objectOf('secondLane'),
        },
    ),
    secondLane: shape(['enabled', 'nonOverlapEvidenceRefs'], {
        enabled: primitive('boolean'),
        hostId: primitive('string'),
        delayReductionSummary: primitive('string'),
        nonOverlapEvidenceRefs: arrayOfPrimitive('string'),
    }),
    priority: shape(['rank', 'rationale', 'evidenceRefs'], {
        rank: primitive('integer'),
        rationale: primitive('string'),
        evidenceRefs: arrayOfPrimitive('string'),
    }),
    capacity: shape(['unit', 'available', 'requested'], {
        unit: primitive('string'),
        available: primitive('number'),
        requested: primitive('number'),
    }),
    budget: shape(['unit', 'available', 'requested'], {
        unit: primitive('string'),
        available: primitive('number'),
        requested: primitive('number'),
    }),
    dependency: shape(
        ['dependencyId', 'programId', 'status', 'evidenceRefs'],
        {
            dependencyId: primitive('string'),
            programId: primitive('string'),
            status: primitive('string'),
            evidenceRefs: arrayOfPrimitive('string'),
        },
    ),
    blocker: shape(
        [
            'classification',
            'reasonCode',
            'summary',
            'ownerId',
            'canonicalLink',
            'state',
            'resumeCondition',
            'evidenceRefs',
        ],
        {
        classification: primitive('string'),
        reasonCode: primitive('string'),
        summary: primitive('string'),
        ownerId: primitive('string'),
        canonicalLink: primitive('string'),
        state: primitive('string'),
        resumeCondition: primitive('string'),
        evidenceRefs: arrayOfPrimitive('string'),
        recheckAt: primitive('string'),
        },
    ),
    gate: shape(['kind', 'status', 'reviewerId', 'observedAt', 'evidenceRef'], {
        kind: primitive('string'),
        status: primitive('string'),
        reviewerId: primitive('string'),
        observedAt: primitive('string'),
        evidenceRef: primitive('string'),
    }),
    evidence: shape(
        ['evidenceId', 'sourceKind', 'stableId', 'permalink', 'observedAt', 'sha256'],
        {
            evidenceId: primitive('string'),
            sourceKind: primitive('string'),
            stableId: primitive('string'),
            permalink: primitive('string'),
            observedAt: primitive('string'),
            sha256: primitive('string'),
            claimKind: primitive('string'),
        },
    ),
    contextInput: shape(
        ['inputId', 'kind', 'authority', 'summary', 'evidenceRefs'],
        {
            inputId: primitive('string'),
            kind: primitive('string'),
            authority: primitive('string'),
            summary: primitive('string'),
            evidenceRefs: arrayOfPrimitive('string'),
        },
    ),
    leaseSnapshot: shape(['observedAt', 'snapshotHash', 'leases'], {
        observedAt: primitive('string'),
        snapshotHash: primitive('string'),
        leases: arrayOf('lease', 32),
    }),
    lease: shape(
        [
            'leaseId',
            'resourceId',
            'actorId',
            'hostId',
            'mode',
            'generation',
            'expiresAt',
            'evidenceRef',
        ],
        {
            leaseId: primitive('string'),
            resourceId: primitive('string'),
            actorId: primitive('string'),
            hostId: primitive('string'),
            mode: primitive('string'),
            generation: primitive('integer'),
            expiresAt: primitive('string'),
            evidenceRef: primitive('string'),
        },
    ),
    collisionSnapshot: shape(['observedAt', 'snapshotHash', 'conflicts'], {
        observedAt: primitive('string'),
        snapshotHash: primitive('string'),
        conflicts: arrayOf('conflict', 32),
    }),
    conflict: shape(['conflictId', 'resourceId', 'summary', 'evidenceRefs'], {
        conflictId: primitive('string'),
        resourceId: primitive('string'),
        summary: primitive('string'),
        evidenceRefs: arrayOfPrimitive('string'),
    }),
    nextAction: shape(
        [
            'kind',
            'actionId',
            'programId',
            'repositoryId',
            'programmingLeadId',
            'targetId',
            'summary',
            'evidenceRefs',
        ],
        {
            kind: primitive('string'),
            actionId: primitive('string'),
            programId: primitive('string'),
            repositoryId: primitive('string'),
            programmingLeadId: primitive('string'),
            targetId: primitive('string'),
            summary: primitive('string'),
            evidenceRefs: arrayOfPrimitive('string'),
        },
    ),
    noAction: shape(['reasonCode', 'summary', 'evidenceRefs', 'recheckAt'], {
        reasonCode: primitive('string'),
        summary: primitive('string'),
        evidenceRefs: arrayOfPrimitive('string'),
        recheckAt: primitive('string'),
    }),
});

function shape(required, properties) {
    return Object.freeze({ required: Object.freeze(required), properties: Object.freeze(properties) });
}

function primitive(type) {
    return Object.freeze({ type });
}

function objectOf(shapeName) {
    return Object.freeze({ type: 'object', shape: shapeName });
}

function arrayOf(shapeName, maxItems = 128) {
    return Object.freeze({ type: 'array', shape: shapeName, maxItems });
}

function arrayOfPrimitive(type, maxItems = 32) {
    return Object.freeze({ type: 'array', itemType: type, maxItems });
}

/**
 * Validate a packet against the closed shape and all cross-field safety rules.
 * `options.expected` is a fresh provider-neutral identity readback; a mismatch
 * is identity drift. No error message includes rejected field values.
 */
function validatePortfolioControlPacket(packet, options) {
    try {
        return validatePortfolioControlPacketUnsafe(packet, options);
    } catch {
        return {
            ok: false,
            errors: [
                validationError(
                    'MALFORMED_PACKET',
                    '$',
                    'packet could not be read safely',
                ),
            ],
            state: 'no-action',
            action: null,
        };
    }
}

function validatePortfolioControlPacketUnsafe(packet, options) {
    const errors = [];

    if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
        errors.push(validationError('MALFORMED_PACKET', '$', 'packet must be an object'));
    } else {
        validateClosedShape(packet, 'packet', '$', errors, new WeakSet());

        if (packet.schemaVersion !== PORTFOLIO_PACKET_VERSION) {
            errors.push(
                validationError(
                    'UNSUPPORTED_SCHEMA',
                    '$.schemaVersion',
                    `expected ${PORTFOLIO_PACKET_VERSION}`,
                ),
            );
        }

        const stateCount = Number(Object.hasOwn(packet, 'nextAction'))
            + Number(Object.hasOwn(packet, 'noAction'));
        if (stateCount !== 1) {
            errors.push(
                validationError(
                    'AMBIGUOUS_ACTION_STATE',
                    '$',
                    'exactly one of nextAction or noAction is required',
                ),
            );
        }

        inspectPrivateDetail(packet, '$', errors, 'packet');
        validateSemantics(packet, options || {}, errors);
    }

    sortDiagnostics(errors);
    const ok = errors.length === 0;
    const state = packet && Object.hasOwn(packet, 'nextAction')
        ? 'next-action'
        : 'no-action';
    return {
        ok,
        errors,
        state,
        action: ok && state === 'next-action' ? canonicalValue(packet.nextAction) : null,
    };
}

function sortDiagnostics(entries) {
    entries.sort((left, right) => {
        const leftKey = `${left.path}\u0000${left.code || ''}\u0000${left.message || ''}`;
        const rightKey = `${right.path}\u0000${right.code || ''}\u0000${right.message || ''}`;
        return compareCodeUnits(leftKey, rightKey);
    });
}

function validateClosedShape(value, shapeName, path, errors, seen) {
    const descriptor = SHAPES[shapeName];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push(validationError('INVALID_TYPE', path, 'expected object'));
        return;
    }
    if (seen.has(value)) {
        errors.push(validationError('CYCLIC_INPUT', path, 'cyclic or aliased object input is not permitted'));
        return;
    }
    seen.add(value);

    for (const key of descriptor.required) {
        if (!Object.hasOwn(value, key)) {
            errors.push(validationError('MISSING_FIELD', `${path}.${key}`, 'required field is missing'));
        }
    }

    for (const [key, entry] of Object.entries(value)) {
        const childPath = `${path}.${key}`;
        const property = descriptor.properties[key];
        if (!property) {
            const privateField = isPrivateFieldName(key);
            errors.push(
                validationError(
                    privateField ? 'UNAUTHORIZED_CONTEXT' : 'UNKNOWN_FIELD',
                    childPath,
                    privateField
                        ? 'private or raw context is not permitted'
                        : 'field is not allowlisted',
                ),
            );
            continue;
        }
        validateProperty(entry, property, childPath, errors, seen);
    }
}

function validateProperty(value, descriptor, path, errors, seen) {
    if (descriptor.type === 'object') {
        validateClosedShape(value, descriptor.shape, path, errors, seen);
        return;
    }
    if (descriptor.type === 'array') {
        if (!Array.isArray(value)) {
            errors.push(validationError('INVALID_TYPE', path, 'expected array'));
            return;
        }
        if (value.length > descriptor.maxItems) {
            errors.push(
                validationError(
                    'COLLECTION_TOO_LARGE',
                    path,
                    `collection exceeds ${descriptor.maxItems} entries`,
                ),
            );
        }
        value.slice(0, descriptor.maxItems).forEach((entry, index) => {
            const itemPath = `${path}[${index}]`;
            if (descriptor.shape) {
                validateClosedShape(entry, descriptor.shape, itemPath, errors, seen);
            } else if (!matchesType(entry, descriptor.itemType)) {
                errors.push(validationError('INVALID_TYPE', itemPath, `expected ${descriptor.itemType}`));
            }
        });
        return;
    }
    if (!matchesType(value, descriptor.type)) {
        errors.push(validationError('INVALID_TYPE', path, `expected ${descriptor.type}`));
    }
}

function matchesType(value, type) {
    if (type === 'integer') return Number.isInteger(value);
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
    return typeof value === type;
}

function isPrivateFieldName(key) {
    return /(?:raw|body|content|token|secret|credential|customer|private|prompt|sourceCode|filePath)/i.test(key);
}

const PRIVATE_DETAIL_PATTERNS = Object.freeze([
    /\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}\b/i,
    /\bbearer\s+[A-Za-z0-9._~+/=-]{12,}\b/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
    /\b(?:password|passwd|api[_-]?key|access[_-]?token)\s*[:=]\s*\S+/i,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/i,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /\b[A-Za-z]:\\Users\\/i,
    /\/(?:Users|home)\/[^\s/]+\//i,
]);

function inspectPrivateDetail(value, path, errors, shapeName) {
    const seen = new WeakSet();
    const stack = [{ value, path, descriptor: objectOf(shapeName) }];

    while (stack.length > 0) {
        const current = stack.pop();
        const entry = current.value;
        const descriptor = current.descriptor;

        if (typeof entry === 'string') {
            if (PRIVATE_DETAIL_PATTERNS.some((pattern) => pattern.test(entry))) {
                errors.push(
                    validationError(
                        'PRIVATE_DETAIL',
                        current.path,
                        'secret-like or host-private detail is not permitted',
                    ),
                );
            }
            continue;
        }

        if (descriptor.type === 'object') {
            if (!isRecord(entry) || seen.has(entry)) continue;
            seen.add(entry);
            const shapeDescriptor = SHAPES[descriptor.shape];
            for (const [key, child] of Object.entries(entry)) {
                const childDescriptor = shapeDescriptor.properties[key];
                if (!childDescriptor) continue;
                stack.push({
                    value: child,
                    path: `${current.path}.${key}`,
                    descriptor: childDescriptor,
                });
            }
            continue;
        }

        if (descriptor.type === 'array') {
            if (!Array.isArray(entry) || seen.has(entry)) continue;
            seen.add(entry);
            const limit = Math.min(entry.length, descriptor.maxItems);
            for (let index = 0; index < limit; index += 1) {
                stack.push({
                    value: entry[index],
                    path: `${current.path}[${index}]`,
                    descriptor: descriptor.shape
                        ? objectOf(descriptor.shape)
                        : primitive(descriptor.itemType),
                });
            }
        }
    }
}

function validateSemantics(packet, options, errors) {
    const nowInput = Object.hasOwn(options, 'now') ? options.now : new Date().toISOString();
    const nowMs = timestampValue(nowInput, '$options.now', errors);
    const generatedAtMs = timestampValue(packet.generatedAt, '$.generatedAt', errors);
    const expiresAtMs = timestampValue(packet.expiresAt, '$.expiresAt', errors);

    validatePacketWindow(generatedAtMs, expiresAtMs, nowMs, errors);
    validateProducer(packet.producer, errors);
    validateExpectedIdentity(packet, options.expected, errors);
    validateStableIdentities(packet, errors);
    validateAllocations(packet, errors);
    validateSafeTextAndCodes(packet, errors);
    validateActionState(packet, nowMs, errors);
    validateExecutionPolicy(packet, errors);
    validateDependenciesAndBlocker(packet, errors);
    validateGates(packet, generatedAtMs, nowMs, errors);
    const evidenceIds = validateProvenance(packet, generatedAtMs, nowMs, errors);
    validateLeases(packet, generatedAtMs, nowMs, errors);
    validateCollisions(packet, generatedAtMs, nowMs, errors);
    validateEvidenceReferences(packet, evidenceIds, errors);
}

function validatePacketWindow(generatedAtMs, expiresAtMs, nowMs, errors) {
    if (generatedAtMs === null || expiresAtMs === null || nowMs === null) return;
    if (generatedAtMs > nowMs) {
        errors.push(validationError('CLOCK_CONFLICT', '$.generatedAt', 'packet is from the future'));
    }
    if (expiresAtMs <= nowMs || nowMs - generatedAtMs > MAX_EVIDENCE_AGE_MS) {
        errors.push(validationError('STALE_PACKET', '$.expiresAt', 'packet is not currently fresh'));
    }
    if (
        expiresAtMs <= generatedAtMs
        || expiresAtMs - generatedAtMs > MAX_PACKET_LIFETIME_MS
    ) {
        errors.push(
            validationError(
                'INVALID_FRESHNESS_WINDOW',
                '$.expiresAt',
                'packet lifetime must be positive and no longer than 30 minutes',
            ),
        );
    }
}

function validateProducer(producer, errors) {
    if (!isRecord(producer)) return;
    if (producer.role !== 'overall-manager') {
        errors.push(
            validationError(
                'UNAUTHORIZED_PRODUCER',
                '$.producer.role',
                'only the Overall Manager role may produce this packet',
            ),
        );
    }
    if (producer.policyVersion !== AUTHORITY_CONTRACT_VERSION) {
        errors.push(
            validationError(
                'IDENTITY_DRIFT',
                '$.producer.policyVersion',
                'authority policy version does not match this contract',
            ),
        );
    }
    if (!AUTHORITY_LIFECYCLE.states.includes(producer.mode)) {
        errors.push(
            validationError(
                'IDENTITY_DRIFT',
                '$.producer.mode',
                'authority lifecycle mode is unknown',
            ),
        );
    }
    if (!Number.isInteger(producer.authorityGeneration) || producer.authorityGeneration < 1) {
        errors.push(
            validationError(
                'IDENTITY_DRIFT',
                '$.producer.authorityGeneration',
                'authority generation must be a positive integer',
            ),
        );
    }
}

function validateExpectedIdentity(packet, expected, errors) {
    if (expected === undefined) return;
    if (!isRecord(expected)) {
        errors.push(
            validationError(
                'IDENTITY_DRIFT',
                '$options.expected',
                'expected identity must be a closed object',
            ),
        );
        return;
    }
    const allowed = new Set([
        'portfolioId',
        'programId',
        'repositoryId',
        'canonicalRootId',
        'authorityGeneration',
    ]);
    for (const key of Object.keys(expected)) {
        if (!allowed.has(key)) {
            errors.push(
                validationError(
                    'IDENTITY_DRIFT',
                    `$options.expected.${key}`,
                    'expected identity field is not recognized',
                ),
            );
        }
    }
    const scope = isRecord(packet.scope) ? packet.scope : {};
    for (const key of ['portfolioId', 'programId', 'repositoryId', 'canonicalRootId']) {
        if (Object.hasOwn(expected, key) && expected[key] !== scope[key]) {
            errors.push(
                validationError(
                    'IDENTITY_DRIFT',
                    `$.scope.${key}`,
                    'packet identity differs from the stable live expectation',
                ),
            );
        }
    }
    if (
        Object.hasOwn(expected, 'authorityGeneration')
        && (
            !isRecord(packet.producer)
            || expected.authorityGeneration !== packet.producer.authorityGeneration
        )
    ) {
        errors.push(
            validationError(
                'IDENTITY_DRIFT',
                '$.producer.authorityGeneration',
                'authority generation differs from the stable live expectation',
            ),
        );
    }
}

function validateStableIdentities(packet, errors) {
    const identities = [
        ['$.packetId', packet.packetId],
    ];
    if (isRecord(packet.producer)) {
        identities.push(['$.producer.actorId', packet.producer.actorId]);
    }
    if (isRecord(packet.scope)) {
        identities.push(
            ['$.scope.portfolioId', packet.scope.portfolioId],
            ['$.scope.programId', packet.scope.programId],
            ['$.scope.repositoryId', packet.scope.repositoryId],
            ['$.scope.canonicalRootId', packet.scope.canonicalRootId],
        );
    }
    if (isRecord(packet.executionContext)) {
        identities.push(
            ['$.executionContext.activeParentId', packet.executionContext.activeParentId],
            ['$.executionContext.taskId', packet.executionContext.taskId],
            ['$.executionContext.hostId', packet.executionContext.hostId],
            ['$.executionContext.leaseId', packet.executionContext.leaseId],
        );
    }
    if (isRecord(packet.blocker)) {
        identities.push(['$.blocker.ownerId', packet.blocker.ownerId]);
    }
    for (const [index, dependency] of arrayValue(packet.dependencies).entries()) {
        if (isRecord(dependency)) {
            identities.push(
                [`$.dependencies[${index}].dependencyId`, dependency.dependencyId],
                [`$.dependencies[${index}].programId`, dependency.programId],
            );
        }
    }
    for (const [index, evidence] of arrayValue(packet.provenance).entries()) {
        if (isRecord(evidence)) {
            identities.push(
                [`$.provenance[${index}].evidenceId`, evidence.evidenceId],
                [`$.provenance[${index}].stableId`, evidence.stableId],
            );
        }
    }
    for (const [index, input] of arrayValue(packet.contextInputs).entries()) {
        if (isRecord(input)) {
            identities.push([`$.contextInputs[${index}].inputId`, input.inputId]);
        }
    }
    for (const [index, gateEntry] of arrayValue(packet.gates).entries()) {
        if (isRecord(gateEntry)) {
            identities.push([`$.gates[${index}].reviewerId`, gateEntry.reviewerId]);
        }
    }
    if (
        isRecord(packet.executionCapacity)
        && isRecord(packet.executionCapacity.secondLane)
        && Object.hasOwn(packet.executionCapacity.secondLane, 'hostId')
    ) {
        identities.push([
            '$.executionCapacity.secondLane.hostId',
            packet.executionCapacity.secondLane.hostId,
        ]);
    }
    if (isRecord(packet.leaseSnapshot)) {
        for (const [index, lease] of arrayValue(packet.leaseSnapshot.leases).entries()) {
            if (isRecord(lease)) {
                identities.push(
                    [`$.leaseSnapshot.leases[${index}].leaseId`, lease.leaseId],
                    [`$.leaseSnapshot.leases[${index}].resourceId`, lease.resourceId],
                    [`$.leaseSnapshot.leases[${index}].actorId`, lease.actorId],
                    [`$.leaseSnapshot.leases[${index}].hostId`, lease.hostId],
                );
            }
        }
    }
    if (isRecord(packet.collisionSnapshot)) {
        for (const [index, conflict] of arrayValue(packet.collisionSnapshot.conflicts).entries()) {
            if (isRecord(conflict)) {
                identities.push(
                    [`$.collisionSnapshot.conflicts[${index}].conflictId`, conflict.conflictId],
                    [`$.collisionSnapshot.conflicts[${index}].resourceId`, conflict.resourceId],
                );
            }
        }
    }
    if (isRecord(packet.nextAction)) {
        identities.push(
            ['$.nextAction.actionId', packet.nextAction.actionId],
            ['$.nextAction.programId', packet.nextAction.programId],
            ['$.nextAction.repositoryId', packet.nextAction.repositoryId],
            ['$.nextAction.programmingLeadId', packet.nextAction.programmingLeadId],
            ['$.nextAction.targetId', packet.nextAction.targetId],
        );
    }

    for (const [path, value] of identities) {
        if (typeof value === 'string' && !isStableId(value)) {
            errors.push(
                validationError(
                    'UNSTABLE_ID',
                    path,
                    'identity must use a stable namespaced identifier',
                ),
            );
        }
    }
}

function isStableId(value) {
    return value.length <= 200
        && /^[a-z][a-z0-9-]*:[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value);
}

function validateAllocations(packet, errors) {
    validateAllocation(packet.capacity, '$.capacity', 'OVER_CAPACITY', errors);
    validateAllocation(packet.budget, '$.budget', 'OVER_BUDGET', errors);
    if (
        isRecord(packet.priority)
        && (!Number.isInteger(packet.priority.rank) || packet.priority.rank < 1)
    ) {
        errors.push(
            validationError(
                'INVALID_ALLOCATION',
                '$.priority.rank',
                'priority rank must be a positive integer',
            ),
        );
    }
}

function validateAllocation(allocation, path, overflowCode, errors) {
    if (!isRecord(allocation)) return;
    const { available, requested } = allocation;
    if (
        typeof available !== 'number'
        || typeof requested !== 'number'
        || !Number.isFinite(available)
        || !Number.isFinite(requested)
    ) {
        return;
    }
    if (available < 0 || requested < 0) {
        errors.push(
            validationError(
                'INVALID_ALLOCATION',
                path,
                'allocation values must be non-negative',
            ),
        );
    } else if (requested > available) {
        errors.push(
            validationError(
                overflowCode,
                `${path}.requested`,
                'requested allocation exceeds the available amount',
            ),
        );
    }
}

function validateSafeTextAndCodes(packet, errors) {
    const textEntries = [];
    if (isRecord(packet.priority)) {
        textEntries.push(['$.priority.rationale', packet.priority.rationale]);
        validateCode(packet.priority, 'rank', '$.priority.rank', errors, true);
    }
    if (isRecord(packet.blocker)) {
        textEntries.push(['$.blocker.summary', packet.blocker.summary]);
        textEntries.push(['$.blocker.resumeCondition', packet.blocker.resumeCondition]);
        validateCode(packet.blocker, 'reasonCode', '$.blocker.reasonCode', errors);
    }
    if (isRecord(packet.executionCapacity) && isRecord(packet.executionCapacity.secondLane)) {
        textEntries.push(['$.executionCapacity.secondLane.delayReductionSummary', packet.executionCapacity.secondLane.delayReductionSummary]);
    }
    for (const [index, input] of arrayValue(packet.contextInputs).entries()) {
        if (isRecord(input)) textEntries.push([`$.contextInputs[${index}].summary`, input.summary]);
    }
    if (isRecord(packet.nextAction)) {
        textEntries.push(['$.nextAction.summary', packet.nextAction.summary]);
    }
    if (isRecord(packet.noAction)) {
        textEntries.push(['$.noAction.summary', packet.noAction.summary]);
        validateCode(packet.noAction, 'reasonCode', '$.noAction.reasonCode', errors);
    }
    for (const [index, conflict] of arrayValue(
        packet.collisionSnapshot && packet.collisionSnapshot.conflicts,
    ).entries()) {
        if (isRecord(conflict)) {
            textEntries.push([`$.collisionSnapshot.conflicts[${index}].summary`, conflict.summary]);
        }
    }
    for (const [path, value] of textEntries) {
        if (
            typeof value === 'string'
            && (value.length < 1 || value.length > 240 || /[\r\n]/.test(value))
        ) {
            errors.push(
                validationError(
                    'INVALID_TEXT',
                    path,
                    'summary text must be one line and at most 240 characters',
                ),
            );
        }
    }
    for (const [path, allocation] of [
        ['$.capacity', packet.capacity],
        ['$.budget', packet.budget],
    ]) {
        if (
            isRecord(allocation)
            && typeof allocation.unit === 'string'
            && !/^[a-z][a-z0-9-]{0,39}$/.test(allocation.unit)
        ) {
            errors.push(
                validationError(
                    'INVALID_CODE',
                    `${path}.unit`,
                    'allocation unit must be a lowercase stable code',
                ),
            );
        }
    }
    validateAllReferenceSets(packet, errors);
}

function validateCode(container, key, path, errors, skipStringCheck) {
    const value = container[key];
    if (
        !skipStringCheck
        && typeof value === 'string'
        && !/^[a-z][a-z0-9-]{0,79}$/.test(value)
    ) {
        errors.push(
            validationError(
                'INVALID_CODE',
                path,
                'value must be a lowercase stable code',
            ),
        );
    }
}

function validateAllReferenceSets(packet, errors) {
    validateReferenceSet(packet.priority && packet.priority.evidenceRefs, '$.priority.evidenceRefs', errors);
    validateReferenceSet(packet.disposition && packet.disposition.evidenceRefs, '$.disposition.evidenceRefs', errors);
    validateReferenceSet(packet.executionContext && packet.executionContext.evidenceRefs, '$.executionContext.evidenceRefs', errors);
    const nonOverlapEvidenceRefs = packet.executionCapacity
        && packet.executionCapacity.secondLane
        && packet.executionCapacity.secondLane.nonOverlapEvidenceRefs;
    if (Array.isArray(nonOverlapEvidenceRefs) && nonOverlapEvidenceRefs.length > 0) {
        validateReferenceSet(
            nonOverlapEvidenceRefs,
            '$.executionCapacity.secondLane.nonOverlapEvidenceRefs',
            errors,
        );
    }
    for (const [index, input] of arrayValue(packet.contextInputs).entries()) {
        validateReferenceSet(input && input.evidenceRefs, `$.contextInputs[${index}].evidenceRefs`, errors);
    }
    for (const [index, dependency] of arrayValue(packet.dependencies).entries()) {
        validateReferenceSet(
            dependency && dependency.evidenceRefs,
            `$.dependencies[${index}].evidenceRefs`,
            errors,
        );
    }
    validateReferenceSet(packet.blocker && packet.blocker.evidenceRefs, '$.blocker.evidenceRefs', errors);
    if (isRecord(packet.nextAction)) {
        validateReferenceSet(packet.nextAction.evidenceRefs, '$.nextAction.evidenceRefs', errors);
    }
    if (isRecord(packet.noAction)) {
        validateReferenceSet(packet.noAction.evidenceRefs, '$.noAction.evidenceRefs', errors);
    }
    for (const [index, conflict] of arrayValue(
        packet.collisionSnapshot && packet.collisionSnapshot.conflicts,
    ).entries()) {
        validateReferenceSet(
            conflict && conflict.evidenceRefs,
            `$.collisionSnapshot.conflicts[${index}].evidenceRefs`,
            errors,
        );
    }
}

function validateReferenceSet(values, path, errors) {
    if (!Array.isArray(values)) return;
    if (values.length === 0) {
        errors.push(validationError('MISSING_EVIDENCE', path, 'at least one evidence reference is required'));
        return;
    }
    if (new Set(values).size !== values.length) {
        errors.push(
            validationError(
                'DUPLICATE_REFERENCE',
                path,
                'evidence reference appears more than once',
            ),
        );
    }
}

function validateActionState(packet, nowMs, errors) {
    const action = packet.nextAction;
    const producer = packet.producer;
    if (isRecord(action)) {
        if (
            isRecord(producer)
            && ['disabled', 'read-only', 'superseded'].includes(producer.mode)
        ) {
            errors.push(
                validationError(
                    'AUTHORITY_DISABLED',
                    '$.producer.mode',
                    'this authority mode cannot emit a next action',
                ),
            );
        }
        if (!ALLOWED_ACTIONS.includes(action.kind)) {
            errors.push(
                validationError(
                    'UNAUTHORIZED_ACTION',
                    '$.nextAction.kind',
                    'action is outside the Overall Manager recommendation boundary',
                ),
            );
        }
        if (
            isRecord(packet.scope)
            && (
                action.programId !== packet.scope.programId
                || action.repositoryId !== packet.scope.repositoryId
            )
        ) {
            errors.push(
                validationError(
                    'CROSS_PROGRAM',
                    '$.nextAction',
                    'next action must remain within the packet program and repository',
                ),
            );
        }
    }
    if (isRecord(packet.noAction)) {
        const recheckAtMs = timestampValue(packet.noAction.recheckAt, '$.noAction.recheckAt', errors);
        if (recheckAtMs !== null && nowMs !== null && recheckAtMs < nowMs) {
            errors.push(
                validationError(
                    'STALE_NO_ACTION',
                    '$.noAction.recheckAt',
                    'no-action recheck time is already stale',
                ),
            );
        }
    }
    if (isRecord(packet.blocker) && Object.hasOwn(packet.blocker, 'recheckAt')) {
        const recheckAtMs = timestampValue(
            packet.blocker.recheckAt,
            '$.blocker.recheckAt',
            errors,
        );
        if (recheckAtMs !== null && nowMs !== null && recheckAtMs < nowMs) {
            errors.push(
                validationError(
                    'STALE_BLOCKER',
                    '$.blocker.recheckAt',
                    'blocker recheck time is already stale',
                ),
            );
        }
    }
}

function validateExecutionPolicy(packet, errors) {
    const action = packet.nextAction;
    const disposition = packet.disposition;
    const context = packet.executionContext;
    const policy = packet.executionCapacity;

    if (isRecord(disposition)) {
        validateCode(disposition, 'reasonCode', '$.disposition.reasonCode', errors);
    }

    if (isRecord(action) && isRecord(disposition) && disposition.status !== 'ready') {
        errors.push(validationError('HOLD', '$.disposition.status', 'only READY disposition may recommend work'));
    }
    if (isRecord(disposition) && !['ready', 'hold'].includes(disposition.status)) {
        errors.push(validationError('UNKNOWN_STATE', '$.disposition.status', 'disposition state is unknown'));
    }
    if (isRecord(context)) {
        if (!['grouping', 'executable-leaf'].includes(context.classification)) {
            errors.push(validationError('UNKNOWN_STATE', '$.executionContext.classification', 'execution classification is unknown'));
        } else if (isRecord(action) && context.classification !== 'executable-leaf') {
            errors.push(validationError('NOT_EXECUTABLE_LEAF', '$.executionContext.classification', 'grouping context cannot be executed'));
        }
        if (!['suitable', 'unsuitable', 'unknown'].includes(context.hostSuitability)) {
            errors.push(validationError('UNKNOWN_STATE', '$.executionContext.hostSuitability', 'host suitability is unknown'));
        } else if (isRecord(action) && context.hostSuitability !== 'suitable') {
            errors.push(validationError('HOST_UNSUITABLE', '$.executionContext.hostSuitability', 'host suitability must be freshly confirmed'));
        }
        if (isRecord(action) && context.taskId !== action.targetId) {
            errors.push(validationError('IDENTITY_DRIFT', '$.executionContext.taskId', 'exact task differs from next-action target'));
        }
        const leases = arrayValue(packet.leaseSnapshot && packet.leaseSnapshot.leases);
        const exactLease = leases.find((lease) => isRecord(lease) && lease.leaseId === context.leaseId);
        if (isRecord(action) && (!exactLease || exactLease.resourceId !== context.taskId)) {
            errors.push(validationError('IDENTITY_DRIFT', '$.executionContext.leaseId', 'exact task lease is absent or mismatched'));
        }
        if (isRecord(action) && exactLease && exactLease.hostId !== context.hostId) {
            errors.push(validationError('HOST_UNSUITABLE', '$.executionContext.hostId', 'exact lease belongs to another host'));
        }
    }
    if (isRecord(policy)) {
        if (policy.defaultMaxOverall !== 1 || policy.maxPerHost !== 1 || ![1, 2].includes(policy.requestedOverall)) {
            errors.push(validationError('CAPACITY_POLICY', '$.executionCapacity', 'default capacity is one overall and one per host'));
        }
        const second = policy.secondLane;
        if (policy.requestedOverall === 2) {
            if (!isRecord(second) || second.enabled !== true || typeof second.delayReductionSummary !== 'string' || second.delayReductionSummary.length < 16 || arrayValue(second.nonOverlapEvidenceRefs).length === 0) {
                errors.push(validationError('CAPACITY_POLICY', '$.executionCapacity.secondLane', 'second lane requires fresh non-overlap evidence and concrete delay reduction'));
            }
            const evidenceById = new Map(
                arrayValue(packet.provenance)
                    .filter(isRecord)
                    .map((entry) => [entry.evidenceId, entry]),
            );
            const exactEvidence = arrayValue(second && second.nonOverlapEvidenceRefs)
                .every((reference) => {
                    const evidence = evidenceById.get(reference);
                    return evidence
                        && evidence.sourceKind === 'verified-system-readback'
                        && evidence.claimKind === 'exact-non-overlap';
                });
            if (!exactEvidence) {
                errors.push(validationError('CAPACITY_POLICY', '$.executionCapacity.secondLane.nonOverlapEvidenceRefs', 'second lane evidence must be an exact non-overlap system readback'));
            }
        } else if (isRecord(second) && second.enabled !== false) {
            errors.push(validationError('CAPACITY_POLICY', '$.executionCapacity.secondLane.enabled', 'second lane must be disabled when one slot is requested'));
        }
    }
    for (const [index, input] of arrayValue(packet.contextInputs).entries()) {
        if (!isRecord(input)) continue;
        if (!['memory', 'prompt', 'reminder'].includes(input.kind) || input.authority !== 'none') {
            errors.push(validationError('UNAUTHORIZED_CONTEXT', `$.contextInputs[${index}]`, 'memory, prompts, and reminders are data and grant no authority or lease'));
        }
    }
}

function validateDependenciesAndBlocker(packet, errors) {
    const scopeProgram = isRecord(packet.scope) ? packet.scope.programId : undefined;
    const dependencyIds = new Set();
    for (const [index, dependency] of arrayValue(packet.dependencies).entries()) {
        if (!isRecord(dependency)) continue;
        if (dependencyIds.has(dependency.dependencyId)) {
            errors.push(
                validationError(
                    'DUPLICATE_ID',
                    `$.dependencies[${index}].dependencyId`,
                    'dependency identity appears more than once',
                ),
            );
        }
        dependencyIds.add(dependency.dependencyId);
        if (dependency.programId !== scopeProgram) {
            errors.push(
                validationError(
                    'CROSS_PROGRAM',
                    `$.dependencies[${index}].programId`,
                    'dependency input is outside the packet program',
                ),
            );
        }
        if (!['satisfied', 'blocked', 'unknown'].includes(dependency.status)) {
            errors.push(
                validationError(
                    'UNKNOWN_STATE',
                    `$.dependencies[${index}].status`,
                    'dependency status is unknown',
                ),
            );
        } else if (isRecord(packet.nextAction) && dependency.status !== 'satisfied') {
            errors.push(
                validationError(
                    'DEPENDENCY_BLOCKED',
                    `$.dependencies[${index}].status`,
                    'all dependencies must be satisfied before a next action',
                ),
            );
        }
    }

    if (isRecord(packet.blocker)) {
        const allowed = ['none', 'actionable-internal', 'waiting-external', 'unknown-conflicting'];
        if (!allowed.includes(packet.blocker.classification)) {
            errors.push(
                validationError(
                    'UNKNOWN_STATE',
                    '$.blocker.classification',
                    'blocker classification is unknown',
                ),
            );
        } else if (
            isRecord(packet.nextAction)
            && packet.blocker.classification !== 'none'
        ) {
            errors.push(
                validationError(
                    'BLOCKED',
                    '$.blocker.classification',
                    'an active or unknown blocker prevents a next action',
                ),
            );
        }
        if (!['cleared', 'active', 'waiting', 'unknown'].includes(packet.blocker.state)) {
            errors.push(validationError('UNKNOWN_STATE', '$.blocker.state', 'blocker state is unknown'));
        } else if (isRecord(packet.nextAction) && packet.blocker.state !== 'cleared') {
            errors.push(validationError('BLOCKED', '$.blocker.state', 'uncleared blocker state prevents a next action'));
        }
        if (!isHttpsUrl(packet.blocker.canonicalLink)) {
            errors.push(validationError('MALFORMED_EVIDENCE', '$.blocker.canonicalLink', 'blocker requires a canonical HTTPS link'));
        }
    }
}

function validateGates(packet, generatedAtMs, nowMs, errors) {
    const seen = new Set();
    const reviewers = new Set();
    const gates = arrayValue(packet.gates);
    for (const [index, gateEntry] of gates.entries()) {
        if (!isRecord(gateEntry)) continue;
        const path = `$.gates[${index}]`;
        if (seen.has(gateEntry.kind)) {
            errors.push(validationError('DUPLICATE_GATE', `${path}.kind`, 'gate appears more than once'));
        }
        seen.add(gateEntry.kind);
        if (!REQUIRED_GATES.includes(gateEntry.kind)) {
            errors.push(validationError('UNKNOWN_STATE', `${path}.kind`, 'gate kind is not recognized'));
        }
        if (!['pass', 'hold', 'unknown', 'not-applicable'].includes(gateEntry.status)) {
            errors.push(validationError('UNKNOWN_STATE', `${path}.status`, 'gate status is not recognized'));
        } else if (isRecord(packet.nextAction) && gateEntry.status !== 'pass') {
            errors.push(validationError('GATE_NOT_PASS', `${path}.status`, 'required gate has not passed'));
        }
        if (isRecord(packet.producer) && gateEntry.reviewerId === packet.producer.actorId) {
            errors.push(validationError('SELF_REVIEW', `${path}.reviewerId`, 'producer cannot review its own packet'));
        }
        if (reviewers.has(gateEntry.reviewerId)) {
            errors.push(
                validationError(
                    'DUPLICATE_REVIEWER',
                    `${path}.reviewerId`,
                    'independent gates require distinct reviewer identities',
                ),
            );
        }
        reviewers.add(gateEntry.reviewerId);
        validateObservation(gateEntry.observedAt, `${path}.observedAt`, generatedAtMs, nowMs, errors);
    }
    for (const required of REQUIRED_GATES) {
        if (!seen.has(required)) {
            errors.push(validationError('MISSING_GATE', '$.gates', `missing required ${required} gate`));
        }
    }
}

function validateProvenance(packet, generatedAtMs, nowMs, errors) {
    const ids = new Set();
    const stableIds = new Set();
    const permalinks = new Set();
    for (const [index, evidence] of arrayValue(packet.provenance).entries()) {
        if (!isRecord(evidence)) continue;
        const path = `$.provenance[${index}]`;
        if (ids.has(evidence.evidenceId)) {
            errors.push(
                validationError(
                    'DUPLICATE_EVIDENCE',
                    `${path}.evidenceId`,
                    'evidence identity appears more than once',
                ),
            );
        }
        ids.add(evidence.evidenceId);
        if (stableIds.has(evidence.stableId) || permalinks.has(evidence.permalink)) {
            errors.push(
                validationError(
                    'DUPLICATE_EVIDENCE',
                    path,
                    'stable evidence identity or permalink is reused',
                ),
            );
        }
        stableIds.add(evidence.stableId);
        permalinks.add(evidence.permalink);
        if (!['canonical-ledger', 'signed-artifact', 'verified-system-readback'].includes(evidence.sourceKind)) {
            errors.push(
                validationError(
                    'MALFORMED_EVIDENCE',
                    `${path}.sourceKind`,
                    'evidence source kind is not allowed',
                ),
            );
        }
        if (Object.hasOwn(evidence, 'claimKind') && evidence.claimKind !== 'exact-non-overlap') {
            errors.push(validationError('MALFORMED_EVIDENCE', `${path}.claimKind`, 'evidence claim kind is not recognized'));
        }
        if (!isHttpsUrl(evidence.permalink) || !/^[a-f0-9]{64}$/i.test(evidence.sha256 || '')) {
            errors.push(
                validationError(
                    'MALFORMED_EVIDENCE',
                    path,
                    'evidence requires an HTTPS permalink and SHA-256',
                ),
            );
        }
        validateObservation(evidence.observedAt, `${path}.observedAt`, generatedAtMs, nowMs, errors);
    }
    return ids;
}

function validateLeases(packet, generatedAtMs, nowMs, errors) {
    if (!isRecord(packet.leaseSnapshot)) return;
    validateSnapshot(
        packet.leaseSnapshot,
        '$.leaseSnapshot',
        generatedAtMs,
        nowMs,
        errors,
    );
    const ids = new Set();
    const exclusiveResources = new Set();
    const exclusiveHosts = new Set();
    const leases = arrayValue(packet.leaseSnapshot.leases);
    for (const [index, lease] of leases.entries()) {
        if (!isRecord(lease)) continue;
        const path = `$.leaseSnapshot.leases[${index}]`;
        if (ids.has(lease.leaseId)) {
            errors.push(validationError('DUPLICATE_LEASE', `${path}.leaseId`, 'lease identity is duplicated'));
        }
        ids.add(lease.leaseId);
        if (!['exclusive', 'shared-read'].includes(lease.mode)) {
            errors.push(validationError('UNKNOWN_STATE', `${path}.mode`, 'lease mode is unknown'));
        }
        if (lease.mode === 'exclusive') {
            if (exclusiveResources.has(lease.resourceId)) {
                errors.push(
                    validationError(
                        'DUPLICATE_LEASE',
                        `${path}.resourceId`,
                        'resource has more than one exclusive lease',
                    ),
                );
            }
            exclusiveResources.add(lease.resourceId);
            if (exclusiveHosts.has(lease.hostId)) {
                errors.push(validationError('HOST_CAPACITY', `${path}.hostId`, 'a host may hold at most one executable lease'));
            }
            exclusiveHosts.add(lease.hostId);
        }
        const leaseExpiry = timestampValue(lease.expiresAt, `${path}.expiresAt`, errors);
        if (leaseExpiry !== null && nowMs !== null && leaseExpiry <= nowMs) {
            errors.push(validationError('STALE_LEASE', `${path}.expiresAt`, 'lease has expired'));
        }
        if (!Number.isInteger(lease.generation) || lease.generation < 1) {
            errors.push(validationError('IDENTITY_DRIFT', `${path}.generation`, 'lease generation is invalid'));
        }
    }
    if (isRecord(packet.nextAction)) {
        const matchingLease = leases.some(
            (lease) => isRecord(lease)
                && lease.mode === 'exclusive'
                && lease.resourceId === packet.nextAction.targetId,
        );
        if (!matchingLease) {
            errors.push(
                validationError(
                    'MISSING_LEASE',
                    '$.leaseSnapshot.leases',
                    'next-action target requires one exact exclusive lease',
                ),
            );
        }
    }
    const policy = packet.executionCapacity;
    if (isRecord(packet.nextAction) && isRecord(policy)) {
        const exclusive = leases.filter((lease) => isRecord(lease) && lease.mode === 'exclusive');
        const second = policy.secondLane;
        if (
            exclusive.length !== policy.requestedOverall
            || (
                policy.requestedOverall === 2
                && (
                    !isRecord(second)
                    || !isRecord(packet.executionContext)
                    || second.hostId === packet.executionContext.hostId
                    || !exclusive.some((lease) => lease.hostId === second.hostId)
                )
            )
        ) {
            errors.push(validationError('CAPACITY_POLICY', '$.executionCapacity', 'requested capacity must match the exact exclusive lease inventory'));
        }
    }
}

function validateCollisions(packet, generatedAtMs, nowMs, errors) {
    if (!isRecord(packet.collisionSnapshot)) return;
    validateSnapshot(
        packet.collisionSnapshot,
        '$.collisionSnapshot',
        generatedAtMs,
        nowMs,
        errors,
    );
    const conflictIds = new Set();
    for (const [index, conflict] of arrayValue(packet.collisionSnapshot.conflicts).entries()) {
        if (!isRecord(conflict)) continue;
        if (conflictIds.has(conflict.conflictId)) {
            errors.push(
                validationError(
                    'DUPLICATE_ID',
                    `$.collisionSnapshot.conflicts[${index}].conflictId`,
                    'conflict identity appears more than once',
                ),
            );
        }
        conflictIds.add(conflict.conflictId);
    }
    if (
        isRecord(packet.nextAction)
        && arrayValue(packet.collisionSnapshot.conflicts).length > 0
    ) {
        errors.push(
            validationError(
                'COLLISION_DETECTED',
                '$.collisionSnapshot.conflicts',
                'a collision prevents the recommended action',
            ),
        );
    }
}

function validateSnapshot(snapshot, path, generatedAtMs, nowMs, errors) {
    validateObservation(snapshot.observedAt, `${path}.observedAt`, generatedAtMs, nowMs, errors);
    if (!/^[a-f0-9]{64}$/i.test(snapshot.snapshotHash || '')) {
        errors.push(
            validationError(
                'MALFORMED_EVIDENCE',
                `${path}.snapshotHash`,
                'snapshot requires a SHA-256 hash',
            ),
        );
    }
}

function validateObservation(value, path, generatedAtMs, nowMs, errors) {
    const observedAtMs = timestampValue(value, path, errors);
    if (observedAtMs === null || nowMs === null) return;
    if (
        observedAtMs > nowMs
        || (generatedAtMs !== null && observedAtMs > generatedAtMs)
    ) {
        errors.push(validationError('CLOCK_CONFLICT', path, 'observation is from the future'));
    } else if (nowMs - observedAtMs > MAX_EVIDENCE_AGE_MS) {
        errors.push(validationError('STALE_EVIDENCE', path, 'observation is older than 15 minutes'));
    }
}

function validateEvidenceReferences(packet, evidenceIds, errors) {
    const references = [];
    appendReferences(references, packet.priority && packet.priority.evidenceRefs, '$.priority.evidenceRefs');
    appendReferences(references, packet.disposition && packet.disposition.evidenceRefs, '$.disposition.evidenceRefs');
    appendReferences(references, packet.executionContext && packet.executionContext.evidenceRefs, '$.executionContext.evidenceRefs');
    appendReferences(
        references,
        packet.executionCapacity && packet.executionCapacity.secondLane && packet.executionCapacity.secondLane.nonOverlapEvidenceRefs,
        '$.executionCapacity.secondLane.nonOverlapEvidenceRefs',
    );
    for (const [index, input] of arrayValue(packet.contextInputs).entries()) {
        appendReferences(references, input && input.evidenceRefs, `$.contextInputs[${index}].evidenceRefs`);
    }
    for (const [index, dependency] of arrayValue(packet.dependencies).entries()) {
        appendReferences(
            references,
            dependency && dependency.evidenceRefs,
            `$.dependencies[${index}].evidenceRefs`,
        );
    }
    appendReferences(references, packet.blocker && packet.blocker.evidenceRefs, '$.blocker.evidenceRefs');
    for (const [index, gateEntry] of arrayValue(packet.gates).entries()) {
        if (gateEntry && typeof gateEntry.evidenceRef === 'string') {
            references.push([`$.gates[${index}].evidenceRef`, gateEntry.evidenceRef]);
        }
    }
    if (isRecord(packet.leaseSnapshot)) {
        for (const [index, lease] of arrayValue(packet.leaseSnapshot.leases).entries()) {
            if (lease && typeof lease.evidenceRef === 'string') {
                references.push([
                    `$.leaseSnapshot.leases[${index}].evidenceRef`,
                    lease.evidenceRef,
                ]);
            }
        }
    }
    if (isRecord(packet.collisionSnapshot)) {
        for (const [index, conflict] of arrayValue(packet.collisionSnapshot.conflicts).entries()) {
            appendReferences(
                references,
                conflict && conflict.evidenceRefs,
                `$.collisionSnapshot.conflicts[${index}].evidenceRefs`,
            );
        }
    }
    const state = isRecord(packet.nextAction) ? packet.nextAction : packet.noAction;
    appendReferences(
        references,
        state && state.evidenceRefs,
        isRecord(packet.nextAction) ? '$.nextAction.evidenceRefs' : '$.noAction.evidenceRefs',
    );

    for (const [path, reference] of references) {
        if (!evidenceIds.has(reference)) {
            errors.push(
                validationError(
                    'MISSING_EVIDENCE',
                    path,
                    'evidence reference does not resolve in packet provenance',
                ),
            );
        }
    }
}

function appendReferences(output, values, path) {
    if (!Array.isArray(values)) return;
    values.forEach((value, index) => output.push([`${path}[${index}]`, value]));
}

function timestampValue(value, path, errors) {
    let normalized = value;
    if (value instanceof Date) {
        if (!Number.isFinite(value.getTime())) {
            errors.push(validationError('INVALID_TIMESTAMP', path, 'timestamp is not a real instant'));
            return null;
        }
        normalized = value.toISOString();
    }
    if (
        typeof normalized !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(normalized)
    ) {
        errors.push(validationError('INVALID_TIMESTAMP', path, 'expected an RFC3339 UTC timestamp'));
        return null;
    }
    const result = Date.parse(normalized);
    if (!Number.isFinite(result) || new Date(result).toISOString() !== normalized) {
        errors.push(validationError('INVALID_TIMESTAMP', path, 'timestamp is not a real instant'));
        return null;
    }
    return result;
}

function isHttpsUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.username === '' && url.password === '';
    } catch {
        return false;
    }
}

function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function arrayValue(value) {
    return Array.isArray(value) ? value.slice(0, 128) : [];
}

/**
 * Copy a candidate through the explicit packet allowlist. Any dropped or
 * redacted value makes the result non-actionable even if the remaining packet
 * would otherwise validate.
 */
function buildPortfolioControlPacket(input, options) {
    try {
        return buildPortfolioControlPacketUnsafe(input, options);
    } catch {
        return {
            ok: false,
            errors: [
                validationError(
                    'MALFORMED_PACKET',
                    '$',
                    'packet candidate could not be read safely',
                ),
                validationError(
                    'REDACTION_REQUIRED',
                    '$',
                    'unreadable input was excluded from the packet boundary',
                ),
            ],
            state: 'no-action',
            action: null,
            packet: null,
            redactions: [{ path: '$', reason: 'unreadable-input' }],
        };
    }
}

function buildPortfolioControlPacketUnsafe(input, options) {
    const redactions = [];
    const packet = sanitizeShape(input, 'packet', '$', redactions, new WeakSet());
    const validation = validatePortfolioControlPacket(packet, options);
    const errors = validation.errors.slice();
    if (redactions.length > 0) {
        errors.push(
            validationError(
                'REDACTION_REQUIRED',
                '$',
                'input contained fields or values outside the least-privilege packet boundary',
            ),
        );
    }
    sortDiagnostics(errors);
    redactions.sort((left, right) => compareCodeUnits(left.path, right.path));
    return {
        ok: errors.length === 0,
        errors,
        state: validation.state,
        action: errors.length === 0 ? validation.action : null,
        packet,
        redactions,
    };
}

function sanitizeShape(value, shapeName, path, redactions, seen) {
    if (!isRecord(value)) return sanitizeNonconformingValue(value, path, redactions);
    if (seen.has(value)) {
        redactions.push({ path, reason: 'cyclic-input' });
        return null;
    }
    seen.add(value);
    const descriptor = SHAPES[shapeName];
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
        const childPath = `${path}.${key}`;
        const property = descriptor.properties[key];
        if (!property) {
            redactions.push({ path: childPath, reason: 'not-allowlisted' });
            continue;
        }
        output[key] = sanitizeProperty(entry, property, childPath, redactions, seen);
    }
    return output;
}

function sanitizeProperty(value, descriptor, path, redactions, seen) {
    if (descriptor.type === 'object') {
        if (!isRecord(value)) return sanitizeNonconformingValue(value, path, redactions);
        return sanitizeShape(value, descriptor.shape, path, redactions, seen);
    }
    if (descriptor.type === 'array') {
        if (!Array.isArray(value)) return sanitizeNonconformingValue(value, path, redactions);
        if (value.length > descriptor.maxItems) {
            redactions.push({ path, reason: 'collection-limit' });
        }
        return value.slice(0, descriptor.maxItems).map((entry, index) => (
            descriptor.shape
                ? sanitizeShape(entry, descriptor.shape, `${path}[${index}]`, redactions, seen)
                : sanitizeScalar(entry, `${path}[${index}]`, redactions)
        ));
    }
    return sanitizeScalar(value, path, redactions);
}

function sanitizeNonconformingValue(value, path, redactions) {
    if (typeof value === 'string') return sanitizeScalar(value, path, redactions);
    if (value && typeof value === 'object') {
        redactions.push({ path, reason: 'invalid-shape' });
        return null;
    }
    return value;
}

function sanitizeScalar(value, path, redactions) {
    if (value && typeof value === 'object') {
        redactions.push({ path, reason: 'invalid-shape' });
        return null;
    }
    if (
        typeof value === 'string'
        && PRIVATE_DETAIL_PATTERNS.some((pattern) => pattern.test(value))
    ) {
        redactions.push({ path, reason: 'private-detail' });
        return '[redacted]';
    }
    return value;
}

function validationError(code, path, message) {
    return { code, path, message };
}

/** Canonical JSON for already-validated packets; packet arrays are sets. */
function canonicalizePortfolioControlPacket(packet) {
    try {
        const serialized = JSON.stringify(canonicalValue(packet));
        return typeof serialized === 'string' ? serialized : null;
    } catch {
        return null;
    }
}

function canonicalValue(value, seen = new WeakSet(), depth = 0) {
    if (depth > MAX_CANONICAL_DEPTH) {
        throw new TypeError('packet exceeds canonicalization depth limit');
    }
    if (Array.isArray(value)) {
        if (value.length > 128) {
            throw new TypeError('packet collection exceeds canonicalization limit');
        }
        if (seen.has(value)) throw new TypeError('cyclic packet cannot be canonicalized');
        seen.add(value);
        return value
            .map((entry) => canonicalValue(entry, seen, depth + 1))
            .sort((left, right) => compareCodeUnits(JSON.stringify(left), JSON.stringify(right)));
    }
    if (value && typeof value === 'object') {
        if (seen.has(value)) throw new TypeError('cyclic packet cannot be canonicalized');
        seen.add(value);
        const keys = Object.keys(value);
        if (keys.length > 256) {
            throw new TypeError('packet object exceeds canonicalization limit');
        }
        return Object.fromEntries(
            keys
                .sort()
                .map((key) => [key, canonicalValue(value[key], seen, depth + 1)]),
        );
    }
    return value;
}

function compareCodeUnits(left, right) {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}

/** SHA-256 of canonical JSON for an already-validated packet. */
function hashPortfolioControlPacket(packet) {
    const canonical = canonicalizePortfolioControlPacket(packet);
    if (canonical === null) return null;
    return createHash('sha256')
        .update(canonical, 'utf8')
        .digest('hex');
}

module.exports = {
    AUTHORITY_CONTRACT_VERSION,
    PORTFOLIO_PACKET_VERSION,
    OVERALL_MANAGER_AUTHORITY,
    ROLE_AUTHORITY,
    AUTHORITY_LIFECYCLE,
    validatePortfolioControlPacket,
    canonicalizePortfolioControlPacket,
    hashPortfolioControlPacket,
    buildPortfolioControlPacket,
};
