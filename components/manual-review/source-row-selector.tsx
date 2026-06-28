"use client";

import type { BoqItem } from "@/lib/data";
import type { ClassificationValue } from "@/components/manual-review/types";

export function SourceRowSelector({
  localClassifications,
  onToggleRow,
  rows,
  selectedRowIds,
}: {
  localClassifications: Record<string, ClassificationValue>;
  onToggleRow: (rowId: string) => void;
  rows: BoqItem[];
  selectedRowIds: string[];
}) {
  const selected = new Set(selectedRowIds);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e7eb]">
      <div className="grid grid-cols-[44px_1fr_120px] gap-4 bg-[#f8fafc] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        <span />
        <span>Source row</span>
        <span>Qty</span>
      </div>
      <div className="divide-y divide-[#eef2f7]">
        {rows.map((row) => {
          const classification = localClassifications[row.id] || {
            category: row.subcategory,
            subcategory: row.classificationSubcategory,
            system: row.category,
          };

          return (
            <label
              className="grid cursor-pointer grid-cols-[44px_1fr_120px] gap-4 px-4 py-4 transition hover:bg-[#fbfefc]"
              key={row.id}
            >
              <input
                checked={selected.has(row.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#16a34a] focus:ring-[#16a34a]"
                onChange={() => onToggleRow(row.id)}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-medium text-[#0f172a]">{row.description}</span>
                <span className="mt-2 block text-xs text-slate-500">
                  Sheet: {row.sourceSheetName || row.sheetName || "Unknown"} · Row: {row.sourceRowNumber || row.rowNumber}
                </span>
                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {classification.system} / {classification.category || "Unclassified"} /{" "}
                  {classification.subcategory || "Unclassified"}
                </span>
              </span>
              <span className="text-sm font-semibold text-slate-600">
                {row.quantity ?? "—"} {row.unit || ""}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
