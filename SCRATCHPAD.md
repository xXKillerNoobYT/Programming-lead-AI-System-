# DevLead Scratchpad

Temporary reasoning, handoffs, and hypotheses may be written here while an assigned
task is active. This file is disposable working state, not project memory, a backlog,
or a source of requirements. Keep it at **2,000 lines or fewer**.

## Current session

Empty. Start each note with the canonical task link and a date, for example:

```md
### 2026-08-28 — [WEI-123](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/123)

- Hypothesis: redacted, temporary reasoning
- Handoff: next safe experiment and expected evidence
```

## Promotion and rotation

- Validate a hypothesis before promoting it. Put verified task evidence in the linked
  Paperclip/AI Hub/GitHub task or its PR/run report.
- Promote durable decisions to `decision-log.md`, durable cross-run facts to
  `memory.md`, and requirements or acceptance criteria to the canonical task or
  approved vault plan workflow.
- Reconcile completed and deferred work to its canonical task before removing notes.
- Delete resolved, disproven, duplicated, or stale notes during reconciliation; Git
  history is sufficient for this local file, so do not create scratch archives.
- Review the scratchpad before every handoff and at task completion.
- If the file approaches 2,000 lines, reconcile and rotate by clearing resolved notes.
  If still oversized, split active notes by canonical task only after delegating a
  project-specific structure change for approval.

## Safety

Never store secrets, credentials, tokens, customer data, personal data, or unredacted
sensitive logs here. Redact sensitive values at the source and link to access-controlled
evidence when authorized. Do not paste raw environment dumps, request headers, database
rows, production payloads, or private conversation transcripts.
