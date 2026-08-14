import {
  issueIntegrityErrorResponse,
  jsonResponse,
  loadIssueIntegrityProjectionSet,
} from '../../../../../lib/issue-integrity-server';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const result = loadIssueIntegrityProjectionSet({
      projectId,
      searchParams: new URL(request.url).searchParams,
    });
    return jsonResponse(result.json);
  } catch (error) {
    return issueIntegrityErrorResponse(error);
  }
}
