import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { BoqResultsTable } from "@/components/boq-results-table";
import { ProjectDocumentsPanel } from "@/components/project-documents-panel";
import { ProjectSystemsPanel } from "@/components/project-systems-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  getBoqItemsForCurrentUser,
  getLearningRecordsForCurrentUser,
  getProjectFilesForCurrentUser,
  getProjectForCurrentUser,
  getProjectSystemsForCurrentUser,
} from "@/lib/data";

export const dynamic = "force-dynamic";

function OverviewCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#07130f]">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

export default async function ProjectDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const [{ error, message }, projectResult, fileResult, boqResult, learningResult, systemsResult] = await Promise.all([
    searchParams,
    getProjectForCurrentUser(id),
    getProjectFilesForCurrentUser(id),
    getBoqItemsForCurrentUser(id),
    getLearningRecordsForCurrentUser(id),
    getProjectSystemsForCurrentUser(id),
  ]);
  const { project, errorMessage } = projectResult;
  const { files, errorMessage: filesErrorMessage } = fileResult;
  const { cleanupSummary, items: boqItems, errorMessage: boqErrorMessage } = boqResult;
  const { records: learningRecords, errorMessage: learningErrorMessage } = learningResult;
  const { systems, errorMessage: systemsErrorMessage } = systemsResult;
  const showFilesError = process.env.NODE_ENV === "development" && filesErrorMessage;
  const showBoqError =
    process.env.NODE_ENV === "development" && (boqErrorMessage || learningErrorMessage || systemsErrorMessage);
  const parsedFileIds = Array.from(
    new Set(boqItems.map((item) => item.sourceFileId).filter((fileId): fileId is string => Boolean(fileId))),
  );
  if (parsedFileIds.length === 0 && boqItems.length > 0 && files.length === 1) {
    parsedFileIds.push(files[0].id);
  }
  const lastUpload = files[0]?.uploadedAt || "No uploads";
  const itemBoqRows = boqItems.filter((item) => item.rowType === "item");
  const lastParse = boqItems[boqItems.length - 1]?.createdAt || "No parsed BOQ";

  if (!project) {
    if (errorMessage) {
      return (
        <WorkspaceShell active="Projects">
          <div className="mx-auto max-w-4xl px-4 py-10">
            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Project unavailable</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#07130f]">
                We could not load this project.
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                The projects table may not be set up yet. Create the table in Supabase, then refresh this page.
              </p>
              {process.env.NODE_ENV === "development" ? (
                <p className="mx-auto mt-5 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
                  {errorMessage}
                </p>
              ) : null}
              <div className="mt-6">
                <Link className="font-semibold text-[#087a36]" href="/dashboard">
                  Back to dashboard
                </Link>
              </div>
            </section>
          </div>
        </WorkspaceShell>
      );
    }

    notFound();
  }

  return (
    <WorkspaceShell active="Projects">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Link className="text-sm font-semibold text-[#087a36]" href="/dashboard">
              Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#07130f]">{project.name}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {project.client} / {project.location} / {project.workType}
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-[#087a36]"
            href="/projects/new"
          >
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
            New Project
          </Link>
        </header>

        <nav className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          {[
            ["Overview", "#overview"],
            ["Documents", "#documents"],
            ["Systems", "#systems"],
            ["BOQ", "#boq"],
          ].map(([label, href], index) => (
            <a
              className={
                index === 0
                  ? "rounded-xl bg-[#ecfdf3] px-4 py-2 text-sm font-semibold text-[#087a36]"
                  : "rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-[#f8faf8] hover:text-[#07130f]"
              }
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </nav>

        <section className="mt-6 scroll-mt-24" id="overview">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewCard detail="Uploaded project documents" label="Files count" value={String(files.length)} />
            <OverviewCard detail="Clean item rows after BOQ cleanup" label="BOQ items count" value={String(cleanupSummary.itemRows)} />
            <OverviewCard detail="Most recent document upload" label="Last upload" value={lastUpload} />
            <OverviewCard detail="Latest parsed BOQ row" label="Last parse" value={lastParse} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Recent files</h2>
                <a className="text-sm font-semibold text-[#087a36]" href="#documents">
                  View documents
                </a>
              </div>
              {files.length > 0 ? (
                <div className="mt-4 divide-y divide-[#edf0ed]">
                  {files.slice(0, 4).map((file) => (
                    <div className="flex items-center justify-between gap-4 py-3" key={file.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0f172a]">{file.fileName}</p>
                        <p className="mt-1 text-xs text-[#64748b]">
                          {file.documentType} / {file.fileSize}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-xs text-[#64748b]">{file.uploadedAt}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#e5e7eb] bg-[#f8faf8] p-6 text-center">
                  <p className="font-medium text-[#0f172a]">No files uploaded yet</p>
                  <p className="mt-2 text-sm text-[#64748b]">Upload documents in the Documents tab.</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Latest BOQ rows</h2>
                <a className="text-sm font-semibold text-[#087a36]" href="#boq">
                  View BOQ
                </a>
              </div>
              {itemBoqRows.length > 0 ? (
                <div className="mt-4 divide-y divide-[#edf0ed]">
                  {itemBoqRows.slice(0, 4).map((item) => (
                    <div className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]" key={item.id}>
                      <p className="line-clamp-2 text-sm font-semibold text-[#0f172a]">{item.description}</p>
                      <p className="whitespace-nowrap text-sm text-[#64748b]">
                        {item.quantity === null ? "—" : item.quantity.toLocaleString()} {item.unit || ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#e5e7eb] bg-[#f8faf8] p-6 text-center">
                  <p className="font-medium text-[#0f172a]">No BOQ items parsed yet</p>
                  <p className="mt-2 text-sm text-[#64748b]">Upload or parse a BOQ file to get started.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          className="mt-6 scroll-mt-24 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]"
          id="documents"
        >
          <div className="flex flex-col gap-2 border-b border-[#e5e7eb] pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Documents</h2>
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
            parsedFileIds={parsedFileIds}
            projectId={project.id}
          />
        </section>

        <section className="mt-6 scroll-mt-24" id="systems">
          <ProjectSystemsPanel projectId={project.id} systems={systems} />
        </section>

        <section className="mt-6 scroll-mt-24" id="boq">
          <BoqResultsTable
            cleanupSummary={cleanupSummary}
            items={boqItems}
            learningRecords={learningRecords}
            showClassification={false}
          />
          {showBoqError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
              {boqErrorMessage || learningErrorMessage || systemsErrorMessage}
            </p>
          ) : null}
        </section>
      </div>
    </WorkspaceShell>
  );
}
