"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Download, Layers3, Save, Search, Sparkles, X } from "lucide-react";
import { bulkCorrectBoqItemClassifications, classifyProjectBoqItems } from "@/app/projects/actions";
import { getSystemRuleOptions, NEEDS_REVIEW_CATEGORY } from "@/lib/classification";
import type { ProjectSystemCategory, ProjectSystemSummary, SystemBoqItem } from "@/lib/data";
import { EmptyState, ErrorMessage } from "@/components/ui";

const systemOptions = getSystemRuleOptions();
const sourceOptions = ["all", "rules", "learned", "ai", "needs_review"] as const;

type DraftChange = {
  categoryName: string;
  needsReview: boolean;
  systemName: string;
};

type FlatSystemRow = {
  category: ProjectSystemCategory;
  item: SystemBoqItem;
  system: ProjectSystemSummary;
};

function defaultCategoryForSystem(systemName: string) {
  return systemOptions.find((option) => option.systemName === systemName)?.categoryName || NEEDS_REVIEW_CATEGORY;
}

function sourceLabel(source: string) {
  if (source === "ai") {
    return "AI";
  }

  if (source === "learned") {
    return "Learned";
  }

  if (source === "needs_review") {
    return "Needs Review";
  }

  return "Rules";
}

function draftForItem(item: SystemBoqItem, systemName: string, categoryName: string): DraftChange {
  return {
    categoryName,
    needsReview: item.needsReview,
    systemName,
  };
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
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, DraftChange>>({});
  const [savedOverrides, setSavedOverrides] = useState<Record<string, DraftChange>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [systemFilter, setSystemFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<(typeof sourceOptions)[number]>("all");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [bulkSystem, setBulkSystem] = useState(systemOptions[0]?.systemName || "");
  const [bulkCategory, setBulkCategory] = useState(defaultCategoryForSystem(systemOptions[0]?.systemName || ""));

  const allRows = useMemo(
    () =>
      systems.flatMap((system) =>
        system.categories.flatMap((category) =>
          category.items.map((item) => ({
            category,
            item,
            system,
          })),
        ),
      ),
    [systems],
  );
  const originalById = useMemo(() => {
    const map = new Map<string, FlatSystemRow>();

    for (const row of allRows) {
      map.set(row.item.id, row);
    }

    return map;
  }, [allRows]);
  const categoryOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.category.name))).sort((a, b) => a.localeCompare(b)),
    [allRows],
  );
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allRows.filter((row) => {
      if (systemFilter !== "all" && row.system.name !== systemFilter) {
        return false;
      }

      if (categoryFilter !== "all" && row.category.name !== categoryFilter) {
        return false;
      }

      if (sourceFilter !== "all" && row.item.classificationSource !== sourceFilter) {
        return false;
      }

      if (needsReviewOnly && !row.item.needsReview) {
        return false;
      }

      return !normalizedSearch || row.item.description.toLowerCase().includes(normalizedSearch);
    });
  }, [allRows, categoryFilter, needsReviewOnly, search, sourceFilter, systemFilter]);
  const visibleIds = useMemo(() => new Set(filteredRows.map((row) => row.item.id)), [filteredRows]);
  const selectedVisibleCount = Array.from(selectedIds).filter((id) => visibleIds.has(id)).length;
  const selectedCount = selectedIds.size;
  const dirtyCount = Object.keys(drafts).length;

  function displayDraft(row: FlatSystemRow) {
    return drafts[row.item.id] || savedOverrides[row.item.id] || draftForItem(row.item, row.system.name, row.category.name);
  }

  function updateDraft(itemId: string, patch: Partial<DraftChange>) {
    const row = originalById.get(itemId);

    if (!row) {
      return;
    }

    const current = displayDraft(row);
    const next = { ...current, ...patch };

    setDrafts((previous) => ({
      ...previous,
      [itemId]: next,
    }));
  }

  function setSelected(nextIds: Iterable<string>) {
    setSelectedIds(new Set(nextIds));
  }

  function toggleRow(itemId: string, checked: boolean) {
    const next = new Set(selectedIds);

    if (checked) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }

    setSelected(next);
  }

  function toggleRows(itemIds: string[], checked: boolean) {
    const next = new Set(selectedIds);

    for (const itemId of itemIds) {
      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
    }

    setSelected(next);
  }

  function applyBulkPatch(patch: Partial<DraftChange>) {
    for (const itemId of selectedIds) {
      updateDraft(itemId, patch);
    }
  }

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

  async function saveChanges() {
    const changes = Object.entries(drafts).map(([itemId, draft]) => ({
      categoryName: draft.categoryName,
      itemId,
      needsReview: draft.needsReview,
      systemName: draft.systemName,
    }));

    if (changes.length === 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("project_id", projectId);
      formData.set("changes", JSON.stringify(changes));
      const result = await bulkCorrectBoqItemClassifications(formData);

      if (!result.ok) {
        const message = result.error || "Could not save manual classifications.";
        console.error(message);
        setNotice({ tone: "error", message });
        return;
      }

      setSavedOverrides((previous) => ({ ...previous, ...drafts }));
      setDrafts({});
      setSelectedIds(new Set());
      setNotice({
        tone: "success",
        message: `${result.message || "Manual classifications saved."} Rows stay visible here until you refresh the view.`,
      });
    } catch (error) {
      console.error(error);
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unknown classification error.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function rowMoved(row: FlatSystemRow) {
    const saved = savedOverrides[row.item.id];

    return Boolean(saved && (saved.systemName !== row.system.name || saved.categoryName !== row.category.name));
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

      <div className="mt-5 grid gap-3 rounded-2xl border border-[#e5e7eb] bg-[#fbfdfb] p-4 lg:grid-cols-[1fr_11rem_11rem_11rem_auto]">
        <label className="relative block">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          <input
            className="h-10 w-full rounded-xl border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search description..."
            value={search}
          />
        </label>
        <select
          className="h-10 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
          onChange={(event) => setSystemFilter(event.currentTarget.value)}
          value={systemFilter}
        >
          <option value="all">All systems</option>
          {systems.map((system) => (
            <option key={system.name} value={system.name}>
              {system.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
          onChange={(event) => setCategoryFilter(event.currentTarget.value)}
          value={categoryFilter}
        >
          <option value="all">All categories</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
          onChange={(event) => setSourceFilter(event.currentTarget.value as (typeof sourceOptions)[number])}
          value={sourceFilter}
        >
          {sourceOptions.map((source) => (
            <option key={source} value={source}>
              {source === "all" ? "All sources" : sourceLabel(source)}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-[#64748b]">
            <input
              checked={needsReviewOnly}
              className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a]"
              onChange={(event) => setNeedsReviewOnly(event.currentTarget.checked)}
              type="checkbox"
            />
            Needs Review
          </label>
          <button
            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0] transition hover:bg-[#ecfdf3]"
            onClick={() => toggleRows(filteredRows.map((row) => row.item.id), selectedVisibleCount !== filteredRows.length)}
            type="button"
          >
            {selectedVisibleCount === filteredRows.length && filteredRows.length > 0 ? "Clear visible" : "Select visible"}
          </button>
        </div>
      </div>

      {selectedCount > 0 || dirtyCount > 0 ? (
        <div className="sticky top-3 z-20 mt-5 rounded-2xl border border-[#bbf7d0] bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="grid gap-3 xl:grid-cols-[auto_12rem_12rem_auto_auto_auto_auto] xl:items-center">
            <p className="text-sm font-semibold text-[#0f172a]">
              {selectedCount} selected / {dirtyCount} unsaved
            </p>
            <select
              className="h-10 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
              onChange={(event) => {
                const nextSystem = event.currentTarget.value;
                const nextCategory = defaultCategoryForSystem(nextSystem);
                setBulkSystem(nextSystem);
                setBulkCategory(nextCategory);
                applyBulkPatch({ categoryName: nextCategory, systemName: nextSystem });
              }}
              value={bulkSystem}
            >
              {systemOptions.map((option) => (
                <option key={option.systemName} value={option.systemName}>
                  {option.systemName}
                </option>
              ))}
            </select>
            <input
              className="h-10 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
              onChange={(event) => {
                setBulkCategory(event.currentTarget.value);
                applyBulkPatch({ categoryName: event.currentTarget.value });
              }}
              placeholder="Set category"
              value={bulkCategory}
            />
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#fff7ed] px-3 text-xs font-semibold text-[#c2410c] ring-1 ring-[#fed7aa] transition hover:bg-[#ffedd5]"
              disabled={selectedCount === 0}
              onClick={() => applyBulkPatch({ needsReview: true })}
              type="button"
            >
              Mark Needs Review
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-3 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0] transition hover:bg-[#ecfdf3]"
              disabled={selectedCount === 0}
              onClick={() => applyBulkPatch({ needsReview: false })}
              type="button"
            >
              Clear Needs Review
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#087a36] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={dirtyCount === 0 || isSaving}
              onClick={() => void saveChanges()}
              type="button"
            >
              <Save aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
              {isSaving ? "Saving..." : "Save changes"}
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-[#64748b] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8faf8]"
              onClick={() => {
                setDrafts({});
                setSelectedIds(new Set());
              }}
              type="button"
            >
              <X aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="mt-5">
          {notice.tone === "error" ? (
            <ErrorMessage message={notice.message} />
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-[#bbf7d0] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087a36] sm:flex-row sm:items-center sm:justify-between">
              <span>{notice.message}</span>
              <button className="font-semibold underline-offset-4 hover:underline" onClick={() => router.refresh()} type="button">
                Apply changes / Refresh view
              </button>
            </div>
          )}
        </div>
      ) : null}

      {systems.length > 0 && filteredRows.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {systems.map((system) => {
            const visibleSystemRows = filteredRows.filter((row) => row.system.name === system.name);

            if (visibleSystemRows.length === 0) {
              return null;
            }

            return (
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#fbfdfb] p-4" key={system.name}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
                      <Layers3 aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#0f172a]">{system.name}</h3>
                      <p className="mt-1 text-sm text-[#64748b]">
                        {visibleSystemRows.length} visible / {system.itemCount} total items
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

                {system.categories.map((category) => {
                  const rows = visibleSystemRows.filter((row) => row.category.name === category.name);

                  if (rows.length === 0) {
                    return null;
                  }

                  const rowIds = rows.map((row) => row.item.id);
                  const checkedCount = rowIds.filter((id) => selectedIds.has(id)).length;

                  return (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white" key={category.name}>
                      <div className="grid min-w-[980px] grid-cols-[2.5rem_minmax(22rem,1fr)_7rem_5rem_7rem_minmax(24rem,30rem)] gap-3 bg-[#fbfdfb] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                        <label className="flex items-center">
                          <input
                            checked={checkedCount === rowIds.length}
                            className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a]"
                            onChange={(event) => toggleRows(rowIds, event.currentTarget.checked)}
                            type="checkbox"
                          />
                        </label>
                        <span>
                          {category.name} <span className="font-normal normal-case tracking-normal">({rows.length})</span>
                        </span>
                        <span className="text-right">Quantity</span>
                        <span>Unit</span>
                        <span className="text-right">Amount</span>
                        <span>Draft classification</span>
                      </div>
                      <div className="min-w-[980px] divide-y divide-[#edf0ed]">
                        {rows.map((row) => {
                          const item = row.item;
                          const draft = displayDraft(row);
                          const isDirty = Boolean(drafts[item.id]);
                          const willMove = draft.systemName !== row.system.name || draft.categoryName !== row.category.name;
                          const moved = rowMoved(row);

                          return (
                            <div
                              className="grid grid-cols-[2.5rem_minmax(22rem,1fr)_7rem_5rem_7rem_minmax(24rem,30rem)] gap-3 px-4 py-3 text-sm"
                              key={item.id}
                            >
                              <label className="flex items-start pt-1">
                                <input
                                  checked={selectedIds.has(item.id)}
                                  className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a]"
                                  onChange={(event) => toggleRow(item.id, event.currentTarget.checked)}
                                  type="checkbox"
                                />
                              </label>
                              <span className="min-w-0">
                                <span className="line-clamp-2 font-medium text-[#0f172a]">{item.description}</span>
                                <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#64748b]">
                                  <span>{category.name}</span>
                                  <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 font-semibold text-[#64748b] ring-1 ring-[#e5e7eb]">
                                    {sourceLabel(item.classificationSource)}
                                  </span>
                                  <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 font-semibold text-[#64748b] ring-1 ring-[#e5e7eb]">
                                    {Math.round(item.confidenceScore * 100)}%
                                  </span>
                                  {item.needsReview ? (
                                    <span className="inline-flex items-center rounded-full bg-[#fff7ed] px-2 py-0.5 font-semibold text-[#c2410c] ring-1 ring-[#fed7aa]">
                                      <AlertCircle aria-hidden="true" className="mr-1 h-3 w-3" strokeWidth={2} />
                                      Needs Review
                                    </span>
                                  ) : null}
                                  {isDirty && willMove ? (
                                    <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 font-semibold text-[#2563eb] ring-1 ring-[#bfdbfe]">
                                      Will move after save
                                    </span>
                                  ) : null}
                                  {moved ? (
                                    <span className="rounded-full bg-[#ecfdf3] px-2 py-0.5 font-semibold text-[#087a36] ring-1 ring-[#bbf7d0]">
                                      Moved
                                    </span>
                                  ) : null}
                                </span>
                                {item.classificationReason ? (
                                  <span className="mt-1 block text-xs text-[#94a3b8]">{item.classificationReason}</span>
                                ) : null}
                              </span>
                              <span className="text-right text-[#64748b]">
                                {(item.takeoffQuantity ?? item.quantity ?? 0).toLocaleString()}
                              </span>
                              <span className="text-[#64748b]">{item.takeoffUnit || item.unit || "item"}</span>
                              <span className="text-right text-[#64748b]">
                                {item.amount === null ? "—" : item.amount.toLocaleString()}
                              </span>
                              <span className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                                <select
                                  className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-2 text-xs outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                                  onChange={(event) => {
                                    const nextSystem = event.currentTarget.value;
                                    updateDraft(item.id, {
                                      categoryName: defaultCategoryForSystem(nextSystem),
                                      systemName: nextSystem,
                                    });
                                  }}
                                  value={draft.systemName}
                                >
                                  {systemOptions.map((option) => (
                                    <option key={`${item.id}-${option.systemName}`} value={option.systemName}>
                                      {option.systemName}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-2 text-xs outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                                  onChange={(event) => updateDraft(item.id, { categoryName: event.currentTarget.value })}
                                  placeholder="Category"
                                  value={draft.categoryName}
                                />
                                <label className="flex items-center gap-2 text-xs font-semibold text-[#64748b] sm:col-span-2">
                                  <input
                                    checked={draft.needsReview}
                                    className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a]"
                                    onChange={(event) => updateDraft(item.id, { needsReview: event.currentTarget.checked })}
                                    type="checkbox"
                                  />
                                  Needs Review
                                </label>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            description={
              systems.length > 0
                ? "Try changing the search, system, category, source, or needs review filters."
                : "Upload and parse a BOQ file, then run classification to create project systems and takeoff summaries."
            }
            title={systems.length > 0 ? "No BOQ rows match these filters" : "No systems yet"}
          />
        </div>
      )}
    </section>
  );
}
