# DevLead Active TODO

This file is a small local working index, not a backlog or source of requirements.
GitHub Issues and assigned Paperclip/AI Hub tasks remain canonical; vault plans remain
the source of user intent. Keep this file at **100 lines or fewer**.

## Active

No local entries. Add an entry only after work is assigned in a canonical system.

Use this shape:

```md
- [ ] [WEI-123](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/123)
  - Next: one concrete action
  - Evidence: branch, PR, run report, or test command
```

For a Paperclip or AI Hub task, use that system's canonical task URL instead of
creating a second identifier here. Never add an unlinked task.

## Reconciliation rules

- At the start of work, verify the linked task is assigned and actionable.
- Keep only currently active work here; this is not a second backlog.
- Record status, acceptance criteria, requirements, routing, and dependencies in the
  linked canonical task, not in this file.
- When work completes, move evidence and the final disposition to the canonical task,
  then remove the entry from this file.
- When work is deferred, return it to the canonical backlog with an owner and next
  action, then remove the entry from this file.
- Promote durable decisions to `decision-log.md`, durable cross-run facts to
  `memory.md`, and heartbeat evidence to `reports/run-*.md`.
- If the file would exceed 100 lines, reconcile stale entries first. Do not create an
  archive copy; canonical systems provide history.

## Safety

Never store secrets, credentials, tokens, customer data, personal data, or unredacted
sensitive logs in this file. Store only links, redacted summaries, and safe evidence.
