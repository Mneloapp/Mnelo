import { Brain } from "lucide-react";
import {
  ProjectUnavailableState,
  ProjectWorkspaceHeader,
  ProjectWorkspacePage,
  ProjectWorkspacePanel,
  WorkspacePlaceholder,
} from "@/components/project-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getProjectForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectKnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, errorMessage } = await getProjectForCurrentUser(id);

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
          description="Approved entities, decisions and procurement knowledge will appear here."
          title="Knowledge"
        >
          <WorkspacePlaceholder
            description="This workspace will become the permanent memory of this project. Approved entities, decisions and procurement knowledge will appear here."
            icon={Brain}
            title="Knowledge Engine"
          />
        </ProjectWorkspacePanel>
      </ProjectWorkspacePage>
    </WorkspaceShell>
  );
}
