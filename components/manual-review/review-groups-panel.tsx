"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { ProductGroupCard } from "@/components/manual-review/product-group-card";
import type { ManualReviewStatus, ProductGroup } from "@/components/manual-review/types";

const statusFilters: Array<ManualReviewStatus | "All"> = ["All", "Needs Review", "Low Confidence", "Learned"];

export function ReviewGroupsPanel({
  activeGroupId,
  groups,
  onSelectGroup,
}: {
  activeGroupId: string | null;
  groups: ProductGroup[];
  onSelectGroup: (groupId: string) => void;
}) {
  const systems = Array.from(new Set(groups.map((group) => group.system))).sort();
  const [status, setStatus] = useState<ManualReviewStatus | "All">("All");
  const [system, setSystem] = useState("All");
  const [search, setSearch] = useState("");

  const visibleGroups = groups.filter((group) => {
    const matchesStatus = status === "All" || group.status === status;
    const matchesSystem = system === "All" || group.system === system;
    const matchesSearch = [group.name, group.system, group.category, group.subcategory || ""]
      .join(" ")
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase());
    return matchesStatus && matchesSystem && matchesSearch;
  });

  return (
    <aside className="rounded-[20px] border border-[#e5e7eb] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Review Groups</p>
        <h2 className="mt-2 text-xl font-semibold text-[#0f172a]">Product groups</h2>
      </div>

      <label className="mt-5 flex items-center gap-2 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-sm text-slate-500">
        <Search className="h-4 w-4" />
        <input
          className="w-full bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-slate-400"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search groups..."
          value={search}
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            className={
              status === filter
                ? "rounded-full bg-[#dcfce7] px-3 py-1.5 text-xs font-semibold text-[#15803d]"
                : "rounded-full bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            }
            key={filter}
            onClick={() => setStatus(filter)}
            type="button"
          >
            {filter}
          </button>
        ))}
      </div>

      <select
        className="mt-3 w-full rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#0f172a] outline-none"
        onChange={(event) => setSystem(event.target.value)}
        value={system}
      >
        <option value="All">All systems</option>
        {systems.map((candidate) => (
          <option key={candidate} value={candidate}>
            {candidate}
          </option>
        ))}
      </select>

      <div className="mt-4 space-y-3">
        {visibleGroups.length > 0 ? (
          visibleGroups.map((group) => (
            <ProductGroupCard
              group={group}
              isActive={group.id === activeGroupId}
              key={group.id}
              onSelect={() => onSelectGroup(group.id)}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d1d5db] p-5 text-center text-sm text-slate-500">
            No groups match these filters.
          </div>
        )}
      </div>
    </aside>
  );
}
