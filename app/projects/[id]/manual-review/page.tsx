import {
  ProjectUnavailableState,
  ProjectWorkspaceHeader,
  ProjectWorkspacePage,
  ProjectWorkspacePanel,
} from "@/components/project-workspace";
import { ManualReviewPrototype } from "@/components/manual-review/manual-review-prototype";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getBoqItemsForCurrentUser, getProjectForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectManualReviewPage({ params }: { params: Promise<{ id: string }> }) {
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

  const showBoqError = process.env.NODE_ENV === "development" && boqErrorMessage;

  return (
    <WorkspaceShell active="Projects">
      <ProjectWorkspacePage>
        <ProjectWorkspaceHeader project={project} />

        <ProjectWorkspacePanel
          description="Review product groups derived from BOQ rows before moving classifications into procurement workflows."
          eyebrow="Prototype"
          title="Manual Review"
        >
          <ManualReviewPrototype items={items} />
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
