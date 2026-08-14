import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import type {
  IssueIntegrityListEnvelope,
  IssueIntegrityProjection,
  LongHorizonCommonJs,
} from '../types/long-horizon';

const longHorizon: LongHorizonCommonJs = require('../../lib/long-horizon/index.js');

const ALLOWED_MODES = new Set(['off', 'shadow', 'enforce']);
const ALLOWED_SOURCES = new Set(['paperclip', 'github']);
const CREDENTIAL_QUERY_FIELD = /^(?:authorization|cookie|credential|password|secret|token|api[_-]?key|access[_-]?token)$/i;

export class IssueIntegrityHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface IssueIntegrityRequest {
  projectId: string;
  searchParams: URLSearchParams;
  allowedQuery?: readonly string[];
}

export interface IssueIntegrityProjectionSet {
  envelope: IssueIntegrityListEnvelope;
  projections: IssueIntegrityProjection[];
  json: string;
  ndjson: string;
}

function configuredMode(fixtureAllowed: boolean) {
  const mode = process.env.DEVLEAD_ISSUE_INTEGRITY_MODE || (fixtureAllowed ? 'shadow' : 'off');
  if (!ALLOWED_MODES.has(mode)) {
    throw new IssueIntegrityHttpError(500, 'issue-integrity mode is invalid');
  }
  return mode;
}

function assertQuery(searchParams: URLSearchParams, allowedQuery: readonly string[]) {
  const allowed = new Set(allowedQuery);
  const seen = new Set<string>();
  for (const [key, value] of searchParams.entries()) {
    if (CREDENTIAL_QUERY_FIELD.test(key) || !allowed.has(key)) {
      throw new IssueIntegrityHttpError(400, 'unsupported issue-integrity query parameter');
    }
    if (seen.has(key) || !value.trim()) {
      throw new IssueIntegrityHttpError(400, 'invalid issue-integrity query parameter');
    }
    seen.add(key);
  }
}

function fixturePath() {
  const path = process.env.DEVLEAD_ISSUE_INTEGRITY_FIXTURE;
  if (!path) throw new IssueIntegrityHttpError(503, 'issue-integrity fixture is not configured');
  return isAbsolute(path) ? path : resolve(process.cwd(), path);
}

function readFixture() {
  try {
    const fixture = JSON.parse(readFileSync(fixturePath(), 'utf8'));
    if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
      throw new Error('fixture must be an object');
    }
    return fixture;
  } catch (error) {
    if (error instanceof IssueIntegrityHttpError) throw error;
    throw new IssueIntegrityHttpError(502, 'issue-integrity fixture could not be read');
  }
}

function defaultLocalRecord(fixture: any, now: string) {
  const issue = fixture.issue || fixture.sourceSnapshot;
  return {
    schemaVersion: 1,
    issueKey: issue.issueKey,
    policyVersion: fixture.policy.policyVersion,
    createdAt: issue.createdAt,
    updatedAt: now,
  };
}

export function isInboxItem(item: IssueIntegrityProjection) {
  return item.attention.state !== 'none' || !item.lifecycle.closeAllowed;
}

export function loadIssueIntegrityProjectionSet({
  projectId,
  searchParams,
  allowedQuery = ['at', 'source'],
}: IssueIntegrityRequest): IssueIntegrityProjectionSet {
  assertQuery(searchParams, allowedQuery);
  const expectedProjectId = process.env.DEVLEAD_ISSUE_INTEGRITY_PROJECT_ID;
  if (!expectedProjectId || projectId !== expectedProjectId) {
    throw new IssueIntegrityHttpError(404, 'issue-integrity project was not found');
  }

  const at = searchParams.get('at');
  const fixtureConfigured = Boolean(process.env.DEVLEAD_ISSUE_INTEGRITY_FIXTURE);
  const fixtureAllowed = fixtureConfigured && ['test', 'development'].includes(process.env.NODE_ENV || '');
  if (at && !fixtureAllowed) {
    throw new IssueIntegrityHttpError(400, 'at is accepted only in test/development fixture mode');
  }
  if (configuredMode(fixtureAllowed) === 'off') {
    throw new IssueIntegrityHttpError(503, 'issue-integrity mode is off');
  }
  if (!fixtureAllowed) {
    throw new IssueIntegrityHttpError(503, 'live issue-integrity source is not enabled');
  }

  const fixture = readFixture();
  const sourceSnapshot = fixture.issue || fixture.sourceSnapshot;
  if (!sourceSnapshot || !fixture.policy || !fixture.sourceWatermark) {
    throw new IssueIntegrityHttpError(502, 'issue-integrity fixture is incomplete');
  }
  const requestedSource = searchParams.get('source');
  if (requestedSource && !ALLOWED_SOURCES.has(requestedSource)) {
    throw new IssueIntegrityHttpError(400, 'issue-integrity source is invalid');
  }
  if (requestedSource && requestedSource !== sourceSnapshot.sourceKind) {
    throw new IssueIntegrityHttpError(404, 'issue-integrity source was not found');
  }

  const now = at || fixture.now;
  if (!now) throw new IssueIntegrityHttpError(502, 'issue-integrity fixture has no evaluated time');
  let projection: IssueIntegrityProjection;
  try {
    projection = longHorizon.evaluateIssueIntegrity({
      sourceSnapshot,
      localRecord: fixture.localRecord || defaultLocalRecord(fixture, now),
      dependencies: fixture.dependencies || [],
      events: fixture.events || [],
      leases: fixture.leases || [],
      families: fixture.families || [],
      policy: fixture.policy,
      now,
      sourceWatermark: fixture.sourceWatermark,
    });
  } catch {
    throw new IssueIntegrityHttpError(502, 'issue-integrity evaluation failed');
  }

  const projections = [projection];
  const json = longHorizon.serializeProjectionList(projections);
  const ndjson = longHorizon.serializeProjectionNdjson(projections);
  return {
    envelope: JSON.parse(json) as IssueIntegrityListEnvelope,
    projections,
    json,
    ndjson,
  };
}

export function issueIntegrityErrorResponse(error: unknown) {
  const status = error instanceof IssueIntegrityHttpError ? error.status : 500;
  const message = error instanceof IssueIntegrityHttpError
    ? error.message
    : 'issue-integrity request failed';
  return Response.json({ error: message }, { status });
}

export function jsonResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
