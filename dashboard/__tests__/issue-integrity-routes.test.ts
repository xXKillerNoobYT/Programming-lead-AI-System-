/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { GET as getList } from '../app/api/projects/[projectId]/issue-integrity/route';
import { GET as getDetail } from '../app/api/projects/[projectId]/issue-integrity/[sourceKind]/[sourceId]/route';
import { GET as getInbox } from '../app/api/projects/[projectId]/issue-integrity/inbox/route';
import { GET as getExport } from '../app/api/projects/[projectId]/issue-integrity/export/route';

const PROJECT_ID = 'project-demo';
const AT = '2026-08-03T00:00:00.000Z';
const FIXTURE = join(
  process.cwd(),
  '..',
  'tests',
  'fixtures',
  'long-horizon',
  'blocked-chain-8d.json',
);

function context(projectId = PROJECT_ID) {
  return { params: Promise.resolve({ projectId }) };
}

function request(path: string) {
  return new Request(`http://localhost${path}`);
}

async function json(response: Response) {
  return JSON.parse(await response.text());
}

describe('project-scoped read-only issue-integrity routes', () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    mode: process.env.DEVLEAD_ISSUE_INTEGRITY_MODE,
    fixture: process.env.DEVLEAD_ISSUE_INTEGRITY_FIXTURE,
    projectId: process.env.DEVLEAD_ISSUE_INTEGRITY_PROJECT_ID,
    secret: process.env.PAPERCLIP_API_KEY,
  };

  beforeEach(() => {
    Reflect.set(process.env, 'NODE_ENV', 'test');
    delete process.env.DEVLEAD_ISSUE_INTEGRITY_MODE;
    process.env.DEVLEAD_ISSUE_INTEGRITY_FIXTURE = FIXTURE;
    process.env.DEVLEAD_ISSUE_INTEGRITY_PROJECT_ID = PROJECT_ID;
    process.env.PAPERCLIP_API_KEY = 'server-only-secret';
  });

  afterAll(() => {
    for (const [key, value] of Object.entries({
      NODE_ENV: previous.NODE_ENV,
      DEVLEAD_ISSUE_INTEGRITY_MODE: previous.mode,
      DEVLEAD_ISSUE_INTEGRITY_FIXTURE: previous.fixture,
      DEVLEAD_ISSUE_INTEGRITY_PROJECT_ID: previous.projectId,
      PAPERCLIP_API_KEY: previous.secret,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('preserves one canonical envelope, item ordering, evaluated time, and watermark', async () => {
    const listResponse = await getList(
      request(`/api/projects/${PROJECT_ID}/issue-integrity?at=${encodeURIComponent(AT)}`),
      context(),
    );
    const detailResponse = await getDetail(
      request(`/api/projects/${PROJECT_ID}/issue-integrity/paperclip/issue-42?at=${encodeURIComponent(AT)}`),
      { params: Promise.resolve({ projectId: PROJECT_ID, sourceKind: 'paperclip', sourceId: 'issue-42' }) },
    );
    const inboxResponse = await getInbox(
      request(`/api/projects/${PROJECT_ID}/issue-integrity/inbox?at=${encodeURIComponent(AT)}`),
      context(),
    );
    const exportResponse = await getExport(
      request(`/api/projects/${PROJECT_ID}/issue-integrity/export?format=json&at=${encodeURIComponent(AT)}`),
      context(),
    );

    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(inboxResponse.status).toBe(200);
    expect(exportResponse.status).toBe(200);

    const list = await json(listResponse);
    const detail = await json(detailResponse);
    const inbox = await json(inboxResponse);
    const exported = await json(exportResponse);

    expect(list.items.map((item: any) => item.issue.issueKey)).toEqual([
      'paperclip:company-demo:issue-42',
    ]);
    for (const envelope of [list, detail, inbox, exported]) {
      expect(envelope.schemaVersion).toBe(list.schemaVersion);
      expect(envelope.policyVersion).toBe(list.policyVersion);
      expect(envelope.evaluatedAt).toBe(AT);
      expect(envelope.sourceWatermark).toEqual(list.sourceWatermark);
    }
    expect(detail.item).toEqual(list.items[0]);
    expect(inbox.items).toEqual(list.items);
    expect(exported.items).toEqual(list.items);
  });

  it('exports NDJSON with the exact canonical list item bytes and order', async () => {
    const listResponse = await getList(
      request(`/api/projects/${PROJECT_ID}/issue-integrity?at=${encodeURIComponent(AT)}`),
      context(),
    );
    const exportResponse = await getExport(
      request(`/api/projects/${PROJECT_ID}/issue-integrity/export?format=ndjson&at=${encodeURIComponent(AT)}`),
      context(),
    );

    const list = await json(listResponse);
    const ndjson = (await exportResponse.text()).trimEnd().split('\n');
    expect(exportResponse.headers.get('content-type')).toContain('application/x-ndjson');
    expect(ndjson).toEqual(list.items.map((item: any) => JSON.stringify(item)));
  });

  it('matches the CLI JSON envelope byte-for-byte for the same fixture and clock', async () => {
    const routeResponse = await getList(
      request(`/api/projects/${PROJECT_ID}/issue-integrity?at=${encodeURIComponent(AT)}`),
      context(),
    );
    const routeBody = await routeResponse.text();
    const cli = spawnSync(process.execPath, [
      join(process.cwd(), '..', 'scripts', 'devlead-integrity.js'),
      '--fixture', FIXTURE,
      '--at', AT,
      '--format', 'json',
    ], { encoding: 'utf8' });

    expect(cli.status).toBe(1);
    expect(cli.stderr).toBe('');
    expect(cli.stdout.trimEnd()).toBe(routeBody);
  });

  it('rejects project and source mismatches', async () => {
    const projectMismatch = await getList(
      request('/api/projects/wrong-project/issue-integrity'),
      context('wrong-project'),
    );
    const sourceMismatch = await getDetail(
      request(`/api/projects/${PROJECT_ID}/issue-integrity/github/issue-42`),
      { params: Promise.resolve({ projectId: PROJECT_ID, sourceKind: 'github', sourceId: 'issue-42' }) },
    );
    const idMismatch = await getDetail(
      request(`/api/projects/${PROJECT_ID}/issue-integrity/paperclip/other-issue`),
      { params: Promise.resolve({ projectId: PROJECT_ID, sourceKind: 'paperclip', sourceId: 'other-issue' }) },
    );

    expect(projectMismatch.status).toBe(404);
    expect(sourceMismatch.status).toBe(404);
    expect(idMismatch.status).toBe(404);
  });

  it('rejects empty and duplicate route options instead of defaulting or taking the first value', async () => {
    const paths = [
      '/api/projects/project-demo/issue-integrity?at=',
      '/api/projects/project-demo/issue-integrity?source=',
      '/api/projects/project-demo/issue-integrity/export?format=',
      '/api/projects/project-demo/issue-integrity?source=paperclip&source=github',
      `/api/projects/project-demo/issue-integrity?at=${AT}&at=${AT}`,
      '/api/projects/project-demo/issue-integrity/export?format=json&format=ndjson',
    ];

    for (const path of paths) {
      const handler = path.includes('/export') ? getExport : getList;
      const response = await handler(request(path), context('project-demo'));
      expect(response.status).toBe(400);
    }
  });

  it('accepts at only in test/development fixture mode', async () => {
    Reflect.set(process.env, 'NODE_ENV', 'production');
    const response = await getList(
      request(`/api/projects/${PROJECT_ID}/issue-integrity?at=${encodeURIComponent(AT)}`),
      context(),
    );

    expect(response.status).toBe(400);
    expect((await json(response)).error).toMatch(/fixture mode/i);
  });

  it('honors an explicit off mode even when a development fixture is configured', async () => {
    process.env.DEVLEAD_ISSUE_INTEGRITY_MODE = 'off';
    const response = await getList(
      request(`/api/projects/${PROJECT_ID}/issue-integrity?at=${encodeURIComponent(AT)}`),
      context(),
    );

    expect(response.status).toBe(503);
    expect((await json(response)).error).toMatch(/mode is off/i);
  });

  it('keeps credentials server-side and rejects credential-shaped query fields', async () => {
    const response = await getList(
      request(`/api/projects/${PROJECT_ID}/issue-integrity?at=${encodeURIComponent(AT)}&token=client-secret`),
      context(),
    );
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).not.toContain('client-secret');
    expect(body).not.toContain('server-only-secret');
  });

  it('enables and declares only the approved external CommonJS evaluator seam', () => {
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8');
    const declaration = readFileSync(join(process.cwd(), 'types', 'long-horizon.d.ts'), 'utf8');
    const serverAdapter = readFileSync(
      join(process.cwd(), 'lib', 'issue-integrity-server.ts'),
      'utf8',
    );

    expect(nextConfig).toMatch(/externalDir\s*:\s*true/);
    expect(declaration).toContain('LongHorizonCommonJs');
    expect(declaration).toContain('evaluateIssueIntegrity');
    expect(declaration).toContain('serializeProjectionList');
    expect(declaration).toContain('serializeProjectionNdjson');
    expect(declaration).not.toContain('paperclip:');
    expect(declaration).not.toContain('github:');
    expect(serverAdapter).toContain('DEVLEAD_ISSUE_INTEGRITY_MODE');
    expect(serverAdapter).not.toContain('DEVLEAD_INTEGRITY_MODE');
  });
});
