'use strict';

const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, readFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { test } = require('node:test');

const { appendExecutionEvidence } = require('../lib/execution-evidence');

function decision(overrides = {}) {
  return {
    schemaVersion: 1,
    policyVersion: 'r1-preview-v1',
    kind: 'execution-packet',
    mode: 'preview',
    packetHash: 'sha256:abc123',
    source: { repository: 'acme/widgets' },
    issue: { number: 236 },
    ...overrides,
  };
}

function tempDirectory() {
  return mkdtempSync(join(tmpdir(), 'devlead-execution-evidence-'));
}

test('appends one complete JSON evidence record without truncating prior records', () => {
  const directory = tempDirectory();
  const evidencePath = join(directory, 'nested', 'evidence.jsonl');
  try {
    const clock = () => new Date('2026-08-23T15:00:00.000Z');
    appendExecutionEvidence(evidencePath, decision(), clock);
    const noAction = {
      schemaVersion: 1,
      policyVersion: 'r1-preview-v1',
      kind: 'no-action',
      mode: 'preview',
      source: { repository: 'acme/widgets' },
      exclusions: {},
    };
    appendExecutionEvidence(evidencePath, noAction, clock);

    const lines = readFileSync(evidencePath, 'utf8').trimEnd().split('\n').map((line) => JSON.parse(line));
    assert.equal(lines.length, 2);
    assert.deepEqual(lines[0], {
      timestamp: '2026-08-23T15:00:00.000Z',
      repository: 'acme/widgets',
      policyVersion: 'r1-preview-v1',
      kind: 'execution-packet',
      packetHash: 'sha256:abc123',
      issueNumber: 236,
      decision: decision(),
    });
    assert.equal(lines[1].kind, 'no-action');
    assert.equal(lines[1].decision.kind, 'no-action');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('creates a missing parent directory before appending evidence', () => {
  const directory = tempDirectory();
  const evidencePath = join(directory, 'a', 'b', 'evidence.jsonl');
  try {
    appendExecutionEvidence(evidencePath, decision(), () => '2026-08-23T15:00:00.000Z');
    assert.equal(readFileSync(evidencePath, 'utf8').split('\n').filter(Boolean).length, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects invalid evidence paths and invalid clock values', () => {
  const directory = tempDirectory();
  try {
    for (const path of ['', '   ', null, undefined]) {
      assert.throws(() => appendExecutionEvidence(path, decision()), /evidence path/i);
    }
    const directoryPath = join(directory, 'directory-target');
    mkdirSync(directoryPath);
    assert.throws(() => appendExecutionEvidence(directoryPath, decision()), /evidence/i);
    assert.throws(() => appendExecutionEvidence(join(directory, 'evidence.jsonl'), decision(), () => 'not-a-date'), /clock|time/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects decisions that cannot be represented as JSON', () => {
  const directory = tempDirectory();
  try {
    const cyclic = decision();
    cyclic.self = cyclic;
    assert.throws(() => appendExecutionEvidence(join(directory, 'cyclic.jsonl'), cyclic), /JSON|serializ/i);
    assert.throws(() => appendExecutionEvidence(join(directory, 'bigint.jsonl'), decision({ value: 1n })), /JSON|serializ/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
