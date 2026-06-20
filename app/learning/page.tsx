import { AppNav } from "@/components/app-nav";
import { Badge, Shell, StatCard } from "@/components/ui";
import { getLearningSummaryForCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const summary = await getLearningSummaryForCurrentUser();
  const showLearningError = process.env.NODE_ENV === "development" && summary.errorMessage;

  return (
    <Shell>
      <AppNav />
      <section className="mb-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge>Learning engine</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">Training Data</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58">
              Review how Mnelo classifies BOQ items, tracks user corrections, and builds category history across
              industries without overwriting previous predictions.
            </p>
          </div>
          <Badge tone="neutral">Industry-agnostic</Badge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Training records"
          value={String(summary.totalRecords)}
          detail="Predictions and corrections"
        />
        <StatCard label="Correction rate" value={`${summary.correctionRate}%`} detail="User-corrected history" />
        <StatCard
          label="Active categories"
          value={String(summary.mostCommonCategories.length)}
          detail="From parsed BOQ items"
        />
      </section>

      {showLearningError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
          {summary.errorMessage}
        </p>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Most common categories</h2>
          {summary.mostCommonCategories.length > 0 ? (
            <div className="mt-4 space-y-3">
              {summary.mostCommonCategories.map((item) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-line bg-mist/40 px-4 py-3"
                  key={item.category}
                >
                  <span className="font-medium text-ink">{item.category}</span>
                  <span className="text-sm text-ink/55">{item.count} records</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-line bg-mist/50 p-6 text-center">
              <p className="font-medium text-ink">No categories yet</p>
              <p className="mt-2 text-sm text-ink/55">
                Upload an Excel BOQ to create the first learning records.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Most corrected classifications</h2>
          {summary.mostCorrectedClassifications.length > 0 ? (
            <div className="mt-4 space-y-3">
              {summary.mostCorrectedClassifications.map((item) => (
                <div
                  className="rounded-lg border border-line bg-mist/40 px-4 py-3"
                  key={`${item.from}-${item.to}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">
                      {item.from} <span className="text-ink/35">to</span> {item.to}
                    </p>
                    <span className="text-sm text-ink/55">{item.count} corrections</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-line bg-mist/50 p-6 text-center">
              <p className="font-medium text-ink">No corrections yet</p>
              <p className="mt-2 text-sm text-ink/55">
                Corrections saved from BOQ rows will appear here as full history.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Recent training records</h2>
          <p className="text-sm text-ink/55">Original predictions and user-corrected final values.</p>
        </div>
        {summary.recentRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-left text-sm">
              <thead className="bg-mist/70 text-xs uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="px-5 py-3 font-semibold">Item</th>
                  <th className="px-5 py-3 font-semibold">Predicted</th>
                  <th className="px-5 py-3 font-semibold">Final</th>
                  <th className="px-5 py-3 font-semibold">Supplier type</th>
                  <th className="px-5 py-3 text-right font-semibold">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {summary.recentRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="min-w-80 px-5 py-4 font-medium text-ink">{record.itemDescription}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink/65">
                      {record.predictedCategory} / {record.predictedSubcategory}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink/65">
                      {record.finalCategory} / {record.finalSubcategory}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink/55">{record.predictedSupplierType}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-ink/55">
                      {Math.round(record.confidenceScore * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="font-medium text-ink">No training records yet</p>
            <p className="mt-2 text-sm text-ink/55">
              Every parsed BOQ item will create a learning record automatically.
            </p>
          </div>
        )}
      </section>
    </Shell>
  );
}
