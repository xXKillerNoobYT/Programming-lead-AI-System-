import {
  IssueIntegrityHttpError,
  issueIntegrityErrorResponse,
  jsonResponse,
  loadIssueIntegrityProjectionSet,
} from '../../../../../../lib/issue-integrity-server';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const format = searchParams.get('format') || 'json';
    if (!['json', 'ndjson'].includes(format)) {
      throw new IssueIntegrityHttpError(400, 'issue-integrity export format is invalid');
    }
    const result = loadIssueIntegrityProjectionSet({
      projectId,
      searchParams,
      allowedQuery: ['at', 'source', 'format'],
    });
    if (format === 'ndjson') {
      return new Response(result.ndjson, {
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
      });
    }
    return jsonResponse(result.json);
  } catch (error) {
    return issueIntegrityErrorResponse(error);
  }
}
