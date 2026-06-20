import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getDashboardForCurrentUser } from "@/lib/data";

function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ecfdf3] text-sm font-black text-[#16a34a]">
          {label.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#07130f]">{value}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const { projects, recentActivity, summary, errorMessage } = await getDashboardForCurrentUser();
  const showError = process.env.NODE_ENV === "development" && errorMessage;

  return (
    <WorkspaceShell active="Projects">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#07130f]">Good morning</h1>
            <p className="mt-2 text-sm text-slate-500">Here&apos;s what&apos;s happening with your projects today.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <input
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 pl-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7] sm:w-80"
                placeholder="Search projects, files, BOQ..."
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                /
              </span>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-[#087a36]"
              href="/projects/new"
            >
              + New Project
            </Link>
          </div>
        </header>

        {showError ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-mono text-xs text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard detail="Loaded from Supabase" label="Total Projects" value={String(summary.totalProjects)} />
          <MetricCard detail="Parsed line items" label="BOQ Items" value={summary.boqItems.toLocaleString()} />
          <MetricCard detail="Uploaded documents" label="Files" value={String(summary.files)} />
          <MetricCard detail="Across project documents" label="Storage Used" value={summary.storageUsed} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-4 border-b border-[#e5e7eb] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">All Projects</h2>
                <p className="mt-1 text-sm text-slate-500">Real project, file, and BOQ activity from your workspace.</p>
              </div>
              <Link className="text-sm font-semibold text-[#087a36]" href="/projects/new">
                Create project
              </Link>
            </div>

            {projects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.12em] text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Project</th>
                      <th className="px-5 py-4 text-right font-semibold">BOQ Items</th>
                      <th className="px-5 py-4 text-right font-semibold">Files</th>
                      <th className="px-5 py-4 font-semibold">Updated</th>
                      <th className="px-5 py-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0ed]">
                    {projects.map((project) => (
                      <tr className="transition hover:bg-[#f8faf8]" key={project.id}>
                        <td className="px-5 py-4">
                          <Link href={`/projects/${project.id}`} className="group flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ecfdf3] text-sm font-bold text-[#087a36]">
                              {project.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span>
                              <span className="block font-semibold text-[#07130f] group-hover:text-[#087a36]">
                                {project.name}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                {project.client} / {project.location} / {project.workType}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {project.boqItemCount.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">{project.fileCount}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">{project.updatedAt}</td>
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
            ) : (
              <div className="px-5 py-14 text-center">
                <p className="text-lg font-semibold text-[#07130f]">No projects yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Create your first project to upload files, parse BOQs, and track estimation work.
                </p>
                <Link
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white"
                  href="/projects/new"
                >
                  + New Project
                </Link>
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <div className="mt-5 space-y-4">
                {recentActivity.map((activity) => (
                  <Link
                    className="flex gap-3 rounded-xl p-2 transition hover:bg-[#f8faf8]"
                    href={`/projects/${activity.projectId}`}
                    key={activity.id}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] text-xs font-bold text-[#16a34a]">
                      F
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#07130f]">{activity.fileName}</span>
                      <span className="mt-1 block text-xs text-slate-500">{activity.projectName}</span>
                    </span>
                    <span className="whitespace-nowrap text-xs text-slate-400">{activity.uploadedAt}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#e5e7eb] bg-[#f8faf8] p-6 text-center">
                <p className="text-sm font-medium text-slate-600">No recent activity yet.</p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </WorkspaceShell>
  );
}
