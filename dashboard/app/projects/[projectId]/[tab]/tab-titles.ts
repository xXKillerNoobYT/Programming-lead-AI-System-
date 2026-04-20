/**
 * Issue #148 §2 — shared tab-title map for the project-scoped routes.
 *
 * Hoisted out of ProjectTabContent so the layout (which sets the
 * <main aria-label>) and the content (which renders the page <h2>)
 * pull from a single source of truth. Keeping them in lock-step is
 * what makes the screen-reader landmark name match the visible title.
 *
 * `tabAriaLabel` intentionally returns the raw slug for unknown tabs
 * (rather than re-using the "Unknown tab: ..." phrasing from
 * ProjectTabContent) so AT users still hear a usable landmark name
 * on routes that haven't shipped their pane yet — the visible <h2>
 * fallback is a developer-facing message, the aria-label is not.
 */
export const TAB_TITLES: Record<string, string> = {
    coding: 'Coding AI Relay',
    guidance: 'User Guidance',
    log: 'Execution Log',
};

const DASHBOARD_SUFFIX = '— DevLead MCP dashboard';

export function tabAriaLabel(tab: string): string {
    const title = TAB_TITLES[tab] ?? tab;
    return `${title} ${DASHBOARD_SUFFIX}`;
}
