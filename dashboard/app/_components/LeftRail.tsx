import type { ReactElement } from 'react';

interface LeftRailProps {
    projectId: string;
    activeTab: string;
}

interface RailEntry {
    key: string;
    label: string;
    icon: string;
    kind: 'tab' | 'meta';
}

const ENTRIES: RailEntry[] = [
    { key: 'coding', label: 'Coding', icon: '⌨', kind: 'tab' },
    { key: 'guidance', label: 'Guidance', icon: '💬', kind: 'tab' },
    { key: 'log', label: 'Log', icon: '📋', kind: 'tab' },
    { key: 'prefs', label: 'Prefs', icon: '⚙', kind: 'meta' },
    { key: 'soul', label: 'SOUL', icon: '🧠', kind: 'meta' },
    { key: 'help', label: 'Help', icon: '?', kind: 'meta' },
];

export function LeftRail({ projectId, activeTab }: LeftRailProps): ReactElement {
    return (
        <aside
            className="w-16 border-r border-gray-800 bg-gray-950 flex flex-col items-center py-2 gap-1"
            aria-label="project navigation"
        >
            {ENTRIES.map((entry) => {
                const isActive = entry.kind === 'tab' && entry.key === activeTab;
                const href =
                    entry.kind === 'tab'
                        ? `/projects/${projectId}/${entry.key}`
                        : `/projects/${projectId}/${entry.key}`;
                return (
                    <a
                        key={entry.key}
                        href={href}
                        aria-label={entry.label}
                        aria-current={isActive ? 'page' : undefined}
                        title={entry.label}
                        className={`w-12 h-12 rounded flex flex-col items-center justify-center text-[10px] gap-0.5 ${
                            isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                        }`}
                    >
                        <span aria-hidden className="text-base leading-none">
                            {entry.icon}
                        </span>
                        <span>{entry.label}</span>
                    </a>
                );
            })}
        </aside>
    );
}
