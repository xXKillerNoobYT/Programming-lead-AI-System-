import type { ReactElement } from 'react';
import { ProjectTabContent } from './ProjectTabContent';

export default async function ProjectTabPage({
    params,
}: {
    params: Promise<{ projectId: string; tab: string }>;
}): Promise<ReactElement> {
    const { projectId, tab } = await params;
    return <ProjectTabContent projectId={projectId} tab={tab} />;
}
