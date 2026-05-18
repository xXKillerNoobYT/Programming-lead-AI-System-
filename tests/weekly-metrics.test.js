'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  sizeOfIssue,
  sizeWeight,
  reopenedWithin,
  aggregateWeeklyMetrics,
  renderDigest,
} = require('../scripts/weekly-metrics.js');

describe('weekly metrics size weighting', () => {
  test('reads size labels and applies WEI-577 throughput weights', () => {
    assert.equal(sizeOfIssue({ labels: [{ name: 'size:S' }] }), 'S');
    assert.equal(sizeOfIssue({ labels: [{ name: 'M' }] }), 'M');
    assert.equal(sizeWeight({ labels: [{ name: 'size:S' }] }), 1);
    assert.equal(sizeWeight({ labels: [{ name: 'size:M' }] }), 3);
    assert.equal(sizeWeight({ labels: [{ name: 'size:L' }] }), 8);
  });

  test('falls back to SPEC Size field and defaults to S', () => {
    assert.equal(sizeWeight({ description: '**Size**: L' }), 8);
    assert.equal(sizeWeight({ description: 'no size yet' }), 1);
  });
});

describe('weekly metrics reopen-rate calculation', () => {
  test('counts only issues reopened within 14 days after close', () => {
    const closed = '2026-05-04T12:00:00.000Z';
    assert.equal(reopenedWithin({
      completedAt: closed,
      comments: [{ createdAt: '2026-05-10T12:00:00.000Z', body: 'Reopened for regression.' }],
    }), true);

    assert.equal(reopenedWithin({
      completedAt: closed,
      comments: [{ createdAt: '2026-05-25T12:00:00.000Z', body: 'Reopened too late.' }],
    }), false);

    assert.equal(reopenedWithin({
      completedAt: closed,
      comments: [{ createdAt: '2026-05-03T12:00:00.000Z', body: 'Reopened before close does not count.' }],
    }), false);
  });

  test('aggregate includes all eight WEI-577 metrics in the digest', () => {
    const issues = [
      {
        id: '1',
        title: 'Ship SPEC-gated change',
        status: 'done',
        labels: [{ name: 'size:M' }],
        createdAt: '2026-05-03T12:00:00.000Z',
        completedAt: '2026-05-09T12:00:00.000Z',
        description: 'AUDIT-PASS',
        comments: [
          { createdAt: '2026-05-04T12:00:00.000Z', body: 'Gate A: Spec frozen' },
          { createdAt: '2026-05-10T12:00:00.000Z', body: 'Reopened after escaped defect.' },
        ],
      },
      {
        id: '2',
        title: 'Bug against shipped work',
        status: 'todo',
        labels: [{ name: 'type:bug' }],
        createdAt: '2026-05-10T12:00:00.000Z',
        comments: [],
      },
      {
        id: '3',
        title: 'Active implementation',
        status: 'in_progress',
        assigneeAgentId: 'agent-a',
        comments: [],
      },
    ];

    const snapshot = aggregateWeeklyMetrics(issues, { now: '2026-05-11T12:00:00.000Z' });
    assert.equal(snapshot.metrics.throughput.weightedBySize, 3);
    assert.equal(snapshot.metrics.reopenRate.reopenedWithin14d, 1);
    assert.equal(snapshot.metrics.escapedDefects.count, 1);
    assert.equal(snapshot.metrics.cycleTime.M.sample, 1);
    assert.equal(snapshot.metrics.auditFindings.auditedIssues, 1);
    assert.equal(snapshot.metrics.wipPerAgent['agent-a'], 1);

    const digest = renderDigest(snapshot);
    for (const label of [
      'Throughput',
      'Reopen rate',
      'Escaped defects',
      'Cycle time',
      'Spec churn',
      'Gate skip rate',
      'Audit findings',
      'WIP per agent',
    ]) {
      assert.match(digest, new RegExp(label));
    }
  });
});
