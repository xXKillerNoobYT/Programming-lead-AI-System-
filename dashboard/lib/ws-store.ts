import { createStore, type StoreApi } from 'zustand/vanilla';

export const WS_MESSAGE_KINDS = [
    'heartbeat',
    'handoff',
    'agent_report',
    'grok_escalation',
    'metric',
    'clarifying_q',
    'issue_update',
    'decision',
] as const;

export type WsMessageKind = (typeof WS_MESSAGE_KINDS)[number];

export interface WsMessage {
    ts: string;
    kind: WsMessageKind;
    payload: unknown;
}

export interface WsStoreState {
    projectId: string;
    messages: WsMessage[];
    receive: (msg: WsMessage) => void;
    byKind: (kind: WsMessageKind) => WsMessage[];
    clear: () => void;
}

interface CreateWsStoreOptions {
    projectId: string;
}

export function createWsStore(options: CreateWsStoreOptions): StoreApi<WsStoreState> {
    return createStore<WsStoreState>((set, get) => ({
        projectId: options.projectId,
        messages: [],
        receive: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
        byKind: (kind) => get().messages.filter((m) => m.kind === kind),
        clear: () => set({ messages: [] }),
    }));
}

interface MinimalEmitter {
    on: (event: 'message', listener: (msg: WsMessage) => void) => unknown;
    off?: (event: 'message', listener: (msg: WsMessage) => void) => unknown;
    removeListener?: (event: 'message', listener: (msg: WsMessage) => void) => unknown;
}

export function connectMockEmitter(
    store: StoreApi<WsStoreState>,
    emitter: MinimalEmitter,
): () => void {
    const handler = (msg: WsMessage) => {
        store.getState().receive(msg);
    };
    emitter.on('message', handler);
    return () => {
        if (typeof emitter.off === 'function') {
            emitter.off('message', handler);
        } else if (typeof emitter.removeListener === 'function') {
            emitter.removeListener('message', handler);
        }
    };
}
