"use client";

import { Sparkles } from "lucide-react";

import type { ProcurementDecision } from "@/components/decision-center/types";

export function DecisionExplanation({ decision }: { decision: ProcurementDecision }) {
  return (
    <section className="rounded-[22px] bg-[#f8fafc] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
        <Sparkles className="h-4 w-4" />
        AI explanation
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{decision.explanation}</p>
      {decision.warning ? (
        <div className="mt-4 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
          {decision.warning}
        </div>
      ) : null}
    </section>
  );
}
