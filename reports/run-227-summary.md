# Run 227 — Phase 3 §D.3.a polish round 2 (closes #148) + §D.3.b decomposed

**Date**: 2026-04-19
**Branch**: `issue-148/polish-round-2` (off `origin/main`)
**Issue closed**: #148
**Issue filed (backlog refill)**: #150 (§D.3.b inspector panel)
**Decision**: D-20260419-044

---

## What landed

5th close-the-review-loop polish tick (after D-036 / D-038 / D-041 / D-042 / D-043) + 14th subagent-driven leaf this session.

### ACs (Issue #148)

| AC | Summary |
|----|---------|
| 1 | Removed `aria-label="Search"` from the search `<input>` in `FilterBar.tsx`. The wrapping `<label>` + `sr-only` span already provide the accessible name. Consistent with the AC#3 choice on the 3 `<select>`s in #146. |
| 2 | New project-tab `<main>` in `app/projects/[projectId]/[tab]/layout.tsx` now carries `aria-label="<TabTitle> — DevLead MCP dashboard"` keyed by `params.tab`. Layout became `async` to await Next.js 15's `params` Promise (matches sibling `page.tsx`). |

### Architectural cleanup (scope creep but justified)

- Hoisted `TAB_TITLES` from `ProjectTabContent.tsx` into a NEW shared module `app/projects/[projectId]/[tab]/tab-titles.ts`. Both the landmark `aria-label` AND the visible `<h2>` heading now import from one source.
- Deliberate fallback divergence: `tabAriaLabel(unknownSlug)` returns `"<slug> — DevLead MCP dashboard"` (user-friendly AT name), while the content-side fallback stays `"Unknown tab: <tab>"` (developer-facing dev-time indicator). Documented inline at the point of divergence.

### Tests

New suite `dashboard/__tests__/project-tab-layout.test.tsx` — 7 cases covering:
- `TAB_TITLES` map shape.
- `tabAriaLabel` for 3 known slugs + 1 unknown fallback.
- Rendered layout for all 4 paths via semantic `getByRole('main', { name: ... })`.

**Tests: 132 → 139. Suites: 12 → 13.**

### Files changed

- `dashboard/app/_components/coding/FilterBar.tsx` (M — AC#1)
- `dashboard/app/projects/[projectId]/[tab]/layout.tsx` (M — AC#2, async)
- `dashboard/app/projects/[projectId]/[tab]/ProjectTabContent.tsx` (M — consumes shared module)
- `dashboard/app/projects/[projectId]/[tab]/tab-titles.ts` (NEW)
- `dashboard/__tests__/project-tab-layout.test.tsx` (NEW)

---

## Subagent pipeline outcomes

| Stage | Verdict | Notes |
|-------|---------|-------|
| Implementer | **DONE** | No concerns flagged; architectural hoist was proactive. |
| Spec compliance reviewer | **APPROVED** | All 2 ACs met; gate-captures confirmed 139/139; scope clean; implementer concerns all ACCEPT. |
| Code quality reviewer | **APPROVED WITH NITS** (no inline fixes) | 3 deferred NITs, all cosmetic; no new Issue filed — below the filing threshold. |

### Deferred NITs (captured here instead of a new Issue)

- `FilterBar.tsx:112` — `aria-label="Live"` on a `<span>` whose visible text is literally "Live". Arguably redundant; could be replaced with `role="status"` if we want a live region semantic. Low-value singleton.
- `tab-titles.ts` — JSDoc says "raw slug for unknown tabs" but the actual output is `"<slug> — DevLead MCP dashboard"`. Could sharpen to "raw slug as the title prefix."
- `project-tab-layout.test.tsx` — `renderLayout` awaits the async component directly. A `React.use(...)` + Suspense pattern would be more production-faithful. Not a blocker.

These are below the "file a consolidated follow-up Issue" threshold established across D-036/038/041/042/043. If a sibling a11y-polish leaf surfaces more NITs later, this run report is where they get bundled from.

---

## Backlog refill (Polsia Rule 3)

Filed **Issue #150 — Phase 3 §D.3.b Coding-tab inspector panel** per `Docs/Plans/Part 6 UI Master Plan.md` §7.1 line 244: *"Click a line to open the right inspector with full MCP payload (JSON tree, copy button)."* Scope: new `InspectorPanel.tsx`, click wiring through `HandoffThread` → `CodingTabContent`, Escape-to-close, Copy-JSON button, 6+ new tests. Out of scope for the leaf: react-diff-view, VS Code jump-links, relay-instruction footer, empty-state illustration (separate later leaves).

Backlog depth for `phase:3` after this tick: **#100 (docs sync) + #150 (inspector) + any future §D.3.c-e** — well above the Polsia-3 floor.

---

## Final gates (post-reviews, pre-commit)

- `cd dashboard && npm test` → 139/139 pass (13 suites).
- `cd dashboard && npm run build` → green; bundle unchanged.
- `node dashboard/scripts/check-arch.js` → 3/3 PASS.
- `node dashboard/scripts/check-guardrail-coverage.js` → exit 0.

---

## Pattern milestones

- **5th close-the-review-loop application.** The pattern is fully cemented. §D.3.a is now a 3-leaf story fully closed: skeleton (#145) → polish (#146) → round-2 polish (#148) → next backbone queued (#150).
- **First clean DONE verdict from implementer** on a polish leaf. Previous 4 polish leaves had minor concerns. Reviewer pipeline still caught 3 NITs but all deferrable.
- **First time** this session a polish leaf proactively refactored in a backbone direction (the TAB_TITLES hoist). Documented rationale: the AC mandates aria-label consistency between landmark and visible heading, which is not possible without one source of truth. Hoist is the minimum-viable shared module.

## Next pick

Next wakeup at 780s. Natural next leaf: **Issue #150 (§D.3.b inspector panel)** — freshly decomposed, AC-complete, sized for one heartbeat.
