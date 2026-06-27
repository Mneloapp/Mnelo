import Link from "next/link";
import { Activity, FileText, Info, Sparkles } from "lucide-react";
import {
  OverviewCard,
  ProjectUnavailableState,
  ProjectWorkspaceHeader,
  ProjectWorkspacePage,
  ProjectWorkspacePanel,
} from "@/components/project-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getBoqItemsForCurrentUser, getProjectFilesForCurrentUser, getProjectForCurrentUser } from "@/lib/data";
import { getParsedFileIds } from "@/lib/project-workspace";
import { deriveProjectProcessingItems } from "@/lib/project-processing";

export const dynamic = "force-dynamic";

function getNextAction({
  filesCount,
  itemRows,
  reviewRequired,
}: {
  filesCount: number;
  itemRows: number;
  reviewRequired: number;
}) {
  if (filesCount === 0) {
    return {
      description: "Upload the tender package, BOQ files or project documents to start building project intelligence.",
      href: "documents",
      label: "Upload documents",
      title: "Start with project documents",
    };
  }

  if (itemRows === 0) {
    return {
      description: "Parse an uploaded Excel BOQ so Mnelo can extract clean item rows for review.",
      href: "documents",
      label: "Parse BOQ",
      title: "Parse the project BOQ",
    };
  }

  if (reviewRequired > 0) {
    return {
      description: "Review low-confidence items before moving project intelligence into procurement workflows.",
      href: "intelligence",
      label: "Review classifications",
      title: "Resolve items needing review",
    };
  }

  return {
    description: "Review the system breakdown, confirm categories and prepare the workspace for future RFQ packages.",
    href: "intelligence",
    label: "Open Intelligence",
    title: "Project intelligence is ready",
  };
}

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

  const itemBoqRows = boqItems.filter((item) => item.rowType === "item");
  const reviewRequired = itemBoqRows.filter((item) => item.needsReview).length;
  const parsedFileIds = getParsedFileIds(boqItems, files);
  const processingItems = deriveProjectProcessingItems({ files, parsedFileIds });
  const processingStatus =
    processingItems.length === 0
      ? "Waiting"
      : processingItems.some((item) => item.status === "failed")
        ? "Needs attention"
        : processingItems.every((item) => item.status === "completed")
          ? "Completed"
          : "In progress";
  const nextAction = getNextAction({ filesCount: files.length, itemRows: cleanupSummary.itemRows, reviewRequired });

  return (
    <WorkspaceShell active="Projects">
      <ProjectWorkspacePage>
        <ProjectWorkspaceHeader project={project} />

        <ProjectWorkspacePanel
          description="A focused project operating view for documents, BOQ intelligence and reusable procurement knowledge."
          title="Overview"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewCard detail="Uploaded project documents" label="Documents" value={String(files.length)} />
            <OverviewCard
              detail="Clean item rows after BOQ cleanup"
              label="BOQ Items"
              value={String(cleanupSummary.itemRows)}
            />
            <OverviewCard detail="Items requiring human verification" label="Review Required" value={String(reviewRequired)} />
            <OverviewCard detail="Document processing pipeline" label="Processing Status" value={processingStatus} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
                  <Info aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Project information</h2>
                  <p className="mt-1 text-sm text-slate-500">Core context for this estimation and procurement workspace.</p>
                </div>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  ["Project", project.name],
                  ["Client", project.client],
                  ["Location", project.location],
                  ["Industry / Work type", project.workType],
                ].map(([label, value]) => (
                  <div className="rounded-xl border border-[#edf0ed] bg-[#fbfdfb] p-4" key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">{label}</dt>
                    <dd className="mt-2 text-sm font-semibold text-[#0f172a]">{value || "Not specified"}</dd>
                  </div>
                ))}
              </dl>
              {project.notes ? (
                <div className="mt-4 rounded-xl border border-[#edf0ed] bg-[#fbfdfb] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">Notes</p>
                  <p className="mt-2 text-sm leading-6 text-[#334155]">{project.notes}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
                  <Sparkles aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">{nextAction.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{nextAction.description}</p>
                </div>
              </div>
              <Link
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.22)] transition hover:bg-[#087a36]"
                href={`/projects/${project.id}/${nextAction.href}`}
              >
                {nextAction.label}
              </Link>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Recent activity</h2>
                <Link className="text-sm font-semibold text-[#087a36]" href={`/projects/${project.id}/activity`}>
                  View activity
                </Link>
              </div>
              {processingItems.length > 0 ? (
                <div className="mt-4 divide-y divide-[#edf0ed]">
                  {processingItems.slice(0, 3).map((item) => (
                    <div className="flex items-center justify-between gap-4 py-3" key={item.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0f172a]">{item.fileName}</p>
                        <p className="mt-1 text-xs capitalize text-[#64748b]">{item.stage}</p>
                      </div>
                      <p className="whitespace-nowrap text-xs text-[#64748b]">{item.timestamp}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#e5e7eb] bg-[#f8faf8] p-6 text-center">
                  <Activity aria-hidden="true" className="mx-auto h-5 w-5 text-[#16a34a]" strokeWidth={2} />
                  <p className="mt-3 font-medium text-[#0f172a]">No activity yet</p>
                  <p className="mt-2 text-sm text-[#64748b]">Project activity will appear after documents are uploaded.</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Workspace sections</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Documents", "Upload, parse and manage files", "documents"],
                  ["BOQ Review", "Review parsed and ignored rows", "boq"],
                  ["Intelligence", "Classify systems and categories", "intelligence"],
                  ["Knowledge", "Permanent project memory", "knowledge"],
                ].map(([label, description, href]) => (
                  <Link
                    className="rounded-xl border border-[#edf0ed] bg-[#fbfdfb] p-4 transition hover:border-[#bbf7d0] hover:bg-[#ecfdf3]"
                    href={`/projects/${project.id}/${href}`}
                    key={label}
                  >
                    <FileText aria-hidden="true" className="h-4 w-4 text-[#16a34a]" strokeWidth={2} />
                    <p className="mt-3 text-sm font-semibold text-[#0f172a]">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#64748b]">{description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ProjectWorkspacePanel>
      </ProjectWorkspacePage>
    </WorkspaceShell>
  );
}
