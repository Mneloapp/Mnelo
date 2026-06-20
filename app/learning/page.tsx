import { Brain, CheckCircle2, type LucideIcon, Tags } from "lucide-react";
import { EmptyState, ErrorMessage, PageHeader } from "@/components/ui";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getLearningSummaryForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

function LearningStat({ detail, icon: Icon, label, value }: {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
          <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-medium text-[#64748b]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#0f172a]">{value}</p>
          <p className="mt-3 text-xs font-medium text-[#64748b]">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default async function LearningPage() {
  const summary = await getLearningSummaryForCurrentUser();
  const showLearningError = process.env.NODE_ENV === "development" && summary.errorMessage;

  return (
    <WorkspaceShell active="BOQ">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader
          eyebrow="Learning engine"
          subtitle="Review industry-agnostic BOQ classifications, user corrections, and training history without overwriting previous predictions."
          title="Training Data"
        />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <LearningStat
            detail="Predictions and corrections"
            icon={Brain}
            label="Training records"
            value={String(summary.totalRecords)}
          />
          <LearningStat
            detail="User-corrected history"
            icon={CheckCircle2}
            label="Correction rate"
            value={`${summary.correctionRate}%`}
          />
          <LearningStat
            detail="From parsed BOQ items"
            icon={Tags}
            label="Active categories"
            value={String(summary.mostCommonCategories.length)}
          />
        </section>

        {showLearningError ? (
          <div className="mt-5">
            <ErrorMessage message={summary.errorMessage} />
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-semibold tracking-tight text-[#0f172a]">Most common categories</h2>
            {summary.mostCommonCategories.length > 0 ? (
              <div className="mt-4 space-y-3">
                {summary.mostCommonCategories.map((item) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-[#f8faf8] px-4 py-3"
                    key={item.category}
                  >
                    <span className="font-medium text-[#0f172a]">{item.category}</span>
                    <span className="text-sm text-[#64748b]">{item.count} records</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Upload an Excel BOQ to create the first learning records."
                title="No categories yet"
              />
            )}
          </div>

          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-semibold tracking-tight text-[#0f172a]">Most corrected classifications</h2>
            {summary.mostCorrectedClassifications.length > 0 ? (
              <div className="mt-4 space-y-3">
                {summary.mostCorrectedClassifications.map((item) => (
                  <div className="rounded-xl border border-[#e5e7eb] bg-[#f8faf8] px-4 py-3" key={`${item.from}-${item.to}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[#0f172a]">
                        {item.from} <span className="text-[#94a3b8]">to</span> {item.to}
                      </p>
                      <span className="text-sm text-[#64748b]">{item.count} corrections</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Corrections saved from BOQ rows will appear here as full history."
                title="No corrections yet"
              />
            )}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
          <div className="border-b border-[#e5e7eb] px-5 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-[#0f172a]">Recent training records</h2>
            <p className="text-sm text-[#64748b]">Original predictions and user-corrected final values.</p>
          </div>
          {summary.recentRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#fbfdfb] text-xs uppercase tracking-[0.12em] text-[#64748b]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Item</th>
                    <th className="px-5 py-4 font-semibold">Predicted</th>
                    <th className="px-5 py-4 font-semibold">Final</th>
                    <th className="px-5 py-4 font-semibold">Supplier type</th>
                    <th className="px-5 py-4 text-right font-semibold">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0ed] bg-white">
                  {summary.recentRecords.map((record) => (
                    <tr className="transition hover:bg-[#f8faf8]" key={record.id}>
                      <td className="min-w-80 px-5 py-4 font-medium text-[#0f172a]">{record.itemDescription}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#64748b]">
                        {record.predictedCategory} / {record.predictedSubcategory}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#64748b]">
                        {record.finalCategory} / {record.finalSubcategory}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#64748b]">{record.predictedSupplierType}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-[#64748b]">
                        {Math.round(record.confidenceScore * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                description="Every parsed BOQ item will create a learning record automatically."
                title="No training records yet"
              />
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
