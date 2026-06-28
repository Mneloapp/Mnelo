"use client";

import { Sparkles } from "lucide-react";

import { DecisionProgress } from "@/components/decision-center/decision-progress";

export function DecisionSummaryHeader({
  aiStatus,
  decisionsLeft,
  projectName,
}: {
  aiStatus: number;
  decisionsLeft: number;
  projectName: string;
}) {
  return (
    <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f3ff] px-3 py-1.5 text-sm font-semibold text-[#6d28d9]">
            <Sparkles className="h-4 w-4" />
            AI Status: {aiStatus}% Complete
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Project</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.02em] text-[#0f172a]">{projectName}</h1>
          <p className="mt-4 max-w-2xl text-xl leading-8 text-slate-600">
            Only {decisionsLeft} decisions require your attention before RFQ generation.
          </p>
        </div>
        <div className="rounded-[24px] bg-[#f8fafc] p-5">
          <p className="text-sm font-semibold text-[#0f172a]">What AI already completed</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Parsed project source rows</li>
            <li>Prepared procurement decision drafts</li>
            <li>Separated approvals from background work</li>
          </ul>
        </div>
      </div>
      <div className="mt-8">
        <DecisionProgress />
      </div>
    </section>
  );
}
