import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { createProject } from "@/app/projects/actions";
import { ErrorMessage, PageHeader } from "@/components/ui";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <WorkspaceShell active="Projects">
      <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader
          action={
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#0f172a] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8faf8]"
              href="/projects"
            >
              <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
              Back to Projects
            </Link>
          }
          eyebrow="New project"
          subtitle="Capture the basic intake details for an estimate, tender, procurement package, or sourcing workflow."
          title="Create Project"
        />

        <section className="mt-8 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          {error ? (
            <div className="mb-5">
              <ErrorMessage message={error} />
            </div>
          ) : null}

          <form action={createProject} className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[#0f172a]">Project name</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                name="name"
                placeholder="Regional Expansion Package"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#0f172a]">Client</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                name="client"
                placeholder="Northstar Group"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#0f172a]">Location</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                name="location"
                placeholder="Austin, TX"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#0f172a]">Industry / Work type</span>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                name="work_type"
                placeholder="Construction, manufacturing, energy, facilities..."
                required
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-[#0f172a]">Notes</span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                name="notes"
                placeholder="Project context, scope notes, or procurement instructions"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-[#087a36]"
                type="submit"
              >
                <Plus aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
                Create Project
              </button>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-[#0f172a] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8faf8]"
                href="/projects"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </WorkspaceShell>
  );
}
