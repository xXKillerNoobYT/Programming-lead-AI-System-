export const ISSUE_ATTENTION_STATES = [
    'none',
    'covered',
    'stalled',
    'needs_attention',
] as const;

export type IssueAttentionState = (typeof ISSUE_ATTENTION_STATES)[number];

export const ISSUE_ATTENTION_REASONS = [
    'no_unresolved_blockers',
    'covered_dependency',
    'stale_dependency',
    'hard_blocker',
] as const;

export type IssueAttentionReason = (typeof ISSUE_ATTENTION_REASONS)[number];

export interface IssueSourceWatermarkDto {
    sourceKind: 'paperclip' | 'github';
    scopeKey: string;
    cursor: string;
    observedAt: string;
    snapshotDigest: string;
}

export interface IssueAttentionDto {
    state: IssueAttentionState;
    reason: IssueAttentionReason;
    unresolvedBlockerCount: number;
    coveredBlockerCount: number;
    stalledBlockerCount: number;
    attentionBlockerCount: number;
    sampleBlockerIdentifier: string | null;
    sampleStalledBlockerIdentifier: string | null;
    evaluatedAt: string;
    staleSinceAt: string | null;
    policyVersion: string;
    sourceWatermark: IssueSourceWatermarkDto;
}

export interface IssueIntegrityProjectionDto {
    schemaVersion: number;
    policyVersion: string;
    issue: {
        issueKey: string;
        sourceKind: 'paperclip' | 'github';
        scopeKey: string;
        sourceIssueId: string;
        identifier: string;
        title: string;
        operationalStatus: string;
        createdAt: string;
        updatedAt: string;
    };
    lifecycle: {
        state: 'investigating' | 'fix_applied' | 'pending_data' | 'probation' | 'verified' | 'done';
        closeAllowed: boolean;
        reasons: string[];
    };
    attention: IssueAttentionDto;
    recurrence: {
        familyId: string | null;
        candidates: unknown[];
    };
    evaluatedAt: string;
    sourceWatermark: IssueSourceWatermarkDto;
}

export interface IssueIntegrityListEnvelopeDto {
    schemaVersion: number;
    policyVersion: string;
    evaluatedAt: string;
    sourceWatermark: IssueSourceWatermarkDto;
    items: IssueIntegrityProjectionDto[];
}

export interface IssueAttentionPresentation {
    label: string;
    reasonLabel: string;
    accessibilityText: string;
    className: string;
}

const STATE_PRESENTATION: Record<
    IssueAttentionState,
    Pick<IssueAttentionPresentation, 'label' | 'className'>
> = {
    none: {
        label: 'No attention',
        className: 'border-gray-600/40 bg-gray-600/20 text-gray-300',
    },
    covered: {
        label: 'Covered',
        className: 'border-blue-500/40 bg-blue-500/20 text-blue-300',
    },
    stalled: {
        label: 'Stalled',
        className: 'border-orange-500/40 bg-orange-500/20 text-orange-300',
    },
    needs_attention: {
        label: 'Needs attention',
        className: 'border-red-500/40 bg-red-500/20 text-red-300',
    },
};

const REASON_LABELS: Record<IssueAttentionReason, string> = {
    no_unresolved_blockers: 'No unresolved blockers',
    covered_dependency: 'Covered dependency',
    stale_dependency: 'Stale dependency',
    hard_blocker: 'Hard blocker',
};

export function getIssueAttentionPresentation(
    state: IssueAttentionState,
    reason: IssueAttentionReason,
): IssueAttentionPresentation {
    const statePresentation = STATE_PRESENTATION[state];
    const reasonLabel = REASON_LABELS[reason];
    return {
        ...statePresentation,
        reasonLabel,
        accessibilityText: `Issue attention: ${statePresentation.label}. Reason: ${reasonLabel}.`,
    };
}
