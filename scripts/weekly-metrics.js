#!/usr/bin/env node
// Weekly metrics aggregator for WEI-577 §6.
//
// Nightly mode:
//   node scripts/weekly-metrics.js --aggregate
// Monday digest mode:
//   node scripts/weekly-metrics.js --digest --post --issue WEI-123
//
// Required API env when reading/posting live data:
//   PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_COMPANY_ID

'use strict';

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { loadEnvFile } = require('../lib/env-file.js');

loadEnvFile(path.resolve(__dirname, '..', '.env'));

const API = process.env.PAPERCLIP_API_URL;
const KEY = process.env.PAPERCLIP_API_KEY;
const COMPANY = process.env.PAPERCLIP_COMPANY_ID;
const DEFAULT_STORE = path.resolve(__dirname, '..', 'reports', 'metrics', 'weekly-metrics-series.json');

const SIZE_WEIGHTS = { S: 1, M: 3, L: 8, XL: 13 };
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function asDate(value) {
  const t = Date.parse(value || '');
  return Number.isFinite(t) ? new Date(t) : null;
}

function labelNames(issue) {
  return (issue.labels || []).map((label) => (
    typeof label === 'string' ? label : label && label.name
  )).filter(Boolean);
}

function sizeOfIssue(issue) {
  const labels = labelNames(issue);
  for (const label of labels) {
    const m = String(label).match(/^(?:size:)?(S|M|L|XL)$/i);
    if (m) return m[1].toUpperCase();
  }
  const body = `${issue.title || ''}\n${issue.description || ''}`;
  const m = body.match(/\*\*Size:?\*\*:?\s*(S|M|L|XL)\b/i) || body.match(/\bSize:\s*(S|M|L|XL)\b/i);
  return m ? m[1].toUpperCase() : 'S';
}

function sizeWeight(issue) {
  return SIZE_WEIGHTS[sizeOfIssue(issue)] || SIZE_WEIGHTS.S;
}

function closedAt(issue) {
  return asDate(issue.completedAt || issue.closedAt || issue.doneAt);
}

function isClosed(issue) {
  return Boolean(closedAt(issue) || issue.status === 'done' || issue.state === 'CLOSED');
}

function comments(issue) {
  return Array.isArray(issue.comments) ? issue.comments : [];
}

function firstCommentMatching(issue, re) {
  return comments(issue)
    .map((comment) => ({ ...comment, at: asDate(comment.createdAt || comment.updatedAt) }))
    .filter((comment) => comment.at && re.test(comment.body || ''))
    .sort((a, b) => a.at - b.at)[0] || null;
}

function reopenedWithin(issue, windowMs = 14 * DAY_MS) {
  const done = closedAt(issue);
  if (!done) return false;
  const reopen = firstCommentMatching(issue, /\breopen(?:ed|ing)?\b|status[^a-z]+in_progress/i);
  return Boolean(reopen && reopen.at >= done && reopen.at - done <= windowMs);
}

function median(values) {
  const sorted = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function countMatches(issue, re) {
  const haystack = [
    issue.title || '',
    issue.description || '',
    ...comments(issue).map((comment) => comment.body || ''),
  ].join('\n');
  return (haystack.match(re) || []).length;
}

function aggregateWeeklyMetrics(issues, options = {}) {
  const now = asDate(options.now) || new Date();
  const weekStart = new Date(now.getTime() - WEEK_MS);
  const closedThisWeek = issues.filter((issue) => {
    const done = closedAt(issue);
    return done && done >= weekStart && done <= now;
  });

  const weightedThroughput = closedThisWeek.reduce((sum, issue) => sum + sizeWeight(issue), 0);
  const reopened = closedThisWeek.filter((issue) => reopenedWithin(issue));
  const audited = closedThisWeek.filter((issue) => /AUDIT|Gate C/i.test(`${issue.description || ''}\n${comments(issue).map((c) => c.body).join('\n')}`));
  const auditP01 = audited.filter((issue) => /\bP[01]\b|AUDIT-FAIL/i.test(`${issue.description || ''}\n${comments(issue).map((c) => c.body).join('\n')}`));

  const cycleBuckets = {};
  for (const issue of closedThisWeek) {
    const done = closedAt(issue);
    const gateA = firstCommentMatching(issue, /Gate A|Spec frozen|SPEC freeze/i);
    const start = gateA ? gateA.at : asDate(issue.startedAt || issue.createdAt);
    if (!done || !start) continue;
    const size = sizeOfIssue(issue);
    cycleBuckets[size] = cycleBuckets[size] || [];
    cycleBuckets[size].push((done - start) / DAY_MS);
  }

  const wipByAgent = {};
  for (const issue of issues) {
    if (issue.status !== 'in_progress') continue;
    const key = issue.assigneeAgentId || issue.assigneeUserId || 'unassigned';
    wipByAgent[key] = (wipByAgent[key] || 0) + 1;
  }

  const specFrozen = issues.filter((issue) => countMatches(issue, /Gate A|Spec frozen|SPEC freeze/i) > 0);
  const churned = specFrozen.filter((issue) => countMatches(issue, /SPEC churn|spec changed|edited SPEC|updated SPEC/i) > 0);
  const gateSkipped = closedThisWeek.filter((issue) => countMatches(issue, /Gate [ABCD] skipped|gate-skipped|skip(?:ped)? the gate/i) > 0);
  const escapedDefects = issues.filter((issue) => {
    const created = asDate(issue.createdAt);
    const isBug = labelNames(issue).some((l) => /type:bug|bug|defect/i.test(l)) || /\bbug\b|escaped defect/i.test(issue.title || '');
    return isBug && created && created >= weekStart && created <= now;
  });

  return {
    generatedAt: now.toISOString(),
    window: { start: weekStart.toISOString(), end: now.toISOString() },
    metrics: {
      throughput: {
        closedIssues: closedThisWeek.length,
        weightedBySize: weightedThroughput,
      },
      reopenRate: {
        reopenedWithin14d: reopened.length,
        closedIssues: closedThisWeek.length,
        rate: closedThisWeek.length ? reopened.length / closedThisWeek.length : 0,
      },
      escapedDefects: {
        count: escapedDefects.length,
      },
      cycleTime: Object.fromEntries(
        Object.entries(cycleBuckets).map(([size, values]) => [size, { medianDays: median(values), sample: values.length }]),
      ),
      specChurn: {
        churnedSpecs: churned.length,
        frozenSpecs: specFrozen.length,
        rate: specFrozen.length ? churned.length / specFrozen.length : 0,
      },
      gateSkipRate: {
        skippedIssues: gateSkipped.length,
        closedIssues: closedThisWeek.length,
        rate: closedThisWeek.length ? gateSkipped.length / closedThisWeek.length : 0,
      },
      auditFindings: {
        p0p1: auditP01.length,
        auditedIssues: audited.length,
      },
      wipPerAgent: wipByAgent,
    },
  };
}

function renderDigest(snapshot) {
  const m = snapshot.metrics;
  const pct = (value) => `${Math.round((value || 0) * 1000) / 10}%`;
  const cycle = Object.entries(m.cycleTime)
    .map(([size, value]) => `${size}: ${value.medianDays == null ? 'n/a' : `${Math.round(value.medianDays * 10) / 10}d`} (${value.sample})`)
    .join(', ') || 'n/a';
  const wip = Object.entries(m.wipPerAgent)
    .map(([agent, count]) => `${agent}: ${count}`)
    .join(', ') || 'none';

  return [
    '## Weekly Metrics Digest',
    '',
    `Window: ${snapshot.window.start} -> ${snapshot.window.end}`,
    '',
    `- Throughput: ${m.throughput.closedIssues} closed, ${m.throughput.weightedBySize} size-weighted points`,
    `- Reopen rate: ${m.reopenRate.reopenedWithin14d}/${m.reopenRate.closedIssues} (${pct(m.reopenRate.rate)})`,
    `- Escaped defects: ${m.escapedDefects.count}`,
    `- Cycle time: ${cycle}`,
    `- Spec churn: ${m.specChurn.churnedSpecs}/${m.specChurn.frozenSpecs} (${pct(m.specChurn.rate)})`,
    `- Gate skip rate: ${m.gateSkipRate.skippedIssues}/${m.gateSkipRate.closedIssues} (${pct(m.gateSkipRate.rate)})`,
    `- Audit findings: ${m.auditFindings.p0p1} P0/P1 across ${m.auditFindings.auditedIssues} audited issues`,
    `- WIP per agent: ${wip}`,
  ].join('\n');
}

function readStore(storePath = DEFAULT_STORE) {
  if (!existsSync(storePath)) return [];
  const parsed = JSON.parse(readFileSync(storePath, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

function appendSnapshot(snapshot, storePath = DEFAULT_STORE) {
  const dir = path.dirname(storePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const series = readStore(storePath);
  series.push(snapshot);
  writeFileSync(storePath, `${JSON.stringify(series, null, 2)}\n`, 'utf8');
  return series;
}

async function api(requestPath, opts = {}) {
  if (!API || !KEY) throw new Error('Missing PAPERCLIP_API_URL / PAPERCLIP_API_KEY');
  const res = await fetch(`${API}${requestPath}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${requestPath} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function fetchIssuesWithComments(statuses = ['todo', 'in_progress', 'blocked', 'in_review', 'done']) {
  if (!COMPANY) throw new Error('Missing PAPERCLIP_COMPANY_ID');
  const byId = new Map();
  for (const status of statuses) {
    const page = await api(`/api/companies/${COMPANY}/issues?status=${status}&limit=200`);
    const list = Array.isArray(page) ? page : (page.items || []);
    for (const issue of list) byId.set(issue.id, issue);
  }
  const issues = Array.from(byId.values());
  for (const issue of issues) {
    try {
      const issueComments = await api(`/api/issues/${issue.id}/comments`);
      issue.comments = Array.isArray(issueComments) ? issueComments : (issueComments.items || []);
    } catch {
      issue.comments = [];
    }
  }
  return issues;
}

async function postDigest(issueRef, body) {
  if (!issueRef) throw new Error('Pass --issue WEI-123 or set WEEKLY_METRICS_ISSUE');
  const issue = await api(`/api/issues/${encodeURIComponent(issueRef)}`);
  await api(`/api/issues/${issue.id}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  return issue;
}

async function main(argv = process.argv.slice(2)) {
  const storeArg = argv.indexOf('--store');
  const storePath = storeArg >= 0 ? path.resolve(argv[storeArg + 1]) : DEFAULT_STORE;
  const issueArg = argv.indexOf('--issue');
  const issueRef = issueArg >= 0 ? argv[issueArg + 1] : process.env.WEEKLY_METRICS_ISSUE;
  const inputArg = argv.indexOf('--input');
  const inputPath = inputArg >= 0 ? path.resolve(argv[inputArg + 1]) : null;
  const nowArg = argv.indexOf('--now');
  const now = nowArg >= 0 ? argv[nowArg + 1] : undefined;

  const issues = inputPath
    ? JSON.parse(readFileSync(inputPath, 'utf8'))
    : await fetchIssuesWithComments();
  const snapshot = aggregateWeeklyMetrics(issues, { now });

  if (argv.includes('--aggregate') || argv.includes('--digest')) appendSnapshot(snapshot, storePath);
  const digest = renderDigest(snapshot);
  if (argv.includes('--digest')) console.log(digest);
  if (argv.includes('--post')) {
    const issue = await postDigest(issueRef, digest);
    console.log(`posted weekly metrics digest to ${issue.identifier || issue.id}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  SIZE_WEIGHTS,
  sizeOfIssue,
  sizeWeight,
  reopenedWithin,
  aggregateWeeklyMetrics,
  renderDigest,
  readStore,
  appendSnapshot,
};
