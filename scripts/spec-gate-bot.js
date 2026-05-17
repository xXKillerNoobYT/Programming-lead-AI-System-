#!/usr/bin/env node
// Spec-gate bot — checks every issue currently in_progress for the 7 SPEC fields
// from WEI-577 §2. Posts a single dedup'd comment listing missing fields when any
// are absent. Designed to run on a cron (e.g. every 5 min) or one-shot from CLI.
//
// Required env: PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_COMPANY_ID
// Flags: --dry-run            do not post comments, just print the report
//        --issue WEI-123      run only against a single issue (overrides listing)
//        --include-blocked    also scan blocked issues (default: in_progress only)
//
// Rollback: stop the cron entry (or delete this file). Templates remain advisory.

const REQUIRED_FIELDS = [
  { key: 'Goal',                re: /\*\*Goal:?\*\*/i },
  { key: 'Acceptance criteria', re: /\*\*Acceptance criteria:?\*\*/i },
  { key: 'Non-goals',           re: /\*\*Non-?goals:?\*\*/i },
  { key: 'Open questions',      re: /\*\*Open questions:?\*\*/i },
  { key: 'Evidence plan',       re: /\*\*Evidence plan:?\*\*/i },
  { key: 'Rollback plan',       re: /\*\*Rollback plan:?\*\*/i },
  { key: 'Size',                re: /\*\*Size:?\*\*/i },
];

const MARKER = '<!-- spec-gate-bot v1 -->';

const API = process.env.PAPERCLIP_API_URL;
const KEY = process.env.PAPERCLIP_API_KEY;
const COMPANY = process.env.PAPERCLIP_COMPANY_ID;

if (!API || !KEY || !COMPANY) {
  console.error('Missing PAPERCLIP_API_URL / PAPERCLIP_API_KEY / PAPERCLIP_COMPANY_ID');
  process.exit(2);
}

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const INCLUDE_BLOCKED = args.includes('--include-blocked');
const ISSUE_FLAG = (() => { const i = args.indexOf('--issue'); return i >= 0 ? args[i + 1] : null; })();

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

function missingFields(description) {
  const body = description || '';
  return REQUIRED_FIELDS.filter(f => !f.re.test(body)).map(f => f.key);
}

async function alreadyCommented(issueId) {
  const comments = await api(`/api/issues/${issueId}/comments`);
  const list = Array.isArray(comments) ? comments : (comments.items || []);
  return list.some(c => typeof c.body === 'string' && c.body.includes(MARKER));
}

function commentBody(missing) {
  return [
    MARKER,
    '## Spec gate — missing fields',
    '',
    'This issue moved to `in_progress` but the description is missing required SPEC fields from WEI-577 §2:',
    '',
    ...missing.map(m => `- **${m}**`),
    '',
    'Paste the SPEC template (`templates/SPEC.md`) and fill the missing fields, then re-trigger work.',
    '',
    'To dispute or skip the gate, comment `spec-gate: skip — <reason>` and tag CTO.',
  ].join('\n');
}

async function postComment(issueId, body) {
  return api(`/api/issues/${issueId}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
}

async function targets() {
  if (ISSUE_FLAG) {
    const one = await api(`/api/issues/${ISSUE_FLAG}`);
    return [one];
  }
  const statuses = INCLUDE_BLOCKED ? ['in_progress', 'blocked'] : ['in_progress'];
  const out = [];
  for (const s of statuses) {
    const list = await api(`/api/companies/${COMPANY}/issues?status=${s}&limit=100`);
    for (const i of (Array.isArray(list) ? list : (list.items || []))) out.push(i);
  }
  return out;
}

(async () => {
  const issues = await targets();
  let pass = 0, fail = 0, posted = 0, skipped = 0;
  const report = [];
  for (const issue of issues) {
    const missing = missingFields(issue.description);
    if (missing.length === 0) {
      pass++;
      report.push(`PASS  ${issue.identifier}  ${issue.title}`);
      continue;
    }
    fail++;
    report.push(`FAIL  ${issue.identifier}  missing: ${missing.join(', ')}  -- ${issue.title}`);
    if (DRY) continue;
    if (await alreadyCommented(issue.id)) { skipped++; continue; }
    await postComment(issue.id, commentBody(missing));
    posted++;
  }
  console.log(report.join('\n'));
  console.log(`\nsummary: pass=${pass} fail=${fail} posted=${posted} skipped(dedup)=${skipped} dry=${DRY}`);
})().catch(e => { console.error(e); process.exit(1); });
