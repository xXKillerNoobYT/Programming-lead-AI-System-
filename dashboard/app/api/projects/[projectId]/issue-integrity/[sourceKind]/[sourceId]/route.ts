import {
  IssueIntegrityHttpError,
  issueIntegrityErrorResponse,
  jsonResponse,
  loadIssueIntegrityProjectionSet,
} from '../../../../../../../lib/issue-integrity-server';

interface RouteContext {
  params: Promise<{
    projectId: string;
    sourceKind: string;
    sourceId: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { projectId, sourceKind, sourceId } = await context.params;
    const result = loadIssueIntegrityProjectionSet({
      projectId,
      searchParams: new URL(request.url).searchParams,
    });
    const item = result.projections.find((candidate) => (
      candidate.issue.sourceKind === sourceKind &&
      candidate.issue.sourceIssueId === sourceId
    ));
    if (!item) throw new IssueIntegrityHttpError(404, 'issue-integrity item was not found');
    const body = JSON.stringify({
      schemaVersion: result.envelope.schemaVersion,
      policyVersion: result.envelope.policyVersion,
      evaluatedAt: result.envelope.evaluatedAt,
      sourceWatermark: result.envelope.sourceWatermark,
      item,
    });
    return jsonResponse(body);
  } catch (error) {
    return issueIntegrityErrorResponse(error);
  }
}
