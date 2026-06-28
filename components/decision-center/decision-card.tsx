"use client";

import { ArrowRight } from "lucide-react";

import { ConfidenceBadge } from "@/components/decision-center/confidence-badge";
import { DecisionStatusBadge } from "@/components/decision-center/decision-status-badge";
import type { ProcurementDecision } from "@/components/decision-center/types";

export function DecisionCard({
  decision,
  isActive,
  onOpen,
}: {
  decision: ProcurementDecision;
  isActive: boolean;
  onOpen: () => void;
}) {
  return (
    <article
      className={
        isActive
          ? "rounded-[24px] border border-[#86efac] bg-[#f0fdf4] p-6 shadow-[0_24px_60px_rgba(34,197,94,0.10)]"
          : "rounded-[24px] border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#bbf7d0]"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{decision.type}</p>
          <h2 className="mt-3 text-xl font-semibold text-[#0f172a]">{decision.title}</h2>
        </div>
        <DecisionStatusBadge status={decision.status} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <ConfidenceBadge confidence={decision.confidence} />
        <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-600">{decision.impact}</span>
      </div>

      <div className="mt-5 space-y-4 text-sm leading-6">
        <div>
          <p className="font-semibold text-[#0f172a]">Why attention is needed</p>
          <p className="mt-1 text-slate-600">{decision.whyAttention}</p>
        </div>
        <div>
          <p className="font-semibold text-[#0f172a]">If approved</p>
          <p className="mt-1 text-slate-600">{decision.approvedOutcome}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-[14px] bg-[#16a34a] px-4 py-2.5 text-sm font-semibold text-white"
          onClick={onOpen}
          type="button"
        >
          {decision.primaryAction}
          <ArrowRight className="h-4 w-4" />
        </button>
        <button className="rounded-[14px] border border-[#d1d5db] px-4 py-2.5 text-sm font-semibold text-slate-600" type="button">
          Skip
        </button>
        <button className="rounded-[14px] border border-[#fde68a] px-4 py-2.5 text-sm font-semibold text-[#b45309]" type="button">
          Mark Needs Review
        </button>
      </div>
    </article>
  );
}
