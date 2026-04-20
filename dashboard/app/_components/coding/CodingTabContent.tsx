'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { FilterBar } from './FilterBar';
import { HandoffThread } from './HandoffThread';
import { EMPTY_FILTERS, type Filters, type HandoffThreadData } from './types';

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

interface CodingTabContentProps {
    threads: HandoffThreadData[];
    filters?: Filters;
    onFiltersChange?: (f: Filters) => void;
    initialFilters?: Filters;
    live?: boolean;
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
}: CodingTabContentProps): ReactElement {
    const isControlled = filters !== undefined;
    const [internalFilters, setInternalFilters] = useState<Filters>(
        initialFilters ?? { ...EMPTY_FILTERS },
    );
    const activeFilters: Filters = isControlled ? filters : internalFilters;

    function handleFiltersChange(next: Filters): void {
        if (onFiltersChange) onFiltersChange(next);
        if (!isControlled) setInternalFilters(next);
    }

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
            <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2">
                <h2 className="sr-only">Coding AI Relay</h2>
                {visibleThreads.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">
                        No handoffs match the current filters.
                    </p>
                ) : (
                    visibleThreads.map((thread) => (
                        <HandoffThread key={thread.id} thread={thread} />
                    ))
                )}
            </div>
        </section>
    );
}
