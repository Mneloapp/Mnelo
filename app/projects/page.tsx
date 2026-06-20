import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { EmptyState, ErrorMessage, PageHeader } from "@/components/ui";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getProjectsForCurrentUser } from "@/lib/data";

export default async function ProjectsPage() {
  const { projects, errorMessage } = await getProjectsForCurrentUser();
  const showProjectError = process.env.NODE_ENV === "development" && errorMessage;

  return (
    <WorkspaceShell active="Projects">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader
          action={
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-[#087a36]"
              href="/projects/new"
            >
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
              New Project
            </Link>
          }
          subtitle="Create and manage estimation and procurement workspaces across any industry."
          title="Projects"
        />

        {showProjectError ? (
          <div className="mt-5">
            <ErrorMessage message={errorMessage} />
          </div>
        ) : null}

        <section className="mt-8">
          {projects.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.12em] text-[#64748b]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Project</th>
                      <th className="px-5 py-4 font-semibold">Client</th>
                      <th className="px-5 py-4 font-semibold">Location</th>
                      <th className="px-5 py-4 font-semibold">Industry / Work type</th>
                      <th className="px-5 py-4 font-semibold">Created</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0ed]">
                    {projects.map((project) => (
                      <tr className="transition hover:bg-[#f8faf8]" key={project.id}>
                        <td className="min-w-72 px-5 py-4">
                          <Link className="group flex items-center gap-3" href={`/projects/${project.id}`}>
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ecfdf3] text-[#087a36]">
                              <FolderKanban aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                            </span>
                            <span className="font-semibold text-[#0f172a] group-hover:text-[#087a36]">
                              {project.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-[#64748b]">{project.client}</td>
                        <td className="px-5 py-4 text-[#64748b]">{project.location}</td>
                        <td className="px-5 py-4 text-[#64748b]">{project.workType}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-[#64748b]">{project.createdAt}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#087a36]">
                            {project.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#087a36] transition hover:bg-[#ecfdf3]"
                            href={`/projects/${project.id}`}
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              action={
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white"
                  href="/projects/new"
                >
                  <Plus aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
                  New Project
                </Link>
              }
              description="Projects are stored in Supabase and scoped to your logged-in account."
              title="No projects yet"
            />
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
