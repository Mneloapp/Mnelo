import Link from "next/link";
import { Brain, FileText, Plus, Settings } from "lucide-react";
import { ProjectStageFlow } from "@/components/project-pipeline/project-stage-flow";
import type { Project } from "@/lib/data";

export function ProjectWorkspaceHeader({ completedStages = 0, project }: { completedStages?: number; project: Project }) {
  return (
    <>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link className="text-sm font-semibold text-[#087a36]" href="/dashboard">
            Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#07130f]">{project.name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {project.client} / {project.location} / {project.workType}
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-[#087a36]"
          href="/projects/new"
        >
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
          New Project
        </Link>
      </header>

      <ProjectStageFlow completedStages={completedStages} projectId={project.id} />
    </>
  );
}

export function ProjectWorkspacePage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>;
}

export function ProjectWorkspacePanel({
  children,
  description,
  eyebrow = "Project Workspace",
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="mt-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#16a34a]">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#07130f]">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function OverviewCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#07130f]">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

export function WorkspacePlaceholder({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof Brain | typeof FileText | typeof Settings;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#fbfdfb] p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ecfdf3] text-[#16a34a]">
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#07130f]">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function ProjectUnavailableState({ errorMessage }: { errorMessage?: string | null }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <section className="rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Project unavailable</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#07130f]">We could not load this project.</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
          The projects table may not be set up yet. Create the table in Supabase, then refresh this page.
        </p>
        {process.env.NODE_ENV === "development" && errorMessage ? (
          <p className="mx-auto mt-5 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6">
          <Link className="font-semibold text-[#087a36]" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
