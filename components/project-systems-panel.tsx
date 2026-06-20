"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Layers3, Save, Sparkles } from "lucide-react";
import { classifyProjectBoqItems, correctBoqItemSystemClassification } from "@/app/projects/actions";
import { getSystemRuleOptions } from "@/lib/classification";
import type { ProjectSystemSummary } from "@/lib/data";
import { EmptyState, ErrorMessage } from "@/components/ui";

const systemOptions = getSystemRuleOptions();

function defaultCategoryForSystem(systemName: string) {
  return systemOptions.find((option) => option.systemName === systemName)?.categoryName || "General scope";
}

export function ProjectSystemsPanel({
  projectId,
  systems,
}: {
  projectId: string;
  systems: ProjectSystemSummary[];
}) {
  const router = useRouter();
  const [isClassifying, setIsClassifying] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function downloadSystem(system: ProjectSystemSummary) {
    const XLSX = await import("xlsx");
    const rows = system.categories.flatMap((category) =>
      category.items.map((item) => ({
        Amount: item.amount ?? "",
        Category: category.name,
        Description: item.description,
        Quantity: item.takeoffQuantity ?? item.quantity ?? "",
        Rate: item.rate ?? "",
        Sheet: item.sheetName,
        System: system.name,
        Unit: item.takeoffUnit || item.unit || "",
      })),
    );
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "System BOQ");
    XLSX.writeFile(workbook, `${system.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-boq.xlsx`);
  }

  return (
    <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Systems</h2>
          <p className="mt-1 text-sm text-slate-500">
            Group parsed BOQ rows into systems, categories, and takeoff quantities for the next procurement workflow.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.22)] transition hover:bg-[#087a36] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isClassifying}
          onClick={async () => {
            if (isClassifying) {
              return;
            }

            setIsClassifying(true);
            setNotice(null);

            try {
              const formData = new FormData();
              formData.set("project_id", projectId);
              const result = await classifyProjectBoqItems(formData);

              if (!result.ok) {
                const message = result.error || "Classification failed.";
                console.error(message);
                setNotice({ tone: "error", message });
                return;
              }

              setNotice({ tone: "success", message: result.message || "BOQ items classified." });
              router.refresh();
            } catch (error) {
              console.error(error);
              setNotice({
                tone: "error",
                message: error instanceof Error ? error.message : "Unknown classification error.",
              });
            } finally {
              setIsClassifying(false);
            }
          }}
          type="button"
        >
          <Sparkles aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
          {isClassifying ? "Classifying..." : "Classify BOQ"}
        </button>
      </div>

      {notice ? (
        <div className="mt-5">
          {notice.tone === "error" ? (
            <ErrorMessage message={notice.message} />
          ) : (
            <div className="rounded-xl border border-[#bbf7d0] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087a36]">
              {notice.message}
            </div>
          )}
        </div>
      ) : null}

      {systems.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {systems.map((system) => (
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#fbfdfb] p-4" key={system.name}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
                    <Layers3 aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#0f172a]">{system.name}</h3>
                    <p className="mt-1 text-sm text-[#64748b]">
                      {system.itemCount} items / {system.confidenceAverage}% avg confidence
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0] transition hover:bg-[#ecfdf3]"
                    onClick={() => {
                      void downloadSystem(system);
                    }}
                    type="button"
                  >
                    <Download aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
                    Export Excel
                  </button>
                  {system.units.slice(0, 4).map((unit) => (
                    <span
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#64748b] ring-1 ring-[#e5e7eb]"
                      key={`${system.name}-${unit.unit}`}
                    >
                      {unit.quantity.toLocaleString()} {unit.unit}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white">
                <div className="grid grid-cols-[1fr_7rem_12rem] gap-3 bg-[#fbfdfb] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                  <span>Category</span>
                  <span className="text-right">Items</span>
                  <span>Takeoff</span>
                </div>
                <div className="divide-y divide-[#edf0ed]">
                  {system.categories.map((category) => (
                    <div className="grid grid-cols-[1fr_7rem_12rem] gap-3 px-4 py-3 text-sm" key={category.name}>
                      <span className="font-medium text-[#0f172a]">{category.name}</span>
                      <span className="text-right text-[#64748b]">{category.itemCount}</span>
                      <span className="truncate text-[#64748b]">
                        {category.units.length > 0
                          ? category.units
                              .slice(0, 2)
                              .map((unit) => `${unit.quantity.toLocaleString()} ${unit.unit}`)
                              .join(", ")
                          : "No quantity"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white">
                <div className="grid grid-cols-[minmax(22rem,1fr)_7rem_5rem_7rem_minmax(18rem,22rem)] gap-3 bg-[#fbfdfb] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                  <span>Product / BOQ item</span>
                  <span className="text-right">Quantity</span>
                  <span>Unit</span>
                  <span className="text-right">Amount</span>
                  <span>Manual classification</span>
                </div>
                <div className="divide-y divide-[#edf0ed]">
                  {system.categories.flatMap((category) =>
                    category.items.map((item) => (
                      <form
                        className="grid grid-cols-[minmax(22rem,1fr)_7rem_5rem_7rem_minmax(18rem,22rem)] gap-3 px-4 py-3 text-sm"
                        key={item.id}
                        onSubmit={async (event) => {
                          event.preventDefault();

                          if (savingItemId) {
                            return;
                          }

                          setSavingItemId(item.id);
                          setNotice(null);

                          try {
                            const formData = new FormData(event.currentTarget);
                            formData.set("project_id", projectId);
                            formData.set("item_id", item.id);

                            const result = await correctBoqItemSystemClassification(formData);

                            if (!result.ok) {
                              const message = result.error || "Could not save classification.";
                              console.error(message);
                              setNotice({ tone: "error", message });
                              return;
                            }

                            setNotice({
                              tone: "success",
                              message: result.message || "Classification saved.",
                            });
                            router.refresh();
                          } catch (error) {
                            console.error(error);
                            setNotice({
                              tone: "error",
                              message: error instanceof Error ? error.message : "Unknown classification error.",
                            });
                          } finally {
                            setSavingItemId(null);
                          }
                        }}
                      >
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-medium text-[#0f172a]">{item.description}</span>
                          <span className="mt-1 block text-xs text-[#64748b]">{category.name}</span>
                        </span>
                        <span className="text-right text-[#64748b]">
                          {(item.takeoffQuantity ?? item.quantity ?? 0).toLocaleString()}
                        </span>
                        <span className="text-[#64748b]">{item.takeoffUnit || item.unit || "item"}</span>
                        <span className="text-right text-[#64748b]">
                          {item.amount === null ? "—" : item.amount.toLocaleString()}
                        </span>
                        <span className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <select
                            className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-2 text-xs outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                            defaultValue={system.name}
                            name="system_name"
                            onChange={(event) => {
                              const form = event.currentTarget.form;
                              const categoryInput = form?.elements.namedItem("category_name");

                              if (categoryInput instanceof HTMLInputElement) {
                                categoryInput.value = defaultCategoryForSystem(event.currentTarget.value);
                              }
                            }}
                          >
                            {systemOptions.map((option) => (
                              <option key={`${item.id}-${option.systemName}`} value={option.systemName}>
                                {option.systemName}
                              </option>
                            ))}
                            <option value="General">General</option>
                          </select>
                          <input
                            className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-2 text-xs outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                            defaultValue={category.name}
                            name="category_name"
                            placeholder="Category"
                          />
                          <button
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0] transition hover:bg-[#ecfdf3] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={Boolean(savingItemId)}
                            type="submit"
                          >
                            <Save aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
                            {savingItemId === item.id ? "Saving..." : "Save"}
                          </button>
                        </span>
                      </form>
                    )),
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            description="Upload and parse a BOQ file, then run classification to create project systems and takeoff summaries."
            title="No systems yet"
          />
        </div>
      )}
    </section>
  );
}
