import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { Badge, Button, Shell, StatCard } from "@/components/ui";
import { ProjectCard } from "@/components/project-card";
import { formatCurrency, getProjectsForCurrentUser } from "@/lib/data";

export default async function DashboardPage() {
  const projects = await getProjectsForCurrentUser();
  const pipelineValue = projects.reduce((total, project) => total + project.contractValue, 0);
  const drawingsProcessed = projects.reduce((total, project) => total + project.drawings, 0);
  const averageReadiness =
    projects.length > 0
      ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
      : 0;

  return (
    <Shell>
      <AppNav />
      <section className="mb-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge>Command center</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">MEP estimation workspace</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">
              Monitor AI extraction, estimator review, procurement readiness, and project risk from one
              operational dashboard.
            </p>
          </div>
          <div className="rounded-xl bg-leaf-50 px-4 py-3 text-sm font-medium text-leaf-800 ring-1 ring-leaf-200">
            12 AI agents active
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Pipeline value"
          value={formatCurrency(pipelineValue)}
          detail={`${projects.length} active project${projects.length === 1 ? "" : "s"}`}
        />
        <StatCard label="Drawings processed" value={String(drawingsProcessed)} detail="Loaded from Supabase" />
        <StatCard label="Avg readiness" value={`${averageReadiness}%`} detail="Across your projects" />
        <StatCard
          label="Supplier packs"
          value={String(projects.filter((project) => project.status === "Procurement").length)}
          detail="Ready for procurement"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Priority projects</h2>
            <Link className="text-sm font-medium text-leaf-700" href="/projects">
              View all
            </Link>
          </div>
          <div className="grid gap-4">
            {projects.length > 0 ? (
              projects.slice(0, 2).map((project) => <ProjectCard key={project.id} project={project} />)
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center shadow-sm">
                <Badge tone="neutral">No projects yet</Badge>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink">Start your first estimate</h3>
                <p className="mt-2 text-sm leading-6 text-ink/58">
                  Create a project to begin building your user-scoped Supabase pipeline.
                </p>
                <div className="mt-5">
                  <Button href="/projects#create-project">Create Project</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Agent activity</h2>
          <div className="mt-4 space-y-4">
            {[
              ["Scope validator", "Flagged 6 low-confidence fire protection items", "4 min ago"],
              ["Quantity extractor", "Completed HVAC takeoff for Level 08", "18 min ago"],
              ["Procurement drafter", "Prepared supplier pack for electrical feeders", "42 min ago"],
              ["Cost analyst", "Compared unit rates against historical projects", "1 hr ago"],
            ].map(([agent, activity, time]) => (
              <div key={agent} className="rounded-lg border border-line bg-mist/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{agent}</p>
                  <span className="text-xs text-ink/40">{time}</span>
                </div>
                <p className="mt-1 text-sm text-ink/58">{activity}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}
