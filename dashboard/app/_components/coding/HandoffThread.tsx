'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { cn } from '../../../lib/utils';
import { AgentBadge } from './AgentBadge';
import type { HandoffMessage, HandoffThreadData, ThreadStatus } from './types';

/**
 * Issue #145 / Phase 3 §D.3.a — Coding tab skeleton.
 * Issue #150 / Phase 3 §D.3.b — added optional onMessageClick so each
 * message line becomes a <button> that opens the inspector panel.
 *
 * A single handoff thread card. Collapsed view: one-line summary with
 * headline + agent badge + status. Expanded view: summary + full ordered
 * message list.
 *
 * Controlled vs uncontrolled:
 *   - If `expanded` prop is undefined → uncontrolled. Internal useState seeded
 *     from `thread.status` (default collapsed only for 'done').
 *   - If `expanded` prop is defined → fully controlled by the parent; the
 *     internal state is bypassed and clicks delegate to onToggle.
 *
 * Click on the header calls `onToggle` if provided; falls back to updating
 * internal state when uncontrolled.
 *
 * onMessageClick (optional): when provided, each rendered message line is a
 * native <button type="button"> so keyboard Enter/Space work for free. When
 * omitted (existing callers, storybook stubs) messages render as plain <div>s
 * exactly as before — no existing render path breaks.
 */

interface HandoffThreadProps {
    thread: HandoffThreadData;
    expanded?: boolean;
    onToggle?: () => void;
    onMessageClick?: (threadId: string, message: HandoffMessage) => void;
}

const STATUS_CLASSES: Record<ThreadStatus, string> = {
    in_progress: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    done: 'bg-gray-600/20 text-gray-400 border-gray-600/40',
    blocked: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    failed: 'bg-red-500/20 text-red-300 border-red-500/40',
};

function defaultExpandedFor(status: ThreadStatus): boolean {
    // Collapsed when 'done', expanded for every other (still-active) status.
    return status !== 'done';
}

export function HandoffThread({
    thread,
    expanded,
    onToggle,
    onMessageClick,
}: HandoffThreadProps): ReactElement {
    const isControlled = expanded !== undefined;
    const [internalExpanded, setInternalExpanded] = useState<boolean>(
        defaultExpandedFor(thread.status),
    );
    const isExpanded = isControlled ? expanded : internalExpanded;

    function handleToggle(): void {
        if (onToggle) {
            onToggle();
            return;
        }
        if (!isControlled) {
            setInternalExpanded((prev) => !prev);
        }
    }

    const statusClass = STATUS_CLASSES[thread.status];

    return (
        <article
            className="rounded-md border border-gray-800 bg-gray-900/40 overflow-hidden"
            data-testid={`handoff-thread-${thread.id}`}
        >
            <button
                type="button"
                onClick={handleToggle}
                aria-expanded={isExpanded}
                aria-controls={`handoff-thread-body-${thread.id}`}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-100 hover:bg-gray-800/60"
            >
                <span
                    aria-hidden
                    className="text-xs text-gray-500 font-mono w-3 inline-block"
                >
                    {isExpanded ? '▾' : '▸'}
                </span>
                <span className="flex-1 min-w-0 truncate font-medium">
                    {thread.headline}
                </span>
                <AgentBadge agent={thread.agent} />
                <span
                    className={cn(
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                        statusClass,
                    )}
                >
                    {thread.status}
                </span>
                {thread.issueNumber !== undefined ? (
                    <span className="text-xs font-mono text-gray-500">
                        #{thread.issueNumber}
                    </span>
                ) : null}
            </button>

            {isExpanded ? (
                <ol
                    id={`handoff-thread-body-${thread.id}`}
                    className="border-t border-gray-800 bg-gray-950/40 divide-y divide-gray-800"
                >
                    {thread.messages.map((msg, idx) => {
                        const body = (
                            <>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                    <span>{msg.timestamp}</span>
                                    <span aria-hidden>·</span>
                                    <span>
                                        {msg.from} → {msg.to}
                                    </span>
                                </div>
                                <p className="mt-1 whitespace-pre-wrap text-gray-200 text-xs leading-snug">
                                    {msg.text}
                                </p>
                            </>
                        );
                        return (
                            <li
                                key={`${thread.id}-msg-${idx}`}
                                className="text-xs text-gray-200"
                            >
                                {onMessageClick ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onMessageClick(thread.id, msg)
                                        }
                                        className="block w-full text-left px-3 py-2 cursor-pointer hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:ring-inset"
                                    >
                                        {body}
                                    </button>
                                ) : (
                                    <div className="px-3 py-2">{body}</div>
                                )}
                            </li>
                        );
                    })}
                </ol>
            ) : null}
        </article>
    );
}
