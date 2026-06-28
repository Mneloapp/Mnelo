import type { BoqItem } from "@/lib/data";

export function SimilarItemsPreview({ items }: { items: BoqItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="text-lg font-semibold text-[#0f172a]">AI found {items.length} possible similar items.</h3>
          <p className="mt-1 text-sm text-[#64748b]">Preview only. Nothing is auto-selected or applied.</p>
        </div>
        <button className="rounded-[14px] border border-[#d1d5db] px-4 py-2 text-sm font-semibold text-[#475569]" type="button">
          Preview Similar Items
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.slice(0, 4).map((item) => (
          <div className="rounded-[18px] bg-[#f8fafc] p-4" key={item.id}>
            <p className="line-clamp-2 text-sm font-semibold text-[#0f172a]">{item.description}</p>
            <p className="mt-2 text-xs text-[#64748b]">Why matched: similar classification context and unit.</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
        If product families differ, review manually before applying any shared decision.
      </p>
    </section>
  );
}
