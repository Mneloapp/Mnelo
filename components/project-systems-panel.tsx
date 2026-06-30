"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
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
import { MneloLogo } from "@/components/MneloLogo";
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

type UndoEntry = {
  itemIds: string[];
  previousDrafts: Record<string, DraftChange>;
};

type ReviewGroup = {
  key: string;
  name: string;
  needsReviewCount: number;
  rows: FlatSystemRow[];
  totalCount: number;
};

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

function groupNameForRow(row: FlatSystemRow) {
  const subcategory = displaySubcategory(row.item);

  if (subcategory && subcategory !== "Unclassified" && subcategory !== "Needs review") {
    return subcategory;
  }

  if (row.category.name && row.category.name !== NEEDS_REVIEW_CATEGORY) {
    return row.category.name;
  }

  return "Others";
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

function SelectField({
  label,
  onChange,
  options,
  readOnly = false,
  value,
}: {
  label: string;
  onChange?: (value: string) => void;
  options: string[];
  readOnly?: boolean;
  value: string | null;
}) {
  const normalizedValue = value || "";

  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-[#334155]">{label}</span>
      <select
        className="h-10 w-full appearance-none rounded-lg border border-[#dbe3ee] bg-white bg-[linear-gradient(45deg,transparent_50%,#64748b_50%),linear-gradient(135deg,#64748b_50%,transparent_50%)] bg-[length:5px_5px,5px_5px] bg-[position:calc(100%-18px)_17px,calc(100%-13px)_17px] bg-no-repeat px-3 pr-9 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7] disabled:cursor-default disabled:opacity-100"
        disabled={readOnly}
        onChange={(event) => onChange?.(event.currentTarget.value)}
        value={normalizedValue}
      >
        {normalizedValue ? null : <option value="">Needs review</option>}
        {normalizedValue && !options.includes(normalizedValue) ? <option value={normalizedValue}>{normalizedValue}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AIReason({ reason }: { reason?: string | null }) {
  return (
    <div className="rounded-b-2xl border-x border-b border-[#e5e7eb] bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
        <Sparkles aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        <span className="text-[#0f172a]">AI Reason</span>
      </div>
      <p className="mt-2 pl-6 text-sm leading-6 text-[#475569]">
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
    { label: "System", options: systemOptions.map((option) => option.systemName), value: draft.systemName },
    { label: "Category", options: categoryOptionsForSystem(draft.systemName), value: draft.categoryName },
    {
      label: "Subcategory",
      options:
        draft.categoryName && draft.categoryName !== NEEDS_REVIEW_CATEGORY
          ? getSubcategoryOptions(draft.systemName, draft.categoryName)
          : [],
      value: draft.subcategoryName || "Needs review",
    },
  ];

  return (
    <div className="rounded-t-2xl border border-[#e5e7eb] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-base font-semibold text-[#6d28d9]">
          <Sparkles aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          AI Suggestion
        </p>
        <ConfidenceBadge confidence={item.confidenceScore} needsReview={item.needsReview || draft.needsReview} />
      </div>
      <p className="mt-1 text-xs font-semibold text-[#64748b]">{sourceLabel(item.classificationSource)} classification</p>
      <div className="mt-4 grid gap-3">
        {suggestion.map((entry) => (
          <SelectField key={entry.label} label={entry.label} options={entry.options} readOnly value={entry.value} />
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
    <div className="rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-xs font-semibold text-[#475569] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      ⌘ Shortcuts: Enter = Next <span className="mx-2 text-[#cbd5e1]">|</span> S = Skip{" "}
      <span className="mx-2 text-[#cbd5e1]">|</span> N = Needs Review{" "}
      <span className="mx-2 text-[#cbd5e1]">|</span> Ctrl+K = Search
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#64748b]">{label}</span>
      <span className="font-semibold text-[#0f172a]">{value}</span>
    </div>
  );
}

export function ClassificationEditorPanel({
  draft,
  isSaving,
  onAutoSave,
  onChangeDraft,
  savedState,
}: {
  draft: DraftChange;
  isSaving: boolean;
  onAutoSave: (draft: DraftChange) => void;
  onChangeDraft: (patch: Partial<DraftChange>) => void;
  savedState: SavedState;
}) {
  const systemNames = systemOptions.map((option) => option.systemName);
  const categories = categoryOptionsForSystem(draft.systemName).filter((category) => category !== NEEDS_REVIEW_CATEGORY);
  const subcategories =
    draft.categoryName && draft.categoryName !== NEEDS_REVIEW_CATEGORY ? getSubcategoryOptions(draft.systemName, draft.categoryName) : [];

  return (
    <aside className="grid content-start gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0f172a]">Need to change something?</p>
        </div>
        <SavedStateIndicator state={isSaving ? "saving" : savedState} />
      </div>

      <SelectField
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
        value={draft.systemName}
      />

      <SelectField
        label="Category"
        onChange={(categoryName) =>
          onChangeDraft({
            categoryName,
            needsReview: true,
            subcategoryName: null,
          })
        }
        options={categories}
        value={draft.categoryName === NEEDS_REVIEW_CATEGORY ? null : draft.categoryName}
      />

      {draft.categoryName === NEEDS_REVIEW_CATEGORY ? (
        <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-3 text-sm leading-6 text-[#64748b]">
          Choose a category to show matching subcategories. Mnelo will not select the first option automatically.
        </div>
      ) : (
        <SelectField
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
          value={draft.subcategoryName}
        />
      )}
    </aside>
  );
}

export function ReviewActions({
  canContinue,
  isSaving,
  onApprove,
  onApplyToSelected,
  onMarkNeedsReview,
  onSave,
  onSkip,
  selectedCount,
}: {
  canContinue: boolean;
  isSaving: boolean;
  onApprove: () => void;
  onApplyToSelected: () => void;
  onMarkNeedsReview: () => void;
  onSave: () => void;
  onSkip: () => void;
  selectedCount: number;
}) {
  const isBulkMode = selectedCount > 0;

  return (
    <div className="grid gap-3 border-t border-[#e5e7eb] pt-4">
      <button
        className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#16a34a] px-5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(22,163,74,0.22)] transition hover:bg-[#087a36] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canContinue || isSaving}
        onClick={isBulkMode ? onApplyToSelected : onApprove}
        type="button"
      >
        <CheckCircle2 aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
        {isSaving ? "Saving..." : isBulkMode ? `Apply to ${selectedCount.toLocaleString()} selected` : "Approve & Next"}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button
          className="inline-flex h-11 items-center justify-center rounded-[14px] bg-white px-4 text-sm font-semibold text-[#64748b] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={onSkip}
          type="button"
        >
          Skip
        </button>
        <button
          className="inline-flex h-11 items-center justify-center rounded-[14px] bg-white px-4 text-sm font-semibold text-[#0f172a] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={onMarkNeedsReview}
          type="button"
        >
          Needs Review
        </button>
      </div>
      <button
        className="inline-flex h-10 items-center justify-center rounded-[14px] bg-white px-4 text-sm font-semibold text-[#64748b] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canContinue || isSaving || isBulkMode}
        onClick={onSave}
        type="button"
      >
        <Save aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
        Save only
      </button>
    </div>
  );
}

export function ClassificationReview({
  currentIndex,
  draft,
  item,
  canUndo,
  selectedCount,
  onApprove,
  onApplyToSelected,
  onAutoSave,
  onChangeDraft,
  onMarkNeedsReview,
  onNext,
  onPrevious,
  onSave,
  onSelectSimilar,
  onSkip,
  onUndo,
  savedState,
  similarCount,
  totalCount,
  isSaving,
  isUndoing,
}: {
  canUndo: boolean;
  currentIndex: number;
  draft: DraftChange;
  isSaving: boolean;
  isUndoing: boolean;
  item: SystemBoqItem;
  selectedCount: number;
  onApprove: () => void;
  onApplyToSelected: () => void;
  onAutoSave: (draft: DraftChange) => void;
  onChangeDraft: (patch: Partial<DraftChange>) => void;
  onMarkNeedsReview: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSave: () => void;
  onSelectSimilar: () => void;
  onSkip: () => void;
  onUndo: () => void;
  savedState: SavedState;
  similarCount: number;
  totalCount: number;
}) {
  const canSave = Boolean(draft.systemName && draft.categoryName && (draft.needsReview || draft.subcategoryName));

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3">
        <button
          className="grid h-10 w-10 place-items-center rounded-lg border border-[#e5e7eb] bg-white text-[#334155] transition hover:bg-[#f8fafc]"
          onClick={onPrevious}
          type="button"
          aria-label="Previous item"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        </button>
        <p className="text-base font-semibold text-[#0f172a]">
          Item {currentIndex + 1} of {totalCount}
        </p>
        <button
          className="grid h-10 w-10 place-items-center rounded-lg border border-[#e5e7eb] bg-white text-[#334155] transition hover:bg-[#f8fafc]"
          onClick={onNext}
          type="button"
          aria-label="Next item"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ClassificationSuggestion draft={draft} item={item} />
        <AIReason reason={item.classificationReason} />

        <div className="mt-3">
          <ClassificationEditorPanel
            draft={draft}
            isSaving={isSaving}
            onAutoSave={onAutoSave}
            onChangeDraft={onChangeDraft}
            savedState={savedState}
          />
        </div>

        <div className="mt-3 rounded-2xl border border-[#e5e7eb] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-[#0f172a]">Similar items ({similarCount})</p>
              <p className="mt-3 text-sm text-[#64748b]">AI found {similarCount} possible similar items.</p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-[#0f172a] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={similarCount === 0}
              onClick={onSelectSimilar}
              type="button"
            >
              <Sparkles aria-hidden="true" className="mr-2 h-4 w-4 text-[#6d28d9]" strokeWidth={2} />
              Preview
            </button>
          </div>
        </div>

        {draft.needsReview ? (
          <div className="mt-3 rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm font-semibold text-[#c2410c]">
            This item will stay in review until a final category is confirmed.
          </div>
        ) : null}

        {selectedCount > 0 ? (
          <div className="mt-3 rounded-2xl border border-[#bbf7d0] bg-[#ecfdf3] p-4">
            <p className="text-sm font-semibold text-[#087a36]">
              {selectedCount.toLocaleString()} selected item{selectedCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#166534]">
              Choose the classification above, then use the green action button below to save every selected row together.
            </p>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[#e5e7eb] bg-white p-4">
        <ReviewActions
          canContinue={canSave}
          isSaving={isSaving}
          onApprove={onApprove}
          onApplyToSelected={onApplyToSelected}
          onMarkNeedsReview={onMarkNeedsReview}
          onSave={onSave}
          onSkip={onSkip}
          selectedCount={selectedCount}
        />
        <button
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-[14px] bg-white px-4 text-sm font-semibold text-[#334155] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canUndo || isSaving || isUndoing}
          onClick={onUndo}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4 text-[#6d28d9]" strokeWidth={2} />
          {isUndoing ? "Undoing..." : "Undo last action"}
        </button>
      </div>
    </aside>
  );
}

export function ProjectSystemsPanel({
  fileName,
  projectId,
  projectName,
  systems,
}: {
  fileName: string;
  projectId: string;
  projectName: string;
  systems: ProjectSystemSummary[];
}) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftChange>>({});
  const [selectedSimilarIds, setSelectedSimilarIds] = useState<string[]>([]);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, DraftChange>>({});
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [recentClassifications, setRecentClassifications] = useState<DraftChange[]>([]);
  const [savedState, setSavedState] = useState<SavedState>("idle");
  const [showSimilarReview, setShowSimilarReview] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
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
  const reviewGroups = useMemo(() => {
    const groups = new Map<string, ReviewGroup>();

    for (const row of allRows) {
      const name = groupNameForRow(row);
      const key = `${row.system.name}::${name}`;
      const existing = groups.get(key);

      if (existing) {
        existing.rows.push(row);
        existing.totalCount += 1;
        existing.needsReviewCount += row.item.needsReview ? 1 : 0;
      } else {
        groups.set(key, {
          key,
          name,
          needsReviewCount: row.item.needsReview ? 1 : 0,
          rows: [row],
          totalCount: 1,
        });
      }
    }

    return Array.from(groups.values()).sort(
      (left, right) => right.needsReviewCount - left.needsReviewCount || right.totalCount - left.totalCount || left.name.localeCompare(right.name),
    );
  }, [allRows]);
  const activeGroup = reviewGroups.find((group) => group.key === selectedGroupKey) || reviewGroups[0] || null;
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (activeGroup?.rows || []).filter((row) => !normalizedSearch || row.item.description.toLowerCase().includes(normalizedSearch));
  }, [activeGroup, search]);
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

  function persistedDraft(row: FlatSystemRow) {
    return savedOverrides[row.item.id] || draftForItem(row.item, row.system.name, row.category.name);
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

  async function saveDrafts(
    itemIds: string[],
    successMessage: string,
    continueAfterSave = false,
    forcedDraft?: DraftChange,
    options: {
      draftByItemId?: Record<string, DraftChange>;
      trackUndo?: boolean;
    } = {},
  ) {
    const trackUndo = options.trackUndo !== false;
    const changes = itemIds
      .map((itemId) => {
        const row = originalById.get(itemId);
        const draft = options.draftByItemId?.[itemId] || forcedDraft || (row ? displayDraft(row) : drafts[itemId]);

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
      return false;
    }

    const previousDrafts = changes.reduce((previous, change) => {
      const row = originalById.get(change.itemId);

      if (row) {
        previous[change.itemId] = persistedDraft(row);
      }

      return previous;
    }, {} as Record<string, DraftChange>);

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
        return false;
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
      if (trackUndo && Object.keys(previousDrafts).length > 0) {
        setUndoStack((previous) => [...previous, { itemIds: changes.map((change) => change.itemId), previousDrafts }].slice(-10));
      }
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

      return true;
    } catch (error) {
      console.error(error);
      setSavedState("idle");
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unknown classification error.",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function undoLastAction() {
    const lastAction = undoStack.at(-1);

    if (!lastAction || isSaving || isUndoing) {
      return;
    }

    setIsUndoing(true);
    try {
      const ok = await saveDrafts(lastAction.itemIds, "Undo applied. Previous classification restored.", false, undefined, {
        draftByItemId: lastAction.previousDrafts,
        trackUndo: false,
      });

      if (ok) {
        setUndoStack((previous) => previous.slice(0, -1));
      }
    } finally {
      setIsUndoing(false);
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
    if (!focusedRow || batchSelectedIds.length > 0 || !hasCompleteDraftClassification(nextDraft)) {
      return;
    }

    void saveDrafts([focusedRow.item.id], "Saved", false, nextDraft);
  }

  async function applyFocusedClassificationToSelected() {
    if (!focusedRow || batchSelectedIds.length === 0 || isSaving) {
      return;
    }

    const draft = normalizeDraftChange(displayDraft(focusedRow));
    const ok = await saveDrafts(
      batchSelectedIds,
      `Classification saved for ${batchSelectedIds.length.toLocaleString()} selected item${batchSelectedIds.length === 1 ? "" : "s"}.`,
      false,
      draft,
    );

    if (ok) {
      setBatchSelectedIds([]);
    }
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
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f8fafc]">
      <header className="grid h-[74px] shrink-0 grid-cols-[168px_minmax(0,1fr)] border-b border-[#e5e7eb] bg-white">
        <Link
          className="flex h-full items-center gap-3 bg-[#0f172a] px-6 text-white transition hover:bg-[#111c32]"
          href="/"
        >
          <MneloLogo className="[&_svg]:h-8 [&_svg]:w-8 [&_span]:text-2xl [&_span]:text-white" />
        </Link>
        <div className="flex min-w-0 items-center justify-between gap-4 px-6">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-tight text-[#07130f]">Classification Review - Optimized (Layout 2)</h2>
            <p className="mt-1 truncate text-sm text-slate-500">Fast review. Grouped by category. Review only what matters.</p>
          </div>
          <div className="flex shrink-0 items-center gap-5 text-sm">
          <KeyboardShortcutsHint />
          <div className="min-w-36">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#64748b]">Progress</span>
              <span className="text-sm font-semibold text-[#0f172a]">
                {reviewedCount.toLocaleString()} / {sourceSummary.total.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
              <div className="h-full rounded-full bg-[#16a34a]" style={{ width: `${reviewedPercent}%` }} />
            </div>
          </div>
          <button
            className="rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-2 font-semibold text-[#64748b] transition hover:bg-[#f8fafc]"
            type="button"
          >
            Pause review
          </button>
          </div>
        </div>
      </header>

      {notice ? (
        <div className="mt-3 shrink-0">
          {notice.tone === "error" ? (
            <ErrorMessage message={notice.message} />
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-[#bbf7d0] bg-[#ecfdf3] px-4 py-3 text-sm text-[#087a36] sm:flex-row sm:items-center sm:justify-between">
              <span>{notice.message}</span>
              <button className="font-semibold underline-offset-4 hover:underline" onClick={() => router.refresh()} type="button">
                Refresh view
              </button>
            </div>
          )}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-2 overflow-hidden p-2 xl:grid-cols-[254px_minmax(0,1fr)_360px]">
        <aside className="grid min-h-0 content-start gap-4 overflow-y-auto rounded-[18px] border border-[#e5e7eb] bg-white p-4">
          <div className="rounded-[18px] bg-white p-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Project</p>
            <h3 className="mt-2 text-lg font-semibold text-[#0f172a]">{projectName}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-[#64748b]">{fileName}</p>
            <span className="mt-3 inline-flex rounded-full bg-[#f8fafc] px-3 py-1 text-sm font-semibold text-[#64748b] ring-1 ring-[#e5e7eb]">
              Extracted: {sourceSummary.total.toLocaleString()} items
            </span>
          </div>

          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">AI Summary</p>
            <div className="mt-3 grid gap-3 text-sm">
              <SummaryLine label="Auto-classified" value={`${sourceSummary.highConfidenceCount.toLocaleString()} (${reviewedPercent}%)`} />
              <SummaryLine label="Need review" value={`${sourceSummary.refinementQueueCount.toLocaleString()}`} />
              <SummaryLine label="Flagged" value={sourceSummary.needsReviewCount.toLocaleString()} />
              <SummaryLine label="Total" value={sourceSummary.total.toLocaleString()} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f1f5f9]">
              <div className="h-full rounded-full bg-[#16a34a] transition-all" style={{ width: `${reviewedPercent}%` }} />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-3">
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Group by Category</p>
              <button
                className="text-xs font-semibold text-[#16a34a] disabled:text-slate-300"
                disabled={isClassifying || sourceSummary.refinementQueueCount === 0}
                onClick={async () => {
                  if (isClassifying) return;
                  setIsClassifying(true);
                  setNotice(null);
                  try {
                    const formData = new FormData();
                    formData.set("project_id", projectId);
                    const result = await classifyProjectBoqItems(formData);
                    if (!result.ok) {
                      setNotice({ tone: "error", message: result.error || "Classification failed." });
                      return;
                    }
                    setNotice({ tone: "success", message: result.message || "BOQ items classified." });
                    router.refresh();
                  } catch (error) {
                    setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unknown classification error." });
                  } finally {
                    setIsClassifying(false);
                  }
                }}
                type="button"
              >
                {isClassifying ? "Refining..." : "AI refine"}
              </button>
            </div>
            <div className="grid max-h-[42vh] gap-1 overflow-y-auto pr-1">
              {reviewGroups.map((group) => {
                const selected = group.key === activeGroup?.key;
                return (
                  <button
                    className={
                      selected
                        ? "rounded-2xl bg-[#ecfdf3] px-3 py-3 text-left ring-1 ring-[#bbf7d0]"
                        : "rounded-2xl px-3 py-3 text-left transition hover:bg-[#f8fafc]"
                    }
                    key={group.key}
                    onClick={() => {
                      setSelectedGroupKey(group.key);
                      setActiveItemId(group.rows[0]?.item.id || null);
                      setBatchSelectedIds([]);
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="line-clamp-1 text-sm font-semibold text-[#0f172a]">{group.name}</span>
                      <span className="text-sm font-semibold text-[#64748b]">{group.totalCount}</span>
                    </div>
                    {group.needsReviewCount > 0 ? (
                      <p className="mt-1 text-xs font-semibold text-[#b45309]">{group.needsReviewCount} need review</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-[18px] border border-[#e9d5ff] bg-[#faf5ff] p-4">
            <div className="flex items-start gap-3">
              <Brain aria-hidden="true" className="mt-1 h-5 w-5 text-[#7c3aed]" strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">AI is learning</p>
                <p className="mt-1 text-xs leading-5 text-[#64748b]">Your corrections improve future suggestions.</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white p-4">
          <div className="shrink-0 flex flex-col gap-4 border-b border-[#e5e7eb] pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Reviewing</p>
              <h3 className="mt-1 text-2xl font-semibold text-[#0f172a]">{activeGroup?.name || "No group"}</h3>
              <p className="mt-1 text-sm text-[#64748b]">
                {activeGroup?.needsReviewCount || 0} items need review · {filteredRows.length.toLocaleString()} visible
              </p>
            </div>
            <label className="relative block min-w-0 md:w-80">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                ref={searchInputRef}
                className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search this group..."
                value={search}
              />
            </label>
          </div>

          {focusedRow ? (
            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#e5e7eb]">
              <div className="grid grid-cols-[44px_72px_minmax(0,1fr)_90px_72px_112px_112px] gap-3 bg-[#f8fafc] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                <span />
                <span>Row</span>
                <span>Description</span>
                <span>Quantity</span>
                <span>Unit</span>
                <span>Confidence</span>
                <span>Status</span>
              </div>
              <div className="min-h-0 flex-1 divide-y divide-[#eef2f7] overflow-y-auto">
                {filteredRows.map((row) => {
                  const selected = row.item.id === focusedRow.item.id;
                  const checked = batchSelectedIds.includes(row.item.id);
                  const draft = displayDraft(row);
                  return (
                    <button
                      className={
                        selected
                          ? "grid w-full grid-cols-[44px_72px_minmax(0,1fr)_90px_72px_112px_112px] gap-3 border-l-4 border-[#16a34a] bg-[#ecfdf3] px-4 py-4 text-left"
                          : "grid w-full grid-cols-[44px_72px_minmax(0,1fr)_90px_72px_112px_112px] gap-3 px-4 py-4 text-left transition hover:bg-[#fbfdfb]"
                      }
                      key={row.item.id}
                      onClick={() => setActiveItemId(row.item.id)}
                      type="button"
                    >
                      <span onClick={(event) => event.stopPropagation()}>
                        <input
                          checked={checked}
                          className="mt-1 h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a]"
                          onChange={(event) => {
                            const isChecked = event.currentTarget.checked;
                            setBatchSelectedIds((previous) =>
                              isChecked ? Array.from(new Set([...previous, row.item.id])) : previous.filter((itemId) => itemId !== row.item.id),
                            );
                          }}
                          type="checkbox"
                        />
                      </span>
                      <span className="text-sm font-semibold text-[#64748b]">{row.item.sourceRowNumber || row.item.rowNumber || "-"}</span>
                      <span>
                        <span className="line-clamp-2 text-sm font-semibold leading-6 text-[#0f172a]">{row.item.description}</span>
                        <span className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold text-[#64748b]">
                          {row.item.sourceSheetName ? <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-[#e5e7eb]">{row.item.sourceSheetName}</span> : null}
                          {row.item.sourceRowNumber ? <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-[#e5e7eb]">Row {row.item.sourceRowNumber}</span> : null}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-[#64748b]">{row.item.quantity ?? "-"}</span>
                      <span className="text-sm font-semibold text-[#64748b]">{row.item.unit || "-"}</span>
                      <span>
                        <ConfidenceBadge confidence={row.item.confidenceScore} needsReview={row.item.needsReview || draft.needsReview} />
                      </span>
                      <span>
                        <span
                          className={
                            row.item.needsReview || draft.needsReview
                              ? "rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#c2410c] ring-1 ring-[#fed7aa]"
                              : "rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0]"
                          }
                        >
                          {row.item.needsReview || draft.needsReview ? "Review" : "Approved"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="No matching review items" description="Choose a group or adjust search to continue reviewing classifications." />
            </div>
          )}

          <div className="sticky bottom-0 mt-4 shrink-0 flex flex-col gap-3 rounded-[20px] border border-[#e5e7eb] bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#64748b]">
              <button
                className="font-semibold text-[#087a36]"
                onClick={() => setBatchSelectedIds(filteredRows.map((row) => row.item.id))}
                type="button"
              >
                Select all items
              </button>
              <span>{batchSelectedIds.length.toLocaleString()} selected</span>
              <select className="h-10 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#64748b]" defaultValue="">
                <option value="" disabled>
                  Batch actions
                </option>
                <option>Apply current classification</option>
                <option>Mark needs review</option>
              </select>
            </div>
            <button
              className="rounded-[14px] bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.18)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              disabled={batchSelectedIds.length === 0 || !focusedRow}
              onClick={() => void applyFocusedClassificationToSelected()}
              type="button"
            >
              Apply current classification
            </button>
          </div>
        </main>

        {focusedRow ? (
          <ClassificationReview
            canUndo={undoStack.length > 0}
            currentIndex={Math.max(0, focusedIndex)}
            draft={displayDraft(focusedRow)}
            isUndoing={isUndoing}
            isSaving={isSaving}
            item={focusedRow.item}
            selectedCount={batchSelectedIds.length}
            onApprove={approveFocusedRow}
            onApplyToSelected={() => void applyFocusedClassificationToSelected()}
            onAutoSave={autoSaveFocusedRow}
            onChangeDraft={(patch) => updateDraft(focusedRow.item.id, patch)}
            onMarkNeedsReview={markFocusedNeedsReview}
            onNext={() => setActiveItemId(nextRowAfter(focusedRow.item.id)?.item.id || null)}
            onPrevious={() => setActiveItemId(previousRowBefore(focusedRow.item.id)?.item.id || null)}
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
            onUndo={() => void undoLastAction()}
            savedState={savedState}
            similarCount={similarCandidates.length}
            totalCount={filteredRows.length}
          />
        ) : null}
      </div>

      <div className="mt-3 shrink-0 flex flex-col gap-3 rounded-2xl border border-[#e9d5ff] bg-white/80 px-4 py-3 text-xs font-semibold text-[#475569] shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-5">
          <span className="text-[#0f172a]">Tips for fast review:</span>
          <span>Use shortcuts</span>
          <span>Review by category</span>
          <span>Approve similar items in bulk</span>
          <span>Undo anytime</span>
        </div>
        <button
          className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-xs font-semibold text-[#475569] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={undoStack.length === 0 || isSaving || isUndoing}
          onClick={() => void undoLastAction()}
          type="button"
        >
          {isUndoing ? "Undoing..." : "Undo last action"}
        </button>
      </div>

      {showSimilarReview && focusedRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
          <div className="max-h-[86vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_34px_100px_rgba(15,23,42,0.24)]">
            <div className="flex flex-col gap-3 border-b border-[#e5e7eb] pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c3aed]">Similar items safety preview</p>
                <h3 className="mt-2 text-xl font-semibold text-[#0f172a]">Select only the rows that should receive this correction.</h3>
                <p className="mt-1 text-sm leading-6 text-[#64748b]">
                  Nothing is selected automatically. Review why each item matched before applying.
                </p>
              </div>
              <button
                className="rounded-[14px] bg-white px-4 py-2 text-sm font-semibold text-[#64748b] ring-1 ring-[#e5e7eb] transition hover:bg-[#f8fafc]"
                onClick={() => {
                  setSelectedSimilarIds([]);
                  setShowSimilarReview(false);
                }}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {similarCandidates.map((candidate) => {
                const selected = selectedSimilarIds.includes(candidate.item.id);
                return (
                  <label
                    className={`grid cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                      selected ? "border-[#7c3aed] bg-[#faf5ff]" : "border-[#e5e7eb] bg-white hover:border-[#c4b5fd]"
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
                            checked ? Array.from(new Set([...previous, candidate.item.id])) : previous.filter((itemId) => itemId !== candidate.item.id),
                          );
                        }}
                        type="checkbox"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-6 text-[#0f172a]">{candidate.item.description}</p>
                        <p className="mt-1 text-xs font-medium text-[#64748b]">
                          Current: {candidate.system.name} / {candidate.category.name} / {displaySubcategory(candidate.item)}
                        </p>
                        <p className="mt-2 rounded-xl bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[#64748b]">
                          Why matched: {candidate.match.reason} · {Math.round(candidate.match.score * 100)}% confidence
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#64748b]">{selectedSimilarIds.length.toLocaleString()} selected. Undo is available through saved manual edits.</p>
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
                {isSaving ? "Saving..." : "Preview changes / Apply selected"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
