import type { ReactElement } from 'react';

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
    return (
        <main className="min-h-screen bg-gray-950 text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="text-xs text-gray-500 mb-2">
                    project: <span className="font-mono">{projectId}</span>
                </div>
                <h2 className="text-xl font-semibold">{title}</h2>
            </div>
        </main>
    );
}
