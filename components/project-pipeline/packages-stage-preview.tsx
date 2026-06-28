import Link from "next/link";
import { PackageCheck } from "lucide-react";

export function PackagesStagePreview({ projectId }: { projectId: string }) {
  return (
    <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-[#ecfdf3] text-[#16a34a]">
        <PackageCheck className="h-7 w-7" />
      </div>
      <h2 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-[#0f172a]">AI prepared procurement packages.</h2>
      <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[#64748b]">2 packages need your approval.</p>
      <Link
        className="mt-8 inline-flex h-12 items-center justify-center rounded-[14px] bg-[#16a34a] px-6 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.2)]"
        href={`/projects/${projectId}/requirements`}
      >
        Review Packages
      </Link>
    </section>
  );
}
