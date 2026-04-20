import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RelayFooter } from '../app/_components/coding/RelayFooter';

/**
 * Issue #167 / Phase 3 §D.3.d — Coding-tab RelayFooter.
 *
 * The RelayFooter is the `<textarea>` + send `<button>` composer that sits
 * pinned at the bottom of each in-progress HandoffThread card. It is the
 * operator's keyboard-first way to send a follow-up instruction to the
 * coding agent whose thread they're watching.
 *
 * Behaviours locked by these tests:
 *   - Renders a textarea (accessible via sr-only label) + a send button.
 *   - Send disabled when the textarea is empty OR whitespace-only.
 *   - Send enabled once the textarea has non-whitespace content.
 *   - Cmd/Ctrl+Enter submits; plain Enter inserts a newline (native textarea
 *     default) and does NOT call onSend.
 *   - After submit the textarea clears and keeps keyboard focus so the
 *     operator can send a follow-up without clicking back in.
 */

describe('Issue #167 §D.3.d — RelayFooter', () => {
    afterEach(cleanup);

    // 1 — Renders the textarea + send button skeleton.
    it('renders a textarea and a send button', () => {
        render(
            <RelayFooter
                threadId="t-1"
                onSend={() => {}}
                agent="Roo"
            />,
        );
        expect(
            screen.getByLabelText(/relay instruction to roo/i),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /send/i }),
        ).toBeInTheDocument();
    });

    // 2 — Send disabled on empty + whitespace-only value.
    it('disables the send button when the textarea is empty or whitespace-only', () => {
        render(<RelayFooter threadId="t-1" onSend={() => {}} agent="Roo" />);
        const send = screen.getByRole('button', { name: /send/i });
        // Empty on mount.
        expect(send).toBeDisabled();
        // Whitespace-only is still "empty" for submission purposes.
        const ta = screen.getByLabelText(
            /relay instruction to roo/i,
        ) as HTMLTextAreaElement;
        fireEvent.change(ta, { target: { value: '   \n\t  ' } });
        expect(send).toBeDisabled();
    });

    // 3 — Send enabled once the textarea has non-whitespace content.
    it('enables the send button when the textarea has non-whitespace content', () => {
        render(<RelayFooter threadId="t-1" onSend={() => {}} agent="Roo" />);
        const send = screen.getByRole('button', { name: /send/i });
        const ta = screen.getByLabelText(
            /relay instruction to roo/i,
        ) as HTMLTextAreaElement;
        fireEvent.change(ta, { target: { value: 'hello' } });
        expect(send).not.toBeDisabled();
    });

    // 4 — Ctrl+Enter submits via onSend with the exact text.
    it('submits via Ctrl+Enter and calls onSend with the textarea text', () => {
        const onSend = jest.fn();
        render(<RelayFooter threadId="t-1" onSend={onSend} agent="Roo" />);
        const ta = screen.getByLabelText(
            /relay instruction to roo/i,
        ) as HTMLTextAreaElement;
        fireEvent.change(ta, { target: { value: 'run tests now' } });
        fireEvent.keyDown(ta, { key: 'Enter', ctrlKey: true });
        expect(onSend).toHaveBeenCalledTimes(1);
        expect(onSend).toHaveBeenCalledWith('run tests now');
    });

    // 5 — Plain Enter must NOT submit — native newline behaviour preserved.
    it('does not submit when plain Enter is pressed (native newline preserved)', () => {
        const onSend = jest.fn();
        render(<RelayFooter threadId="t-1" onSend={onSend} agent="Roo" />);
        const ta = screen.getByLabelText(
            /relay instruction to roo/i,
        ) as HTMLTextAreaElement;
        fireEvent.change(ta, { target: { value: 'line one' } });
        // Plain Enter — no modifier keys.
        const evt = fireEvent.keyDown(ta, { key: 'Enter' });
        // onSend must not have been called.
        expect(onSend).not.toHaveBeenCalled();
        // Default was NOT prevented → the browser would insert a newline.
        // In jsdom fireEvent returns true when default is allowed through.
        expect(evt).toBe(true);
    });

    // 6 — After submit: textarea clears AND focus remains on it.
    it('clears the textarea and keeps focus on it after submit', () => {
        const onSend = jest.fn();
        render(<RelayFooter threadId="t-1" onSend={onSend} agent="Roo" />);
        const ta = screen.getByLabelText(
            /relay instruction to roo/i,
        ) as HTMLTextAreaElement;
        fireEvent.change(ta, { target: { value: 'ping' } });
        ta.focus();
        fireEvent.keyDown(ta, { key: 'Enter', ctrlKey: true });
        expect(onSend).toHaveBeenCalledWith('ping');
        // Cleared
        expect(ta.value).toBe('');
        // Focus retained
        expect(document.activeElement).toBe(ta);
    });
});
