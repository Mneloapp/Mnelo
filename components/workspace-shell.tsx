import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { MneloLogo } from "@/components/MneloLogo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LegacyActive = "Dashboard" | "Projects" | "Files" | "BOQ" | "Settings";

const activeMap: Record<LegacyActive, string> = {
  BOQ: "Packages",
  Dashboard: "Home",
  Files: "Suppliers",
  Projects: "Missions",
  Settings: "Contracts",
};

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
  active = "Dashboard",
  children,
}: {
  active?: LegacyActive;
  children: React.ReactNode;
}) {
  const userEmail = await getUserEmail();
  const initials = userEmail?.slice(0, 2).toUpperCase() || "MN";

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <AppSidebar active={activeMap[active]} userEmail={userEmail} />
      <div className="lg:pl-72">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5E7EB] bg-white/90 px-5 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2 rounded-xl transition hover:opacity-80">
            <MneloLogo className="[&_svg]:h-8 [&_svg]:w-8 [&_span]:text-xl" />
          </Link>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#DCFCE7] text-xs font-bold text-[#15803D]">
            {initials}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
