"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AffectedItemCard } from "@/components/decision-center/affected-item-card";
import type { DecisionItem } from "@/components/decision-center/types";

export function AffectedItemsList({
  items,
  selectedIds,
  setSelectedIds,
}: {
  items: DecisionItem[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleItems = items.filter((item) => item.description.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  function toggleItem(itemId: string) {
    setSelectedIds(selected.has(itemId) ? selectedIds.filter((id) => id !== itemId) : [...selectedIds, itemId]);
  }

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h3 className="text-lg font-semibold text-[#0f172a]">Affected items</h3>
          <p className="mt-1 text-sm text-slate-500">Nothing is applied until you preview and confirm approval.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-[14px] border border-[#d1d5db] px-3 py-2 text-sm font-semibold text-slate-600"
            onClick={() => setSelectedIds(visibleItems.map((item) => item.id))}
            type="button"
          >
            Select all
          </button>
          <button
            className="rounded-[14px] border border-[#d1d5db] px-3 py-2 text-sm font-semibold text-slate-600"
            onClick={() => setSelectedIds([])}
            type="button"
          >
            Clear selection
          </button>
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-sm text-slate-500">
        <Search className="h-4 w-4" />
        <input
          className="w-full bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-slate-400"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search affected items..."
          value={search}
        />
      </label>
      <div className="mt-4 space-y-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <AffectedItemCard isSelected={selected.has(item.id)} item={item} key={item.id} onToggle={() => toggleItem(item.id)} />
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#d1d5db] p-8 text-center text-sm text-slate-500">
            No affected items match your search.
          </div>
        )}
      </div>
    </section>
  );
}
