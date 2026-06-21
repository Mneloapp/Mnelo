import type { BoqParserSummary } from "@/lib/boq-parser";

export function ParserDebugSummary({ summary }: { summary?: BoqParserSummary }) {
  if (!summary) {
    return null;
  }

  const stats = [
    ["Sheets", summary.sheetsParsed],
    ["Rows", summary.totalParsedRows],
    ["Items", summary.itemRows],
    ["Headers", summary.headerRows],
    ["Ignored", summary.ignoredRows],
    ["Inherited", summary.rowsWithInheritedSection],
    ["AI queue", summary.rowsSentToAi],
    ["Needs Review", summary.needsReviewRows],
  ];

  return (
    <details className="mt-3 rounded-lg border border-[#bbf7d0] bg-white/70 p-3 text-xs text-[#166534]">
      <summary className="cursor-pointer font-semibold">Parser debug summary</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div className="rounded-md bg-[#ecfdf3] px-2 py-1" key={label}>
            <span className="text-[#64748b]">{label}</span>
            <span className="ml-2 font-semibold text-[#0f172a]">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 max-h-32 overflow-auto rounded-md bg-white p-2">
        {summary.sheets.map((sheet) => (
          <div className="grid grid-cols-[1fr_auto] gap-2 py-1" key={sheet.sheetName}>
            <span>{sheet.sheetName}</span>
            <span>
              {sheet.itemRows} items / {sheet.headerRows} headers / {sheet.rowsWithInheritedSection} inherited
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
