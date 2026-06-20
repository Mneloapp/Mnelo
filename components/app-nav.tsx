import { clsx } from "clsx";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { NavLinks } from "@/components/nav-links";
import { Logo } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export async function AppNav({ className }: { className?: string }) {
  const userEmail = await getUserEmail();

  return (
    <div
      className={clsx(
        "mb-6 flex flex-col gap-3 rounded-xl border border-line bg-white/80 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <Logo />
        <NavLinks className="flex md:hidden" />
      </div>

      <NavLinks className="hidden md:flex" />

      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 md:justify-end">
        {userEmail ? (
          <>
            <span className="max-w-52 truncate text-sm font-medium text-ink/70">{userEmail}</span>
            <form action={logout}>
              <button
                className="inline-flex h-8 items-center justify-center rounded-md bg-ink px-3 text-xs font-semibold text-white transition hover:bg-leaf-900"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link
            className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-mist"
            href="/login"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
