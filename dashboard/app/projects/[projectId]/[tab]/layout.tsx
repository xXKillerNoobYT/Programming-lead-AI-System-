import type { ReactElement, ReactNode } from 'react';

/**
 * Project-page layout per Issue #146 §1.
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
 */
export default function ProjectTabLayout({
    children,
}: {
    children: ReactNode;
}): ReactElement {
    return <main>{children}</main>;
}
