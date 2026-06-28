"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Save,
  Search,
  Sparkles,
} from "lucide-react";
import { bulkCorrectBoqItemClassifications, classifyProjectBoqItems } from "@/app/projects/actions";
import {
  getCategoryOptions,
  getSubcategoryOptions,
  getSystemRuleOptions,
  NEEDS_REVIEW_CATEGORY,
  NEEDS_REVIEW_SYSTEM,
} from "@/lib/classification";
import { getSimilarItemMatch, type SimilarItemMatch } from "@/lib/classification/similar-items";
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

type SimilarCandidate = FlatSystemRow & {
  match: SimilarItemMatch;
};

type SavedState = "idle" | "saving" | "saved";

function defaultSubcategoryForDraft(systemName: string, categoryName: string) {
  if (categoryName === NEEDS_REVIEW_CATEGORY || systemName === NEEDS_REVIEW_SYSTEM) {
    return null;
  }

  return null;
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

  return item.inheritedSubcategory || item.subcategory || item.sectionHeader || item.category || "Unclassified";
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

function confidenceTone(confidence: number, needsReview: boolean) {
  if (needsReview) {
    return "review";
  }

  if (confidence >= 0.85) {
    return "high";
  }

  if (confidence >= 0.65) {
    return "medium";
  }

  return "low";
}

export function ConfidenceBadge({
  confidence,
  needsReview,
}: {
  confidence: number;
  needsReview: boolean;
}) {
  const tone = confidenceTone(confidence, needsReview);
  const className =
    tone === "high"
      ? "bg-[#ecfdf3] text-[#087a36] ring-[#bbf7d0]"
      : tone === "medium"
        ? "bg-[#fefce8] text-[#a16207] ring-[#fde68a]"
        : "bg-[#fff7ed] text-[#c2410c] ring-[#fed7aa]";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${className}`}>
      {needsReview ? "Needs review" : `${Math.round(confidence * 100)}% confidence`}
    </span>
  );
}

export function AIReason({ reason }: { reason?: string | null }) {
  return (
    <div className="rounded-2xl border border-[#ede9fe] bg-[#faf5ff] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
        <Brain aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        AI reason
      </div>
      <p className="mt-2 text-sm leading-6 text-[#64748b]">
        {reason || "Mnelo matched this item using the available BOQ context and classification memory."}
      </p>
    </div>
  );
}

export function ClassificationSuggestion({
  draft,
  item,
}: {
  draft: DraftChange;
  item: SystemBoqItem;
}) {
  const suggestion = [
    { label: "System", value: draft.systemName },
    { label: "Category", value: draft.categoryName },
    { label: "Subcategory", value: draft.subcategoryName || "Needs review" },
  ];

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-[#fbfdfb] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">AI suggestion</p>
          <p className="mt-1 text-sm text-[#64748b]">{sourceLabel(item.classificationSource)} classification</p>
        </div>
        <ConfidenceBadge confidence={item.confidenceScore} needsReview={item.needsReview || draft.needsReview} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {suggestion.map((entry) => (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-3" key={entry.label}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">{entry.label}</p>
            <p className="mt-2 text-sm font-semibold text-[#0f172a]">{entry.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchableClassificationPicker({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string | null;
}) {
  const [query, setQuery] = useState("");
  const filteredOptions = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8);

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">{label}</p>
      <input
        className="mt-2 h-10 w-full rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-3 text-sm font-semibold text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder={value || placeholder}
        value={query}
      />
      <div className="mt-2 grid max-h-52 gap-1 overflow-y-auto pr-1">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => {
            const selected = option === value;

            return (
              <button
                className={`rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  selected ? "bg-[#ecfdf3] text-[#087a36]" : "text-[#334155] hover:bg-[#f8fafc]"
                }`}
                key={option}
                onClick={() => {
                  onChange(option);
                  setQuery("");
                }}
                type="button"
              >
                {option}
              </button>
            );
          })
        ) : (
          <p className="px-3 py-2 text-sm text-[#94a3b8]">No matches.</p>
        )}
      </div>
    </div>
  );
}

export function RecentlyUsedClassifications({
  onSelect,
  recent,
}: {
  onSelect: (draft: DraftChange) => void;
  recent: DraftChange[];
}) {
  if (recent.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Recently used</p>
      <div className="mt-2 grid gap-2">
        {recent.slice(0, 4).map((draft) => (
          <button
            className="rounded-xl bg-[#f8fafc] px-3 py-2 text-left text-xs font-semibold text-[#334155] transition hover:bg-[#ecfdf3] hover:text-[#087a36]"
            key={`${draft.systemName}-${draft.categoryName}-${draft.subcategoryName}`}
            onClick={() => onSelect(draft)}
            type="button"
          >
            {draft.systemName} / {draft.categoryName} / {draft.subcategoryName || "Needs review"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SavedStateIndicator({ state }: { state: SavedState }) {
  if (state === "saving") {
    return <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-[#64748b]">Saving...</span>;
  }

  if (state === "saved") {
    return <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#087a36]">Saved</span>;
  }

  return <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#94a3b8] ring-1 ring-[#e5e7eb]">Ready</span>;
}

export function KeyboardShortcutsHint() {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-3 text-xs leading-6 text-[#64748b]">
      <span className="font-semibold text-[#0f172a]">Shortcuts:</span> Enter approve · S skip · N needs review · Ctrl/Cmd+K
      search · ←/→ previous/next · Esc close panel
    </div>
  );
}

export function ClassificationEditorPanel({
  draft,
  isSaving,
  onAutoSave,
  onChangeDraft,
  recentClassifications,
  savedState,
}: {
  draft: DraftChange;
  isSaving: boolean;
  onAutoSave: (draft: DraftChange) => void;
  onChangeDraft: (patch: Partial<DraftChange>) => void;
  recentClassifications: DraftChange[];
  savedState: SavedState;
}) {
  const systemNames = systemOptions.map((option) => option.systemName);
  const categories = categoryOptionsForSystem(draft.systemName).filter((category) => category !== NEEDS_REVIEW_CATEGORY);
  const subcategories =
    draft.categoryName && draft.categoryName !== NEEDS_REVIEW_CATEGORY ? getSubcategoryOptions(draft.systemName, draft.categoryName) : [];

  function selectRecent(nextDraft: DraftChange) {
    onChangeDraft(nextDraft);
    onAutoSave(normalizeDraftChange(nextDraft));
  }

  return (
    <aside className="grid content-start gap-3 rounded-[20px] border border-[#e5e7eb] bg-[#fbfdfb] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Classification</p>
          <p className="mt-1 text-sm text-[#64748b]">Search, select, and continue.</p>
        </div>
        <SavedStateIndicator state={isSaving ? "saving" : savedState} />
      </div>

      <RecentlyUsedClassifications onSelect={selectRecent} recent={recentClassifications} />

      <SearchableClassificationPicker
        label="System"
        onChange={(systemName) =>
          onChangeDraft({
            categoryName: NEEDS_REVIEW_CATEGORY,
            needsReview: true,
            subcategoryName: null,
            systemName,
          })
        }
        options={systemNames}
        placeholder="Search system..."
        value={draft.systemName}
      />

      <SearchableClassificationPicker
        label="Category"
        onChange={(categoryName) =>
          onChangeDraft({
            categoryName,
            needsReview: true,
            subcategoryName: null,
          })
        }
        options={categories}
        placeholder="Search category..."
        value={draft.categoryName === NEEDS_REVIEW_CATEGORY ? null : draft.categoryName}
      />

      {draft.categoryName === NEEDS_REVIEW_CATEGORY ? (
        <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-4 text-sm leading-6 text-[#64748b]">
          Choose a category to show matching subcategories. Mnelo will not select the first option automatically.
        </div>
      ) : (
        <SearchableClassificationPicker
          label="Subcategory"
          onChange={(subcategoryName) => {
            const nextDraft = normalizeDraftChange({
              ...draft,
              needsReview: false,
              subcategoryName,
            });

            onChangeDraft(nextDraft);
            onAutoSave(nextDraft);
          }}
          options={subcategories}
          placeholder="Search subcategory..."
          value={draft.subcategoryName}
        />
      )}

      <KeyboardShortcutsHint />
    </aside>
  );
}

export function ReviewActions({
  canContinue,
  isSaving,
  onApprove,
  onMarkNeedsReview,
  onSave,
  onSkip,
}: {
  canContinue: boolean;
  isSaving: boolean;
  onApprove: () => void;
  onMarkNeedsReview: () => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-[#e5e7eb] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <button
        className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(22,163,74,0.22)] transition hover:bg-[#087a36] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canContinue || isSaving}
        onClick={onApprove}
        type="button"
      >
        <CheckCircle2 aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
        {isSaving ? "Saving..." : "Approve & Next"}
      </button>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="inline-flex h-11 items-center justify-center rounded-[14px] bg-white px-4 text-sm font-semibold text-[#0f172a] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canContinue || isSaving}
          onClick={onSave}
          type="button"
        >
          <Save aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
          Save Changes
        </button>
        <button
          className="inline-flex h-11 items-center justify-center rounded-[14px] bg-white px-4 text-sm font-semibold text-[#64748b] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={onSkip}
          type="button"
        >
          Skip
        </button>
        <button
          className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#fff7ed] px-4 text-sm font-semibold text-[#c2410c] ring-1 ring-[#fed7aa] transition hover:bg-[#ffedd5] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={onMarkNeedsReview}
          type="button"
        >
          Mark as Needs Review
        </button>
      </div>
    </div>
  );
}

export function ClassificationReview({
  currentIndex,
  draft,
  item,
  onApprove,
  onAutoSave,
  onChangeDraft,
  onMarkNeedsReview,
  onSave,
  onSelectSimilar,
  onSkip,
  recentClassifications,
  savedState,
  similarCount,
  totalCount,
  system,
  category,
  isSaving,
}: {
  category: ProjectSystemCategory;
  currentIndex: number;
  draft: DraftChange;
  isSaving: boolean;
  item: SystemBoqItem;
  onApprove: () => void;
  onAutoSave: (draft: DraftChange) => void;
  onChangeDraft: (patch: Partial<DraftChange>) => void;
  onMarkNeedsReview: () => void;
  onSave: () => void;
  onSelectSimilar: () => void;
  onSkip: () => void;
  recentClassifications: DraftChange[];
  savedState: SavedState;
  similarCount: number;
  system: ProjectSystemSummary;
  totalCount: number;
}) {
  const canSave = Boolean(draft.systemName && draft.categoryName && (draft.needsReview || draft.subcategoryName));

  return (
    <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#16a34a]">Classification Review</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">
            Item {currentIndex + 1} / {totalCount}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
            Approve the AI suggestion or adjust it. Saved corrections update Mnelo memory for future BOQs.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center rounded-[14px] bg-[#f5f3ff] px-4 text-sm font-semibold text-[#6d28d9] ring-1 ring-[#ddd6fe] transition hover:bg-[#ede9fe]"
          disabled={similarCount === 0}
          onClick={onSelectSimilar}
          type="button"
        >
          <Brain aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
          Review similar items ({similarCount})
        </button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-4">
          <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Item description</p>
            <p className="mt-3 text-lg font-semibold leading-8 text-[#0f172a]">{item.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#64748b]">
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold ring-1 ring-[#e5e7eb]">Current: {system.name}</span>
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold ring-1 ring-[#e5e7eb]">
                Group: {category.name}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold ring-1 ring-[#e5e7eb]">
                Saved subcategory: {displaySubcategory(item)}
              </span>
              {item.sourceSheetName ? (
                <span className="rounded-full bg-white px-2.5 py-1 font-semibold ring-1 ring-[#e5e7eb]">
                  Sheet: {item.sourceSheetName}
                </span>
              ) : null}
              {item.sourceRowNumber ? (
                <span className="rounded-full bg-white px-2.5 py-1 font-semibold ring-1 ring-[#e5e7eb]">
                  Row: {item.sourceRowNumber}
                </span>
              ) : null}
            </div>
          </div>

          <ClassificationSuggestion draft={draft} item={item} />
          <AIReason reason={item.classificationReason} />
        </div>

        <div className="grid gap-3">
          <ClassificationEditorPanel
            draft={draft}
            isSaving={isSaving}
            onAutoSave={onAutoSave}
            onChangeDraft={onChangeDraft}
            recentClassifications={recentClassifications}
            savedState={savedState}
          />
          <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e5e7eb]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Takeoff</p>
            <p className="mt-2 text-sm font-semibold text-[#0f172a]">
              {(item.takeoffQuantity ?? item.quantity ?? 0).toLocaleString()} {item.takeoffUnit || item.unit || "item"}
            </p>
            <p className="mt-1 text-sm text-[#64748b]">{item.amount === null ? "No amount extracted" : `${item.amount.toLocaleString()} total`}</p>
          </div>
          {draft.needsReview ? (
            <div className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm font-semibold text-[#c2410c]">
              This item will stay in review until a final category is confirmed.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <ReviewActions
          canContinue={canSave}
          isSaving={isSaving}
          onApprove={onApprove}
          onMarkNeedsReview={onMarkNeedsReview}
          onSave={onSave}
          onSkip={onSkip}
        />
      </div>
    </div>
  );
}

export function ProjectSystemsPanel({
  projectId,
  systems,
}: {
  projectId: string;
  systems: ProjectSystemSummary[];
}) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftChange>>({});
  const [selectedSimilarIds, setSelectedSimilarIds] = useState<string[]>([]);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, DraftChange>>({});
  const [recentClassifications, setRecentClassifications] = useState<DraftChange[]>([]);
  const [savedState, setSavedState] = useState<SavedState>("idle");
  const [showSimilarReview, setShowSimilarReview] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [systemFilter, setSystemFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<(typeof sourceOptions)[number]>("all");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [search, setSearch] = useState("");

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
  const focusedRow = filteredRows.find((row) => row.item.id === activeItemId) || filteredRows[0] || null;
  const focusedIndex = focusedRow ? filteredRows.findIndex((row) => row.item.id === focusedRow.item.id) : -1;
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
      needsReviewCount: allRows.filter((row) => row.item.needsReview).length,
      total: allRows.length,
    };
  }, [allRows]);
  const reviewedCount = Math.max(0, sourceSummary.total - sourceSummary.needsReviewCount);
  const reviewedPercent = sourceSummary.total > 0 ? Math.round((reviewedCount / sourceSummary.total) * 100) : 0;

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
    const next = "systemName" in patch || "categoryName" in patch || "subcategoryName" in patch ? normalizeDraftChange(nextDraft) : nextDraft;

    setSavedState("idle");
    setDrafts((previous) => ({
      ...previous,
      [itemId]: next,
    }));
  }

  function nextRowAfter(itemId: string) {
    const index = filteredRows.findIndex((row) => row.item.id === itemId);

    return filteredRows[index + 1] || filteredRows[index] || filteredRows[0] || null;
  }

  function previousRowBefore(itemId: string) {
    const index = filteredRows.findIndex((row) => row.item.id === itemId);

    return filteredRows[Math.max(0, index - 1)] || filteredRows[0] || null;
  }

  function rememberClassification(draft: DraftChange) {
    if (!hasCompleteDraftClassification(draft)) {
      return;
    }

    setRecentClassifications((previous) => {
      const key = `${draft.systemName}-${draft.categoryName}-${draft.subcategoryName}`;
      const next = [draft, ...previous.filter((entry) => `${entry.systemName}-${entry.categoryName}-${entry.subcategoryName}` !== key)];
      return next.slice(0, 6);
    });
  }

  async function saveDrafts(itemIds: string[], successMessage: string, continueAfterSave = false, forcedDraft?: DraftChange) {
    const changes = itemIds
      .map((itemId) => {
        const row = originalById.get(itemId);
        const draft = forcedDraft || (row ? displayDraft(row) : drafts[itemId]);

        if (!draft) {
          return null;
        }

        return {
          categoryName: draft.categoryName,
          itemId,
          needsReview: draft.needsReview,
          subcategoryName: draft.subcategoryName,
          systemName: draft.systemName,
        };
      })
      .filter((change): change is NonNullable<typeof change> => Boolean(change));

    if (changes.length === 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice(null);
    setSavedState("saving");

    try {
      const formData = new FormData();
      formData.set("project_id", projectId);
      formData.set("changes", JSON.stringify(changes));
      const result = await bulkCorrectBoqItemClassifications(formData);

      if (!result.ok) {
        const message = result.error || "Could not save manual classifications.";
        console.error(message);
        setNotice({ tone: "error", message });
        setSavedState("idle");
        return;
      }

      const savedDrafts = changes.reduce(
        (overrides, change) => ({
          ...overrides,
          [change.itemId]: {
            categoryName: change.categoryName,
            needsReview: change.needsReview,
            subcategoryName: change.subcategoryName,
            systemName: change.systemName,
          },
        }),
        {} as Record<string, DraftChange>,
      );

      setSavedOverrides((previous) => ({ ...previous, ...savedDrafts }));
      changes.forEach((change) =>
        rememberClassification({
          categoryName: change.categoryName,
          needsReview: change.needsReview,
          subcategoryName: change.subcategoryName,
          systemName: change.systemName,
        }),
      );
      setDrafts((previous) => Object.fromEntries(Object.entries(previous).filter(([itemId]) => !itemIds.includes(itemId))));
      setNotice({ tone: "success", message: successMessage });
      setSavedState("saved");

      if (continueAfterSave && itemIds[0]) {
        setActiveItemId(nextRowAfter(itemIds[0])?.item.id || null);
      }
    } catch (error) {
      console.error(error);
      setSavedState("idle");
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unknown classification error.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveUnsavedDrafts() {
    const itemIds = Object.keys(drafts);

    if (itemIds.length === 0 || isSavingBulk) {
      return;
    }

    setIsSavingBulk(true);
    setNotice(null);

    try {
      await saveDrafts(
        itemIds,
        `Classification saved. AI memory updated for ${itemIds.length.toLocaleString()} edited item${itemIds.length === 1 ? "" : "s"}.`,
      );
    } finally {
      setIsSavingBulk(false);
    }
  }

  function approveFocusedRow() {
    if (!focusedRow) {
      return;
    }

    const approvedDraft = normalizeDraftChange({ ...displayDraft(focusedRow), needsReview: false });
    updateDraft(focusedRow.item.id, approvedDraft);
    void saveDrafts([focusedRow.item.id], "Classification saved. AI memory updated.", true, approvedDraft);
  }

  function markFocusedNeedsReview() {
    if (!focusedRow) {
      return;
    }

    const reviewDraft = { ...displayDraft(focusedRow), needsReview: true };
    updateDraft(focusedRow.item.id, reviewDraft);
    void saveDrafts([focusedRow.item.id], "Classification saved. This item remains in review.", false, reviewDraft);
  }

  function skipFocusedRow() {
    if (!focusedRow) {
      return;
    }

    setActiveItemId(nextRowAfter(focusedRow.item.id)?.item.id || null);
  }

  function autoSaveFocusedRow(nextDraft: DraftChange) {
    if (!focusedRow || !hasCompleteDraftClassification(nextDraft)) {
      return;
    }

    void saveDrafts([focusedRow.item.id], "Saved", false, nextDraft);
  }

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "Escape") {
        setShowSimilarReview(false);
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        approveFocusedRow();
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        skipFocusedRow();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        markFocusedNeedsReview();
      } else if (event.key === "ArrowRight" && focusedRow) {
        event.preventDefault();
        setActiveItemId(nextRowAfter(focusedRow.item.id)?.item.id || null);
      } else if (event.key === "ArrowLeft" && focusedRow) {
        event.preventDefault();
        setActiveItemId(previousRowBefore(focusedRow.item.id)?.item.id || null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const similarCandidates = useMemo(() => {
    if (!focusedRow) {
      return [];
    }

    return filteredRows
      .filter((row) => row.item.id !== focusedRow.item.id)
      .map((row) => ({
        ...row,
        match: getSimilarItemMatch(focusedRow.item.description, row.item.description),
      }))
      .filter((row): row is SimilarCandidate => row.match.isSimilar)
      .sort((left, right) => right.match.score - left.match.score || left.item.description.localeCompare(right.item.description));
  }, [filteredRows, focusedRow]);

  return (
    <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 border-b border-[#e5e7eb] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#07130f]">Intelligence</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review Mnelo classifications, approve decisions, and teach the AI memory for future procurement packages.
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
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087a36]">Review progress</p>
              <p className="mt-2 text-2xl font-semibold text-[#07130f]">
                Reviewed {reviewedCount.toLocaleString()} / {sourceSummary.total.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-[#64748b]">
                Needs Review: {sourceSummary.needsReviewCount.toLocaleString()} · Auto-classified:{" "}
                {sourceSummary.highConfidenceCount.toLocaleString()}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0]">
              {sourceSummary.refinementQueueCount.toLocaleString()} waiting
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[#16a34a] transition-all" style={{ width: `${reviewedPercent}%` }} />
          </div>
          <p className="mt-3 text-xs text-[#64748b]">
            Approvals update classification memory. Learned/manual rows stay protected during future runs.
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
            ref={searchInputRef}
            className="h-10 w-full rounded-xl border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search item description..."
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
        <label className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#64748b]">
          <input
            checked={needsReviewOnly}
            className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a]"
            onChange={(event) => setNeedsReviewOnly(event.currentTarget.checked)}
            type="checkbox"
          />
          Needs Review
        </label>
      </div>

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

      {focusedRow ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <ClassificationReview
            category={focusedRow.category}
            currentIndex={Math.max(0, focusedIndex)}
            draft={displayDraft(focusedRow)}
            isSaving={isSaving}
            item={focusedRow.item}
            onApprove={approveFocusedRow}
            onAutoSave={autoSaveFocusedRow}
            onChangeDraft={(patch) => updateDraft(focusedRow.item.id, patch)}
            onMarkNeedsReview={markFocusedNeedsReview}
            onSave={() => void saveDrafts([focusedRow.item.id], "Classification saved. AI memory updated.")}
            onSelectSimilar={() => {
              if (similarCandidates.length === 0) {
                setNotice({ tone: "success", message: "No similar visible items found for this selection." });
                return;
              }

              setSelectedSimilarIds([]);
              setShowSimilarReview(true);
            }}
            onSkip={skipFocusedRow}
            recentClassifications={recentClassifications}
            savedState={savedState}
            similarCount={similarCandidates.length}
            system={focusedRow.system}
            totalCount={filteredRows.length}
          />

          {showSimilarReview ? (
            <div className="rounded-[20px] border border-[#ddd6fe] bg-[#faf5ff] p-5 xl:col-start-1">
              <div className="flex flex-col gap-3 border-b border-[#ddd6fe] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed]">Review similar items</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#0f172a]">Select only the rows that should receive this correction.</h3>
                  <p className="mt-1 text-sm leading-6 text-[#64748b]">
                    Candidates are unchecked by default. Same system or category is not enough; Mnelo only suggests strong product identity matches.
                  </p>
                </div>
                <button
                  className="rounded-[14px] bg-white px-4 py-2 text-sm font-semibold text-[#64748b] ring-1 ring-[#ddd6fe] transition hover:bg-[#f8fafc]"
                  onClick={() => {
                    setSelectedSimilarIds([]);
                    setShowSimilarReview(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Source item</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#0f172a]">{focusedRow.item.description}</p>
              </div>

              <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1">
                {similarCandidates.map((candidate) => {
                  const selected = selectedSimilarIds.includes(candidate.item.id);

                  return (
                    <label
                      className={`grid cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                        selected ? "border-[#7c3aed] bg-white" : "border-[#e5e7eb] bg-white/80 hover:border-[#c4b5fd]"
                      }`}
                      key={candidate.item.id}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          checked={selected}
                          className="mt-1 h-4 w-4 rounded border-[#cbd5e1] text-[#7c3aed] focus:ring-[#7c3aed]"
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setSelectedSimilarIds((previous) =>
                              checked
                                ? Array.from(new Set([...previous, candidate.item.id]))
                                : previous.filter((itemId) => itemId !== candidate.item.id),
                            );
                          }}
                          type="checkbox"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-6 text-[#0f172a]">{candidate.item.description}</p>
                          <p className="mt-1 text-xs font-medium text-[#64748b]">
                            {candidate.system.name} / {candidate.category.name} / {displaySubcategory(candidate.item)}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[#64748b]">
                        Why suggested: {candidate.match.reason}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#64748b]">
                  {selectedSimilarIds.length.toLocaleString()} selected. Saved rows stay editable after this action.
                </p>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(22,163,74,0.22)] transition hover:bg-[#087a36] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={selectedSimilarIds.length === 0 || isSaving}
                  onClick={() => {
                    const draft = displayDraft(focusedRow);
                    void saveDrafts(
                      selectedSimilarIds,
                      `Classification saved. AI memory updated for ${selectedSimilarIds.length.toLocaleString()} selected similar item${selectedSimilarIds.length === 1 ? "" : "s"}.`,
                      false,
                      draft,
                    );
                    setShowSimilarReview(false);
                    setSelectedSimilarIds([]);
                  }}
                  type="button"
                >
                  {isSaving ? "Saving..." : "Save selected corrections"}
                </button>
              </div>
            </div>
          ) : null}

          <aside className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfdfb] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Review queue</p>
                <p className="mt-1 text-sm text-[#64748b]">{filteredRows.length.toLocaleString()} visible decisions</p>
              </div>
              <button
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0] transition hover:bg-[#ecfdf3] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={dirtyCount === 0 || isSavingBulk}
                onClick={() => void saveUnsavedDrafts()}
                type="button"
              >
                {isSavingBulk ? "Saving..." : dirtyCount > 0 ? `Save unsaved (${dirtyCount})` : "No unsaved rows"}
              </button>
            </div>
            <div className="mt-4 grid max-h-[720px] gap-2 overflow-y-auto pr-1">
              {filteredRows.map((row) => {
                const active = row.item.id === focusedRow.item.id;
                const draft = displayDraft(row);
                const dirty = Boolean(drafts[row.item.id]);

                return (
                  <button
                    className={`rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-[#16a34a] bg-[#ecfdf3] shadow-[0_14px_30px_rgba(22,163,74,0.12)]"
                        : "border-[#e5e7eb] bg-white hover:border-[#bbf7d0] hover:bg-[#f8faf8]"
                    }`}
                    key={row.item.id}
                    onClick={() => setActiveItemId(row.item.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#0f172a]">{row.item.description}</p>
                      {row.item.needsReview || draft.needsReview ? (
                        <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-[#f59e0b]" strokeWidth={2} />
                      ) : (
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-[#16a34a]" strokeWidth={2} />
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-[11px] font-semibold text-[#64748b] ring-1 ring-[#e5e7eb]">
                        {draft.systemName}
                      </span>
                      <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-[11px] font-semibold text-[#64748b] ring-1 ring-[#e5e7eb]">
                        {draft.subcategoryName || "Needs review"}
                      </span>
                      {dirty ? (
                        <span className="rounded-full bg-[#f5f3ff] px-2 py-0.5 text-[11px] font-semibold text-[#7c3aed] ring-1 ring-[#ddd6fe]">
                          Unsaved
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      ) : (
        <div className="mt-5">
          {systems.length === 0 ? (
            <EmptyState
              title="No systems yet"
              description="Upload and parse a BOQ file, then run classification to create project systems and takeoff summaries."
            />
          ) : (
            <EmptyState
              title="No matching review items"
              description="Adjust filters or search to continue reviewing classifications."
            />
          )}
        </div>
      )}
    </section>
  );
}
