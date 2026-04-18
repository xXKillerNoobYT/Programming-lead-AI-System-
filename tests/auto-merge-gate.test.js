'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
    evaluateGates,
    checkGates,
    GATE_IDS,
} = require('../scripts/auto-merge-gate.js');

function baseInput(overrides = {}) {
    return {
        testsGreen: true,
        mergeable: 'MERGEABLE',
        issueLabels: ['auto-merge:ok'],
        reviewFindings: [],
        silentFailureFindings: [],
        ...overrides,
    };
}

describe('evaluateGates', () => {
    test('all five gates pass → pass=true, failures=[]', () => {
        const r = evaluateGates(baseInput());
        assert.equal(r.pass, true);
        assert.deepEqual(r.failures, []);
    });

    test('GATE_IDS exports the five canonical gate ids', () => {
        assert.deepEqual(GATE_IDS, [
            'tests-green',
            'no-blocker-review-findings',
            'no-open-silent-failures',
            'no-merge-conflicts',
            'issue-opted-in',
        ]);
    });

    test('tests not green → failure on gate 1', () => {
        const r = evaluateGates(baseInput({ testsGreen: false }));
        assert.equal(r.pass, false);
        assert.ok(r.failures.some((f) => f.gate === 'tests-green'));
    });

    test('tests green missing (undefined) is a hard fail, not pass-through', () => {
        const r = evaluateGates(baseInput({ testsGreen: undefined }));
        assert.equal(r.pass, false);
        assert.ok(r.failures.some((f) => f.gate === 'tests-green'));
    });

    test('blocker review finding → failure on gate 2', () => {
        const r = evaluateGates(baseInput({
            reviewFindings: [{ severity: 'blocker', title: 'secret in diff' }],
        }));
        assert.equal(r.pass, false);
        const f = r.failures.find((x) => x.gate === 'no-blocker-review-findings');
        assert.ok(f);
        assert.match(f.detail, /blocker/i);
    });

    test('major / minor review findings do NOT block', () => {
        const r = evaluateGates(baseInput({
            reviewFindings: [
                { severity: 'major', title: 'naming nit' },
                { severity: 'minor', title: 'comment polish' },
            ],
        }));
        assert.equal(r.pass, true);
    });

    test('open silent-failure finding → failure on gate 3', () => {
        const r = evaluateGates(baseInput({
            silentFailureFindings: [{ status: 'open', title: 'swallowed throw' }],
        }));
        assert.equal(r.pass, false);
        assert.ok(r.failures.some((f) => f.gate === 'no-open-silent-failures'));
    });

    test('resolved silent-failure findings do NOT block', () => {
        const r = evaluateGates(baseInput({
            silentFailureFindings: [{ status: 'resolved', title: 'fixed' }],
        }));
        assert.equal(r.pass, true);
    });

    test('mergeable=CONFLICTING → failure on gate 4', () => {
        const r = evaluateGates(baseInput({ mergeable: 'CONFLICTING' }));
        assert.equal(r.pass, false);
        assert.ok(r.failures.some((f) => f.gate === 'no-merge-conflicts'));
    });

    test('mergeable=UNKNOWN → failure on gate 4 (err on the side of blocking)', () => {
        const r = evaluateGates(baseInput({ mergeable: 'UNKNOWN' }));
        assert.equal(r.pass, false);
        assert.ok(r.failures.some((f) => f.gate === 'no-merge-conflicts'));
    });

    test('missing auto-merge:ok label → failure on gate 5', () => {
        const r = evaluateGates(baseInput({ issueLabels: ['status:in-progress'] }));
        assert.equal(r.pass, false);
        assert.ok(r.failures.some((f) => f.gate === 'issue-opted-in'));
    });

    test('empty issueLabels → failure on gate 5', () => {
        const r = evaluateGates(baseInput({ issueLabels: [] }));
        assert.equal(r.pass, false);
        assert.ok(r.failures.some((f) => f.gate === 'issue-opted-in'));
    });

    test('multiple simultaneous failures surface all of them', () => {
        const r = evaluateGates({
            testsGreen: false,
            mergeable: 'CONFLICTING',
            issueLabels: [],
            reviewFindings: [{ severity: 'blocker' }],
            silentFailureFindings: [{ status: 'open' }],
        });
        assert.equal(r.pass, false);
        assert.equal(r.failures.length, 5);
        const gates = r.failures.map((f) => f.gate).sort();
        assert.deepEqual(gates, [
            'issue-opted-in',
            'no-blocker-review-findings',
            'no-merge-conflicts',
            'no-open-silent-failures',
            'tests-green',
        ]);
    });

    test('case-insensitive severity comparison for review findings', () => {
        const r = evaluateGates(baseInput({
            reviewFindings: [{ severity: 'BLOCKER' }],
        }));
        assert.equal(r.pass, false);
    });

    test('input with extra fields is tolerated', () => {
        const r = evaluateGates(baseInput({ foo: 'bar', nested: { a: 1 } }));
        assert.equal(r.pass, true);
    });

    test('failure objects carry gate id + detail string', () => {
        const r = evaluateGates(baseInput({ testsGreen: false }));
        const f = r.failures[0];
        assert.equal(typeof f.gate, 'string');
        assert.equal(typeof f.detail, 'string');
        assert.ok(f.detail.length > 0);
    });
});

describe('checkGates (async wrapper)', () => {
    test('happy path: deps resolve → pass=true', async () => {
        const deps = {
            fetchPRStatus: async ({ prNumber }) => {
                assert.equal(prNumber, 42);
                return { testsGreen: true, mergeable: 'MERGEABLE' };
            },
            fetchIssueLabels: async ({ issueNumber }) => {
                assert.equal(issueNumber, 7);
                return ['auto-merge:ok'];
            },
            fetchReviewFindings: async () => [],
            fetchSilentFailureFindings: async () => [],
        };
        const r = await checkGates({ prNumber: 42, issueNumber: 7 }, deps);
        assert.equal(r.pass, true);
        assert.deepEqual(r.failures, []);
    });

    test('failing deps propagate to failures', async () => {
        const deps = {
            fetchPRStatus: async () => ({ testsGreen: false, mergeable: 'MERGEABLE' }),
            fetchIssueLabels: async () => [],
            fetchReviewFindings: async () => [],
            fetchSilentFailureFindings: async () => [],
        };
        const r = await checkGates({ prNumber: 1, issueNumber: 2 }, deps);
        assert.equal(r.pass, false);
        const gates = r.failures.map((f) => f.gate).sort();
        assert.deepEqual(gates, ['issue-opted-in', 'tests-green']);
    });

    test('requires prNumber and issueNumber', async () => {
        await assert.rejects(
            () => checkGates({}, { fetchPRStatus: async () => ({}) }),
            /prNumber/,
        );
        await assert.rejects(
            () => checkGates({ prNumber: 1 }, {}),
            /issueNumber/,
        );
    });

    test('dep failures surface as a synthetic gate failure, not a throw', async () => {
        const deps = {
            fetchPRStatus: async () => { throw new Error('network down'); },
            fetchIssueLabels: async () => ['auto-merge:ok'],
            fetchReviewFindings: async () => [],
            fetchSilentFailureFindings: async () => [],
        };
        const r = await checkGates({ prNumber: 1, issueNumber: 2 }, deps);
        assert.equal(r.pass, false);
        const f = r.failures.find((x) => x.gate === 'fetch-error');
        assert.ok(f);
        assert.match(f.detail, /network down/);
    });
});
