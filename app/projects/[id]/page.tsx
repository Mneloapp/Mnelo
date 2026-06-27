import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Brain, FileText, Info, Plus, Settings } from "lucide-react";
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

function WorkspaceSection({
  children,
  description,
  id,
  title,
}: {
  children: React.ReactNode;
  description: string;
  id: string;
  title: string;
}) {
  return (
    <section className="mt-6 scroll-mt-24" id={id}>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#16a34a]">Project Workspace</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#07130f]">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function WorkspacePlaceholder({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof Brain;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#fbfdfb] p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ecfdf3] text-[#16a34a]">
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#07130f]">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
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
            ["Intelligence", "#intelligence"],
            ["Knowledge", "#knowledge"],
            ["Activity", "#activity"],
            ["Settings", "#settings"],
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

        <WorkspaceSection
          description="The operating view for project scope, documents, BOQ intelligence and reusable procurement knowledge."
          id="overview"
          title="Overview"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewCard detail="Uploaded project documents" label="Files count" value={String(files.length)} />
            <OverviewCard detail="Clean item rows after BOQ cleanup" label="BOQ items count" value={String(cleanupSummary.itemRows)} />
            <OverviewCard detail="Most recent document upload" label="Last upload" value={lastUpload} />
            <OverviewCard detail="Latest parsed BOQ row" label="Last parse" value={lastParse} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
                  <Info aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Project information</h2>
                  <p className="mt-1 text-sm text-slate-500">Core context for the current tender or procurement workspace.</p>
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

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)] xl:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Workspace status</h2>
                <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#087a36]">Foundation</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  ["Documents", files.length > 0 ? "Started" : "Waiting for upload"],
                  ["Intelligence", cleanupSummary.itemRows > 0 ? "BOQ parsed" : "Waiting for BOQ"],
                  ["Knowledge", learningRecords.length > 0 ? "Learning records available" : "No confirmed knowledge yet"],
                  ["Activity", files.length > 0 || boqItems.length > 0 ? "Project activity captured" : "No activity yet"],
                ].map(([label, value]) => (
                  <div className="rounded-xl border border-[#edf0ed] bg-[#fbfdfb] p-4" key={label}>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-[#0f172a]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Latest BOQ rows</h2>
                <a className="text-sm font-semibold text-[#087a36]" href="#intelligence">
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
        </WorkspaceSection>

        <WorkspaceSection
          description="Upload and manage the tender package. Existing upload, parse and re-parse workflows stay here."
          id="documents"
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
              parsedFileIds={parsedFileIds}
              projectId={project.id}
            />
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          description="Structured BOQ intelligence for systems, takeoff, classifications and line-item review."
          id="intelligence"
          title="Intelligence"
        >
          <ProjectSystemsPanel projectId={project.id} systems={systems} />

          <div className="mt-6">
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
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          description="Verified classifications, corrections and project intelligence will accumulate here as reusable procurement knowledge."
          id="knowledge"
          title="Knowledge"
        >
          <WorkspacePlaceholder
            description="This section will become the project knowledge base for confirmed entities, learned classifications, document evidence and reusable procurement decisions."
            icon={Brain}
            title="Knowledge foundation ready"
          />
        </WorkspaceSection>

        <WorkspaceSection
          description="Project events will provide an audit trail for uploads, parsing, AI processing, confirmations and future procurement actions."
          id="activity"
          title="Activity"
        >
          <WorkspacePlaceholder
            description="Activity events are reserved for the Project Intelligence Engine. Uploads, parsing results and review actions will appear here as the processing pipeline matures."
            icon={Activity}
            title="Activity timeline reserved"
          />
        </WorkspaceSection>

        <WorkspaceSection
          description="Project-specific workspace controls will live here without changing global account settings."
          id="settings"
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
        </WorkspaceSection>
      </div>
    </WorkspaceShell>
  );
}
