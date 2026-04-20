'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandoffMessage } from './types';

/**
 * Issue #150 / Phase 3 §D.3.b — Coding-tab inspector panel.
 * Issue #152 polish — dialog focus management + copy feedback.
 *
 * Fixed-width (w-80 = 320 px) right-side panel rendered next to the thread
 * list when a `HandoffMessage` is selected.
 *   - Body: pretty-printed JSON via `<pre>{JSON.stringify(...)}</pre>`.
 *   - Footer: "Copy JSON" button with inline "Copied" / "Copy failed" feedback
 *     that returns to idle after 2 s. Copy still no-ops gracefully when the
 *     clipboard API is unavailable — but the UI now tells the user so the
 *     click is never silent.
 *   - Escape key closes the inspector.
 *   - Empty-payload guard: renders "No payload" when message.text is "".
 *   - Focus management (#152): on mount, keyboard focus moves to the close
 *     button; on unmount, focus returns to whatever element was active at
 *     mount time (the trigger in HandoffThread). Self-contained — no parent
 *     wiring needed.
 */

interface InspectorPanelProps {
    message: HandoffMessage;
    threadId: string;
    onClose: () => void;
}

type CopyStatus = 'idle' | 'copied' | 'failed';
const COPY_FLASH_MS = 2000;

export function InspectorPanel({
    message,
    threadId,
    onClose,
}: InspectorPanelProps): ReactElement {
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

    // Focus management: on mount capture the currently-active element, move
    // focus to the close button, and on unmount return focus to the captured
    // element. This keeps keyboard-only users anchored to their trigger after
    // they dismiss the dialog.
    useEffect(() => {
        const previousActive =
            typeof document !== 'undefined'
                ? (document.activeElement as HTMLElement | null)
                : null;
        closeBtnRef.current?.focus();
        return () => {
            if (previousActive && typeof previousActive.focus === 'function') {
                previousActive.focus();
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

    // Clear any pending flash-reset on unmount so we don't call setState
    // after the component is gone.
    useEffect(() => {
        return () => {
            if (copyResetRef.current !== null) {
                clearTimeout(copyResetRef.current);
                copyResetRef.current = null;
            }
        };
    }, []);

    const hasPayload = message.text !== '';
    const prettyJson = hasPayload ? JSON.stringify(message, null, 2) : '';

    const flashStatus = useCallback((status: 'copied' | 'failed') => {
        setCopyStatus(status);
        if (copyResetRef.current !== null) clearTimeout(copyResetRef.current);
        copyResetRef.current = setTimeout(() => {
            setCopyStatus('idle');
            copyResetRef.current = null;
        }, COPY_FLASH_MS);
    }, []);

    const handleCopy = useCallback(() => {
        if (!hasPayload) return;
        if (typeof navigator === 'undefined') {
            flashStatus('failed');
            return;
        }
        const clipboard = navigator.clipboard as
            | { writeText?: (s: string) => Promise<void> | void }
            | undefined;
        if (!clipboard || typeof clipboard.writeText !== 'function') {
            flashStatus('failed');
            return;
        }
        try {
            const result = clipboard.writeText(prettyJson);
            if (
                result &&
                typeof (result as Promise<void>).then === 'function'
            ) {
                (result as Promise<void>).then(
                    () => flashStatus('copied'),
                    () => flashStatus('failed'),
                );
            } else {
                flashStatus('copied');
            }
        } catch {
            flashStatus('failed');
        }
    }, [hasPayload, prettyJson, flashStatus]);

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
                {copyStatus !== 'idle' ? (
                    <span
                        role="status"
                        aria-live="polite"
                        data-testid="inspector-copy-status"
                        className={
                            copyStatus === 'copied'
                                ? 'text-xs text-emerald-400'
                                : 'text-xs text-red-400'
                        }
                    >
                        {copyStatus === 'copied' ? 'Copied ✓' : 'Copy failed'}
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
