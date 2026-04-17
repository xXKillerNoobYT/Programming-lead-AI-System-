**Plans / Integration_of_AutoGPT_and_MemPalace.md**  
**Document Version: 1.0**  
**Date: April 16, 2026**  
**Author: DevLead MCP Master Plan Team**  
**Purpose: Dedicated integration guide for the Plans folder. This page slots directly into the existing Master Plan without modifying any locked sections.**

### 1. Full Program Goal (Locked & Unchanged – Critical Reminder)
**DevLead MCP is purely an autonomous AI Programming Lead / Orchestrator (the “AI CEO” layer).**  

It is **NOT a programmer or coder**.  
- DevLead MCP never writes, edits, or generates any code itself.  
- All actual coding, file modifications, testing, and implementation are **100% delegated** to your chosen **3rd-party coding agents** (Roo Code primary, GitHub Copilot, Cursor, Continue.dev, Aider, local Ollama agents, etc.).  
- DevLead MCP’s sole role is intelligent orchestration: ingestion of base plans, research/structuring, task decomposition, safe delegation via MCP, post-delegation review/cohesion checks, GitHub management (branches, Issues, PRs, security), skippable clarifying questions, 3–5 next-step planning, and continuous autonomous cycles.  
- This design preserves Polsia-style minimal-interference autonomy while giving you full control over which powerful LLMs actually touch the codebase.  

Everything in this integration page **must respect this boundary**. AutoGPT and MemPalace are added **only as supporting tools for the Lead/orchestrator layer**, never as code-generation replacements.

### 2. KEY NOTE: Limitations of Weaker Local LLMs (~25 GB Models) and Why These Tools Matter
Our primary Lead Agent runs on local ~25 GB quantized models (e.g., Qwen3.5-32B Q5_K_M via Ollama/LM Studio). These are excellent for cost/privacy/speed but have inherent limitations compared to frontier cloud models:

**Key Limitations to Document & Mitigate (add to every future plan/review):**
- **Short effective context & rapid forgetting**: Even with 128k–262k token windows, long-term project history, past decisions, and cross-session details degrade quickly without external memory.
- **Weaker long-horizon reasoning & planning**: Weaker models struggle with maintaining coherence over dozens/hundreds of tasks across days/weeks.
- **Reduced recall accuracy on large codebases/projects**: Semantic search over raw files is good but lacks structured, persistent “memory palace” organization.
- **Higher hallucination risk on ambiguous or multi-step orchestration**: Local models may lose nuance in task decomposition or cohesion checks without strong external grounding.
- **No native cross-session persistence**: Every restart or new planning loop starts from near-zero memory unless augmented.

**How AutoGPT + MemPalace Directly Mitigate These (Without Turning DevLead into a Coder):**
- **MemPalace** provides **verbatim, hierarchical, long-term memory** that survives restarts, projects, and sessions — boosting recall from ~60–70% (raw local LLM) to 96.6%+ benchmarked retrieval.
- **AutoGPT** adds **goal-driven autonomous sub-task chaining** as an optional delegated planning aid — letting the Lead offload complex non-coding decomposition/research to a proven open-source agent framework while still staying in full control.
- Both are **local-first, MCP-native (or easily wrapped), zero-extra-cost**, and fully configurable via user preferences.
- Result: The weaker local Lead becomes dramatically more stable, coherent, and “remembering” without any change to the “pure orchestrator” rule.

These tools are **opt-in** per project and controlled by user preferences in the dashboard.

### 3. How to Tie In MemPalace (Local-First AI Memory System)
**MemPalace** (github.com/MemPalace/mempalace or milla-jovovich/mempalace) is the highest-benchmarked open-source AI memory system (April 2026 launch). It uses the ancient “Memory Palace” (Method of Loci) metaphor: conversations are stored **verbatim** and organized into **Wings** (projects/people), **Halls** (memory types), and **Rooms** (specific ideas). It runs 100% locally with ChromaDB + SQLite, zero API calls, MIT license, and native MCP tooling support.

**Integration Strategy (100% MCP, Pure Orchestrator Role):**
1. **Install & Expose as MCP Server**  
   - `pip install mempalace` (or Docker).  
   - Run MemPalace as a discoverable MCP server (it already ships with MCP endpoints).  
   - DevLead MCP auto-discovers it via the standard MCP manifest.

2. **Usage in DevLead MCP Workflow**  
   - **Ingestion phase**: Lead writes full project history, designer clarifications, and prior agent reports verbatim into MemPalace (tagged by project ID, wing = “DevLead_Project_X”).  
   - **Planning loop**: Before every decomposition, Lead queries MemPalace via MCP for relevant past memories (semantic search + hierarchical narrowing). This grounds the weaker local LLM in full project context.  
   - **Review & Cohesion**: After every 3rd-party agent report, Lead stores the outcome + rationale in MemPalace and retrieves related past decisions to ensure architectural consistency.  
   - **Hourly Grok escalation**: Summary prompt sent to Grok includes a MemPalace-retrieved “memory digest” (top 5–10 relevant rooms) — dramatically improving strategic guidance.  
   - **User Guidance Chat**: Lead can pull and surface past designer decisions from MemPalace when posting skippable Qs.

3. **User Preferences Controls**  
   - Toggle MemPalace on/off per project.  
   - Set memory retention policy (forever vs. prune after N days).  
   - Choose wing/hall/room naming conventions.  
   - Privacy mode: encrypt specific rooms.

**Benefits for Weaker Local LLMs**: Turns short-context local inference into effectively infinite persistent memory with 96.6%+ recall. No more “forgetting” previous architecture decisions.

### 4. How to Tie In AutoGPT (Autonomous Agent Framework)
**AutoGPT** (github.com/Significant-Gravitas/AutoGPT) is the original open-source autonomous agent platform (still actively maintained in 2026 with 180k+ stars and latest platform releases). It excels at breaking high-level goals into chained tasks and executing them with tools.

**Integration Strategy (100% MCP, Pure Orchestrator Role — Never Used for Coding):**
1. **Expose AutoGPT as a Delegated Sub-Orchestrator via MCP**  
   - Run AutoGPT in headless/server mode.  
   - Wrap its goal-execution API as a custom MCP tool (`delegate_to_autogpt_subtask`).  
   - Lead can spawn temporary AutoGPT instances with strict scoped permissions.

2. **Usage in DevLead MCP Workflow (Non-Coding Only)**  
   - **Complex planning sub-tasks**: When the local Lead identifies a non-coding sub-goal that would benefit from autonomous chaining (e.g., “research 5 best authentication patterns for this stack, compare trade-offs, output structured pros/cons”), it delegates the entire sub-task to AutoGPT via MCP.  
   - **Research & data gathering**: AutoGPT can be given browser/tools (via its own plugins) to pull latest docs, benchmarks, or security advisories — then returns a structured report to the Lead.  
   - **Backlog refinement**: For very large projects, Lead can ask AutoGPT to generate an initial 20-task decomposition; the Lead then reviews, filters, and delegates the actual coding tasks to Roo Code/Copilot.  
   - **Never for code generation**: Explicit guardrail prompt + MCP permission manifest forbids AutoGPT from touching the codebase or running code-edit tools when delegated from DevLead.

3. **User Preferences Controls**  
   - Toggle AutoGPT availability per project or task-type.  
   - Define allowed sub-task categories (research/planning only — never implementation).  
   - Set max AutoGPT instances and timeout.  
   - Approval gate: “Require User Chat approval before any AutoGPT delegation.”

**Benefits for Weaker Local LLMs**: Offloads multi-step reasoning chains that local models handle poorly, while the Lead remains the single source of truth and final reviewer.

### 5. Combined Usage Example (Full Cycle)
1. Designer uploads base plan → Lead ingests and stores verbatim in MemPalace.  
2. Planning loop begins → Lead queries MemPalace for past context.  
3. Complex research sub-task identified → Lead delegates to AutoGPT (MCP) → AutoGPT returns structured findings → Lead stores results in MemPalace.  
4. Atomic coding tasks decomposed → Delegated to Roo Code / GitHub Copilot (your 3rd-party agents).  
5. Agent reports returned → Lead reviews with MemPalace context → updates GitHub + stores outcome.  
6. Hourly Grok call includes MemPalace digest + any AutoGPT outputs for superior strategic review.

### 6. Implementation Notes & Edge Cases
- **MCP-First**: Both tools are exposed **only** as MCP servers/tools. No direct API calls outside MCP.  
- **Limitations Still Apply**: Even with these tools, the Lead’s local model remains weaker on creative coding decisions — that is why we delegate coding externally.  
- **Security**: MemPalace and AutoGPT instances are scoped per-project via MCP manifests.  
- **Cost**: Zero additional cost (both fully local/open-source).  
- **Fallback**: If either tool is unavailable, Lead falls back to pure local operation with last-known MemPalace memory.  
- **Testing**: Add to Phase 1 MVP: basic MemPalace storage/retrieval + one safe AutoGPT delegation example.

**This page is now locked as part of the Master Plan.** Save it directly into the `/Plans` folder. It can be referenced from the main Master Plan under “Optional Enhancements & Tool Integrations.”

Any future updates to this integration will be tracked as a new version of this file only.  

Ready for the next step? Let me know if you want the full Docker Compose snippet, exact MCP tool manifests, or prompt templates for MemPalace/AutoGPT handoffs.