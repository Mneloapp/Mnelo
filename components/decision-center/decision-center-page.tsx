"use client";

import { useState } from "react";

import { DecisionCard } from "@/components/decision-center/decision-card";
import { buildDecisionCenterModel } from "@/components/decision-center/decision-center-data";
import { DecisionSummaryHeader } from "@/components/decision-center/decision-summary-header";
import { DecisionWorkspace } from "@/components/decision-center/decision-workspace";
import type { DecisionCenterSource } from "@/components/decision-center/types";

export function DecisionCenterPage({ boqItems, projectName }: DecisionCenterSource) {
  const model = buildDecisionCenterModel({ boqItems, projectName });
  const [activeDecisionId, setActiveDecisionId] = useState(model.decisions[0]?.id || "classification");
  const activeDecision = model.decisions.find((decision) => decision.id === activeDecisionId) || model.decisions[0];

  return (
    <div className="space-y-7">
      <DecisionSummaryHeader
        aiStatus={model.aiStatus}
        decisionsLeft={model.decisions.filter((decision) => decision.status !== "Approved").length}
        projectName={model.projectName}
      />

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Decision Center</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0f172a]">What needs approval</h2>
          </div>
          <p className="hidden max-w-md text-right text-sm text-slate-500 md:block">
            AI prepared the background work. You only review the decisions that move procurement forward.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {model.decisions.map((decision) => (
            <DecisionCard
              decision={decision}
              isActive={decision.id === activeDecision.id}
              key={decision.id}
              onOpen={() => setActiveDecisionId(decision.id)}
            />
          ))}
        </div>
      </section>

      <DecisionWorkspace decision={activeDecision} />
    </div>
  );
}
