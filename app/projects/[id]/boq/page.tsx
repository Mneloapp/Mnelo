import {
  ProjectUnavailableState,
  ProjectWorkspaceHeader,
  ProjectWorkspacePage,
  ProjectWorkspacePanel,
} from "@/components/project-workspace";
import { BoqResultsTable } from "@/components/boq-results-table";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  getBoqItemsForCurrentUser,
  getLearningRecordsForCurrentUser,
  getProjectForCurrentUser,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectBoqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectResult, boqResult, learningResult] = await Promise.all([
    getProjectForCurrentUser(id),
    getBoqItemsForCurrentUser(id),
    getLearningRecordsForCurrentUser(id),
  ]);
  const { project, errorMessage } = projectResult;
  const { cleanupSummary, items: boqItems, errorMessage: boqErrorMessage } = boqResult;
  const { records: learningRecords, errorMessage: learningErrorMessage } = learningResult;
  const showBoqError = process.env.NODE_ENV === "development" && (boqErrorMessage || learningErrorMessage);

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
          description="Review parsed BOQ rows, cleanup results, ignored rows and extracted source context."
          title="BOQ Review"
        >
          <BoqResultsTable cleanupSummary={cleanupSummary} items={boqItems} learningRecords={learningRecords} showClassification={false} />
          {showBoqError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
              {boqErrorMessage || learningErrorMessage}
            </p>
          ) : null}
        </ProjectWorkspacePanel>
      </ProjectWorkspacePage>
    </WorkspaceShell>
  );
}
