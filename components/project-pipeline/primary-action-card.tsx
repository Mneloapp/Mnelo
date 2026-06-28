import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function PrimaryActionCard({
  description,
  href,
  icon: Icon,
  label,
  secondaryHref,
  secondaryLabel,
  title,
}: {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  title: string;
}) {
  return (
    <section className="rounded-[28px] border border-[#e5e7eb] bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] bg-[#ecfdf3] text-[#16a34a]">
        <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
      </div>
      <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-semibold tracking-[-0.02em] text-[#0f172a]">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[#64748b]">{description}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#16a34a] px-6 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.2)] transition hover:bg-[#15803d]"
          href={href}
        >
          {label}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#d1d5db] bg-white px-6 text-sm font-semibold text-[#475569] transition hover:bg-[#f8fafc]"
            href={secondaryHref}
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
