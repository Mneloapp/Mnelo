"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  getCategoryOptions,
  getSubcategoryOptions,
  getSystemRuleOptions,
  NEEDS_REVIEW_CATEGORY,
  NEEDS_REVIEW_SYSTEM,
} from "@/lib/classification";
import { getSimilarItemMatch } from "@/lib/classification/similar-items";
import type { BoqItem } from "@/lib/data";

type DecisionImpact = "High Impact" | "Low Impact" | "Medium Impact";
type DecisionStatus = "pending" | "reviewed" | "skipped";

type SuggestedClassification = {
  category: string;
  subcategory: string | null;
  system: string;
};

type CandidateItem = {
  confidence: number;
  currentClassification: SuggestedClassification;
  description: string;
  id: string;
  reason: string;
  safetyWarning?: string;
  sheetName: string;
  suggestedClassification: SuggestedClassification;
};

type ReviewDecision = {
  affectedItemsCount: number;
  candidates: CandidateItem[];
  confidence: number;
  explanation: string;
  id: string;
  impact: DecisionImpact;
  procurementImpact: string;
  representativeDescription: string;
  sourceSheetsCount: number;
  suggestedClassification: SuggestedClassification;
  title: string;
};

type AppliedPrototypeChange = {
  decisionId: string;
  itemIds: string[];
  previousStatus: DecisionStatus;
};

const systemOptions = getSystemRuleOptions();

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayClassification(classification: SuggestedClassification) {
  return `${classification.system} / ${classification.category} / ${classification.subcategory || "Needs Review"}`;
}

function classificationFromItem(item: BoqItem): SuggestedClassification {
  return {
    category: item.subcategory || NEEDS_REVIEW_CATEGORY,
    subcategory: item.classificationSubcategory || null,
    system: item.category || NEEDS_REVIEW_SYSTEM,
  };
}

function titleFromItem(item: BoqItem) {
  if (item.classificationSubcategory) {
    return item.classificationSubcategory;
  }

  if (item.subcategory && item.subcategory !== NEEDS_REVIEW_CATEGORY) {
    return item.subcategory;
  }

  const tokens = item.description.split(/\s+/).filter(Boolean).slice(0, 4);
  return tokens.join(" ") || "Unclassified requirement";
}

function impactForCount(count: number): DecisionImpact {
  if (count >= 20) {
    return "High Impact";
  }

  if (count >= 6) {
    return "Medium Impact";
  }

  return "Low Impact";
}

function decisionKey(item: BoqItem) {
  return [
    item.category || NEEDS_REVIEW_SYSTEM,
    item.subcategory || NEEDS_REVIEW_CATEGORY,
    item.classificationSubcategory || "Needs Review",
    normalizeText(titleFromItem(item)),
  ].join("|");
}

function deriveReviewDecisions(items: BoqItem[]) {
  const itemRows = items.filter((item) => item.rowType === "item");
  const groups = new Map<string, BoqItem[]>();

  for (const item of itemRows) {
    const key = decisionKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  }

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const representative = group[0];
      const suggestedClassification = classificationFromItem(representative);
      const candidates = group.map((item) => {
        const match = getSimilarItemMatch(representative.description, item.description);

        return {
          confidence: Math.max(0.35, Math.min(0.98, item.confidenceScore || representative.confidenceScore || 0.62)),
          currentClassification: classificationFromItem(item),
          description: item.description,
          id: item.id,
          reason:
            item.id === representative.id
              ? "Representative item for this decision."
              : match.isSimilar
                ? match.reason
                : "Grouped by current classification. Review before selecting.",
          safetyWarning: match.isSimilar ? undefined : "Review manually before including.",
          sheetName: item.sourceSheetName || item.sheetName || "Unknown sheet",
          suggestedClassification,
        } satisfies CandidateItem;
      });
      const sourceSheetsCount = new Set(group.map((item) => item.sourceSheetName || item.sheetName || "Unknown")).size;
      const avgConfidence =
        group.reduce((total, item) => total + Math.max(0, Math.min(1, item.confidenceScore || 0)), 0) / Math.max(group.length, 1);
      const needsReview = group.some((item) => item.needsReview);

      return {
        affectedItemsCount: group.length,
        candidates,
        confidence: needsReview ? Math.min(avgConfidence, 0.72) : avgConfidence,
        explanation: needsReview
          ? "AI found a pattern, but this group still contains review risk. Approve only the candidates that truly match."
          : "AI grouped these rows by existing classification, description pattern, and source context.",
        id: key,
        impact: impactForCount(group.length),
        procurementImpact:
          group.length >= 20
            ? "Approving this decision can prepare a meaningful procurement package."
            : group.length >= 6
              ? "Approving this decision reduces the review queue for this system."
              : "Small group. Review for correctness before packaging.",
        representativeDescription: representative.description,
        sourceSheetsCount,
        suggestedClassification,
        title: titleFromItem(representative),
      } satisfies ReviewDecision;
    })
    .sort((left, right) => {
      const impactScore = { "High Impact": 3, "Medium Impact": 2, "Low Impact": 1 };
      return impactScore[right.impact] - impactScore[left.impact] || right.affectedItemsCount - left.affectedItemsCount;
    });
}

function statusClassName(status: DecisionStatus) {
  if (status === "reviewed") {
    return "border-[#BBF7D0] bg-[#ECFDF3] text-[#15803D]";
  }

  if (status === "skipped") {
    return "border-[#E5E7EB] bg-[#F8FAFC] text-[#64748B]";
  }

  return "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]";
}

export function ReviewProgressHeader({
  decisions,
  statuses,
  totalItems,
}: {
  decisions: ReviewDecision[];
  statuses: Record<string, DecisionStatus>;
  totalItems: number;
}) {
  const decisionsLeft = decisions.filter((decision) => (statuses[decision.id] || "pending") === "pending").length;
  const needsReviewCount = decisions.filter((decision) => decision.confidence < 0.75).length;
  const estimatedItemsAffected = decisions
    .filter((decision) => (statuses[decision.id] || "pending") === "pending")
    .reduce((total, decision) => total + decision.affectedItemsCount, 0);

  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7C3AED]">AI Decision Review</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0F172A]">
            AI has processed {totalItems.toLocaleString()} items.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
            Review {decisionsLeft.toLocaleString()} decisions to classify most of the project. Approve decisions, not rows.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4 lg:w-[620px]">
          <ProgressMetric label="BOQ items" value={totalItems.toLocaleString()} />
          <ProgressMetric label="AI decisions" value={decisions.length.toLocaleString()} />
          <ProgressMetric label="Decisions left" value={decisionsLeft.toLocaleString()} />
          <ProgressMetric label="Items affected" value={estimatedItemsAffected.toLocaleString()} />
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 text-sm font-medium text-[#C2410C]">
        {needsReviewCount.toLocaleString()} decision{needsReviewCount === 1 ? "" : "s"} include lower-confidence rows and should be reviewed carefully.
      </div>
    </section>
  );
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <p className="text-xl font-semibold text-[#0F172A]">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">{label}</p>
    </div>
  );
}

export function ReviewDecisionCard({
  decision,
  isActive,
  onSelect,
  status,
}: {
  decision: ReviewDecision;
  isActive: boolean;
  onSelect: () => void;
  status: DecisionStatus;
}) {
  return (
    <button
      className={`w-full rounded-[20px] border p-4 text-left transition ${
        isActive
          ? "border-[#22C55E] bg-[#ECFDF3] shadow-[0_18px_44px_rgba(34,197,94,0.12)]"
          : "border-[#E5E7EB] bg-white hover:-translate-y-0.5 hover:border-[#BBF7D0]"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">{decision.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">
            Suggested: {displayClassification(decision.suggestedClassification)}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassName(status)}`}>{status}</span>
      </div>
      <div className="mt-4 grid gap-2 text-xs font-medium text-[#64748B] sm:grid-cols-3">
        <span>{decision.affectedItemsCount} items</span>
        <span>{Math.round(decision.confidence * 100)}% confidence</span>
        <span>{decision.impact}</span>
      </div>
    </button>
  );
}

export function ReviewQueue({
  activeDecisionId,
  decisions,
  onSelect,
  statuses,
}: {
  activeDecisionId: string | null;
  decisions: ReviewDecision[];
  onSelect: (decisionId: string) => void;
  statuses: Record<string, DecisionStatus>;
}) {
  const groups: DecisionImpact[] = ["High Impact", "Medium Impact", "Low Impact"];

  return (
    <aside className="space-y-5">
      {groups.map((group) => {
        const groupDecisions = decisions.filter((decision) => decision.impact === group);

        if (groupDecisions.length === 0) {
          return null;
        }

        return (
          <section className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4" key={group}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#64748B]">{group}</h3>
            <div className="mt-3 space-y-3">
              {groupDecisions.map((decision) => (
                <ReviewDecisionCard
                  decision={decision}
                  isActive={activeDecisionId === decision.id}
                  key={decision.id}
                  onSelect={() => onSelect(decision.id)}
                  status={statuses[decision.id] || "pending"}
                />
              ))}
            </div>
          </section>
        );
      })}
    </aside>
  );
}

export function ClassificationPicker({
  onChange,
  recentlyUsed,
  value,
}: {
  onChange: (classification: SuggestedClassification) => void;
  recentlyUsed: SuggestedClassification[];
  value: SuggestedClassification;
}) {
  const [search, setSearch] = useState("");
  const categoryOptions = getCategoryOptions(value.system).filter((category) => category !== NEEDS_REVIEW_CATEGORY);
  const subcategoryOptions =
    value.category === NEEDS_REVIEW_CATEGORY ? [] : getSubcategoryOptions(value.system, value.category).filter(Boolean);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSystems = systemOptions.filter((system) => system.systemName.toLowerCase().includes(normalizedSearch));

  return (
    <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-5">
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#DCFCE7]"
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search systems, categories, subcategories..."
          value={search}
        />
      </div>

      {recentlyUsed.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Recently used</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recentlyUsed.slice(0, 4).map((classification) => (
              <button
                className="rounded-full bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#334155] ring-1 ring-[#E5E7EB] transition hover:bg-[#ECFDF3]"
                key={displayClassification(classification)}
                onClick={() => onChange(classification)}
                type="button"
              >
                {classification.subcategory || classification.category}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <PickerColumn title="System">
          {(normalizedSearch ? filteredSystems : systemOptions).map((system) => (
            <PickerButton
              isSelected={system.systemName === value.system}
              key={system.systemName}
              onClick={() => onChange({ category: NEEDS_REVIEW_CATEGORY, subcategory: null, system: system.systemName })}
            >
              {system.systemName}
            </PickerButton>
          ))}
        </PickerColumn>

        <PickerColumn title="Category">
          {categoryOptions.map((category) => (
            <PickerButton
              isSelected={category === value.category}
              key={category}
              onClick={() => onChange({ ...value, category, subcategory: null })}
            >
              {category}
            </PickerButton>
          ))}
        </PickerColumn>

        <PickerColumn title="Subcategory">
          {subcategoryOptions.length > 0 ? (
            subcategoryOptions.map((subcategory) => (
              <PickerButton
                isSelected={subcategory === value.subcategory}
                key={subcategory}
                onClick={() => onChange({ ...value, subcategory })}
              >
                {subcategory}
              </PickerButton>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
              Select a category to reveal subcategories.
            </p>
          )}
        </PickerColumn>
      </div>
    </div>
  );
}

function PickerColumn({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">{title}</p>
      <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

function PickerButton({ children, isSelected, onClick }: { children: React.ReactNode; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      className={`w-full rounded-2xl border p-3 text-left text-sm font-semibold transition ${
        isSelected ? "border-[#22C55E] bg-[#ECFDF3] text-[#15803D]" : "border-[#E5E7EB] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function SuggestedMatchCard({
  candidate,
  isSelected,
  onToggle,
}: {
  candidate: CandidateItem;
  isSelected: boolean;
  onToggle: (selected: boolean) => void;
}) {
  return (
    <label
      className={`block rounded-[18px] border p-4 transition ${
        isSelected ? "border-[#7C3AED] bg-white" : "border-[#E5E7EB] bg-white hover:border-[#C4B5FD]"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          checked={isSelected}
          className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#7C3AED] focus:ring-[#7C3AED]"
          onChange={(event) => onToggle(event.currentTarget.checked)}
          type="checkbox"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm font-semibold leading-6 text-[#0F172A]">{candidate.description}</p>
            <span className="shrink-0 rounded-full bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-[#64748B] ring-1 ring-[#E5E7EB]">
              {Math.round(candidate.confidence * 100)}%
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-[#64748B] md:grid-cols-2">
            <span>Current: {displayClassification(candidate.currentClassification)}</span>
            <span>Suggested: {displayClassification(candidate.suggestedClassification)}</span>
          </div>
          <p className="mt-3 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#64748B]">
            Why it matched: {candidate.reason}
          </p>
          {candidate.safetyWarning ? (
            <p className="mt-2 rounded-xl bg-[#FFF7ED] px-3 py-2 text-xs font-semibold text-[#C2410C]">
              {candidate.safetyWarning}
            </p>
          ) : null}
        </div>
      </div>
    </label>
  );
}

export function SuggestedGroupPanel({
  candidates,
  onClear,
  onSelectHighConfidence,
  onToggle,
  search,
  selectedIds,
  setSearch,
}: {
  candidates: CandidateItem[];
  onClear: () => void;
  onSelectHighConfidence: () => void;
  onToggle: (candidateId: string, selected: boolean) => void;
  search: string;
  selectedIds: string[];
  setSearch: (value: string) => void;
}) {
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = !search.trim() || candidate.description.toLowerCase().includes(search.trim().toLowerCase());
    const matchesConfidence =
      confidenceFilter === "all" ||
      (confidenceFilter === "high" && candidate.confidence >= 0.85) ||
      (confidenceFilter === "review" && candidate.confidence < 0.85);

    return matchesSearch && matchesConfidence;
  });

  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
      <div className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C3AED]">AI Suggested Group</p>
          <h3 className="mt-2 text-lg font-semibold text-[#0F172A]">Review candidate items before approval.</h3>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">Nothing is selected automatically.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-[14px] bg-white px-3 py-2 text-sm font-semibold text-[#15803D] ring-1 ring-[#BBF7D0] transition hover:bg-[#ECFDF3]"
            onClick={onSelectHighConfidence}
            type="button"
          >
            Select all high confidence only
          </button>
          <button
            className="rounded-[14px] bg-white px-3 py-2 text-sm font-semibold text-[#64748B] ring-1 ring-[#E5E7EB] transition hover:bg-white"
            onClick={onClear}
            type="button"
          >
            Clear selection
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="relative block">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#22C55E] focus:ring-4 focus:ring-[#DCFCE7]"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search candidates..."
            value={search}
          />
        </label>
        <select
          className="h-11 rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-[#DCFCE7]"
          onChange={(event) => setConfidenceFilter(event.currentTarget.value)}
          value={confidenceFilter}
        >
          <option value="all">All confidence</option>
          <option value="high">High confidence</option>
          <option value="review">Needs review</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {filteredCandidates.map((candidate) => (
          <SuggestedMatchCard
            candidate={candidate}
            isSelected={selectedIds.includes(candidate.id)}
            key={candidate.id}
            onToggle={(selected) => onToggle(candidate.id, selected)}
          />
        ))}
      </div>
    </section>
  );
}

export function DecisionWorkspace({
  decision,
  onApprove,
  onChangeClassification,
  onMarkNeedsReview,
  onSkip,
  selectedCount,
  showPicker,
  suggestedClassification,
}: {
  decision: ReviewDecision;
  onApprove: () => void;
  onChangeClassification: () => void;
  onMarkNeedsReview: () => void;
  onSkip: () => void;
  selectedCount: number;
  showPicker: boolean;
  suggestedClassification: SuggestedClassification;
}) {
  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#22C55E]">Decision Workspace</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#0F172A]">{decision.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748B]">{decision.procurementImpact}</p>
        </div>
        <span className="rounded-full border border-[#BBF7D0] bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#15803D]">
          {Math.round(decision.confidence * 100)}% confidence
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Representative item</p>
            <p className="mt-3 text-lg font-semibold leading-8 text-[#0F172A]">{decision.representativeDescription}</p>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">AI suggested classification</p>
            <p className="mt-3 text-base font-semibold text-[#0F172A]">{displayClassification(suggestedClassification)}</p>
            <p className="mt-3 text-sm leading-6 text-[#64748B]">{decision.explanation}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <DecisionStat label="Affected items" value={decision.affectedItemsCount.toLocaleString()} />
            <DecisionStat label="Selected now" value={selectedCount.toLocaleString()} />
            <DecisionStat label="Source sheets" value={decision.sourceSheetsCount.toLocaleString()} />
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-[#FBFDFB] p-4">
          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-[14px] bg-[#16A34A] px-5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D]"
            onClick={onApprove}
            type="button"
          >
            <CheckCircle2 aria-hidden="true" className="mr-2 h-4 w-4" />
            Approve Decision
          </button>
          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-[14px] bg-white px-5 text-sm font-semibold text-[#0F172A] ring-1 ring-[#E5E7EB] transition hover:bg-[#F8FAFC]"
            onClick={onChangeClassification}
            type="button"
          >
            {showPicker ? "Hide Classification Picker" : "Change Classification"}
          </button>
          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-[14px] bg-white px-5 text-sm font-semibold text-[#64748B] ring-1 ring-[#E5E7EB] transition hover:bg-[#F8FAFC]"
            onClick={onSkip}
            type="button"
          >
            Skip
          </button>
          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-[14px] bg-[#FFF7ED] px-5 text-sm font-semibold text-[#C2410C] ring-1 ring-[#FED7AA] transition hover:bg-[#FFEDD5]"
            onClick={onMarkNeedsReview}
            type="button"
          >
            Mark as Needs Review
          </button>
        </div>
      </div>
    </section>
  );
}

function DecisionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-xl font-semibold text-[#0F172A]">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">{label}</p>
    </div>
  );
}

export function BulkPreviewDialog({
  decision,
  onApply,
  onCancel,
  selectedCandidates,
  suggestedClassification,
}: {
  decision: ReviewDecision;
  onApply: () => void;
  onCancel: () => void;
  selectedCandidates: CandidateItem[];
  suggestedClassification: SuggestedClassification;
}) {
  const lowConfidenceCount = selectedCandidates.filter((candidate) => candidate.confidence < 0.85).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F172A]/40 p-4">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C3AED]">Prototype preview</p>
            <h3 className="mt-2 text-2xl font-semibold text-[#0F172A]">
              You are about to update {selectedCandidates.length.toLocaleString()} items
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">This only updates local UI state. No database changes will be made.</p>
          </div>
          <button className="rounded-full p-2 text-[#64748B] transition hover:bg-[#F8FAFC]" onClick={onCancel} type="button">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {lowConfidenceCount > 0 ? (
          <div className="mt-5 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] p-4 text-sm font-semibold text-[#C2410C]">
            {lowConfidenceCount} selected item{lowConfidenceCount === 1 ? "" : "s"} have lower confidence. Review before applying.
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {selectedCandidates.map((candidate) => (
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4" key={candidate.id}>
              <p className="text-sm font-semibold leading-6 text-[#0F172A]">{candidate.description}</p>
              <div className="mt-3 grid gap-2 text-xs text-[#64748B] md:grid-cols-[1fr_auto_1fr]">
                <span>Old: {displayClassification(candidate.currentClassification)}</span>
                <ArrowRight aria-hidden="true" className="hidden h-4 w-4 md:block" />
                <span>New: {displayClassification(suggestedClassification)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            className="h-11 rounded-[14px] bg-white px-5 text-sm font-semibold text-[#0F172A] ring-1 ring-[#E5E7EB] transition hover:bg-[#F8FAFC]"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-11 rounded-[14px] bg-[#16A34A] px-5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D]"
            disabled={selectedCandidates.length === 0}
            onClick={onApply}
            type="button"
          >
            Apply Prototype Change
          </button>
        </div>
        <p className="mt-4 text-xs text-[#94A3B8]">Decision: {decision.title}</p>
      </div>
    </div>
  );
}

export function UndoToast({ message, onUndo }: { message: string; onUndo: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex w-[min(92vw,520px)] -translate-x-1/2 items-center justify-between gap-4 rounded-2xl border border-[#BBF7D0] bg-white p-4 shadow-2xl">
      <div className="flex items-center gap-3">
        <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-[#16A34A]" />
        <p className="text-sm font-semibold text-[#0F172A]">{message}</p>
      </div>
      <button
        className="inline-flex items-center rounded-xl bg-[#ECFDF3] px-3 py-2 text-sm font-semibold text-[#15803D] transition hover:bg-[#DCFCE7]"
        onClick={onUndo}
        type="button"
      >
        <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
        Undo
      </button>
    </div>
  );
}

function SafetyTestPanel() {
  const examples = [
    {
      description: "VRV Outdoor Unit",
      warning: "Different product identity - review manually.",
    },
    {
      description: "Fan Coil Unit",
      warning: "Different product identity - review manually.",
    },
  ];

  return (
    <section className="rounded-[24px] border border-[#FED7AA] bg-[#FFF7ED] p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#C2410C]" />
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Safety test case</h3>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">
            VRV Outdoor Unit and Fan Coil Unit must not be auto-selected together.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {examples.map((example) => (
          <div className="rounded-2xl border border-[#FED7AA] bg-white p-4" key={example.description}>
            <p className="text-sm font-semibold text-[#0F172A]">{example.description}</p>
            <p className="mt-2 text-xs font-semibold text-[#C2410C]">{example.warning}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ClassificationReviewPrototype({ items }: { items: BoqItem[] }) {
  const decisions = useMemo(() => deriveReviewDecisions(items), [items]);
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(decisions[0]?.id || null);
  const [changedClassifications, setChangedClassifications] = useState<Record<string, SuggestedClassification>>({});
  const [previewDecisionId, setPreviewDecisionId] = useState<string | null>(null);
  const [recentlyUsed, setRecentlyUsed] = useState<SuggestedClassification[]>([]);
  const [searchCandidates, setSearchCandidates] = useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Record<string, string[]>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, DecisionStatus>>({});
  const [toast, setToast] = useState<{ change: AppliedPrototypeChange; message: string } | null>(null);

  const activeDecision = decisions.find((decision) => decision.id === activeDecisionId) || decisions[0] || null;
  const activeSelectedIds = activeDecision ? selectedCandidateIds[activeDecision.id] || [] : [];
  const previewDecision = previewDecisionId ? decisions.find((decision) => decision.id === previewDecisionId) || null : null;
  const previewSelectedIds = previewDecision ? selectedCandidateIds[previewDecision.id] || [] : [];
  const previewCandidates = previewDecision
    ? previewSelectedIds.length > 0
      ? previewDecision.candidates.filter((candidate) => previewSelectedIds.includes(candidate.id))
      : previewDecision.candidates.filter((candidate) => candidate.confidence >= 0.85 && !candidate.safetyWarning)
    : [];
  const activeClassification = activeDecision
    ? changedClassifications[activeDecision.id] || activeDecision.suggestedClassification
    : { category: NEEDS_REVIEW_CATEGORY, subcategory: null, system: NEEDS_REVIEW_SYSTEM };

  function setSelection(decisionId: string, itemIds: string[]) {
    setSelectedCandidateIds((previous) => ({ ...previous, [decisionId]: itemIds }));
  }

  function applyPrototypeChange(decision: ReviewDecision, itemIds: string[], nextStatus: DecisionStatus) {
    const previousStatus = statuses[decision.id] || "pending";

    setStatuses((previous) => ({ ...previous, [decision.id]: nextStatus }));
    setRecentlyUsed((previous) => {
      const next = changedClassifications[decision.id] || decision.suggestedClassification;
      return [next, ...previous.filter((entry) => displayClassification(entry) !== displayClassification(next))].slice(0, 5);
    });
    setToast({
      change: { decisionId: decision.id, itemIds, previousStatus },
      message: `Decision approved. ${itemIds.length.toLocaleString()} items updated in prototype.`,
    });
  }

  if (decisions.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#CBD5E1] bg-white p-10 text-center">
        <Sparkles aria-hidden="true" className="mx-auto h-8 w-8 text-[#22C55E]" />
        <h3 className="mt-4 text-lg font-semibold text-[#0F172A]">No classification decisions yet</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
          Parse and classify BOQ items first. AI Review decisions will appear here as a prototype layer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReviewProgressHeader decisions={decisions} statuses={statuses} totalItems={items.filter((item) => item.rowType === "item").length} />

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <ReviewQueue
          activeDecisionId={activeDecision?.id || null}
          decisions={decisions}
          onSelect={(decisionId) => {
            setActiveDecisionId(decisionId);
            setShowPicker(false);
            setSearchCandidates("");
          }}
          statuses={statuses}
        />

        {activeDecision ? (
          <div className="space-y-6">
            <DecisionWorkspace
              decision={activeDecision}
              onApprove={() => {
                if (activeSelectedIds.length === 0) {
                  setSelection(
                    activeDecision.id,
                    activeDecision.candidates.filter((candidate) => candidate.confidence >= 0.85).map((candidate) => candidate.id),
                  );
                }
                setPreviewDecisionId(activeDecision.id);
              }}
              onChangeClassification={() => setShowPicker((value) => !value)}
              onMarkNeedsReview={() => applyPrototypeChange(activeDecision, activeSelectedIds, "reviewed")}
              onSkip={() => setStatuses((previous) => ({ ...previous, [activeDecision.id]: "skipped" }))}
              selectedCount={activeSelectedIds.length}
              showPicker={showPicker}
              suggestedClassification={activeClassification}
            />

            {showPicker ? (
              <ClassificationPicker
                onChange={(classification) =>
                  setChangedClassifications((previous) => ({ ...previous, [activeDecision.id]: classification }))
                }
                recentlyUsed={recentlyUsed}
                value={activeClassification}
              />
            ) : null}

            <SuggestedGroupPanel
              candidates={activeDecision.candidates}
              onClear={() => setSelection(activeDecision.id, [])}
              onSelectHighConfidence={() =>
                setSelection(
                  activeDecision.id,
                  activeDecision.candidates.filter((candidate) => candidate.confidence >= 0.85 && !candidate.safetyWarning).map((candidate) => candidate.id),
                )
              }
              onToggle={(candidateId, selected) => {
                const current = selectedCandidateIds[activeDecision.id] || [];
                setSelection(
                  activeDecision.id,
                  selected ? Array.from(new Set([...current, candidateId])) : current.filter((itemId) => itemId !== candidateId),
                );
              }}
              search={searchCandidates}
              selectedIds={activeSelectedIds}
              setSearch={setSearchCandidates}
            />

            <SafetyTestPanel />
          </div>
        ) : null}
      </div>

      {previewDecisionId && activeDecision ? (
        <BulkPreviewDialog
          decision={previewDecision || activeDecision}
          onApply={() => {
            const decision = previewDecision || activeDecision;
            const itemIds = previewCandidates.map((candidate) => candidate.id);
            applyPrototypeChange(decision, itemIds, "reviewed");
            setPreviewDecisionId(null);
          }}
          onCancel={() => setPreviewDecisionId(null)}
          selectedCandidates={previewCandidates}
          suggestedClassification={
            previewDecision ? changedClassifications[previewDecision.id] || previewDecision.suggestedClassification : activeClassification
          }
        />
      ) : null}

      {toast ? (
        <UndoToast
          message={toast.message}
          onUndo={() => {
            setStatuses((previous) => ({ ...previous, [toast.change.decisionId]: toast.change.previousStatus }));
            setToast(null);
          }}
        />
      ) : null}
    </div>
  );
}
