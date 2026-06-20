import Link from "next/link";
import { clsx } from "clsx";
import { AlertCircle, Inbox } from "lucide-react";
import { MneloLogo } from "@/components/MneloLogo";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
      <MneloLogo className="[&_svg]:h-8 [&_svg]:w-8 [&_span]:text-base" />
    </Link>
  );
}

export function Badge({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "neutral" | "amber";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "green" && "bg-leaf-50 text-leaf-700 ring-1 ring-leaf-200",
        tone === "neutral" && "bg-white text-ink/65 ring-1 ring-line",
        tone === "amber" && "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition",
        variant === "primary" && "bg-ink text-white shadow-soft hover:bg-leaf-900",
        variant === "secondary" && "bg-white text-ink ring-1 ring-line hover:bg-mist",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</main>;
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-ink/55">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink/55">{detail}</p>
    </div>
  );
}

export function PageHeader({
  action,
  eyebrow,
  subtitle,
  title,
}: {
  action?: React.ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-semibold text-[#087a36]">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{action}</div> : null}
    </header>
  );
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#e5e7eb] bg-[#f8faf8] p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
        <Inbox aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
      </div>
      <p className="mt-4 text-base font-semibold text-[#0f172a]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748b]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <div className="flex gap-3">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        <p className="break-words">{message}</p>
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
      <div className="h-4 w-36 animate-pulse rounded-full bg-[#e5e7eb]" />
      <div className="mt-5 space-y-3">
        <div className="h-3 w-full animate-pulse rounded-full bg-[#eef2ee]" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-[#eef2ee]" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#eef2ee]" />
      </div>
    </div>
  );
}
