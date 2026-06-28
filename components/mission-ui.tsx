import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";

export function StatusBadge({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "neutral" | "purple";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        tone === "green" && "bg-[#ECFDF3] text-[#15803D]",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "neutral" && "bg-slate-100 text-slate-600",
        tone === "purple" && "bg-violet-50 text-violet-700",
      )}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#22C55E] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(34,197,94,0.22)] transition hover:-translate-y-0.5 hover:bg-[#16A34A]"
      href={href}
    >
      {children}
      <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" strokeWidth={2} />
    </Link>
  );
}

export function MissionProgress({
  currentStep = 1,
  steps,
}: {
  currentStep?: number;
  steps: string[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {steps.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;

        return (
          <div
            className={clsx(
              "rounded-2xl border px-4 py-3 transition",
              done && "border-[#BBF7D0] bg-[#F0FDF4]",
              active && "border-[#22C55E] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]",
              !done && !active && "border-[#E5E7EB] bg-white",
            )}
            key={step}
          >
            <div className="flex items-center gap-2">
              {done ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[#22C55E]" strokeWidth={2} />
              ) : active ? (
                <Clock3 aria-hidden="true" className="h-4 w-4 text-[#F59E0B]" strokeWidth={2} />
              ) : (
                <Circle aria-hidden="true" className="h-4 w-4 text-slate-300" strokeWidth={2} />
              )}
              <span className="text-sm font-medium text-[#0F172A]">{step}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MissionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function NextStepCard({
  count,
  href,
}: {
  count: number;
  href: string;
}) {
  return (
    <MissionCard>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#64748B]">Next Step</p>
          <h2 className="mt-4 max-w-sm text-3xl font-semibold tracking-tight text-[#0F172A]">
            {count > 0 ? `${count} decisions are waiting for you` : "Your mission is moving cleanly"}
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-7 text-[#64748B]">
            {count > 0
              ? "These need your approval to continue."
              : "AI will keep organizing project knowledge as new documents arrive."}
          </p>
          <p className="mt-4 text-sm font-medium text-[#64748B]">{count > 0 ? "~4 min to complete" : "No action needed now"}</p>
        </div>
        <div className="hidden rounded-2xl bg-[#F5F3FF] p-3 text-[#7C3AED] sm:block">
          <Sparkles aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
        </div>
      </div>
      <div className="mt-6">
        <PrimaryButton href={href}>{count > 0 ? "Start Review" : "Open Mission"}</PrimaryButton>
      </div>
    </MissionCard>
  );
}

export function AIActivityPanel({
  activities,
}: {
  activities: Array<{ detail: string; title: string }>;
}) {
  return (
    <aside className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">
          <Sparkles aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">AI Activity</h2>
          <p className="text-sm text-[#64748B]">Live project workstream</p>
        </div>
      </div>
      <div className="mt-6 space-y-5">
        {activities.map((activity, index) => (
          <div className="relative flex gap-3" key={`${activity.title}-${index}`}>
            {index < activities.length - 1 ? <span className="absolute left-2 top-5 h-10 w-px bg-[#E5E7EB]" /> : null}
            <span className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-white bg-[#22C55E] shadow-[0_0_0_3px_#DCFCE7]" />
            <span>
              <span className="block text-sm font-semibold text-[#0F172A]">{activity.title}</span>
              <span className="mt-1 block text-sm leading-6 text-[#64748B]">{activity.detail}</span>
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function RecentMissions({
  missions,
}: {
  missions: Array<{ href: string; name: string; progress: number; subtitle: string }>;
}) {
  return (
    <MissionCard>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-[#0F172A]">Recent Missions</h2>
        <Link className="text-sm font-semibold text-[#16A34A] transition hover:text-[#15803D]" href="/projects">
          View all
        </Link>
      </div>
      <div className="mt-5 space-y-4">
        {missions.length > 0 ? (
          missions.map((mission) => (
            <Link
              className="block rounded-2xl border border-[#E5E7EB] p-4 transition hover:border-[#BBF7D0] hover:bg-[#F8FAFC]"
              href={mission.href}
              key={mission.href}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-[#0F172A]">{mission.name}</p>
                  <p className="mt-1 text-sm text-[#64748B]">{mission.subtitle}</p>
                </div>
                <p className="text-sm font-semibold text-[#16A34A]">{mission.progress}%</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#22C55E] transition-all" style={{ width: `${mission.progress}%` }} />
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-[#E5E7EB] p-5 text-sm text-[#64748B]">
            Create your first mission to begin.
          </p>
        )}
      </div>
    </MissionCard>
  );
}

export function AISuggestionCard({
  ctaHref,
  ctaLabel,
  icon: Icon,
  text,
  title,
}: {
  ctaHref: string;
  ctaLabel: string;
  icon: LucideIcon;
  text: string;
  title: string;
}) {
  return (
    <MissionCard>
      <div className="flex gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#ECFDF3] text-[#22C55E]">
          <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#64748B]">{text}</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-[#16A34A] hover:text-[#15803D]" href={ctaHref}>
            {ctaLabel}
            <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </MissionCard>
  );
}

export function MissionWorkspace({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1480px] px-5 py-8 sm:px-8 lg:px-10">{children}</div>;
}
