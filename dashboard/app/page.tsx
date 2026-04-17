'use client';

import { useState } from 'react';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'coding' | 'guidance' | 'log'>('coding');

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <header className="border-b border-gray-800 p-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">🧠</div>
                        <h1 className="text-2xl font-bold">DevLead MCP</h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('coding')}
                            className={`px-4 py-2 rounded-lg ${activeTab === 'coding' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                        >
                            Coding AI Relay
                        </button>
                        <button
                            onClick={() => setActiveTab('guidance')}
                            className={`px-4 py-2 rounded-lg ${activeTab === 'guidance' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                        >
                            User Guidance
                        </button>
                        <button
                            onClick={() => setActiveTab('log')}
                            className={`px-4 py-2 rounded-lg ${activeTab === 'log' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                        >
                            Execution Log
                        </button>
                    </div>
                    <div className="text-sm text-gray-400">Run 2: Phase 1 MVP</div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6">
                {activeTab === 'coding' && (
                    <div className="bg-gray-900 rounded-xl p-8 border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Coding AI Relay</h2>
                        <div className="h-96 bg-black rounded-lg flex items-center justify-center border border-dashed border-gray-700">
                            <p className="text-gray-500">Chat interface with Roo Code delegation (MCP connected)</p>
                        </div>
                        <div className="mt-4 text-xs text-gray-500">WebSocket connected to MCP delegation server • Model: Qwen3.5-32B via Ollama</div>
                    </div>
                )}

                {activeTab === 'guidance' && (
                    <div className="bg-gray-900 rounded-xl p-8 border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">User Guidance</h2>
                        <div className="h-96 bg-black rounded-lg flex items-center justify-center border border-dashed border-gray-700">
                            <p className="text-gray-500">High-level input and approval interface</p>
                        </div>
                    </div>
                )}

                {activeTab === 'log' && (
                    <div className="bg-gray-900 rounded-xl p-8 border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Execution Log</h2>
                        <div className="h-96 bg-black rounded-lg p-4 font-mono text-sm overflow-auto border border-gray-700">
                            <div className="text-green-400">[INFO] MCP servers initialized</div>
                            <div className="text-blue-400">[HEARTBEAT] SOUL check at 30s interval</div>
                            <div className="text-gray-500">WebSocket live • Awaiting delegation events...</div>
                        </div>
                        <div className="mt-4 text-xs text-gray-500">Real-time updates via WebSockets from heartbeat scheduler</div>
                    </div>
                )}
            </main>

            <footer className="border-t border-gray-800 p-4 text-center text-xs text-gray-500">
                Infrastructure for Run 2 Phase 1 MVP • Docker + Ollama + MCP + Next.js 15 • See plans/main-plan.md and GitHub #2
            </footer>
        </div>
    );
}
