/**
 * Issue #145 / Phase 3 §D.3.a — Coding tab skeleton.
 *
 * Shared types for the Coding-tab skeleton. Per the Issue's verbatim type
 * contract: AgentName is a union extended with `string` so unknown agents
 * still type-check (and get neutral styling at runtime).
 *
 * Note on `taskType`: `HandoffThreadData` does not (yet) carry a `taskType`
 * field. The FilterBar exposes a `taskType` dropdown that is wired to state
 * and onChange but is a no-op filter for now — a later leaf (§D.3.b or
 * later) will add the field to the data model and wire the filter
 * predicate. See CodingTabContent for the stub comment.
 */

export type AgentName = 'RooCode' | 'Copilot' | 'Claude' | string;

export type ThreadStatus = 'in_progress' | 'done' | 'blocked' | 'failed';

export interface HandoffMessage {
    timestamp: string;
    from: string;
    to: string;
    text: string;
}

export interface HandoffThreadData {
    id: string;
    agent: AgentName;
    status: ThreadStatus;
    headline: string;
    decisionId?: string;
    issueNumber?: number;
    messages: HandoffMessage[];
}

export interface Filters {
    agent: string;
    taskType: string;
    status: string;
    search: string;
}

export const EMPTY_FILTERS: Filters = {
    agent: '',
    taskType: '',
    status: '',
    search: '',
};
