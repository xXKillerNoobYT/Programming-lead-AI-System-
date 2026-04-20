import React from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentBadge } from '../app/_components/coding/AgentBadge';
import { FilterBar } from '../app/_components/coding/FilterBar';
import { HandoffThread } from '../app/_components/coding/HandoffThread';
import { CodingTabContent } from '../app/_components/coding/CodingTabContent';
import {
    EMPTY_FILTERS,
    type Filters,
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

// Silence unused-import warning for `within` in strict TS (kept for future use).
void within;
