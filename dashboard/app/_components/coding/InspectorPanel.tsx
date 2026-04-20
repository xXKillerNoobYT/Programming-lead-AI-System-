'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandoffMessage } from './types';

/**
 * Issue #150 / Phase 3 §D.3.b — Coding-tab inspector panel.
 * Issue #152 polish — dialog focus management + copy feedback.
 * Issue #159 a11y v2 — re-announce on rapid Copy + verbose copy-failure text.
 *
 * Fixed-width (w-80 = 320 px) right-side panel rendered next to the thread
 * list when a `HandoffMessage` is selected.
 *   - Body: pretty-printed JSON via `<pre>{JSON.stringify(...)}</pre>`.
 *   - Footer: "Copy JSON" button with inline "Copied" / "Copy failed — …"
 *     feedback that returns to idle after 2 s. Copy still no-ops gracefully
 *     when the clipboard API is unavailable — but the UI now tells the user
 *     specifically WHY ("clipboard unavailable" vs "permission denied") so
 *     the click is never silent and so support reproduces the right bucket.
 *   - Re-announce (#159 §A): each Copy click increments `copyNonce`, which
 *     is used as the React `key` on the status <span>. A polite live region
 *     coalesces identical text by default — remounting it on each click
 *     forces screen readers to re-announce on rapid consecutive copies.
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

type CopyStatus =
    | 'idle'
    | 'copied'
    | 'failed-permission'
    | 'failed-unavailable';
const COPY_FLASH_MS = 2000;

/**
 * Render the user-visible status message for a non-idle copy state.
 * Centralizes the wording so the JSX stays readable and so the two failure
 * buckets stay textually distinct (any change here also keeps the
 * /copy failed/i regression guard in coding-tab.test.tsx test 24 green).
 *
 * NOTE — exhaustiveness is NOT type-enforced today: `dashboard/tsconfig.json`
 * has `strict: false`, so a missing `case` would compile cleanly with this
 * function silently returning `undefined` at runtime. If you add a new
 * `CopyStatus` variant, manually add its `case` here. Tracked by follow-up
 * Issue #165 (strict-mode exhaustiveness pattern); when that lands, an
 * explicit `default: const _exh: never = status; return _exh;` makes the
 * compile-time guarantee real.
 */
function statusMessage(status: Exclude<CopyStatus, 'idle'>): string {
    switch (status) {
        case 'copied':
            return 'Copied ✓';
        case 'failed-permission':
            return 'Copy failed — permission denied';
        case 'failed-unavailable':
            return 'Copy failed — clipboard unavailable';
    }
}

export function InspectorPanel({
    message,
    threadId,
    onClose,
}: InspectorPanelProps): ReactElement {
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
    // #159 §A: monotonic counter incremented on each Copy click so the status
    // <span> can be keyed by it and remount → re-announce in polite SR mode.
    // useState is used (not useRef) so the key change is part of the same
    // render that flips copyStatus to a non-idle value, guaranteeing a fresh
    // mount of the status node on every click.
    const [copyNonce, setCopyNonce] = useState(0);

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

    const flashStatus = useCallback(
        (status: Exclude<CopyStatus, 'idle'>) => {
            setCopyStatus(status);
            if (copyResetRef.current !== null) clearTimeout(copyResetRef.current);
            copyResetRef.current = setTimeout(() => {
                setCopyStatus('idle');
                copyResetRef.current = null;
            }, COPY_FLASH_MS);
        },
        [],
    );

    const handleCopy = useCallback(() => {
        if (!hasPayload) return;
        // #159 §A: bump the nonce on every click so the keyed status node
        // remounts even if the resulting status text is identical to the
        // previous one (rapid Copy → Copy retains "Copied ✓" wording but
        // the live region must re-announce).
        setCopyNonce((n) => n + 1);
        if (typeof navigator === 'undefined') {
            flashStatus('failed-unavailable');
            return;
        }
        const clipboard = navigator.clipboard as
            | { writeText?: (s: string) => Promise<void> | void }
            | undefined;
        if (!clipboard || typeof clipboard.writeText !== 'function') {
            flashStatus('failed-unavailable');
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
                    () => flashStatus('failed-permission'),
                );
            } else {
                flashStatus('copied');
            }
        } catch {
            flashStatus('failed-permission');
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
                        // #159 §A: keying by the click-nonce forces a fresh
                        // mount on every Copy click so polite live regions
                        // re-announce instead of coalescing identical text.
                        key={copyNonce}
                        role="status"
                        aria-live="polite"
                        data-testid="inspector-copy-status"
                        className={
                            copyStatus === 'copied'
                                ? 'text-xs text-emerald-400'
                                : 'text-xs text-red-400'
                        }
                    >
                        {statusMessage(copyStatus)}
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
