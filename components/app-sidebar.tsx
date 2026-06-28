import Link from "next/link";
import {
  BookOpen,
  BriefcaseBusiness,
  FileStack,
  Handshake,
  Home,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { logout } from "@/app/auth/actions";
import { MneloLogo } from "@/components/MneloLogo";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Missions", href: "/projects", icon: BriefcaseBusiness },
  { label: "Packages", href: "/boq", icon: PackageCheck },
  { label: "Suppliers", href: "/files", icon: Handshake },
  { label: "Contracts", href: "/settings", icon: FileStack },
  { label: "Knowledge", href: "/learning", icon: BookOpen },
];

export function AppSidebar({
  active,
  userEmail,
}: {
  active?: string;
  userEmail: string | null;
}) {
  const initials = userEmail?.slice(0, 2).toUpperCase() || "MN";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-[#E5E7EB] bg-white px-6 py-7 lg:flex">
      <Link href="/" className="group flex items-center gap-3 rounded-2xl transition hover:opacity-80">
        <MneloLogo className="[&_svg]:h-10 [&_svg]:w-10 [&_span]:text-2xl" />
      </Link>
      <p className="mt-2 pl-[52px] text-sm font-medium text-[#64748B]">AI Procurement OS</p>

      <nav className="mt-10 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.label;

          return (
            <Link
              className={
                isActive
                  ? "flex items-center gap-3 rounded-2xl bg-[#ECFDF3] px-4 py-3 text-sm font-semibold text-[#15803D]"
                  : "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              }
              href={item.href}
              key={item.label}
            >
              <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="rounded-[20px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">
              <Sparkles aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">AI is working for you</p>
              <p className="mt-0.5 text-xs text-[#64748B]">Monitoring missions</p>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#DCFCE7] text-sm font-semibold text-[#15803D]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0F172A]">{userEmail || "Mnelo workspace"}</p>
              <p className="text-xs text-[#64748B]">Procurement team</p>
            </div>
          </div>
          <form action={logout} className="mt-4">
            <button
              className="h-10 w-full rounded-[14px] border border-[#E5E7EB] bg-white text-sm font-semibold text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
