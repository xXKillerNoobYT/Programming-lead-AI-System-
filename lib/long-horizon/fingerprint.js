'use strict';

const { createHash } = require('node:crypto');
const {
    FINGERPRINT_ALGORITHM_VERSION,
    normalizeIncidentFamily,
} = require('./contracts.js');

const FINGERPRINT_LAYERS = Object.freeze([
    'exact',
    'structural',
    'component_contract',
    'causal_family',
]);
const FAILURE_DIMENSIONS = Object.freeze([
    'operation',
    'actor',
    'resource',
    'direction',
    'invariant',
    'component',
    'contract',
    'errorCode',
]);
const REQUIRED_FAILURE_DIMENSIONS = Object.freeze(
    FAILURE_DIMENSIONS.filter((dimension) => dimension !== 'errorCode'),
);
const SECRET_VALUE = /(?:-----BEGIN [A-Z ]+PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~-]+|(?:api[_-]?key|password|secret|token)\s*[:=]\s*\S+|\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bAKIA[0-9A-Z]{16}\b|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b|\b(?:sk|rk|pk)-(?:proj-)?[A-Za-z0-9_-]{20,}\b|\bglpat-[A-Za-z0-9_-]{20,}\b|xox[baprs]-[A-Za-z0-9-]{10,})/i;
const CONTROL_CHARACTER = /\p{Cc}/u;

class FingerprintError extends TypeError {
    constructor(code, path, message) {
        super(`${code} at ${path}: ${message}`);
        this.name = 'FingerprintError';
        this.code = code;
        this.path = path;
    }
}

function fail(code, path, message) {
    throw new FingerprintError(code, path, message);
}

function expectPlainObject(value, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        fail('invalid_failure', path, 'expected a plain object');
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) {
        fail('invalid_failure', path, 'expected a plain object');
    }
    return value;
}

function normalizeDimension(value, path) {
    if (typeof value !== 'string') {
        fail('invalid_failure_dimension', path, 'expected a string');
    }
    const trimmed = value.normalize('NFKC').trim();
    if (!trimmed || CONTROL_CHARACTER.test(trimmed)) {
        fail('invalid_failure_dimension', path, 'must be non-empty and contain no controls');
    }
    if (trimmed.length > 512) {
        fail('invalid_failure_dimension', path, 'must not exceed 512 characters');
    }
    if (SECRET_VALUE.test(trimmed)) {
        fail('secret_value_forbidden', path, 'credential-like values must not be fingerprinted');
    }
    return trimmed
        .toLowerCase()
        .replace(/[\s_-]+/gu, '_');
}

function normalizeFailure(failure) {
    const input = expectPlainObject(failure, 'failure');
    const allowed = new Set(FAILURE_DIMENSIONS);
    for (const key of Object.keys(input)) {
        if (!allowed.has(key)) {
            fail(
                'failure_field_forbidden',
                `failure.${key}`,
                'only allowlisted failure dimensions may be fingerprinted',
            );
        }
    }
    const normalized = {};
    for (const dimension of REQUIRED_FAILURE_DIMENSIONS) {
        if (!Object.prototype.hasOwnProperty.call(input, dimension)) {
            fail(
                'failure_dimension_missing',
                `failure.${dimension}`,
                'required failure dimension is missing',
            );
        }
        normalized[dimension] = normalizeDimension(
            input[dimension],
            `failure.${dimension}`,
        );
    }
    normalized.errorCode = input.errorCode == null
        ? ''
        : normalizeDimension(input.errorCode, 'failure.errorCode');
    return normalized;
}

function requireAlgorithmVersion(options) {
    const input = options === undefined ? {} : expectPlainObject(options, 'options');
    for (const key of Object.keys(input)) {
        if (key !== 'algorithmVersion') {
            fail('option_field_forbidden', `options.${key}`, 'option is not supported');
        }
    }
    const version = Object.prototype.hasOwnProperty.call(input, 'algorithmVersion')
        ? input.algorithmVersion
        : FINGERPRINT_ALGORITHM_VERSION;
    if (version !== FINGERPRINT_ALGORITHM_VERSION) {
        fail(
            'unsupported_algorithm_version',
            'options.algorithmVersion',
            `only ${FINGERPRINT_ALGORITHM_VERSION} is supported`,
        );
    }
    return version;
}

function fingerprintKey(algorithmVersion, layer, dimensions) {
    const canonical = JSON.stringify({
        algorithmVersion,
        layer,
        dimensions,
    });
    const digest = createHash('sha256').update(canonical, 'utf8').digest('hex');
    return `${algorithmVersion}:${layer}:sha256:${digest}`;
}

function buildFingerprints(failure, options = {}) {
    const algorithmVersion = requireAlgorithmVersion(options);
    const normalized = normalizeFailure(failure);
    return {
        algorithmVersion,
        exact: fingerprintKey(algorithmVersion, 'exact', FAILURE_DIMENSIONS.map(
            (dimension) => [dimension, normalized[dimension]],
        )),
        structural: fingerprintKey(
            algorithmVersion,
            'structural',
            FAILURE_DIMENSIONS
                .filter((dimension) => dimension !== 'errorCode')
                .map((dimension) => [dimension, normalized[dimension]]),
        ),
        component_contract: fingerprintKey(
            algorithmVersion,
            'component_contract',
            [
                ['contract', normalized.contract],
                ['invariant', normalized.invariant],
            ],
        ),
        causal_family: fingerprintKey(
            algorithmVersion,
            'causal_family',
            [
                ['actor', normalized.actor],
                ['resource', normalized.resource],
                ['component', normalized.component],
                ['contract', normalized.contract],
                ['invariant', normalized.invariant],
            ],
        ),
    };
}

function normalizeOccurrenceInput(occurrence, path) {
    const input = expectPlainObject(occurrence, path);
    if (!input.failure) {
        fail('occurrence_failure_missing', `${path}.failure`, 'failure is required');
    }
    return {
        failure: normalizeFailure(input.failure),
        fingerprints: buildFingerprints(input.failure),
    };
}

function normalizeFingerprintPackage(value, expected, path) {
    const input = expectPlainObject(value, path);
    const allowed = new Set(['algorithmVersion', ...FINGERPRINT_LAYERS]);
    for (const key of Object.keys(input)) {
        if (!allowed.has(key)) {
            fail('fingerprint_field_forbidden', `${path}.${key}`, 'field is not supported');
        }
    }
    if (input.algorithmVersion !== FINGERPRINT_ALGORITHM_VERSION) {
        fail(
            'unsupported_algorithm_version',
            `${path}.algorithmVersion`,
            `only ${FINGERPRINT_ALGORITHM_VERSION} is supported`,
        );
    }
    for (const layer of FINGERPRINT_LAYERS) {
        const expectedPattern = new RegExp(
            `^${FINGERPRINT_ALGORITHM_VERSION}:${layer}:sha256:[a-f0-9]{64}$`,
        );
        if (typeof input[layer] !== 'string' || !expectedPattern.test(input[layer])) {
            fail('fingerprint_invalid', `${path}.${layer}`, 'fingerprint key is invalid');
        }
        if (input[layer] !== expected[layer]) {
            fail(
                'fingerprint_mismatch',
                `${path}.${layer}`,
                'stored fingerprint does not match the representative occurrence',
            );
        }
    }
    return structuredClone(input);
}

function normalizeCandidate(candidate, index) {
    const path = `families[${index}]`;
    const input = expectPlainObject(candidate, path);
    const allowed = new Set(['family', 'representativeOccurrence', 'fingerprints']);
    for (const key of Object.keys(input)) {
        if (!allowed.has(key)) {
            fail('candidate_field_forbidden', `${path}.${key}`, 'field is not supported');
        }
    }
    const family = normalizeIncidentFamily(input.family);
    if (family.algorithmVersion !== FINGERPRINT_ALGORITHM_VERSION) {
        fail(
            'unsupported_algorithm_version',
            `${path}.family.algorithmVersion`,
            `only ${FINGERPRINT_ALGORITHM_VERSION} is supported`,
        );
    }
    const representative = normalizeOccurrenceInput(
        input.representativeOccurrence,
        `${path}.representativeOccurrence`,
    );
    const fingerprints = input.fingerprints == null
        ? representative.fingerprints
        : normalizeFingerprintPackage(
            input.fingerprints,
            representative.fingerprints,
            `${path}.fingerprints`,
        );
    return { family, representative, fingerprints };
}

function compareDimensions(occurrence, representative) {
    const matchingDimensions = [];
    const differences = [];
    for (const dimension of FAILURE_DIMENSIONS) {
        const occurrenceValue = occurrence.failure[dimension];
        const candidateValue = representative.failure[dimension];
        if (occurrenceValue === candidateValue) {
            matchingDimensions.push(dimension);
        } else {
            differences.push({
                dimension,
                occurrenceValue: occurrenceValue || null,
                candidateValue: candidateValue || null,
            });
        }
    }
    return { matchingDimensions, differences };
}

function matchedLayerFor(occurrence, candidate) {
    if (occurrence.fingerprints.exact === candidate.fingerprints.exact) return 'exact';
    if (occurrence.fingerprints.structural === candidate.fingerprints.structural) {
        return 'structural';
    }
    if (occurrence.fingerprints.causal_family === candidate.fingerprints.causal_family) {
        return 'causal_family';
    }
    if (
        occurrence.fingerprints.component_contract ===
        candidate.fingerprints.component_contract
    ) {
        return 'component_contract';
    }
    return null;
}

function scoreFor(matchedLayer, matchingDimensions) {
    if (matchedLayer === 'exact') return 1_000;
    if (matchedLayer === 'structural') return 900;
    if (matchedLayer === 'causal_family') return 700;
    if (matchedLayer === 'component_contract') return 600;
    return matchingDimensions.length * 10;
}

function compareStrings(left, right) {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}

function explainNormalizedCandidate(occurrence, candidate) {
    const { matchingDimensions, differences } = compareDimensions(
        occurrence,
        candidate.representative,
    );
    const matchedLayer = matchedLayerFor(occurrence, candidate);
    const recommendedDisposition = matchedLayer === 'exact' || matchedLayer === 'structural'
        ? 'attach'
        : matchedLayer === 'component_contract' || matchedLayer === 'causal_family'
            ? 'review_link'
            : 'suggest';
    return {
        familyId: candidate.family.familyId,
        canonicalIssueKey: candidate.family.canonicalIssueKey,
        algorithmVersion: FINGERPRINT_ALGORITHM_VERSION,
        matchedLayer,
        matchedFingerprint: matchedLayer == null
            ? null
            : occurrence.fingerprints[matchedLayer],
        recommendedDisposition,
        matchingDimensions,
        differences,
        score: scoreFor(matchedLayer, matchingDimensions),
        sourceAction: 'none',
        automaticMerge: false,
        automaticReopen: false,
    };
}

function explainCandidateMatch(occurrence, candidate) {
    return explainNormalizedCandidate(
        normalizeOccurrenceInput(occurrence, 'occurrence'),
        normalizeCandidate(candidate, 0),
    );
}

function rankRecurrenceCandidates(occurrence, families) {
    if (!Array.isArray(families)) {
        fail('invalid_candidates', 'families', 'expected an array');
    }
    const normalizedOccurrence = normalizeOccurrenceInput(occurrence, 'occurrence');
    return families
        .map((candidate, index) => explainNormalizedCandidate(
            normalizedOccurrence,
            normalizeCandidate(candidate, index),
        ))
        .sort((left, right) => (
            right.score - left.score ||
            compareStrings(left.familyId, right.familyId) ||
            compareStrings(left.canonicalIssueKey, right.canonicalIssueKey)
        ));
}

module.exports = {
    FINGERPRINT_LAYERS,
    FingerprintError,
    buildFingerprints,
    rankRecurrenceCandidates,
    explainCandidateMatch,
};
