'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Writable } = require('node:stream');

const { main } = require('../scripts/execute-next-issue');

function outputStream() {
  let text = '';
  return {
    stream: new Writable({ write(chunk, _encoding, callback) { text += chunk; callback(); } }),
    text: () => text,
  };
}

function snapshot() {
  return { schemaVersion: 1, repository: 'acme/widgets', observedAt: '2026-08-23T12:00:00.000Z', issues: [] };
}

function packet() {
  return {
    schemaVersion: 1,
    policyVersion: 'r1-preview-v1',
    kind: 'execution-packet',
    mode: 'preview',
    packetHash: 'sha256:abc123',
    source: { repository: 'acme/widgets', rootIssueNumber: 210, horizonIssueNumber: 211 },
    issue: { number: 236 },
  };
}

function dependencies(overrides = {}) {
  const stdout = outputStream();
  const stderr = outputStream();
  const calls = { source: [], decision: [], evidence: [] };
  return {
    stdout: stdout.stream,
    stderr: stderr.stream,
    clock: () => new Date('2026-08-23T15:00:00.000Z'),
    fetchIssueSnapshot(options) { calls.source.push(options); return snapshot(); },
    createExecutionDecision(...args) { calls.decision.push(args); return packet(); },
    appendExecutionEvidence(...args) { calls.evidence.push(args); },
    calls,
    stdoutText: stdout.text,
    stderrText: stderr.text,
    ...overrides,
  };
}

test('runs the read-only preview with explicit policy arguments, stdout packet, and one evidence append', () => {
  const deps = dependencies();
  const exitCode = main([
    '--repo', 'acme/widgets',
    '--root', '220',
    '--horizon', '221',
    '--evidence', 'tmp/evidence.jsonl',
  ], deps);

  assert.equal(exitCode, 0);
  assert.deepEqual(deps.calls.source, [{ repository: 'acme/widgets', now: deps.clock }]);
  assert.equal(deps.calls.decision.length, 1);
  assert.deepEqual(deps.calls.decision[0].slice(1, 2), [{ rootIssueNumber: 220, horizonIssueNumber: 221 }]);
  assert.equal(deps.calls.decision[0][2], deps.clock);
  assert.deepEqual(deps.calls.evidence, [['tmp/evidence.jsonl', packet(), deps.clock]]);
  assert.deepEqual(JSON.parse(deps.stdoutText()), packet());
  assert.equal(deps.stderrText(), '');
});

test('uses the safe defaults and treats a no-action decision as successful evidence', () => {
  const noAction = { ...packet(), kind: 'no-action' };
  const deps = dependencies({ createExecutionDecision: () => noAction });
  const exitCode = main(['--repo', 'acme/widgets'], deps);

  assert.equal(exitCode, 0);
  assert.deepEqual(deps.calls.evidence, [['.devlead/runtime/execution-evidence.jsonl', noAction, deps.clock]]);
  assert.deepEqual(JSON.parse(deps.stdoutText()), noAction);
  assert.equal(deps.stderrText(), '');
});

test('rejects missing or malformed required arguments, positional arguments, and mutating-looking flags', () => {
  const cases = [
    [],
    ['--repo'],
    ['--repo', 'acme/widgets', 'extra'],
    ['--repo', 'invalid repository'],
    ['--repo', 'acme/widgets', '--root', '0'],
    ['--repo', 'acme/widgets', '--horizon', '2.5'],
    ['--repo', 'acme/widgets', '--evidence'],
    ['--repo', 'acme/widgets', '--claim'],
    ['--repo', 'acme/widgets', '--unrecognized'],
  ];

  for (const args of cases) {
    const deps = dependencies();
    assert.equal(main(args, deps), 1, args.join(' '));
    const error = JSON.parse(deps.stderrText());
    assert.deepEqual(Object.keys(error), ['kind', 'stage', 'message']);
    assert.equal(error.kind, 'execution-preview-error');
    assert.equal(error.stage, 'arguments');
    assert.equal(deps.stdoutText(), '');
    assert.equal(deps.calls.source.length, 0);
  }
});

test('emits one stable safe stderr object and no output or evidence on source, decision, or evidence failures', () => {
  const failures = [
    { stage: 'source', deps: { fetchIssueSnapshot: () => { throw new Error('TOKEN=top-secret'); } } },
    { stage: 'decision', deps: { createExecutionDecision: () => { throw new Error('decision failed'); } } },
    { stage: 'evidence', deps: { appendExecutionEvidence: () => { throw new Error('disk full'); } } },
  ];

  for (const failure of failures) {
    const deps = dependencies(failure.deps);
    assert.equal(main(['--repo', 'acme/widgets'], deps), 1);
    assert.deepEqual(JSON.parse(deps.stderrText()), {
      kind: 'execution-preview-error',
      stage: failure.stage,
      message: `unable to ${failure.stage === 'source' ? 'fetch issue snapshot' : failure.stage === 'decision' ? 'create execution decision' : 'append execution evidence'}`,
    });
    assert.equal(deps.stdoutText(), '');
    if (failure.stage !== 'evidence') assert.equal(deps.calls.evidence.length, 0);
    assert.doesNotMatch(deps.stderrText(), /TOKEN|top-secret|stack/i);
  }
});
