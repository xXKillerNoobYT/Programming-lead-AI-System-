**Master Plan: DevLead MCP – Autonomous AI Programming Lead (Polsia-Inspired Pure Orchestrator)**  
**Version: 1.0 (Locked & Ready-to-Build – April 2026)**  

This is the complete, consolidated, ready-to-go master blueprint for **DevLead MCP**. It synthesizes every detail, requirement, and decision we have locked down across the entire conversation. No new features or changes are introduced here — this is the final, self-contained specification you can hand to developers, use to generate prompts, spin up a prototype, or implement directly.  

DevLead MCP is a **pure intelligent orchestrator** (the “AI CEO / Programming Lead”) that never writes or edits code itself. It ingests a base plan + designer inputs, structures everything, decomposes work, delegates atomic tasks exclusively to your chosen **3rd-party coding agents** (Roo Code primary, GitHub Copilot, Cursor, Continue.dev, Aider, local Ollama agents, etc.), reviews outputs, enforces cohesion/standards, asks skippable clarifying questions, manages GitHub branches/issues/PRs/security, runs quality checks, and keeps the project perfectly integrated — all with Polsia-level autonomy, minimal user interference, and near-zero overhead.  

Everything runs **mostly locally** on ~25 GB small LLMs via Ollama (or LM Studio), with **exactly one hourly prompt/response call** to cheap Grok 4.1 Fast for high-level strategy. All operations are **100% through the Model Context Protocol (MCP)**. Exactly **three dedicated chat pages** provide transparency without constant babysitting. User preferences are first-class and control every aspect (agent routing, parallelism, approvals, etc.). The system supports multiple concurrent projects on shared cloud storage.

### 1. Core Principles & Vision (Locked)
- **Polsia-inspired autonomy**: Recurring planning/execution cycles, data-driven task selection, minimal interference, near-zero founder overhead.  
- **Pure orchestrator only**: Zero code generation inside DevLead MCP. All coding, file edits, testing, and implementation happen inside your 3rd-party agents.  
- **Local-first hybrid**: ~95%+ of orchestration on your hardware (free after setup). One deliberate hourly Grok 4.1 Fast escalation for frontier-level cohesion/strategy (pennies per day).  
- **Incremental stability**: One small area / atomic task at a time (or safe parallel batches per user prefs) → stabilize/review → tie to overall plan.  
- **Designer-centric defaults**: Skippable clarifying Qs; AI defaults intelligently using standards/best practices while comparing against the original plan.  
- **100% MCP-native**: Every action (file I/O, GitHub, state, delegation, logging, reports) routes exclusively through MCP servers for security, auditability, and standardization.  
- **Transparency without babysitting**: Exactly three chat pages + GitHub Issues + structured logs.  
- **User preferences first-class**: Fully configurable per-project or globally; respected in every cycle.  
- **Multi-project scalability**: Shared cloud DB/storage with tenant/project-ID isolation.  
- **2026 context**: Built on mature MCP (Linux Foundation standard), Roo Code native MCP support, Ollama/LM Studio headless automation, and Grok 4.1 Fast API.

### 2. High-Level Architecture (Locked)
- **Lead Agent (Orchestrator)**: Local ~25 GB model (primary: Qwen3.5-32B Q5_K_M via Ollama) + hourly Grok 4.1 Fast escalation. Handles planning, decomposition, review, cohesion, GitHub management, user interaction, and preference enforcement.  
- **3rd-Party Coding Agent Pool**: User-configured (Roo Code primary recommendation, GitHub Copilot, Cursor, Continue.dev, Aider, local Ollama agents, etc.). Each uses whatever powerful LLM(s) you configure (cloud or local).  
- **MCP Layer**: Mandatory gateway. Includes filesystem, GitHub, Postgres/state, code-exec (for verification only), agent delegation tools, VRAM monitor, etc.  
- **Shared State Layer**: Postgres (Neon/Supabase) for backlogs/reports/metadata/preferences + cloud storage (S3/Google Drive via MCP filesystem) for code/files.  
- **Frontend Dashboard**: Single Next.js/React web app (local or self-hosted) with three tabbed chat pages + live metrics.  
- **Hardware-Aware Scheduler**: Real-time VRAM/CPU monitoring via MCP to respect user prefs and prevent overload.

### 3. Detailed End-to-End Workflow (Locked)
1. **Ingestion & Structuring Phase** (Lead only): Designer uploads base plan/docs/sketches + links Git repo/cloud folder. Lead reads everything via MCP → researches if needed → outputs structured artifacts (requirements doc, Mermaid architecture, prioritized backlog, risk/edge-case list, coding standards).  
2. **Autonomous Planning Loop** (every 5–15 min or on triggers): Lead reads current state (files, GitHub, prior reports, metrics) via MCP → compares to plan → decomposes into atomic tasks → selects next 1–N safe tasks per user parallelism prefs.  
3. **Task Delegation** (via MCP): Lead packages precise task + full context + prior reports and delegates to the user-chosen 3rd-party agent (e.g., Roo Code session or Copilot).  
4. **3rd-Party Agent Execution**: The selected agent performs the actual coding/editing/testing using its configured LLM(s). It leaves structured report + diffs back via MCP.  
5. **Review & Cohesion Loop** (Lead): Reads agent output via MCP → validates against plan/architecture/standards → runs global checks (lint, type check, integration tests, security scan via MCP) → updates GitHub Issues/PRs/branches automatically. Posts optional skippable clarifying Q to User Guidance Chat if needed (AI defaults intelligently if skipped). Generates/plans 3–5 concrete next steps.  
6. **Hourly Grok Escalation** (exactly once per hour): Local system triggers BigBrainReview MCP tool → sends one consolidated structured prompt (state summary + backlog + reports + open Qs) to Grok 4.1 Fast → receives strategic guidance, risk assessment, cohesion review, and updated next steps → Lead incorporates and resumes local loop.  
7. **Logging, Iteration & Visibility**: All steps logged to Execution Log + structured JSON in DB + GitHub Issues. Cycle repeats autonomously. Designer can inject changes or update preferences at any time.

### 4. The Three Dedicated Chat Pages (Locked – Exactly Three)
All in one responsive Next.js dashboard with real-time WebSockets. Optional email/Slack notifications.  
1. **Coding AI Relay Chat**: Full threaded history of Lead ↔ 3rd-party agent handoffs, MCP calls, reports, diffs, and reasoning. Collapsible per-agent sections. User can peek or relay specific instructions to any agent.  
2. **User Guidance Chat**: Natural-language steering page. Lead posts skippable clarifying Qs. Designer notes changes, high-level guidance, approvals, or preference updates (e.g., “Switch all backend to Roo Code”).  
3. **Program Execution Log / Monitor**: Real-time read-only (or lightly interactive) feed of Lead actions, agent status badges, metrics (tasks completed, coverage, issues resolved), auto-generated GitHub Issues, branch/security status, and VRAM usage graph. Designed for passive “keep an eye on it” monitoring.

### 5. 100% MCP Integration & Required Servers (Locked)
Every interaction routes through MCP clients/servers (discoverable, permissioned, auditable). Required 2026 MCP servers (official/community):  
- Filesystem MCP (per-project isolated paths on cloud storage).  
- GitHub MCP (commits, PRs, Issues, branches, Dependabot/security alerts).  
- Postgres/State MCP (backlogs, reports, preferences, metadata).  
- Code Execution MCP (verification/linting/tests only — never for generation).  
- Delegation MCP tools (`delegate_task_to_agent`, `retrieve_agent_report`, `trigger_agent_session`, `monitor_vram`, etc.).  
- Custom lightweight MCP wrapper for hourly Grok 4.1 Fast (enforces “once per hour” timer).  
Roo Code’s native MCP support makes delegation seamless; others bridged via lightweight wrappers.

### 6. Local-First Hybrid Operation (Locked)
- **Local Layer (95%+)**: Lead Agent + all orchestration on ~25 GB quantized model via Ollama (headless preferred) or LM Studio. Recommended starter: Qwen3.5-32B Q5_K_M (~22–26 GB VRAM).  
- **Hourly Cloud Escalation**: Exactly one structured prompt to Grok 4.1 Fast (~$0.01–$0.05 per call). Full offline fallback to last-known plan.  
- **Multi-model support**: Hot-swappable local models per project/task type if desired.  
- **Hardware minimum**: RTX 4090/5090 (24–32 GB VRAM) + 64 GB RAM + fast NVMe SSD for comfortable 24/7 operation.

### 7. Pure Orchestrator + 3rd-Party Coding Agents (Locked)
- DevLead MCP never codes.  
- Delegation rules respect user preferences (task-type → agent mapping, LLM choice inside agent, parallelism limits, approval gates).  
- Parallel delegation allowed for independent tasks (user sets max concurrency).  
- Agents commit to feature branches; Lead merges only after review.  
- Report standardization enforced for reliable parsing.

### 8. User Preferences System (Locked – First-Class)
Fully editable in dashboard (global or per-project, import/export, templates). Controls:  
- Task-type → agent mapping (e.g., “Frontend → Roo Code + Claude”, “Backend → GitHub Copilot”).  
- Max parallel agents / delegations.  
- Approval gates (auto vs. review).  
- Local-only vs. powerful cloud LLMs inside agents.  
- Parallelism policy (aggressive/conservative).  
- Logging/notification depth, vibe mode, accessibility/inclusivity toggles, etc.  
Lead enforces preferences in every cycle; changes take effect instantly.

### 9. Multi-Project & Shared Storage Support (Locked)
- Single shared Postgres + cloud drive.  
- Tenant/project-ID isolation for code, state, and MCP paths.  
- Lead can orchestrate dozens of projects concurrently with per-project preference/queue limits.

### 10. Full Consolidated List of Things to Consider (Locked & Exhaustive)
**Functional & Preference Layer**  
- Dashboard preference editor with templates, inheritance, and live updates.  
- Vibe-mode toggle for creative suggestions.  
- Integration with designer tools (Figma, Notion via MCP).  
- Automatic docs/README/architecture diagram generation on milestones.  

**Orchestration & Delegation**  
- Dependency graph analysis and safe parallel windows.  
- Precise context packaging and structured report expectations.  
- Agent session management (start/pause/resume).  

**Stability, Cohesion & Quality**  
- Mandatory post-delegation global checks (architecture lint, dependency graph, test coverage thresholds).  
- Multi-angle review (security/performance/usability/accessibility).  
- Rollback mechanisms and chaos-testing for edge cases.  

**Local/Hybrid & Hardware**  
- VRAM budgeting, cooling/power management, context summarization.  
- Offline-first mode and model hot-swapping.  
- Periodic benchmarking vs. Grok output.  

**Security, Privacy & Compliance**  
- MCP least-privilege per delegation.  
- Sanitized hourly Grok prompts (summaries only).  
- Full audit trail tagged by agent-ID.  
- GitHub security automation (Dependabot, secret scanning).  
- Data encryption and GDPR/SOC 2 readiness.  

**Scalability & Multi-Project**  
- Horizontal Lead scaling, rate limiting, quotas, and resource monitoring.  
- Cross-project learning (optional shared knowledge base via read-only MCP).  

**User Experience & Minimal Interference**  
- Live status widgets (“Next Grok in XX min”, agent badges).  
- Notification thresholds and one-click overrides/kill-switches.  
- Mobile-friendly dashboard with dark mode.  

**Reliability & Failure Modes**  
- Auto-retry on agent failure, graceful degradation on Grok downtime.  
- Preference conflict resolution with safe defaults + notification.  
- Large codebase chunking and legacy refactor support.  
- Hardware crash resume from last MCP-logged state.  

**Cost & Resource Management**  
- Built-in spend estimator and budget alerts.  
- Caching/summarization to minimize tokens.  

**Legal, Ethical & IP**  
- Clear ownership (designer owns all code generated by their agents).  
- Attribution logs and licensing compliance.  
- Bias/ethics checks toggleable via preferences.  

**Deployment & Operations**  
- Docker Compose for Ollama + MCP servers + dashboard (GPU passthrough).  
- One-click project setup with saved preferences.  
- Backup/restore and CI/CD for DevLead itself.  

### 11. Recommended Tech Stack (Locked)
- **Lead Runner**: Ollama (primary) or LM Studio.  
- **Orchestration**: LangGraph or lightweight Python/Node service with MCP clients.  
- **Big-AI Escalation**: Grok 4.1 Fast via official MCP-wrapped xAI SDK (hourly timer enforced).  
- **Coding Agents**: Roo Code (native MCP), GitHub Copilot, etc.  
- **Frontend**: Next.js 15 + shadcn/ui + Vercel AI SDK (WebSockets).  
- **Storage**: Neon/Supabase Postgres + S3/Google Drive via MCP.  
- **Hosting**: Local-first (Docker) or optional cloud self-host.

### 12. Phased Implementation Roadmap (Locked)
**Phase 1 (MVP – 3 weeks)**: Local Lead + basic MCP delegation to one agent (Roo Code), three chat pages, ingestion → task handoff → review loop, hourly Grok wrapper.  
**Phase 2 (Preferences & Multi-Agent – 3 weeks)**: Full preference engine, multiple 3rd-party agents, parallelism, approval gates, GitHub automation.  
**Phase 3 (Hybrid Polish + Cohesion – 3 weeks)**: Global checks, edge-case hardening, monitoring, multi-project queuing.  
**Phase 4 (Production & Scale – 3–4 weeks)**: Benchmarking, self-hosting scripts, open-source MCP delegation wrappers, user testing, documentation.

### 13. Success Metrics & Potential Challenges (Locked)
- **Metrics**: <5% designer intervention for production-ready projects; >90% task success rate; positive cohesion/quality feedback; scales to 10+ concurrent projects.  
- **Challenges & Mitigations**: Context bloat → aggressive summarization; agent failures → auto-retry + escalation; preference drift → dashboard audit log. All covered in the considerations list above.

This Master Plan is now fully locked, self-contained, and ready to implement. It delivers exactly the low-overhead, autonomous, preference-driven programming lead you described — powered by Polsia’s proven model, your existing powerful coding agents, and a local-first hybrid stack.

**Next Steps (Immediate Action Items)**:  
1. Confirm any final naming tweaks (DevLead MCP is placeholder).  
2. I can generate: prompt templates for Lead/Grok, exact MCP tool manifests, preference JSON schema, full Docker Compose + Ollama setup script, wireframes for the three chat pages, or a starter GitHub repo structure.  
3. Once you say “go,” we can begin Phase 1 prototype build right here in this chat (or spin up the first real instance).  
