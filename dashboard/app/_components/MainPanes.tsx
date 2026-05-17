import type { ReactNode, ReactElement } from 'react';

interface MainPanesProps {
    operator: ReactNode;
    conversational: ReactNode;
}

export function MainPanes({ operator, conversational }: MainPanesProps): ReactElement {
    return (
        <div className="flex flex-1 min-h-0">
            <section
                role="region"
                aria-label="Operator console"
                className="basis-2/3 flex-shrink min-w-0 border-r border-gray-800 overflow-auto"
            >
                {operator}
            </section>
            <section
                role="region"
                aria-label="AI conversational panel"
                className="basis-1/3 flex-shrink min-w-0 bg-gray-900 overflow-auto"
            >
                {conversational}
            </section>
        </div>
    );
}
