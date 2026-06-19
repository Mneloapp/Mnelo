import { notFound } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { Badge, Button, Shell, StatCard } from "@/components/ui";
import { BoqResultsTable } from "@/components/boq-results-table";
import { getProjectForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectForCurrentUser(id);

  if (!project) {
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
        <StatCard label="Contract value" value={project.value} detail={`${project.trade} package`} />
        <StatCard label="Drawings" value={String(project.drawings)} detail="Parsed and indexed" />
        <StatCard label="Readiness" value={`${project.progress}%`} detail="Estimator approved" />
        <StatCard label="Risk" value={project.risk} detail="Based on scope deltas" />
      </section>

      <section className="my-6 grid gap-6 lg:grid-cols-[0.8fr_1fr]">
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-ink">AI workforce</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Takeoff agent", "Extracted mechanical and plumbing quantities from latest drawing set."],
              ["Scope agent", "Matched specification sections against BOQ coverage."],
              ["Procurement agent", "Mapped preferred suppliers and alternates for long-lead items."],
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

      <div id="boq">
        <BoqResultsTable items={project.boq} />
      </div>
    </Shell>
  );
}
