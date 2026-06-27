import {
  ProjectUnavailableState,
  ProjectWorkspaceHeader,
  ProjectWorkspacePage,
  ProjectWorkspacePanel,
} from "@/components/project-workspace";
import { ProjectProcessingPanel } from "@/components/project-processing-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getBoqItemsForCurrentUser, getProjectFilesForCurrentUser, getProjectForCurrentUser } from "@/lib/data";
import { getParsedFileIds } from "@/lib/project-workspace";
import { deriveProjectProcessingItems } from "@/lib/project-processing";

export const dynamic = "force-dynamic";

export default async function ProjectActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectResult, fileResult, boqResult] = await Promise.all([
    getProjectForCurrentUser(id),
    getProjectFilesForCurrentUser(id),
    getBoqItemsForCurrentUser(id),
  ]);
  const { project, errorMessage } = projectResult;
  const { files } = fileResult;
  const { items: boqItems } = boqResult;

  if (!project) {
    return (
      <WorkspaceShell active="Projects">
        <ProjectUnavailableState errorMessage={errorMessage} />
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell active="Projects">
      <ProjectWorkspacePage>
        <ProjectWorkspaceHeader project={project} />

        <ProjectWorkspacePanel
          description="Project events and document processing status for the Project Intelligence Engine pipeline."
          title="Activity / Processing"
        >
          <ProjectProcessingPanel items={deriveProjectProcessingItems({ files, parsedFileIds: getParsedFileIds(boqItems, files) })} />
        </ProjectWorkspacePanel>
      </ProjectWorkspacePage>
    </WorkspaceShell>
  );
}
