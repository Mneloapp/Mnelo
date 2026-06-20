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
        "mb-6 flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white/86 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.04)] backdrop-blur md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <Logo />
        <NavLinks className="flex md:hidden" />
      </div>

      <NavLinks className="hidden md:flex" />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 md:justify-end">
        {userEmail ? (
          <>
            <span className="max-w-52 truncate text-sm font-medium text-[#64748b]">{userEmail}</span>
            <form action={logout}>
              <button
                className="inline-flex h-8 items-center justify-center rounded-lg bg-[#16a34a] px-3 text-xs font-semibold text-white transition hover:bg-[#087a36]"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link
            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#16a34a] px-3 text-xs font-semibold text-white transition hover:bg-[#087a36]"
            href="/login"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
