import Link from "next/link";
import type { BoqItem } from "@/lib/data";

export function ExceptionReviewCard({ item, projectId }: { item: BoqItem; projectId: string }) {
  const suggestedSystem = item.category && item.category !== "Needs Review" ? item.category : "Electrical";
  const suggestedCategory = item.subcategory && item.subcategory !== "Needs review" ? item.subcategory : "Lighting";
  const suggestedSubcategory = item.classificationSubcategory || item.inheritedSubcategory || "Needs Review";

  return (
    <article className="rounded-[28px] border border-[#e5e7eb] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f59e0b]">Item needs confirmation</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#0f172a]">{item.description}</h2>
          <p className="mt-3 text-base text-[#64748b]">
            Quantity: {item.quantity ?? "—"} {item.unit || ""}
          </p>
        </div>
        <span className="rounded-full bg-[#fef3c7] px-4 py-2 text-sm font-semibold text-[#b45309]">
          {Math.round((item.confidenceScore || 0.72) * 100)}% confidence
        </span>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Suggestion label="System" value={suggestedSystem} />
        <Suggestion label="Category" value={suggestedCategory} />
        <Suggestion label="Subcategory" value={suggestedSubcategory} />
      </div>

      <section className="mt-6 rounded-[22px] bg-[#f8fafc] p-5">
        <p className="text-sm font-semibold text-[#0f172a]">Why</p>
        <p className="mt-2 text-sm leading-6 text-[#64748b]">
          AI found enough context to suggest a direction, but this item still needs human confirmation before it can continue.
        </p>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#16a34a] px-6 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.2)]"
          href={`/projects/${projectId}/intelligence`}
        >
          Confirm
        </Link>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#d1d5db] bg-white px-6 text-sm font-semibold text-[#475569]"
          href={`/projects/${projectId}/intelligence`}
        >
          Change
        </Link>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#fde68a] bg-white px-6 text-sm font-semibold text-[#b45309]"
          href={`/projects/${projectId}/intelligence`}
        >
          Skip
        </Link>
      </div>
    </article>
  );
}

function Suggestion({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#0f172a]">{value}</p>
    </div>
  );
}
