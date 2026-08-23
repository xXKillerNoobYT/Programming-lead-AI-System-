'use strict';

const {
  appendFileSync,
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, isAbsolute, join, relative, resolve, sep } = require('node:path');

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

function isInside(candidate, root) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === ''
    || (!isAbsolute(pathFromRoot) && pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`));
}

function resolveEvidencePath(filePath) {
  const absolutePath = resolve(filePath);
  const allowedRoots = [
    resolve(process.cwd(), '.devlead', 'runtime'),
    resolve(join(tmpdir(), 'devlead-execution-evidence')),
  ];
  if (!allowedRoots.some((root) => isInside(absolutePath, root))) {
    throw evidenceError('evidence path must stay inside a dedicated runtime directory');
  }
  return absolutePath;
}

function pathChain(filePath) {
  const chain = [];
  let current = filePath;
  while (true) {
    chain.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return chain.reverse();
}

function assertUnlinkedPath(filePath) {
  const chain = pathChain(filePath);
  for (let index = 0; index < chain.length; index += 1) {
    const status = lstatSync(chain[index], { throwIfNoEntry: false });
    if (!status) continue;
    if (status.isSymbolicLink()) throw evidenceError('evidence path cannot contain a symbolic link');
    const target = index === chain.length - 1;
    if (!target && !status.isDirectory()) {
      throw evidenceError('evidence path parent must be a directory');
    }
    if (target && (!status.isFile() || status.nlink !== 1)) {
      throw evidenceError('evidence path must refer to a regular unlinked file');
    }
  }
}

function appendExecutionEvidence(filePath, decision, clock) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw evidenceError('evidence path must be a non-empty string');
  }
  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
    throw evidenceError('decision must be an object');
  }

  const absolutePath = resolveEvidencePath(filePath);
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
  const directory = dirname(absolutePath);

  let descriptor;
  try {
    assertUnlinkedPath(absolutePath);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    assertUnlinkedPath(absolutePath);
    const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
    descriptor = openSync(
      absolutePath,
      constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY | noFollow,
      0o600,
    );
    const opened = fstatSync(descriptor);
    if (!opened.isFile() || opened.nlink !== 1) {
      throw evidenceError('evidence path must refer to a regular unlinked file');
    }
    appendFileSync(descriptor, line, 'utf8');
  } catch (error) {
    if (error && /^execution evidence:/.test(error.message)) throw error;
    throw evidenceError('failed to append evidence');
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

module.exports = { appendExecutionEvidence };
