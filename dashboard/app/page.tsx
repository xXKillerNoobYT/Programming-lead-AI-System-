'use client';

import { useState, useEffect } from 'react';

interface Preferences {
    modelMappings: { [mode: string]: string };
    toggles: {
        memPalace: boolean;
        autoGPT: boolean;
        hourlyGrok: boolean;
    };
    heartbeatInterval: number;
    maxParallelism: number;
    approvalThreshold: string;
}

const defaultPreferences: Preferences = {
    modelMappings: {
        'design-lead': 'grok-4.20',
        'orchestrator': '',
        'code': '',
        'architect': '',
        'debug': '',
        'security-review': '',
        'documentation-writer': '',
        'jest-test-engineer': '',
        'user-story-creator': '',
        'devops': '',
        'skill-writer': '',
        'mode-writer': '',
    },
    toggles: {
        memPalace: false,
        autoGPT: false,
        hourlyGrok: false,
    },
    heartbeatInterval: 30,
    maxParallelism: 5,
    approvalThreshold: 'medium',
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'coding' | 'guidance' | 'log'>('coding');
    const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
    const [saveMessage, setSaveMessage] = useState<string>('');

    useEffect(() => {
        const saved = localStorage.getItem('preferences');
        if (!saved) return;
        try {
            setPreferences(JSON.parse(saved));
        } catch (err) {
            console.error('Failed to parse saved preferences; falling back to defaults.', err);
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('preferences', JSON.stringify(preferences));
        setSaveMessage('Preferences saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const updateModelMapping = (mode: string, value: string) => {
        setPreferences(prev => ({
            ...prev,
            modelMappings: { ...prev.modelMappings, [mode]: value }
        }));
    };

    const updateToggle = (key: keyof Preferences['toggles'], value: boolean) => {
        setPreferences(prev => ({
            ...prev,
            toggles: { ...prev.toggles, [key]: value }
        }));
    };

    const updateHeartbeatInterval = (value: number) => {
        setPreferences(prev => ({ ...prev, heartbeatInterval: value }));
    };

    const updateMaxParallelism = (value: number) => {
        setPreferences(prev => ({ ...prev, maxParallelism: value }));
    };

    const updateApprovalThreshold = (value: string) => {
        setPreferences(prev => ({ ...prev, approvalThreshold: value }));
    };

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
                        <h2 className="text-xl font-semibold mb-6">User Guidance</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium mb-4">Model Mappings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(preferences.modelMappings).map(([mode, model]) => (
                                        <div key={mode} className="flex items-center gap-3">
                                            <label className="w-32 text-sm font-medium capitalize">{mode.replace('-', ' ')}:</label>
                                            <input
                                                type="text"
                                                value={model}
                                                onChange={(e) => updateModelMapping(mode, e.target.value)}
                                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Enter model name"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium mb-4">Toggles</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={preferences.toggles.memPalace}
                                            onChange={(e) => updateToggle('memPalace', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm">MemPalace</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={preferences.toggles.autoGPT}
                                            onChange={(e) => updateToggle('autoGPT', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm">AutoGPT</span>
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={preferences.toggles.hourlyGrok}
                                            onChange={(e) => updateToggle('hourlyGrok', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm">Hourly Grok</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium mb-4">Heartbeat Interval</h3>
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min="30"
                                        max="300"
                                        value={preferences.heartbeatInterval}
                                        onChange={(e) => updateHeartbeatInterval(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                    />
                                    <div className="flex justify-between text-sm text-gray-400">
                                        <span>30s</span>
                                        <span className="font-medium">{preferences.heartbeatInterval}s</span>
                                        <span>300s</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium mb-4">Max Parallelism</h3>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={preferences.maxParallelism}
                                    onChange={(e) => updateMaxParallelism(Number(e.target.value))}
                                    className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <h3 className="text-lg font-medium mb-4">Approval Gate Threshold</h3>
                                <select
                                    value={preferences.approvalThreshold}
                                    onChange={(e) => updateApprovalThreshold(e.target.value)}
                                    className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                                >
                                    Save Preferences
                                </button>
                                {saveMessage && (
                                    <span className="text-green-400 text-sm">{saveMessage}</span>
                                )}
                            </div>
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
