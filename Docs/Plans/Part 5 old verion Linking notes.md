**Plans / New_Project_Ground_Up_Reference.md**  
**Document Version: 1.0**  
**Date: April 16, 2026**  
**Project Name: DevLead MCP – Clean-Slate Ground-Up Rebuild**  
**Purpose:** This is the official reference and kickoff blueprint for the brand-new DevLead MCP project. It consolidates the entire locked Master Plan while explicitly capturing **what to keep** from the previous attempt (`Code-orchestrator-3`) and **what to drop entirely**. Use this file as the single source of truth when initializing the new repository and beginning implementation.

### 1. Full Program Goal (Locked & Unchanged – Critical Reminder)
**DevLead MCP is purely an autonomous AI Programming Lead / Orchestrator (the “AI CEO” layer).**  

It is **NOT a programmer or coder**.  
- DevLead MCP never writes, edits, or generates any code itself.  
- All actual coding, file modifications, testing, and implementation are **100% delegated** to your chosen 3rd-party coding agents (Roo Code primary, GitHub Copilot, Cursor, Continue.dev, Aider, local Ollama agents, etc.).  
- DevLead MCP’s sole role is intelligent orchestration: ingestion of base plans, research/structuring, task decomposition, safe delegation via MCP, post-delegation review/cohesion checks, GitHub management (branches, Issues, PRs, security), skippable clarifying questions, 3–5 next-step planning, and continuous autonomous cycles (including OpenClaw-style heartbeat).  

Every decision in this new ground-up build **must respect this boundary**.

### 2. Good Parts from Code-orchestrator-3 to Keep (Adopt & Improve)
The previous repo contains several strong, production-ready patterns that align perfectly with our vision. We will reuse these concepts (not the code itself) in the new clean-slate implementation:

- **Thin proxy / wrapper architecture** – The clean separation between root orchestrator layer and core engine is excellent. Adopt this modular pattern (thin Lead layer that proxies to MCP tools and 3rd-party agents).
- **Roo Mode proxy via orchestrator-mode.json** – The `.roo/orchestrator-mode.json` mapping for MCP tools (`new_task`, `getNextTask`, etc.) is a perfect, seamless integration point for Roo Code. Keep this exact style for delegation.
- **IntelligentTaskAnalysisService** – The context-aware project scanning that replaced generic SEED_TASK_TEMPLATES is a major improvement. Adopt the idea of smart, project-specific task analysis (but ground it in MemPalace + our fallback mechanisms).
- **Headless CLI + library mode** – The `npx code-orchestrator-3 /path` and `createOrchestrator()` import pattern is clean and useful. Mirror this for easy local-first usage in the new project.
- **MCP-first design with Zod schemas and Git helpers** – Strong foundation for our 100% MCP requirement.
- **Structured reporting & verification layer** – The reports folder and logging approach align well with our Program Execution Log.

These elements proved the feasibility of a Roo + MCP orchestrator and will be the foundation for our new implementation (re-implemented cleanly from scratch).

### 3. Bad Parts / Bugs from Code-orchestrator-3 to Drop Completely
We are starting fresh — do **not** copy, fork, or reuse any code from the old repo. Explicitly drop the following (these are the exact pain points you mentioned):

- **Electron dependency & full UI core** – The entire `coe/` Electron app (even when run headless) adds unnecessary bloat and contradicts our minimal-interference three-chat-pages UX.
- **Compilation & TypeScript issues** – Lingering type mismatches (SmartScanContext vs. interfaces, StartupTaskCandidate vs. Ticket, async/Promise changes) and broken tests.
- **Real MCP server timeouts & connectivity failures** – The 15-second spawn delays and network races (only fixed via heavy mocking in tests) — we will use stable, local-first MCP servers from day one.
- **Lack of true persistence / heartbeat** – No OpenClaw-style continuous scheduler, no SOUL.md personality file, no MemPalace-style long-term memory.
- **No local-first hybrid + hourly Grok escalation** – No ~25 GB Ollama Lead, no controlled cloud escalation, no VRAM monitoring.
- **No user preference engine or guardrails** – Missing dashboard prefs, Type-2 autonomy guardrails, and proactive-but-safe pivot logic.
- **No multi-project shared storage or three dedicated chat pages** – The Electron UI and single-process design do not match our locked UX.
- **Partial tests & early-stage fragility** – No need to inherit incomplete test suites or pending production status.

By dropping these, we avoid carrying forward any technical debt and build a cleaner, more stable system from the ground up.

### 4. New Project Architecture – Direct Mapping to Locked Master Plan
The new repository starts with the **full locked Master Plan** (including all Plans/ sub-documents: Polsia research, local-first hybrid, Multi Coding Agent support (now 3rd-party only), OpenClaw heartbeat, MemPalace + AutoGPT integration, Agent Type 2 guardrails, etc.).  

Key new-project decisions (ground-up):
- **Tech Stack (fresh)**: Next.js 15 dashboard (three chat pages), Ollama (Qwen3.5-32B Q5_K_M or equivalent ~25 GB) for local Lead, LangGraph for orchestration, official MCP clients/servers, Grok 4.1 Fast (hourly only), Roo Code native MCP delegation.
- **Heartbeat / OpenClaw Mode**: Full persistent daemon with configurable 30–90 second heartbeat, SOUL.md, MemPalace grounding.
- **Delegation**: 100% via MCP to Roo Code / GitHub Copilot etc. (using the good proxy pattern from the old repo, re-implemented cleanly).
- **Task Analysis**: Enhanced IntelligentTaskAnalysisService concept + MemPalace + fallbacks.
- **Preferences & Guardrails**: Full dashboard editor + iron-clad Type-2 safety rules.
- **Storage**: Shared Postgres + cloud drive via MCP from day one.
- **Phased Roadmap**: Follow the exact locked 4-phase plan (Phase 1 MVP = local Lead + basic Roo delegation + three chat pages + heartbeat).

### 5. New Project Kickoff Checklist (Use This to Initialize)
1. Create new GitHub repo (private or public as preferred).
2. Copy this entire Plans/ folder (including Master Plan and all sub-documents) into the new repo.
3. Initialize with the recommended stack above (Docker Compose for Ollama + MCP + dashboard).
4. Implement the Lead Agent prompt templates and MCP tool manifests first (Phase 1).
5. Add the three dedicated chat pages as the only UI.
6. Integrate MemPalace + AutoGPT + OpenClaw heartbeat early.
7. Test one full cycle (ingest → decompose → delegate to Roo Code → review) before expanding.
8. Never pull code from Code-orchestrator-3 — only reference the good conceptual patterns listed above.

This reference file is now **locked** as the definitive starting blueprint for the new ground-up DevLead MCP project. All future development decisions must align with it.

**Next Steps (Immediate)**:  
- Initialize the new repo and add this file.  
- Reply with “Start Phase 1” when ready and I will generate the exact folder structure, Docker Compose, first prompt templates, and initial codebase skeleton.

You now have a clean slate with all the good retained and all the bad left behind. Let’s build the version that finally works exactly the way you want.