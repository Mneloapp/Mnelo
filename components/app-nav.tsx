import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { Logo } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function AppNav() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-line bg-white/80 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex items-center justify-between gap-4">
        <Logo />
        <nav className="flex items-center gap-4 text-sm font-medium text-ink/60 md:hidden">
          <Link className="hover:text-ink" href="/dashboard">
            Dashboard
          </Link>
          <Link className="hover:text-ink" href="/projects">
            Projects
          </Link>
        </nav>
      </div>

      <nav className="hidden items-center gap-6 text-sm font-medium text-ink/60 md:flex">
        <Link className="hover:text-ink" href="/dashboard">
          Dashboard
        </Link>
        <Link className="hover:text-ink" href="/projects">
          Projects
        </Link>
      </nav>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 md:justify-end">
        <span className="max-w-52 truncate text-sm font-medium text-ink/70">
          {user?.email ?? "Authenticated"}
        </span>
        <form action={logout}>
          <button
            className="inline-flex h-8 items-center justify-center rounded-md bg-ink px-3 text-xs font-semibold text-white transition hover:bg-leaf-900"
            type="submit"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
