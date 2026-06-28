import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export function ProjectReadySummary({
  itemCount,
  projectId,
  reviewCount,
  systems,
}: {
  itemCount: number;
  projectId: string;
  reviewCount: number;
  systems: string[];
}) {
  return (
    <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-[#dcfce7] text-[#16a34a]">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-[#0f172a]">Project Ready</h2>
        <p className="mt-3 text-lg text-[#64748b]">AI extracted {itemCount.toLocaleString()} items.</p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl rounded-[24px] bg-[#f8fafc] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#64748b]">Organized into</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {systems.slice(0, 8).map((system) => (
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0f172a]" key={system}>
              {system}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-lg font-semibold text-[#0f172a]">Only {reviewCount} items need your review.</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#16a34a] px-6 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.2)] transition hover:bg-[#15803d]"
          href={`/projects/${projectId}/intelligence`}
        >
          Review {reviewCount} Items
        </Link>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#d1d5db] bg-white px-6 text-sm font-semibold text-[#475569] transition hover:bg-[#f8fafc]"
          href={`/projects/${projectId}/requirements`}
        >
          View organized data
        </Link>
      </div>
    </section>
  );
}
