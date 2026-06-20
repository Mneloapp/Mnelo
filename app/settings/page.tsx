import { CheckCircle2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAccountEmail() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.email || "Signed-in user";
  } catch {
    return "Signed-in user";
  }
}

export default async function SettingsPage() {
  const email = await getAccountEmail();

  return (
    <WorkspaceShell active="Settings">
      <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader
          subtitle="Review workspace and account details for this Mnelo session."
          title="Settings"
        />

        <section className="mt-8 grid gap-5">
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
                <CheckCircle2 aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#0f172a]">Workspace</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748b]">
                  Mnelo is configured as an industry-agnostic estimation and procurement workspace.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ecfdf3] text-[#16a34a]">
                <UserRound aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-[#0f172a]">Account</h2>
                <p className="mt-2 text-sm text-[#64748b]">Signed in as</p>
                <p className="mt-1 truncate text-sm font-semibold text-[#0f172a]">{email}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
