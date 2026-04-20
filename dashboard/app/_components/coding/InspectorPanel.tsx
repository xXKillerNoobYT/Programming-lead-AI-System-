'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect } from 'react';
import type { HandoffMessage } from './types';

/**
 * Issue #150 / Phase 3 §D.3.b — Coding-tab inspector panel (skeleton).
 *
 * Fixed-width (w-80 = 320 px) right-side panel rendered next to the thread
 * list when a `HandoffMessage` is selected. V1 is deliberately a skeleton:
 *   - Body: pretty-printed JSON via `<pre>{JSON.stringify(...)}</pre>`.
 *     A tree widget / diff view / VS Code jump-links are explicitly deferred
 *     to later leaves.
 *   - Footer: a "Copy JSON" button that writes the pretty-printed JSON to
 *     the clipboard via `navigator.clipboard.writeText`. When the clipboard
 *     API is unavailable (older browsers, jsdom without polyfill), the click
 *     is a graceful no-op — never throws.
 *   - Escape key closes the inspector (document-level listener, cleaned up
 *     on unmount so we don't swallow Escape when nothing is inspected).
 *   - Empty-payload guard: when `message.text` is an empty string, the body
 *     renders "No payload" instead of serializing a near-empty struct.
 */

interface InspectorPanelProps {
    message: HandoffMessage;
    threadId: string;
    onClose: () => void;
}

function copyToClipboard(text: string): void {
    // Guard on both `navigator` (SSR safety) and `navigator.clipboard`
    // (older browsers / test env without polyfill). Any rejection from the
    // underlying writeText promise is swallowed so a transient clipboard
    // denial can't crash the UI.
    if (typeof navigator === 'undefined') return;
    const clipboard = navigator.clipboard as
        | { writeText?: (s: string) => Promise<void> | void }
        | undefined;
    if (!clipboard || typeof clipboard.writeText !== 'function') return;
    try {
        const result = clipboard.writeText(text);
        if (result && typeof (result as Promise<void>).catch === 'function') {
            (result as Promise<void>).catch(() => {
                /* graceful no-op on permission / transient failures */
            });
        }
    } catch {
        /* graceful no-op */
    }
}

export function InspectorPanel({
    message,
    threadId,
    onClose,
}: InspectorPanelProps): ReactElement {
    // Escape closes. Document-level listener only exists while mounted so we
    // don't steal Escape from other components when the inspector is hidden.
    useEffect(() => {
        function onKeyDown(ev: KeyboardEvent): void {
            if (ev.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const hasPayload = message.text !== '';
    const prettyJson = hasPayload ? JSON.stringify(message, null, 2) : '';

    const handleCopy = useCallback(() => {
        if (!hasPayload) return;
        copyToClipboard(prettyJson);
    }, [hasPayload, prettyJson]);

    // Header title: use the first ~80 chars of the message text as a summary.
    // (The parent passes the selection context via threadId for later leaves
    // that will surface "Thread: foo → bar" etc.; for now we keep it simple.)
    const headerTitle = hasPayload
        ? truncate(message.text, 80)
        : `(empty message from ${message.from})`;

    return (
        <aside
            role="dialog"
            aria-label="Message inspector"
            aria-describedby={`inspector-body-${threadId}`}
            className="w-80 shrink-0 border-l border-gray-800 bg-gray-950 text-gray-100 flex flex-col h-full"
            data-testid="inspector-panel"
            data-thread-id={threadId}
        >
            <header className="flex items-center gap-2 border-b border-gray-800 px-3 py-2">
                <h3
                    className="flex-1 min-w-0 truncate text-sm font-medium text-gray-100"
                    title={message.text || undefined}
                >
                    {headerTitle}
                </h3>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close inspector"
                    className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <span aria-hidden>×</span>
                </button>
            </header>

            <div
                id={`inspector-body-${threadId}`}
                className="flex-1 min-h-0 overflow-auto px-3 py-2 text-xs font-mono text-gray-200"
            >
                {hasPayload ? (
                    <pre
                        data-testid="inspector-payload"
                        className="whitespace-pre-wrap break-words"
                    >
                        {prettyJson}
                    </pre>
                ) : (
                    <p className="text-gray-400 italic">No payload</p>
                )}
            </div>

            <footer className="border-t border-gray-800 px-3 py-2 flex justify-end">
                <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!hasPayload}
                    className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-100 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    Copy JSON
                </button>
            </footer>
        </aside>
    );
}

function truncate(s: string, max: number): string {
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1)}…`;
}
