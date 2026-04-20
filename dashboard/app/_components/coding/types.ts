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

/**
 * Issue #154 / Phase 3 §D.3.c — inline diff payloads on handoff messages.
 *
 * A single file diff attached to a HandoffMessage. `patch` is the raw unified
 * diff body (including hunk headers and optional --- / +++ file headers);
 * `added` / `removed` are precomputed line counts so the UI does not have to
 * re-parse to show a summary.
 */
export interface DiffFile {
    path: string;
    added: number;
    removed: number;
    patch: string;
}

export interface HandoffMessage {
    timestamp: string;
    from: string;
    to: string;
    text: string;
    /**
     * Optional per-file diffs attached to this message. Rendered as
     * `DiffBlock` components after the message text (Issue #154 §D.3.c).
     */
    diffs?: DiffFile[];
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
