import { AppNav } from "@/components/app-nav";
import { Badge, Shell } from "@/components/ui";
import { ProjectCard } from "@/components/project-card";
import { createProject } from "@/app/projects/actions";
import { getProjectsForCurrentUser } from "@/lib/data";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, projectResult] = await Promise.all([searchParams, getProjectsForCurrentUser()]);
  const { projects, errorMessage } = projectResult;
  const showProjectError = process.env.NODE_ENV === "development" && errorMessage;

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
        <a
          className="inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-leaf-900"
          href="#create-project"
        >
          Create Project
        </a>
      </section>

      <section id="create-project" className="mb-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Create a project</h2>
          <p className="mt-1 text-sm text-ink/55">Save a new MEP estimate to your Supabase workspace.</p>
        </div>

        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form action={createProject} className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Project name</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="name"
              placeholder="Downtown Medical Center"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Client</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="client"
              placeholder="Helio Health Group"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Location</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="location"
              placeholder="Austin, TX"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Work type</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="work_type"
              placeholder="MEP estimate"
            />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-ink/70">Notes</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="notes"
              placeholder="Optional project context, scope notes, or procurement instructions"
            />
          </label>
          <div className="flex items-end lg:col-span-2">
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-leaf-900 sm:w-auto"
              type="submit"
            >
              Create Project
            </button>
          </div>
        </form>
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
            <a
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-leaf-900"
              href="#create-project"
            >
              Create Project
            </a>
          </div>
        )}
      </section>
    </Shell>
  );
}
