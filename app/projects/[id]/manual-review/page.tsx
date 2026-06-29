import Link from "next/link";
import { ProjectUnavailableState } from "@/components/project-workspace";
import { ProjectSystemsPanel } from "@/components/project-systems-panel";
import { WorkspaceShell } from "@/components/workspace-shell";
import { MneloLogo } from "@/components/MneloLogo";
import { getProjectFilesForCurrentUser, getProjectForCurrentUser, getProjectSystemsForCurrentUser } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

function ClassificationTopNav({ userEmail }: { userEmail: string | null }) {
  const navItems = [
    { href: "/dashboard", label: "Home" },
    { href: "/projects", label: "Missions" },
    { href: "#", label: "Packages" },
    { href: "#", label: "Suppliers" },
    { href: "#", label: "Contracts" },
    { href: "/projects", label: "Knowledge" },
  ];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-5">
      <Link className="flex items-center gap-3 rounded-2xl transition hover:opacity-80" href="/">
        <MneloLogo className="[&_svg]:h-8 [&_svg]:w-8 [&_span]:text-xl" />
      </Link>
      <nav className="hidden items-center gap-1 lg:flex">
        {navItems.map((item) =>
          item.href === "#" ? (
            <span className="cursor-not-allowed rounded-xl px-3 py-2 text-sm font-semibold text-[#94a3b8]" key={item.label}>
              {item.label}
            </span>
          ) : (
            <Link
              className="rounded-xl px-3 py-2 text-sm font-semibold text-[#475569] transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>
      <div className="min-w-0 rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold text-[#475569]">
        <span className="hidden max-w-56 truncate sm:block">{userEmail || "Workspace"}</span>
        <span className="sm:hidden">User</span>
      </div>
    </header>
  );
}

export default async function ProjectManualReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectResult, systemsResult, filesResult, userEmail] = await Promise.all([
    getProjectForCurrentUser(id),
    getProjectSystemsForCurrentUser(id),
    getProjectFilesForCurrentUser(id),
    getUserEmail(),
  ]);
  const { project, errorMessage } = projectResult;
  const { systems, errorMessage: systemsErrorMessage } = systemsResult;
  const showSystemsError = process.env.NODE_ENV === "development" && systemsErrorMessage;

  if (!project) {
    return (
      <WorkspaceShell active="Projects">
        <ProjectUnavailableState errorMessage={errorMessage} />
      </WorkspaceShell>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f8fafc] text-[#0f172a]">
      <ClassificationTopNav userEmail={userEmail} />
      <div className="h-[calc(100vh-4rem)] min-h-0 overflow-hidden">
        <ProjectSystemsPanel
          fileName={filesResult.files[0]?.fileName || "Parsed BOQ"}
          projectId={project.id}
          projectName={project.name}
          systems={systems}
        />
        {showSystemsError ? (
          <p className="fixed bottom-4 left-4 z-50 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
            {systemsErrorMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
