"use client";

import { AlertTriangle } from "lucide-react";

import { SourceRowSelector } from "@/components/manual-review/source-row-selector";
import type { ClassificationValue, ProductGroup } from "@/components/manual-review/types";

export function SelectedProductGroup({
  group,
  localClassifications,
  onClearSelection,
  onSelectAll,
  onSelectHighConfidence,
  onToggleRow,
  selectedRowIds,
}: {
  group: ProductGroup | null;
  localClassifications: Record<string, ClassificationValue>;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onSelectHighConfidence: () => void;
  onToggleRow: (rowId: string) => void;
  selectedRowIds: string[];
}) {
  if (!group) {
    return (
      <section className="rounded-[20px] border border-dashed border-[#d1d5db] bg-white p-10 text-center">
        <p className="text-lg font-semibold text-[#0f172a]">No product group selected</p>
        <p className="mt-2 text-sm text-slate-500">Choose a group to review its source rows and classification.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selected Product Group</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#0f172a]">{group.name}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {group.rows.length} source rows · {group.system} / {group.category}
            {group.subcategory ? ` / ${group.subcategory}` : ""}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-slate-600">
          {Math.round(group.averageConfidence * 100)}% confidence
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-[#f8fafc] p-4">
        <p className="text-sm font-semibold text-[#0f172a]">Why grouped?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {group.whyGrouped.map((reason) => (
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600" key={reason}>
              {reason}
            </span>
          ))}
        </div>
        {group.status === "Low Confidence" || group.status === "Needs Review" ? (
          <div className="mt-4 flex gap-2 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Review carefully. Some items may represent different products.
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0f172a]">{selectedRowIds.length} selected</p>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm font-semibold text-slate-600" onClick={onSelectAll} type="button">
            Select all
          </button>
          <button className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm font-semibold text-slate-600" onClick={onSelectHighConfidence} type="button">
            Select high confidence only
          </button>
          <button className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm font-semibold text-slate-600" onClick={onClearSelection} type="button">
            Clear selection
          </button>
        </div>
      </div>

      <div className="mt-4">
        <SourceRowSelector
          localClassifications={localClassifications}
          onToggleRow={onToggleRow}
          rows={group.rows}
          selectedRowIds={selectedRowIds}
        />
      </div>
    </section>
  );
}
