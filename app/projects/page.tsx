import { AppNav } from "@/components/app-nav";
import { Badge, Button, Shell } from "@/components/ui";
import { ProjectCard } from "@/components/project-card";
import { projects } from "@/lib/data";

export default function ProjectsPage() {
  return (
    <Shell>
      <AppNav />
      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <Badge tone="neutral">Projects</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">Active MEP estimates</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">
            Track every estimate from drawing intake through BOQ approval and procurement handoff.
          </p>
        </div>
        <Button href="/projects/downtown-medical-center">Open sample project</Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </section>
    </Shell>
  );
}
