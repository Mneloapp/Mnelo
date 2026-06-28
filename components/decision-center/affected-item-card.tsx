"use client";

import type { DecisionItem } from "@/components/decision-center/types";

export function AffectedItemCard({
  isSelected,
  item,
  onToggle,
}: {
  isSelected: boolean;
  item: DecisionItem;
  onToggle: () => void;
}) {
  return (
    <label
      className={
        isSelected
          ? "block rounded-[20px] border border-[#86efac] bg-[#f0fdf4] p-4"
          : "block rounded-[20px] border border-[#e5e7eb] bg-white p-4 transition hover:bg-[#fbfefc]"
      }
    >
      <div className="flex gap-4">
        <input
          checked={isSelected}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#16a34a] focus:ring-[#16a34a]"
          onChange={onToggle}
          type="checkbox"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-6 text-[#0f172a]">{item.description}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">{item.quantity}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ClassificationBlock label="Current" value={item.currentClassification} />
            <ClassificationBlock label="Suggested" value={item.suggestedClassification} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-600">
              {item.confidence}% confidence
            </span>
            <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-600">
              {item.matchReason}
            </span>
          </div>
          {item.warning ? (
            <p className="mt-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs font-semibold text-[#92400e]">
              {item.warning}
            </p>
          ) : null}
        </div>
      </div>
    </label>
  );
}

function ClassificationBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0f172a]">{value}</p>
    </div>
  );
}
