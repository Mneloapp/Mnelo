"use client";

import type { ProcurementDecision } from "@/components/decision-center/types";

export function PreviewApprovalDialog({
  decision,
  onCancel,
  onConfirm,
  selectedCount,
}: {
  decision: ProcurementDecision;
  onCancel: () => void;
  onConfirm: () => void;
  selectedCount: number;
}) {
  const warningCount = decision.affectedItems.filter((item) => item.warning).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-7 shadow-[0_34px_100px_rgba(15,23,42,0.24)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Approval Preview</p>
        <h2 className="mt-3 text-2xl font-semibold text-[#0f172a]">You are about to approve this decision.</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <PreviewMetric label="Items" value={selectedCount.toString()} />
          <PreviewMetric label="Requirement group" value={decision.affectedRequirements.toString()} />
          <PreviewMetric label="Package readiness" value="1 status" />
        </div>
        <div className="mt-5 rounded-[20px] bg-[#f8fafc] p-4">
          <p className="text-sm font-semibold text-[#0f172a]">Changes</p>
          <p className="mt-2 text-sm text-slate-600">
            Current classification → {decision.suggestion.system} / {decision.suggestion.category} /{" "}
            {decision.suggestion.subcategory}
          </p>
        </div>
        {warningCount > 0 ? (
          <div className="mt-4 rounded-[20px] border border-[#fde68a] bg-[#fffbeb] p-4 text-sm font-semibold text-[#92400e]">
            {warningCount} items have product-family or technical-marker warnings.
          </div>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button className="rounded-[14px] border border-[#d1d5db] px-4 py-2.5 text-sm font-semibold text-slate-600" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="rounded-[14px] border border-[#d1d5db] px-4 py-2.5 text-sm font-semibold text-slate-600" onClick={onCancel} type="button">
            Go Back
          </button>
          <button className="rounded-[14px] bg-[#16a34a] px-4 py-2.5 text-sm font-semibold text-white" onClick={onConfirm} type="button">
            Confirm Approval
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#0f172a]">{value}</p>
    </div>
  );
}
