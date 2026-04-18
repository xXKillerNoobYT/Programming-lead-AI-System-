'use strict';

// Auto-merge gate per D-20260418-006 (Issue #37 / EPIC #34).
// Policy: auto-merge a PR only if all five gates pass.

const GATE_IDS = [
    'tests-green',
    'no-blocker-review-findings',
    'no-open-silent-failures',
    'no-merge-conflicts',
    'issue-opted-in',
];

const AUTO_MERGE_LABEL = 'auto-merge:ok';

function evaluateGates(input) {
    const failures = [];

    if (input.testsGreen !== true) {
        failures.push({
            gate: 'tests-green',
            detail: 'test suite not reported green on PR branch',
        });
    }

    const blockers = (input.reviewFindings || []).filter(
        (f) => String(f.severity || '').toLowerCase() === 'blocker',
    );
    if (blockers.length > 0) {
        failures.push({
            gate: 'no-blocker-review-findings',
            detail: `${blockers.length} blocker review finding(s)`,
        });
    }

    const openSilent = (input.silentFailureFindings || []).filter(
        (f) => String(f.status || '').toLowerCase() === 'open',
    );
    if (openSilent.length > 0) {
        failures.push({
            gate: 'no-open-silent-failures',
            detail: `${openSilent.length} open silent-failure finding(s)`,
        });
    }

    if (input.mergeable !== 'MERGEABLE') {
        failures.push({
            gate: 'no-merge-conflicts',
            detail: `PR mergeable state is ${input.mergeable || 'MISSING'}; need MERGEABLE`,
        });
    }

    const labels = input.issueLabels || [];
    if (!labels.includes(AUTO_MERGE_LABEL)) {
        failures.push({
            gate: 'issue-opted-in',
            detail: `referenced Issue is missing the "${AUTO_MERGE_LABEL}" label`,
        });
    }

    return { pass: failures.length === 0, failures };
}

async function checkGates({ prNumber, issueNumber } = {}, deps = {}) {
    if (prNumber === undefined || prNumber === null) {
        throw new Error('checkGates: prNumber is required');
    }
    if (issueNumber === undefined || issueNumber === null) {
        throw new Error('checkGates: issueNumber is required');
    }

    const {
        fetchPRStatus = async () => ({ testsGreen: false, mergeable: 'UNKNOWN' }),
        fetchIssueLabels = async () => [],
        fetchReviewFindings = async () => [],
        fetchSilentFailureFindings = async () => [],
    } = deps;

    try {
        const [prStatus, issueLabels, reviewFindings, silentFailureFindings] =
            await Promise.all([
                fetchPRStatus({ prNumber }),
                fetchIssueLabels({ issueNumber }),
                fetchReviewFindings({ prNumber }),
                fetchSilentFailureFindings({ prNumber }),
            ]);

        return evaluateGates({
            testsGreen: prStatus.testsGreen,
            mergeable: prStatus.mergeable,
            issueLabels,
            reviewFindings,
            silentFailureFindings,
        });
    } catch (err) {
        return {
            pass: false,
            failures: [{
                gate: 'fetch-error',
                detail: `failed to fetch gate inputs: ${err.message}`,
            }],
        };
    }
}

module.exports = {
    GATE_IDS,
    AUTO_MERGE_LABEL,
    evaluateGates,
    checkGates,
};
