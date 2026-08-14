export interface IssueIntegrityProjection {
  schemaVersion: number;
  policyVersion: string;
  issue: {
    issueKey: string;
    sourceKind: 'paperclip' | 'github';
    scopeKey: string;
    sourceIssueId: string;
    identifier: string;
    title: string;
    operationalStatus: string;
    createdAt: string;
    updatedAt: string;
  };
  lifecycle: {
    state: string;
    closeAllowed: boolean;
    reasons: string[];
  };
  attention: {
    state: string;
    [key: string]: unknown;
  };
  recurrence: {
    familyId: string | null;
    candidates: unknown[];
  };
  evaluatedAt: string;
  sourceWatermark: Record<string, unknown>;
}

export interface IssueIntegrityListEnvelope {
  schemaVersion: number;
  policyVersion: string;
  evaluatedAt: string;
  sourceWatermark: Record<string, unknown>;
  items: IssueIntegrityProjection[];
}

export interface LongHorizonCommonJs {
  evaluateIssueIntegrity(input: Record<string, unknown>): IssueIntegrityProjection;
  serializeProjectionList(items: IssueIntegrityProjection[]): string;
  serializeProjectionNdjson(items: IssueIntegrityProjection[]): string;
}
