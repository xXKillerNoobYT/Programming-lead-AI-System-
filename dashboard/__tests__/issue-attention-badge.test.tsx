import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { IssueAttentionBadge } from '../app/_components/issues/IssueAttentionBadge';
import type {
    IssueAttentionReason,
    IssueAttentionState,
} from '../lib/issue-integrity';

const CASES: Array<{
    state: IssueAttentionState;
    reason: IssueAttentionReason;
    label: string;
    accessibilityText: string;
}> = [
    {
        state: 'none',
        reason: 'no_unresolved_blockers',
        label: 'No attention',
        accessibilityText: 'Issue attention: No attention. Reason: No unresolved blockers.',
    },
    {
        state: 'covered',
        reason: 'covered_dependency',
        label: 'Covered',
        accessibilityText: 'Issue attention: Covered. Reason: Covered dependency.',
    },
    {
        state: 'stalled',
        reason: 'stale_dependency',
        label: 'Stalled',
        accessibilityText: 'Issue attention: Stalled. Reason: Stale dependency.',
    },
    {
        state: 'needs_attention',
        reason: 'hard_blocker',
        label: 'Needs attention',
        accessibilityText: 'Issue attention: Needs attention. Reason: Hard blocker.',
    },
];

describe('canonical issue attention badge', () => {
    afterEach(cleanup);

    it.each(CASES)(
        'renders canonical $state with stable accessibility text',
        ({ state, reason, label, accessibilityText }) => {
            render(<IssueAttentionBadge state={state} reason={reason} />);

            const badge = screen.getByLabelText(accessibilityText);
            expect(badge).toHaveAttribute('data-attention-state', state);
            expect(badge).toHaveAttribute('data-attention-reason', reason);
            expect(badge).toHaveTextContent(label);
        },
    );
});
