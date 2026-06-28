import { AlertTriangle, CheckCircle2, GitMerge, Sparkles } from "lucide-react";
import { RequirementCard } from "@/components/requirement-card";
import type { RequirementInsights, RequirementSection } from "@/lib/requirements/derive-requirements";

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#E5E7EB] bg-white p-4">
      <p className="text-2xl font-semibold tracking-tight text-[#0F172A]">{value}</p>
      <p className="mt-1 text-sm text-[#64748B]">{label}</p>
    </div>
  );
}

function EmptyRequirementsState() {
  return (
    <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-white p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ECFDF3] text-[#22C55E]">
        <Sparkles aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[#0F172A]">No requirements yet</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
        Requirements will appear after BOQ items are parsed and classified.
      </p>
    </div>
  );
}

export function ProjectRequirementsOverview({
  insights,
  sections,
}: {
  insights: RequirementInsights;
  sections: RequirementSection[];
}) {
  const hasRequirements = insights.requirementsFound > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        {hasRequirements ? (
          sections.map((section) => (
            <section className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4 sm:p-5" key={section.name}>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-[#0F172A]">{section.name}</h3>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {section.requirements.length} requirement{section.requirements.length === 1 ? "" : "s"} grouped from source rows.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {section.requirements.map((requirement) => (
                  <RequirementCard key={requirement.id} requirement={requirement} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <EmptyRequirementsState />
        )}
      </div>

      <aside className="h-fit rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] xl:sticky xl:top-8">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">
            <Sparkles aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C3AED]">Requirement Intelligence</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-[#0F172A]">AI has prepared the next business layer</h3>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-[#64748B]">
          Mnelo has grouped BOQ rows into purchasing requirements. Review uncertain items before creating packages or RFQs.
        </p>

        <div className="mt-6 grid gap-3">
          <InsightCard label="Requirements found" value={insights.requirementsFound.toLocaleString()} />
          <InsightCard label="Needs review" value={insights.needsReview.toLocaleString()} />
          <InsightCard label="Ready for RFQ" value={insights.readyForRfq.toLocaleString()} />
          <InsightCard label="Duplicate sources grouped" value={insights.duplicateSourcesGrouped.toLocaleString()} />
        </div>

        <div className="mt-6 space-y-3 rounded-[18px] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#64748B]">
          <div className="flex gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={2} />
            <span>Requirements are derived from existing parsed BOQ evidence.</span>
          </div>
          <div className="flex gap-3">
            <GitMerge aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#7C3AED]" strokeWidth={2} />
            <span>Rows are grouped conservatively by classification, description and unit.</span>
          </div>
          <div className="flex gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" strokeWidth={2} />
            <span>Uncertain groups stay in review instead of becoming packages automatically.</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
