'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
    hasAcceptanceCriteriaItem,
    missingFields,
    validateIssueFlag,
} = require('../scripts/spec-gate-bot.js');

const COMPLETE_SPEC = `
## SPEC

**Goal:** Ship a visible outcome.

**Acceptance criteria:**
1. [unit] proves the gate fails on missing spec evidence

**Non-goals:** No workflow refactor.

**Open questions:**
- None.

**Evidence plan:** Run the focused spec-gate tests.

**Rollback plan:** Revert the script change.

**Size:** S
`;

describe('spec-gate-bot gate evidence', () => {
    test('passes when all SPEC fields and a numbered acceptance criterion are present', () => {
        assert.deepEqual(missingFields(COMPLETE_SPEC), []);
        assert.equal(hasAcceptanceCriteriaItem(COMPLETE_SPEC), true);
    });

    test('fails when acceptance criteria heading exists but contains no testable item', () => {
        const spec = COMPLETE_SPEC.replace('1. [unit] proves the gate fails on missing spec evidence', 'TBD');
        assert.deepEqual(missingFields(spec), ['Acceptance criteria item']);
        assert.equal(hasAcceptanceCriteriaItem(spec), false);
    });

    test('fails when required SPEC fields are missing', () => {
        const spec = COMPLETE_SPEC.replace('**Evidence plan:** Run the focused spec-gate tests.', '');
        assert.deepEqual(missingFields(spec), ['Evidence plan']);
    });
});

describe('spec-gate-bot issue flag validation', () => {
    test('accepts issue identifiers and UUIDs', () => {
        assert.doesNotThrow(() => validateIssueFlag('WEI-811'));
        assert.doesNotThrow(() => validateIssueFlag('wei-811'));
        assert.doesNotThrow(() => validateIssueFlag('c6e63dbe-a01a-45b0-be3d-bab79516e4f2'));
        assert.doesNotThrow(() => validateIssueFlag('C6E63DBE-A01A-45B0-BE3D-BAB79516E4F2'));
    });

    test('allows omitted issue values', () => {
        assert.doesNotThrow(() => validateIssueFlag(null));
        assert.doesNotThrow(() => validateIssueFlag(undefined));
    });

    test('rejects empty issue values', () => {
        assert.throws(
            () => validateIssueFlag(''),
            /Invalid --issue value/,
        );
    });

    test('rejects path-shaped issue values before API path construction', () => {
        assert.throws(
            () => validateIssueFlag('../WEI-811/comments'),
            /Invalid --issue value/,
        );
        assert.throws(
            () => validateIssueFlag('WEI-811/comments'),
            /Invalid --issue value/,
        );
    });
});
