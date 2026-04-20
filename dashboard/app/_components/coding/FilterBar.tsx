'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { cn } from '../../../lib/utils';
import type { Filters } from './types';

/**
 * Issue #145 / Phase 3 §D.3.a — Coding tab skeleton.
 *
 * Top-row controls above the HandoffThread list. Fully controlled:
 *   - Parent owns the Filters state.
 *   - Each widget emits an updated Filters object via onChange.
 *
 * No shadcn <Select/> yet (shadcn-Select install lands with the §D.3.b
 * inspector). For now we use native <select> + Tailwind for styling.
 *
 * Live indicator ("🔴 Live") is rendered only when `live === true`. It
 * signals a live WebSocket feed in future leaves; here it is a pure
 * presentational stub.
 */

interface FilterBarProps {
    filters: Filters;
    onChange: (next: Filters) => void;
    live: boolean;
}

const AGENT_OPTIONS = ['', 'RooCode', 'Copilot', 'Claude'];
const TASK_TYPE_OPTIONS = ['', 'feature', 'bug', 'refactor', 'docs'];
const STATUS_OPTIONS = ['', 'in_progress', 'done', 'blocked', 'failed'];

const SELECT_CLASSES =
    'bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500';

const INPUT_CLASSES = cn(SELECT_CLASSES, 'min-w-[10rem]');

export function FilterBar({ filters, onChange, live }: FilterBarProps): ReactElement {
    function update<K extends keyof Filters>(key: K, value: Filters[K]): void {
        onChange({ ...filters, [key]: value });
    }

    function onSelect<K extends keyof Filters>(key: K) {
        return (e: ChangeEvent<HTMLSelectElement>): void => {
            update(key, e.target.value as Filters[K]);
        };
    }

    return (
        <div
            role="toolbar"
            aria-label="handoff filters"
            className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-950 text-gray-100"
        >
            <label className="flex items-center gap-1 text-xs text-gray-400">
                <span>Agent</span>
                <select
                    aria-label="Agent"
                    className={SELECT_CLASSES}
                    value={filters.agent}
                    onChange={onSelect('agent')}
                >
                    {AGENT_OPTIONS.map((opt) => (
                        <option key={opt || '__all_agents__'} value={opt}>
                            {opt === '' ? 'All agents' : opt}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex items-center gap-1 text-xs text-gray-400">
                <span>Task type</span>
                <select
                    aria-label="Task type"
                    className={SELECT_CLASSES}
                    value={filters.taskType}
                    onChange={onSelect('taskType')}
                >
                    {TASK_TYPE_OPTIONS.map((opt) => (
                        <option key={opt || '__all_task_types__'} value={opt}>
                            {opt === '' ? 'All task types' : opt}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex items-center gap-1 text-xs text-gray-400">
                <span>Status</span>
                <select
                    aria-label="Status"
                    className={SELECT_CLASSES}
                    value={filters.status}
                    onChange={onSelect('status')}
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt || '__all_statuses__'} value={opt}>
                            {opt === '' ? 'All statuses' : opt}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex items-center gap-1 text-xs text-gray-400">
                <span className="sr-only">Search</span>
                <input
                    type="search"
                    aria-label="Search"
                    placeholder="Search handoffs..."
                    className={INPUT_CLASSES}
                    value={filters.search}
                    onChange={(e) => update('search', e.target.value)}
                />
            </label>

            {live ? (
                <span
                    aria-label="Live"
                    title="Live feed"
                    className="ml-auto inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-300"
                >
                    <span
                        aria-hidden
                        className="w-2 h-2 rounded-full bg-red-500 animate-pulse"
                    />
                    Live
                </span>
            ) : null}
        </div>
    );
}
