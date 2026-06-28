"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const workspaceRoutes = [
  { label: "Overview", segment: "" },
  { label: "Requirements", segment: "requirements" },
  { label: "Manual Review", segment: "manual-review" },
  { disabled: true, label: "Packages", segment: "packages" },
  { disabled: true, label: "RFQs", segment: "rfqs" },
  { disabled: true, label: "Quotes", segment: "quotes" },
  { disabled: true, label: "Procurement", segment: "procurement" },
  { label: "Knowledge", segment: "knowledge" },
  { label: "Activity", segment: "activity" },
];

export function ProjectWorkspaceNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  return (
    <nav className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      {workspaceRoutes.map((route) => {
        const href = route.segment ? `${basePath}/${route.segment}` : basePath;
        const isActive = pathname === href;

        if (route.disabled) {
          return (
            <span
              className="cursor-not-allowed rounded-xl px-4 py-2 text-sm font-semibold text-slate-300"
              key={route.label}
              title="Coming soon"
            >
              {route.label}
            </span>
          );
        }

        return (
          <Link
            className={
              isActive
                ? "rounded-xl bg-[#ecfdf3] px-4 py-2 text-sm font-semibold text-[#087a36]"
                : "rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-[#f8faf8] hover:text-[#07130f]"
            }
            href={href}
            key={route.label}
          >
            {route.label}
          </Link>
        );
      })}
    </nav>
  );
}
