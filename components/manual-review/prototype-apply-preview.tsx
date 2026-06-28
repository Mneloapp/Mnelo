"use client";

import type { ClassificationValue } from "@/components/manual-review/types";

export function PrototypeApplyPreview({
  classification,
  onApply,
  onCancel,
  selectedCount,
}: {
  classification: ClassificationValue;
  onApply: () => void;
  onCancel: () => void;
  selectedCount: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Prototype Preview</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#0f172a]">You are about to update {selectedCount} selected rows</h2>
        <div className="mt-5 rounded-2xl bg-[#f8fafc] p-4">
          <p className="text-sm font-semibold text-slate-500">To</p>
          <p className="mt-2 text-base font-semibold text-[#0f172a]">
            {classification.system} / {classification.category || "Unclassified"} /{" "}
            {classification.subcategory || "Unclassified"}
          </p>
        </div>
        <p className="mt-4 text-sm text-slate-500">This prototype only updates local UI state. It will not write to Supabase.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-[14px] border border-[#d1d5db] px-4 py-2 text-sm font-semibold text-slate-600" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="rounded-[14px] bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white" onClick={onApply} type="button">
            Apply Prototype Change
          </button>
        </div>
      </div>
    </div>
  );
}
