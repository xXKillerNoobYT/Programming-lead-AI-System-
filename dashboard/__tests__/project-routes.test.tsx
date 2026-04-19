import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectTabContent } from '../app/projects/[projectId]/[tab]/ProjectTabContent';

describe('Phase 3 §D.1 + §B.1\' — project-scoped tab routes', () => {
    afterEach(cleanup);

    it('renders "Coding AI Relay" heading when tab=coding', () => {
        render(<ProjectTabContent projectId="devlead-mcp" tab="coding" />);
        expect(
            screen.getByRole('heading', { name: 'Coding AI Relay', level: 2 }),
        ).toBeInTheDocument();
    });

    it('renders "User Guidance" heading when tab=guidance', () => {
        render(<ProjectTabContent projectId="devlead-mcp" tab="guidance" />);
        expect(
            screen.getByRole('heading', { name: 'User Guidance', level: 2 }),
        ).toBeInTheDocument();
    });

    it('renders "Execution Log" heading when tab=log', () => {
        render(<ProjectTabContent projectId="devlead-mcp" tab="log" />);
        expect(
            screen.getByRole('heading', { name: 'Execution Log', level: 2 }),
        ).toBeInTheDocument();
    });

    it('shows the project id in the UI so the route shape is visible', () => {
        render(<ProjectTabContent projectId="devlead-mcp" tab="coding" />);
        expect(screen.getByText(/devlead-mcp/)).toBeInTheDocument();
    });

    it('renders a recognizable fallback for an unknown tab rather than crashing', () => {
        render(<ProjectTabContent projectId="devlead-mcp" tab="unknown-tab" />);
        expect(
            screen.getByRole('heading', { name: /unknown/i, level: 2 }),
        ).toBeInTheDocument();
    });
});
