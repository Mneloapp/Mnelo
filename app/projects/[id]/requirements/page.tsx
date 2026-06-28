import {
  ProjectUnavailableState,
  ProjectWorkspaceHeader,
  ProjectWorkspacePage,
  ProjectWorkspacePanel,
} from "@/components/project-workspace";
import { ProjectRequirementsOverview } from "@/components/project-requirements-overview";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getBoqItemsForCurrentUser, getProjectForCurrentUser } from "@/lib/data";
import { deriveRequirementsFromBoqItems } from "@/lib/requirements/derive-requirements";

export const dynamic = "force-dynamic";

export default async function ProjectRequirementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectResult, boqResult] = await Promise.all([getProjectForCurrentUser(id), getBoqItemsForCurrentUser(id)]);
  const { project, errorMessage } = projectResult;
  const { errorMessage: boqErrorMessage, items } = boqResult;

  if (!project) {
    return (
      <WorkspaceShell active="Projects">
        <ProjectUnavailableState errorMessage={errorMessage} />
      </WorkspaceShell>
    );
  }

  const { insights, sections } = deriveRequirementsFromBoqItems(items);
  const showBoqError = process.env.NODE_ENV === "development" && boqErrorMessage;

  return (
    <WorkspaceShell active="Projects">
      <ProjectWorkspacePage>
        <ProjectWorkspaceHeader project={project} />

        <ProjectWorkspacePanel
          description="Project requirements generated from BOQ rows, specifications and tender documents."
          eyebrow="Tender-to-Procurement"
          title="Requirements"
        >
          <ProjectRequirementsOverview insights={insights} sections={sections} />
          {showBoqError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
              {boqErrorMessage}
            </p>
          ) : null}
        </ProjectWorkspacePanel>
      </ProjectWorkspacePage>
    </WorkspaceShell>
  );
}
