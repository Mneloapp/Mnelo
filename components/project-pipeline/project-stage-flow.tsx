"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { usePathname } from "next/navigation";

const stages = [
  { label: "Upload", segment: "documents" },
  { label: "Extract", segment: "documents" },
  { label: "Review", segment: "intelligence" },
  { disabled: true, label: "Packages", segment: "packages" },
  { disabled: true, label: "RFQ", segment: "rfq" },
  { disabled: true, label: "Quotes", segment: "quotes" },
  { disabled: true, label: "Procurement", segment: "procurement" },
];

export function ProjectStageFlow({ completedStages = 0, projectId }: { completedStages?: number; projectId: string }) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;
  const activeStageIndex = getActiveStageIndex({ basePath, completedStages, pathname });

  return (
    <nav className="mt-8 rounded-[24px] border border-[#e5e7eb] bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <div className="grid gap-2 md:grid-cols-7">
        {stages.map((stage, index) => {
          const href = `${basePath}/${stage.segment}`;
          const isActive = index === activeStageIndex;
          const isCompleted = index < completedStages;

          if (stage.disabled) {
            return (
              <span
                className="flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-300"
                key={stage.label}
              >
                {stage.label}
              </span>
            );
          }

          return (
            <Link
              className={
                isActive
                  ? "flex items-center justify-center gap-2 rounded-2xl bg-[#ecfdf3] px-3 py-3 text-sm font-semibold text-[#15803d]"
                  : "flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
              }
              href={href}
              key={stage.label}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : null}
              {stage.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function getActiveStageIndex({
  basePath,
  completedStages,
  pathname,
}: {
  basePath: string;
  completedStages: number;
  pathname: string;
}) {
  if (pathname === basePath) return Math.min(completedStages, 3);
  if (pathname.endsWith("/documents")) return completedStages > 1 ? 1 : 0;
  if (pathname.endsWith("/intelligence") || pathname.endsWith("/boq") || pathname.endsWith("/requirements")) return 2;
  return Math.min(completedStages, 3);
}
