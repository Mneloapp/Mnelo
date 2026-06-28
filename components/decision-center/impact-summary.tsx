"use client";

import type { ProcurementDecision } from "@/components/decision-center/types";

export function ImpactSummary({ decision }: { decision: ProcurementDecision }) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Items</p>
        <p className="mt-2 text-2xl font-semibold text-[#0f172a]">{decision.affectedItems.length || "—"}</p>
      </div>
      <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Requirements</p>
        <p className="mt-2 text-2xl font-semibold text-[#0f172a]">{decision.affectedRequirements}</p>
      </div>
      <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Next</p>
        <p className="mt-2 text-sm font-semibold text-[#0f172a]">Package readiness</p>
      </div>
    </section>
  );
}
