import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TopBar } from '../app/_components/TopBar';

describe('Issue #24 leaf — TopBar (48px) with 6 stubs', () => {
    afterEach(cleanup);

    it('renders the project switcher button', () => {
        render(<TopBar projectId="devlead-mcp" tab="coding" />);
        expect(screen.getByRole('button', { name: /project/i })).toBeInTheDocument();
    });

    it('renders the breadcrumb showing the current project and tab', () => {
        render(<TopBar projectId="devlead-mcp" tab="coding" />);
        const breadcrumb = screen.getByLabelText('breadcrumb');
        expect(breadcrumb).toHaveTextContent('devlead-mcp');
        expect(breadcrumb).toHaveTextContent('coding');
    });

    it('renders the heartbeat indicator', () => {
        render(<TopBar projectId="devlead-mcp" tab="coding" />);
        expect(screen.getByLabelText('heartbeat status')).toBeInTheDocument();
    });

    it('renders the pause button', () => {
        render(<TopBar projectId="devlead-mcp" tab="coding" />);
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('renders the command palette (⌘K) trigger', () => {
        render(<TopBar projectId="devlead-mcp" tab="coding" />);
        expect(screen.getByRole('button', { name: /command palette/i })).toBeInTheDocument();
    });

    it('renders the avatar menu button', () => {
        render(<TopBar projectId="devlead-mcp" tab="coding" />);
        expect(screen.getByRole('button', { name: /avatar/i })).toBeInTheDocument();
    });

    it('has a 48px height target (h-12 tailwind class) on its root element', () => {
        const { container } = render(<TopBar projectId="devlead-mcp" tab="coding" />);
        const root = container.firstElementChild;
        expect(root).toHaveClass('h-12');
    });
});
