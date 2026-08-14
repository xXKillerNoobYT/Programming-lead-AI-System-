import type { ReactElement } from 'react';

import {
    getIssueAttentionPresentation,
    type IssueIntegrityProjectionDto,
} from '../../../lib/issue-integrity';
import { IssueAttentionBadge } from './IssueAttentionBadge';

interface IssueIntegrityPanelProps {
    projection: IssueIntegrityProjectionDto;
}

export function IssueIntegrityPanel({
    projection,
}: IssueIntegrityPanelProps): ReactElement {
    const { issue, attention, sourceWatermark } = projection;
    const presentation = getIssueAttentionPresentation(attention.state, attention.reason);

    return (
        <section
            aria-label={`Issue integrity for ${issue.identifier}`}
            className="rounded-md border border-gray-800 bg-gray-900/60 p-3"
            data-issue-key={issue.issueKey}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-mono text-xs text-gray-500">{issue.identifier}</p>
                    <h3 className="truncate text-sm font-semibold text-gray-100">
                        {issue.title}
                    </h3>
                </div>
                <IssueAttentionBadge state={attention.state} reason={attention.reason} />
            </div>

            <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                <div>
                    <dt className="text-gray-500">Canonical reason</dt>
                    <dd className="text-gray-200">
                        <span className="sr-only">{presentation.reasonLabel}: </span>
                        <code>{attention.reason}</code>
                    </dd>
                </div>
                <div>
                    <dt className="text-gray-500">Evaluated at</dt>
                    <dd className="font-mono text-gray-200">
                        <time dateTime={attention.evaluatedAt} data-evaluated-at>
                            {attention.evaluatedAt}
                        </time>
                    </dd>
                </div>
                <div>
                    <dt className="text-gray-500">Stale since</dt>
                    <dd className="font-mono text-gray-200">
                        {attention.staleSinceAt ? (
                            <time dateTime={attention.staleSinceAt}>
                                {attention.staleSinceAt}
                            </time>
                        ) : (
                            'Not stale'
                        )}
                    </dd>
                </div>
                <div>
                    <dt className="text-gray-500">Policy version</dt>
                    <dd className="font-mono text-gray-200">{attention.policyVersion}</dd>
                </div>
                <div className="sm:col-span-2">
                    <dt className="text-gray-500">Watermark observed</dt>
                    <dd className="font-mono text-gray-200">
                        <time
                            dateTime={sourceWatermark.observedAt}
                            data-watermark-observed-at
                        >
                            {sourceWatermark.observedAt}
                        </time>
                    </dd>
                </div>
            </dl>
        </section>
    );
}
