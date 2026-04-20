'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import { useRef, useState } from 'react';

/**
 * Issue #167 / Phase 3 §D.3.d — Coding-tab RelayFooter.
 *
 * Composer that sits pinned at the bottom of an in-progress HandoffThread
 * card. The operator types a follow-up instruction for the coding agent
 * running that thread and submits with Cmd/Ctrl+Enter (keyboard-first).
 *
 * Behaviour:
 *   - Textarea + send button in a flex row; the `sr-only` <label> ties the
 *     textarea to its accessible name ("Relay instruction to {agent}") so
 *     screen readers can describe the target agent without visual clutter.
 *   - Submit via Cmd/Ctrl+Enter. Plain Enter keeps its native newline
 *     behaviour so multi-line relay instructions compose naturally.
 *   - Send button disabled when the textarea is empty OR whitespace-only,
 *     OR when the parent passes `disabled`.
 *   - After a successful submit we clear the textarea AND re-assert focus
 *     on it so the operator can send a follow-up without clicking back in.
 *
 * The visual palette mirrors HandoffThread's gray-900 / gray-800 / gray-700
 * scale. The send button is blue-600 when enabled, gray-700 + opacity-50
 * when disabled (per Issue #167 §4 polish).
 */

interface RelayFooterProps {
    threadId: string;
    onSend: (text: string) => void;
    disabled?: boolean;
    placeholder?: string;
    agent?: string;
}

function composePlaceholder(agent: string | undefined): string {
    return agent
        ? `Relay instruction to ${agent} (Ctrl+Enter to send)`
        : 'Relay instruction (Ctrl+Enter to send)';
}

function composeLabel(agent: string | undefined): string {
    // Keep the label grammatically natural when agent is omitted — "to agent"
    // reads as the common-noun fallback rather than a missing proper noun.
    return agent ? `Relay instruction to ${agent}` : 'Relay instruction to agent';
}

export function RelayFooter({
    threadId,
    onSend,
    disabled = false,
    placeholder,
    agent,
}: RelayFooterProps): ReactElement {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = useState<string>('');

    const trimmed = value.trim();
    const submitDisabled = disabled || trimmed.length === 0;
    const textareaId = `relay-${threadId}`;
    const resolvedLabel = composeLabel(agent);
    const resolvedPlaceholder = placeholder ?? composePlaceholder(agent);

    function doSubmit(): void {
        if (submitDisabled) return;
        onSend(value);
        setValue('');
        // React 18+ keeps DOM mutations synchronous — focusing in the same
        // tick as setValue('') is the simplest thing that works in jsdom and
        // in real browsers. We re-assert focus even if the textarea is
        // already active so the operator can fire Ctrl+Enter repeatedly and
        // always land in a known, focused, empty state.
        textareaRef.current?.focus();
    }

    function handleKeyDown(ev: KeyboardEvent<HTMLTextAreaElement>): void {
        // Cmd (Mac) or Ctrl (Windows/Linux) + Enter submits. Plain Enter
        // must fall through with default behaviour so the browser inserts a
        // newline — crucial for multi-line relay instructions.
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
            ev.preventDefault();
            doSubmit();
        }
    }

    return (
        <div
            data-testid={`relay-footer-${threadId}`}
            className="border-t border-gray-800 bg-gray-900 px-3 py-2 flex items-end gap-2"
        >
            <label htmlFor={textareaId} className="sr-only">
                {resolvedLabel}
            </label>
            <textarea
                ref={textareaRef}
                id={textareaId}
                value={value}
                onChange={(ev) => setValue(ev.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={2}
                placeholder={resolvedPlaceholder}
                className="flex-1 min-w-0 resize-y rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
                type="button"
                onClick={doSubmit}
                disabled={submitDisabled}
                aria-keyshortcuts="Control+Enter"
                className={
                    submitDisabled
                        ? 'rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 opacity-50 cursor-not-allowed'
                        : 'rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400'
                }
            >
                Send
            </button>
        </div>
    );
}
