import { createWsStore, WsMessage, WS_MESSAGE_KINDS } from '../lib/ws-store';

describe('Issue #24 final leaf — Zustand WS store (Part 6 §6.2)', () => {
    it('exports the Part 6 §6.2 kind union as WS_MESSAGE_KINDS', () => {
        expect(new Set(WS_MESSAGE_KINDS)).toEqual(
            new Set([
                'heartbeat',
                'handoff',
                'agent_report',
                'grok_escalation',
                'metric',
                'clarifying_q',
                'issue_update',
                'decision',
            ]),
        );
    });

    it('createWsStore returns a Zustand store with empty message list initially', () => {
        const store = createWsStore({ projectId: 'devlead-mcp' });
        expect(store.getState().messages).toEqual([]);
        expect(store.getState().projectId).toBe('devlead-mcp');
    });

    it('receive() appends a message to the store', () => {
        const store = createWsStore({ projectId: 'devlead-mcp' });
        const msg: WsMessage = {
            ts: '2026-04-19T04:00:00Z',
            kind: 'heartbeat',
            payload: { tick: 1 },
        };
        store.getState().receive(msg);
        expect(store.getState().messages).toEqual([msg]);
    });

    it('receive() keeps messages in insertion order', () => {
        const store = createWsStore({ projectId: 'devlead-mcp' });
        const msg1: WsMessage = { ts: '2026-04-19T04:00:00Z', kind: 'heartbeat', payload: 1 };
        const msg2: WsMessage = { ts: '2026-04-19T04:00:01Z', kind: 'decision', payload: 2 };
        const msg3: WsMessage = { ts: '2026-04-19T04:00:02Z', kind: 'agent_report', payload: 3 };
        store.getState().receive(msg1);
        store.getState().receive(msg2);
        store.getState().receive(msg3);
        expect(store.getState().messages).toEqual([msg1, msg2, msg3]);
    });

    it('createWsStore returns distinct stores per projectId', () => {
        const storeA = createWsStore({ projectId: 'proj-a' });
        const storeB = createWsStore({ projectId: 'proj-b' });
        storeA.getState().receive({ ts: '2026-04-19T04:00:00Z', kind: 'heartbeat', payload: 1 });
        expect(storeA.getState().messages).toHaveLength(1);
        expect(storeB.getState().messages).toHaveLength(0);
    });

    it('byKind() selector returns only messages of the requested kind', () => {
        const store = createWsStore({ projectId: 'devlead-mcp' });
        const hb: WsMessage = { ts: '2026-04-19T04:00:00Z', kind: 'heartbeat', payload: 1 };
        const dec: WsMessage = { ts: '2026-04-19T04:00:01Z', kind: 'decision', payload: 2 };
        store.getState().receive(hb);
        store.getState().receive(dec);
        expect(store.getState().byKind('heartbeat')).toEqual([hb]);
        expect(store.getState().byKind('decision')).toEqual([dec]);
        expect(store.getState().byKind('metric')).toEqual([]);
    });

    it('clear() empties the message list', () => {
        const store = createWsStore({ projectId: 'devlead-mcp' });
        store.getState().receive({ ts: '2026-04-19T04:00:00Z', kind: 'heartbeat', payload: 1 });
        store.getState().clear();
        expect(store.getState().messages).toEqual([]);
    });
});

describe('Issue #24 final leaf — mock in-process WS emitter', () => {
    it('connectMockEmitter wires an EventEmitter into a store', async () => {
        const { EventEmitter } = await import('node:events');
        const { connectMockEmitter, createWsStore } = await import('../lib/ws-store');
        const store = createWsStore({ projectId: 'devlead-mcp' });
        const emitter = new EventEmitter();
        const disconnect = connectMockEmitter(store, emitter);

        const msg = { ts: '2026-04-19T04:00:00Z', kind: 'heartbeat' as const, payload: 1 };
        emitter.emit('message', msg);
        expect(store.getState().messages).toEqual([msg]);

        disconnect();
        emitter.emit('message', {
            ts: '2026-04-19T04:00:01Z',
            kind: 'heartbeat' as const,
            payload: 2,
        });
        expect(store.getState().messages).toEqual([msg]);
    });
});
