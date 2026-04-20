import type { ReactElement, ReactNode } from 'react';
import { TopBar } from '../../../_components/TopBar';
import { LeftRail } from '../../../_components/LeftRail';
import { MainPanes } from '../../../_components/MainPanes';
import { CodingTabContent } from '../../../_components/coding/CodingTabContent';
import type { HandoffThreadData } from '../../../_components/coding/types';

const TAB_TITLES: Record<string, string> = {
    coding: 'Coding AI Relay',
    guidance: 'User Guidance',
    log: 'Execution Log',
};

/**
 * Mock handoff threads for Issue #145 / §D.3.a skeleton. Three threads
 * covering the main status variants (in_progress / done / blocked). Real
 * data flows in from a backbone WebSocket in a later leaf; per the Issue's
 * decision notes the mock lives inline rather than in a separate fixture.
 */
const MOCK_CODING_THREADS: HandoffThreadData[] = [
    {
        id: 'handoff-1',
        agent: 'RooCode',
        status: 'in_progress',
        headline: 'Decompose Issue #145 into atomic leaves',
        decisionId: 'D-20260419-031',
        issueNumber: 145,
        messages: [
            {
                timestamp: '2026-04-19T12:00:00Z',
                from: 'claude',
                to: 'roo',
                text: 'pick the first leaf and draft a test plan',
            },
            {
                timestamp: '2026-04-19T12:02:15Z',
                from: 'roo',
                to: 'claude',
                text: 'acknowledged; drafting TDD plan now',
            },
            {
                timestamp: '2026-04-19T12:05:40Z',
                from: 'roo',
                to: 'claude',
                text: 'plan ready — 11 Jest cases mirroring main-panes.test.tsx',
            },
        ],
    },
    {
        id: 'handoff-2',
        agent: 'Copilot',
        status: 'done',
        headline: 'Merge conflict cleanup on issue-127 branch',
        decisionId: 'D-20260419-030',
        issueNumber: 127,
        messages: [
            {
                timestamp: '2026-04-19T09:10:00Z',
                from: 'claude',
                to: 'copilot',
                text: 'rebase issue-127 onto origin/main',
            },
            {
                timestamp: '2026-04-19T09:12:30Z',
                from: 'copilot',
                to: 'claude',
                text: 'rebased; 2 trivial conflicts resolved in favor of main',
            },
        ],
    },
    {
        id: 'handoff-3',
        agent: 'Claude',
        status: 'blocked',
        headline: 'Dashboard coverage threshold writer needs decision',
        decisionId: 'D-20260419-028',
        issueNumber: 52,
        messages: [
            {
                timestamp: '2026-04-19T07:30:00Z',
                from: 'claude',
                to: 'self',
                text: 'need to know target coverage % — user design call',
            },
            {
                timestamp: '2026-04-19T07:31:45Z',
                from: 'claude',
                to: 'self',
                text: 'posted Q-20260419-002 in Dev-Q&A; moving to next leaf',
            },
        ],
    },
];

interface ProjectTabContentProps {
    projectId: string;
    tab: string;
}

export function ProjectTabContent({ projectId, tab }: ProjectTabContentProps): ReactElement {
    const title = TAB_TITLES[tab] ?? `Unknown tab: ${tab}`;

    let operator: ReactNode;
    if (tab === 'coding') {
        // Uncontrolled CodingTabContent: it owns its own Filters useState so
        // this parent can remain a server component.
        operator = (
            <div className="h-full flex flex-col">
                <div className="sr-only">
                    project: <span className="font-mono">{projectId}</span>
                </div>
                <CodingTabContent threads={MOCK_CODING_THREADS} />
            </div>
        );
    } else {
        operator = (
            <main className="h-full p-6">
                <div className="text-xs text-gray-500 mb-2">
                    project: <span className="font-mono">{projectId}</span>
                </div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-3 text-sm text-gray-400">
                    Operator pane (left, dense) — plans, logs, task queue land here.
                </p>
            </main>
        );
    }

    const conversational = (
        <div className="h-full p-4 text-sm">
            <h3 className="text-gray-200 font-semibold mb-2">AI guidance</h3>
            <p className="text-gray-400">
                Conversational pane (right) — Q&amp;A, context-sensitive assistance, and AI-action
                guidance land here. Chat UI ships in a later leaf.
            </p>
        </div>
    );
    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <TopBar projectId={projectId} tab={tab} />
            <div className="flex flex-1 min-h-0">
                <LeftRail projectId={projectId} activeTab={tab} />
                <MainPanes operator={operator} conversational={conversational} />
            </div>
        </div>
    );
}
