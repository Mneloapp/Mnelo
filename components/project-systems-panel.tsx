"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers3, Sparkles } from "lucide-react";
import { classifyProjectBoqItems } from "@/app/projects/actions";
import type { ProjectSystemSummary } from "@/lib/data";
import { EmptyState, ErrorMessage } from "@/components/ui";

export function ProjectSystemsPanel({
  projectId,
  systems,
}: {
  projectId: string;
  systems: ProjectSystemSummary[];
}) {
  const router = useRouter();
  const [isClassifying, setIsClassifying] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

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

              <div className="mt-4 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
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
