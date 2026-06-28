"use client";

import type { ProductGroup } from "@/components/manual-review/types";

export function ProductGroupCard({
  group,
  isActive,
  onSelect,
}: {
  group: ProductGroup;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={
        isActive
          ? "w-full rounded-2xl border border-[#86efac] bg-[#f0fdf4] p-4 text-left shadow-[0_14px_30px_rgba(34,197,94,0.08)]"
          : "w-full rounded-2xl border border-[#e5e7eb] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#bbf7d0] hover:bg-[#fbfefc]"
      }
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="line-clamp-2 text-sm font-semibold text-[#0f172a]">{group.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {group.rows.length} rows · {group.system}
          </p>
        </div>
        <span className={getStatusClassName(group.status)}>{group.status}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-2.5 py-1">{group.category}</span>
        {group.subcategory ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{group.subcategory}</span> : null}
        <span className="rounded-full bg-slate-100 px-2.5 py-1">{Math.round(group.averageConfidence * 100)}%</span>
      </div>
    </button>
  );
}

function getStatusClassName(status: ProductGroup["status"]) {
  if (status === "Ready") return "rounded-full bg-[#dcfce7] px-2.5 py-1 text-xs font-semibold text-[#15803d]";
  if (status === "Learned") return "rounded-full bg-[#ede9fe] px-2.5 py-1 text-xs font-semibold text-[#6d28d9]";
  if (status === "Low Confidence") return "rounded-full bg-[#fef3c7] px-2.5 py-1 text-xs font-semibold text-[#b45309]";
  return "rounded-full bg-[#fff7ed] px-2.5 py-1 text-xs font-semibold text-[#c2410c]";
}
