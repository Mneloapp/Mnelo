import type { RequirementSourceRow } from "@/lib/requirements/derive-requirements";

function formatQuantity(quantity: number | null, unit: string | null) {
  if (quantity === null) {
    return "Quantity not detected";
  }

  return `${quantity.toLocaleString()}${unit ? ` ${unit}` : ""}`;
}

export function RequirementSourceRows({ rows }: { rows: RequirementSourceRow[] }) {
  return (
    <div className="mt-5 rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Source evidence</p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4" key={row.id}>
            <p className="text-sm font-medium leading-6 text-[#0F172A]">{row.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#64748B]">
              <span className="rounded-full bg-[#F1F5F9] px-3 py-1">Sheet: {row.sheetName || "Unknown"}</span>
              <span className="rounded-full bg-[#F1F5F9] px-3 py-1">Row: {row.rowNumber || "Unknown"}</span>
              <span className="rounded-full bg-[#F1F5F9] px-3 py-1">{formatQuantity(row.quantity, row.unit)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
