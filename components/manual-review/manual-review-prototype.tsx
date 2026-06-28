"use client";

import { useMemo, useState } from "react";

import { ClassificationPanel } from "@/components/manual-review/classification-panel";
import { PrototypeApplyPreview } from "@/components/manual-review/prototype-apply-preview";
import { PrototypeUndoToast } from "@/components/manual-review/prototype-undo-toast";
import { ReviewGroupsPanel } from "@/components/manual-review/review-groups-panel";
import { SelectedProductGroup } from "@/components/manual-review/selected-product-group";
import type { ClassificationValue, ProductGroup, PrototypeChange } from "@/components/manual-review/types";
import type { BoqItem } from "@/lib/data";
import { deriveProductGroups } from "@/lib/manual-review/derive-product-groups";

export function ManualReviewPrototype({ items }: { items: BoqItem[] }) {
  const groups = useMemo(() => deriveProductGroups(items), [items]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(groups[0]?.id || null);
  const activeGroup = groups.find((group) => group.id === activeGroupId) || groups[0] || null;
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedClassification, setSelectedClassification] = useState<ClassificationValue>({
    category: activeGroup?.category || null,
    subcategory: activeGroup?.subcategory || null,
    system: activeGroup?.system || "",
  });
  const [localClassifications, setLocalClassifications] = useState<Record<string, ClassificationValue>>({});
  const [recentClassifications, setRecentClassifications] = useState<ClassificationValue[]>([]);
  const [pendingPreview, setPendingPreview] = useState(false);
  const [lastChange, setLastChange] = useState<PrototypeChange | null>(null);

  function selectGroup(groupId: string) {
    const group = groups.find((candidate) => candidate.id === groupId);
    setActiveGroupId(groupId);
    setSelectedRowIds([]);
    setSelectedClassification({
      category: group?.category || null,
      subcategory: group?.subcategory || null,
      system: group?.system || "",
    });
  }

  function toggleRow(rowId: string) {
    setSelectedRowIds((current) => (current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId]));
  }

  function selectAll() {
    setSelectedRowIds(activeGroup?.rows.map((row) => row.id) || []);
  }

  function selectHighConfidence() {
    setSelectedRowIds(activeGroup?.rows.filter((row) => row.confidenceScore >= 0.85).map((row) => row.id) || []);
  }

  function applyPrototypeChange() {
    const previousClassifications = Object.fromEntries(
      selectedRowIds.map((rowId) => [
        rowId,
        localClassifications[rowId] || getRowClassification(items.find((item) => item.id === rowId)),
      ]),
    );

    setLocalClassifications((current) => ({
      ...current,
      ...Object.fromEntries(selectedRowIds.map((rowId) => [rowId, selectedClassification])),
    }));
    setRecentClassifications((current) => uniqueClassifications([selectedClassification, ...current]));
    setLastChange({ classification: selectedClassification, previousClassifications, rowIds: selectedRowIds });
    setPendingPreview(false);
  }

  function undoLastChange() {
    if (!lastChange) return;

    setLocalClassifications((current) => {
      const next = { ...current };
      for (const rowId of lastChange.rowIds) {
        next[rowId] = lastChange.previousClassifications[rowId];
      }
      return next;
    });
    setLastChange(null);
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#d1d5db] bg-white p-10 text-center">
        <p className="text-lg font-semibold text-[#0f172a]">No product groups yet</p>
        <p className="mt-2 text-sm text-slate-500">Manual Review appears after BOQ items are parsed and classified.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Metric label="Product groups" value={groups.length.toString()} />
        <Metric label="Needs review" value={groups.filter((group) => group.status === "Needs Review").length.toString()} />
        <Metric label="Low confidence" value={groups.filter((group) => group.status === "Low Confidence").length.toString()} />
        <Metric label="Prototype changes" value={Object.keys(localClassifications).length.toString()} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <ReviewGroupsPanel activeGroupId={activeGroup?.id || null} groups={groups} onSelectGroup={selectGroup} />
        <SelectedProductGroup
          group={activeGroup}
          localClassifications={localClassifications}
          onClearSelection={() => setSelectedRowIds([])}
          onSelectAll={selectAll}
          onSelectHighConfidence={selectHighConfidence}
          onToggleRow={toggleRow}
          selectedRowIds={selectedRowIds}
        />
        <ClassificationPanel
          disabled={!activeGroup}
          onOpenPreview={() => setPendingPreview(true)}
          recentClassifications={recentClassifications}
          selectedClassification={selectedClassification}
          selectedCount={selectedRowIds.length}
          setSelectedClassification={setSelectedClassification}
        />
      </div>

      {pendingPreview ? (
        <PrototypeApplyPreview
          classification={selectedClassification}
          onApply={applyPrototypeChange}
          onCancel={() => setPendingPreview(false)}
          selectedCount={selectedRowIds.length}
        />
      ) : null}

      {lastChange ? <PrototypeUndoToast count={lastChange.rowIds.length} onDismiss={() => setLastChange(null)} onUndo={undoLastChange} /> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#0f172a]">{value}</p>
    </div>
  );
}

function getRowClassification(row: BoqItem | undefined): ClassificationValue {
  return {
    category: row?.subcategory || null,
    subcategory: row?.classificationSubcategory || null,
    system: row?.category || "Needs Review",
  };
}

function uniqueClassifications(classifications: ClassificationValue[]) {
  const seen = new Set<string>();
  return classifications.filter((classification) => {
    const key = `${classification.system}-${classification.category}-${classification.subcategory}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
