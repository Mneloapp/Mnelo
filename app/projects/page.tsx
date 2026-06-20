import { AppNav } from "@/components/app-nav";
import { Badge, Button, Shell } from "@/components/ui";
import { ProjectCard } from "@/components/project-card";
import { getProjectsForCurrentUser } from "@/lib/data";

export default async function ProjectsPage() {
  const projectResult = await getProjectsForCurrentUser();
  const { projects, errorMessage } = projectResult;
  const showProjectError = process.env.NODE_ENV === "development" && errorMessage;

  return (
    <Shell>
      <AppNav />
      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">Projects</h1>
        <Button href="/projects/new">Create Project</Button>
      </section>

      <section>
        {projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center shadow-sm">
            <Badge tone="neutral">No projects yet</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Create your first MEP estimate</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-ink/58">
              Projects you create are stored in Supabase and scoped to your logged-in user account.
            </p>
            {showProjectError ? (
              <p className="mx-auto mt-4 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-6">
              <Button href="/projects/new">Create Project</Button>
            </div>
          </div>
        )}
      </section>
    </Shell>
  );
}
