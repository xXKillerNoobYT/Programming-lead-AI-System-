**Plans / Part 6 LLM Usage Strategy.md**
**Document Version: 1.1**  
**Date: April 17, 2026**  
**Author: DevLead MCP Master Plan Team**  
**Purpose: Define LLM usage policy with a strict local-first, low-cost model strategy, plus a real-use testing and auto-selection framework for picking the best local model per task. This program’s role is guidance/checking/orchestration (not coding).**

### 1. Full Program Goal (Locked & Unchanged – Critical Reminder)
DevLead MCP remains a **pure orchestrator** and does not code directly.

- The Lead coordinates, plans, reviews, and delegates.
- Coding work is done by 3rd-party coding agents.
- LLM routing must optimize for **local/free execution first**, with larger cloud models used only as backup/escalation.
- The goal of this program is **guiding and checking** model/agent work quality, not doing direct coding implementation.

### 1.1 Benchmark-First Gate (Mandatory)
No model may be used on real project tasks until it passes the benchmark pipeline in this document.

- **Rule:** test every candidate LM/SLM first.
- **Rule:** record benchmark evidence and scores before promotion.
- **Rule:** models failing minimum thresholds stay in non-production status.

### 2. LLM Usage Policy (Locked)
#### Primary Goal
Use **small language models as much as possible**.

#### Cost/Location Priority Order
1. **Local small models on the project machine** (default)
2. **Small models hosted on another computer on the same network (LAN)**
3. **Larger models only as backup / escalation path**

If a task can be done locally for free, it must be done locally for free.

### 3. Practical Model Classes by Role
- **Design Lead / Orchestrator (default):** small-to-mid local models optimized for planning and routing.
- **Code agent (default):** instruction-following local model selected for reliability and consistency.
- **Specialists (debug/test/docs/security/devops):** small local models first, tuned per role.
- **Large model escalation:** only when local/LAN models fail quality gates, or for rare high-level strategic review.

### 4. Escalation Rules (When Large Models Are Allowed)
Large model usage is allowed only if one or more are true:
- repeated local attempts fail quality/verification checks,
- conflict cannot be resolved safely with local context,
- strategic cross-cutting decision requires frontier reasoning,
- user explicitly requests large-model escalation.

Every escalation should be logged with reason and Decision ID.

### 5. LAN 3rd-Party Compute Policy
To keep usage local/free while improving capacity:
- Allow using a 3rd-party computer on the same network for model hosting.
- Treat LAN-hosted models as local-tier resources.
- Prefer LAN-hosted small models before cloud large models.
- Keep project data handling within existing security/privacy guardrails.

### 6. Guardrails
- No automatic “always use biggest model” behavior.
- No silent model switching that increases cost without reason.
- Respect user agent-to-model mappings.
- Record model used and escalation reasons in reports/logs.

### 7. Success Criteria
This policy is successful when:
- most tasks run on local/LAN small models,
- cloud large-model usage is rare and justified,
- overall cost stays low,
- quality remains stable through verification and review loops.

### 8. Implementation Notes
- This policy aligns with existing local-first architecture and MCP workflow.
- Works with your selected model-per-agent mapping.
- Should be enforced in preferences, agent routing, and run reports.

### 9. Real-Use Local Model Testing Program (Locked)
To auto-pick the best model for each job, the system must run standardized real-use tests on all candidate local/LAN models.

#### 9.1 Testing Goals
- Measure model performance by job type, not just generic benchmarks.
- Capture strengths, weaknesses, and failure patterns.
- Build a routing profile so the orchestrator can auto-select the best model for each task area.
- Support dynamic model switching inside the same agent when task phase changes.

#### 9.2 Candidate Model Pool
For each project, maintain a model registry with:
- model name + quantization
- host location (local machine or LAN node)
- VRAM/RAM requirements
- tokens/sec and latency range
- known limits (context handling, instruction rigidity, hallucination risk)

#### 9.3 User-Preferred Evaluator LM (Test Checker)
Benchmark scoring/checking should use the user-selected evaluator model as primary checker.

- User chooses evaluator LM/SLM in preferences.
- Evaluator validates outputs, formatting compliance, and quality thresholds.
- Evaluator judgments are logged with Decision ID and benchmark run ID.
- Optional secondary checker can be used for tie-breaks.

### 10. Test Areas and Required Test Cases
Each model must be tested across the following areas with repeatable prompts and expected outputs.

#### A) Instruction Following
- Exact constraint compliance
- No extra/unrequested behavior
- Deterministic output format compliance

#### B) Planning and Decomposition
- Break large goals into atomic steps
- Preserve dependencies/order
- Avoid missing mandatory checks

#### C) Coding Reliability (Delegated code tasks)
- Correctness against acceptance criteria
- Regression safety under changes
- Ability to follow existing architecture constraints

#### D) Debug and Root Cause Quality
- Signal-to-noise in diagnosis
- Fix precision (minimal safe patch)
- Success rate on failing test scenarios

#### E) Documentation and Reporting Quality
- Accuracy vs actual implementation
- Structured report consistency
- Decision ID traceability

#### F) Security/Policy Compliance
- Detect risky patterns
- Respect locked docs and rules
- Refuse prohibited operations

#### G) Change Adaptation and Misinformation Resistance
- Handles instruction deltas correctly
- Stops on conflicting directives
- Escalates instead of guessing

#### H) Research and Discovery Jobs
- Documentation/API research accuracy
- Evidence quality (sources and citations)
- Relevance filtering (signal vs noise)

#### I) Triage and Prioritization Jobs
- Bug/issue severity classification quality
- Backlog ordering consistency
- Actionability of triage outputs

#### J) Migration and Refactor Jobs
- Safe incremental migration plans
- Backward compatibility awareness
- Regression risk identification

#### K) UX/Product Definition Jobs
- User story quality and acceptance criteria completeness
- Edge-case coverage for user flows
- Clarity for handoff to implementation agents

#### L) Data/Schema Jobs
- Schema change impact awareness
- Query correctness and performance awareness
- Data integrity and rollback planning

#### M) CI/CD and Release Jobs
- Pipeline change safety
- Deployment plan correctness
- Rollback readiness and incident response quality

#### N) Compliance/Policy Jobs
- Policy adherence detection
- Sensitive-data handling correctness
- Auditability and trace consistency

### 11. Scoring Framework (Strengths & Weaknesses)
For every model and test area, log:
- **Score (0–100)**
- **Pass rate (%)**
- **Latency**
- **Cost tier** (local free, LAN free, paid cloud)
- **Observed strengths**
- **Observed weaknesses**
- **Failure signatures** (repeated known bad patterns)

#### 11.1 Suggested Weighted Composite Score
- Instruction following: 25%
- Correctness/quality checks: 25%
- Stability under change/conflict: 20%
- Latency/performance: 15%
- Resource fit (VRAM/RAM): 10%
- Reporting traceability: 5%

#### 11.2 Promotion Thresholds (Default)
- Minimum composite score for project use: **75/100** (user-configurable)
- Minimum safety/compliance pass: **100%**
- Minimum conflict-handling pass: **100%** (must stop/escalate correctly)

If thresholds are not met, model remains benchmark-only.

### 12. Auto-Pick Model Selection Process (Locked)
For each incoming task, the orchestrator should:
1. Classify task type (plan/code/debug/test/docs/security/devops/research/triage/migration/ux/data/release/compliance).
2. Pull top local/LAN models ranked for that task type.
3. Filter by available resources (VRAM/RAM/host status).
4. Select highest-scoring eligible model.
5. Attach fallback chain:
	 - local primary → LAN backup → large model escalation (only if required).

6. Enforce benchmark gate:
	- only models marked “production-approved” can be auto-picked for real tasks.

#### 12.1 Additional Job-Type Routing Examples
- Research-heavy tasks → research-strong local model first.
- Triage/backlog grooming → classification-consistent model first.
- Migration planning → long-horizon reasoning model first.
- UX/user-story generation → structure/clarity model first.
- Data/schema impact analysis → detail-precision model first.
- CI/CD/release planning → ops-aware model first.
- Compliance/policy validation → policy-rigid model first.

### 13. Dynamic LM Switching Inside Same Agent (Locked)
Agents may switch models by task phase to improve outcome while staying local-first:
- **Phase: Clarify/Plan** → planning-strong local model
- **Phase: Implement** → instruction-strong code model
- **Phase: Debug/Test** → reasoning/diagnostic-strong local model
- **Phase: Report/Docs** → concise-structured writer model
- **Phase: Research** → evidence-retrieval strong model
- **Phase: Triage/Prioritization** → classification-consistency model
- **Phase: Migration/Refactor** → long-context stability model
- **Phase: Data/Schema** → precision/impact-analysis model
- **Phase: Release/Compliance** → policy- and procedure-rigid model

Switching rules:
- Must log why switch happened.
- Must preserve Decision ID and task context.
- No paid escalation unless local/LAN chain fails quality gates.

### 14. Evaluation Cadence and Drift Control
- Run full benchmark suite:
	- on model add/remove,
	- after major dependency/framework upgrades,
	- on schedule (e.g., weekly smoke + monthly full run).
- Track performance drift over time.
- Auto-demote models with recurring failure signatures.

### 14.1 Multi-Location / Multi-Host Support (Locked)
System must support models across multiple locations/hosts while keeping local-first preference.

- User can register model hosts by IP/hostname.
- User can choose which host + model should handle each task class.
- Prefer nearest/local network host before remote/paid alternatives.
- Host health checks required (availability, latency, resource fit).
- If selected host unavailable, route to next approved host in fallback chain.

### 14.2 User-Controlled Model Routing Inputs
User can explicitly select:
- agent → preferred model mapping,
- host IP/location per model,
- task-type model preferences,
- escalation permissions and limits.

System must follow these settings unless a safety/blocking rule prevents execution.

### 15. Operational Outputs (What to Save)
Each benchmark cycle must produce:
- model leaderboard by task area
- strengths/weaknesses matrix
- recommended default mapping per agent
- fallback chains and escalation conditions
- changelog of mapping updates
- production-approved model list by task type and host location
- rejected-model list with failure reasons and retest conditions

Store outputs in:
- `reports/` for cycle summaries
- `decision-log.md` for approved routing changes
- preferences/model-mapping configuration used by agents

### 16. Success Criteria for Part 6 Upgrade
This upgraded policy is successful when:
- local/LAN models handle most jobs reliably,
- auto-pick selects better models than static mapping,
- dynamic switching improves quality without cloud cost spikes,
- large-model usage remains rare, justified, and logged.

### 17. Program Mission Reminder (Locked)
This program is for:
- guiding tasks,
- checking quality,
- routing to the right model/agent smartly and locally.

This program is **not** for direct coding implementation by the lead/orchestrator.

**This page is now locked as Part 6 for the User's Plans folder.**
