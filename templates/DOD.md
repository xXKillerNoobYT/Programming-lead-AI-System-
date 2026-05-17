<!--
Definition of Done evidence template — paste into the issue at Gate D before close.
Source: WEI-577 §5 (CTO Operating System v0.1). A merge that closes an issue without
this block filled in is reverted by default.
-->

## DOD Evidence — <issue id>

- [ ] Spec frozen at Gate A (link to SPEC block)
- [ ] All AC met (each AC → evidence link below)
- [ ] Tests added/updated; suite green (paste command + tail of output)
- [ ] Break-test completed by @<qa> — link to BREAK-TEST block
- [ ] Audit pass by @<sec> — link to AUDIT block
- [ ] Docs updated (which files)
- [ ] Metrics/telemetry wired (which metric, which dashboard)
- [ ] Rollback plan validated (how)
- [ ] No P0/P1 child issues open
- [ ] Release note (1-3 sentences, user-visible)

### Evidence
| AC # | Evidence type | Link / paste |
|---|---|---|
| 1 | [unit] | … |
| 2 | [manual] | screenshot/log … |
