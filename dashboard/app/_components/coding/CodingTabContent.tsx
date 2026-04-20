'use client';

import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { FilterBar } from './FilterBar';
import { HandoffThread } from './HandoffThread';
import { InspectorPanel } from './InspectorPanel';
import {
    EMPTY_FILTERS,
    type Filters,
    type HandoffMessage,
    type HandoffThreadData,
} from './types';

/**
 * Issue #145 / Phase 3 §D.3.a — Coding tab skeleton.
 *
 * Composes FilterBar + the filtered list of HandoffThread cards. This is the
 * content of the operator pane when `tab === 'coding'`.
 *
 * Controlled / uncontrolled:
 *   - Tests exercise the controlled API (`filters` + `onFiltersChange`).
 *   - The Issue's integration note also allows uncontrolled use (omit both
 *     props) so `ProjectTabContent` can stay a server component and render
 *     `<CodingTabContent threads={MOCK} />` directly without a separate
 *     client wrapper. In uncontrolled mode we seed internal useState from
 *     `initialFilters` (or EMPTY_FILTERS) and own updates ourselves.
 *
 * Filter predicate:
 *   - Empty-string filter === match-any.
 *   - `agent`   : strict equality on thread.agent.
 *   - `status`  : strict equality on thread.status.
 *   - `search`  : case-insensitive substring match on headline + every
 *                 message.text.
 *   - `taskType`: STUB. HandoffThreadData has no taskType field today; the
 *                 UI dropdown renders & onChange works so we keep the URL-
 *                 serializable Filters shape, but this leaf does not filter
 *                 on it. A later leaf (planned §D.3.b+) will add taskType to
 *                 the data model and wire the predicate.
 */

export interface SelectedMessage {
    threadId: string;
    message: HandoffMessage;
}

interface CodingTabContentProps {
    threads: HandoffThreadData[];
    filters?: Filters;
    onFiltersChange?: (f: Filters) => void;
    initialFilters?: Filters;
    live?: boolean;
    /**
     * Issue #150 §D.3.b — inspector selection.
     *   - If `selectedMessage` is undefined → uncontrolled (internal useState).
     *   - If `selectedMessage` is passed (including `null`) → fully controlled;
     *     parent owns the value and `onSelectedMessageChange` notifies it.
     *
     * Mirrors the existing controlled/uncontrolled filters pattern above.
     */
    selectedMessage?: SelectedMessage | null;
    onSelectedMessageChange?: (next: SelectedMessage | null) => void;
    /**
     * Issue #167 §D.3.d — forwarded to every rendered HandoffThread. When
     * a thread's RelayFooter submits, the thread calls this with its own
     * id plus the user's text. When omitted (server-component caller),
     * RelayFooter still renders on in_progress threads but submits no-op.
     */
    onRelaySend?: (threadId: string, text: string) => void;
}

function matchesFilters(thread: HandoffThreadData, filters: Filters): boolean {
    if (filters.agent !== '' && thread.agent !== filters.agent) return false;
    if (filters.status !== '' && thread.status !== filters.status) return false;
    // taskType: stub — no-op until the data model gains a taskType field.
    if (filters.search !== '') {
        const needle = filters.search.toLowerCase();
        const haystack = [
            thread.headline,
            ...thread.messages.map((m) => m.text),
        ]
            .join('\n')
            .toLowerCase();
        if (!haystack.includes(needle)) return false;
    }
    return true;
}

export function CodingTabContent({
    threads,
    filters,
    onFiltersChange,
    initialFilters,
    live = false,
    selectedMessage,
    onSelectedMessageChange,
    onRelaySend,
}: CodingTabContentProps): ReactElement {
    const isFiltersControlled = filters !== undefined;
    const [internalFilters, setInternalFilters] = useState<Filters>(
        initialFilters ?? { ...EMPTY_FILTERS },
    );
    const activeFilters: Filters = isFiltersControlled ? filters : internalFilters;

    function handleFiltersChange(next: Filters): void {
        if (onFiltersChange) onFiltersChange(next);
        if (!isFiltersControlled) setInternalFilters(next);
    }

    // Inspector selection — mirrors the filters controlled/uncontrolled pattern.
    // NOTE: `undefined` means uncontrolled; `null` is a legal controlled value
    // meaning "no selection". We discriminate on `selectedMessage !== undefined`.
    const isSelectionControlled = selectedMessage !== undefined;
    const [internalSelected, setInternalSelected] =
        useState<SelectedMessage | null>(null);
    const activeSelection: SelectedMessage | null = isSelectionControlled
        ? selectedMessage
        : internalSelected;

    const handleMessageClick = useCallback(
        (threadId: string, message: HandoffMessage): void => {
            const next: SelectedMessage = { threadId, message };
            if (onSelectedMessageChange) onSelectedMessageChange(next);
            if (!isSelectionControlled) setInternalSelected(next);
        },
        [isSelectionControlled, onSelectedMessageChange],
    );

    const handleInspectorClose = useCallback((): void => {
        if (onSelectedMessageChange) onSelectedMessageChange(null);
        if (!isSelectionControlled) setInternalSelected(null);
    }, [isSelectionControlled, onSelectedMessageChange]);

    const visibleThreads = useMemo(
        () => threads.filter((t) => matchesFilters(t, activeFilters)),
        [threads, activeFilters],
    );

    return (
        // Using <section> (not <main>) because this component is rendered
        // INSIDE `MainPanes`'s <section role="region"> landmark. ARIA forbids
        // nesting <main> inside another landmark; there must be exactly one
        // <main> per page. The single top-level <main> is owned by the
        // project-page layout at app/projects/[projectId]/[tab]/layout.tsx
        // (added in Issue #146 §1).
        <section
            className="h-full flex flex-col"
            aria-label="Coding AI Relay"
        >
            <FilterBar
                filters={activeFilters}
                onChange={handleFiltersChange}
                live={live}
            />
            <div className="flex-1 min-h-0 flex overflow-hidden">
                <div className="flex-1 min-w-0 overflow-auto p-3 space-y-2">
                    <h2 className="sr-only">Coding AI Relay</h2>
                    {visibleThreads.length === 0 ? (
                        <p className="text-sm text-gray-400 py-8 text-center">
                            No handoffs match the current filters.
                        </p>
                    ) : (
                        visibleThreads.map((thread) => (
                            <HandoffThread
                                key={thread.id}
                                thread={thread}
                                onMessageClick={handleMessageClick}
                                onRelaySend={onRelaySend}
                            />
                        ))
                    )}
                </div>
                {activeSelection !== null ? (
                    <InspectorPanel
                        message={activeSelection.message}
                        threadId={activeSelection.threadId}
                        onClose={handleInspectorClose}
                    />
                ) : null}
            </div>
        </section>
    );
}
