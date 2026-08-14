import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CodingTabContent } from '../app/_components/coding/CodingTabContent';
import type { HandoffThreadData } from '../app/_components/coding/types';
import { IssueIntegrityPanel } from '../app/_components/issues/IssueIntegrityPanel';
import type { IssueIntegrityProjectionDto } from '../lib/issue-integrity';

const fixture = JSON.parse(
    readFileSync(
        join(process.cwd(), '..', 'tests', 'fixtures', 'long-horizon', 'blocked-chain-8d.json'),
        'utf8',
    ),
);

const STALLED_PROJECTION: IssueIntegrityProjectionDto = {
    schemaVersion: 1,
    policyVersion: fixture.policy.policyVersion,
    issue: {
        issueKey: fixture.issue.issueKey,
        sourceKind: fixture.issue.sourceKind,
        scopeKey: fixture.issue.scopeKey,
        sourceIssueId: fixture.issue.sourceIssueId,
        identifier: fixture.issue.identifier,
        title: fixture.issue.title,
        operationalStatus: fixture.issue.operationalStatus,
        createdAt: fixture.issue.createdAt,
        updatedAt: fixture.issue.updatedAt,
    },
    lifecycle: {
        state: 'verified',
        closeAllowed: true,
        reasons: [],
    },
    attention: {
        ...fixture.expected.attention,
        sourceWatermark: fixture.sourceWatermark,
    },
    recurrence: {
        familyId: null,
        candidates: [],
    },
    evaluatedAt: fixture.expected.attention.evaluatedAt,
    sourceWatermark: fixture.sourceWatermark,
};

const IN_PROGRESS_HANDOFF: HandoffThreadData = {
    id: 'handoff-distinct-status',
    agent: 'Claude',
    status: 'in_progress',
    headline: 'Continue implementation handoff',
    messages: [
        {
            timestamp: '2026-08-11T00:00:00.000Z',
            from: 'claude',
            to: 'self',
            text: 'handoff remains active',
        },
    ],
};

describe('canonical issue integrity panel', () => {
    afterEach(cleanup);

    it('renders the 8-day fixture canonical state and metadata without local date math', () => {
        render(<IssueIntegrityPanel projection={STALLED_PROJECTION} />);

        const panel = screen.getByRole('region', { name: 'Issue integrity for DEMO-42' });
        expect(
            within(panel).getByLabelText('Issue attention: Stalled. Reason: Stale dependency.'),
        ).toBeInTheDocument();
        expect(within(panel).getByText('stale_dependency')).toBeInTheDocument();
        expect(within(panel).getByText('2026-08-11T00:00:00.000Z', {
            selector: '[data-evaluated-at]',
        })).toHaveAttribute('datetime', '2026-08-11T00:00:00.000Z');
        expect(within(panel).getByText('2026-08-06T00:00:00.000Z')).toHaveAttribute(
            'datetime',
            '2026-08-06T00:00:00.000Z',
        );
        expect(within(panel).getByText('issue-integrity-v1')).toBeInTheDocument();
        expect(within(panel).getByText('2026-08-11T00:00:00.000Z', {
            selector: '[data-watermark-observed-at]',
        })).toHaveAttribute('datetime', '2026-08-11T00:00:00.000Z');
    });

    it('keeps handoff thread status distinct from canonical issue attention', () => {
        render(
            <CodingTabContent
                threads={[IN_PROGRESS_HANDOFF]}
                integrityItems={[STALLED_PROJECTION]}
            />,
        );

        expect(
            screen.getByLabelText('Issue attention: Stalled. Reason: Stale dependency.'),
        ).toBeInTheDocument();
        const handoff = screen.getByTestId('handoff-thread-handoff-distinct-status');
        expect(within(handoff).getByText('in_progress')).toBeInTheDocument();
        expect(handoff).not.toHaveAttribute('data-attention-state');
    });
});
