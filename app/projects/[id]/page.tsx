import { AIProcessingStage } from "@/components/project-pipeline/ai-processing-stage";
import { PackagesStagePreview } from "@/components/project-pipeline/packages-stage-preview";
import { ProjectReadySummary } from "@/components/project-pipeline/project-ready-summary";
import { ReviewCompleteStage } from "@/components/project-pipeline/review-complete-stage";
import { ReviewExceptionsStage } from "@/components/project-pipeline/review-exceptions-stage";
import { UploadStage } from "@/components/project-pipeline/upload-stage";
import { ProjectUnavailableState, ProjectWorkspaceHeader, ProjectWorkspacePage } from "@/components/project-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getBoqItemsForCurrentUser, getProjectFilesForCurrentUser, getProjectForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectResult, fileResult, boqResult] = await Promise.all([
    getProjectForCurrentUser(id),
    getProjectFilesForCurrentUser(id),
    getBoqItemsForCurrentUser(id),
  ]);
  const { project, errorMessage } = projectResult;
  const { files } = fileResult;
  const { cleanupSummary, items: boqItems } = boqResult;

  if (!project) {
    return (
      <WorkspaceShell active="Projects">
        <ProjectUnavailableState errorMessage={errorMessage} />
      </WorkspaceShell>
    );
  }

  const itemRows = boqItems.filter((item) => item.rowType === "item");
  const reviewItems = itemRows.filter((item) => item.needsReview);
  const systems = Array.from(new Set(itemRows.map((item) => item.category).filter(Boolean))).sort();
  const completedStages = getCompletedStages({
    filesCount: files.length,
    itemRows: cleanupSummary.itemRows,
    reviewRequired: reviewItems.length,
  });

  return (
    <WorkspaceShell active="Projects">
      <ProjectWorkspacePage>
        <ProjectWorkspaceHeader completedStages={completedStages} project={project} />

        <main className="mx-auto mt-10 max-w-5xl">
          {files.length === 0 ? (
            <UploadStage projectId={project.id} />
          ) : cleanupSummary.itemRows === 0 ? (
            <AIProcessingStage projectId={project.id} />
          ) : reviewItems.length > 0 ? (
            <div className="space-y-8">
              <ProjectReadySummary
                itemCount={cleanupSummary.itemRows}
                projectId={project.id}
                reviewCount={reviewItems.length}
                systems={systems.length > 0 ? systems : ["Organized items"]}
              />
              <ReviewExceptionsStage projectId={project.id} reviewItems={reviewItems} />
            </div>
          ) : (
            <div className="space-y-8">
              <ReviewCompleteStage projectId={project.id} />
              <PackagesStagePreview projectId={project.id} />
            </div>
          )}
        </main>
      </ProjectWorkspacePage>
    </WorkspaceShell>
  );
}

function getCompletedStages({
  filesCount,
  itemRows,
  reviewRequired,
}: {
  filesCount: number;
  itemRows: number;
  reviewRequired: number;
}) {
  if (filesCount === 0) return 0;
  if (itemRows === 0) return 1;
  if (reviewRequired > 0) return 2;
  return 3;
}
