"use client";

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const className =
    confidence >= 90
      ? "bg-[#dcfce7] text-[#15803d]"
      : confidence >= 75
        ? "bg-[#fef3c7] text-[#b45309]"
        : "bg-[#fee2e2] text-[#b91c1c]";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{confidence}% confidence</span>;
}
