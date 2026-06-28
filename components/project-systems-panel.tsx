"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Download, Layers3, Save, Search, Sparkles, X } from "lucide-react";
import { bulkCorrectBoqItemClassifications, classifyProjectBoqItems } from "@/app/projects/actions";
import {
  getCategoryOptions,
  getDefaultCategory,
  getDefaultSubcategory,
  getSubcategoryOptions,
  getSystemRuleOptions,
  NEEDS_REVIEW_CATEGORY,
  NEEDS_REVIEW_SYSTEM,
} from "@/lib/classification";
import type { ProjectSystemCategory, ProjectSystemSummary, SystemBoqItem } from "@/lib/data";
import { EmptyState, ErrorMessage } from "@/components/ui";

const systemOptions = getSystemRuleOptions();
const sourceOptions = ["all", "rules", "learned", "ai", "inherited_header", "needs_review"] as const;
const sourceSummaryOrder = ["rules", "inherited_header", "ai", "learned", "needs_review"] as const;

type DraftChange = {
  categoryName: string;
  needsReview: boolean;
  subcategoryName: string | null;
  systemName: string;
};

type FlatSystemRow = {
  category: ProjectSystemCategory;
  item: SystemBoqItem;
  system: ProjectSystemSummary;
};

function defaultCategoryForSystem(systemName: string) {
  return getDefaultCategory(systemName) || NEEDS_REVIEW_CATEGORY;
}

function defaultSubcategoryForDraft(systemName: string, categoryName: string) {
  if (categoryName === NEEDS_REVIEW_CATEGORY || systemName === NEEDS_REVIEW_SYSTEM) {
    return null;
  }

  return getDefaultSubcategory(systemName, categoryName);
}

function categoryOptionsForSystem(systemName: string) {
  const categories = getCategoryOptions(systemName);

  return categories.includes(NEEDS_REVIEW_CATEGORY) ? categories : [NEEDS_REVIEW_CATEGORY, ...categories];
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

  if (source === "inherited_header") {
    return "Inherited";
  }

  return "Rules";
}

function draftForItem(item: SystemBoqItem, systemName: string, categoryName: string): DraftChange {
  return {
    categoryName,
    needsReview: item.needsReview,
    subcategoryName: item.classificationSubcategory || defaultSubcategoryForDraft(systemName, categoryName),
    systemName,
  };
}

function displaySubcategory(item: SystemBoqItem) {
  if (item.classificationSubcategory) {
    return item.classificationSubcategory;
  }

  return (
    item.inheritedSubcategory ||
    item.subcategory ||
    item.sectionHeader ||
    item.category ||
    item.classificationSubcategory ||
    "Unclassified"
  );
}

function hasCompleteDraftClassification(draft: Pick<DraftChange, "categoryName" | "subcategoryName" | "systemName">) {
  return Boolean(
    draft.systemName &&
      draft.systemName !== NEEDS_REVIEW_SYSTEM &&
      draft.categoryName &&
      draft.categoryName !== NEEDS_REVIEW_CATEGORY &&
      draft.subcategoryName,
  );
}

function normalizeDraftChange(draft: DraftChange): DraftChange {
  return hasCompleteDraftClassification(draft) ? { ...draft, needsReview: false } : draft;
}

function patchChangesClassification(patch: Partial<DraftChange>) {
  return "systemName" in patch || "categoryName" in patch || "subcategoryName" in patch;
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
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, DraftChange>>({});
  const [savedOverrides, setSavedOverrides] = useState<Record<string, DraftChange>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [systemFilter, setSystemFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<(typeof sourceOptions)[number]>("all");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [bulkSystem, setBulkSystem] = useState(systemOptions[0]?.systemName || "");
  const [bulkCategory, setBulkCategory] = useState(defaultCategoryForSystem(systemOptions[0]?.systemName || ""));
  const [bulkSubcategory, setBulkSubcategory] = useState(
    defaultSubcategoryForDraft(systemOptions[0]?.systemName || "", defaultCategoryForSystem(systemOptions[0]?.systemName || "")),
  );

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
    () =>
      Array.from(new Set(allRows.flatMap((row) => [row.category.name, displaySubcategory(row.item)]))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [allRows],
  );
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allRows.filter((row) => {
      if (systemFilter !== "all" && row.system.name !== systemFilter) {
        return false;
      }

      if (categoryFilter !== "all" && row.category.name !== categoryFilter && displaySubcategory(row.item) !== categoryFilter) {
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
  const sourceSummary = useMemo(() => {
    const counts = sourceSummaryOrder.reduce(
      (summary, source) => ({
        ...summary,
        [source]: 0,
      }),
      {} as Record<(typeof sourceSummaryOrder)[number], number>,
    );
    let refinementQueueCount = 0;
    let highConfidenceCount = 0;

    for (const row of allRows) {
      const source = sourceSummaryOrder.includes(row.item.classificationSource as (typeof sourceSummaryOrder)[number])
        ? (row.item.classificationSource as (typeof sourceSummaryOrder)[number])
        : "rules";

      counts[source] += 1;

      if (row.item.confidenceScore >= 0.75 && !row.item.needsReview) {
        highConfidenceCount += 1;
      }

      if (
        row.item.classificationSource !== "learned" &&
        row.item.classificationSource !== "ai" &&
        (row.item.needsReview || row.item.confidenceScore < 0.7 || row.item.classificationSource === "inherited_header")
      ) {
        refinementQueueCount += 1;
      }
    }

    return {
      counts,
      highConfidenceCount,
      refinementQueueCount,
      total: allRows.length,
    };
  }, [allRows]);
  const confidencePercent =
    sourceSummary.total > 0 ? Math.round((sourceSummary.highConfidenceCount / sourceSummary.total) * 100) : 0;

  function displayDraft(row: FlatSystemRow) {
    return drafts[row.item.id] || savedOverrides[row.item.id] || draftForItem(row.item, row.system.name, row.category.name);
  }

  function updateDraft(itemId: string, patch: Partial<DraftChange>) {
    const row = originalById.get(itemId);

    if (!row) {
      return;
    }

    const current = displayDraft(row);
    const nextDraft = { ...current, ...patch };
    const next = patchChangesClassification(patch) ? normalizeDraftChange(nextDraft) : nextDraft;

    setDrafts((previous) => ({
      ...previous,
      [itemId]: next,
    }));
  }

  function applyPatchToRows(rows: FlatSystemRow[], patch: Partial<DraftChange>) {
    if (rows.length === 0) {
      return;
    }

    setDrafts((previous) => {
      const next = { ...previous };

      for (const row of rows) {
        const current = next[row.item.id] || savedOverrides[row.item.id] || draftForItem(row.item, row.system.name, row.category.name);
        const nextDraft = { ...current, ...patch };
        next[row.item.id] = patchChangesClassification(patch) ? normalizeDraftChange(nextDraft) : nextDraft;
      }

      return next;
    });
  }

  function applyPatchToIds(itemIds: Iterable<string>, patch: Partial<DraftChange>) {
    const rows = Array.from(itemIds)
      .map((itemId) => originalById.get(itemId))
      .filter((row): row is FlatSystemRow => Boolean(row));

    applyPatchToRows(rows, patch);
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
    applyPatchToIds(selectedIds, patch);
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
        Row: item.sourceRowNumber ?? item.rowNumber,
        Section: item.sectionHeader || "",
        Sheet: item.sourceSheetName || item.sheetName,
        Subcategory: displaySubcategory(item),
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
      subcategoryName: draft.subcategoryName,
      systemName: draft.systemName,
    }));

    if (changes.length === 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice(null);
    setDraftNotice(null);

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

  async function confirmRowsAsCorrect(rows: FlatSystemRow[]) {
    if (rows.length === 0 || isConfirming) {
      return;
    }

    const changes = rows
      .map((row) => {
        const draft = displayDraft(row);

        return {
          categoryName: draft.categoryName,
          itemId: row.item.id,
          needsReview: false,
          subcategoryName: draft.subcategoryName,
          systemName: draft.systemName,
        };
      })
      .filter((change) => change.systemName !== NEEDS_REVIEW_SYSTEM && change.categoryName !== NEEDS_REVIEW_CATEGORY);

    if (changes.length === 0) {
      setNotice({
        tone: "error",
        message: "Choose a real system/category before confirming rows as correct.",
      });
      return;
    }

    setIsConfirming(true);
    setNotice(null);
    setDraftNotice(null);

    try {
      const formData = new FormData();
      formData.set("project_id", projectId);
      formData.set("changes", JSON.stringify(changes));
      const result = await bulkCorrectBoqItemClassifications(formData);

      if (!result.ok) {
        const message = result.error || "Could not confirm visible rows as correct.";
        console.error(message);
        setNotice({ tone: "error", message });
        return;
      }

      const confirmedIds = new Set(changes.map((change) => change.itemId));
      const confirmedOverrides = changes.reduce(
        (overrides, change) => ({
          ...overrides,
          [change.itemId]: {
            categoryName: change.categoryName,
            needsReview: false,
            subcategoryName: change.subcategoryName,
            systemName: change.systemName,
          },
        }),
        {} as Record<string, DraftChange>,
      );

      setSavedOverrides((previous) => ({ ...previous, ...confirmedOverrides }));
      setDrafts((previous) =>
        Object.fromEntries(Object.entries(previous).filter(([itemId]) => !confirmedIds.has(itemId))),
      );
      setSelectedIds((previous) => new Set(Array.from(previous).filter((itemId) => !confirmedIds.has(itemId))));
      setNotice({
        tone: "success",
        message: `Confirmed ${changes.length.toLocaleString()} visible rows as correct and saved them to classification memory.`,
      });
    } catch (error) {
      console.error(error);
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unknown classification confirmation error.",
      });
    } finally {
      setIsConfirming(false);
    }
  }

  function rowMoved(row: FlatSystemRow) {
    const saved = savedOverrides[row.item.id];

    return Boolean(
      saved &&
        (saved.systemName !== row.system.name ||
          saved.categoryName !== row.category.name ||
          saved.subcategoryName !== row.item.classificationSubcategory),
    );
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
          disabled={isClassifying || sourceSummary.refinementQueueCount === 0}
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
          {isClassifying
            ? "Refining..."
            : sourceSummary.refinementQueueCount > 0
              ? `AI refine ${sourceSummary.refinementQueueCount}`
              : "Classification complete"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <div className="rounded-2xl border border-[#bbf7d0] bg-[#ecfdf3] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087a36]">Classification progress</p>
              <p className="mt-2 text-2xl font-semibold text-[#07130f]">{confidencePercent}%</p>
              <p className="mt-1 text-sm text-[#64748b]">
                {sourceSummary.highConfidenceCount.toLocaleString()} of {sourceSummary.total.toLocaleString()} rows are high confidence.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0]">
              {sourceSummary.refinementQueueCount.toLocaleString()} queued
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[#16a34a]" style={{ width: `${confidencePercent}%` }} />
          </div>
          <p className="mt-3 text-xs text-[#64748b]">
            AI refinement updates low-confidence, inherited, and needs-review rows. Learned/manual rows stay locked.
          </p>
        </div>
        <div className="grid gap-2 rounded-2xl border border-[#e5e7eb] bg-[#fbfdfb] p-4 sm:grid-cols-5">
          {sourceSummaryOrder.map((source) => (
            <button
              className="rounded-xl border border-[#e5e7eb] bg-white p-3 text-left transition hover:border-[#bbf7d0] hover:bg-[#ecfdf3]"
              key={source}
              onClick={() => setSourceFilter(source)}
              type="button"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">{sourceLabel(source)}</p>
              <p className="mt-2 text-xl font-semibold text-[#07130f]">{sourceSummary.counts[source].toLocaleString()}</p>
            </button>
          ))}
        </div>
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

      <div className="mt-3 rounded-2xl border border-[#bbf7d0] bg-[#ecfdf3] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_11rem_12rem_12rem_auto_auto_auto] xl:items-end">
          <div>
            <p className="text-sm font-semibold text-[#07130f]">Bulk classify visible rows</p>
            <p className="mt-1 text-xs leading-5 text-[#64748b]">
              Filter or search the BOQ, choose the target system/category/subcategory, then apply it to the visible rows.
              Nothing is saved until you click Save changes.
            </p>
          </div>
          <label className="grid gap-1 text-xs font-semibold text-[#64748b]">
            System
            <select
              className="h-10 rounded-xl border border-[#bbf7d0] bg-white px-3 text-sm font-medium text-[#0f172a] outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
              onChange={(event) => {
                const nextSystem = event.currentTarget.value;
                const nextCategory = defaultCategoryForSystem(nextSystem);
                const nextSubcategory = defaultSubcategoryForDraft(nextSystem, nextCategory);
                setBulkSystem(nextSystem);
                setBulkCategory(nextCategory);
                setBulkSubcategory(nextSubcategory);
              }}
              value={bulkSystem}
            >
              {systemOptions.map((option) => (
                <option key={`visible-${option.systemName}`} value={option.systemName}>
                  {option.systemName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#64748b]">
            Category
            <select
              className="h-10 rounded-xl border border-[#bbf7d0] bg-white px-3 text-sm font-medium text-[#0f172a] outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
              onChange={(event) => {
                const nextCategory = event.currentTarget.value;
                const nextSubcategory = defaultSubcategoryForDraft(bulkSystem, nextCategory);
                setBulkCategory(nextCategory);
                setBulkSubcategory(nextSubcategory);
              }}
              value={bulkCategory}
            >
              {categoryOptionsForSystem(bulkSystem).map((category) => (
                <option key={`visible-${bulkSystem}-${category}`} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#64748b]">
            Subcategory
            <select
              className="h-10 rounded-xl border border-[#bbf7d0] bg-white px-3 text-sm font-medium text-[#0f172a] outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
              onChange={(event) => setBulkSubcategory(event.currentTarget.value)}
              value={bulkSubcategory || ""}
            >
              <option value="">Choose subcategory</option>
              {getSubcategoryOptions(bulkSystem, bulkCategory).map((subcategory) => (
                <option key={`visible-${bulkSystem}-${bulkCategory}-${subcategory}`} value={subcategory}>
                  {subcategory}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.18)] transition hover:bg-[#087a36] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={filteredRows.length === 0}
            onClick={() => {
              applyPatchToRows(filteredRows, {
                categoryName: bulkCategory,
                needsReview: false,
                subcategoryName: bulkSubcategory,
                systemName: bulkSystem,
              });
              setDraftNotice(
                `Prepared ${filteredRows.length.toLocaleString()} visible rows. Review the draft changes, then click Save changes.`,
              );
            }}
            type="button"
          >
            Apply to {filteredRows.length.toLocaleString()} visible
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#087a36] ring-1 ring-[#bbf7d0] transition hover:bg-[#f0fdf4] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!filteredRows.some((row) => row.item.needsReview)}
            onClick={() => {
              const needsReviewRows = filteredRows.filter((row) => row.item.needsReview);
              applyPatchToRows(needsReviewRows, {
                categoryName: bulkCategory,
                needsReview: false,
                subcategoryName: bulkSubcategory,
                systemName: bulkSystem,
              });
              setDraftNotice(
                `Prepared ${needsReviewRows.length.toLocaleString()} visible needs-review rows. Click Save changes to store them.`,
              );
            }}
            type="button"
          >
            Apply to Needs Review
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#0f172a] ring-1 ring-[#bbf7d0] transition hover:bg-[#f0fdf4] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={filteredRows.length === 0 || isConfirming}
            onClick={() => void confirmRowsAsCorrect(filteredRows)}
            type="button"
          >
            <Save aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
            {isConfirming ? "Confirming..." : "Confirm visible as correct"}
          </button>
        </div>
        {draftNotice ? (
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0]">
            {draftNotice}
          </p>
        ) : null}
      </div>

      {selectedCount > 0 || dirtyCount > 0 ? (
        <div className="sticky top-3 z-20 mt-5 rounded-2xl border border-[#bbf7d0] bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="grid gap-3 xl:grid-cols-[auto_11rem_12rem_12rem_auto_auto_auto_auto] xl:items-center">
            <p className="text-sm font-semibold text-[#0f172a]">
              {selectedCount} selected / {dirtyCount} unsaved
            </p>
            <select
              className="h-10 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
              onChange={(event) => {
                const nextSystem = event.currentTarget.value;
                const nextCategory = defaultCategoryForSystem(nextSystem);
                const nextSubcategory = defaultSubcategoryForDraft(nextSystem, nextCategory);
                setBulkSystem(nextSystem);
                setBulkCategory(nextCategory);
                setBulkSubcategory(nextSubcategory);
                applyBulkPatch({ categoryName: nextCategory, subcategoryName: nextSubcategory, systemName: nextSystem });
              }}
              value={bulkSystem}
            >
              {systemOptions.map((option) => (
                <option key={option.systemName} value={option.systemName}>
                  {option.systemName}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
              onChange={(event) => {
                const nextCategory = event.currentTarget.value;
                const nextSubcategory = defaultSubcategoryForDraft(bulkSystem, nextCategory);
                setBulkCategory(nextCategory);
                setBulkSubcategory(nextSubcategory);
                applyBulkPatch({ categoryName: nextCategory, subcategoryName: nextSubcategory });
              }}
              value={bulkCategory}
            >
              {categoryOptionsForSystem(bulkSystem).map((category) => (
                <option key={`${bulkSystem}-${category}`} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
              onChange={(event) => {
                setBulkSubcategory(event.currentTarget.value);
                applyBulkPatch({ subcategoryName: event.currentTarget.value });
              }}
              value={bulkSubcategory || ""}
            >
              <option value="">Choose subcategory</option>
              {getSubcategoryOptions(bulkSystem, bulkCategory).map((subcategory) => (
                <option key={`${bulkSystem}-${bulkCategory}-${subcategory}`} value={subcategory}>
                  {subcategory}
                </option>
              ))}
            </select>
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
                setDraftNotice(null);
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
                        {visibleSystemRows.length} visible / {system.itemCount} total items / {system.categories.length} section groups
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
                  const subcategoryCounts = Array.from(
                    rows
                      .reduce((counts, row) => {
                        const name = displaySubcategory(row.item);

                        counts.set(name, (counts.get(name) || 0) + 1);
                        return counts;
                      }, new Map<string, number>())
                      .entries(),
                  ).sort((a, b) => b[1] - a[1]);

                  return (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white" key={category.name}>
                      <div className="grid min-w-[1120px] grid-cols-[2.5rem_minmax(22rem,1fr)_11rem_7rem_5rem_7rem_minmax(24rem,30rem)] gap-3 bg-[#fbfdfb] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
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
                          <span className="mt-2 flex flex-wrap gap-1 normal-case tracking-normal">
                            {subcategoryCounts.slice(0, 5).map(([subcategory, count]) => (
                              <span
                                className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#64748b] ring-1 ring-[#e5e7eb]"
                                key={`${category.name}-${subcategory}`}
                              >
                                {subcategory}: {count}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span>Subcategory</span>
                        <span className="text-right">Quantity</span>
                        <span>Unit</span>
                        <span className="text-right">Amount</span>
                        <span>Draft classification</span>
                      </div>
                      <div className="min-w-[1120px] divide-y divide-[#edf0ed]">
                        {rows.map((row) => {
                          const item = row.item;
                          const draft = displayDraft(row);
                          const isDirty = Boolean(drafts[item.id]);
                          const willMove =
                            draft.systemName !== row.system.name ||
                            draft.categoryName !== row.category.name ||
                            draft.subcategoryName !== item.classificationSubcategory;
                          const moved = rowMoved(row);

                          return (
                            <div
                              className="grid grid-cols-[2.5rem_minmax(22rem,1fr)_11rem_7rem_5rem_7rem_minmax(24rem,30rem)] gap-3 px-4 py-3 text-sm"
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
                                  {displaySubcategory(item) !== category.name ? <span>{displaySubcategory(item)}</span> : null}
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
                                {(item.sourceSheetName || item.sectionHeader || item.sourceRowNumber) && (
                                  <span className="mt-1 block text-xs text-[#94a3b8]">
                                    {item.sourceSheetName ? `Sheet: ${item.sourceSheetName}` : null}
                                    {item.sectionHeader ? ` · Section: ${item.sectionHeader}` : null}
                                    {item.sourceRowNumber ? ` · Row: ${item.sourceRowNumber}` : null}
                                  </span>
                                )}
                              </span>
                              <span className="text-[#64748b]">{displaySubcategory(item)}</span>
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
                                    const nextCategory = defaultCategoryForSystem(nextSystem);
                                    updateDraft(item.id, {
                                      categoryName: nextCategory,
                                      subcategoryName: defaultSubcategoryForDraft(nextSystem, nextCategory),
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
                                <select
                                  className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-2 text-xs outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                                  onChange={(event) => {
                                    const nextCategory = event.currentTarget.value;
                                    updateDraft(item.id, {
                                      categoryName: nextCategory,
                                      subcategoryName: defaultSubcategoryForDraft(draft.systemName, nextCategory),
                                    });
                                  }}
                                  value={draft.categoryName}
                                >
                                  {categoryOptionsForSystem(draft.systemName).map((categoryOption) => (
                                    <option key={`${item.id}-${draft.systemName}-${categoryOption}`} value={categoryOption}>
                                      {categoryOption}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-2 text-xs outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7] sm:col-span-2"
                                  onChange={(event) => updateDraft(item.id, { subcategoryName: event.currentTarget.value })}
                                  value={draft.subcategoryName || ""}
                                >
                                  <option value="">Choose subcategory</option>
                                  {getSubcategoryOptions(draft.systemName, draft.categoryName).map((subcategoryOption) => (
                                    <option
                                      key={`${item.id}-${draft.systemName}-${draft.categoryName}-${subcategoryOption}`}
                                      value={subcategoryOption}
                                    >
                                      {subcategoryOption}
                                    </option>
                                  ))}
                                </select>
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
