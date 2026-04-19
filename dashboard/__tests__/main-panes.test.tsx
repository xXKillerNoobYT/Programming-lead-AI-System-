import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MainPanes } from '../app/_components/MainPanes';

describe('Issue #24 leaf — MainPanes (two-pane hybrid per D-20260419-005)', () => {
    afterEach(cleanup);

    it('renders the operator pane with its aria label', () => {
        render(
            <MainPanes
                operator={<div>operator-content</div>}
                conversational={<div>conversational-content</div>}
            />,
        );
        expect(screen.getByRole('region', { name: /operator/i })).toBeInTheDocument();
    });

    it('renders the conversational pane with its aria label', () => {
        render(
            <MainPanes
                operator={<div>operator-content</div>}
                conversational={<div>conversational-content</div>}
            />,
        );
        expect(screen.getByRole('region', { name: /ai|conversational|guidance/i })).toBeInTheDocument();
    });

    it('renders operator content in the operator pane', () => {
        render(
            <MainPanes
                operator={<div data-testid="op">operator-content</div>}
                conversational={<div>conversational-content</div>}
            />,
        );
        const operatorPane = screen.getByRole('region', { name: /operator/i });
        expect(operatorPane).toContainElement(screen.getByTestId('op'));
    });

    it('renders conversational content in the conversational pane', () => {
        render(
            <MainPanes
                operator={<div>operator-content</div>}
                conversational={<div data-testid="conv">conversational-content</div>}
            />,
        );
        const convPane = screen.getByRole('region', { name: /ai|conversational|guidance/i });
        expect(convPane).toContainElement(screen.getByTestId('conv'));
    });

    it('applies flex layout so panes sit side by side', () => {
        const { container } = render(
            <MainPanes
                operator={<div>operator-content</div>}
                conversational={<div>conversational-content</div>}
            />,
        );
        const root = container.firstElementChild;
        expect(root).toHaveClass('flex');
    });

    it('gives the operator pane more width than the conversational pane (2/3 · 1/3 default)', () => {
        render(
            <MainPanes
                operator={<div>operator-content</div>}
                conversational={<div>conversational-content</div>}
            />,
        );
        const operatorPane = screen.getByRole('region', { name: /operator/i });
        const convPane = screen.getByRole('region', { name: /ai|conversational|guidance/i });
        // Tailwind flex basis: operator = basis-2/3, conversational = basis-1/3
        expect(operatorPane).toHaveClass('basis-2/3');
        expect(convPane).toHaveClass('basis-1/3');
    });
});
