import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectTabLayout from '../app/projects/[projectId]/[tab]/layout';
import { TAB_TITLES, tabAriaLabel } from '../app/projects/[projectId]/[tab]/tab-titles';

/**
 * Issue #148 §2 — project-tab <main> landmark gets an accessible name
 * derived from the route's `tab` param. Layouts in Next 15 receive
 * `params` as a Promise, so the component is async and we resolve it
 * in each test via React's `use(...)` inside the caller.
 *
 * Helper below wraps the async layout in an awaited Suspense-free
 * component so React Testing Library (sync render) can assert on the
 * final DOM.
 */

async function renderLayout(tab: string): Promise<void> {
    // Resolve the async layout once and render the returned element.
    // We are intentionally NOT using <Suspense>: the Promise is already
    // settled synchronously via Promise.resolve, so awaiting here gives
    // us the plain <main> ReactElement to feed to RTL's render().
    const element = await ProjectTabLayout({
        params: Promise.resolve({ projectId: 'devlead-mcp', tab }),
        children: <div>stub child</div>,
    });
    render(element);
}

describe('Issue #148 §2 — project-tab <main> landmark accessible name', () => {
    afterEach(cleanup);

    it('exports a TAB_TITLES map covering coding / guidance / log', () => {
        expect(TAB_TITLES).toEqual({
            coding: 'Coding AI Relay',
            guidance: 'User Guidance',
            log: 'Execution Log',
        });
    });

    it('tabAriaLabel maps known tabs through TAB_TITLES with dashboard suffix', () => {
        expect(tabAriaLabel('coding')).toBe('Coding AI Relay — DevLead MCP dashboard');
        expect(tabAriaLabel('guidance')).toBe('User Guidance — DevLead MCP dashboard');
        expect(tabAriaLabel('log')).toBe('Execution Log — DevLead MCP dashboard');
    });

    it('tabAriaLabel falls back to the raw slug when the tab is unknown', () => {
        expect(tabAriaLabel('mystery')).toBe('mystery — DevLead MCP dashboard');
    });

    it('renders <main> with aria-label "Coding AI Relay — DevLead MCP dashboard" for tab=coding', async () => {
        await renderLayout('coding');
        expect(
            screen.getByRole('main', { name: 'Coding AI Relay — DevLead MCP dashboard' }),
        ).toBeInTheDocument();
    });

    it('renders <main> with aria-label "User Guidance — DevLead MCP dashboard" for tab=guidance', async () => {
        await renderLayout('guidance');
        expect(
            screen.getByRole('main', { name: 'User Guidance — DevLead MCP dashboard' }),
        ).toBeInTheDocument();
    });

    it('renders <main> with aria-label "Execution Log — DevLead MCP dashboard" for tab=log', async () => {
        await renderLayout('log');
        expect(
            screen.getByRole('main', { name: 'Execution Log — DevLead MCP dashboard' }),
        ).toBeInTheDocument();
    });

    it('falls back to the raw slug when the tab is unknown so the <main> still has a name', async () => {
        await renderLayout('surprise');
        expect(
            screen.getByRole('main', { name: 'surprise — DevLead MCP dashboard' }),
        ).toBeInTheDocument();
    });
});
