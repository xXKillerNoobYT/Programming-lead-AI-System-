import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LeftRail } from '../app/_components/LeftRail';

describe('Issue #24 leaf — LeftRail (64px) with 6 icon entries', () => {
    afterEach(cleanup);

    const ENTRIES = ['Coding', 'Guidance', 'Log', 'Prefs', 'SOUL', 'Help'];

    it.each(ENTRIES)('renders the %s nav entry with an accessible name', (entry) => {
        render(<LeftRail projectId="devlead-mcp" activeTab="coding" />);
        expect(screen.getByRole('link', { name: new RegExp(entry, 'i') })).toBeInTheDocument();
    });

    it('marks the active tab entry with aria-current="page"', () => {
        render(<LeftRail projectId="devlead-mcp" activeTab="guidance" />);
        const guidance = screen.getByRole('link', { name: /guidance/i });
        expect(guidance).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark non-active entries with aria-current', () => {
        render(<LeftRail projectId="devlead-mcp" activeTab="guidance" />);
        const coding = screen.getByRole('link', { name: /coding/i });
        expect(coding).not.toHaveAttribute('aria-current');
    });

    it('has a 64px width target (w-16 tailwind class) on its root element', () => {
        const { container } = render(<LeftRail projectId="devlead-mcp" activeTab="coding" />);
        const root = container.firstElementChild;
        expect(root).toHaveClass('w-16');
    });

    it('links the tab entries to their project-scoped routes', () => {
        render(<LeftRail projectId="devlead-mcp" activeTab="coding" />);
        expect(screen.getByRole('link', { name: /coding/i })).toHaveAttribute(
            'href',
            '/projects/devlead-mcp/coding',
        );
        expect(screen.getByRole('link', { name: /guidance/i })).toHaveAttribute(
            'href',
            '/projects/devlead-mcp/guidance',
        );
        expect(screen.getByRole('link', { name: /log/i })).toHaveAttribute(
            'href',
            '/projects/devlead-mcp/log',
        );
    });
});
