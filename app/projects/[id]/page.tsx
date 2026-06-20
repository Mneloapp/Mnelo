import { notFound } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { Badge, Button, Shell, StatCard } from "@/components/ui";
import { BoqResultsTable } from "@/components/boq-results-table";
import { uploadProjectDocument } from "@/app/projects/actions";
import { getBoqItemsForCurrentUser, getProjectFilesForCurrentUser, getProjectForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const [{ error }, projectResult, fileResult, boqResult] = await Promise.all([
    searchParams,
    getProjectForCurrentUser(id),
    getProjectFilesForCurrentUser(id),
    getBoqItemsForCurrentUser(id),
  ]);
  const { project, errorMessage } = projectResult;
  const { files, errorMessage: filesErrorMessage } = fileResult;
  const { items: boqItems, errorMessage: boqErrorMessage } = boqResult;
  const showFilesError = process.env.NODE_ENV === "development" && filesErrorMessage;
  const showBoqError = process.env.NODE_ENV === "development" && boqErrorMessage;

  if (!project) {
    if (errorMessage) {
      return (
        <Shell>
          <AppNav />
          <section className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
            <Badge tone="neutral">Project unavailable</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
              We could not load this project.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/58">
              The projects table may not be set up yet. Create the table in Supabase, then refresh this page.
            </p>
            {process.env.NODE_ENV === "development" ? (
              <p className="mx-auto mt-5 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-6">
              <Button href="/projects">Back to projects</Button>
            </div>
          </section>
        </Shell>
      );
    }

    notFound();
  }

  return (
    <Shell>
      <AppNav />
      <section className="mb-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge>{project.status}</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">{project.name}</h1>
            <p className="mt-3 text-sm text-ink/58">
              {project.client} · {project.location} · Updated {project.updatedAt}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button href="/projects" variant="secondary">
              Back to projects
            </Button>
            <Button href="#boq">Review BOQ</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Contract value" value={project.value} detail={`${project.workType} package`} />
        <StatCard label="Documents" value={String(project.drawings)} detail="Parsed and indexed" />
        <StatCard label="Readiness" value={`${project.progress}%`} detail="Estimator approved" />
        <StatCard label="Risk" value={project.risk} detail="Based on scope deltas" />
      </section>

      <section className="my-6 grid gap-6 lg:grid-cols-[0.8fr_1fr]">
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-ink">AI workspace</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Project intake", project.notes || "Ready for BOQs, tender documents, scope notes, and procurement context."],
              ["Quantity agent", "Extracted structured quantities from the latest BOQ workbook."],
              ["Scope agent", "Matched tender requirements against BOQ coverage."],
              ["Procurement agent", "Mapped supplier options, alternates, and RFQ context."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg bg-mist/60 p-4 ring-1 ring-line">
                <p className="font-medium text-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-ink/58">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-ink p-5 text-white shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">Procurement readiness</h2>
          <div className="mt-5 space-y-4">
            {[
              ["BOQ validation", project.progress],
              ["Supplier mapping", 86],
              ["Quote pack completion", 74],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="flex justify-between text-sm text-white/68">
                  <span>{label}</span>
                  <span>{value}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-leaf-400" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-line pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">Upload Documents</h2>
            <p className="mt-1 text-sm text-ink/55">
              Upload BOQ spreadsheets, specifications, drawings, and tender PDFs. Excel BOQs are parsed automatically.
            </p>
          </div>
          <Badge tone="neutral">.xlsx · .xls · .pdf</Badge>
        </div>

        {error ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form action={uploadProjectDocument} className="mt-5 grid gap-4 lg:grid-cols-[1fr_14rem_auto]">
          <input name="project_id" type="hidden" value={project.id} />
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Document file</span>
            <input
              accept=".xlsx,.xls,.pdf"
              className="mt-2 block h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-leaf-900"
              name="file"
              required
              type="file"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Document type</span>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="document_type"
            >
              <option>BOQ Excel</option>
              <option>Specification PDF</option>
              <option>Drawing PDF</option>
              <option>Other</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-leaf-900 lg:w-auto"
              type="submit"
            >
              Upload
            </button>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/45">Uploaded files</h3>
          {files.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-line">
              <div className="divide-y divide-line">
                {files.map((file) => (
                  <div
                    className="grid gap-3 bg-white px-4 py-3 text-sm md:grid-cols-[1fr_10rem_7rem_9rem]"
                    key={file.id}
                  >
                    <div>
                      <p className="font-medium text-ink">{file.fileName}</p>
                      <p className="mt-1 font-mono text-xs text-ink/40">{file.storagePath}</p>
                    </div>
                    <p className="text-ink/65">{file.documentType}</p>
                    <p className="text-ink/65">{file.fileSize}</p>
                    <p className="text-ink/55">{file.uploadedAt}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-line bg-mist/50 p-6 text-center">
              <p className="font-medium text-ink">No documents uploaded yet</p>
              <p className="mt-2 text-sm text-ink/55">
                Upload BOQ Excel files, specification PDFs, or drawing PDFs to start organizing project inputs.
              </p>
              {showFilesError ? (
                <p className="mx-auto mt-4 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
                  {filesErrorMessage}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <div id="boq">
        <BoqResultsTable items={boqItems} />
        {showBoqError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
            {boqErrorMessage}
          </p>
        ) : null}
      </div>
    </Shell>
  );
}
