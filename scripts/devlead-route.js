#!/usr/bin/env node
// DevLead orchestrator routing — WEI-647 (L9).
// Classifies a Paperclip issue by area:* / type:* signals and dispatches to the
// matching specialist by reassigning the issue's assigneeAgentId. Paperclip's
// issue service auto-wakes the new assignee on assignment change (server route
// PATCH /api/issues/{id}; see queueIssueAssignmentWakeup), which is the
// cross-agent dispatch path. The wake endpoint POST /api/agents/{id}/wakeup is
// self-only and cannot be used by DevLead to wake a specialist.
//
// Required env: PAPERCLIP_API_URL, PAPERCLIP_API_KEY
// Flags:
//   --issue WEI-NNN     classify (and optionally dispatch) a single issue
//   --dispatch          actually PATCH the assignee (default: dry-run)
//   --self-test         run unit-style classifier checks against synthetic inputs
//   --json              print machine-readable result
//
// Exit codes: 0 ok / classified, 1 ambiguous-fallback (DevLead self), 2 usage / api error.

const SPECIALISTS = {
  'Coder-Frontend': '9769380d-f550-4967-98df-b2b4a1b10d6e',
  'Coder-Backend':  'd7edb4d2-edec-4ffe-b4b1-dbe7b507e2b1',
  'Tester':         '1c95405c-845c-447a-9734-9af294520077',
  'Reviewer':       'e7619d0d-175f-430d-9337-06e16c8a0cbe',
  'DevLead':        null, // not yet created — falls back to CTO orchestrator
  'CTO':            '328fddb9-26b4-4475-9ed3-6265d23e7816',
};

// Pure classifier. Input: { labels?: string[], title?: string, description?: string }.
// Output: { specialist, agentId, reason }.
//
// Mapping (from WEI-647 / WEI-633 spec §2.2):
//   area:ui      -> Coder-Frontend
//   area:backend -> Coder-Backend
//   area:test    -> Tester
//   type:bug     -> Tester (regression test) then route to Coder-* via reassign
//   area:docs / no area label -> DevLead (self-handle)
function classify(issue) {
  const labels = (issue.labels || []).map(l =>
    typeof l === 'string' ? l.toLowerCase() : (l && l.name ? l.name.toLowerCase() : '')
  ).filter(Boolean);
  // Description fallback only fires when labels[] is empty — Paperclip issues do
  // not carry GH-style labels yet, so a transitional fallback scans title/body
  // for the token. Once labels[] is authoritative, description matches go away
  // (they are noisy: e.g. an Issue that *documents* the routing table mentions
  // every token as prose, not as classification).
  // Title-only fallback (description is too prose-heavy — Issues that document
  // the routing table mention every token as text, not as classification).
  const fallbackHaystack = labels.length === 0 ? (issue.title || '').toLowerCase() : '';
  const has = (token) => {
    if (labels.includes(token)) return true;
    if (!fallbackHaystack) return false;
    return new RegExp(`(^|\\s|\\\`)${token}(\\s|$|\\\`|\\b)`).test(fallbackHaystack);
  };

  // bug takes priority — start with regression test before coder fix
  if (has('type:bug')) {
    return { specialist: 'Tester', agentId: SPECIALISTS.Tester, reason: 'type:bug → Tester first (regression test), then reassign to Coder-*' };
  }
  if (has('area:ui')) {
    return { specialist: 'Coder-Frontend', agentId: SPECIALISTS['Coder-Frontend'], reason: 'area:ui → Coder-Frontend' };
  }
  if (has('area:backend')) {
    return { specialist: 'Coder-Backend', agentId: SPECIALISTS['Coder-Backend'], reason: 'area:backend → Coder-Backend' };
  }
  if (has('area:test')) {
    return { specialist: 'Tester', agentId: SPECIALISTS.Tester, reason: 'area:test → Tester' };
  }
  if (has('area:docs')) {
    return { specialist: 'DevLead', agentId: SPECIALISTS.DevLead || SPECIALISTS.CTO, reason: 'area:docs → DevLead self-handle (CTO fallback until DevLead agent created)' };
  }
  return { specialist: 'DevLead', agentId: SPECIALISTS.DevLead || SPECIALISTS.CTO, reason: 'no area label → DevLead self-handle (CTO fallback)' };
}

module.exports = { classify, SPECIALISTS };

if (require.main !== module) return;

// ---- CLI ----
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

if (flag('--self-test')) {
  const cases = [
    { name: 'area:ui label',        in: { labels: ['area:ui'], title: 'Add button' },         expect: 'Coder-Frontend' },
    { name: 'area:backend label',   in: { labels: ['area:backend'], title: 'MCP route' },     expect: 'Coder-Backend' },
    { name: 'area:test label',      in: { labels: ['area:test'], title: 'Add coverage' },     expect: 'Tester' },
    { name: 'type:bug priority',    in: { labels: ['type:bug', 'area:ui'], title: 'Crash' },  expect: 'Tester' },
    { name: 'area:docs → DevLead',  in: { labels: ['area:docs'], title: 'README update' },    expect: 'DevLead' },
    { name: 'no area → DevLead',    in: { labels: [], title: 'Misc cleanup' },                expect: 'DevLead' },
    { name: 'title-encoded fallback',in: { labels: [], title: 'area:ui — fix' },               expect: 'Coder-Frontend' },
    { name: 'desc-only does NOT match',in: { labels: [], title: 'X', description: 'mentions area:ui in prose' }, expect: 'DevLead' },
    { name: 'mismatched/unknown',   in: { labels: ['priority:high'], title: 'X' },            expect: 'DevLead' },
  ];
  let pass = 0, fail = 0;
  for (const c of cases) {
    const got = classify(c.in).specialist;
    const ok = got === c.expect;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}: expected=${c.expect} got=${got}`);
    if (ok) pass++; else fail++;
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail === 0 ? 0 : 2);
}

const issueRef = arg('--issue');
if (!issueRef) {
  console.error('usage: devlead-route.js --issue WEI-NNN [--dispatch] [--json]');
  console.error('       devlead-route.js --self-test');
  process.exit(2);
}

const API = process.env.PAPERCLIP_API_URL;
const KEY = process.env.PAPERCLIP_API_KEY;
if (!API || !KEY) { console.error('Missing PAPERCLIP_API_URL / PAPERCLIP_API_KEY'); process.exit(2); }

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

(async () => {
  const issue = await api(`/api/issues/${issueRef}`);
  const result = classify(issue);
  const out = {
    issue: issue.identifier,
    title: issue.title,
    currentAssignee: issue.assigneeAgentId,
    classified: result,
    dispatched: false,
  };
  if (flag('--dispatch')) {
    if (!result.agentId) { console.error('No agentId resolved (DevLead specialist not yet created)'); process.exit(2); }
    if (issue.assigneeAgentId === result.agentId) {
      out.dispatched = 'no-op (already assigned)';
    } else {
      await api(`/api/issues/${issue.id}`, { method: 'PATCH', body: JSON.stringify({ assigneeAgentId: result.agentId }) });
      out.dispatched = true;
    }
  }
  if (flag('--json')) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`Issue:        ${out.issue} — ${out.title}`);
    console.log(`Specialist:   ${result.specialist} (${result.agentId || 'none'})`);
    console.log(`Reason:       ${result.reason}`);
    console.log(`Current:      ${out.currentAssignee || '(unassigned)'}`);
    console.log(`Dispatched:   ${out.dispatched}`);
  }
})().catch(e => { console.error(e.message); process.exit(2); });
