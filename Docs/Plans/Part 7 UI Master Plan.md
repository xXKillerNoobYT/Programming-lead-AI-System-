**Plans / Part 6 – UI Master Plan**
**Document Version: 1.0**
**Date: 2026-04-17**
**Authors: Claude Code (drafted per user directive), User (review / own)**
**Purpose: Comprehensive user-interface specification for the DevLead MCP dashboard. Consolidates UI intent scattered across Parts 1, 2, 4 and the existing `dashboard/app/page.tsx`. Intended as the single UI source-of-truth that atomic build-out Issues reference.**

> **How this file is meant to be used.** Every UI-facing GitHub Issue decomposed under Polsia Rule 3 must cite a section of this file (e.g. `per Part 6 §7.2`). If any part of this plan is wrong or stale, fix the plan first — vague plans produce vague Issues.

---

## 1. Purpose, Scope, and Success Criteria

### 1.1 Purpose
The dashboard is the **only** surface designers touch to steer DevLead MCP. Everything that happens inside the heartbeat — decomposition, delegation, agent reports, hourly Grok calls, hardware metrics — must be visible, auditable, and controllable from this single web app without the designer reading source code or CLI logs.

### 1.2 Scope (in)
- Web dashboard at `localhost:3000`, Next.js 15 + React 19 + shadcn/ui.
- Three dedicated chat-style tabs as locked in Part 1 §4.
- First-class preferences editor (Part 1 §8).
- Real-time WebSocket updates to all tabs.
- Multi-project switcher (Part 1 §9).
- Accessibility, dark mode, responsive/mobile (Part 1 §10 UX bullets).
- Keyboard shortcuts, status widgets, alerts/toasts.
- Onboarding flow for a fresh designer.

### 1.3 Scope (out — non-goals)
- Native desktop or mobile apps (mobile-responsive web is enough).
- Editing source code in the dashboard (DevLead never codes; code lives in VS Code / Roo / Copilot).
- Replacing GitHub's own UI for Issue / PR management (we link to it, we don't re-implement it).
- Authentication beyond single-user local (multi-tenant/SSO is deferred).

### 1.4 Success criteria
A designer who has never seen the dashboard can, within 10 minutes and zero CLI:
- See what the Lead is currently doing.
- Find and tweak any preference that affects behavior.
- Pause the heartbeat in one click.
- Approve or skip a clarifying question.
- Diagnose why a task failed, if one did.

### 1.5 Status of the current implementation (as of D-20260417-008)
`dashboard/app/page.tsx` (261 lines) ships a single-page three-tab prototype with localStorage-persisted preferences. It satisfies the bare *structural* requirement of Part 1 §4 but fails almost every point in §1.4 above. **This plan is explicitly an upgrade.** It is not a redesign of working aesthetics — what exists is a functional skeleton with no visual design applied. Everything below assumes we are replacing raw HTML-ish output with a polished, considered product UI.

### 1.6 Current state → target state (the "upgrade" frame)

The dashboard today looks like a wireframe someone forgot to design. The target looks like a tool a staff engineer would screenshot on Twitter. Concrete deltas:

| Dimension | Current (D-20260418-002 state) | Target (this plan) |
|---|---|---|
| Layout | One page, inline JSX, default browser fonts | Top bar + left rail + main + optional inspector; considered whitespace, consistent grid |
| Typography | Browser default (Times/Arial); one size | Inter 14/16/20/28 px; JetBrains Mono for code; hierarchy visible at a glance |
| Color | Near-zero palette; bare `<input>` borders | Full dual-theme token set; each semantic color earns its place |
| Feedback | A `setTimeout` clearing a string | Toasts, skeletons, focus rings, success/error animations, live regions |
| Observability | None on screen | Heartbeat dot, VRAM chart, queue-depth bar, coverage trend, hourly-Grok countdown |
| States | Only "has data" | All of: idle · hover · focus-visible · active · disabled · loading · success · error · empty (with action) |
| Motion | None | 120 ms ease-out default; respects `prefers-reduced-motion` |
| Density | Sparse / unstructured | Progressive disclosure — common above the fold, advanced one click deeper |
| Theming | Light only, de facto | Light / Dark / System; no flash of wrong theme |
| Mobile | Desktop-only | Responsive breakpoints, bottom tab bar, bottom-sheet modals, 44 px touch targets |
| Accessibility | Unaudited | WCAG 2.2 AA, axe-core in dev, pa11y-ci gating merges |
| Polish surfaces | None | Empty states that suggest an action; evidence blocks that look like real terminal output; decision pills that actually link somewhere |

**The success test is visual as well as functional.** If a screenshot of the dashboard can't sit next to Linear, Vercel, or Raycast without looking amateurish, the upgrade is incomplete.

---

## 2. Design Principles

| # | Principle | What it means in this project |
|---|---|---|
| 1 | **Transparent without babysitting** (Part 1) | Every heartbeat action is observable; nothing demands designer attention. |
| 2 | **Skippable clarifying questions** (Part 1 §3.5) | Qs surface non-blockingly; if ignored, the Lead applies intelligent defaults. |
| 3 | **One action per screen-area** | Each card / panel has one primary verb. Discoverability beats density. |
| 4 | **Evidence over assertion** (D-20260417-007) | Any claim of "passing / green / complete" shows the command output, not just a badge. |
| 5 | **Calm by default, alarming when earned** | Neutral colors for normal states; red only for blocking errors; no false-urgency UI. |
| 6 | **Keyboard-first power use** | Every mouse action has a key shortcut; the HUD tells you what it is. |
| 7 | **Progressive disclosure** | Common controls up top; advanced knobs one click deeper. |
| 8 | **Local-first aesthetic** | Looks like a trusted tool on *your* machine, not a SaaS product. No marketing chrome, no upgrade nag. |
| 9 | **Craft shows in the details** | Hover states matter. 1-pixel alignment matters. Choose fonts, don't inherit them. Nothing "good enough" — if it would look wrong in a screenshot, fix it before shipping. |
| 10 | **Bench against best-in-class** | Linear, Vercel, Raycast, Arc's developer views, GitHub's Dependabot UI. If our equivalent screen looks worse than theirs, we iterate. |

---

## 3. Information Architecture

### 3.1 Site map
```
/                               → redirects to /projects/<active>/coding
/projects                       → multi-project switcher
/projects/<project-id>/coding   → Coding AI Relay tab
/projects/<project-id>/guidance → User Guidance tab
/projects/<project-id>/log      → Execution Log / Monitor tab
/projects/<project-id>/prefs    → Preferences editor (modal + deep-linkable page)
/projects/<project-id>/soul     → SOUL.md editor (Part 4 §5)
/onboarding                     → first-run flow (only shown if no projects exist)
/status                         → compact read-only public-safe status (for embedding)
```

### 3.2 Navigation shell
Persistent across all authenticated views:
- **Top bar** (48 px): project switcher · breadcrumb · heartbeat indicator · pause button · command-palette trigger (`⌘K`) · avatar menu.
- **Left rail** (64 px, icons-only, collapsed by default): Coding · Guidance · Log · Prefs · SOUL · Help.
- **Main area**: the active tab.
- **Optional right inspector** (320 px, toggleable): context-sensitive details (selected agent report, selected decision, selected metric drill-down).

### 3.3 Routing rules
- Tab state persists in the URL so deep-links survive reloads.
- Browser back/forward navigates between tabs and preference panels.
- Unsaved edits in Preferences prompt before route change.

---

## 4. Design Tokens

Tailwind config + CSS variables exported as the single theme source.

### 4.1 Color (both themes)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `slate-50` | `slate-950` | canvas |
| `--surface` | `white` | `slate-900` | cards |
| `--surface-2` | `slate-100` | `slate-800` | nested cards |
| `--border` | `slate-200` | `slate-800` | dividers |
| `--fg` | `slate-900` | `slate-50` | body text |
| `--fg-muted` | `slate-500` | `slate-400` | secondary text |
| `--accent` | `indigo-600` | `indigo-400` | primary CTA |
| `--success` | `emerald-600` | `emerald-400` | green states |
| `--warning` | `amber-600` | `amber-400` | attention, not blocking |
| `--danger` | `rose-600` | `rose-400` | blocking errors only |
| `--agent` | `violet-500` | `violet-400` | 3rd-party-agent activity |
| `--grok` | `orange-500` | `orange-400` | hourly Grok escalation marker |

### 4.2 Typography
- UI: Inter variable, weight 400 / 500 / 600.
- Code / logs: JetBrains Mono, 13 px with 1.55 line-height.
- Headings: 14 / 16 / 20 / 28 px; no heavier than 600.

### 4.3 Spacing / radius / elevation
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Radius: 6 (inputs), 10 (cards), 14 (modals).
- Elevation: shadow-sm (cards), shadow-md (menus), shadow-lg (modals). No glow, no gradients.

### 4.4 Motion
- Default transition: 120 ms ease-out.
- Loading shimmer: 1.2 s.
- Toasts: slide-up 180 ms, auto-dismiss 4 s (configurable).
- Respect `prefers-reduced-motion` — collapse all motion to instant.

### 4.5 Visual quality bar ("looks good" acceptance)

Every pull request adding a new visible component or page is reviewed against this checklist. Failures are not merged.

- [ ] Light and dark mode screenshots both read cleanly with no clipped text and no jarring contrast ratios.
- [ ] Focus ring is visible on every interactive element when tabbing through.
- [ ] Primary and secondary action have clear visual weight — a user doesn't have to hunt for the button.
- [ ] No orphan icons, no gratuitous borders, no default browser styling leaking through.
- [ ] Empty state offers an action and doesn't say "No data."
- [ ] Error state quotes the cause and offers a next step (retry, copy, file bug).
- [ ] Hover / focus / pressed states distinct from idle.
- [ ] Text uses the type scale; no arbitrary `font-size`.
- [ ] Spacing uses the 4/8/12/16/24/32/48 scale; no arbitrary px values.
- [ ] Long content (5×-normal) doesn't break the layout — lists scroll, text wraps at sensible widths.
- [ ] Side-by-side screenshot with the nearest Linear / Vercel / Raycast equivalent is not visibly worse.

A lightweight Storybook page per component captures these states so the bar is self-documenting.

---

## 5. Component Library (shadcn/ui baseline + project additions)

### 5.1 From shadcn/ui (adopt as-is)
Button, Input, Textarea, Select, Switch, Checkbox, RadioGroup, Slider, Label, Tooltip, Popover, Dialog, Sheet, DropdownMenu, Command (for `⌘K` palette), Tabs, Card, Badge, Avatar, ScrollArea, Separator, Toast, Toggle, Progress, Skeleton, Table, Accordion.

### 5.2 Project-specific (new, owned here)
| Component | Purpose | Anchor section |
|---|---|---|
| `HeartbeatIndicator` | Pulsing dot + "next tick in N:NN"; click to pause | §7.shell |
| `AgentBadge` | Avatar+color for a 3rd-party coding agent (Roo / Copilot / Cursor / …) | §7.1 |
| `HandoffThread` | Collapsible Lead↔agent thread with MCP-call lines and diff previews | §7.1 |
| `ClarifyingQCard` | Skippable question with "Answer / Skip / Apply default" buttons | §7.2 |
| `DecisionIdPill` | `D-YYYYMMDD-###` chip that links to `decision-log.md` anchor | universal |
| `VramGraph` | Small line chart, 60 s window, yellow band at 80 %, red at 95 % | §7.3 |
| `RunReportCard` | Summary of a `reports/run-*.md` with click-through | §7.3 |
| `HourlyGrokTimer` | Countdown + last-escalation summary | §7.3 shell |
| `IssueMiniRow` | GitHub Issue row with status/phase/type labels | §7.2, §7.3 |
| `PrefEditorField` | Uniform row: label, control, "Why" popover, reset-to-default | §8 |
| `EmptyState` | Illustration + primary action; always actionable, never just "nothing here" | universal |
| `EvidenceBlock` | Monospace command + captured output pane (collapsible) | universal |

### 5.3 Icon set
Lucide-react only. No custom SVGs unless necessary. Icons are never decorative-only — each one has meaning or is omitted.

---

## 6. Layout Shell (`app/layout.tsx`)

### 6.1 Responsibilities
- Hydrate project context from URL `projectId`.
- Open a single WebSocket to `/ws` keyed by projectId; push updates into a zustand store; all tabs subscribe.
- Render top bar + left rail + main + optional right inspector.
- Mount toast region and command palette at app root.

### 6.2 WebSocket contract (feeds every tab)
```
{
  "ts": "2026-04-17T21:00:00Z",
  "kind": "heartbeat" | "handoff" | "agent_report" | "grok_escalation"
        | "metric" | "clarifying_q" | "issue_update" | "decision",
  "payload": { ...kind-specific }
}
```
The store fans messages into typed slices; tabs select only what they render.

### 6.3 Heartbeat indicator
Single source of truth for "is the Lead alive?":
- Green pulsing dot + `t-remaining` countdown when running.
- Amber steady when paused.
- Red blinking when >2× interval without a heartbeat message (probable crash — show `Diagnose` button).

---

## 7. The Three Tabs

### 7.1 Coding AI Relay (Part 1 §4.1)

**Purpose:** Full threaded history of Lead ↔ 3rd-party-agent handoffs, MCP calls, reports, diffs, reasoning.

**Layout (desktop):**
```
┌─ FilterBar: agent ▾  task-type ▾  status ▾  search ──── 🔴 Live ──┐
│                                                                    │
│ ┌ HandoffThread #128 · RooCode · in_progress ─────────────────────┐│
│ │ ▸ D-20260417-008 · #9 · "restore green baseline"                ││
│ │   Lead → Roo: "…" (MCP delegate_task)        12:01:22           ││
│ │   Roo → files: 4 changed (+52 / -6)          12:03:10  [diff▸] ││
│ │   Roo → Lead:  "Report: tests 2/11 pass"     12:03:42           ││
│ │   Lead → GH: opened #11, closed #9           12:04:01           ││
│ └────────────────────────────────────────────────────────────────┘│
│ ┌ HandoffThread #127 · collapsed ────────────────── Copilot · ✓ ─┐│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```
**Interactions:**
- Each handoff is a `HandoffThread` card; collapse by default when `status = done`.
- Click a line to open the right inspector with full MCP payload (JSON tree, copy button).
- Diffs render inline with react-diff-view; large diffs collapse and offer "open in VS Code" via `vscode://` URI.
- "Relay specific instruction to this agent" (Part 1 §4.1) is a footer textarea on any active thread; sends as a Lead-side message that gets MCP-delegated.

**Empty state:** illustration + "No active delegations. The next heartbeat will pick a task from the queue." + `View backlog →`.

### 7.2 User Guidance (Part 1 §4.2)

**Purpose:** Natural-language steering; skippable clarifying Qs; designer notes, approvals, preference updates.

**Layout:**
```
┌─ ClarifyingQCard (sticky) ─────────────────────────────┐
│ Q from Lead:  "Should the baseline fix keep the        │
│                Dockerfile or remove it per CLAUDE.md?"  │
│ D-20260417-009 · defaults to remove                     │
│ [ Keep ]  [ Remove ]  [ Apply default ]  [ Skip ]       │
└─────────────────────────────────────────────────────────┘

┌─ DesignerInput ─────────────────────────────────────────┐
│ Textarea · send on ⌘Enter                               │
│ Recognizes slash-prefixed directives:                   │
│   /pref <name>=<value>   → opens Preferences with       │
│   /pause 1h              → pauses heartbeat             │
│   /stop                  → stops the agent heartbeat    │
└─────────────────────────────────────────────────────────┘

┌─ Timeline (most-recent-first) ──────────────────────────┐
│ · Designer · "Prioritize Phase 3 planning next"   09:12 │
│ · Lead     · "Acknowledged; queued #7 next"       09:12 │
│ · Q/A pair · …                                          │
└─────────────────────────────────────────────────────────┘
```
**Interactions:**
- Clarifying Qs are never modal — they live sticky at the top until answered or skipped.
- Skipping records the applied default in the timeline with a `[why]` link.
- Designer messages support markdown preview; images are drag-drop.
- Approvals for high-impact pivots (Part 4 §4) appear here with explicit `Approve` / `Deny` and auto-expire per preference.

### 7.3 Execution Log / Monitor (Part 1 §4.3)

**Purpose:** Passive, read-only observability of Lead + agent activity, GitHub state, and hardware.

**Layout (3-column, collapses to 1 on mobile):**
```
┌─ Column A: Live feed ─────┐┌─ B: Metrics ─────────┐┌─ C: GH state ──────┐
│ timestamped stream of      ││ Tasks completed       ││ Open issues (by    │
│ handoffs / reports / Grok  ││ Tests pass / cov      ││   phase + type)    │
│ / decisions / issue upd    ││ Coverage δ vs last    ││ Open PRs + CI      │
│ · filterable by `kind`     ││ Queue depth (bar)     ││ Dependabot alerts  │
│ · "Auto-scroll" toggle     ││ VramGraph (line)      ││ Run report cards   │
│ · evidence blocks inline   ││ HourlyGrokTimer       ││ (latest 5)         │
└──────────────────────────┘└─────────────────────┘└────────────────────┘
```
**Interactions:**
- Each feed line has a `DecisionIdPill` and an inspector link; clicking opens full payload.
- Metrics cards have sparklines for 24h trend and tooltip for source-of-truth file.
- GH state refreshes from the GitHub MCP every 30 s; stale badge if the last fetch failed.
- `VramGraph` legend shows free / used / budget and warns if preferences' `maxVramGb` is about to be breached.

**Empty state** (e.g. just installed): shows "Start a project →" with the onboarding flow deep link.

---

## 8. Preferences Editor (Part 1 §8 — first-class)

### 8.1 Structure
Three panes, accessed as a Dialog from any tab (`⌘,`) or as a full page at `/projects/<id>/prefs`:
1. **General** — project name, heartbeat cadence (slider: 30 s – 5 min), parallelism (1–8), approval threshold (low / medium / high), vibe-mode toggle.
2. **Agents & Models** — task-type → agent mapping table; per-mode model selector; approval gate per mode; allowed-tool scope.
3. **Integrations** — MemPalace toggle + retention policy; AutoGPT toggle + allowed sub-task categories; hourly-Grok toggle; optional messaging-app bridges (Part 4 §5); Dockerless runtime only (greyed-out Docker toggle explaining why).

### 8.2 Every field uses `PrefEditorField`
`label · control · "Why" popover · reset-to-default`. The "Why" popover cites the Part / Decision ID that motivates the default. No silent magic numbers.

### 8.3 Import / export / templates
Top-right actions: `Import JSON`, `Export JSON`, `Save as template`, `Apply template ▾`. Templates stored per-project in MemPalace when enabled, else local JSON.

### 8.4 Live-effect indicator
Changing heartbeat cadence shows a toast: "Next heartbeat will use 60 s. Current tick unaffected." No mysterious delay.

### 8.5 Conflict resolution
When a pref change contradicts a pref already set at a higher level (global vs. project), show a `SafeDefault` banner explaining the reconciled value before save.

---

## 9. Multi-Project Switcher (Part 1 §9)

- Top-bar dropdown: searchable list of projects, last-activity timestamp, colored dot for heartbeat state.
- `+ New project` opens the onboarding flow.
- Keyboard: `⌘O` opens the switcher; arrow keys + Enter select.
- Per-project isolation surfaces: separate preferences, memory wing, heartbeat state.

---

## 10. Real-Time Visualizations

All charts use recharts (already fits shadcn aesthetic; small footprint).

| Viz | Data source | Refresh | Notes |
|---|---|---|---|
| VramGraph | `monitor_vram` MCP tool | 1 s (paused if tab hidden) | 60 s rolling window |
| CoverageTrend | `reports/run-*.md` parsed | on new run | Shows last 10 runs |
| QueueDepth | `gh issue list` | 30 s | Polsia Rule 4: red under 3 |
| TasksThroughput | decision-log + run reports | on decision add | Per-day since project start |
| HourlyGrokCountdown | local timer | 1 s | Ring + remaining time |

All visualizations respect `prefers-reduced-motion` — animations collapse to instantaneous updates.

---

## 11. Interaction Patterns

| Pattern | Spec |
|---|---|
| **Toast** | `Toast` from shadcn; 4 s dismiss; `Action` slot for `Undo`; max 3 stacked. |
| **Modal dialog** | Only for destructive confirmations (kill heartbeat forever, delete project). Everything else is `Sheet` or inline. |
| **Command palette** | `⌘K` opens `Command`. Actions: `Switch project`, `Pause heartbeat`, `Jump to Issue #…`, `Open Preferences`, `Run manual heartbeat now`. |
| **Approval gates** | Surface in User Guidance; auto-expire per pref; on expiry apply safe default + record decision ID. |
| **Skippable Qs** | Sticky card, three actions (Answer / Default / Skip); never block the main thread. |
| **Heartbeat pause** | Top-bar big visible button; confirms duration (`5 m`, `1 h`, `until I resume`); shows reason textarea for the run report. |
| **Destructive actions** | Type to confirm (e.g. type `delete <project-id>` to enable the button). |
| **Copyable evidence** | Every shell output or MCP payload has a copy button. |

---

## 12. Component States

Every interactive component documents **all** of: idle, hover, focus-visible (keyboard), active/pressed, disabled, loading, success, error, empty. Enforced via a Storybook page per component (lives in `dashboard/stories/`). No component ships without all states.

**Empty states must offer an action.** "No Issues yet" is wrong. "No Issues yet. Draft the first from `plans/main-plan.md` → `[Create Issue]`" is right.

---

## 13. Accessibility (target: WCAG 2.2 AA)

- Every interactive element reachable by keyboard in a visible order; focus ring uses `ring-2 ring-accent`.
- All color choices pass 4.5:1 contrast against their surface.
- Icon-only buttons carry `aria-label`; status dots carry `aria-live` narration ("heartbeat running", "heartbeat paused").
- Live-region updates for the log feed are rate-limited to one announcement per 5 s to avoid screen-reader spam.
- Form errors announced via `aria-describedby`; errors specific and actionable.
- Automated checks: `@axe-core/react` in dev + `pa11y-ci` in CI. Any violation blocks merge.

---

## 14. Theming (Light / Dark / System)

- Theme state in a React context hydrated from `localStorage` then reconciled with `prefers-color-scheme`.
- Toggle in avatar menu: `Light / Dark / System`.
- No flash of incorrect theme: set `data-theme` on `<html>` via a blocking `<script>` in `layout.tsx` head.
- Syntax-highlighting theme (for diffs and evidence blocks) swaps with the UI theme.

---

## 15. Responsive / Mobile

Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.

| Breakpoint | Behavior |
|---|---|
| ≥ 1280 | Full 3-column Log layout; right inspector togglable. |
| 1024–1279 | Log collapses to 2 columns (A + stacked B/C). |
| 768–1023 | Single column per tab; stacked cards; left rail collapses to bottom bar. |
| < 768 (mobile) | Bottom tab bar (Coding / Guidance / Log); top bar shows heartbeat + project only; all modals become sheets from bottom. |

Touch targets ≥ 44 px. No hover-only affordances on mobile; long-press opens the context menu.

---

## 16. Keyboard Shortcuts

Shown in a `?` help sheet accessible from the top bar or `shift+?`.

| Key | Action |
|---|---|
| `⌘K` | Command palette |
| `⌘,` | Preferences |
| `⌘O` | Project switcher |
| `⌘P` | Pause heartbeat |
| `⌘⇧R` | Run heartbeat now (manual) |
| `g c` · `g g` · `g l` | Go to Coding / Guidance / Log |
| `⌘Enter` | Send message in User Guidance textarea |
| `j / k` | Next / prev item in Log feed |
| `.` | Open right inspector for selected item |

---

## 17. Onboarding Flow

Route: `/onboarding`. Shown only when no projects exist.

Steps:
1. **Welcome** — one screen: "DevLead MCP is an autonomous programming lead. You do not write code here. Ready?" `Let's go ▸`.
2. **Pick a repo** — GitHub-MCP-backed picker OR local path. Preview: "We'll create `plans/main-plan.md`, a `.mcp.json`, and scaffold the 3 tabs for this project."
3. **Pick agents** — default Roo Code + Copilot; show tooltip on each with per-agent cost / capability.
4. **Pick cadence** — slider 30 s – 5 min; default 60 s.
5. **Enable MemPalace?** — recommended ON; one-sentence explanation.
6. **Review & launch** — summary panel with a primary `Start heartbeat` button. Clicking triggers the first manual heartbeat and hard-redirects to `/projects/<id>/coding`.

Skippable via `Skip onboarding` at any step → lands on `/projects/<id>/coding` with an inline banner offering to resume.

---

## 18. Key User Flows (end-to-end)

### 18.1 Designer approves a pivot proposed by the Lead
1. Lead posts a `ClarifyingQCard` in User Guidance.
2. Designer clicks `Approve`.
3. Card transitions to `Applied (D-YYYYMMDD-###)` with link.
4. Log feed shows the decision and the next delegated task.
5. Toast: "Approval recorded. Next heartbeat will act on it."

### 18.2 Designer notices a failing test in the Log and drills in
1. Log feed shows red `EvidenceBlock` summary line.
2. Click → right inspector opens with full `npm test` output + stacktrace.
3. `File Issue` button pre-fills a new `type:bug` with the evidence block quoted.
4. Submit → issue appears in the backlog (Polsia Rule 2 capture).

### 18.3 Designer changes a preference mid-run
1. `⌘,` opens Preferences.
2. Change `maxParallelism` slider from 3 to 5.
3. `Save` → toast explains when the change applies (next tick).
4. Log feed records a `decision` event with an auto-generated Decision ID.

### 18.4 Designer pauses heartbeat, walks away, returns
1. Top-bar `Pause` → choose duration or "until I resume".
2. Heartbeat indicator turns amber.
3. During pause: Log shows "No heartbeat in progress — queue depth 5".
4. On return: click `Resume`; next tick fires within 1 s.

### 18.5 First-run onboarding (see §17)

---

## 19. Mapping to Current Dashboard Code

| Plan reference | Current file / component | Gap |
|---|---|---|
| §3 Site map | `dashboard/app/page.tsx` is a single route | Need `/projects/<id>/…` routes |
| §6 Layout shell | `dashboard/app/layout.tsx` exists (minimal) | Need top bar, left rail, WebSocket store |
| §7 Three tabs | `activeTab` local state, inline JSX | Extract to `app/projects/[id]/(coding|guidance|log)/page.tsx` |
| §8 Preferences | `defaultPreferences` shape in page.tsx | Extract to its own route + `PrefEditorField` |
| §10 Real-time viz | not present | New `VramGraph`, `CoverageTrend`, etc. |
| §11 Command palette | not present | New, using shadcn `Command` |
| §13 A11y | ad-hoc | Need `@axe-core/react` + pa11y-ci in CI |
| §14 Theming | not present | Add blocking theme script + context |
| §15 Responsive | none (desktop only) | Mobile bottom tab bar, sheets |
| §17 Onboarding | none | New `/onboarding` flow |

The existing `localStorage` preference persistence stays; it moves behind `dashboard/lib/preferences.ts` and the file-based server-side persistence ships in Phase 3.

---

## 20. Build-Out Sequence (atomic Issues that reference this plan)

Each Issue opens with `per Part 6 §<n>` and sets `status:backlog`. Order respects dependencies.

1. **Shell + routing** (`§3`, `§6`) — project router, top bar + left rail, WebSocket store, theme scaffold.
2. **Design tokens + shadcn install** (`§4`, `§5.1`) — Tailwind config, shadcn init, base components.
3. **Coding tab skeleton** (`§7.1`) — `HandoffThread`, filter bar, inspector, mock WebSocket data.
4. **Guidance tab skeleton** (`§7.2`) — `ClarifyingQCard`, `DesignerInput` with slash-commands, timeline.
5. **Log tab skeleton** (`§7.3`) — three-column layout, live feed, `DecisionIdPill`, `EvidenceBlock`.
6. **Preferences editor** (`§8`) — migrate from page.tsx, add `PrefEditorField`, import/export.
7. **Heartbeat indicator + pause** (`§6.3`, `§11`) — top-bar component wired to WebSocket.
8. **Multi-project switcher** (`§9`) — route layout + `⌘O` palette entry.
9. **Charts pass** (`§10`) — `VramGraph`, `CoverageTrend`, `QueueDepth`, `HourlyGrokCountdown`.
10. **Command palette** (`§11`) — register all actions from §16.
11. **Accessibility pass** (`§13`) — axe + pa11y-ci, fix violations.
12. **Theming polish** (`§14`) — dark mode QA, blocking theme script.
13. **Responsive pass** (`§15`) — mobile bottom bar, sheets from bottom, touch targets.
14. **Onboarding flow** (`§17`) — `/onboarding` stepper.
15. **Storybook + component states** (`§12`) — one page per component covering every state.
16. **E2E flow tests** (`§18`) — Playwright scripts for the five key flows.

Each numbered item becomes one Issue. Issues 1–2 unblock everything else; 3–5 can run in parallel once shell is in. Issue 6 can start once shell lands. Items 11–13 are cross-cutting and can happen in parallel after the tabs exist.

---

## 21. Open Questions (to be resolved before starting build-out)

These are **not blocking this plan** — they gate specific sections' execution. Surface via User Guidance Chat when the affected Issue begins.

1. **Multi-project — shared DB?** Part 1 §9 locks shared Postgres; current code has no DB. Confirm before §9 build. Defaults to local-JSON per project until then.
2. **Messaging-app bridges** (Part 4 §5) — do we ship any in Phase 3, or all post-1.0? Plan assumes post-1.0.
3. **SOUL.md editor** scope — rich markdown editor or plain textarea? Plan assumes plain textarea + preview for Phase 3.
4. **VRAM monitor availability on non-NVIDIA hardware** — `VramGraph` degrades to "VRAM telemetry unavailable" card; confirm acceptable.
5. **Onboarding repo-picker** requires GitHub MCP to be connected first — chicken/egg; plan assumes installer seeds a working GH MCP config.

---

## 22. Provenance & Maintenance

- **Drafted by:** Claude Code, 2026-04-17, per user directive in session SessionStart hook `ed8f6d73-0fbf-411f-9cac-36cf2fe095dc`.
- **Source material:** `Docs/Plans/Part 1.md` §4 §8 §10 §11; `Docs/Plans/Part 2.md` §3.3; `Docs/Plans/Part 4.md` §3 §5; `dashboard/app/page.tsx` (D-20260418-002 state); `CLAUDE.md` §3 Polsia rules; decision-log entries D-20260417-006 through D-20260417-008.
- **Owner:** User (override any section; Claude will not modify without explicit directive).
- **Update rule:** per CLAUDE.md §3 Step 2b — if a build-out Issue finds this plan fuzzy, refine the plan first, then decompose.
- **Lock status:** Draft v1.0. Promote to "locked" after one full review pass by the user.
