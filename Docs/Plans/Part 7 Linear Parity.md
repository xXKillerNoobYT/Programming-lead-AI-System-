# Part 7 — Linear Parity (+ Vibe-Coding Evolution)

**Version**: 1.0 — drafted 2026-04-20 from user directive:
> "i want this to be an aotu linear.app but better for vibe coding so add all the key featers ... to have this minic https://linear.app as much as possable. and copy that workflow if it inproves your work"

**Relationship to other plans**: this file is a sibling of Parts 1–6. It does **not** replace anything in Parts 1–6; it lists the features and workflow patterns that would make DevLead MCP land as "an autonomous Linear for vibe coding." Each feature below is tagged `[kept / augment / new]` so the diff against the existing locked plans is explicit.

---

## 0. The pitch in one paragraph

DevLead MCP is **Linear, fully automated, built for humans who want to design software out loud and let AI execute.** Every surface a Linear user touches — issues, cycles, roadmaps, command palette, keyboard shortcuts, Git integration, real-time sync — ships on the DevLead dashboard. But the **heartbeat** does the triage, prioritization, decomposition, assignment, and execution. The human is the designer; the Lead is the PM; the 3rd-party agents (Roo Code / Copilot / Claude) are the coders. Linear's manual-by-default workflow becomes DevLead's autonomous-by-default workflow, with skippable clarifying Qs the only thing the designer answers.

**What "better for vibe coding" means concretely**: the user thinks out loud, the system decomposes, delegates, reviews, merges. No sprint planning. No triage meetings. No standups. No human-authored tickets. The UI surfaces feel like Linear so it's instantly familiar; the backbone feels like Polsia so it runs itself.

---

## A. Product parity — dashboard features that mimic Linear

Each item is one row. Columns: **feature** · **Linear source** · **DevLead mapping** · **status tag**.

### A.1 Core entity model
- **Issue** · Linear's primary unit. · DevLead has this (GitHub Issues as source of truth per CLAUDE.md §2). · `[kept]`
- **Project** · A goal-scoped collection of Issues. · DevLead adds: Phase = Linear's Project equivalent (Part 1 §3 describes phases). Per-project isolation already in Part 1 §9. · `[augment — formalize Phase-as-Project in UI]`
- **Cycle** · A 1-2 week time-boxed sprint; issues auto-roll to next cycle if unfinished. · Heartbeats replace sprint planning, but a weekly "cycle" wrapper adds useful velocity tracking. · `[new — see §C.1]`
- **Initiative** · Strategic epic above a Project; tracks multiple Projects toward a quarterly goal. · DevLead's Parts 1–6 are Initiatives; each Phase is a Project inside one. · `[augment — expose Initiative layer in UI]`
- **Docs** · Lightweight markdown pages separate from Issues, linked via mentions. · DevLead already has `AI plans/*.md` + `decision-log.md` + `reports/run-*.md`. Surface them in the Log tab via a Docs sub-tab. · `[augment — add Docs sub-tab to existing Log pane]`
- **Workspace / Team** · Multi-team grouping. · Single-designer workflow for v1; multi-workspace = Phase 4 + (see Open Questions §F). · `[deferred to Phase 4+]`

### A.2 Issue attribute layer
- **Title / description** · Linear. · GitHub Issue title/body. · `[kept]`
- **Status workflow** · `Backlog → Todo → In Progress → In Review → Done → Canceled`; customizable. · DevLead today: `status:backlog / status:in-progress / status:review / status:done / status:needs-user`. Add `status:triage` (new-and-unsorted) and `status:canceled` (killed, not completed). See §C.2 + §C.7. · `[augment]`
- **Priority** · 5 levels: No priority, Urgent, High, Medium, Low. · Add `priority:urgent / priority:high / priority:medium / priority:low` labels. Heartbeat Step 2 pick order = in-progress → `priority:urgent` oldest → oldest-backlog → backbone exception. See §C.3. · `[new]`
- **Estimate** · Story-point estimate (T-shirt or Fibonacci). · Add `estimate:XS / S / M / L / XL` labels. Heartbeat tracks velocity per cycle. See §C.4. · `[new]`
- **Assignee** · Human assignee. · `autonomous-lead` label already exists; extend with `agent:roo-code / agent:copilot / agent:claude` for sub-agent delegation. · `[augment]`
- **Labels** · Color-coded, hierarchical. · GitHub labels. Make `type:*`, `area:*`, `phase:*`, `priority:*`, `estimate:*`, `agent:*`, `status:*` the canonical namespaces. · `[augment — lock the namespace list]`
- **Sub-issues** · Parent-child decomposition, unbounded depth. · Already in CLAUDE.md §6. · `[kept]`
- **Due date** · Hard date. · Add `due:YYYY-MM-DD` label OR use GitHub Milestones. Heartbeat surfaces due-today + overdue in §C.9 auto-escalation. · `[new]`
- **Custom fields** · User-defined attributes. · v2. Not required for vibe-coding v1. · `[deferred]`
- **Comments** · Threaded issue comments. · GitHub comments. Already used. · `[kept]`
- **@mentions** · Notify a person. · GitHub @mentions work. `@copilot` already triggers delegation per memory. · `[kept]`
- **Reactions** · Emoji reactions on comments. · GitHub reactions work. Use `👀 / ✅ / 🚧 / 🔴` from the heartbeat to signal state without comments — see §C.9. · `[kept — promote to workflow signal]`
- **Activity feed / audit trail** · Linear auto-logs every change. · DevLead already has `decision-log.md` + `reports/audit/*.json` (§C.2 audit-trail). Surface the audit JSON in the Log tab as the activity feed. · `[augment]`

### A.3 Command palette (Cmd-K) — **signature Linear feature**
- **What Linear does**: `Cmd-K` opens a fuzzy search that can perform any action (create issue, switch project, navigate, assign, change status) via keyboard.
- **DevLead delivery**: add `CommandPalette.tsx` in the layout shell (Part 6 §6.1). Triggered by `Cmd-K` / `Ctrl-K`. Searches across: Issues (open + recent closed), Projects (Phases), Docs (`Docs/Plans/`, `AI plans/`, `decision-log.md`, `reports/run-*.md`), and Actions (pause heartbeat, switch project, open preferences, etc.). Built on `cmdk` library (already shadcn-compatible).
- **Must-have v1 scope**: issue search, navigation, Go-to-tab, pause/resume heartbeat, open preferences.
- `[new — Phase 3 §D.12 or early Phase 4]`

### A.4 Views — saved filters
- **What Linear does**: any filtered Issue list can be saved as a named View, shared across team, pinned to sidebar.
- **DevLead delivery**: file-backed views in `.claude/views/<name>.md` — YAML front-matter (`filter`, `sort`, `layout`) + markdown description. Heartbeat can read/write them; dashboard shows them in the left rail.
- **v1 presets**: *Backlog (oldest first)*, *In progress*, *Review queue*, *Needs user*, *Blocked*, *Urgent (priority:urgent)*, *This cycle*, *Done this week*.
- `[new]`

### A.5 Layouts per View
- **What Linear does**: each View can be rendered as List, Board (kanban), Calendar, or Timeline (Gantt).
- **DevLead delivery**: layout switcher in the top-right of any list. v1: List + Board. v2: Calendar + Timeline.
- `[new — Phase 3 Part 6 §7 extension]`

### A.6 Global fuzzy search
- **What Linear does**: `/` opens search across everything (issues, docs, projects).
- **DevLead delivery**: `/` opens a dedicated search page (or reuses command palette in "search-only" mode). Index: Issues, Docs (AI plans, Docs/Plans, decision-log, run reports), code (via GitHub code-search MCP).
- `[new]`

### A.7 Keyboard shortcuts — **mouseless everything**
- **What Linear does**: every action has a shortcut; no mouse needed.
- **DevLead delivery**: Part 6 §16 already drafts keyboard shortcuts. Expand to match Linear's full set: `C` (new issue), `G+I` (go to inbox), `G+P` (go to projects), `A` (assign), `S` (change status), `P` (change priority), `L` (add label), `.` (open inspector), `/` (search), `Cmd-K` (palette), `?` (show all shortcuts), `Esc` (close overlay). Shortcut cheat-sheet overlay triggered by `?`.
- `[augment — Part 6 §16 currently stubby; complete the full Linear-parity table]`

### A.8 Triage inbox
- **What Linear does**: new Issues land in a Triage view where a human assigns priority/labels/team.
- **DevLead delivery**: `status:triage` label. New Issues (both human- and AI-filed) start there. Heartbeat Step 1 orient includes a triage pass — auto-assigns `priority:*` + `estimate:*` + `agent:*` based on content, then flips label to `status:backlog`. See §C.2.
- `[new]`

### A.9 Project health + milestones
- **What Linear does**: Project page shows status (On track / At risk / Off track), milestone progress, burn-up chart.
- **DevLead delivery**: Phase pages already exist implicitly via `AI plans/phase-N-plan.md`. Render them as Project pages with: progress bar (closed/total issues), next milestone, last 5 decisions, velocity this cycle, blocked-on list. Use existing data — no new schema.
- `[new — UI only]`

### A.10 Roadmap
- **What Linear does**: a timeline view of Projects/Initiatives across quarters.
- **DevLead delivery**: render Parts 1–7 + Phases as a Gantt/timeline across a 6-month horizon. Each Phase has a start/end; completed Issues show as green bars, in-progress as blue, upcoming as gray. Data source: GitHub milestones + phase-plan files.
- `[new — v2 polish, not blocking vibe-coding MVP]`

### A.11 Git/GitHub integration
- **What Linear does**: auto-branch-naming from Issue (`username/ENG-123-issue-title`), auto-link PR to Issue, auto-close on merge.
- **DevLead delivery**: already partial — CLAUDE.md §6 branching strategy + "Closes #N" in PR bodies auto-close. Add: Issue-detail page shows linked PRs, branches, commits in real time. See §C.8.
- `[augment]`

### A.12 Integrations (non-Git)
- **What Linear does**: Slack, Discord, Figma, Intercom, Zendesk, Sentry, Zapier, etc.
- **DevLead delivery v1**: Slack + Discord for notifications (Part 1 §4 already mentions). Figma via existing Figma MCP. GitHub is covered. Sentry/error-tracking = v2. Zapier = not needed (MCP covers automation).
- `[new — v1 scope: Slack + Discord notifications only]`

### A.13 API + webhooks + GraphQL
- **What Linear does**: full public GraphQL API + webhook firing on every event.
- **DevLead delivery**: MCP layer (Part 1 §5) is the equivalent. Add a webhook endpoint on the dashboard (`POST /api/webhook/:event`) that fires on heartbeat-tick, issue-close, decision-log-append. This lets external dashboards / Claude sessions subscribe.
- `[new — Phase 4]`

### A.14 Analytics
- **What Linear does**: cycle velocity, burndown charts, project health trends, completion rate by assignee.
- **DevLead delivery**: run reports already have this data. Add dashboard charts: *Issues closed per cycle*, *Heartbeat ticks per hour*, *Avg time Issue → close*, *Decisions per heartbeat*, *Stack depth over time*. Reuse Part 6 §10 real-time visualizations.
- `[augment — Part 6 §10 already drafts VRAM + coverage; add velocity + heartbeat-pace]`

### A.15 Real-time collaboration (multi-user cursors, presence)
- **What Linear does**: you see other team members' cursors and edits live.
- **DevLead delivery**: v1 is single-designer; presence = "heartbeat is running" indicator (Part 6 §6.3 already has this). v2 adds multi-user when multi-workspace lands.
- `[deferred to Phase 4+]`

### A.16 Offline-first / PWA
- **What Linear does**: app works offline, syncs in background.
- **DevLead delivery**: dashboard is Next.js + local — already offline-capable for read. Writes queue locally and replay through MCP on reconnect. PWA install = v2 polish.
- `[augment — Part 1 §6 local-first already covers this philosophically; add concrete PWA manifest in Phase 4]`

### A.17 Dark mode + themes
- **What Linear does**: light / dark / system, and custom accent colors.
- **DevLead delivery**: already Part 6 §14 (light/dark/system). Accent-color = v2.
- `[kept]`

### A.18 Import
- **What Linear does**: Import from Jira, GitHub Issues, CSV, Asana, ClickUp.
- **DevLead delivery**: GitHub Issues is the source of truth already. CSV import = v2 (for non-GitHub repos). Jira/Asana = not needed.
- `[deferred]`

### A.19 Notifications
- **What Linear does**: in-app inbox, email, Slack, push. Granular rules (only mentions, only assigned, only priority-urgent, etc.).
- **DevLead delivery**: in-app (Part 6 already has notification UI), Slack/Discord from §A.12, email = v2. Granularity controlled by Preferences (Part 1 §8 first-class).
- `[augment — explicitly lock Linear's notification-rule granularity as the v1 target]`

### A.20 Templates
- **What Linear does**: Issue templates, Project templates.
- **DevLead delivery**: GitHub supports Issue templates natively. Add 3 templates: *Bug*, *Task*, *Question* (Dev-Q&A flow). Project template = copy an existing Phase plan + rename.
- `[new — small lift]`

### A.21 Mobile app
- **What Linear does**: iOS + Android native apps with the full feature set.
- **DevLead delivery**: dashboard is responsive (Part 6 §15). Native app = v3. Not required for vibe-coding MVP.
- `[deferred]`

### A.22 Permissions / roles
- **What Linear does**: admin, member, guest, viewer roles.
- **DevLead delivery**: single-designer workflow v1 — designer is admin, Lead is the executor, agents are restricted. Multi-user = v2 with multi-workspace.
- `[deferred]`

---

## B. Vibe-coding evolution — where DevLead is **better** than Linear

These are capabilities Linear **cannot** provide because it's a human-ops tool. DevLead has them because it's AI-native.

### B.1 Autonomous issue decomposition
- **User action**: "build a Stripe checkout flow."
- **Linear**: user manually creates ~20 Issues.
- **DevLead**: Lead decomposes into a sub-issue tree, auto-files Issues with AC, assigns priority/estimate/agent, queues in backlog.
- `[new capability — Lead responsibility, Part 1 §3]`

### B.2 Autonomous task assignment + execution
- **Linear**: you drag an Issue to "in progress" and do the work.
- **DevLead**: heartbeat picks the next leaf, creates a branch, delegates to the right agent, reviews output, merges.
- `[new capability — covered by Part 1 §3.3-§3.5]`

### B.3 Decision log as first-class artifact
- **Linear**: decisions live in comments, ADRs, or Notion elsewhere.
- **DevLead**: `decision-log.md` with `D-YYYYMMDD-###` entries, referenced by every commit, PR body, and run report. Append-only. Full audit.
- `[new — already in place, promote to a dashboard surface (Docs sub-tab)]`

### B.4 Run reports per heartbeat
- **Linear**: cycles summarize bulk metrics at end of sprint.
- **DevLead**: `reports/run-N-summary.md` on every productive heartbeat tick. Human-readable narrative of what happened, what's next.
- `[new — already in place, surface in Docs sub-tab]`

### B.5 Auto-triage
- **Linear**: humans triage.
- **DevLead**: heartbeat Step 1 triage pass auto-assigns labels within 1 tick. Human only intervenes if the Issue needs a design answer (Dev-Q&A).
- `[new — see §C.2]`

### B.6 Guardrails + audit trail
- **Linear**: integrations trusted implicitly.
- **DevLead**: every outbound call goes through the MCP guardrail (Part 1 §5 + Phase 3 §C.1). Synthetic attempt to reach the public internet outside MCP is blocked and auto-files a violation Issue.
- `[kept — Phase 3 §C.1 delivers this]`

### B.7 Hourly Grok strategic escalation
- **Linear**: nothing comparable.
- **DevLead**: once per hour, consolidated prompt to Grok 4.1 Fast for cohesion review.
- `[kept — Part 1 §3 step 6]`

### B.8 Dev-Q&A board (skippable clarifying Qs)
- **Linear**: questions live in issue comments — slow, interleaved with work.
- **DevLead**: `Docs/Plans/Dev-Q&A.md` is a dedicated board for design questions. Heartbeat can post Qs and keep moving; user answers async.
- `[kept — CLAUDE.md §4b]`

### B.9 User preferences controlling agent routing
- **Linear**: no routing concept.
- **DevLead**: Preferences (Part 1 §8) map task-type → agent. E.g., "Frontend → Roo Code, Backend → Copilot." Lead enforces every tick.
- `[kept — Part 1 §8]`

### B.10 Heartbeat indicator + pause lockfile
- **Linear**: no concept; work is always human-driven.
- **DevLead**: top-bar heartbeat indicator shows last tick + next-wake delay. Pause button writes `.heartbeat-paused` — Lead respects on next tick.
- `[kept — Part 6 §6.3 + Phase 3 §C.3]`

### B.11 Generative issue descriptions
- **Linear**: user writes issue body manually.
- **DevLead**: user types 1 sentence → Lead expands to full AC + acceptance tests + related-decisions links.
- `[new — Phase 4]`

### B.12 AI-generated roadmap from a loose brief
- **Linear**: PM builds the roadmap.
- **DevLead**: designer uploads Parts 1–6 → Lead generates phased roadmap + first 3 Issues for the current phase.
- `[kept — Part 1 §3 step 1]`

### B.13 Heartbeat-driven progression vs manual sprint planning
- **Linear**: sprint planning meetings.
- **DevLead**: heartbeat schedules itself (`schedule` skill / `/loop`). No ceremonies.
- `[kept — CLAUDE.md §8]`

### B.14 Branch + PR + merge automation
- **Linear**: user does the git work.
- **DevLead**: Lead creates branch, agent codes, Lead merges (with self-merge authorization per memory).
- `[kept — smart-pipeline memory]`

### B.15 Code-quality / spec-compliance subagent reviewers
- **Linear**: human reviewers.
- **DevLead**: 3-stage subagent pipeline (implementer → spec reviewer → code-quality reviewer) on every leaf.
- `[kept — subagent-driven-development memory]`

### B.16 Credit- & subscription-aware resource allocation
- **Linear**: no concept; Linear doesn't pay for its users' LLM credits.
- **DevLead**: tracks remaining credit budgets across every paid resource the user configures (Claude Code subscription, GitHub Copilot seats + GitHub API rate limits, OpenAI, Anthropic API direct, Cursor, etc.), and schedules heartbeat work against budget in real time. When the monthly cap is 38% consumed on day 5, Lead slows the cadence, batches more work per tick, defers non-urgent ticks, and surfaces the burn rate on the dashboard. See §I for the full spec.
- `[new — unique DevLead capability, motivated by user directive 2026-04-20: "this program do is be subscription credit where for cloud code GitHub ... intelligent credit usage"]`

---

## C. Workflow parity — patterns Claude Code adopts into the heartbeat

The user's directive: *"copy that workflow if it improves your work."* These are Linear's internal workflow patterns that would make the heartbeat better. Each has a "why adopt" + "how to adopt" + "phase to ship."

### C.1 Cycles (1-week time-boxed sprints)
- **Linear pattern**: weeks-long cycles; Issues auto-rollover if unfinished.
- **Why adopt**: gives me a denominator for velocity ("closed 12 Issues this cycle" vs "closed 12 Issues forever"). Lets run reports show trendlines. Adds a natural "cycle-end retro" moment.
- **How**: `cycle:2026-W17` label on every Issue. Heartbeat Step 1 orient at the start of a new ISO week auto-rolls unfinished `cycle:<prev>` Issues into `cycle:<current>` with a comment. Run report at cycle-end summarizes closed-count + velocity.
- **Phase**: 4 (Phase 3 stays focused on backbone + §D UI).
- `[new — documented here, Issue filed when Phase 4 opens]`

### C.2 Triage inbox + auto-triage pass
- **Linear pattern**: new Issues land in Triage, a human sorts them.
- **Why adopt**: my backlog already has 20+ Issues of mixed priority. A triage step would pre-classify `priority:*` / `estimate:*` / `agent:*` so pick-order is deterministic.
- **How**: every newly-filed Issue defaults to `status:triage` (not `status:backlog`). Heartbeat Step 1 runs a triage pass: for each `status:triage` Issue, read body, assign `priority:*` (default `medium`), `estimate:*` (default `M`), `area:*`, optional `agent:*`; flip to `status:backlog`. If triage can't classify confidently, post a `Q-` in Dev-Q&A.
- **Phase**: 3 (small lift, high leverage).
- `[new — Issue should be filed soon]`

### C.3 Priority levels
- **Linear pattern**: 5 levels (none, urgent, high, medium, low). Pick order: urgent first.
- **Why adopt**: oldest-first breaks down when a critical bug (e.g., the peer-dep regression #155) needs to jump the queue. Priority makes that explicit.
- **How**: `priority:urgent / high / medium / low` labels. CLAUDE.md §3 Step 2 pick order becomes: in-progress → urgent-oldest → high-oldest → medium-oldest → low-oldest → (backbone exception). `priority:urgent` is reserved for production-blocking bugs only; Lead needs a documented trigger to escalate.
- **Phase**: 3 (amends CLAUDE.md §3 §6).
- `[new — Issue + CLAUDE.md amendment when user confirms]`

### C.4 Estimates + velocity tracking
- **Linear pattern**: points per Issue; cycle velocity.
- **Why adopt**: run reports currently say "15th subagent-driven leaf this session" — a count, not a velocity. Estimates let me say "closed 32 points this cycle vs 18 last cycle → improving."
- **How**: `estimate:XS` (≤30min) / `S` (1 heartbeat) / `M` (2-3 heartbeats) / `L` (cycle) / `XL` (multi-cycle, decompose). Heartbeat tallies closed-estimate per run report + per cycle.
- **Phase**: 4 (pairs with cycles §C.1).
- `[new]`

### C.5 Initiatives layer (above phase)
- **Linear pattern**: Initiative > Project > Issue hierarchy.
- **Why adopt**: DevLead has Part → Phase → Issue. Part is the Initiative-equivalent. Formalizing this makes the Roadmap view (§A.10) natural to render.
- **How**: no new label — Parts 1-7 are the Initiatives. Use GitHub Milestones for Phases. Each Issue already has `phase:*` label.
- **Phase**: surface in UI (Phase 3 §D.3+ or Phase 4).
- `[augment]`

### C.6 Shared named views (file-backed)
- **Linear pattern**: save filters as Views, pin to sidebar.
- **Why adopt**: my heartbeat currently builds `gh issue list --label X --label Y` queries ad-hoc. File-backed views are version-controlled and give the user a sidebar of "what's happening."
- **How**: `.claude/views/<name>.md` with YAML frontmatter (`filter`, `sort`, `layout`) + markdown description. Heartbeat + dashboard read the same files.
- **Phase**: 3 or 4.
- `[new]`

### C.7 Status workflow expansion + canceled state
- **Linear pattern**: explicit Canceled state (vs Done).
- **Why adopt**: I currently close superseded Issues (e.g., #160 this tick) with a comment but no structured "canceled" state. A `status:canceled` label + a distinct close-reason helps the audit trail.
- **How**: add `status:canceled` label. Supersede protocol: label + comment citing the superseding PR/Issue + close. Distinct from `status:done` which implies the AC was met.
- **Phase**: 3 (small).
- `[new]`

### C.8 Auto-label workflows (GitHub Actions or MCP)
- **Linear pattern**: on "PR opened," auto-set status to In Review; on "PR merged," auto-close Issue.
- **Why adopt**: removes 2-3 manual label flips per tick.
- **How**: GitHub Action or MCP hook. Triggers:
  - New Issue → `status:triage`
  - First commit on `issue-N/*` branch → `status:in-progress` on #N
  - PR opened → `status:review`
  - PR merged → `status:done` + close (already works via "Closes #N")
  - Escape-to-cancel comment → `status:canceled` + close
- **Phase**: 3 or 4.
- `[new]`

### C.9 Emoji reactions as workflow signals
- **Linear pattern**: reactions on comments.
- **Why adopt**: heartbeat could signal state via reactions instead of long comments. `👀` = "Lead is looking at this," `🚧` = "in progress," `✅` = "done," `🛑` = "blocked on user," `🔁` = "rolled to next cycle." Cuts comment noise.
- **How**: heartbeat uses `gh api /issues/:n/reactions` to set the appropriate reaction. Dashboard renders reactions as status indicators.
- **Phase**: 4 (polish).
- `[new]`

### C.10 Cycle-end retrospective run report
- **Linear pattern**: end-of-cycle summary with velocity + retro notes.
- **Why adopt**: my run-N reports are per-tick. A weekly `reports/cycle-2026-W17-retro.md` aggregates the 20-50 ticks in a cycle with: closed count, estimate burn, decisions made, regressions caught, Issues filed, velocity delta vs last cycle.
- **How**: heartbeat detects ISO-week boundary, generates retro at start of new cycle.
- **Phase**: 4.
- `[new]`

### C.11 Pinned "Triage" + "In Progress" + "Review" views on left rail
- **Linear pattern**: sidebar links to the views the user looks at 50x a day.
- **Why adopt**: dashboard currently has 3 tabs per project (Coding / Guidance / Log). Linear-style left rail would add: Inbox, Triage, In Progress, Review, My Issues, Backlog, Done this week.
- **How**: extend Part 6 §6 left rail; each link maps to a `.claude/views/*.md`.
- **Phase**: 3 or 4.
- `[augment Part 6 §6]`

### C.12 Live Markdown editor with mentions + slash-commands in comments
- **Linear pattern**: `/` opens slash-command palette inside any comment field.
- **Why adopt**: Dev-Q&A and comment threading would be faster if the user could `/assign`, `/label`, `/close` inline.
- **How**: v2 UI addition — pair with command palette (§A.3).
- **Phase**: 4 or 5.
- `[new]`

---

## D. Implementation roadmap (what goes in which Phase)

### D.1 Phase 3 (current) — essential Linear-parity foundations
- §C.2 Triage inbox + auto-triage label (small lift, improves backlog readability immediately)
- §C.3 Priority levels + updated heartbeat pick order
- §C.7 `status:canceled` label
- §A.2 Label namespace lock (document canonical `type/area/phase/priority/estimate/agent/status:*`)
- §A.7 Keyboard shortcuts — complete the Part 6 §16 table
- §A.3 Command palette v1 (Cmd-K with issue search + navigation) — Phase 3 §D.8-ish

### D.2 Phase 4 — cycles, analytics, richer UI
- §C.1 Cycles + auto-rollover
- §C.4 Estimates + velocity
- §C.10 Cycle-end retros
- §A.4 Saved views (`.claude/views/`)
- §A.5 Board layout (kanban)
- §A.14 Velocity + heartbeat-pace charts
- §A.20 Templates
- §A.13 Webhook endpoint

### D.3 Phase 5 — polish + multi-user + mobile
- §A.10 Roadmap Gantt
- §A.5 Calendar + Timeline layouts
- §A.11 Non-Git integrations (Slack/Discord granularity)
- §A.15 Real-time multi-user collab (needs multi-workspace first)
- §A.21 Mobile app (native)

### D.4 Anti-scope (NOT doing)
- Jira / Asana / ClickUp importers (not our user flow).
- Sentry/error-tracking integrations (MCP covers this).
- Zapier (MCP is our automation fabric).
- Intercom / Zendesk.
- SLA tracking (Linear has this for support teams; we're a dev tool).
- Multi-billing / enterprise (single-designer workflow for v1).

---

## E. Success criteria

Phase 3 + Phase 4 deliver Linear parity when:
- [ ] Screenshot of any DevLead dashboard surface sits next to the Linear equivalent without looking amateurish (inherited from Part 6 §4.5).
- [ ] Every action a Linear user can do with the keyboard, a DevLead user can do with the same keyboard (§A.7).
- [ ] Command palette (Cmd-K) resolves in < 50 ms and covers issues + projects + docs + actions (§A.3).
- [ ] Priority + estimate + cycle + triage labels are in use on 100% of newly-filed Issues (§C.2-C.4).
- [ ] Run reports show velocity per cycle (§C.10).
- [ ] Dashboard renders Board layout for any List view (§A.5).
- [ ] A new designer can pick up the dashboard with zero-CLI and operate it — already Part 6 §1.4.

**DevLead's vibe-coding advantage over Linear is verified when:**
- A user types "build a Stripe checkout flow," the Lead decomposes into ~20 Issues with priorities + estimates + agent assignments, and the first 3 are in progress within 2 heartbeats — all without the user clicking "Create Issue" once.

---

## F. Open questions (for the designer to answer)

These are decisions I made defaults for but you should confirm or override. Answer in `Docs/Plans/Dev-Q&A.md` — they're not blocking but they shape Phase 4+.

- **Q-F1**: Multi-workspace / multi-team in scope for v1 DevLead? (Default: NO — single designer, single product, multiple projects per Part 1 §9. Multi-workspace = Phase 5+.)
- **Q-F2**: Mobile app required for MVP? (Default: NO — responsive dashboard only. Native mobile = Phase 5+.)
- **Q-F3**: Integration marketplace (extensible plugins) or fixed set (Slack/Discord only)? (Default: fixed set for v1; marketplace = Phase 5+.)
- **Q-F4**: Should `priority:urgent` auto-pause the current Issue and jump the queue, or just sort higher on next tick? (Default: jump on NEXT tick — no preemption. Preemption = violates "finish before switching" memory.)
- **Q-F5**: Who can file `priority:urgent` Issues? (Default: designer OR Lead — but Lead must cite a regression or production failure in the Issue body.)
- **Q-F6**: Cycle length — 1 week (Linear default) or 2 weeks? (Default: 1 week, aligns with heartbeat density.)
- **Q-F7**: Cycle auto-rollover: roll unfinished to next cycle silently, or require ack from designer? (Default: silent roll + summary in cycle-end retro.)

---

## G. Cross-reference table (what this file changes in Parts 1–6)

| Part | Section | What Part 7 adds / implies |
|---|---|---|
| Part 1 | §3 workflow | + triage pass at Step 1 (§C.2); + priority-aware pick order (§C.3) |
| Part 1 | §10 considerations | + cycle velocity + estimate labels |
| Part 6 | §6 shell | + command palette component (§A.3); + richer left rail (§C.11) |
| Part 6 | §7.x tabs | + Board layout (§A.5); + saved views (§A.4) |
| Part 6 | §10 visualizations | + velocity chart + heartbeat pace (§A.14) |
| Part 6 | §16 shortcuts | + full Linear-parity shortcut table (§A.7) |
| CLAUDE.md | §3 Step 1 Orient | + triage pass sub-step (§C.2) |
| CLAUDE.md | §3 Step 2 Pick order | + priority-aware oldest-first (§C.3) |
| CLAUDE.md | §6 Project Conventions | + label namespace lock (§A.2) |

Each of these amendments will be filed as its own GH Issue when Phase 4 opens so the changes land in small, reviewable leaves.

---

## I. Credit-aware resource allocation (per B.16)

**Why this exists**: the designer's subscription budgets are the system's real bottleneck, not compute. A heartbeat that burns through a month's Claude Code quota in week 1 is worse than a slower heartbeat that finishes the month. Linear never thinks about this because humans buy Linear seats once — LLM credits are metered and elastic.

**Dogfooding origin**: the 2026-04-20 directive to pause the heartbeat ("im running low on credits this week") is the live lesson. DevLead's future users will hit the same wall; the product must handle it automatically instead of asking them to babysit the loop.

### I.1 Tracked resources (v1)

| Resource | Metered unit | Source of truth | v1? |
|---|---|---|---|
| **Claude Code subscription** (Pro / Max / Enterprise) | Premium-request % of monthly allowance | User-entered + optional API query if Anthropic exposes one | **yes** |
| **GitHub Copilot** (Individual / Business / Enterprise) | Completion count / chat request count | GitHub API `/user/copilot/billing` (where available) + user-entered | **yes** |
| **GitHub API rate limit** | Requests per hour (primary + secondary) | `GET /rate_limit` | **yes** |
| **Anthropic API (direct)** | Tokens (input + output) per model | Anthropic Usage API (hourly/daily) | v2 |
| **OpenAI API** | Tokens + $ spend | OpenAI Usage API | v2 |
| **Grok / xAI** (the mandatory hourly escalation in Part 1 §3 step 6) | Requests + $ spend | xAI billing API | v2 |
| **Cursor / Continue.dev / other agent subscriptions** | Per-provider | User-entered | v2 |
| **Cloud LLM (local)** | $0 — only tracked for energy/VRAM context | Ollama / LM Studio headers | **yes (for display only)** |

Each tracked resource gets a record in a new `dashboard/data/credit-budgets.json` (or Postgres table in Phase 4):
```
{
  "resource": "claude-code",
  "plan": "max",
  "period": "monthly",
  "periodStart": "2026-04-01",
  "periodEnd": "2026-04-30",
  "budget": 1000,                 // user-entered allowance (requests / tokens / $)
  "unit": "premium-requests",
  "consumed": 380,                // sampled or reported
  "consumedAsOf": "2026-04-20T21:30:00Z",
  "lastSampleSource": "user-entered" | "api",
  "softLimitPct": 70,             // warn on dashboard
  "hardLimitPct": 90              // Lead pauses/slows automatically
}
```

### I.2 Lead's credit-aware decisions (the whole point)

Heartbeat Step 1 orient reads the budget table. For every resource that's within budget, Lead proceeds normally. For every resource that crossed a threshold:

- **soft limit (default 70%)** → dashboard badge goes amber; Lead extends cadence by 50% (e.g., 780s → 1170s), and prefers work that doesn't touch this resource (e.g., if Claude Code % is high, Lead batches more TDD steps per leaf instead of running a subagent per sub-task).
- **hard limit (default 90%)** → dashboard badge goes red; Lead pauses new ticks for this resource's workflows. If Claude Code is at 90%, Lead does not dispatch subagents; for pure-git work (branch ops, label flips) it can still run. Emits a Dev-Q&A question asking the designer to raise the budget, wait for next period, or switch to cheaper models for the rest of the period.
- **period end** → Lead rolls the counter to 0, logs the cycle-final consumed value to `reports/credit-*.json` so velocity-per-credit can be charted over time.

### I.3 Intelligent allocation across resources

When the same work could be done by multiple resources, Lead picks the one with the most headroom:
- **Subagent dispatch**: if Claude Code is at 85% but Copilot is at 20%, prefer @copilot delegation for small, well-scoped leaves (aligned with the existing `reference_copilot_delegation.md` memory). If both are strained, fall back to the local Ollama model (cheaper but slower).
- **Hourly Grok escalation** (Part 1 §3 step 6): if the xAI $ budget is within 10% of cap, Lead skips the hourly call OR sends a shorter prompt.
- **GitHub API**: if the primary rate limit is < 100 remaining, Lead defers non-essential API calls (label syncs, PR status polls) and batches them at the next period rollover.
- **Cadence auto-tune**: the ScheduleWakeup delay becomes a function of (tick-value / credit-consumed-per-tick), not a fixed three-tier. Ticks that consume 0 Claude-Code credits (pure git/doc work) run at normal pace even when the Claude budget is low.

### I.4 Designer-facing surfaces

- **Top-bar widget** (extends Part 6 §6.3 heartbeat indicator): "Claude Code 38% · Copilot 12% · GH API 4800/5000" with amber/red tints when thresholds crossed. Click opens a Budget panel.
- **Budget panel** (new dashboard page / right inspector content): per-resource bar with budget / consumed / period-end / soft / hard limits. Editable inline. "Test-mode" toggle that simulates a threshold being crossed so the designer can see how Lead responds.
- **Run reports**: every `reports/run-N-summary.md` adds a "Credits consumed this tick" line (claude-code: +3 requests, gh-api: +12 calls, xai: $0.02). Over a cycle, `reports/cycle-*-retro.md` (§C.10) aggregates total credit spend per resource + shows it next to work delivered (issues closed, tests added).
- **Preferences** (Part 1 §8): per-resource soft-limit % + hard-limit % + cadence-multiplier-on-breach + "what to do when hard limit hit" (pause / switch to local / notify and wait).

### I.5 Predictive mode (v2)

Based on current burn rate + days remaining in the period, Lead projects whether the current cadence will exhaust the budget before period end. If yes, Lead proactively slows cadence ahead of time (soft-limit hit becomes inevitable) OR warns the designer on the dashboard: "At current pace you'll hit the Claude Code cap on day 22 of 30. Suggest slowing to 2-hour cadence, or raising the plan."

### I.6 Integration with the pause-lockfile (Phase 3 §C.3)

The existing `.heartbeat-paused` lockfile is a manual pause. Credit-awareness adds an automatic pause with a structured `reason` field: `{"pausedAt":"...","reason":"hard-limit:claude-code-max","resource":"claude-code","autoResume":"2026-05-01T00:00:00Z"}`. The lockfile auto-expires at period-end so the heartbeat resumes at the next billing cycle without user action.

### I.7 Why Linear cannot do this
Linear doesn't know what LLMs you're using, how much you've spent, or whether you're running Claude Code on the same repo. DevLead owns the delegation gateway (MCP), the scheduler (heartbeat), and the preferences (Part 1 §8), so it has perfect visibility — and the responsibility — to spend your credits wisely.

### I.8 Success criteria
- [ ] Designer enters their Claude Code plan + monthly allowance on first run; every tick from then on stays within it automatically.
- [ ] When credits cross 70%, the user sees an amber badge without having to open a separate tool.
- [ ] When credits cross 90%, the heartbeat slows/pauses automatically without the user typing "stop."
- [ ] Over a full month, run reports show "total credits spent / issues closed" — a velocity-per-credit number that's comparable across months.
- [ ] If the designer adds a new paid resource (e.g., subscribes to Cursor mid-month), Lead auto-detects + prompts for budget entry within 1 tick.

---

## H. Document lifecycle

- **Writable**: like other `Docs/Plans/*` files, this is **locked user intent** after the designer reviews + approves — I won't edit it without explicit approval (CLAUDE.md §5).
- **Version bumps**: new major features added via a new `### A.N` / `### B.N` / `### C.N` entry with `[kept/augment/new]` tag.
- **Retirement**: features that ship and become baseline move into Part 1 or Part 6; this file stays as the canonical "what we're mimicking and what's better."
