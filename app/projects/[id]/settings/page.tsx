import { FileText, Settings } from "lucide-react";
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

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
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
          description="Project-specific workspace controls will live here without changing global account settings."
          title="Settings"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <WorkspacePlaceholder
              description="Project preferences, processing rules and workspace configuration will be added here after the Project Intelligence Engine foundation is stable."
              icon={Settings}
              title="Workspace settings reserved"
            />
            <WorkspacePlaceholder
              description="Future document processing controls will be introduced here with versioning, auditability and review rules."
              icon={FileText}
              title="Processing controls reserved"
            />
          </div>
        </ProjectWorkspacePanel>
      </ProjectWorkspacePage>
    </WorkspaceShell>
  );
}
