import {
  ProjectUnavailableState,
  ProjectWorkspaceHeader,
  ProjectWorkspacePage,
  ProjectWorkspacePanel,
} from "@/components/project-workspace";
import { ProjectSystemsPanel } from "@/components/project-systems-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getProjectForCurrentUser, getProjectSystemsForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectIntelligencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectResult, systemsResult] = await Promise.all([
    getProjectForCurrentUser(id),
    getProjectSystemsForCurrentUser(id),
  ]);
  const { project, errorMessage } = projectResult;
  const { systems, errorMessage: systemsErrorMessage } = systemsResult;
  const showSystemsError = process.env.NODE_ENV === "development" && systemsErrorMessage;

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
          description="Break the BOQ into systems, categories and takeoff groups for procurement-ready intelligence."
          title="Intelligence"
        >
          <ProjectSystemsPanel projectId={project.id} systems={systems} />
          {showSystemsError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
              {systemsErrorMessage}
            </p>
          ) : null}
        </ProjectWorkspacePanel>
      </ProjectWorkspacePage>
    </WorkspaceShell>
  );
}
