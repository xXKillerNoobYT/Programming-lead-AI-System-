'use strict';

const { appendFileSync, mkdirSync, statSync } = require('node:fs');
const { dirname } = require('node:path');

function evidenceError(message) {
  return new Error(`execution evidence: ${message}`);
}

function isoNow(clock) {
  const value = typeof clock === 'function' ? clock() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw evidenceError('clock returned an invalid time');
  return date.toISOString();
}

function assertJsonValue(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw evidenceError('decision is not JSON-serializable');
    return;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw evidenceError('decision is not JSON-serializable');
    seen.add(value);
    for (const item of value) assertJsonValue(item, seen);
    seen.delete(value);
    return;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    if (seen.has(value)) throw evidenceError('decision is not JSON-serializable');
    seen.add(value);
    for (const key of Object.keys(value)) assertJsonValue(value[key], seen);
    seen.delete(value);
    return;
  }
  throw evidenceError('decision is not JSON-serializable');
}

function jsonLine(value) {
  try {
    assertJsonValue(value);
    return `${JSON.stringify(value)}\n`;
  } catch (error) {
    if (error && /^execution evidence:/.test(error.message)) throw error;
    throw evidenceError('decision is not JSON-serializable');
  }
}

function appendExecutionEvidence(filePath, decision, clock) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw evidenceError('evidence path must be a non-empty string');
  }
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
    throw evidenceError('decision must be an object');
  }

  const timestamp = isoNow(clock);
  const record = {
    timestamp,
    repository: decision.source && decision.source.repository,
    policyVersion: decision.policyVersion,
    kind: decision.kind,
    ...(decision.packetHash ? { packetHash: decision.packetHash } : {}),
    ...(decision.issue && Number.isInteger(decision.issue.number) ? { issueNumber: decision.issue.number } : {}),
    decision,
  };
  const line = jsonLine(record);
  const directory = dirname(filePath);

  try {
    mkdirSync(directory, { recursive: true });
    if (statSync(filePath, { throwIfNoEntry: false })?.isDirectory()) {
      throw evidenceError('evidence path must refer to a file');
    }
    appendFileSync(filePath, line, 'utf8');
  } catch (error) {
    if (error && /^execution evidence:/.test(error.message)) throw error;
    throw evidenceError('failed to append evidence');
  }
}

module.exports = { appendExecutionEvidence };
