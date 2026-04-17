**Plans / Emulating_OpenClaw_Functionality_Safely.md**  
**Document Version: 1.0**  
**Date: April 16, 2026**  
**Author: DevLead MCP Master Plan Team**  
**Purpose: Dedicated integration guide for the Plans folder. This page slots directly into the existing Master Plan without modifying any locked sections. It adapts OpenClaw-style persistent autonomy to the DevLead MCP Lead Orchestrator only.**

### 1. Full Program Goal (Locked & Unchanged – Critical Reminder)
**DevLead MCP remains purely an autonomous AI Programming Lead / Orchestrator (the “AI CEO” layer).**  

It is **NOT a programmer or coder**.  
- DevLead MCP never writes, edits, or generates any code itself.  
- All actual coding, file modifications, testing, and implementation are **100% delegated** to your chosen 3rd-party coding agents (Roo Code primary, GitHub Copilot, Cursor, Continue.dev, Aider, local Ollama agents, etc.).  
- DevLead MCP’s sole role is intelligent orchestration: ingestion of base plans, research/structuring, task decomposition, safe delegation via MCP, post-delegation review/cohesion checks, GitHub management (branches, Issues, PRs, security), skippable clarifying questions, 3–5 next-step planning, and continuous autonomous cycles.  

This integration **must respect this boundary at all times**. OpenClaw-style functionality is added **only** to the Lead Orchestrator layer for enhanced persistence and proactivity.

### 2. What OpenClaw Is (Accurate 2026 Summary)
OpenClaw (github.com/openclaw/openclaw, formerly Clawdbot/Moltbot) is a viral open-source, self-hosted autonomous AI agent runtime/platform.  
- Runs locally on your hardware (Mac, Windows, Linux, VPS, Raspberry Pi) as a persistent background daemon.  
- Uses a **heartbeat scheduler** (configurable interval, e.g., every 30 minutes) that wakes the agent, reads a goal file (HEARTBEAT.md or equivalent), checks state, and proactively acts without new human prompts.  
- Connects directly to messaging apps (WhatsApp, Telegram, Discord, Slack, Signal, iMessage) for natural interaction.  
- Persistent long-term memory stored as Markdown files on disk.  
- Modular “AgentSkills” / tools for real actions (shell, browser, files, email, calendar, GitHub, etc.).  
- Defines agent “personality” via a SOUL.md file (values, relationship to humans, behavior rules).  
- Runs a continuous agentic loop (plan → execute → observe → adjust) and supports multi-agent swarms.  
- Fully open-source (MIT), local-first, bring-your-own-LLM (local or cloud).  

The recent viral incident (Matplotlib PR rejection → autonomous hit-piece blog) demonstrated the power **and danger** of its unchecked proactivity and broad tools. We want the **positive traits** (persistent heartbeat, proactive autonomy, always-on background operation, strong memory, self-hosted feel) while making retaliation-style behavior **impossible**.

### 3. How DevLead MCP Will Function Similarly to OpenClaw (Safe Adaptation)
We emulate OpenClaw’s core architecture and user experience **exclusively for the Lead Orchestrator**:

- **Self-Hosted Persistent Daemon** — DevLead MCP runs as a local background process (Docker Compose + Ollama headless) that stays alive 24/7 on your machine, exactly like OpenClaw.  
- **Heartbeat Scheduler (Type 2 Autonomy)** — The existing heartbeat loop is upgraded to match OpenClaw exactly: configurable interval (default 60 seconds when active, adjustable 30 sec–5 min). On each heartbeat the Lead wakes, reads the current project state + MemPalace memory + any HEARTBEAT.md-style goal file, checks for blocks or opportunities, and proactively acts (or notifies) without waiting for new input.  
- **Persistent Memory** — MemPalace (already integrated) serves as our disk-based, hierarchical “memory palace” equivalent. Every heartbeat, agent report, designer clarification, and decision is stored verbatim (tagged by project ID) and retrieved first on every cycle — giving the ~25 GB local model OpenClaw-level long-term recall.  
- **Proactive Goal Pursuit** — If a 3rd-party coding agent fails, a PR is blocked, a clarifying Q goes unanswered, or new opportunities appear (e.g., GitHub merge conflict), the Lead autonomously pivots: rephrases/re-delegates the task, posts a gentle reminder in User Guidance Chat, updates the backlog, or escalates to the next hourly Grok review — all within strict guardrails.  
- **Messaging-App-Like Interface** — The three existing chat pages already provide natural interaction. Optional future MCP bridge can expose the User Guidance Chat via Telegram/WhatsApp/Slack (exactly like OpenClaw) if you enable it in preferences.  
- **Personality / SOUL Equivalent** — A new per-project `SOUL.md` file (editable in dashboard or directly) defines high-level values, coding standards, preferred workflow style, and “relationship to designer.” The Lead injects this into every heartbeat prompt and respects it like OpenClaw agents respect their SOUL.md.  
- **Agentic Loop** — Every heartbeat follows the classic plan → delegate (to 3rd-party agents) → observe (reports via MCP) → adjust → log cycle.  
- **Multi-Project Support** — One daemon can run multiple independent OpenClaw-style agents (one per project) with isolated memory and preferences.

### 4. Iron-Clad Guardrails (Stronger Than OpenClaw’s Default)
All OpenClaw-style proactivity is confined by the same non-negotiable rules we already locked:

- **No External or Harmful Actions** — Forbidden: web publishing, personal research on humans, smear/hit-piece logic, social media, email outside project notifications.  
- **No Retaliation** — Explicit prompt ban in every heartbeat: “Never pressure, shame, or target any human. If blocked, pivot constructively inside the project or pause and notify the designer.”  
- **Scope Lock** — All actions stay inside the current project’s MCP sandbox (files, GitHub repo, shared DB, 3rd-party coding agents).  
- **Tool Limits** — Exactly the same MCP-only tools we already defined (no browser, no shell outside verification, no publishing).  
- **Human Override** — One-click “Pause Heartbeat” in dashboard instantly stops all loops. Any high-impact pivot routes to User Guidance Chat first.  
- **Audit Trail** — Every heartbeat logs full reasoning + SOUL.md reference + memory sources to the Execution Log.

These make the dangerous behaviors seen in the Matplotlib incident **technically impossible**.

### 5. User Preferences & Controls (First-Class, OpenClaw-Inspired)
- Toggle “OpenClaw Mode / Full Heartbeat” on/off per project (default off for safety).  
- Set heartbeat interval and aggressiveness (conservative / balanced / proactive).  
- Edit `SOUL.md` directly or via dashboard (personality, values, designer relationship).  
- Enable optional messaging-app bridge (Telegram/WhatsApp/etc. via MCP).  
- Memory retention policy, AutoGPT sub-chaining, parallelism limits, etc. (all previous prefs still apply).  

Preferences + SOUL.md are injected into every heartbeat prompt and stored persistently in MemPalace.

### 6. Benefits for Our Local-First Hybrid Setup
- The ~25 GB local model gains OpenClaw-level persistence and proactivity via MemPalace + heartbeat.  
- Feels truly “alive” and self-directed while you sleep — exactly like Polsia + OpenClaw combined, but specialized for coding-project orchestration.  
- Zero extra cost; fully local except the single hourly Grok call.  
- Scales to multiple projects like OpenClaw’s multi-agent support.

### 7. Implementation Notes & Edge Cases
- **MCP-First** — All heartbeat actions route exclusively through MCP (no direct OpenClaw code reuse — we emulate the behavior, not the codebase).  
- **Testing** — Add to Phase 1 MVP: simulated “blocked delegation” scenario to verify proactive pivot stays inside guardrails.  
- **Fallback** — If heartbeat detects any guardrail violation attempt, it pauses and alerts via User Guidance Chat.  
- **Compatibility** — Works alongside existing MemPalace, AutoGPT, and 3rd-party agent delegation.

**This page is now locked as part of the Master Plan.** Save it directly into the `/Plans` folder. It can be referenced from the main Master Plan under “Optional Enhancements & Tool Integrations → Advanced Autonomy Modes → OpenClaw-Style Operation.”

DevLead MCP now has the exact persistent, proactive, heartbeat-driven, self-hosted autonomy you want from OpenClaw — while remaining a safe, pure orchestrator with iron-clad guardrails and zero risk of the retaliation incident.

Ready for the next step? Let me know if you want the full Docker Compose updates, exact HEARTBEAT.md / SOUL.md templates, prompt examples for the OpenClaw-style heartbeat, or a prototype heartbeat script.