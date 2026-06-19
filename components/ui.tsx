import Link from "next/link";
import { clsx } from "clsx";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">
        M
      </span>
      <span>Mnelo</span>
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

export function AppNav() {
  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-line bg-white/80 px-4 py-3 backdrop-blur">
      <Logo />
      <nav className="hidden items-center gap-6 text-sm font-medium text-ink/60 md:flex">
        <Link className="hover:text-ink" href="/dashboard">
          Dashboard
        </Link>
        <Link className="hover:text-ink" href="/projects">
          Projects
        </Link>
        <Link className="hover:text-ink" href="/login">
          Login
        </Link>
      </nav>
      <Button href="/projects" className="hidden sm:inline-flex">
        Open workspace
      </Button>
    </div>
  );
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
