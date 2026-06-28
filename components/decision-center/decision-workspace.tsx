"use client";

import { useEffect, useState } from "react";

import { AffectedItemsList } from "@/components/decision-center/affected-items-list";
import { ConfidenceBadge } from "@/components/decision-center/confidence-badge";
import { DecisionExplanation } from "@/components/decision-center/decision-explanation";
import { DecisionStatusBadge } from "@/components/decision-center/decision-status-badge";
import { ImpactSummary } from "@/components/decision-center/impact-summary";
import { PreviewApprovalDialog } from "@/components/decision-center/preview-approval-dialog";
import type { ProcurementDecision } from "@/components/decision-center/types";
import { UndoToast } from "@/components/decision-center/undo-toast";

export function DecisionWorkspace({ decision }: { decision: ProcurementDecision }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);
  const isClassification = decision.type === "Classification Decision";

  useEffect(() => {
    setSelectedIds([]);
    setShowPreview(false);
    setApprovedCount(null);
  }, [decision.id]);

  function confirmApproval() {
    setApprovedCount(selectedIds.length);
    setShowPreview(false);
  }

  return (
    <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Decision Workspace</p>
          <h2 className="mt-3 text-3xl font-semibold text-[#0f172a]">{decision.title}</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{decision.whyAttention}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DecisionStatusBadge status={decision.status} />
          <ConfidenceBadge confidence={decision.confidence} />
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <DecisionExplanation decision={decision} />
          <ImpactSummary decision={decision} />

          {isClassification ? (
            <AffectedItemsList items={decision.affectedItems} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
          ) : (
            <PlaceholderDecisionBody decision={decision} />
          )}
        </div>

        <aside className="rounded-[22px] border border-[#e5e7eb] bg-[#fbfefc] p-5">
          <p className="text-sm font-semibold text-[#0f172a]">Suggested decision</p>
          <div className="mt-4 space-y-3 text-sm">
            <Field label="System" value={decision.suggestion.system} />
            <Field label="Category" value={decision.suggestion.category} />
            <Field label="Subcategory" value={decision.suggestion.subcategory} />
          </div>
          <div className="mt-6 space-y-3">
            <button
              className="w-full rounded-[14px] bg-[#16a34a] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              disabled={isClassification && selectedIds.length === 0}
              onClick={() => (isClassification ? setShowPreview(true) : setApprovedCount(1))}
              type="button"
            >
              Approve
            </button>
            <button className="w-full rounded-[14px] border border-[#d1d5db] px-4 py-3 text-sm font-semibold text-slate-600" type="button">
              Change
            </button>
            <button className="w-full rounded-[14px] border border-[#fde68a] px-4 py-3 text-sm font-semibold text-[#b45309]" type="button">
              Skip / Needs Review
            </button>
          </div>
        </aside>
      </div>

      {showPreview ? (
        <PreviewApprovalDialog
          decision={decision}
          onCancel={() => setShowPreview(false)}
          onConfirm={confirmApproval}
          selectedCount={selectedIds.length}
        />
      ) : null}

      {approvedCount !== null ? (
        <UndoToast count={approvedCount} onClose={() => setApprovedCount(null)} onUndo={() => setApprovedCount(null)} />
      ) : null}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-[#0f172a]">{value}</p>
    </div>
  );
}

function PlaceholderDecisionBody({ decision }: { decision: ProcurementDecision }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#d1d5db] bg-white p-8">
      <p className="text-lg font-semibold text-[#0f172a]">{decision.type} workspace</p>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        This focused workspace will use the same approval pattern: summary, explanation, affected requirements, preview, and approval.
      </p>
    </div>
  );
}
