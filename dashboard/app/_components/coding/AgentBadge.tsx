import type { ReactElement } from 'react';
import { cn } from '../../../lib/utils';
import type { AgentName } from './types';

/**
 * Issue #145 / Phase 3 §D.3.a — Coding tab skeleton.
 *
 * Small pill badge identifying the agent on a handoff. Colours:
 *   RooCode  → blue
 *   Copilot  → orange
 *   Claude   → purple
 *   unknown  → gray (neutral)
 *
 * Renders the raw agent string as its label; no truncation for the skeleton.
 */

interface AgentBadgeProps {
    agent: AgentName;
}

const AGENT_CLASSES: Record<string, string> = {
    RooCode: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    Copilot: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    Claude: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
};

const UNKNOWN_CLASSES = 'bg-gray-500/20 text-gray-300 border-gray-500/40';

const BASE_CLASSES =
    'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium';

export function AgentBadge({ agent }: AgentBadgeProps): ReactElement {
    const variantClasses = AGENT_CLASSES[agent] ?? UNKNOWN_CLASSES;
    return (
        <span className={cn(BASE_CLASSES, variantClasses)} data-agent={agent}>
            {agent}
        </span>
    );
}
