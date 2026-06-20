import { createProject } from "@/app/projects/actions";
import { AppNav } from "@/components/app-nav";
import { Button, Shell } from "@/components/ui";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Shell>
      <AppNav />
      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-ink/55">New project</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">Create Project</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">
            Capture the basic project intake details. Mnelo will generate estimate and procurement fields later.
          </p>
        </div>
        <Button href="/projects" variant="secondary">
          Back to projects
        </Button>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
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
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Location</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="location"
              placeholder="Austin, TX"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink/70">Work type</span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="work_type"
              placeholder="MEP estimate"
              required
            />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-ink/70">Notes</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
              name="notes"
              placeholder="Project context, scope notes, or procurement instructions"
              required
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-leaf-900"
              type="submit"
            >
              Create Project
            </button>
            <Button href="/projects" variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      </section>
    </Shell>
  );
}
