"use client";

import { useMemo, useState } from "react";
import { correctBoqClassification } from "@/app/projects/actions";
import { BoqCleanupSummary, BoqItem, LearningRecord } from "@/lib/data";
import { Badge } from "@/components/ui";

const categoryOptions = [
  "HVAC",
  "Electrical",
  "Furniture",
  "Medical Equipment",
  "Industrial Equipment",
  "Software",
  "Construction Materials",
  "Renewable Energy",
  "Logistics",
  "Office Supplies",
  "General",
];

function learningKey(sourceFileId: string | null, description: string) {
  return `${sourceFileId || "unknown"}:${description.toLowerCase()}`;
}

export function BoqResultsTable({
  items,
  learningRecords = [],
  cleanupSummary,
  showClassification = true,
}: {
  items: BoqItem[];
  learningRecords?: LearningRecord[];
  cleanupSummary?: BoqCleanupSummary;
  showClassification?: boolean;
}) {
  const [showIgnoredRows, setShowIgnoredRows] = useState(false);
  const latestLearningByItem = new Map<string, LearningRecord>();
  const summary =
    cleanupSummary || ({
      ignoredRows: items.filter((item) => item.rowType !== "item").length,
      itemRows: items.filter((item) => item.rowType === "item").length,
      parsedRows: items.length,
    } satisfies BoqCleanupSummary);
  const visibleItems = useMemo(
    () => (showIgnoredRows ? items : items.filter((item) => item.rowType === "item")),
    [items, showIgnoredRows],
  );

  for (const record of learningRecords) {
    const key = learningKey(record.sourceFileId, record.itemDescription);
    latestLearningByItem.set(key, record);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">BOQ Results</h2>
          <p className="text-sm text-ink/55">
            {summary.parsedRows.toLocaleString()} parsed rows / {summary.itemRows.toLocaleString()} item rows /{" "}
            {summary.ignoredRows.toLocaleString()} ignored rows
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {summary.ignoredRows > 0 ? (
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink/55">
              <input
                checked={showIgnoredRows}
                className="h-4 w-4 rounded border-line text-leaf-600 focus:ring-leaf-500"
                onChange={(event) => setShowIgnoredRows(event.currentTarget.checked)}
                type="checkbox"
              />
              Show ignored rows
            </label>
          ) : null}
          <Badge tone={summary.itemRows > 0 ? "green" : "neutral"}>{summary.itemRows} item rows</Badge>
        </div>
      </div>

      {visibleItems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-mist/70 text-xs uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 text-right font-semibold">Quantity</th>
                <th className="px-5 py-3 font-semibold">Unit</th>
                <th className="px-5 py-3 text-right font-semibold">Rate</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Row type</th>
                {showClassification ? (
                  <>
                    <th className="px-5 py-3 font-semibold">Sheet</th>
                    <th className="px-5 py-3 text-right font-semibold">Row</th>
                    <th className="px-5 py-3 font-semibold">Classification</th>
                    <th className="px-5 py-3 font-semibold">Correction</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {visibleItems.map((item) => {
                const learningRecord = latestLearningByItem.get(learningKey(item.sourceFileId, item.description));
                const predictedCategory = learningRecord?.predictedCategory || item.category;
                const predictedSubcategory = learningRecord?.predictedSubcategory || item.subcategory;
                const predictedSupplierType = learningRecord?.predictedSupplierType || "General supplier";
                const confidenceScore = learningRecord?.confidenceScore || item.confidenceScore;
                const finalCategory = learningRecord?.finalCategory || predictedCategory;
                const finalSubcategory = learningRecord?.finalSubcategory || predictedSubcategory;
                const wasCorrected = Boolean(
                  learningRecord?.userCorrectedCategory || learningRecord?.userCorrectedSubcategory,
                );

                return (
                  <tr key={item.id} className="align-top transition hover:bg-leaf-50/40">
                    <td className="min-w-72 px-5 py-4 font-medium text-ink">{item.description}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-ink/70">
                      {item.quantity === null ? "—" : item.quantity.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink/60">{item.unit || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-ink/60">
                      {item.rate === null ? "—" : item.rate.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-ink/60">
                      {item.amount === null ? "—" : item.amount.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Badge tone={item.rowType === "item" ? "green" : "neutral"}>{item.rowType}</Badge>
                      {item.rowType !== "item" && item.cleanupReason ? (
                        <p className="mt-1 max-w-48 text-xs text-ink/40">{item.cleanupReason}</p>
                      ) : null}
                    </td>
                    {showClassification ? (
                      <>
                        <td className="whitespace-nowrap px-5 py-4 text-ink/60">{item.sheetName}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-xs text-ink/45">
                          {item.rowNumber}
                        </td>
                        <td className="min-w-56 px-5 py-4">
                          <p className="font-medium text-ink">{finalCategory}</p>
                          <p className="mt-1 text-xs text-ink/50">{finalSubcategory}</p>
                          <p className="mt-2 text-xs text-ink/40">
                            {predictedSupplierType} · {Math.round(confidenceScore * 100)}% confidence
                          </p>
                          {wasCorrected ? <Badge tone="amber">Corrected</Badge> : null}
                        </td>
                        <td className="min-w-72 px-5 py-4">
                          {item.sourceFileId ? (
                            <form action={correctBoqClassification} className="grid gap-2">
                              <input name="project_id" type="hidden" value={item.projectId} />
                              <input name="source_file_id" type="hidden" value={item.sourceFileId} />
                              <input name="item_description" type="hidden" value={item.description} />
                              <input name="predicted_category" type="hidden" value={predictedCategory} />
                              <input name="predicted_subcategory" type="hidden" value={predictedSubcategory} />
                              <input name="predicted_supplier_type" type="hidden" value={predictedSupplierType} />
                              <input name="confidence_score" type="hidden" value={String(confidenceScore)} />
                              <select
                                className="h-9 rounded-lg border border-line bg-white px-2 text-xs outline-none transition focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
                                defaultValue={finalCategory}
                                name="user_corrected_category"
                              >
                                {categoryOptions.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                              <input
                                className="h-9 rounded-lg border border-line bg-white px-2 text-xs outline-none transition placeholder:text-ink/30 focus:border-leaf-400 focus:ring-4 focus:ring-leaf-100"
                                defaultValue={finalSubcategory}
                                name="user_corrected_subcategory"
                                placeholder="Subcategory"
                              />
                              <button
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#16a34a] px-3 text-xs font-semibold text-white transition hover:bg-[#087a36]"
                                type="submit"
                              >
                                Save correction
                              </button>
                            </form>
                          ) : (
                            <p className="text-xs text-ink/45">Upload source unavailable</p>
                          )}
                        </td>
                      </>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="font-medium text-ink">
            {items.length > 0 ? "Only ignored BOQ rows are hidden" : "No BOQ items parsed yet"}
          </p>
          <p className="mt-2 text-sm text-ink/55">
            {items.length > 0 ? "Turn on Show ignored rows to inspect cleanup output." : "Upload or parse a BOQ file to get started."}
          </p>
        </div>
      )}
    </section>
  );
}
