import Link from "next/link";
import { Files, FolderKanban, Settings, TableProperties } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { MneloLogo } from "@/components/MneloLogo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const sidebarItems = [
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Files", href: "/files", icon: Files },
  { label: "BOQ", href: "/boq", icon: TableProperties },
  { label: "Settings", href: "/settings", icon: Settings },
];

async function getUserEmail() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.email ?? null;
  } catch {
    return null;
  }
}

export async function WorkspaceShell({
  active = "Projects",
  children,
}: {
  active?: "Projects" | "Files" | "BOQ" | "Settings";
  children: React.ReactNode;
}) {
  const userEmail = await getUserEmail();
  const initials = userEmail?.slice(0, 2).toUpperCase() || "MN";

  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#0b1712]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#e5e7eb] bg-white/92 px-5 py-6 shadow-[16px_0_60px_rgba(15,61,46,0.04)] backdrop-blur lg:flex">
        <Link href="/dashboard" className="flex items-center gap-3">
          <MneloLogo />
        </Link>

        <nav className="mt-10 space-y-2">
          {sidebarItems.map((item) => {
            const isActive = item.label === active;
            const Icon = item.icon;

            return (
              <Link
                className={
                  isActive
                    ? "flex items-center gap-3 rounded-xl bg-[#ecfdf3] px-4 py-3 text-sm font-semibold text-[#087a36]"
                    : "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-[#f3f7f3] hover:text-[#0f3d2e]"
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

        <div className="mt-auto rounded-2xl border border-[#e5e7eb] bg-[#f8faf8] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          <p className="mt-2 truncate text-sm font-semibold text-[#07130f]">{userEmail || "Mnelo workspace"}</p>
          <form action={logout} className="mt-4">
            <button
              className="h-9 w-full rounded-xl border border-[#e5e7eb] bg-white text-sm font-semibold text-slate-700 transition hover:bg-[#ecfdf3] hover:text-[#087a36]"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#e5e7eb] bg-white/88 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
            <MneloLogo className="[&_svg]:h-8 [&_svg]:w-8 [&_span]:text-xl" />
          </Link>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#dcfce7] text-xs font-bold text-[#087a36]">
            {initials}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
