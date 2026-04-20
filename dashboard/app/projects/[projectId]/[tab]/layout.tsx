import type { ReactElement, ReactNode } from 'react';
import { tabAriaLabel } from './tab-titles';

/**
 * Project-page layout per Issue #146 §1 and Issue #148 §2.
 *
 * Provides the single top-level <main> landmark for the project tab routes.
 * WCAG 2.1 requires >=1 <main> per page; ARIA forbids nesting them. All
 * children of this layout (TopBar, LeftRail, MainPanes, individual tab
 * panes) use <section>/<div> so this is the page's only <main>.
 *
 * Placed here (not at root layout) because the home page (`app/page.tsx`)
 * already owns its own correctly-placed <main> sibling-of-<header>/<footer>;
 * wrapping all routes from root would nest two <main> elements there. Each
 * route owns its <main> at the most-local layout that has full responsibility
 * for the page's primary content region.
 *
 * Height / flex ownership: this <main> is a semantic-only wrapper — no size
 * classes. `ProjectTabContent`'s outer `<div className="min-h-screen flex
 * flex-col">` already owns the viewport-height + flex column for the page,
 * and the inner `flex-1 min-h-0` panes cascade from that. Adding
 * `min-h-screen` here would double-stack the height constraint and break
 * the `min-h-0` overflow-containment cascade that `MainPanes` relies on.
 *
 * Issue #148 §2: the <main> gets an aria-label derived from the route's
 * `tab` param so assistive-tech landmark navigation announces the active
 * tab (e.g. "Coding AI Relay — DevLead MCP dashboard"). Next.js 15 passes
 * `params` as a Promise, matching the sibling `page.tsx` signature.
 */
export default async function ProjectTabLayout({
    params,
    children,
}: {
    params: Promise<{ projectId: string; tab: string }>;
    children: ReactNode;
}): Promise<ReactElement> {
    const { tab } = await params;
    return <main aria-label={tabAriaLabel(tab)}>{children}</main>;
}
