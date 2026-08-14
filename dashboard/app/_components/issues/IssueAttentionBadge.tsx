import type { ReactElement } from 'react';

import { cn } from '../../../lib/utils';
import {
    getIssueAttentionPresentation,
    type IssueAttentionReason,
    type IssueAttentionState,
} from '../../../lib/issue-integrity';

interface IssueAttentionBadgeProps {
    state: IssueAttentionState;
    reason: IssueAttentionReason;
}

const BASE_CLASSES =
    'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium';

export function IssueAttentionBadge({
    state,
    reason,
}: IssueAttentionBadgeProps): ReactElement {
    const presentation = getIssueAttentionPresentation(state, reason);
    return (
        <span
            role="status"
            aria-label={presentation.accessibilityText}
            className={cn(BASE_CLASSES, presentation.className)}
            data-attention-state={state}
            data-attention-reason={reason}
        >
            {presentation.label}
        </span>
    );
}
