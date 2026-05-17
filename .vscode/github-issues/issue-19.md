---
id: 4286709366
number: 19
title: 'EPIC: Dashboard UI upgrade per Part 6 Master Plan + frontend-design skill'
state: open
created_at: '2026-04-18T04:35:34Z'
updated_at: '2026-04-20T07:25:22Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653173
    name: 'type:epic'
    color: '5319E7'
    description: Multi-issue epic
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/19
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/19'
---
# EPIC: Dashboard UI upgrade per Part 6 Master Plan + frontend-design skill

**Captured per user directive 2026-04-17**: *"I would like this done at some point, the front end design put in properly and all that — it'd be extremely useful to have done properly."* User invoked `/frontend-design:frontend-design` skill to anchor the aesthetic bar.

## Parent spec
`Docs/Plans/Part 6 UI Master Plan.md` — the locked user-intent spec for the dashboard UI. §20 defines a 16-item build-out sequence.

## Current state
- `dashboard/app/page.tsx` is a 261-line wireframe-quality prototype.
- 12/12 tests passing (95.45% coverage) — infrastructure is green.
- Stale content concerns captured separately in #13 (Run-2 subtitle, Docker/Ollama footer).
- Part 6 §1.6 captures the upgrade frame: *"The dashboard today looks like a wireframe someone forgot to design. The target looks like a tool a staff engineer would screenshot on Twitter."*

## frontend-design skill overlay (on top of Part 6)
The skill enforces principles beyond Part 6's own visual quality bar:
- **Explicit aesthetic direction commitment** — a bolder 'tone' pick than Part 6's "Linear/Vercel-equivalent" framing. Options include refined minimalism, brutalist/raw, editorial/magazine, retro-futuristic, industrial/utilitarian. Commit to one and execute with precision.
- **Avoid AI-generic aesthetics** — skill explicitly warns against Inter as a default, purple gradients on white, cliche component patterns. Part 6 §4.2 currently names Inter — flag as a pre-build-1 decision for the user (may want a more distinctive variable font like Söhne, GT America, Monument Grotesk, or a well-chosen open-source alternative).
- **Distinctive typography pairing** — display + body, not one system font.
- **Motion intentionality** — one orchestrated page load > scattered micro-interactions.
- **Spatial composition** — asymmetry, overlap, grid-breaking where it earns its place.

## Build-out sequence (from Part 6 §20)
Each item below becomes its own atomic Issue when picked up. Estimated ordering:

1. **Aesthetic-direction decision** (new pre-step) — user or Claude commits to the bold aesthetic direction; documents in a new ADR or appended Part 6 §4 subsection. Includes typography pick, color palette commitment, motion philosophy. Must happen before Issue 2.
2. **Shell + routing** (Part 6 §3, §6) — project router, top bar + left rail, WebSocket store, theme scaffold
3. **Design tokens + shadcn install** (Part 6 §4, §5.1) — Tailwind config, shadcn init, base components, with aesthetic-direction overrides applied
4. **Coding tab skeleton** (Part 6 §7.1) — HandoffThread, filter bar, inspector, mock WebSocket data
5. **Guidance tab skeleton** (Part 6 §7.2) — ClarifyingQCard, DesignerInput with slash-commands, timeline
6. **Log tab skeleton** (Part 6 §7.3) — three-column layout, live feed, DecisionIdPill, EvidenceBlock
7. **Preferences editor** (Part 6 §8) — migrate from page.tsx, add PrefEditorField, import/export
8. **Heartbeat indicator + pause** (Part 6 §6.3, §11) — top-bar component wired to WebSocket
9. **Multi-project switcher** (Part 6 §9) — route layout + ⌘O palette entry
10. **Charts pass** (Part 6 §10) — VramGraph, CoverageTrend, QueueDepth, HourlyGrokCountdown
11. **Command palette** (Part 6 §11) — register all actions from §16
12. **Accessibility pass** (Part 6 §13) — axe + pa11y-ci, fix violations
13. **Theming polish** (Part 6 §14) — dark mode QA, blocking theme script
14. **Responsive pass** (Part 6 §15) — mobile bottom bar, sheets from bottom, touch targets
15. **Onboarding flow** (Part 6 §17) — /onboarding stepper
16. **Storybook + component states** (Part 6 §12) — one page per component covering every state
17. **E2E flow tests** (Part 6 §18) — Playwright scripts for the five key flows

Items 4-6 can run in parallel once shell + tokens are in.

## Acceptance criteria (epic-level)
- [ ] Aesthetic-direction ADR committed (new pre-step Issue)
- [ ] All 16 build-out Issues created, each referencing `per Part 6 §<n>` + the skill
- [ ] Each Issue, when completed, must pass Part 6 §4.5 visual quality bar checklist + skill's typography/motion/spatial expectations
- [ ] Side-by-side screenshot bench against a reference product (Linear / Vercel / Raycast / Arc) does not look visibly worse (Part 6 §1.6 success test)
- [ ] Existing 12/12 tests still pass throughout the migration; coverage never drops below 90%
- [ ] #13 (stale content) is absorbed; can be closed as superseded when Issue 4-6 ship

## Dependencies / subsumes
- **Subsumes**: #13 (stale page.tsx content cleanup — trivially handled by any of Issues 4-7)
- **Depends on**: nothing technical. Aesthetic-direction decision is the only gate. User involvement welcome for direction-setting.

## Not in scope (per Part 6 §1.3)
- Native mobile apps (mobile-responsive web is enough)
- In-dashboard code editing
- Multi-tenant auth
- Deployment (per user directive: deploy is out-of-scope for now)

## Source
User directive 2026-04-17 + Part 6 UI Master Plan (D-20260417-009) + frontend-design skill invocation. Captured during heartbeat D-20260417-013.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:35:34Z
**Updated:** 2026-04-20T07:25:22Z
**Labels:** type:epic, status:backlog, autonomous-lead, priority:medium
