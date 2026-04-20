import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentBadge } from '../app/_components/coding/AgentBadge';
import { FilterBar } from '../app/_components/coding/FilterBar';
import { HandoffThread } from '../app/_components/coding/HandoffThread';
import { CodingTabContent } from '../app/_components/coding/CodingTabContent';
import { InspectorPanel } from '../app/_components/coding/InspectorPanel';
import {
    EMPTY_FILTERS,
    type DiffFile,
    type Filters,
    type HandoffMessage,
    type HandoffThreadData,
} from '../app/_components/coding/types';

/**
 * Issue #145 / Phase 3 §D.3.a — Coding tab skeleton.
 * Mirrors main-panes.test.tsx for render + cleanup discipline.
 */

function makeThread(overrides: Partial<HandoffThreadData> = {}): HandoffThreadData {
    return {
        id: 't-1',
        agent: 'RooCode',
        status: 'in_progress',
        headline: 'Initial decomposition',
        decisionId: 'D-20260419-999',
        issueNumber: 999,
        messages: [
            { timestamp: '2026-04-19T10:00:00Z', from: 'claude', to: 'roo', text: 'pick leaf' },
            { timestamp: '2026-04-19T10:01:00Z', from: 'roo', to: 'claude', text: 'acknowledged' },
        ],
        ...overrides,
    };
}

describe('Issue #145 §D.3.a — Coding tab skeleton', () => {
    afterEach(cleanup);

    // 1
    it('AgentBadge renders the agent name', () => {
        render(<AgentBadge agent="RooCode" />);
        expect(screen.getByText('RooCode')).toBeInTheDocument();
    });

    // 2
    it('AgentBadge uses neutral styling for unknown agents and still renders the name', () => {
        render(<AgentBadge agent="MysteryAgent" />);
        const pill = screen.getByText('MysteryAgent');
        expect(pill).toBeInTheDocument();
        // Neutral / gray styling for unknown agents
        expect(pill.className).toMatch(/gray/);
    });

    // 3
    it('FilterBar renders agent + taskType + status dropdowns, search input, and Live indicator when live=true', () => {
        const filters: Filters = { ...EMPTY_FILTERS };
        render(<FilterBar filters={filters} onChange={() => {}} live />);
        expect(screen.getByLabelText(/agent/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/task type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/live/i)).toBeInTheDocument();
    });

    // 4
    it('FilterBar calls onChange with updated filters when the agent dropdown value changes', () => {
        const filters: Filters = { ...EMPTY_FILTERS };
        const onChange = jest.fn();
        render(<FilterBar filters={filters} onChange={onChange} live={false} />);
        const agentSelect = screen.getByLabelText(/agent/i) as HTMLSelectElement;
        fireEvent.change(agentSelect, { target: { value: 'RooCode' } });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ agent: 'RooCode' }),
        );
    });

    // 5
    it('FilterBar shows the Live indicator only when live=true', () => {
        const filters: Filters = { ...EMPTY_FILTERS };
        const { rerender } = render(
            <FilterBar filters={filters} onChange={() => {}} live={false} />,
        );
        expect(screen.queryByLabelText(/live/i)).not.toBeInTheDocument();

        rerender(<FilterBar filters={filters} onChange={() => {}} live />);
        expect(screen.getByLabelText(/live/i)).toBeInTheDocument();
    });

    // 6
    it('HandoffThread renders a one-line summary (headline + agent + status) when collapsed', () => {
        const thread = makeThread({ status: 'done', headline: 'Wrap up leaf' });
        render(<HandoffThread thread={thread} expanded={false} />);
        // Headline present
        expect(screen.getByText(/Wrap up leaf/)).toBeInTheDocument();
        // Agent badge (RooCode from fixture)
        expect(screen.getByText('RooCode')).toBeInTheDocument();
        // Status visible in summary
        expect(screen.getByText(/done/i)).toBeInTheDocument();
        // Messages must NOT render when collapsed
        expect(screen.queryByText('pick leaf')).not.toBeInTheDocument();
    });

    // 7
    it('HandoffThread renders the full message list when expanded', () => {
        const thread = makeThread();
        render(<HandoffThread thread={thread} expanded />);
        expect(screen.getByText('pick leaf')).toBeInTheDocument();
        expect(screen.getByText('acknowledged')).toBeInTheDocument();
    });

    // 8
    it('HandoffThread defaults to collapsed when status=done and no expanded prop is passed', () => {
        const thread = makeThread({ status: 'done' });
        render(<HandoffThread thread={thread} />);
        // Collapsed — messages not visible
        expect(screen.queryByText('pick leaf')).not.toBeInTheDocument();
    });

    // 9
    it('HandoffThread defaults to expanded for non-done statuses when no expanded prop is passed', () => {
        render(<HandoffThread thread={makeThread({ status: 'in_progress', id: 'ip' })} />);
        expect(screen.getByText('pick leaf')).toBeInTheDocument();

        cleanup();
        render(<HandoffThread thread={makeThread({ status: 'blocked', id: 'b' })} />);
        expect(screen.getByText('pick leaf')).toBeInTheDocument();

        cleanup();
        render(<HandoffThread thread={makeThread({ status: 'failed', id: 'f' })} />);
        expect(screen.getByText('pick leaf')).toBeInTheDocument();
    });

    // 10
    it('CodingTabContent filters threads by agent dropdown', () => {
        const threads: HandoffThreadData[] = [
            makeThread({ id: 'a', agent: 'RooCode', headline: 'Roo headline' }),
            makeThread({ id: 'b', agent: 'Copilot', headline: 'Copilot headline' }),
        ];

        function Harness(): React.ReactElement {
            const [filters, setFilters] = React.useState<Filters>({ ...EMPTY_FILTERS });
            return (
                <CodingTabContent
                    threads={threads}
                    filters={filters}
                    onFiltersChange={setFilters}
                />
            );
        }

        render(<Harness />);
        // Both visible initially
        expect(screen.getByText(/Roo headline/)).toBeInTheDocument();
        expect(screen.getByText(/Copilot headline/)).toBeInTheDocument();

        // Narrow to RooCode
        const agentSelect = screen.getByLabelText(/agent/i) as HTMLSelectElement;
        fireEvent.change(agentSelect, { target: { value: 'RooCode' } });
        expect(screen.getByText(/Roo headline/)).toBeInTheDocument();
        expect(screen.queryByText(/Copilot headline/)).not.toBeInTheDocument();
    });

    // 11
    it('CodingTabContent filters threads by case-insensitive search substring on headline', () => {
        const threads: HandoffThreadData[] = [
            makeThread({ id: 'a', agent: 'RooCode', headline: 'Refactor parser' }),
            makeThread({ id: 'b', agent: 'Copilot', headline: 'Update docs' }),
        ];

        function Harness(): React.ReactElement {
            const [filters, setFilters] = React.useState<Filters>({ ...EMPTY_FILTERS });
            return (
                <CodingTabContent
                    threads={threads}
                    filters={filters}
                    onFiltersChange={setFilters}
                />
            );
        }

        render(<Harness />);
        const search = screen.getByLabelText(/search/i) as HTMLInputElement;
        // Case-insensitive
        fireEvent.change(search, { target: { value: 'REFACTOR' } });
        expect(screen.getByText(/Refactor parser/)).toBeInTheDocument();
        expect(screen.queryByText(/Update docs/)).not.toBeInTheDocument();
    });

    // 12
    it('CodingTabContent shows an empty-state message when filters reject every thread', () => {
        const threads: HandoffThreadData[] = [
            makeThread({ id: 'a', agent: 'RooCode', headline: 'Refactor parser' }),
        ];
        const filters: Filters = { ...EMPTY_FILTERS, agent: 'DefinitelyNotARealAgent' };
        render(
            <CodingTabContent
                threads={threads}
                filters={filters}
                onFiltersChange={() => {}}
            />,
        );
        expect(
            screen.getByText(/No handoffs match the current filters\./i),
        ).toBeInTheDocument();
    });
});

describe('Issue #150 §D.3.b — Inspector panel', () => {
    afterEach(cleanup);

    // 13 — AC 5.1: Inspector NOT rendered when no message selected (initial state).
    it('CodingTabContent does not render InspectorPanel when no message is selected', () => {
        const threads: HandoffThreadData[] = [
            makeThread({ id: 'a', headline: 'Initial leaf' }),
        ];
        render(<CodingTabContent threads={threads} />);
        // The inspector's dialog region should not be present.
        expect(screen.queryByRole('dialog', { name: /inspector/i })).not.toBeInTheDocument();
        // Nor should its Close button.
        expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();
    });

    // 14 — AC 5.2: Clicking a message line sets selection and shows the payload.
    it('CodingTabContent shows the InspectorPanel with the clicked message payload', () => {
        const thread = makeThread({
            id: 'a',
            headline: 'Click me',
            messages: [
                {
                    timestamp: '2026-04-19T10:00:00Z',
                    from: 'claude',
                    to: 'roo',
                    text: 'inspect-this',
                },
            ],
        });
        render(<CodingTabContent threads={[thread]} />);
        // Initially, inspector not rendered.
        expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();

        // Click the message line (now a <button>).
        const line = screen.getByRole('button', { name: /inspect-this/ });
        fireEvent.click(line);

        // Inspector is now rendered, with payload text visible.
        expect(screen.getByLabelText(/close inspector/i)).toBeInTheDocument();
        // The pretty-printed JSON should contain the message text.
        const preEl = screen.getByTestId('inspector-payload');
        expect(preEl.textContent).toContain('"text": "inspect-this"');
        expect(preEl.textContent).toContain('"from": "claude"');
    });

    // 15 — AC 5.3: Close button fires onClose and inspector unmounts.
    it('InspectorPanel close button fires onClose', () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'hi',
        };
        const onClose = jest.fn();
        render(<InspectorPanel message={message} threadId="t-1" onClose={onClose} />);
        const closeBtn = screen.getByLabelText(/close inspector/i);
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // 15b — Integration check: close button unmounts the inspector inside CodingTabContent.
    it('CodingTabContent unmounts the inspector when its close button is clicked', () => {
        const thread = makeThread({
            id: 'a',
            headline: 'Select then close',
            messages: [
                {
                    timestamp: '2026-04-19T10:00:00Z',
                    from: 'claude',
                    to: 'roo',
                    text: 'open-me',
                },
            ],
        });
        render(<CodingTabContent threads={[thread]} />);
        fireEvent.click(screen.getByRole('button', { name: /open-me/ }));
        expect(screen.getByLabelText(/close inspector/i)).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText(/close inspector/i));
        expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();
    });

    // 16 — AC 5.4: Escape key closes the inspector.
    it('InspectorPanel closes when Escape is pressed', () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'escape-me',
        };
        const onClose = jest.fn();
        render(<InspectorPanel message={message} threadId="t-1" onClose={onClose} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // 17 — AC 5.5: Copy button writes pretty-printed JSON to clipboard.
    it('InspectorPanel Copy button writes the pretty-printed JSON to the clipboard', () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'copy-me',
        };
        const writeText = jest.fn();
        const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        try {
            render(<InspectorPanel message={message} threadId="t-1" onClose={() => {}} />);
            fireEvent.click(screen.getByRole('button', { name: /copy json/i }));
            const expected = JSON.stringify(message, null, 2);
            expect(writeText).toHaveBeenCalledTimes(1);
            expect(writeText).toHaveBeenCalledWith(expected);
        } finally {
            if (originalClipboard) {
                Object.defineProperty(navigator, 'clipboard', originalClipboard);
            } else {
                // Best-effort restore when the env had no prior descriptor.
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    configurable: true,
                });
            }
        }
    });

    // 18 — AC 5.6: Copy gracefully no-ops when clipboard API is unavailable.
    it('InspectorPanel Copy button no-ops gracefully when navigator.clipboard is undefined', () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'no-clipboard',
        };
        const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        });
        try {
            render(<InspectorPanel message={message} threadId="t-1" onClose={() => {}} />);
            expect(() => {
                fireEvent.click(screen.getByRole('button', { name: /copy json/i }));
            }).not.toThrow();
        } finally {
            if (originalClipboard) {
                Object.defineProperty(navigator, 'clipboard', originalClipboard);
            } else {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    configurable: true,
                });
            }
        }
    });

    // 19 — Empty-payload guard renders "No payload" instead of JSON.
    it('InspectorPanel renders "No payload" when message.text is empty', () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: '',
        };
        render(<InspectorPanel message={message} threadId="t-1" onClose={() => {}} />);
        expect(screen.getByText(/no payload/i)).toBeInTheDocument();
    });

    // 20 — HandoffThread renders messages as <button>s when onMessageClick is passed.
    it('HandoffThread renders message lines as buttons when onMessageClick is provided', () => {
        const thread = makeThread({
            id: 'btn',
            messages: [
                {
                    timestamp: '2026-04-19T10:00:00Z',
                    from: 'claude',
                    to: 'roo',
                    text: 'button-line',
                },
            ],
        });
        const onMessageClick = jest.fn();
        render(
            <HandoffThread
                thread={thread}
                expanded
                onMessageClick={onMessageClick}
            />,
        );
        const line = screen.getByRole('button', { name: /button-line/ });
        fireEvent.click(line);
        expect(onMessageClick).toHaveBeenCalledTimes(1);
        expect(onMessageClick).toHaveBeenCalledWith('btn', thread.messages[0]);
    });
});

describe('Issue #152 §D.3.b polish — focus + copy feedback + null-selection', () => {
    afterEach(cleanup);

    // 21 — AC 1a: close button receives focus on mount.
    it('InspectorPanel moves focus to the close button on mount', () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'focus-on-mount',
        };
        render(<InspectorPanel message={message} threadId="t-1" onClose={() => {}} />);
        const closeBtn = screen.getByLabelText(/close inspector/i);
        expect(document.activeElement).toBe(closeBtn);
    });

    // 22 — AC 1b: focus returns to the previously-active trigger element on unmount.
    it('InspectorPanel restores focus to the previously-active element on unmount', () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'focus-restore',
        };
        const trigger = document.createElement('button');
        trigger.textContent = 'trigger';
        document.body.appendChild(trigger);
        trigger.focus();
        expect(document.activeElement).toBe(trigger);
        try {
            const { unmount } = render(
                <InspectorPanel message={message} threadId="t-1" onClose={() => {}} />,
            );
            // Panel stole focus from the trigger.
            expect(document.activeElement).not.toBe(trigger);
            unmount();
            // Panel restored it on the way out.
            expect(document.activeElement).toBe(trigger);
        } finally {
            document.body.removeChild(trigger);
        }
    });

    // 23 — AC 2a: "Copied" confirmation appears after a successful clipboard write.
    it('InspectorPanel shows "Copied" confirmation after a successful clipboard write', async () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'copy-ok',
        };
        const writeText = jest.fn().mockResolvedValue(undefined);
        const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        try {
            render(
                <InspectorPanel message={message} threadId="t-1" onClose={() => {}} />,
            );
            fireEvent.click(screen.getByRole('button', { name: /copy json/i }));
            await screen.findByText(/copied/i);
        } finally {
            if (originalClipboard) {
                Object.defineProperty(navigator, 'clipboard', originalClipboard);
            } else {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    configurable: true,
                });
            }
        }
    });

    // 24 — AC 2b: "Copy failed" appears when the clipboard API is unavailable.
    it('InspectorPanel shows "Copy failed" when navigator.clipboard is unavailable', async () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'copy-missing',
        };
        const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        });
        try {
            render(
                <InspectorPanel message={message} threadId="t-1" onClose={() => {}} />,
            );
            fireEvent.click(screen.getByRole('button', { name: /copy json/i }));
            await screen.findByText(/copy failed/i);
        } finally {
            if (originalClipboard) {
                Object.defineProperty(navigator, 'clipboard', originalClipboard);
            }
        }
    });

    // 25 — AC 3a: explicit selectedMessage={null} must NOT render the inspector.
    //        Locks the "null is a valid controlled no-selection" semantic so a
    //        refactor to `!!selectedMessage` would fail loud.
    it('CodingTabContent treats explicit selectedMessage={null} as no-selection', () => {
        const thread = makeThread({
            id: 'nullsel',
            messages: [
                {
                    timestamp: '2026-04-19T10:00:00Z',
                    from: 'claude',
                    to: 'roo',
                    text: 'nope',
                },
            ],
        });
        render(<CodingTabContent threads={[thread]} selectedMessage={null} />);
        expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();
    });

    // 26 — AC 3b: flipping selectedMessage from null to a concrete value mounts the inspector.
    it('CodingTabContent mounts the inspector when selectedMessage flips from null to a value', () => {
        const thread = makeThread({
            id: 'flip',
            messages: [
                {
                    timestamp: '2026-04-19T10:00:00Z',
                    from: 'claude',
                    to: 'roo',
                    text: 'flip-me',
                },
            ],
        });
        const { rerender } = render(
            <CodingTabContent threads={[thread]} selectedMessage={null} />,
        );
        expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();
        rerender(
            <CodingTabContent
                threads={[thread]}
                selectedMessage={{ threadId: 'flip', message: thread.messages[0] }}
            />,
        );
        expect(screen.getByLabelText(/close inspector/i)).toBeInTheDocument();
    });
});

describe('Issue #154 §D.3.c — Inline diff rendering in HandoffThread', () => {
    afterEach(cleanup);

    const FIXTURE_PATCH = [
        '--- a/src/gamma.ts',
        '+++ b/src/gamma.ts',
        '@@ -1,3 +1,4 @@',
        ' untouched',
        '-old-line',
        '+new-line',
    ].join('\n');

    const FIXTURE_DIFF: DiffFile = {
        path: 'src/gamma.ts',
        added: 4,
        removed: 2,
        patch: FIXTURE_PATCH,
    };

    // 27 — HandoffThread renders a DiffBlock per file when a message carries diffs.
    it('HandoffThread renders DiffBlocks for each diff attached to a message', () => {
        const thread = makeThread({
            id: 'diff-thread',
            messages: [
                {
                    timestamp: '2026-04-19T10:00:00Z',
                    from: 'claude',
                    to: 'roo',
                    text: 'applied patch',
                    diffs: [
                        FIXTURE_DIFF,
                        { ...FIXTURE_DIFF, path: 'src/delta.ts' },
                    ],
                },
            ],
        });
        render(<HandoffThread thread={thread} expanded />);
        // Both file headers present.
        expect(screen.getByText('src/gamma.ts')).toBeInTheDocument();
        expect(screen.getByText('src/delta.ts')).toBeInTheDocument();
        // Diff body visible (small diff → expanded by default).
        expect(screen.getAllByText('+new-line').length).toBeGreaterThanOrEqual(1);
    });

    // 28 — AC 3 / pitfalls: clicking the diff toggle must NOT open the inspector.
    //       Exercises the stopPropagation wrapper inside CodingTabContent's
    //       render path.
    it('clicking the diff toggle does not open the inspector (stopPropagation)', () => {
        const thread: HandoffThreadData = {
            id: 'no-bubble',
            agent: 'RooCode',
            status: 'in_progress',
            headline: 'diff-click-isolation',
            messages: [
                {
                    timestamp: '2026-04-19T10:00:00Z',
                    from: 'claude',
                    to: 'roo',
                    text: 'message-with-diff',
                    diffs: [FIXTURE_DIFF],
                },
            ],
        };
        render(<CodingTabContent threads={[thread]} />);

        // Sanity: inspector not open yet.
        expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();

        // Click the DiffBlock toggle button. Use aria-label so we don't
        // collide with the message-row (role=button div) whose accessible
        // name also includes the file path as descendant text.
        const diffToggle = screen.getByLabelText(
            /src\/gamma\.ts\s+—\s+\+4\s*\/\s*-2/i,
        );
        fireEvent.click(diffToggle);

        // Inspector must still be closed — click did not bubble up to the
        // message-row click target.
        expect(screen.queryByLabelText(/close inspector/i)).not.toBeInTheDocument();

        // But the message-row itself must still be clickable to open the
        // inspector (regression guard for the nested-button fix).
        const row = screen.getByText('message-with-diff');
        fireEvent.click(row);
        expect(screen.getByLabelText(/close inspector/i)).toBeInTheDocument();
    });
});

describe('Issue #159 §D.3.b polish — inspector a11y v2 (re-announce + verbose copy errors)', () => {
    afterEach(cleanup);

    // 29 — A1: rapid consecutive Copy clicks must re-mount the live region so
    //         polite screen readers re-announce "Copied ✓" the second time.
    //         Polite live regions coalesce identical text, so we force a fresh
    //         announcement by changing the React `key` on the status <span>
    //         (nonce-based remount). The DOM-level proof is node-identity
    //         inequality between the first and second mounted status nodes.
    it('InspectorPanel re-mounts the status node on consecutive Copy clicks (re-announce)', async () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'copy-twice',
        };
        const writeText = jest.fn().mockResolvedValue(undefined);
        const originalClipboard = Object.getOwnPropertyDescriptor(
            navigator,
            'clipboard',
        );
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        try {
            render(
                <InspectorPanel message={message} threadId="t-1" onClose={() => {}} />,
            );
            const copyBtn = screen.getByRole('button', { name: /copy json/i });

            // First click → status mounts.
            fireEvent.click(copyBtn);
            const firstNode = await screen.findByRole('status');
            expect(firstNode).toHaveTextContent(/copied/i);

            // Second click → status SHOULD re-mount (different DOM node).
            fireEvent.click(copyBtn);
            // Wait until the status node is no longer the first one.
            await waitFor(() => {
                const current = screen.getByRole('status');
                expect(current).not.toBe(firstNode);
            });
            const secondNode = screen.getByRole('status');
            expect(secondNode).toHaveTextContent(/copied/i);
            expect(writeText).toHaveBeenCalledTimes(2);
        } finally {
            if (originalClipboard) {
                Object.defineProperty(navigator, 'clipboard', originalClipboard);
            } else {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    configurable: true,
                });
            }
        }
    });

    // 30 — B1: when navigator.clipboard is undefined entirely, the failure
    //         message must say so explicitly so the user knows the API itself
    //         is missing (not a permission issue). Existing /copy failed/i
    //         regex from test 24 should still match this stricter message.
    it('InspectorPanel reports "clipboard unavailable" when navigator.clipboard is undefined', async () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'copy-no-api',
        };
        const originalClipboard = Object.getOwnPropertyDescriptor(
            navigator,
            'clipboard',
        );
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        });
        try {
            render(
                <InspectorPanel message={message} threadId="t-1" onClose={() => {}} />,
            );
            fireEvent.click(screen.getByRole('button', { name: /copy json/i }));
            await screen.findByText(/copy failed.+clipboard unavailable/i);
            // Regression guard: bare /copy failed/i regex still matches.
            expect(screen.getByRole('status')).toHaveTextContent(/copy failed/i);
        } finally {
            if (originalClipboard) {
                Object.defineProperty(navigator, 'clipboard', originalClipboard);
            }
        }
    });

    // 31b — Issue #167 §D.3.d — RelayFooter renders only on in_progress
    //         threads inside CodingTabContent, not on done/blocked/failed.
    it('CodingTabContent renders the RelayFooter only on in_progress threads', () => {
        const threads: HandoffThreadData[] = [
            makeThread({ id: 'ip', status: 'in_progress', headline: 'Active leaf' }),
            makeThread({ id: 'dn', status: 'done', headline: 'Closed leaf' }),
            makeThread({ id: 'bl', status: 'blocked', headline: 'Blocked leaf' }),
            makeThread({ id: 'fl', status: 'failed', headline: 'Failed leaf' }),
        ];
        render(<CodingTabContent threads={threads} />);
        // Exactly one relay footer — the in_progress thread's. The other
        // three threads (done / blocked / failed) must NOT render one.
        const footers = screen.getAllByTestId(/^relay-footer-/);
        expect(footers).toHaveLength(1);
        expect(footers[0]).toHaveAttribute('data-testid', 'relay-footer-ip');
    });

    // 31 — B2: when navigator.clipboard.writeText rejects (browser permission
    //         denied is the typical case), say so explicitly. Distinct error
    //         path from B1 — clipboard exists but the call failed.
    it('InspectorPanel reports "permission denied" when clipboard.writeText rejects', async () => {
        const message: HandoffMessage = {
            timestamp: '2026-04-19T10:00:00Z',
            from: 'claude',
            to: 'roo',
            text: 'copy-perm-denied',
        };
        const writeText = jest
            .fn()
            .mockRejectedValue(new Error('NotAllowedError'));
        const originalClipboard = Object.getOwnPropertyDescriptor(
            navigator,
            'clipboard',
        );
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        try {
            render(
                <InspectorPanel message={message} threadId="t-1" onClose={() => {}} />,
            );
            fireEvent.click(screen.getByRole('button', { name: /copy json/i }));
            await screen.findByText(/copy failed.+permission/i);
            // Regression guard: bare /copy failed/i regex still matches.
            expect(screen.getByRole('status')).toHaveTextContent(/copy failed/i);
        } finally {
            if (originalClipboard) {
                Object.defineProperty(navigator, 'clipboard', originalClipboard);
            } else {
                Object.defineProperty(navigator, 'clipboard', {
                    value: undefined,
                    configurable: true,
                });
            }
        }
    });
});
