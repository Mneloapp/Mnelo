"use client";

import type { DecisionStatus } from "@/components/decision-center/types";

export function DecisionStatusBadge({ status }: { status: DecisionStatus }) {
  const className =
    status === "Approved"
      ? "bg-[#dcfce7] text-[#15803d]"
      : status === "Skipped"
        ? "bg-slate-100 text-slate-500"
        : status === "Needs review"
          ? "bg-[#fff7ed] text-[#c2410c]"
          : "bg-[#fef3c7] text-[#b45309]";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}
