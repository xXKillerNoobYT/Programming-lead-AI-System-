import type { ReactElement } from 'react';
import { TopBar } from '../../../_components/TopBar';
import { LeftRail } from '../../../_components/LeftRail';
import { MainPanes } from '../../../_components/MainPanes';

const TAB_TITLES: Record<string, string> = {
    coding: 'Coding AI Relay',
    guidance: 'User Guidance',
    log: 'Execution Log',
};

interface ProjectTabContentProps {
    projectId: string;
    tab: string;
}

export function ProjectTabContent({ projectId, tab }: ProjectTabContentProps): ReactElement {
    const title = TAB_TITLES[tab] ?? `Unknown tab: ${tab}`;
    const operator = (
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
