import {
  isInboxItem,
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
    const result = loadIssueIntegrityProjectionSet({
      projectId,
      searchParams: new URL(request.url).searchParams,
    });
    const items = result.envelope.items.filter(isInboxItem);
    return jsonResponse(JSON.stringify({
      schemaVersion: result.envelope.schemaVersion,
      policyVersion: result.envelope.policyVersion,
      evaluatedAt: result.envelope.evaluatedAt,
      sourceWatermark: result.envelope.sourceWatermark,
      items,
    }));
  } catch (error) {
    return issueIntegrityErrorResponse(error);
  }
}
