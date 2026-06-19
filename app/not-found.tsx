import { Button, Shell } from "@/components/ui";

export default function NotFound() {
  return (
    <Shell>
      <div className="grid min-h-[80vh] place-items-center">
        <section className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-soft">
          <p className="text-sm font-semibold text-leaf-700">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Project not found</h1>
          <p className="mt-3 text-sm leading-6 text-ink/58">
            The project may have been archived or moved to another workspace.
          </p>
          <div className="mt-6">
            <Button href="/projects">Back to projects</Button>
          </div>
        </section>
      </div>
    </Shell>
  );
}
