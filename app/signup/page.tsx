import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signup } from "@/app/auth/actions";
import { MneloLogo } from "@/components/MneloLogo";
import { ErrorMessage } from "@/components/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen bg-[#f8faf8] px-4 py-10 text-[#0f172a] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(22,163,74,0.16),transparent_30rem)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col">
        <Link className="inline-flex w-fit" href="/">
          <MneloLogo />
        </Link>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_28rem]">
          <div className="hidden lg:block">
            <span className="inline-flex items-center rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold text-[#087a36] ring-1 ring-[#bbf7d0]">
              Start your Mnelo workspace
            </span>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-[#0f172a]">
              Build estimates and procurement workflows in one place.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#64748b]">
              Create projects, upload BOQs, organize files and keep project costs moving with a cleaner workspace.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#e5e7eb] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a]">Create your account</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                Start organizing estimates, documents and procurement activity with Mnelo.
              </p>
            </div>

            {error ? (
              <div className="mt-5">
                <ErrorMessage message={error} />
              </div>
            ) : null}

            <form action={signup} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#0f172a]">Email</span>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                  name="email"
                  placeholder="estimator@company.com"
                  required
                  type="email"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#0f172a]">Password</span>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:ring-4 focus:ring-[#dcfce7]"
                  minLength={6}
                  name="password"
                  placeholder="Password"
                  required
                  type="password"
                />
              </label>
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-[#087a36]"
                type="submit"
              >
                Create account
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" strokeWidth={2} />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#64748b]">
              Already have an account?{" "}
              <Link className="font-semibold text-[#087a36] hover:text-[#16a34a]" href="/login">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
