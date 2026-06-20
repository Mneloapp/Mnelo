import Link from "next/link";
import { Project } from "@/lib/data";
import { Badge } from "@/components/ui";

const statusTone = {
  Draft: "neutral",
  Estimating: "amber",
  Procurement: "green",
  Awarded: "neutral",
} as const;

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-ink group-hover:text-leaf-700">
            {project.name}
          </h3>
          <p className="mt-1 text-sm text-ink/55">{project.client}</p>
        </div>
        <Badge tone={statusTone[project.status]}>{project.status}</Badge>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-ink/45">Location</p>
          <p className="mt-1 font-semibold text-ink">{project.location}</p>
        </div>
        <div>
          <p className="text-ink/45">Work type</p>
          <p className="mt-1 font-semibold text-ink">{project.workType}</p>
        </div>
        <div>
          <p className="text-ink/45">Created</p>
          <p className="mt-1 font-semibold text-ink">{project.createdAt}</p>
        </div>
        <div>
          <p className="text-ink/45">Status</p>
          <p className="mt-1 font-semibold text-ink">{project.status}</p>
        </div>
      </div>
    </Link>
  );
}
