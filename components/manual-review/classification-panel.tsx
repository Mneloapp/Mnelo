"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { ClassificationValue } from "@/components/manual-review/types";
import { getCategoryOptions, getSubcategoryOptions, getSystemRuleOptions } from "@/lib/classification";

export function ClassificationPanel({
  disabled,
  onOpenPreview,
  recentClassifications,
  selectedClassification,
  selectedCount,
  setSelectedClassification,
}: {
  disabled: boolean;
  onOpenPreview: () => void;
  recentClassifications: ClassificationValue[];
  selectedClassification: ClassificationValue;
  selectedCount: number;
  setSelectedClassification: (classification: ClassificationValue) => void;
}) {
  const [search, setSearch] = useState("");
  const systems = useMemo(() => getSystemRuleOptions().map((option) => option.systemName), []);
  const categories = selectedClassification.system ? getCategoryOptions(selectedClassification.system) : [];
  const subcategories =
    selectedClassification.system && selectedClassification.category
      ? getSubcategoryOptions(selectedClassification.system, selectedClassification.category)
      : [];
  const normalizedSearch = search.toLocaleLowerCase();

  return (
    <aside className="rounded-[20px] border border-[#e5e7eb] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Classification Panel</p>
      <h2 className="mt-2 text-xl font-semibold text-[#0f172a]">Set classification</h2>
      <p className="mt-2 text-sm text-slate-500">Select rows first, then choose the target classification.</p>

      <label className="mt-5 flex items-center gap-2 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-sm text-slate-500">
        <Search className="h-4 w-4" />
        <input
          className="w-full bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-slate-400"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search classification..."
          value={search}
        />
      </label>

      {recentClassifications.length > 0 ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#0f172a]">Recent</p>
          <div className="mt-2 space-y-2">
            {recentClassifications.slice(0, 3).map((classification) => (
              <button
                className="w-full rounded-2xl bg-[#f8fafc] px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-[#ecfdf3]"
                key={`${classification.system}-${classification.category}-${classification.subcategory}`}
                onClick={() => setSelectedClassification(classification)}
                type="button"
              >
                {classification.system} / {classification.category || "Unclassified"} /{" "}
                {classification.subcategory || "Unclassified"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ClassificationChipGroup
        label="System"
        onSelect={(system) => setSelectedClassification({ category: null, subcategory: null, system })}
        options={systems.filter((system) => system.toLocaleLowerCase().includes(normalizedSearch))}
        value={selectedClassification.system}
      />

      {selectedClassification.system ? (
        <ClassificationChipGroup
          label="Category"
          onSelect={(category) => setSelectedClassification({ ...selectedClassification, category, subcategory: null })}
          options={categories.filter((category) => category.toLocaleLowerCase().includes(normalizedSearch))}
          value={selectedClassification.category}
        />
      ) : null}

      {selectedClassification.category ? (
        <ClassificationChipGroup
          label="Subcategory"
          onSelect={(subcategory) => setSelectedClassification({ ...selectedClassification, subcategory })}
          options={subcategories.filter((subcategory) => subcategory.toLocaleLowerCase().includes(normalizedSearch))}
          value={selectedClassification.subcategory}
        />
      ) : null}

      <button
        className="mt-6 w-full rounded-[14px] bg-[#16a34a] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(22,163,74,0.2)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
        disabled={disabled || selectedCount === 0 || !selectedClassification.system}
        onClick={onOpenPreview}
        type="button"
      >
        Preview change for {selectedCount} rows
      </button>
    </aside>
  );
}

function ClassificationChipGroup({
  label,
  onSelect,
  options,
  value,
}: {
  label: string;
  onSelect: (value: string) => void;
  options: string[];
  value: string | null;
}) {
  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-[#0f172a]">{label}</p>
      <div className="mt-2 flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">
        {options.length > 0 ? (
          options.map((option) => (
            <button
              className={
                value === option
                  ? "rounded-full bg-[#dcfce7] px-3 py-2 text-xs font-semibold text-[#15803d]"
                  : "rounded-full border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-[#f8fafc]"
              }
              key={option}
              onClick={() => onSelect(option)}
              type="button"
            >
              {option}
            </button>
          ))
        ) : (
          <p className="text-sm text-slate-400">No options yet.</p>
        )}
      </div>
    </div>
  );
}
