'use strict';

const { appendExecutionEvidence } = require('../lib/execution-evidence');
const { fetchIssueSnapshot } = require('../lib/github-issue-source');
const { createExecutionDecision } = require('../lib/issue-execution-engine');

const REPOSITORY_PATTERN = /^[^/\s]+\/[^/\s]+$/;
const DEFAULTS = Object.freeze({
  rootIssueNumber: 210,
  horizonIssueNumber: 211,
  evidencePath: '.devlead/runtime/execution-evidence.jsonl',
});

function argumentError(message) {
  const error = new Error(message);
  error.stage = 'arguments';
  return error;
}

function positiveInteger(value, option) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw argumentError(`${option} must be a positive integer`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw argumentError(`${option} must be a positive integer`);
  return number;
}

function isMutatingLookingFlag(argument) {
  return /^--(?:claim|dispatch|mutat|write|update|edit|close|reopen|label|assign|comment|merge|delete|create|push|state)/i.test(argument);
}

function parseArguments(args) {
  if (!Array.isArray(args)) throw argumentError('arguments must be an array');
  const result = { ...DEFAULTS, repository: undefined };
  const used = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (typeof option !== 'string' || !option.startsWith('--')) {
      throw argumentError('positional arguments are not allowed');
    }
    if (isMutatingLookingFlag(option)) throw argumentError('mutating flags are not supported');
    if (!['--repo', '--root', '--horizon', '--evidence'].includes(option)) {
      throw argumentError(`unknown flag: ${option}`);
    }
    if (used.has(option)) throw argumentError(`duplicate flag: ${option}`);
    used.add(option);
    const value = args[index + 1];
    if (typeof value !== 'string' || value.startsWith('--')) throw argumentError(`missing value for ${option}`);
    index += 1;
    if (option === '--repo') result.repository = value;
    if (option === '--root') result.rootIssueNumber = positiveInteger(value, option);
    if (option === '--horizon') result.horizonIssueNumber = positiveInteger(value, option);
    if (option === '--evidence') {
      if (value.trim() === '') throw argumentError('--evidence must be a non-empty path');
      result.evidencePath = value;
    }
  }

  if (!result.repository || !REPOSITORY_PATTERN.test(result.repository)) {
    throw argumentError('--repo must be an explicit owner/repository string');
  }
  return result;
}

function errorPayload(stage) {
  const messages = {
    arguments: 'invalid preview arguments',
    source: 'unable to fetch issue snapshot',
    decision: 'unable to create execution decision',
    evidence: 'unable to append execution evidence',
  };
  return { kind: 'execution-preview-error', stage, message: messages[stage] };
}

function write(stream, value) {
  stream.write(`${value}\n`);
}

function main(args, dependencies = {}) {
  const deps = {
    fetchIssueSnapshot,
    createExecutionDecision,
    appendExecutionEvidence,
    stdout: process.stdout,
    stderr: process.stderr,
    clock: () => new Date(),
    ...dependencies,
  };
  let options;
  try {
    options = parseArguments(args);
  } catch {
    write(deps.stderr, JSON.stringify(errorPayload('arguments')));
    return 1;
  }

  let snapshot;
  try {
    snapshot = deps.fetchIssueSnapshot({ repository: options.repository, now: deps.clock });
  } catch {
    write(deps.stderr, JSON.stringify(errorPayload('source')));
    return 1;
  }

  let decision;
  let stdoutJson;
  try {
    decision = deps.createExecutionDecision(snapshot, {
      rootIssueNumber: options.rootIssueNumber,
      horizonIssueNumber: options.horizonIssueNumber,
    }, deps.clock);
    stdoutJson = JSON.stringify(decision);
    if (stdoutJson === undefined) throw new Error('decision is not JSON-serializable');
  } catch {
    write(deps.stderr, JSON.stringify(errorPayload('decision')));
    return 1;
  }

  try {
    deps.appendExecutionEvidence(options.evidencePath, decision, deps.clock);
  } catch {
    write(deps.stderr, JSON.stringify(errorPayload('evidence')));
    return 1;
  }

  write(deps.stdout, stdoutJson);
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, parseArguments };
