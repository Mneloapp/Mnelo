import {
  ProjectUnavailableState,
  ProjectWorkspaceHeader,
  ProjectWorkspacePage,
  ProjectWorkspacePanel,
} from "@/components/project-workspace";
import { ProjectDocumentsPanel } from "@/components/project-documents-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getBoqItemsForCurrentUser, getProjectFilesForCurrentUser, getProjectForCurrentUser } from "@/lib/data";
import { getParsedFileIds } from "@/lib/project-workspace";

export const dynamic = "force-dynamic";

export default async function ProjectDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const [{ error, message }, projectResult, fileResult, boqResult] = await Promise.all([
    searchParams,
    getProjectForCurrentUser(id),
    getProjectFilesForCurrentUser(id),
    getBoqItemsForCurrentUser(id),
  ]);
  const { project, errorMessage } = projectResult;
  const { files, errorMessage: filesErrorMessage } = fileResult;
  const { items: boqItems } = boqResult;
  const showFilesError = process.env.NODE_ENV === "development" && filesErrorMessage;

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
          description="Upload and manage the tender package. Existing upload, parse and re-parse workflows stay here."
          title="Documents"
        >
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-2 border-b border-[#e5e7eb] pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Project documents</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload Excel BOQs, specifications, drawings, and tender PDFs. Excel files can be parsed or re-parsed.
                </p>
              </div>
              <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#087a36]">
                .xlsx / .xls / .pdf
              </span>
            </div>

            <ProjectDocumentsPanel
              files={files}
              initialError={error || (showFilesError ? filesErrorMessage || undefined : undefined)}
              initialMessage={message}
              parsedFileIds={getParsedFileIds(boqItems, files)}
              projectId={project.id}
            />
          </div>
        </ProjectWorkspacePanel>
      </ProjectWorkspacePage>
    </WorkspaceShell>
  );
}
