import type { ReactElement } from 'react';

interface TopBarProps {
    projectId: string;
    tab: string;
}

export function TopBar({ projectId, tab }: TopBarProps): ReactElement {
    return (
        <header
            className="h-12 border-b border-gray-800 bg-gray-950 text-gray-100 flex items-center px-3 gap-2 text-sm"
            role="banner"
        >
            <button
                type="button"
                aria-label="project switcher"
                className="px-2 py-1 rounded hover:bg-gray-800 font-mono text-xs"
            >
                {projectId} ▾
            </button>

            <nav aria-label="breadcrumb" className="text-gray-400 flex items-center gap-1">
                <span className="font-mono">{projectId}</span>
                <span aria-hidden>/</span>
                <span className="text-gray-100">{tab}</span>
            </nav>

            <div className="ml-auto flex items-center gap-1">
                <span
                    aria-label="heartbeat status"
                    title="heartbeat idle (stub)"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-900"
                >
                    <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
                    <span className="text-xs text-gray-400">idle</span>
                </span>

                <button
                    type="button"
                    aria-label="pause heartbeat"
                    className="px-2 py-1 rounded hover:bg-gray-800"
                    title="pause heartbeat (stub)"
                >
                    ⏸
                </button>

                <button
                    type="button"
                    aria-label="command palette ⌘K"
                    className="px-2 py-1 rounded hover:bg-gray-800 text-xs font-mono"
                    title="open command palette (stub)"
                >
                    ⌘K
                </button>

                <button
                    type="button"
                    aria-label="avatar menu"
                    className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xs"
                    title="account menu (stub)"
                >
                    DL
                </button>
            </div>
        </header>
    );
}
