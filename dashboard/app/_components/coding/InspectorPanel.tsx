'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandoffMessage } from './types';

/**
 * Issue #150 / Phase 3 §D.3.b — Coding-tab inspector panel (skeleton).
 * Issue #152 / Phase 3 §D.3.b — polish: dialog focus management + copy feedback.
 *
 * Fixed-width (w-80 = 320 px) right-side panel rendered next to the thread
 * list when a `HandoffMessage` is selected. V1 is deliberately a skeleton:
 *   - Body: pretty-printed JSON via `<pre>{JSON.stringify(...)}</pre>`.
 *     A tree widget / diff view / VS Code jump-links are explicitly deferred
 *     to later leaves.
 *   - Footer: a "Copy JSON" button that writes the pretty-printed JSON to
 *     the clipboard via `navigator.clipboard.writeText`. When the clipboard
 *     API is unavailable (older browsers, jsdom without polyfill), the click
 *     surfaces an inline "Copy failed" status so the user isn't left guessing.
 *     On success an inline "Copied ✓" status appears for ~2 s.
 *   - Escape key closes the inspector (document-level listener, cleaned up
 *     on unmount so we don't swallow Escape when nothing is inspected).
 *   - Empty-payload guard: when `message.text` is an empty string, the body
 *     renders "No payload" instead of serializing a near-empty struct.
 *
 * Focus management (Issue #152 §1):
 *   - On mount, keyboard focus moves to the close button so Escape / Shift-Tab
 *     are immediately available without hunting.
 *   - On unmount, focus is restored to whatever element was active at mount
 *     time (typically the <button> message line that opened the inspector in
 *     `HandoffThread`). The restore runs in the mount-effect's cleanup, which
 *     fires when `CodingTabContent` switches `activeSelection` to null (i.e.
 *     unmounts the inspector). This is simpler than prop-drilling a ref back
 *     up to the parent.
 */

interface InspectorPanelProps {
    message: HandoffMessage;
    threadId: string;
    onClose: () => void;
}

type CopyStatus = 'idle' | 'copied' | 'failed';

/** How long the "Copied ✓" / "Copy failed" status is visible before resetting. */
const COPY_STATUS_RESET_MS = 2000;

export function InspectorPanel({
    message,
    threadId,
    onClose,
}: InspectorPanelProps): ReactElement {
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

    // Focus-on-mount + restore-on-unmount. Single effect keyed to [] so it
    // runs exactly once per mount; the cleanup re-focuses the element that
    // owned focus when the inspector opened (typically the originating
    // HandoffThread message button).
    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        closeBtnRef.current?.focus();
        return () => {
            // Guard: if the element was detached (or was <body>), this is a
            // cheap no-op. `focus` on <body> is harmless but pointless — the
            // browser already defaults there when no other element is active.
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }, []);

    // Escape closes. Document-level listener only exists while mounted so we
    // don't steal Escape from other components when the inspector is hidden.
    useEffect(() => {
        function onKeyDown(ev: KeyboardEvent): void {
            if (ev.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    // Clear any pending copy-status reset timer on unmount so the setter is
    // never called on an unmounted component (avoids the React dev warning
    // and any state-after-unmount noise).
    useEffect(() => {
        return () => {
            if (copyResetTimerRef.current !== null) {
                clearTimeout(copyResetTimerRef.current);
                copyResetTimerRef.current = null;
            }
        };
    }, []);

    const hasPayload = message.text !== '';
    const prettyJson = hasPayload ? JSON.stringify(message, null, 2) : '';

    const scheduleCopyStatusReset = useCallback((): void => {
        // Replace any in-flight reset so rapid repeat clicks don't leak
        // stacked timers (each press restarts the ~2 s idle countdown).
        if (copyResetTimerRef.current !== null) {
            clearTimeout(copyResetTimerRef.current);
        }
        copyResetTimerRef.current = setTimeout(() => {
            copyResetTimerRef.current = null;
            setCopyStatus('idle');
        }, COPY_STATUS_RESET_MS);
    }, []);

    const handleCopy = useCallback((): void => {
        if (!hasPayload) return;
        // Guard on both `navigator` (SSR safety) and `navigator.clipboard`
        // (older browsers / test env without polyfill). Surfaces a "Copy
        // failed" status in any branch where writeText cannot be invoked.
        if (typeof navigator === 'undefined') {
            setCopyStatus('failed');
            scheduleCopyStatusReset();
            return;
        }
        const clipboard = navigator.clipboard as
            | { writeText?: (s: string) => Promise<void> | void }
            | undefined;
        if (!clipboard || typeof clipboard.writeText !== 'function') {
            setCopyStatus('failed');
            scheduleCopyStatusReset();
            return;
        }
        try {
            const result = clipboard.writeText(prettyJson);
            if (result && typeof (result as Promise<void>).then === 'function') {
                (result as Promise<void>).then(
                    () => {
                        setCopyStatus('copied');
                        scheduleCopyStatusReset();
                    },
                    () => {
                        setCopyStatus('failed');
                        scheduleCopyStatusReset();
                    },
                );
            } else {
                // Synchronous (or void-returning) polyfills — assume success.
                setCopyStatus('copied');
                scheduleCopyStatusReset();
            }
        } catch {
            setCopyStatus('failed');
            scheduleCopyStatusReset();
        }
    }, [hasPayload, prettyJson, scheduleCopyStatusReset]);

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
                    ref={closeBtnRef}
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

            <footer className="border-t border-gray-800 px-3 py-2 flex items-center justify-end gap-2">
                {copyStatus === 'copied' ? (
                    <span role="status" className="text-xs text-green-400">
                        Copied ✓
                    </span>
                ) : null}
                {copyStatus === 'failed' ? (
                    <span role="status" className="text-xs text-red-400">
                        Copy failed
                    </span>
                ) : null}
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
