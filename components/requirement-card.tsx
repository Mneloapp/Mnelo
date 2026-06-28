import { ChevronDown, Layers3 } from "lucide-react";
import { RequirementSourceRows } from "@/components/requirement-source-rows";
import type { DerivedRequirement, RequirementStatus } from "@/lib/requirements/derive-requirements";

function statusClassName(status: RequirementStatus) {
  if (status === "Ready for RFQ") {
    return "border-[#BBF7D0] bg-[#ECFDF3] text-[#15803D]";
  }

  if (status === "Incomplete Specs") {
    return "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]";
  }

  return "border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]";
}

function formatQuantity(quantity: number | null, unit: string | null) {
  if (quantity === null) {
    return "Unknown quantity";
  }

  return `${quantity.toLocaleString()}${unit ? ` ${unit}` : ""}`;
}

function formatConfidence(value: number) {
  if (value <= 1) {
    return `${Math.round(value * 100)}%`;
  }

  return `${Math.round(value)}%`;
}

export function RequirementCard({ requirement }: { requirement: DerivedRequirement }) {
  return (
    <details className="group rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#BBF7D0]">
      <summary className="flex cursor-pointer list-none flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#ECFDF3] text-[#22C55E]">
              <Layers3 aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[#0F172A]">{requirement.name}</h3>
              <p className="mt-1 text-sm text-[#64748B]">
                {requirement.system} / {requirement.category} / {requirement.subcategory}
              </p>
              <p className="mt-1 truncate text-xs text-[#94A3B8]">Identity: {requirement.normalizedDescription}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[#64748B]">
            <span className="rounded-full bg-[#F1F5F9] px-3 py-1">{formatQuantity(requirement.totalQuantity, requirement.unit)}</span>
            <span className="rounded-full bg-[#F1F5F9] px-3 py-1">
              {requirement.sourceRows.length} source row{requirement.sourceRows.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-[#F1F5F9] px-3 py-1 capitalize">{requirement.classificationSource}</span>
            <span className="rounded-full bg-[#F1F5F9] px-3 py-1">{formatConfidence(requirement.confidenceScore)} confidence</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(requirement.status)}`}>
            {requirement.status}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="h-5 w-5 text-[#94A3B8] transition group-open:rotate-180"
            strokeWidth={2}
          />
        </div>
      </summary>

      <RequirementSourceRows rows={requirement.sourceRows} />
    </details>
  );
}
